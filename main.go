package main

import (
	"encoding/json"
	"log"
	"net/http"

	"github.com/googollee/go-socket.io"
)

func main() {
	server, err := socketio.NewServer(nil)
	if err != nil {
		log.Fatal(err)
	}
	server.On("connection", func(so socketio.Socket) {
		log.Println("on connection")

		so.On("login", func(msg string) {
			log.Println(msg)
			rooms := []string{"lobby", "discussion", "topic"} // so.Rooms()
			byteRooms, _ := json.Marshal(rooms)
			log.Println(byteRooms)
			so.Emit("room list", string(byteRooms))
		})

		so.On("join room", func(msg string) {
			if err := so.Join(msg); err != nil {
				log.Println("Fail:room list get ", err)
			}
			log.Println("join room:", msg)
		})

		so.On("new message", func(msg string) {
			var m Message
			if err := json.Unmarshal([]byte(msg), &m); err != nil {
				log.Println("json parse error:", err)
			}
			log.Println("emit:", so.Emit("new message", msg))
			log.Println(msg)
			log.Println("broadcast", so.BroadcastTo(m.Room, "new message", msg))
		})

		so.On("disconnection", func() {
			log.Println("on disconnect")
		})
	})
	server.On("error", func(so socketio.Socket, err error) {
		log.Println("error:", err)
	})

	http.Handle("/socket.io/", server)
	http.Handle("/", http.FileServer(http.Dir("./public")))
	log.Println("Serving at localhost:5000...")
	log.Fatal(http.ListenAndServe(":5000", nil))
}

type Message struct {
	Text string `json:"text"`
	User string `json:"user"`
	Room string `json:"room"`
	Time string `json:"time"`
}
