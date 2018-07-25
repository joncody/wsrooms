wsrooms
=======

A [Gorilla WebSocket](https://github.com/gorilla/websocket) implementation with support for rooms.

## API
`go get -u github.com/joncody/wsrooms`
#### Globals
- **RoomManager**
- **ConnManager**
- **HandleData**
- **Emitter**
- **NewConnection**
- **SocketHandler**
- **NewRoom**

#### Conn
- **Conn.Socket**
- **Conn.Id**
- **Conn.Send**
- **Conn.Rooms**
- **Conn.Join**
- **Conn.Leave**
- **Conn.Emit**

#### Message
- **Message.RoomLength**
- **Message.Room**
- **Message.EventLength**
- **Message.Event**
- **Message.DstLength**
- **Message.Dst**
- **Message.SrcLength**
- **Message.Src**
- **Message.PayloadLength**
- **Message.Payload**
##### RoomMessage
- **RoomMessage.Sender**
- **RoomMessage.Data**

#### Room
- **Room.Name**
- **Room.Members**
- **Room.Stopchan**
- **Room.Joinchan**
- **Room.Leavechan**
- **Room.Send**
- **Room.Start**
- **Room.Stop**
- **Room.Join**
- **Room.Leave**
- **Room.Emit**

## Browser
#### Globals
- **wsrooms**

#### Room
- **room.on**
- **room.name**
- **room.open**
- **room.members**
- **room.id**
- **room.send**
- **room.join**
- **room.leave**
- **room.parse**
- **room.purge** __root room only__
##### Events
- **"open"**
- **"joined"**
- **"left"**
- **"close"**
- **custom event**
