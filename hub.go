package wsrooms

import "sync"

// manager manages all rooms and connections
type manager struct {
	mu    sync.RWMutex
	rooms map[string]*room
	conns map[string]*Conn
}

// Global hub instance
var hub = &manager{
	rooms: make(map[string]*room),
	conns: make(map[string]*Conn),
}

// getRoom returns a room by name
func (m *manager) getRoom(name string) (*room, bool) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	r, ok := m.rooms[name]
	return r, ok
}

// getConn returns a connection by ID
func (m *manager) getConn(id string) (*Conn, bool) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	c, ok := m.conns[id]
	return c, ok
}

// addConn adds a new connection
func (m *manager) addConn(c *Conn) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.conns[c.ID] = c
}

// removeConn removes a connection
func (m *manager) removeConn(id string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	delete(m.conns, id)
}

// joinRoom adds a connection to a room, creating the room if needed
func (m *manager) joinRoom(name string, c *Conn) {
	m.mu.Lock()
	defer m.mu.Unlock()
	room, ok := m.rooms[name]
	if !ok {
		room = newRoom(name)
		m.rooms[name] = room
	}
	room.join(c)
}

// leaveRoom removes a connection from a room
func (m *manager) leaveRoom(name string, c *Conn) {
	if room, ok := m.getRoom(name); ok {
		room.leave(c)
	}
}

// leaveAllRooms removes a connection from all rooms
func (m *manager) leaveAllRooms(c *Conn) {
	m.mu.RLock()
	rooms := make([]*room, 0, len(m.rooms))
	for _, r := range m.rooms {
		rooms = append(rooms, r)
	}
	m.mu.RUnlock()
	for _, r := range rooms {
		r.leave(c)
	}
}
// removeRoom deletes a room from the hub
func (m *manager) removeRoom(name string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	delete(m.rooms, name)
}

