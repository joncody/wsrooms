package main

import (
	"github.com/joncody/wsrooms"
	"net/http"
	"html/template"
	"log"
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
	wsrooms.Emitter.On("hello", func (c *wsrooms.Conn, data []byte, msg *wsrooms.Message) {
		log.Println(msg)
	})
	http.HandleFunc("/", handler)
	http.HandleFunc("/static/", staticHandler)
	http.HandleFunc("/ws", wsrooms.SocketHandler)
	http.ListenAndServe(":8080", nil)
}
