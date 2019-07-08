//    Title: room.go
//    Author: Jonanthan David Cody
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
	"encoding/json"
	"log"
)

// The Room type represents a communication channel.
type Room struct {
	Name      string
	Members   map[string]*Conn
	Stopchan  chan bool
	Joinchan  chan *Conn
	Leavechan chan *Conn
	Send      chan *RoomMessage
}

// Stores all Room types by their name.
var RoomManager = make(map[string]*Room)

// Starts the Room.
func (r *Room) Start() {
	for {
		select {
		case c := <-r.Joinchan:
			members := make([]string, 0)
			for id, _ := range r.Members {
				members = append(members, id)
			}
			payload, err := json.Marshal(members)
			if err != nil {
				log.Println(err)
				break
			}
			msg := ConstructMessage(r.Name, "join", "", c.Id, payload)
			r.Members[c.Id] = c
			c.Send <- MessageToBytes(msg)
		case c := <-r.Leavechan:
			if _, ok := r.Members[c.Id]; ok {
				msg := ConstructMessage(r.Name, "leave", "", c.Id, []byte(c.Id))
				delete(r.Members, c.Id)
				c.Send <- MessageToBytes(msg)
			}
		case msg := <-r.Send:
			for id, c := range r.Members {
				if c == msg.Sender {
					continue
				}
				select {
				case c.Send <- msg.Data:
				default:
					delete(r.Members, id)
					close(c.Send)
				}
			}
		case <-r.Stopchan:
			return
		}
	}
}

// Stops the Room.
func (r *Room) Stop() {
	r.Stopchan <- true
}

// Adds a Conn to the Room.
func (r *Room) Join(c *Conn) {
	r.Joinchan <- c
}

// Removes a Conn from the Room.
func (r *Room) Leave(c *Conn) {
	r.Leavechan <- c
}

// Broadcasts data to all members of the Room.
func (r *Room) Emit(c *Conn, msg *Message) {
	r.Send <- &RoomMessage{c, MessageToBytes(msg)}
}

// Creates a new Room type and starts it.
func NewRoom(name string) *Room {
	r := &Room{
		Name:      name,
		Members:   make(map[string]*Conn),
		Stopchan:  make(chan bool),
		Joinchan:  make(chan *Conn),
		Leavechan: make(chan *Conn),
		Send:      make(chan *RoomMessage),
	}
	RoomManager[name] = r
	go r.Start()
	return r
}
