package roomer

import (
	"encoding/json"
	"fmt"
	"net/http"
	"sync"
)

// Authorize is a function that extracts authenticated claims from an HTTP request.
type Authorize func(*http.Request) (map[string]string, error)

// MessageHandler processes a custom event message from a connection.
type MessageHandler func(c *Conn, msg *Message) error

var (
	messageHandlersMu sync.RWMutex
	messageHandlers   = make(map[string]MessageHandler)
)

// RegisterHandler registers a custom event handler for a given event name.
func RegisterHandler(event string, handler MessageHandler) error {
	if event == "" {
		return fmt.Errorf("event name cannot be empty")
	}
	if handler == nil {
		return fmt.Errorf("handler cannot be nil")
	}
	messageHandlersMu.Lock()
	defer messageHandlersMu.Unlock()
	if _, exists := messageHandlers[event]; exists {
		return fmt.Errorf("handler for event %q already registered", event)
	}
	messageHandlers[event] = handler
	return nil
}

// getHandler returns the registered handler for an event, if any.
func getHandler(event string) MessageHandler {
	messageHandlersMu.RLock()
	defer messageHandlersMu.RUnlock()
	return messageHandlers[event]
}

// SocketHandler returns an HTTP handler that upgrades to WebSocket and manages the connection lifecycle.
func SocketHandler(authFn Authorize) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != "GET" {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}
		var claims map[string]string
		if authFn != nil {
			var err error
			claims, err = authFn(r)
			if err != nil {
				http.Error(w, "Unauthorized", http.StatusUnauthorized)
				return
			}
		}
		c := newConnection(w, r, claims)
		if c == nil {
			return
		}
		hub.addConn(c)
		go c.writePump()
		go c.readPump()
		hub.joinRoom("root", c)
		// Send join_ack for "root" room
		members := []byte("[]")
		if room, ok := hub.getRoom("root"); ok {
			if snap, err := json.Marshal(room.snapshot()); err == nil {
				members = snap
			}
		}
		ack := NewMessage("root", "join_ack", "", c.ID, members).Bytes()
		if !c.TrySend(ack) {
			return
		}
	}
}
