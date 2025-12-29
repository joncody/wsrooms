# `wsrooms` – Room-Based WebSocket Framework

A lightweight, high-performance WebSocket framework for real-time applications in Go (server) and JavaScript (client). Built around **rooms**, **binary framing**, and **explicit message routing**, `wsrooms` handles connection lifecycle, room membership, and concurrency so you don’t have to.

---

## ✅ Key Features

- 🏢 **Automatic Room Management**: Create/join/leave rooms on demand.
- ⚡ **Efficient Binary Protocol**: Uses length-prefixed fields for compact, fast message encoding.
- 📨 **Flexible Messaging**:
  - Broadcast to rooms (excluding sender)
  - Send direct messages to peers
  - **Send private messages to self** via `TrySend`
- 🔒 **Concurrency-Safe**: Thread-safe rooms and hub using Go’s `sync` primitives.
- 🧩 **Handler Registration**: Register per-event logic on the server with `RegisterHandler`.
- 🌐 **Single Root Connection**: Clients start in a `"root"` room and dynamically join others.
- 📦 **Minimal Dependencies**: Only `gorilla/websocket` (Go) and standard JS.

---

## 📦 Installation

### Go Server
```bash
go get github.com/joncody/wsrooms
```

### JavaScript Client
Include these files in your frontend:
- `wsrooms.js`
- `bytecursor.js` (for binary parsing)
- `emitter.js` (optional, if using event emitter pattern)

```js
import wsrooms from './wsrooms.js';
```

---

## 🧠 Quick Start

### 1. Go Server
```go
package main

import (
	"log"
	"net/http"
	"github.com/joncody/wsrooms"
)

func main() {
	// Register custom event handler
	err := wsrooms.RegisterHandler("ping", func(c *wsrooms.Conn, msg *wsrooms.Message) error {
		// Respond directly to the sender
		reply := wsrooms.NewMessage("util", "pong", "", c.ID, nil)
		c.TrySend(reply.Bytes())
		return nil
	})
	if err != nil {
		log.Fatal(err)
	}

	http.HandleFunc("/ws", wsrooms.SocketHandler(nil))
	http.ListenAndServe(":8080", nil)
}
```

### 2. JavaScript Client
```js
"use strict";

import wsrooms from "./wsrooms.js";

const decoder = new TextDecoder();
const root = wsrooms("ws://localhost:8080/ws");

root.on("open", () => {
    console.log("Connected! My ID:", root.id());
	const lobby = root.join("lobby");
	lobby.on("open", () => {
		lobby.send("ping", new Uint8Array());
	});
	lobby.on("pong", (payload, senderId) => {
		console.log("Received pong from", senderId);
	});
	lobby.on("new_member", (id) => {
        console.log(`User joined: ${id}`);
	});
    lobby.on("member_left", (id) => {
        console.log(`User left: ${id}`);
    });
});
```

---

## 📚 Client API (`wsrooms.js`)

### Initialization
```js
const root = wsrooms("ws://...");
```
Returns the `root` room. All other rooms are created via `.join()`.

### Room Methods
| Method | Description |
|--------|-------------|
| `.join(name)` | Joins a room; returns a frozen `Room` object. |
| `.leave()` | Leaves the room and cleans up listeners. |
| `.send(event, payload, [dst])` | Sends a message (to room or direct to `dst`). |
| `.open()` | `true` if the room is active. |
| `.members()` | Returns a deep copy of current member IDs. |
| `.id()` | Returns your client ID in this room. |

### Events
Use `.on(event, handler)` to listen:
- `"open"` — room joined successfully
- `"close"` — room left or connection closed
- `"new_member"` — `(memberId)` when someone joins
- `"member_left"` — `(memberId)` when someone leaves
- Custom events (e.g., `"chat"`) — `(payload, senderId)`

> ⚠️ Reserved event names (`join`, `leave`, `join_ack`, etc.) cannot be used for custom messages.

---

## 📚 Server API (`wsrooms` Go package)

### Core Functions
| Function | Description |
|--------|-------------|
| `RegisterHandler(event string, handler func(*Conn, *Message) error)` | Registers a custom message handler. Returns error if duplicate or invalid. |
| `SocketHandler(auth Authorize)` | Returns an `http.HandlerFunc`. Optional `auth` function extracts claims from request. |

### `*Conn` Methods
| Method | Description |
|--------|-------------|
| `SendToRoom(room, event string, payload []byte)` | Broadcasts to all room members **except sender**. |
| `SendToClient(dstID, event string, payload []byte)` | Sends direct message to another client (uses `"root"` room internally). |
| `TrySend(msg []byte) bool` | **Sends a message to self** (e.g., acks, replies). Non-blocking; returns `false` if client is slow/disconnected. |
| `ID` | Unique connection UUID (read-only field). |
| `Claims` | Map of auth claims (e.g., from JWT). |

### Message Utilities
| Function | Description |
|--------|-------------|
| `NewMessage(room, event, dst, src string, payload []byte) *Message` | Builds a message struct. |
| `BytesToMessage([]byte) *Message` | Decodes binary message (used internally). |

> The server **automatically** handles `"join"`/`"leave"` events. Custom events are routed to registered handlers or broadcast if unhandled.

---

## 📐 Message Protocol (Binary)

Each message is a sequence of **length-prefixed** fields (big-endian `uint32`):

1. Room name (`string`)
2. Event name (`string`)
3. Destination ID (`string`, empty = broadcast)
4. Source ID (`string`)
5. Payload (`[]byte`)

Example:  
`[4][lobby][4][chat][0][][36][abc...][11][Hello room!]`

> Clients must send/receive **binary WebSocket frames**, not text.

---

## 🛡️ Concurrency & Safety

- All room operations are **goroutine-safe**.
- Connections use buffered channels + ping/pong to prevent hangs.
- **Non-blocking sends**: `TrySend` and internal messaging never block.
- Rooms auto-clean when empty.
- Malformed or oversized messages are dropped.

---

## 📄 License

See [LICENSE](./LICENSE)
