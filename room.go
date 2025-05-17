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
	"sync"
)

// The Room type represents a communication channel.
type Room struct {
	sync.Mutex
	Name      string
	Members   map[string]string
	stopchan  chan bool
	joinchan  chan *Conn
	leavechan chan *Conn
	Send      chan *RoomMessage
}

// Stores all Room types by their name.
var RoomManager = struct {
	sync.Mutex
	Rooms map[string]*Room
}{
	Rooms: make(map[string]*Room, 0),
}

// Starts the Room.
func (r *Room) Start() {
	for {
		select {
		case c := <-r.joinchan:
			members := make([]string, 0)
			r.Lock()
			for id := range r.Members {
				members = append(members, id)
			}
			r.Members[c.ID] = c.ID
			r.Unlock()
			payload, err := json.Marshal(members)
			if err != nil {
				log.Println(err)
				break
			}
			c.Send <- ConstructMessage(r.Name, "join", "", c.ID, payload).Bytes()
		case c := <-r.leavechan:
			r.Lock()
			id, ok := r.Members[c.ID]
			if ok == false {
                r.Unlock()
				break
			}
			delete(r.Members, id)
			r.Unlock()
			c.Send <- ConstructMessage(r.Name, "leave", "", id, []byte(c.ID)).Bytes()
		case rmsg := <-r.Send:
			r.Lock()
            members := make([]string, 0)
			for id := range r.Members {
                members = append(members, id)
            }
            r.Unlock()
            for _, id := range members {
                if id == rmsg.Sender.ID {
                    continue
                }
				ConnManager.Lock()
				c, ok := ConnManager.Conns[id]
				ConnManager.Unlock()
				if !ok {
					continue
				}
				select {
				case c.Send <- rmsg.Data:
				default:
					r.Lock()
					delete(r.Members, id)
					r.Unlock()
					close(c.Send)
				}
			}
		case <-r.stopchan:
			RoomManager.Lock()
			delete(RoomManager.Rooms, r.Name)
			RoomManager.Unlock()
			return
		}
	}
}

// Stops the Room.
func (r *Room) Stop() {
	r.stopchan <- true
}

// Adds a Conn to the Room.
func (r *Room) Join(c *Conn) {
	r.joinchan <- c
}

// Removes a Conn from the Room.
func (r *Room) Leave(c *Conn) {
	r.leavechan <- c
}

// Broadcasts data to all members of the Room.
func (r *Room) Emit(c *Conn, msg *Message) {
	r.Send <- &RoomMessage{c, msg.Bytes()}
}

// Creates a new Room type and starts it.
func NewRoom(name string) *Room {
	r := &Room{
		Name:      name,
		Members:   make(map[string]string),
		stopchan:  make(chan bool, 1),
		joinchan:  make(chan *Conn, 16),
		leavechan: make(chan *Conn, 16),
		Send:      make(chan *RoomMessage, 64),
	}
	RoomManager.Lock()
	RoomManager.Rooms[name] = r
	RoomManager.Unlock()
	go r.Start()
	return r
}
