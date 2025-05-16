# 🕸️ wsrooms

**A lightweight, event-driven WebSocket room communication library for Go and JavaScript.**

`wsrooms` enables structured, real-time messaging between clients using named rooms over WebSocket. This project includes both server (Go) and client (JavaScript) implementations using a shared custom binary message protocol.

---

## 📦 Features

- Room-based real-time messaging
- Private/direct messages between clients
- Custom extensible binary message protocol
- Event emitter-based client API
- Auto cleanup of empty rooms
- Cross-platform: Go server, JS browser client

---

## 🛠️ Installation

### Go Server

```bash
go get github.com/joncody/wsrooms
```

Dependencies:
```bash
go get github.com/gorilla/websocket
go get github.com/google/uuid
go get github.com/chuckpreslar/emission
```

### JavaScript Client

Add `wsrooms.js` to your HTML:

```html
<script src="path/to/gg.js"></script>
<script src="path/to/wsrooms.js"></script>
```

You’ll also need [`gg.js`](https://github.com/joncody/gg) — a utility library for better ArrayBuffer handling and event emitting.

---

## 🚀 Usage Example

### Go Server

```go
package main

import (
	"log"
	"net/http"
	"github.com/joncody/wsrooms"
)

func main() {
	http.HandleFunc("/ws", wsrooms.SocketHandler(nil))
	log.Println("Server started on :8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}
```

### JavaScript Client

```html
<script>
    const root = wsrooms("ws://localhost:8080/ws");

    root.on("open", function () {
        console.log("Connected as:", root.id());
        const chat = root.join("chat");

        chat.on("open", () => {
            console.log("Joined chat room");
            chat.send("message", "Hello everyone!");
        });

        chat.on("message", (payload, from) => {
            console.log(`Message from ${from}: ${new TextDecoder().decode(payload)}`);
        });

        chat.on("joined", (id) => {
            console.log(`${id} joined`);
        });

        chat.on("left", (id) => {
            console.log(`${id} left`);
        });
    });

    root.on("close", () => {
        console.log("Socket closed");
    });
</script>
```

---

## 📘 Protocol

Messages are structured in binary format:

| Field         | Type    | Description                  |
|---------------|---------|------------------------------|
| RoomLength    | uint32  | Length of room name          |
| Room          | string  | Room name                    |
| EventLength   | uint32  | Length of event name         |
| Event         | string  | Event name                   |
| DstLength     | uint32  | Length of destination ID     |
| Dst           | string  | Destination client ID        |
| SrcLength     | uint32  | Length of source ID          |
| Src           | string  | Source client ID             |
| PayloadLength | uint32  | Length of payload            |
| Payload       | []byte  | Payload (string or binary)   |

---

## 🧠 JavaScript API

### `wsrooms(url: string): Room`

Establishes a connection and returns the `root` room.

---

### Room Object

A room is created automatically when joined.

#### Properties & Methods

| Method / Prop     | Description |
|-------------------|-------------|
| `room.name`       | Room name |
| `room.open()`     | Returns `true` if connection is active |
| `room.id()`       | Returns the client's unique ID |
| `room.members()`  | Returns array of member IDs |
| `room.send(event, payload, dst)` | Sends an event (with optional binary/string payload) |
| `room.join(name)` | Joins another room |
| `room.leave()`    | Leaves this room |
| `room.on(event, fn)` | Subscribes to a room event |
| `room.clearListeners(exceptions?)` | Removes all listeners except the ones in `exceptions` |

#### Built-in Events

| Event     | Triggered When |
|-----------|----------------|
| `open`    | Successfully joined the room |
| `joined`  | A user joined the room |
| `left`    | A user left the room |
| `close`   | Connection to the room was closed |

---

## 📎 Example: Private Message

```javascript
chat.send("message", "Hey!", "other-client-id");
```

---

## 🧪 Testing

Use a tool like [WebSocket King](https://websocketking.com/) for manual testing, or use browser devtools console.

Ensure messages are encoded properly using `gg.betterview`.

---

## 🧱 Built With

- Go
- Gorilla WebSocket
- emission (Go)
- [gg.js](https://github.com/joncody/gg)

---

## 📜 License

See the [LICENSE](./LICENSE) file for details.
