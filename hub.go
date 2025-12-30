package roomer

import "sync"

// Hub manages all rooms and connections (singleton via global `hub`).
type Hub struct {
	mu    sync.RWMutex
	rooms map[string]*room
	conns map[string]*Conn
}

// Global hub instance
var hub = &Hub{
	rooms: make(map[string]*room),
	conns: make(map[string]*Conn),
}


// getConn returns a connection by ID, if it exists.
func (h *Hub) getConn(id string) (*Conn, bool) {
	h.mu.RLock()
	defer h.mu.RUnlock()
	c, ok := h.conns[id]
	return c, ok
}

// addConn adds a new connection to the hub.
func (h *Hub) addConn(c *Conn) {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.conns[c.ID] = c
}

// removeConn removes a connection from the hub.
func (h *Hub) removeConn(id string) {
	h.mu.Lock()
	defer h.mu.Unlock()
	delete(h.conns, id)
}

// getRoom returns a room by name, if it exists.
func (h *Hub) getRoom(name string) (*room, bool) {
	h.mu.RLock()
	defer h.mu.RUnlock()
	r, ok := h.rooms[name]
	return r, ok
}

// removeRoom deletes a room from the hub (called when room becomes empty).
func (h *Hub) removeRoom(name string) {
	h.mu.Lock()
	defer h.mu.Unlock()
	delete(h.rooms, name)
}

// joinRoom adds a connection to a room, creating the room if needed.
func (h *Hub) joinRoom(name string, c *Conn) {
	h.mu.Lock()
	defer h.mu.Unlock()
	room, ok := h.rooms[name]
	if !ok {
		room = newRoom(name)
		h.rooms[name] = room
	}
	room.join(c)
}

// leaveRoom removes a connection from a specific room.
func (h *Hub) leaveRoom(name string, c *Conn) {
	if room, ok := h.getRoom(name); ok {
		room.leave(c)
	}
}

// leaveAllRooms removes a connection from every room it's in.
func (h *Hub) leaveAllRooms(c *Conn) {
	h.mu.RLock()
	roomNames := make([]string, 0, len(h.rooms))
	for name := range h.rooms {
		roomNames = append(roomNames, name)
	}
	h.mu.RUnlock()
	for _, name := range roomNames {
		if room, ok := h.getRoom(name); ok {
			room.leave(c)
		}
	}
}
