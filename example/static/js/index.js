"use strict";

import wsrooms from "./wsrooms.js";
import utils from "./utils.js";

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
        console.log(senderId, "says:", utils.stringFromCodes(payload));
    });

    // Send a message
    root.send("chat", "Hello World!");
});

// Listen for messages
root.on("chat", (payload, senderId) => {
    console.log(senderId, "says:", payload);
});
