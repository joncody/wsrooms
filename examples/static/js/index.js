"use strict";

import roomer from "./roomer.js";

const decoder = new TextDecoder();
const root = roomer("ws://localhost:8080/ws");

root.on("open", () => {
    console.log("Joined Lobby! My ID:", root.id());
	const lobby = root.join("lobby");
	lobby.on("open", () => {
		lobby.send("chat", "Hello room!");
	});
	lobby.on("chat", (payload, senderId) => {
		console.log(`${senderId}: ${decoder.decode(payload)}`);
	});
	lobby.on("new_member", (id) => {
        console.log(`User joined: ${id}`);
	});
    lobby.on("member_left", (id) => {
        console.log(`User left: ${id}`);
    });
});
