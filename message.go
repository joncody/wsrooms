//    Title: message.go
//    Author: Jon Cody
//
//    This program is free software: you can redistribute it and/or modify
//    it under the terms of the GNU General Public License as published by
//    the Free Software Foundation, either version 3 of the License, or
//    (at your option) any later version.
//
//    This program is distributed in the hope that it will be useful,
//    but WITHOUT ANY WARRANTY; without even the implied warranty of
//    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
//    GNU General Public License for more details.
//
//    You should have received a copy of the GNU General Public License
//    along with this program.  If not, see <http://www.gnu.org/licenses/>.

package wsrooms

import (
	"bytes"
	"encoding/binary"
)

type Message struct {
	RoomLength    int
	Room          string
	EventLength   int
	Event         string
	DstLength     int
	Dst           string
	SrcLength     int
	Src           string
	PayloadLength int
	Payload       []byte
}

type RoomMessage struct {
	Sender *Conn
	Data   []byte
}

func BytesToMessage(data []byte) *Message {
	msg := &Message{}
	buf := bytes.NewBuffer(data)
	msg.RoomLength = int(binary.BigEndian.Uint32(buf.Next(4)))
	msg.Room = string(buf.Next(msg.RoomLength))
	msg.EventLength = int(binary.BigEndian.Uint32(buf.Next(4)))
	msg.Event = string(buf.Next(msg.EventLength))
	msg.DstLength = int(binary.BigEndian.Uint32(buf.Next(4)))
	msg.Dst = string(buf.Next(msg.DstLength))
	msg.SrcLength = int(binary.BigEndian.Uint32(buf.Next(4)))
	msg.Src = string(buf.Next(msg.SrcLength))
	msg.PayloadLength = int(binary.BigEndian.Uint32(buf.Next(4)))
	msg.Payload = buf.Next(msg.PayloadLength)
	return msg
}

func MessageToBytes(msg *Message) []byte {
	buf := bytes.NewBuffer([]byte{})
	binary.Write(buf, binary.BigEndian, uint32(msg.RoomLength))
	buf.Write([]byte(msg.Room))
	binary.Write(buf, binary.BigEndian, uint32(msg.EventLength))
	buf.Write([]byte(msg.Event))
	binary.Write(buf, binary.BigEndian, uint32(msg.DstLength))
	buf.Write([]byte(msg.Dst))
	binary.Write(buf, binary.BigEndian, uint32(msg.SrcLength))
	buf.Write([]byte(msg.Src))
	binary.Write(buf, binary.BigEndian, uint32(msg.PayloadLength))
	buf.Write(msg.Payload)
	return buf.Bytes()
}
