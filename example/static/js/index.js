(function (global) {
    'use strict';

    var socket = wsrooms("ws://localhost:8080/ws");

    socket.on("joined", function (id) {
        console.log(id + " joined");
    });

    socket.on("left", function (id) {
        console.log(id + " left");
    });

    function hello(msg) {
        console.log(gg.toStringFromCodes(msg));
    }
    socket.on("hello", hello);

    global.socket = socket;

}(window || this));
