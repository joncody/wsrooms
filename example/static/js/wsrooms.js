"use strict";

import gg from "./gg.js";

const global = globalThis || window || this;
const rooms = {};
const reserved = ["open", "close", "joined", "join", "leave", "left"];
let socket;

function buildMessage(room, event, dst, src, payload) {
    let data;
    let payloadlen;

    if (payload === undefined) {
        payload = "";
    }
    if (typeof dst !== "string") {
        dst = "";
    }
    if (typeof src !== "string") {
        src = "";
    }
    payloadlen = payload.byteLength || payload.length || 0;
    data = gg.betterview(room.length + event.length + dst.length + src.length + payloadlen + 20)
        .writeUint32(room.length).writeString(room)
        .writeUint32(event.length).writeString(event)
        .writeUint32(dst.length).writeString(dst)
        .writeUint32(src.length).writeString(src)
        .writeUint32(payloadlen);
    if (typeof payload === "string") {
        data.writeString(payload);
    } else {
        data.writeBytes(payload);
    }
    return data.seek(0).getBytes();
}

function getRoom(name) {
    const room = gg.emitter();
    const store = {
        open: false,
        id: "",
        members: []
    };
    let initdata;

    if (typeof name !== "string") {
        return console.warn("Room name must be a string");
    }
    if (rooms.hasOwnProperty(name)) {
        return rooms[name];
    }

    room.name = name;

    room.open = function () {
        return store.open;
    };

    room.members = function () {
        return gg.utils.copy(store.members);
    };

    room.id = function () {
        return store.id;
    };

    room.send = function (event, payload, dst) {
        if (store.open === false) {
            return console.warn("Cannot send: socket is closed.");
        }
        if (typeof event !== "string") {
            return console.warn("Event name must  be a string.");
        }
        if (reserved.includes(event)) {
            return console.warn("Reserved event: " + event);
        }
        socket.send(buildMessage(name, event, dst, store.id, payload));
    };

    room.join = function (roomname) {
        if (store.open === false) {
            return console.warn("Cannot send: socket is closed.");
        }
        if (typeof roomname !== "string") {
            return console.warn("Room name must be a string.");
        }
        if (roomname === "root") {
            return console.warn("Root room is always joined.");
        }
        return rooms.hasOwnProperty(roomname)
            ? rooms[roomname]
            : getRoom(roomname);
    };

    room.leave = function () {
        if (store.open === false) {
            return console.warn("Cannot leave: socket is closed.");
        }
        socket.send(buildMessage(name, "leave", store.id, store.id, ""));
    };

    room.parse = function (packet) {
        let index;
        let data;

        switch (packet.event) {
        case "join":
            store.id = packet.src;
            store.members = JSON.parse(gg.utils.toStringFromCodes(packet.payload));
            store.open = true;
            room.emit("open");
            socket.send(buildMessage(name, "joined", "", store.id, store.id))
            break;
        case "joined":
            packet.payload = gg.utils.toStringFromCodes(packet.payload);
            index = store.members.indexOf(packet.payload);
            if (index === -1) {
                store.members.push(packet.payload);
                room.emit("joined", packet.payload);
            }
            break;
        case "leave":
            socket.send(buildMessage(name, "left", "", store.id, store.id));
            room.emit("close");
            store.open = false;
            store.members = [];
            store.id = "";
            delete rooms[name];
            break;
        case "left":
            packet.payload = gg.utils.toStringFromCodes(packet.payload);
            index = store.members.indexOf(packet.payload);
            if (index !== -1) {
                store.members.splice(index, 1);
                room.emit("left", packet.payload);
            }
            break;
        default:
            room.emit(packet.event, packet.payload, packet.src);
        }
    };

    room.clearListeners = function (exceptions) {
        if (!gg.utils.isArray(exceptions)) {
            exceptions = [];
        }
        Object.keys(room.events).forEach(function (event) {
            if (exceptions.indexOf(event) === -1) {
                room.removeAllListeners(event);
            }
        });
    };

    rooms[name] = room;

    if (name !== "root") {
        socket.send(buildMessage(name, "join", store.id, store.id, ""));
    } else {
        room.purge = function () {
            Object.keys(rooms).forEach(function (name) {
                if (name !== "root") {
                    rooms[name].leave();
                }
            });
        };
        room.rooms = function () {
            return gg.utils.copy(rooms);
        };
    }

    return Object.freeze(room);
}

export default function wsrooms(url) {
    const root = getRoom("root");

    if (typeof url !== "string") {
        return console.warn("WebSocket URL must be a string.");
    }
    socket = new WebSocket(url);
    socket.binaryType = "arraybuffer";

    socket.onmessage = function (e) {
        const data = gg.betterview(e.data);
        const packet = {
            room: data.getString(data.getUint32()),
            event: data.getString(data.getUint32()),
            dst: data.getString(data.getUint32()),
            src: data.getString(data.getUint32()),
            payload: data.getBytes(data.getUint32())
        };
        console.log(packet);

        if (!rooms.hasOwnProperty(packet.room)) {
            return console.warn("Room " + packet.room + " does not exist.");
        }
        rooms[packet.room].parse(packet);
    };

    socket.onclose = function () {
        Object.keys(rooms).forEach(function (name) {
            rooms[name].emit("close");
        });
    };

    socket.onerror = function (err) {
        console.error("WebSocket error: " + err);
    };

    return root;
}
