"use strict";

import betterview from "./betterview.js";
import emitter from "./emitter.js";
import utils from "./utils.js";

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
    data = betterview(new ArrayBuffer(room.length + event.length + dst.length + src.length + payloadlen + 20));
    data.writeUint32(room.length).writeString(room);
    data.writeUint32(event.length).writeString(event);
    data.writeUint32(dst.length).writeString(dst);
    data.writeUint32(src.length).writeString(src);
    data.writeUint32(payloadlen);
    if (typeof payload === "string") {
        data.writeString(payload);
    } else {
        data.writeBytes(payload);
    }
    return data.rewind().getBytes();
}

function getRoom(name) {
    const room = emitter();
    const members = [];
    let open = false;
    let roomID = "";

    if (typeof name !== "string") {
        return console.warn("Room name must be a string");
    }
    if (rooms.hasOwnProperty(name)) {
        return rooms[name];
    }

    room.name = name;

    room.open = function () {
        return open;
    };

    room.members = function () {
        return global.structuredClone(members);
    };

    room.id = function () {
        return roomID;
    };

    room.send = function (event, payload, dst) {
        if (open === false) {
            return console.warn("Cannot send: socket is closed.");
        }
        if (typeof event !== "string") {
            return console.warn("Event name must  be a string.");
        }
        if (reserved.includes(event)) {
            return console.warn("Reserved event: " + event);
        }
        socket.send(buildMessage(name, event, dst, roomID, payload));
    };

    room.join = function (roomname) {
        if (open === false) {
            return console.warn("Cannot send: socket is closed.");
        }
        if (typeof roomname !== "string") {
            return console.warn("Room name must be a string.");
        }
        if (roomname === "root") {
            return console.warn("Root room is always joined.");
        }
        return (
            rooms.hasOwnProperty(roomname)
            ? rooms[roomname]
            : getRoom(roomname)
        );
    };

    room.leave = function () {
        if (open === false) {
            return console.warn("Cannot leave: socket is closed.");
        }
        socket.send(buildMessage(name, "leave", roomID, roomID, ""));
    };

    room.parse = function (packet) {
        let index;

        switch (packet.event) {
        case "join":
            roomID = packet.src;
            members.push(...JSON.parse(utils.stringFromCodes(packet.payload)));
            open = true;
            room.emit("open");
            socket.send(buildMessage(name, "joined", "", roomID, roomID));
            break;
        case "joined":
            packet.payload = utils.stringFromCodes(packet.payload);
            index = members.indexOf(packet.payload);
            if (index === -1) {
                members.push(packet.payload);
                room.emit("joined", packet.payload);
            }
            break;
        case "leave":
            socket.send(buildMessage(name, "left", "", roomID, roomID));
            room.emit("close");
            open = false;
            members.length = 0;;
            roomID = "";
            delete rooms[name];
            break;
        case "left":
            packet.payload = utils.stringFromCodes(packet.payload);
            index = members.indexOf(packet.payload);
            if (index !== -1) {
                members.splice(index, 1);
                room.emit("left", packet.payload);
            }
            break;
        default:
            room.emit(packet.event, packet.payload, packet.src);
        }
    };

    room.clearListeners = function (exceptions) {
        if (!Array.isArray(exceptions)) {
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
        socket.send(buildMessage(name, "join", roomID, roomID, ""));
    } else {
        room.purge = function () {
            Object.keys(rooms).forEach(function (name) {
                if (name !== "root") {
                    rooms[name].leave();
                }
            });
        };
        room.rooms = function () {
            return global.structuredClone(rooms);
        };
    }

    return Object.freeze(room);
}

const wsrooms = function (url) {
    const root = getRoom("root");

    if (typeof url !== "string") {
        return console.warn("WebSocket URL must be a string.");
    }
    socket = new WebSocket(url);
    socket.binaryType = "arraybuffer";

    socket.onmessage = function (e) {
        const data = betterview(e.data);
        const packet = {
            room: data.getString(data.getUint32()),
            event: data.getString(data.getUint32()),
            dst: data.getString(data.getUint32()),
            src: data.getString(data.getUint32()),
            payload: data.getBytes(data.getUint32())
        };

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
};

export default Object.freeze(wsrooms);
