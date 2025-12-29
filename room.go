package wsrooms

import (
	"encoding/json"
	"log"
	"sync"
)

type RoomMessage struct {
	Sender *Conn
	Data   []byte
}

type Room struct {
	Name       string
	members    map[string]*Conn
	register   chan *Conn
	unregister chan *Conn
	send       chan *RoomMessage
	stop       chan struct{}
	stopOnce   sync.Once
	mu         sync.Mutex
}

// Join queues a connection to join
func (r *Room) Join(c *Conn) {
	r.register <- c
}

// Leave queues a connection to leave
func (r *Room) Leave(c *Conn) {
	r.unregister <- c
}

// Emit queues a message to all room members
func (r *Room) Emit(c *Conn, msg *Message) {
	r.send <- &RoomMessage{c, msg.Bytes()}
}

func (r *Room) snapshot() []string {
	r.mu.Lock()
	defer r.mu.Unlock()
	ids := make([]string, 0, len(r.members))
	for id := range r.members {
		ids = append(ids, id)
	}
	return ids
}

func (r *Room) broadcast(msg *RoomMessage) {
	r.mu.Lock()
	members := make([]*Conn, 0, len(r.members))
	for id, c := range r.members {
		if id != msg.Sender.ID {
			members = append(members, c)
		}
	}
	r.mu.Unlock()

	for _, c := range members {
		select {
		case c.Send <- msg.Data:
		default:
			log.Printf("Room %s: member %s is slow or disconnected, removing", r.Name, c.ID)
			r.Leave(c)
			c.cleanup()
		}
	}
}

func (r *Room) handleJoin(c *Conn) {
	r.mu.Lock()
	r.members[c.ID] = c
	r.mu.Unlock()

	members, err := json.Marshal(r.snapshot())
	if err != nil {
		log.Println("Error marshalling room members:", err)
		return
	}
	c.Send <- ConstructMessage(r.Name, "join_ack", "", c.ID, members).Bytes()
	r.Emit(c, ConstructMessage(r.Name, "new_member", "", "", []byte(c.ID)))
}

func (r *Room) handleLeave(c *Conn) {
	r.mu.Lock()
	delete(r.members, c.ID)
	empty := len(r.members) == 0
	r.mu.Unlock()

	c.Send <- ConstructMessage(r.Name, "leave_ack", "", c.ID, []byte(c.ID)).Bytes()
	r.Emit(c, ConstructMessage(r.Name, "member_left", "", "", []byte(c.ID)))

	if empty {
		r.stopOnce.Do(func() {
			close(r.stop)
		})
	}
}

func (r *Room) run() {
	for {
		select {
		case c := <-r.register:
			r.handleJoin(c)
		case c := <-r.unregister:
			r.handleLeave(c)
		case msg := <-r.send:
			r.broadcast(msg)
		case <-r.stop:
			Hub.RemoveRoom(r.Name)
			return
		}
	}
}

// NewRoom creates and runs a new room
func NewRoom(name string) *Room {
	r := &Room{
		Name:       name,
		members:    make(map[string]*Conn),
		register:   make(chan *Conn, 16),
		unregister: make(chan *Conn, 16),
		send:       make(chan *RoomMessage, 64),
		stop:       make(chan struct{}),
	}
	go r.run()
	return r
}
