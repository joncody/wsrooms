package wsrooms

import (
	"bytes"
	"encoding/binary"
)

// Message represents a length-prefixed message
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

// readString reads a length-prefixed string from a buffer
func readString(buf *bytes.Buffer) (string, int) {
	if buf.Len() < 4 {
		return "", 0
	}
	length := int(binary.BigEndian.Uint32(buf.Next(4)))
	if length < 0 || buf.Len() < length {
		return "", 0
	}
	return string(buf.Next(length)), length
}

// readPayload reads a length-prefixed byte slice from a buffer
func readPayload(buf *bytes.Buffer) ([]byte, int) {
	if buf.Len() < 4 {
		return nil, 0
	}
	length := int(binary.BigEndian.Uint32(buf.Next(4)))
	if length < 0 || buf.Len() < length {
		return nil, 0
	}
	return buf.Next(length), length
}

// BytesToMessage decodes bytes into a Message
func BytesToMessage(data []byte) *Message {
	if len(data) < 24 {
		return nil
	}
	buf := bytes.NewBuffer(data)
	msg := &Message{}
	msg.Room, msg.RoomLength = readString(buf)
	msg.Event, msg.EventLength = readString(buf)
	msg.Dst, msg.DstLength = readString(buf)
	msg.Src, msg.SrcLength = readString(buf)
	msg.Payload, msg.PayloadLength = readPayload(buf)
	return msg
}

// Bytes serializes a Message into bytes
func (msg *Message) Bytes() []byte {
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

// NewMessage builds a new Message
func NewMessage(room, event, dst, src string, payload []byte) *Message {
	return &Message{
		RoomLength:    len(room),
		Room:          room,
		EventLength:   len(event),
		Event:         event,
		DstLength:     len(dst),
		Dst:           dst,
		SrcLength:     len(src),
		Src:           src,
		PayloadLength: len(payload),
		Payload:       payload,
	}
}

