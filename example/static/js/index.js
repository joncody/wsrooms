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
