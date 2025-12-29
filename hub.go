package wsrooms

import "sync"

// manager manages all rooms and connections (singleton via global `hub`).
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


// getConn returns a connection by ID, if it exists.
func (m *manager) getConn(id string) (*Conn, bool) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	c, ok := m.conns[id]
	return c, ok
}

// addConn adds a new connection to the hub.
func (m *manager) addConn(c *Conn) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.conns[c.ID] = c
}

// removeConn removes a connection from the hub.
func (m *manager) removeConn(id string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	delete(m.conns, id)
}

// getRoom returns a room by name, if it exists.
func (m *manager) getRoom(name string) (*room, bool) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	r, ok := m.rooms[name]
	return r, ok
}

// removeRoom deletes a room from the hub (called when room becomes empty).
func (m *manager) removeRoom(name string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	delete(m.rooms, name)
}

// joinRoom adds a connection to a room, creating the room if needed.
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

// leaveRoom removes a connection from a specific room.
func (m *manager) leaveRoom(name string, c *Conn) {
	if room, ok := m.getRoom(name); ok {
		room.leave(c)
	}
}

// leaveAllRooms removes a connection from every room it's in.
func (m *manager) leaveAllRooms(c *Conn) {
	m.mu.RLock()
	roomNames := make([]string, 0, len(m.rooms))
	for name := range m.rooms {
		roomNames = append(roomNames, name)
	}
	m.mu.RUnlock()
	for _, name := range roomNames {
		if room, ok := m.getRoom(name); ok {
			room.leave(c)
		}
	}
}
