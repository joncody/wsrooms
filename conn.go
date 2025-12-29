package wsrooms

import (
	"encoding/json"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

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
	upgrader = websocket.Upgrader{
		ReadBufferSize:  4096,
		WriteBufferSize: 4096,
		CheckOrigin:     func(r *http.Request) bool { return true },
	}
)

func (c *Conn) TrySend(msg []byte) bool {
	select {
	case c.send <- msg:
		return true
	default:
		log.Printf("Conn %s: droppe message (slow or closed)", c.ID)
		c.cleanup()
		return false
	}
}

func (c *Conn) SendToRoom(roomName, event string, payload []byte) {
	msg := NewMessage(roomName, event, "", c.ID, payload)
	if room, ok := hub.getRoom(roomName); ok {
		room.emit(c, msg)
	}
}

func (c *Conn) SendToClient(dstID, event string, payload []byte) {
	msg := NewMessage("root", event, dstID, c.ID, payload)
	if dst, ok := hub.getConn(dstID); ok {
		dst.TrySend(msg.Bytes())
	}
}

func (c *Conn) dispatch(msg *Message) {
	switch msg.Event {
	case "join":
		hub.joinRoom(msg.Room, c)
		members := []byte("[]") // or fetch real snapshot if needed
		if room, ok := hub.getRoom(msg.Room); ok {
			if snap, err := json.Marshal(room.snapshot()); err == nil {
				members = snap
			}
		}
		ack := NewMessage(msg.Room, "join_ack", "", c.ID, members).Bytes()
		if !c.TrySend(ack) {
			return
		}
	case "leave":
		ack := NewMessage(msg.Room, "leave_ack", "", c.ID, []byte(c.ID)).Bytes()
		c.TrySend(ack)
		hub.leaveRoom(msg.Room, c)
	default:
		if msg.Dst != "" {
			if dst, ok := hub.getConn(msg.Dst); ok {
				dst.TrySend(msg.Bytes())
			}
			return
		}
		if handler := getHandler(msg.Event); handler != nil {
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
		c.dispatch(msg)
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
