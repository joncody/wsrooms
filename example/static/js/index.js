"use strict";

import wsrooms from "./wsrooms.js";

const socket = wsrooms("ws://localhost:8080/ws");

socket.on("joined", function (id) {
    console.log(id + " joined");
});

socket.on("left", function (id) {
    console.log(id + " left");
});
