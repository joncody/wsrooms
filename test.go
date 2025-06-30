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
package wsrooms

import "sync"

type RoomManager struct {
	sync.Mutex
	Rooms map[string]*Room
}

type ConnManager struct {
	sync.Mutex
	Conns map[string]*Conn
}

type Manager struct {
	Room *RoomManager
	Conn *ConnManager
}

func (m *Manager) GetRoom(name string) (*Room, bool) {
	m.Room.Lock()
	defer m.Room.Unlock()
	room, exists := m.Room.Rooms[name]
	return room, exists
}

func (m *Manager) GetConn(id string) (*Conn, bool) {
	m.Conn.Lock()
	defer m.Conn.Unlock()
	conn, exists := m.Conn.Conns[id]
	return conn, exists
}

func (m *Manager) AddRoom(room *Room) {
	m.Room.Lock()
	defer m.Room.Unlock()
	m.Room.Rooms[room.Name] = room
}

func (m *Manager) AddConn(conn *Conn) {
	m.Conn.Lock()
	defer m.Conn.Unlock()
	m.Conn.Conns[conn.ID] = conn
}

func (m *Manager) RemoveRoom(name string) {
	m.Room.Lock()
	defer m.Room.Unlock()
	delete(m.Room.Rooms, name)
}

func (m *Manager) RemoveConn(id string) {
	m.Conn.Lock()
	defer m.Conn.Unlock()
	delete(m.Conn.Conns, id)
}

func (m *Manager) Rooms() map[string]*Room {
	m.Room.Lock()
	defer m.Room.Unlock()
	rooms := make(map[string]*Room)
	for name, room := range m.Room.Rooms {
		rooms[name] = room
	}
	return rooms
}

func (m *Manager) Conns() map[string]*Conn {
	m.Conn.Lock()
	defer m.Conn.Unlock()
	conns := make(map[string]*Conn)
	for id, conn := range m.Conn.Conns {
		conns[id] = conn
	}
	return conns
}

var Hub = &Manager{
	Room: &RoomManager{Rooms: make(map[string]*Room)},
	Conn: &ConnManager{Conns: make(map[string]*Conn)},
}
package wsrooms

import (
	"bytes"
	"encoding/binary"
)

type Message struct {
	RoomLength    int    // room name length
	Room          string // room name
	EventLength   int    // event name length
	Event         string // event name
	DstLength     int    // destination id length
	Dst           string // destination id
	SrcLength     int    // source id length
	Src           string // source id
	PayloadLength int    // payload length
	Payload       []byte // payload
}

type RoomMessage struct {
	Sender *Conn
	Data   []byte
}

func BytesToMessage(data []byte) *Message {
	buf := bytes.NewBuffer(data)
	msg := &Message{}
	msg.RoomLength = int(binary.BigEndian.Uint32(buf.Next(4)))
	msg.Room = string(buf.Next(msg.RoomLength))
	msg.EventLength = int(binary.BigEndian.Uint32(buf.Next(4)))
	msg.Event = string(buf.Next(msg.EventLength))
	msg.DstLength = int(binary.BigEndian.Uint32(buf.Next(4)))
	msg.Dst = string(buf.Next(msg.DstLength))
	msg.SrcLength = int(binary.BigEndian.Uint32(buf.Next(4)))
	msg.Src = string(buf.Next(msg.SrcLength))
	msg.PayloadLength = int(binary.BigEndian.Uint32(buf.Next(4)))
	msg.Payload = buf.Next(msg.PayloadLength)
	return msg
}

func (msg *Message) Bytes() []byte {
	buf := bytes.NewBuffer([]byte{})
	binary.Write(buf, binary.BigEndian, uint32(msg.RoomLength))
	buf.Write([]byte(msg.Room))
	binary.Write(buf, binary.BigEndian, uint32(msg.EventLength))
	buf.Write([]byte(msg.Event))
	binary.Write(buf, binary.BigEndian, uint32(msg.DstLength))
	buf.Write([]byte(msg.Dst))
	binary.Write(buf, binary.BigEndian, uint32(msg.SrcLength))
	buf.Write([]byte(msg.Src))
	binary.Write(buf, binary.BigEndian, uint32(msg.PayloadLength))
	buf.Write(msg.Payload)
	return buf.Bytes()
}

func ConstructMessage(room, event, dst, src string, payload []byte) *Message {
	return &Message{
		RoomLength:    len(room),
		Room:          room,
		EventLength:   len(event),
		Event:         event,
		DstLength:     len(dst),
		Dst:           dst,
		SrcLength:     len(src),
		Src:           src,
		PayloadLength: len(payload),
		Payload:       payload,
	}
}
package wsrooms

import (
	"encoding/json"
	"log"
	"sync"
)

type Room struct {
	sync.Mutex
	Name       string
	Members    map[string]struct{}
	destroy    chan bool
	register   chan *Conn
	unregister chan *Conn
	Send       chan *RoomMessage
}

func (r *Room) getMembers() []string {
	r.Lock()
	defer r.Unlock()
	members := make([]string, 0)
	for id := range r.Members {
		members = append(members, id)
	}
	return members
}

func (r *Room) handleJoin(c *Conn) {
	members := r.getMembers()
	r.Lock()
	r.Members[c.ID] = struct{}{}
	r.Unlock()
	payload, err := json.Marshal(members)
	if err != nil {
		log.Println(err)
		return
	}
	c.Send <- ConstructMessage(r.Name, "join", "", c.ID, payload).Bytes()
}

func (r *Room) handleLeave(c *Conn) {
	r.Lock()
	defer r.Unlock()
	if _, ok := r.Members[c.ID]; ok {
		delete(r.Members, c.ID)
		c.Send <- ConstructMessage(r.Name, "leave", "", c.ID, []byte(c.ID)).Bytes()
		if len(r.Members) == 0 {
			r.Stop()
		}
	}
}

func (r *Room) broadcast(msg *RoomMessage) {
	members := r.getMembers()
	for _, id := range members {
		if id == msg.Sender.ID {
			continue
		}
		c, ok := Hub.GetConn(id)
		if !ok {
			continue
		}
		select {
		case c.Send <- msg.Data:
		default:
			r.Lock()
			delete(r.Members, id)
			r.Unlock()
			close(c.Send)
		}
	}
}

func (r *Room) cleanup() {
	Hub.RemoveRoom(r.Name)
}

func (r *Room) Start() {
	for {
		select {
		case c := <-r.register:
			r.handleJoin(c)
		case c := <-r.unregister:
			r.handleLeave(c)
		case msg := <-r.Send:
			r.broadcast(msg)
		case <-r.destroy:
			r.cleanup()
			return
		}
	}
}

func (r *Room) Stop() {
	r.destroy <- true
}

func (r *Room) Join(c *Conn) {
	r.register <- c
}

func (r *Room) Leave(c *Conn) {
	r.unregister <- c
}

func (r *Room) Emit(c *Conn, msg *Message) {
	r.Send <- &RoomMessage{c, msg.Bytes()}
}

func NewRoom(name string) *Room {
	r := &Room{
		Name:       name,
		Members:    make(map[string]struct{}),
		destroy:    make(chan bool, 1),
		register:   make(chan *Conn, 16),
		unregister: make(chan *Conn, 16),
		Send:       make(chan *RoomMessage, 64),
	}
	Hub.AddRoom(r)
	go r.Start()
	return r
}
