// Title: room.go
// Author: Jonanthan David Cody
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
	"encoding/json"
	"log"
	"sync"
)

type Room struct {
	sync.Mutex
	Name      string
	Members   map[string]string
	stopchan  chan bool
	joinchan  chan *Conn
	leavechan chan *Conn
	Send      chan *RoomMessage
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
	defer r.Unlock()
	r.Members[c.ID] = c.ID
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
	id, ok := r.Members[c.ID]
	if !ok {
		return
	}
	delete(r.Members, id)
	c.Send <- ConstructMessage(r.Name, "leave", "", id, []byte(c.ID)).Bytes()
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
		case c := <-r.joinchan:
			r.handleJoin(c)
		case c := <-r.leavechan:
			r.handleLeave(c)
		case msg := <-r.Send:
			r.broadcast(msg)
		case <-r.stopchan:
			r.cleanup()
			return
		}
	}
}

func (r *Room) Stop() {
	r.stopchan <- true
}

func (r *Room) Join(c *Conn) {
	r.joinchan <- c
}

func (r *Room) Leave(c *Conn) {
	r.leavechan <- c
}

func (r *Room) Emit(c *Conn, msg *Message) {
	r.Send <- &RoomMessage{c, msg.Bytes()}
}

func NewRoom(name string) *Room {
	r := &Room{
		Name:      name,
		Members:   make(map[string]string),
		stopchan:  make(chan bool, 1),
		joinchan:  make(chan *Conn, 16),
		leavechan: make(chan *Conn, 16),
		Send:      make(chan *RoomMessage, 64),
	}
	Hub.AddRoom(r)
	go r.Start()
	return r
}
