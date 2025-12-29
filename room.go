package wsrooms

import (
	"sync"
)

type roomMessage struct {
	sender *Conn
	data   []byte
}

type room struct {
	Name       string
	members    map[string]*Conn
	register   chan *Conn
	unregister chan *Conn
	send       chan *roomMessage
	stop       chan struct{}
	stopOnce   sync.Once
	mu         sync.Mutex
}

// Join queues a connection to join
func (r *room) join(c *Conn) {
	r.register <- c
}

// Leave queues a connection to leave
func (r *room) leave(c *Conn) {
	r.unregister <- c
}

// Emit queues a message to all room members
func (r *room) emit(c *Conn, msg *Message) {
	r.send <- &roomMessage{c, msg.Bytes()}
}

func (r *room) snapshot() []string {
	r.mu.Lock()
	defer r.mu.Unlock()
	ids := make([]string, 0, len(r.members))
	for id := range r.members {
		ids = append(ids, id)
	}
	return ids
}

func (r *room) broadcast(msg *roomMessage) {
	r.mu.Lock()
	members := make([]*Conn, 0, len(r.members))
	for id, c := range r.members {
		if id != msg.sender.ID {
			members = append(members, c)
		}
	}
	r.mu.Unlock()
	for _, c := range members {
		c.TrySend(msg.data)
	}
}

func (r *room) handleJoin(c *Conn) {
	r.mu.Lock()
	r.members[c.ID] = c
	r.mu.Unlock()
	r.emit(c, NewMessage(r.Name, "new_member", "", "", []byte(c.ID)))
}

func (r *room) handleLeave(c *Conn) {
	r.mu.Lock()
	delete(r.members, c.ID)
	empty := len(r.members) == 0
	r.mu.Unlock()
	r.emit(c, NewMessage(r.Name, "member_left", "", "", []byte(c.ID)))
	if empty {
		r.stopOnce.Do(func() {
			close(r.stop)
		})
	}
}

func (r *room) run() {
	for {
		select {
		case c := <-r.register:
			r.handleJoin(c)
		case c := <-r.unregister:
			r.handleLeave(c)
		case msg := <-r.send:
			r.broadcast(msg)
		case <-r.stop:
			hub.removeRoom(r.Name)
			return
		}
	}
}

// newRoom creates and runs a new room
func newRoom(name string) *room {
	r := &room{
		Name:       name,
		members:    make(map[string]*Conn),
		register:   make(chan *Conn, 16),
		unregister: make(chan *Conn, 16),
		send:       make(chan *roomMessage, 64),
		stop:       make(chan struct{}),
	}
	go r.run()
	return r
}
