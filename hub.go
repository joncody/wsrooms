package wsrooms

import "sync"


type RoomManager struct {
	sync.Mutex
	Rooms map[string]*Room
}

type ConnManager struct {
	sync.Mutex
	Conns map[string]*Conn
}

type Manager struct {
    Room *RoomManager
    Conn *ConnManager
}

var Hub = &Manager{
    Room: &RoomManager{
        Rooms: make(map[string]*Room),
    },
    Conn: &ConnManager{
        Conns: make(map[string]*Conn),
    },
}

func (m *Manager) GetRoom(name string) (*Room, bool) {
	m.Room.Lock()
	defer m.Room.Unlock()
	room, exists := m.Room.Rooms[name]
	return room, exists
}

func (m *Manager) GetConn(id string) (*Conn, bool) {
	m.Conn.Lock()
	defer m.Conn.Unlock()
	conn, exists := m.Conn.Conns[id]
	return conn, exists
}

func (m *Manager) AddRoom(room *Room) {
	m.Room.Lock()
	defer m.Room.Unlock()
	m.Room.Rooms[room.Name] = room
}

func (m *Manager) AddConn(conn *Conn) {
	m.Conn.Lock()
	defer m.Conn.Unlock()
	m.Conn.Conns[conn.ID] = conn
}


func (m *Manager) RemoveRoom(name string) {
	m.Room.Lock()
	defer m.Room.Unlock()
	delete(m.Room.Rooms, name)
}

func (m *Manager) RemoveConn(id string) {
	m.Conn.Lock()
	defer m.Conn.Unlock()
	delete(m.Conn.Conns, id)
}

func (m *Manager) Rooms() map[string]*Room {
	m.Room.Lock()
	defer m.Room.Unlock()
	rooms := make(map[string]*Room)
	for name, room := range m.Room.Rooms {
        rooms[name] = room
	}
	return rooms
}

func (m *Manager) Conns() map[string]*Conn {
	m.Conn.Lock()
	defer m.Conn.Unlock()
	conns := make(map[string]*Conn)
	for id, conn := range m.Conn.Conns {
        conns[id] = conn
	}
	return conns
}
