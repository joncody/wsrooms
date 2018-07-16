//    Title: betterview.js
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

    if (ArrayBuffer.prototype.slice === undefined) {
        ArrayBuffer.prototype.slice = function (start, end) {
            var that = new Uint8Array(this);
            var result;
            var resultarray;
            var i;

            if (end === undefined) {
                end = that.length;
            }
            result = new ArrayBuffer(end - start);
            resultarray = new Uint8Array(result);
            for (i = 0; i < resultarray.length; i += 1) {
                resultarray[i] = that[i + start];
            }
            return result;
        };
    }

    var numbersandbytes = {
        "Int8": 1,
        "Uint8": 1,
        "Int16": 2,
        "Uint16": 2,
        "Int32": 4,
        "Uint32": 4,
        "Float32": 4,
        "Float64": 8
    };

    function isTypedArray(array) {
        var arraytypes = [
            "Int8Array",
            "Uint8Array",
            "Uint8ClampedArray",
            "Int16Array",
            "Uint16Array",
            "Int32Array",
            "Uint32Array",
            "Float32Array",
            "Float64Array"
        ];
        var type = Object.prototype.toString.call(array).replace(/\[object\s(\w+)\]/, "$1");

        return arraytypes.indexOf(type) > -1;
    }

    function getCodesFromString(string) {
        var codes = [];

        if (typeof string !== "string") {
            string = "";
        }
        string.split("").forEach(function (character) {
            codes.push(character.charCodeAt(0));
        });
        return codes;
    }

    function getStringFromCodes(codes) {
        var string = "";

        if (codes === undefined || codes === null) {
            codes = [];
        }
        Array.prototype.slice.call(codes).forEach(function (character) {
            string += String.fromCharCode(character);
        });
        return string;
    }

    function toUint8(array) {
        if (array === undefined || array === null) {
            array = 0;
        } else if (typeof array === "boolean") {
            array = array === true
                ? [1]
                : [0];
        } else if (typeof array === "string") {
            array = getCodesFromString(array);
        }
        return new Uint8Array(array);
    }

    function toBuffer(buffer) {
        if (isTypedArray(buffer)) {
            buffer = buffer.buffer;
        } else if (!(buffer instanceof ArrayBuffer)) {
            buffer = toUint8(buffer).buffer;
        }
        return buffer;
    }

    function betterview(buffer, offset, length) {
        var better = {};
        var store = {};

        store.buffer = toBuffer(buffer);
        store.view = new DataView(store.buffer, offset || 0, length || store.buffer.byteLength);
        store.offset = 0;

        function checkBounds(offset, len) {
            if (typeof offset !== "number") {
                return console.log("offset is not a number");
            }
            if (offset < 0) {
                return console.log("offset is negative");
            }
            if (typeof len !== "number") {
                return console.log("len is not a number");
            }
            if (len < 0) {
                return console.log("len is negative");
            }
            if (offset + len > store.view.byteLength) {
                return console.log("bounds exceeded");
            }
        }

        function tell() {
            return store.offset;
        }

        function seek(value) {
            checkBounds(value, 0);
            store.offset = value;
            return better;
        }

        function skip(value) {
            checkBounds(store.offset + value, 0);
            store.offset += value;
            return better;
        }

        function slice(start, end) {
            return store.view.buffer.slice(start, end);
        }

        function getBytes(len, offset) {
            offset = offset === undefined
                ? store.offset
                : offset;
            len = len === undefined
                ? store.view.byteLength - offset
                : len;
            checkBounds(offset, len);
            store.offset = offset + len;
            return toUint8(store.view.buffer.slice(offset, offset + len));
        }

        function setBytes(offset, bytes) {
            var convertedbytes = toUint8(bytes);
            var len = convertedbytes.byteLength || convertedbytes.length || 0;

            offset = offset === undefined
                ? store.offset
                : offset;
            checkBounds(offset, len);
            store.offset = offset + len;
            toUint8(store.view.buffer).set(convertedbytes, offset);
            return better;
        }

        function writeBytes(bytes) {
            var convertedbytes = toUint8(bytes);
            var len = convertedbytes.byteLength || convertedbytes.length || 0;

            checkBounds(store.offset, len);
            toUint8(store.view.buffer).set(convertedbytes, store.offset);
            store.offset = store.offset + len;
            return better;
        }

        function getString(len, offset) {
            return getStringFromCodes(getBytes(len, offset));
        }

        function setString(offset, string) {
            return setBytes(offset, getCodesFromString(string));
        }

        function writeString(string) {
            return writeBytes(getCodesFromString(string));
        }

        function getChar(offset) {
            return getString(1, offset);
        }

        function setChar(offset, character) {
            return setString(offset, character);
        }

        function writeChar(character) {
            return writeString(character);
        }

        function getNumber(type, bytes) {
            return function (offset) {
                offset = offset === undefined
                    ? store.offset
                    : offset;
                checkBounds(offset, bytes);
                store.offset = offset + bytes;
                return store.view["get" + type](offset);
            };
        }

        function setNumber(type, bytes) {
            return function (offset, value) {
                offset = offset === undefined
                    ? store.offset
                    : offset;
                checkBounds(offset, bytes);
                store.offset = offset + bytes;
                store.view["set" + type](offset, value);
                return better;
            };
        }

        function writeNumber(type, bytes) {
            return function (value) {
                checkBounds(store.offset, bytes);
                store.view["set" + type](store.offset, value);
                store.offset = store.offset + bytes;
                return better;
            };
        }

        better.betterview = true;
        better.tell = tell;
        better.seek = seek;
        better.skip = skip;
        better.slice = slice;
        better.getBytes = getBytes;
        better.setBytes = setBytes;
        better.writeBytes = writeBytes;
        better.getString = getString;
        better.setString = setString;
        better.writeString = writeString;
        better.getChar = getChar;
        better.setChar = setChar;
        better.writeChar = writeChar;

        Object.keys(numbersandbytes).forEach(function (type) {
            var bytes = numbersandbytes[type];

            better["get" + type] = getNumber(type, bytes);
            better["set" + type] = setNumber(type, bytes);
            better["write" + type] = writeNumber(type, bytes);
        });

        return Object.freeze(better);
    }

    betterview.isTypedArray = isTypedArray;
    betterview.getCodesFromString = getCodesFromString;
    betterview.getStringFromCodes = getStringFromCodes;
    betterview.toUint8 = toUint8;
    betterview.toBuffer = toBuffer;

    global.betterview = Object.freeze(betterview);

}(window || this));

//    Title: emitter.js
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

    function emitter(object) {
        object = (object && typeof object === "object")
            ? object
            : {};
        object.emitter = true;
        object.events = {};

        object.addListener = function addListener(type, listener) {
            var list = object.events[type];

            if (typeof listener === "function") {
                if (object.events.newListener) {
                    object.emit("newListener", type, typeof listener.listener === "function"
                        ? listener.listener
                        : listener);
                }
                if (!list) {
                    object.events[type] = [listener];
                } else {
                    object.events[type].push(listener);
                }
            }
            return object;
        };
        object.on = object.addListener;

        object.once = function once(type, listener) {
            function onetime() {
                object.removeListener(type, onetime);
                listener.apply(object);
            }
            if (typeof listener === "function") {
                onetime.listener = listener;
                object.on(type, onetime);
            }
            return object;
        };

        object.removeListener = function removeListener(type, listener) {
            var list = object.events[type];
            var position = -1;

            if (typeof listener === "function" && list) {
                list.some(function (value, index) {
                    if (value === listener || (value.listener && value.listener === listener)) {
                        position = index;
                        return true;
                    }
                });
                if (position >= 0) {
                    if (list.length === 1) {
                        delete object.events[type];
                    } else {
                        list.splice(position, 1);
                    }
                    if (object.events.removeListener) {
                        object.emit("removeListener", type, listener);
                    }
                }
            }
            return object;
        };
        object.off = object.removeListener;

        object.removeAllListeners = function removeAllListeners(type) {
            var list;

            if (!object.events.removeListener) {
                if (!type) {
                    object.events = {};
                } else {
                    delete object.events[type];
                }
            } else if (!type) {
                Object.keys(object.events).forEach(function (key) {
                    if (key !== "removeListener") {
                        object.removeAllListeners(key);
                    }
                });
                object.removeAllListeners("removeListener");
                object.events = {};
            } else {
                list = object.events[type];
                list.forEach(function (item) {
                    object.removeListener(type, item);
                });
                delete object.events[type];
            }
            return object;
        };

        object.listeners = function listeners(type) {
            var list = [];

            if (typeof type === "string" && object.events[type]) {
                list = object.events[type];
            } else {
                Object.keys(object.events).forEach(function (key) {
                    list.push(object.events[key]);
                });
            }
            return list;
        };

        object.emit = function emit(type) {
            var list = object.events[type];
            var bool = false;
            var args;

            if (list) {
                args = Array.prototype.slice.call(arguments).slice(1);
                list.forEach(function (value) {
                    value.apply(object, args);
                });
                bool = true;
            }
            return bool;
        };

        return object;
    }

    global.emitter = Object.freeze(emitter);

}(window || this));

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

        room.name = name;

        room.open = function () {
            return store.open;
        };

        room.members = function () {
            return store.members;
        };

        room.id = function () {
            return store.id;
        };

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
            data = betterview(name.length + event.length + dst.length + src.length + (payload.byteLength || payload.length || 0) + 20)
                .writeUint32(name.length).writeString(name)
                .writeUint32(event.length).writeString(event)
                .writeUint32(dst.length).writeString(dst)
                .writeUint32(src.length).writeString(src)
                .writeUint32(payload.byteLength || payload.length || 0);
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
            data = betterview(name.length + "leave".length + (store.id.length * 2) + 20)
                .writeUint32(name.length).writeString(name)
                .writeUint32("leave".length).writeString("leave")
                .writeUint32(0)
                .writeUint32(store.id.length).writeString(store.id)
                .writeUint32(store.id.length).writeString(store.id);
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
                data = betterview(name.length + "joined".length + (store.id.length * 2) + 20)
                    .writeUint32(name.length).writeString(name)
                    .writeUint32("joined".length).writeString("joined")
                    .writeUint32(0)
                    .writeUint32(store.id.length).writeString(store.id)
                    .writeUint32(store.id.length).writeString(store.id);
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
                data = betterview(name.length + "left".length + (store.id.length * 2) + 20)
                    .writeUint32(name.length).writeString(name)
                    .writeUint32("left".length).writeString("left")
                    .writeUint32(0)
                    .writeUint32(store.id.length).writeString(store.id)
                    .writeUint32(store.id.length).writeString(store.id);
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

        rooms[name] = room;

        if (name !== "root") {
            join_data = betterview(name.length + "join".length + (store.id.length * 2) + 20)
                .writeUint32(name.length).writeString(name)
                .writeUint32("join".length).writeString("join")
                .writeUint32(0)
                .writeUint32(store.id.length).writeString(store.id)
                .writeUint32(store.id.length).writeString(store.id);
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
            var packet = {
                room: data.getString(data.getUint32()),
                event: data.getString(data.getUint32()),
                dst: data.getString(data.getUint32()),
                src: data.getString(data.getUint32()),
                payload: data.getBytes(data.getUint32())
            };

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
