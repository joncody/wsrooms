(function (global) {
    'use strict';

    var socket = wsrooms("ws://localhost:8080/ws");

    socket.on("room-created", function (msg) {
        console.log(gg.toStringFromCodes(msg));
    });

    socket.on("room-destroyed", function (msg) {
        console.log(gg.toStringFromCodes(msg));
    });

    socket.on("joined", function (id) {
        console.log(id + " joined");
    });

    socket.on("left", function (id) {
        console.log(id + " left");
    });

    socket.on("room-joined", function (msg) {
        console.log(JSON.parse(gg.toStringFromCodes(msg)));
    });

    socket.on("room-left", function (msg) {
        console.log(JSON.parse(gg.toStringFromCodes(msg)));
    });

    function hello(msg) {
        console.log(gg.toStringFromCodes(msg));
    }
    socket.on("hello", hello);

    global.socket = socket;

}(window || this));
