wsrooms
=======

A [Gorilla WebSocket](https://github.com/gorilla/websocket) implementation with support for rooms/channels.

##API
###Conn
- Conn.Socket
- Conn.Id
- Conn.Send
- Conn.Rooms
- Conn.HandleData
- Conn.ReadPump
- Conn.Write
- Conn.WritePump
- Conn.Join
- Conn.Leave
- Conn.Emit

###Message
- Message.RoomLength
- Message.Room
- Message.EventLength
- Message.Event
- Message.DstLength
- Message.Dst
- Message.SrcLength
- Message.Src
- Message.PayloadLength
- Message.Payload

######RoomMessage
- RoomMessage.Sender
- RoomMessage.Data

###Room
- Room.Application
- Room.Name
- Room.Members
- Room.Stopchan
- Room.Joinchan
- Room.Leavechan
- Room.Send
- Room.Start
- Room.Stop
- Room.Join
- Room.Leave
- Room.Emit
