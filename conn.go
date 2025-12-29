package wsrooms

import (
	"fmt"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

type MessageHandler func(c *Conn, msg *Message) error

type Conn struct {
	Socket *websocket.Conn
	ID     string
	Send   chan []byte
	Claims map[string]string
}

type Authorize func(*http.Request) (map[string]string, error)

const (
	writeWait      = 10 * time.Second
	pongWait       = 60 * time.Second
	pingPeriod     = pongWait * 9 / 10
	maxMessageSize = 65536
)

var (
	messageHandlersMu sync.RWMutex
	messageHandlers   = make(map[string]MessageHandler)
    upgrader = websocket.Upgrader{
        ReadBufferSize:  4096,
        WriteBufferSize: 4096,
        CheckOrigin:     func(r *http.Request) bool { return true },
    }
)

// RegisterHandler registers a custom event handler
func RegisterHandler(event string, handler MessageHandler) error {
	if event == "" {
		return fmt.Errorf("event name cannot be empty")
	}
	if handler == nil {
		return fmt.Errorf("handler cannot be nil")
	}
	messageHandlersMu.Lock()
	defer messageHandlersMu.Unlock()
	if _, exists := messageHandlers[event]; exists {
		return fmt.Errorf("handler for event %q already registered", event)
	}
	messageHandlers[event] = handler
	return nil
}

func (c *Conn) SendToRoom(roomName, event string, payload []byte) {
	msg := ConstructMessage(roomName, event, "", c.ID, payload)
	if room, ok := Hub.GetRoom(roomName); ok {
		room.Emit(c, msg)
	}
}

func (c *Conn) SendToClient(dstID, event string, payload []byte) {
	msg := ConstructMessage("", event, dstID, c.ID, payload)
	if dst, ok := Hub.GetConn(dstID); ok {
		dst.Send <- msg.Bytes()
	}
}

func (c *Conn) HandleData(msg *Message) {
	switch msg.Event {
	case "join":
		Hub.JoinRoom(msg.Room, c)
	case "leave":
		Hub.LeaveRoom(msg.Room, c)
	case "joined", "left":
		return
	default:
		if msg.Dst != "" {
			if dst, ok := Hub.GetConn(msg.Dst); ok {
				dst.Send <- msg.Bytes()
			}
			return
		}
		var handler MessageHandler
		messageHandlersMu.RLock()
		if h, exists := messageHandlers[msg.Event]; exists {
			handler = h
		}
		messageHandlersMu.RUnlock()
		if handler != nil {
			if err := handler(c, msg); err != nil {
				log.Printf("Handler error for event %q from conn %s: %v", msg.Event, c.ID, err)
			}
			return
		}
		if room, ok := Hub.GetRoom(msg.Room); ok {
			room.Emit(c, msg)
		}
	}
}

func (c *Conn) cleanup() {
	for _, room := range Hub.rooms {
		room.Leave(c)
	}
	Hub.RemoveConn(c.ID)
	c.Socket.Close()
}

func (c *Conn) readPump() {
	defer c.cleanup()
	c.Socket.SetReadLimit(maxMessageSize)
	c.Socket.SetReadDeadline(time.Now().Add(pongWait))
	c.Socket.SetPongHandler(func(string) error {
		c.Socket.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})
	for {
		_, data, err := c.Socket.ReadMessage()
		if err != nil {
			break
		}
		msg := BytesToMessage(data)
		if msg == nil {
			log.Printf("Conn %s: malformed message", c.ID)
			break
		}
		c.HandleData(msg)
	}
}

func (c *Conn) write(mt int, payload []byte) error {
	c.Socket.SetWriteDeadline(time.Now().Add(writeWait))
	return c.Socket.WriteMessage(mt, payload)
}

func (c *Conn) writePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.Socket.Close()
	}()
	for {
		select {
		case msg, ok := <-c.Send:
			if !ok {
				c.write(websocket.CloseMessage, []byte{})
				return
			}
			if err := c.write(websocket.BinaryMessage, msg); err != nil {
				return
			}
		case <-ticker.C:
			if err := c.write(websocket.PingMessage, []byte{}); err != nil {
				return
			}
		}
	}
}

func NewConnection(w http.ResponseWriter, r *http.Request, claims map[string]string) *Conn {
	socket, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		return nil
	}
	id, err := uuid.NewRandom()
	if err != nil {
		socket.Close()
		return nil
	}
	return &Conn{
		ID:     id.String(),
		Socket: socket,
		Send:   make(chan []byte, 256),
		Claims: claims,
	}
}

func SocketHandler(authFn Authorize) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != "GET" {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}
		var claims map[string]string
		if authFn != nil {
			var err error
			claims, err = authFn(r)
			if err != nil {
				http.Error(w, "Unauthorized", http.StatusUnauthorized)
				return
			}
		}
		c := NewConnection(w, r, claims)
		if c == nil {
			return
		}
		Hub.AddConn(c)
		go c.writePump()
		go c.readPump()
		Hub.JoinRoom("root", c)
	}
}

