//    Title: wsrooms.js
//    Author: Jon Cody
//
//    This program is free software: you can redistribute it and/or modify
//    it under the terms of the GNU General Public License as published by
//    the Free Software Foundation, either version 3 of the License, or
//    (at your option) any later version.
//
//    This program is distributed in the hope that it will be useful,
//    but WITHOUT ANY WARRANTY; without even the implied warranty of
//    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
//    GNU General Public License for more details.
//
//    You should have received a copy of the GNU General Public License
//    along with this program.  If not, see <http://www.gnu.org/licenses/>.

(function (global) {
    "use strict";

    if (!global.WebSocket) {
        return console.log("WebSocket is not supported by this browser.");
    }

    var rooms = {};
    var socket;
    var reserved = ["open", "close", "joined", "join", "leave", "left"];

    function getRoom(name) {
        var room = emitter();
        var store = {
            open: false,
            id: "",
            members: []
        };
        var join_data;

        if (typeof name !== "string") {
            return console.log("name is not a string");
        }
        if (rooms.hasOwnProperty(name)) {
            return rooms[name];
        }

        room.on("close", function () {
            store.open = false;
            store.members = [];
            store.id = "";
            delete rooms[name];
        });

        room.send = function (event, payload, dst) {
            var src = store.id;
            var data;

            if (store.open === false) {
                return console.log("socket is closed");
            }
            if (typeof event !== "string") {
                return console.log("event is not a string");
            }
            if (reserved.indexOf(event) !== -1) {
                return console.log("cannot send event with name " + event);
            }
            if (payload === undefined) {
                payload = "";
            }
            if (typeof dst !== "string") {
                dst = "";
            }
            data = betterview(name.length + event.length + dst.length + src.length + (payload.byteLength || payload.length || 0) + 20);
            data.writeUint32(name.length).writeString(name);
            data.writeUint32(event.length).writeString(event);
            data.writeUint32(dst.length).writeString(dst);
            data.writeUint32(src.length).writeString(src);
            data.writeUint32(payload.byteLength || payload.length || 0);
            if (typeof payload === "string") {
                data.writeString(payload);
            } else {
                data.writeBytes(payload);
            }
            socket.send(data.seek(0).getBytes());
        };

        room.join = function (roomname) {
            if (store.open === false) {
                return console.log("socket is closed");
            }
            if (typeof roomname !== "string") {
                return console.log("roomname is not a string");
            }
            if (roomname === "root") {
                return console.log("cannot join the root room - it is joined by default");
            }
            return rooms.hasOwnProperty(roomname)
                ? rooms[roomname]
                : getRoom(roomname);
        };

        room.leave = function () {
            var data;

            if (store.open === false) {
                return console.log("socket is closed");
            }
            data = betterview(name.length + "leave".length + (store.id.length * 2) + 20);
            data.writeUint32(name.length).writeString(name);
            data.writeUint32("leave".length).writeString("leave");
            data.writeUint32(0);
            data.writeUint32(store.id.length).writeString(store.id);
            data.writeUint32(store.id.length).writeString(store.id);
            socket.send(data.seek(0).getBytes());
        };

        room.parse = function (packet) {
            var index;
            var data;

            switch (packet.event) {
            case "join":
                store.id = packet.src;
                store.members = JSON.parse(betterview.getStringFromCodes(packet.payload));
                store.open = true;
                room.emit("open");
                data = betterview(name.length + "joined".length + (store.id.length * 2) + 20);
                data.writeUint32(name.length).writeString(name);
                data.writeUint32("joined".length).writeString("joined");
                data.writeUint32(0);
                data.writeUint32(store.id.length).writeString(store.id);
                data.writeUint32(store.id.length).writeString(store.id);
                socket.send(data.seek(0).getBytes());
                break;
            case "joined":
                packet.payload = betterview.getStringFromCodes(packet.payload);
                index = store.members.indexOf(packet.payload);
                if (index === -1) {
                    store.members.push(packet.payload);
                    room.emit("joined", packet.payload);
                }
                break;
            case "leave":
                data = betterview(name.length + "left".length + (store.id.length * 2) + 20);
                data.writeUint32(name.length).writeString(name);
                data.writeUint32("left".length).writeString("left");
                data.writeUint32(0);
                data.writeUint32(store.id.length).writeString(store.id);
                data.writeUint32(store.id.length).writeString(store.id);
                socket.send(data.seek(0).getBytes());
                room.emit("close");
                break;
            case "left":
                packet.payload = betterview.getStringFromCodes(packet.payload);
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

        room.open = function () {
            return store.open;
        };

        room.name = function () {
            return name;
        };

        room.members = function () {
            return store.members;
        };

        room.id = function () {
            return store.id;
        };

        rooms[name] = room;

        if (name !== "root") {
            join_data = betterview(name.length + "join".length + (store.id.length * 2) + 20);
            join_data.writeUint32(name.length).writeString(name);
            join_data.writeUint32("join".length).writeString("join");
            join_data.writeUint32(0);
            join_data.writeUint32(store.id.length).writeString(store.id);
            join_data.writeUint32(store.id.length).writeString(store.id);
            socket.send(join_data.seek(0).getBytes());
        } else {
            room.purge = function () {
                Object.keys(rooms).forEach(function (name) {
                    if (name !== "root") {
                        rooms[name].leave();
                    }
                });
            };
        }

        return Object.freeze(room);
    }

    function wsrooms(url) {
        var root = getRoom("root");

        if (typeof url !== "string") {
            return console.log("url must be a string");
        }
        socket = new WebSocket(url);
        socket.binaryType = "arraybuffer";

        socket.onmessage = function (e) {
            var data = betterview(e.data);
            var packet = {};

            packet.room = data.getString(data.getUint32());
            packet.event = data.getString(data.getUint32());
            packet.dst = data.getString(data.getUint32());
            packet.src = data.getString(data.getUint32());
            packet.payload = data.getBytes(data.getUint32());
            if (!rooms.hasOwnProperty(packet.room)) {
                return console.log("room does not exist");
            }
            rooms[packet.room].parse(packet);
        };

        socket.onclose = function () {
            Object.keys(rooms).forEach(function (name) {
                rooms[name].emit("close");
            });
        };

        socket.onerror = function (err) {
            throw err;
        };

        return root;
    }

    global.wsrooms = Object.freeze(wsrooms);

}(window || this));
