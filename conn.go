//    Title: conn.go
//    Author: Jon Cody
//
//    This program is free software: you can redistribute it and/or modify
//    it under the terms of the GNU General Public License as published by
//    the Free Software Foundation, either version 3 of the License, or
//    (at your option) any later version.
//
//    This program is distributed in the hope that it will be useful,
//    but WITHOUT ANY WARRANTY; without even the implied warranty of
//    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
//    GNU General Public License for more details.
//
//    You should have received a copy of the GNU General Public License
//    along with this program.  If not, see <http://www.gnu.org/licenses/>.

package wsrooms

import (
	"net/http"
	"sync"
	"time"

	"github.com/chuckpreslar/emission"
	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

// The Conn type represents a single client.
type Conn struct {
	sync.Mutex
	Cookie map[string]string
	Socket *websocket.Conn
	ID     string
	Send   chan []byte
	Rooms  map[string]string
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

var (
	// Stores all Conn types by their uuid.
	ConnManager = struct {
		sync.Mutex
		Conns map[string]*Conn
	}{
		Conns: make(map[string]*Conn),
	}
	// Emits received Messages with non-reserved event names.
	Emitter = emission.NewEmitter()
)

// Handles incoming, error free messages.
func HandleData(c *Conn, msg *Message) {
	switch msg.Event {
	case "join":
		c.Join(msg.Room)
	case "leave":
		c.Leave(msg.Room)
	case "joined":
		c.Emit(msg)
	case "left":
		c.Emit(msg)
		RoomManager.Lock()
		room, ok := RoomManager.Rooms[msg.Room]
		RoomManager.Unlock()
		if ok == false {
			break
		}
		room.Lock()
		delete(room.Members, c.ID)
		members := len(room.Members)
		room.Unlock()
		if members == 0 {
			room.Stop()
		}
	default:
		if msg.Dst != "" {
			RoomManager.Lock()
			room, rok := RoomManager.Rooms[msg.Room]
			RoomManager.Unlock()
			if rok == false {
				break
			}
			room.Lock()
			id, mok := room.Members[msg.Dst]
			room.Unlock()
			if mok == false {
				break
			}
			ConnManager.Lock()
			dst, cok := ConnManager.Conns[id]
			ConnManager.Unlock()
			if cok == false {
				break
			}
			dst.Send <- msg.Bytes()
		} else if Emitter.GetListenerCount(msg.Event) > 0 {
			Emitter.Emit(msg.Event, c, msg)
		} else {
			c.Emit(msg)
		}
	}
}

func (c *Conn) readPump() {
	defer func() {
		c.Lock()
		for name := range c.Rooms {
			c.Unlock()
			RoomManager.Lock()
			room, ok := RoomManager.Rooms[name]
			RoomManager.Unlock()
			if ok == true {
				room.Leave(c)
			}
			c.Lock()
		}
		c.Unlock()
		c.Socket.Close()
	}()
	c.Socket.SetReadLimit(maxMessageSize)
	c.Socket.SetReadDeadline(time.Now().Add(pongWait))
	c.Socket.SetPongHandler(func(string) error {
		c.Socket.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})
	for {
		_, data, err := c.Socket.ReadMessage()
		if err != nil {
			if _, wok := err.(*websocket.CloseError); wok == false {
				break
			}
			c.Lock()
			for name := range c.Rooms {
				c.Unlock()
				RoomManager.Lock()
				room, rok := RoomManager.Rooms[name]
				RoomManager.Unlock()
				if rok == false {
					c.Lock()
					continue
				}
				room.Emit(c, ConstructMessage(name, "left", "", c.ID, []byte(c.ID)))
				room.Lock()
				delete(room.Members, c.ID)
				members := len(room.Members)
				room.Unlock()
				if members == 0 {
					room.Stop()
				}
				c.Lock()
			}
			c.Unlock()
			break
		}
		HandleData(c, BytesToMessage(data))
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
			if ok == false {
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

// Adds the Conn to a Room. If the Room does not exist, it is created.
func (c *Conn) Join(name string) {
	RoomManager.Lock()
	room, ok := RoomManager.Rooms[name]
	RoomManager.Unlock()
	if ok == false {
		room = NewRoom(name)
	}
	c.Lock()
	c.Rooms[name] = name
	c.Unlock()
	room.Join(c)
}

// Removes the Conn from a Room.
func (c *Conn) Leave(name string) {
	RoomManager.Lock()
	room, rok := RoomManager.Rooms[name]
	RoomManager.Unlock()
	if rok == false {
		return
	}
	c.Lock()
	_, cok := c.Rooms[name]
	c.Unlock()
	if cok == false {
		return
	}
	c.Lock()
	delete(c.Rooms, name)
	c.Unlock()
	room.Leave(c)
}

// Broadcasts a Message to all members of a Room.
func (c *Conn) Emit(msg *Message) {
	RoomManager.Lock()
	room, ok := RoomManager.Rooms[msg.Room]
	RoomManager.Unlock()
	if ok == true {
		room.Emit(c, msg)
	}
}

// Upgrades an HTTP connection and creates a new Conn type.
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
		Rooms:  make(map[string]string),
	}
	if cr != nil {
		c.Cookie = cr(r)
	}
	ConnManager.Lock()
	ConnManager.Conns[c.ID] = c
	ConnManager.Unlock()
	return c
}

// Calls NewConnection, starts the returned Conn's writer, joins the root room, and finally starts the Conn's reader.
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
