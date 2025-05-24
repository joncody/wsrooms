// Title: conn.go
// Author: Jon Cody
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.

package wsrooms

import (
	"net/http"
	"sync"
	"time"
	"github.com/chuckpreslar/emission"
	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

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
	CheckOrigin: func(r *http.Request) bool { return true },
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
	room, ok := Hub.GetRoom(msg.Room)
	if !ok {
		return
	}
	room.Lock()
	defer room.Unlock()
	delete(room.Members, c.ID)
	if len(room.Members) == 0 {
		room.Stop()
	}
}

func (c *Conn) handleDirectMessage(msg *Message) {
	room, rok := Hub.GetRoom(msg.Room)
	if !rok {
		return
	}
	dst, cok := Hub.GetConn(room.Members[msg.Dst])
	if !cok {
		return
	}
	dst.Send <- msg.Bytes()
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
		room, ok := Hub.GetRoom(name)
		if !ok {
			continue
		}
		room.Emit(c, ConstructMessage(name, "left", "", c.ID, []byte(c.ID)))
		room.Lock()
		delete(room.Members, c.ID)
		if len(room.Members) == 0 {
			room.Stop()
		}
		room.Unlock()
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
	room, ok := Hub.GetRoom(name)
	if !ok {
		room = NewRoom(name)
	}
	c.Lock()
	c.Rooms[name] = name
	c.Unlock()
	room.Join(c)
}

func (c *Conn) Leave(name string) {
	room, rok := Hub.GetRoom(name)
	if !rok {
		return
	}
	c.Lock()
	delete(c.Rooms, name)
	c.Unlock()
	room.Leave(c)
}

func (c *Conn) Emit(msg *Message) {
	room, ok := Hub.GetRoom(msg.Room)
	if ok {
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
		Rooms:  make(map[string]string),
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
