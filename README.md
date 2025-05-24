# WSRooms WebSocket Example

This project demonstrates a simple WebSocket-based application using **Go** for the backend and **JavaScript** for the frontend. It uses WebSockets to allow users to join rooms and send messages to each other in real-time.

## Project Structure

```
project-directory/
├── go/
│   └── server.go        # Go WebSocket server code
├── public/
│   └── index.html       # HTML page for the front-end
├── static/
│   └── js/
│       └── index.js     # WebSocket client-side JS
└── go.mod               # Go module file (if applicable)
```

## Backend (Go WebSocket Server)

### Setup

1. **Install Go**
   Ensure that you have Go installed. You can download it from [https://golang.org/dl/](https://golang.org/dl/).

2. **Install Dependencies**
   The project uses the `wsrooms` Go package, which is a WebSocket library for managing rooms and broadcasting messages.

   To install the necessary Go modules, run the following:

   ```bash
   go mod tidy
   ```

3. **Running the Go Server**
   To run the server, use the following command:

   ```bash
   go run go/server.go
   ```

   This will start the server at `http://localhost:8080`.

### How It Works

- The Go server handles WebSocket connections via the `wsrooms` library, which is responsible for managing rooms and broadcasting messages to all clients connected to a room.
- The `SocketHandler` in Go is set up to accept WebSocket connections on the `/ws` route.

### Backend Code (`server.go`)

```go
package main

import (
	"html/template"
	"net/http"

	"github.com/joncody/wsrooms"
)

var index = template.Must(template.ParseFiles("index.html"))

func handler(w http.ResponseWriter, r *http.Request) {
	if r.Method != "GET" {
		http.Error(w, "Method not allowed", 405)
		return
	}
	index.Execute(w, nil)
}

func staticHandler(w http.ResponseWriter, r *http.Request) {
	http.ServeFile(w, r, r.URL.Path[1:])
}

func main() {
	wsrooms.Emitter.On("hello", func(c *wsrooms.Conn, msg *wsrooms.Message) {
		c.Emit(msg)
	})

	http.HandleFunc("/", handler)
	http.HandleFunc("/static/", staticHandler)
	http.HandleFunc("/ws", wsrooms.SocketHandler(nil))

	http.ListenAndServe(":8080", nil)
}
```

## Frontend (JavaScript WebSocket Client)

### Setup

1. **Directory Structure**
   The client-side JavaScript code is located in the `/static/js/index.js` file.

2. **Running the Frontend**
   The frontend will automatically load the WebSocket client (`index.js`) in the `index.html` file, which will try to establish a WebSocket connection to the server at `ws://localhost:8080/ws`.

   To run the frontend, simply navigate to `http://localhost:8080/` in your browser.

### Frontend Code (`index.js`)

```javascript
"use strict";

import wsrooms from "./wsrooms.js";

// Connect to the WebSocket server
const socket = wsrooms("ws://localhost:8080/ws");

// Listen for the "joined" event
socket.on("joined", function (id) {
    console.log(id + " joined");
});

// Listen for the "left" event
socket.on("left", function (id) {
    console.log(id + " left");
});
```

### HTML File (`index.html`)

```html
<!DOCTYPE html>
<html>
    <head lang="en">
        <meta charset="UTF-8">
        <meta name="author" content="Jon Cody">
        <meta name="viewport" content="width=device-width, height=device-height, user-scalable=no, initial-scale=1, maximum-scale=1, minimum-scale=1">
        <title>WSRooms</title>
    </head>
    <body>
        <script type="module" src="/static/js/index.js"></script>
    </body>
</html>
```

## Installation and Running the App

### 1. Clone the repository:

```bash
git clone <repository-url>
cd <project-directory>
```

### 2. Install Go dependencies:

Run the following to install the necessary Go dependencies:

```bash
go mod tidy
```

### 3. Start the Go WebSocket Server:

Run the Go server with:

```bash
go run go/server.go
```

This will start the server at `http://localhost:8080`.

### 4. Open the Frontend:

Open `http://localhost:8080/` in your browser to access the frontend. The JavaScript WebSocket client will automatically attempt to connect to the WebSocket server.

### 5. Interact with the App:

- When a user joins or leaves a room, the WebSocket client in the browser will log the messages in the browser console.
- The server uses the `wsrooms` package to manage connections and rooms and will broadcast events like `joined` and `left` to all connected clients.

## License

See the [LICENSE](./LICENSE) file for details.
