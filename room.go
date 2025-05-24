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
