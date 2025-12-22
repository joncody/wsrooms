# `wsrooms` – Room-Based WebSocket Framework

A high-performance, event-driven WebSocket framework for Go and JavaScript.

**wsrooms** provides a robust infrastructure for building real-time applications. It features automatic room management, binary message framing for speed, a built-in event emitter on the server, and a simple client-side API. It handles the heavy lifting of connection tracking, broadcasting, and direct messaging so you can focus on application logic.

---

## ✅ Features

- 🏢 **Room System:** Automatic creation, joining, and leaving of rooms.
- ⚡ **Binary Protocol:** Custom binary framing using `betterview` for minimal overhead.
- 📨 **Direct Messaging:** Send messages to specific peers or broadcast to rooms.
- 👂 **Server-Side Emitter:** Node.js-style event listeners in Go (`On`, `Emit`).
- 🔄 **State Synchronization:** Clients automatically track room membership state.
- 🔒 **Concurrency Safe:** Built with Go's `sync.Mutex` and channels for thread safety.
- 📦 **Full Stack:** Includes both Go server handler and JavaScript client library.

---

## 📦 Installation

### Server (Go)

```bash
go get github.com/joncody/wsrooms
```

### Client (JavaScript)

Copy `wsrooms.js` (and dependencies `betterview.js` and `emitter.js`) into your project.

```js
import wsrooms from './wsrooms.js';
```

---

## 🧠 Quick Examples

### 1. Server Setup (Go)

```go
package main

import (
	"net/http"
	"github.com/joncody/wsrooms"
)

func main() {
    // Register event listeners
    wsrooms.Emitter.On("chat", func(c *wsrooms.Conn, msg *wsrooms.Message) {
        // Broadcast the message back to the room the client sent it to
        c.Emit(msg) 
    })

    // Mount the WebSocket handler
    http.HandleFunc("/ws", wsrooms.SocketHandler(nil))
    
    // Start server
    http.ListenAndServe(":8080", nil)
}
```

### 2. Client Usage (JavaScript)

```js
"use strict";

import wsrooms from "./wsrooms.js";

const decoder = new TextDecoder("utf-8");
// Connect to the server
const root = wsrooms("ws://localhost:8080/ws");

// Listen for connection success
root.on("open", () => {
    console.log("Joined Lobby! My ID:", root.id());
    const lobby = root.join("lobby");

    lobby.on("open", () => {
        lobby.send("chat", "Hello, planet!");
    });
    lobby.on("chat", (payload, senderId) => {
        console.log(senderId, "says:", decoder.decode(payload));
    });

    // Send a message
    root.send("chat", "Hello World!");
});

// Listen for messages
root.on("chat", (payload, senderId) => {
    console.log(senderId, "says:", payload);
});

```

---

## 📚 Client API (JavaScript)

### 🟢 Initialization

| Function | Description |
|----------|-------------|
| `wsrooms(url)` | Connects to the WebSocket URL and returns the `root` room instance. |

### 🏢 Room Methods

Every instance returned by `join()` is a Room object.

| Function | Description |
|----------|-------------|
| `join(roomName)` | Joins a new room. Returns a new `Room` object. |
| `leave()` | Leaves the current room and closes listeners. |
| `send(event, payload, [dst])` | Sends a message. `dst` is optional (for DM). |
| `open()` | Returns `true` if currently joined to the room. |
| `members()` | Returns an array of member IDs in the room. |
| `id()` | Returns your unique Client ID in this room. |

### ⚡ Events

Listen to events using `.on(event, handler)`.

| Event | Payload | Description |
|-------|---------|-------------|
| `open` | *(none)* | Fired when successfully joined. |
| `close` | *(none)* | Fired when leaving the room. |
| `joined` | `memberId` | Fired when a new user joins the room. |
| `left` | `memberId` | Fired when a user leaves the room. |
| *(custom)* | `payload, src` | Fired when receiving custom messages (e.g., "chat"). |

---

## 📚 Server API (Go)

### ⚙️ Core

| Function | Description |
|----------|-------------|
| `SocketHandler(CookieReader)` | Returns an `http.HandlerFunc`. Takes an optional function to parse cookies into the connection. |
| `Emitter.On(event, handler)` | Registers a listener for incoming messages. Handler signature: `func(c *Conn, msg *Message)`. |

### 🔌 Connection (`*Conn`)

| Function | Description |
|----------|-------------|
| `Join(roomName)` | Adds the connection to a room. |
| `Leave(roomName)` | Removes the connection from a room. |
| `Emit(msg)` | Broadcasts a message to the room specified in the message structure. |
| `ID` | The unique UUID of the connection. |

### 📨 Message (`*Message`)

Helper to construct messages for sending.

```go
// ConstructMessage(room, event, dst, src, payload)
msg := wsrooms.ConstructMessage("Lobby", "alert", "", "server", []byte("System Message"))
```

---

## 📐 Protocol

Messages are packed into a binary format to reduce bandwidth.

**Structure:**
1.  `uint32` Room Name Length
2.  `string` Room Name
3.  `uint32` Event Name Length
4.  `string` Event Name
5.  `uint32` Destination ID Length
6.  `string` Destination ID
7.  `uint32` Source ID Length
8.  `string` Source ID
9.  `uint32` Payload Length
10. `bytes` Payload

---

## 📄 License

See the [LICENSE](./LICENSE) file for details.
