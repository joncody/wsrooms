package wsrooms

import (
	"github.com/chuckpreslar/emission"
	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"net/http"
	"sync"
	"time"
)

type Conn struct {
	sync.Mutex
	Cookie map[string]string
	Socket *websocket.Conn
	ID     string
	Send   chan []byte
	Rooms  map[string]struct{}
}

type CookieReader func(*http.Request) map[string]string

const (
	writeWait      = 10 * time.Second
	pongWait       = 60 * time.Second
	pingPeriod     = pongWait * 9 / 10
	maxMessageSize = 1024 * 1024 * 1024
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  4096,
	WriteBufferSize: 4096,
	CheckOrigin:     func(r *http.Request) bool { return true },
}

var Emitter = emission.NewEmitter()

func (c *Conn) getRooms() []string {
	c.Lock()
	defer c.Unlock()
	rooms := make([]string, 0)
	for name := range c.Rooms {
		rooms = append(rooms, name)
	}
	return rooms
}

func (c *Conn) handleLeave(msg *Message) {
	if room, exists := Hub.GetRoom(msg.Room); exists {
		room.Lock()
		defer room.Unlock()
		delete(room.Members, c.ID)
		if len(room.Members) == 0 {
			room.Stop()
		}
	}
}

func (c *Conn) handleDirectMessage(msg *Message) {
	if dst, exists := Hub.GetConn(msg.Dst); exists {
		dst.Send <- msg.Bytes()
	}
}

func (c *Conn) HandleData(msg *Message) {
	switch msg.Event {
	case "join":
		c.Join(msg.Room)
	case "leave":
		c.Leave(msg.Room)
	case "joined", "left":
		c.Emit(msg)
		if msg.Event == "left" {
			c.handleLeave(msg)
		}
	default:
		if msg.Dst != "" {
			c.handleDirectMessage(msg)
		} else if Emitter.GetListenerCount(msg.Event) > 0 {
			Emitter.Emit(msg.Event, c, msg)
		} else {
			c.Emit(msg)
		}
	}
}

func (c *Conn) cleanup() {
	defer c.Socket.Close()
	rooms := c.getRooms()
	for _, name := range rooms {
		if room, exists := Hub.GetRoom(name); exists {
			room.Leave(c)
		}
	}
	Hub.RemoveConn(c.ID)
}

func (c *Conn) handleError(err error) {
	rooms := c.getRooms()
	for _, name := range rooms {
		if room, exists := Hub.GetRoom(name); exists {
			room.Emit(c, ConstructMessage(name, "left", "", c.ID, []byte(c.ID)))
			room.Lock()
			delete(room.Members, c.ID)
			if len(room.Members) == 0 {
				room.Stop()
			}
			room.Unlock()
		}
	}
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
			if _, ok := err.(*websocket.CloseError); !ok {
				break
			}
			c.handleError(err)
			break
		}
		c.HandleData(BytesToMessage(data))
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

func (c *Conn) Join(name string) {
	room, exists := Hub.GetRoom(name)
	if !exists {
		room = NewRoom(name)
	}
	c.Lock()
	c.Rooms[name] = struct{}{}
	c.Unlock()
	room.Join(c)
}

func (c *Conn) Leave(name string) {
	if room, exists := Hub.GetRoom(name); exists {
		c.Lock()
		delete(c.Rooms, name)
		c.Unlock()
		room.Leave(c)

	}
}

func (c *Conn) Emit(msg *Message) {
	if room, ok := Hub.GetRoom(msg.Room); ok {
		room.Emit(c, msg)
	}
}

func NewConnection(w http.ResponseWriter, r *http.Request, cr CookieReader) *Conn {
	socket, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		return nil
	}
	id, err := uuid.NewRandom()
	if err != nil {
		return nil
	}
	c := &Conn{
		Socket: socket,
		ID:     id.String(),
		Send:   make(chan []byte, 256),
		Rooms:  make(map[string]struct{}),
	}
	if cr != nil {
		c.Cookie = cr(r)
	}
	Hub.AddConn(c)
	return c
}

func SocketHandler(cr CookieReader) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != "GET" {
			http.Error(w, "Method not allowed", 405)
			return
		}
		c := NewConnection(w, r, cr)
		if c != nil {
			go c.writePump()
			c.Join("root")
			go c.readPump()
		}
	}
}
