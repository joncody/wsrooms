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
	"github.com/chuckpreslar/emission"
	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"net/http"
	"time"
)

// The Conn type represents a single client.
type Conn struct {
	Cookie map[string]string
	Socket *websocket.Conn
	Id     string
	Send   chan []byte
	Rooms  map[string]*Room
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
	ConnManager = make(map[string]*Conn)
	// Emits received Messages with non-reserved event names.
	Emitter = emission.NewEmitter()
)

// Handles incoming, error free messages.
var HandleData = func(c *Conn, msg *Message) {
	switch msg.Event {
	case "join":
		c.Join(msg.Room)
	case "leave":
		c.Leave(msg.Room)
	case "joined":
		c.Emit(msg)
	case "left":
		c.Emit(msg)
	default:
		if msg.Dst != "" {
			if dst, ok := c.Rooms[msg.Room].Members[msg.Dst]; ok {
				dst.Send <- MessageToBytes(msg)
			}
		} else if Emitter.GetListenerCount(msg.Event) > 1 {
			Emitter.Emit(msg.Event, c, msg)
		} else {
			c.Emit(msg)
		}
	}
}

func (c *Conn) readPump() {
	defer func() {
		for _, room := range c.Rooms {
			room.Leave(c)
		}
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
			if _, ok := err.(*websocket.CloseError); ok {
				for name, room := range c.Rooms {
					payload := &Message{
						RoomLength:    len(name),
						Room:          name,
						EventLength:   len("left"),
						Event:         "left",
						DstLength:     0,
						Dst:           "",
						SrcLength:     len(c.Id),
						Src:           c.Id,
						PayloadLength: len([]byte(c.Id)),
						Payload:       []byte(c.Id),
					}
					room.Emit(c, payload)
				}
			}
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

// Adds the Conn to a Room. If the Room does not exist, it is created.
func (c *Conn) Join(name string) {
	var room *Room

	if _, ok := RoomManager[name]; ok {
		room = RoomManager[name]
	} else {
		room = NewRoom(name)
	}
	c.Rooms[name] = room
	room.Join(c)
}

// Removes the Conn from a Room.
func (c *Conn) Leave(name string) {
	if room, ok := RoomManager[name]; ok {
		delete(c.Rooms, name)
		room.Leave(c)
	}
}

// Broadcasts a Message to all members of a Room.
func (c *Conn) Emit(msg *Message) {
	if room, ok := RoomManager[msg.Room]; ok {
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
		Id:     id.String(),
		Send:   make(chan []byte, 256),
		Rooms:  make(map[string]*Room),
	}
	if cr != nil {
		c.Cookie = cr(r)
	}
	ConnManager[c.Id] = c
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
