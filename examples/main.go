package main

import (
	"html/template"
	"log"
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

func helloHandler(c *wsrooms.Conn, msg *wsrooms.Message) error {
	c.SendToRoom(msg.Room, msg.Event, msg.Payload)
	return nil
}

func main() {
	if err := wsrooms.RegisterHandler("hello", helloHandler); err != nil {
		log.Fatal("Failed to register handler:", err)
	}
	http.HandleFunc("/", handler)
	http.HandleFunc("/static/", staticHandler)
	http.HandleFunc("/ws", wsrooms.SocketHandler(nil))
	http.ListenAndServe(":8080", nil)
}
