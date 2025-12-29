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
type Authorize func(*http.Request) (map[string]string, error)

type Conn struct {
	ID          string
	Claims      map[string]string
	send        chan []byte
	socket      *websocket.Conn
	cleanupOnce sync.Once
}

const (
	writeWait      = 10 * time.Second
	pongWait       = 60 * time.Second
	pingPeriod     = pongWait * 9 / 10
	maxMessageSize = 65536
)

var (
	messageHandlersMu sync.RWMutex
	messageHandlers   = make(map[string]MessageHandler)
	upgrader          = websocket.Upgrader{
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
	msg := NewMessage(roomName, event, "", c.ID, payload)
	if room, ok := hub.getRoom(roomName); ok {
		room.emit(c, msg)
	}
}

func (c *Conn) SendToClient(dstID, event string, payload []byte) {
	msg := NewMessage("root", event, dstID, c.ID, payload)
    log.Println(msg)
	if dst, ok := hub.getConn(dstID); ok {
		dst.send <- msg.Bytes()
	}
}

func (c *Conn) handleData(msg *Message) {
	switch msg.Event {
	case "join":
		hub.joinRoom(msg.Room, c)
	case "leave":
		hub.leaveRoom(msg.Room, c)
	default:
		if msg.Dst != "" {
			if dst, ok := hub.getConn(msg.Dst); ok {
				dst.send <- msg.Bytes()
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
		if room, ok := hub.getRoom(msg.Room); ok {
			room.emit(c, msg)
		}
	}
}

func (c *Conn) cleanup() {
	c.cleanupOnce.Do(func() {
		hub.leaveAllRooms(c)
		hub.removeConn(c.ID)
		c.socket.Close()
		close(c.send)
	})
}

func (c *Conn) readPump() {
	defer c.cleanup()
	c.socket.SetReadLimit(maxMessageSize)
	c.socket.SetReadDeadline(time.Now().Add(pongWait))
	c.socket.SetPongHandler(func(string) error {
		c.socket.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})
	for {
		_, data, err := c.socket.ReadMessage()
		if err != nil {
			break
		}
		msg := BytesToMessage(data)
		if msg == nil {
			log.Printf("Conn %s: malformed message", c.ID)
			break
		}
		c.handleData(msg)
	}
}

func (c *Conn) write(mt int, payload []byte) error {
	c.socket.SetWriteDeadline(time.Now().Add(writeWait))
	return c.socket.WriteMessage(mt, payload)
}

func (c *Conn) writePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.cleanup()
	}()
	for {
		select {
		case msg, ok := <-c.send:
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

func newConnection(w http.ResponseWriter, r *http.Request, claims map[string]string) *Conn {
	sock, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		return nil
	}
	id, err := uuid.NewRandom()
	if err != nil {
		sock.Close()
		return nil
	}
	return &Conn{
		ID:     id.String(),
		Claims: claims,
		socket: sock,
		send:   make(chan []byte, 256),
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
		c := newConnection(w, r, claims)
		if c == nil {
			return
		}
		hub.addConn(c)
		go c.writePump()
		go c.readPump()
		hub.joinRoom("root", c)
	}
}
