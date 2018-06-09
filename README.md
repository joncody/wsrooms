wsrooms
=======

A [Gorilla WebSocket](https://github.com/gorilla/websocket) implementation with support for rooms.

## API
`go get -u github.com/joncody/wsrooms`
### Globals
- **RoomManager** _map[string]&ast;Room_ holds of all created rooms
- **ConnManager** _map[string]&ast;Conn_ holds of all created connections
- **HandleData** _func (&ast;Conn, []byte, &ast;Message)_ parses and handles client websocket messages before passing them off to Emitter
- **Emitter** _&ast;emission.Emitter_ emits all websocket events
- **NewConnection** _func (http.ResponseWriter, &ast;http.Request) *Conn_ upgrades an HTTP request and returns a new connection
- **SocketHandler** _func (http.ResponseWriter, &ast;http.Request) *Conn_ calls NewConnection, starts the returned connection's write pump within a go routine, joins the root room, and starts the new read pump
- **NewRoom** _func (string) &ast;Room_ creates a new room with the given name, starts the room, and returns the room

### Conn
- **Conn.Socket _&ast;websocket.Conn_ underlying gorilla websocket
- **Conn.Id _string_ unique id
- **Conn.Send _chan []byte_ a means to send bytes to the connection
- **Conn.Rooms _map[string]&ast;Room_ holds all rooms the connection is within
- **Conn.Join _func (string)_ joins a room
- **Conn.Leave _func (string)_ leaves a room
- **Conn.Emit _func ([]byte, &ast;Message)_  a means to send bytes to all connections within the room specified by message

### Message
- **Message.RoomLength** _int_ length of room name in characters
- **Message.Room** _string_ name of room
- **Message.EventLength** _int_ length of event name in characters
- **Message.Event** _string_ name of event
- **Message.DstLength** _int_ length of destination id in characters
- **Message.Dst** _string_ destination id
- **Message.SrcLength** _int_ length of source id in characters
- **Message.Src** _string_ source id
- **Message.PayloadLength** _int_  length of payload in bytes
- **Message.Payload** _[]byte_ payload
###### RoomMessage
- **RoomMessage.Sender** _&ast;Conn_ message originator
- **RoomMessage.Data** _[]byte_ bytes to send to all connections within a room other than its sender

### Room
- **Room.Name** _string_ name of room
- **Room.Members** _map[string]&ast;Conn_ holds all connections within the room
- **Room.Stopchan** _chan bool_ a means to shutdown the room
- **Room.Joinchan** _chan &ast;Conn_ a means to add a connection to the room
- **Room.Leavechan** _chan &ast;Conn_ a means to remove a connection from the room
- **Room.Send** _chan &ast;RoomMessage_ a means to send bytes to all connections within the room except for the sender
- **Room.Start** _func ()_ starts the room by listening on all channels
- **Room.Stop** _func ()_ a shorthand method to shutdown the room
- **Room.Join** _func (&ast;Conn)_ a shorthand method to add a connection to the room
- **Room.Leave** _func (&ast;Conn)_ a shorthand method to remove a connection from the room
- **Room.Emit** _func (&ast;Conn, []byte)_ a shorthand method to send bytes to all connections within the room from and with the exception of the given sender

## Browser
### Globals
- **wsrooms** _func (url)_ returns the root room

### Room
- **room.on** _func (string, func (args...))_ listen for opened, joined, left, close, and custom events
- **room.name** _string_ the name of the room
- **room.open** _func ()_ returns a boolean indicating the room open status
- **room.members** _func ()_ returns an array of unique ids corresponding to all connections within the room
- **room.id** _func ()_ returns the room id
- **room.send** _func (string, mixed[, string])_ first argument is the event name, second is the payload, and third is the destination id
- **room.join** _func (string)_ join a room and return it
- **room.leave** _func ()_ leave the room
- **room.open** _func ()_ returns a boolean indicating the open status
- **room.open** _func ()_ returns a boolean indicating the open status
