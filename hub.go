package wsrooms

import "sync"

// Manager manages all rooms and connections
type Manager struct {
	mu    sync.RWMutex
	rooms map[string]*Room
	conns map[string]*Conn
}

// Global hub instance
var Hub = &Manager{
	rooms: make(map[string]*Room),
	conns: make(map[string]*Conn),
}

// GetRoom returns a room by name
func (m *Manager) GetRoom(name string) (*Room, bool) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	r, ok := m.rooms[name]
	return r, ok
}

// GetConn returns a connection by ID
func (m *Manager) GetConn(id string) (*Conn, bool) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	c, ok := m.conns[id]
	return c, ok
}

// AddConn adds a new connection
func (m *Manager) AddConn(c *Conn) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.conns[c.ID] = c
}

// RemoveConn removes a connection
func (m *Manager) RemoveConn(id string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	delete(m.conns, id)
}

// JoinRoom adds a connection to a room, creating the room if needed
func (m *Manager) JoinRoom(name string, c *Conn) {
	m.mu.Lock()
	defer m.mu.Unlock()
	room, ok := m.rooms[name]
	if !ok {
		room = NewRoom(name)
		m.rooms[name] = room
	}
	room.Join(c)
}

// LeaveRoom removes a connection from a room
func (m *Manager) LeaveRoom(name string, c *Conn) {
	if room, ok := m.GetRoom(name); ok {
		room.Leave(c)
	}
}

// RemoveRoom deletes a room from the hub
func (m *Manager) RemoveRoom(name string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	delete(m.rooms, name)
}

