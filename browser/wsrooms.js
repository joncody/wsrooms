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
    'use strict';

    if (!global.WebSocket) {
        throw new Error('WebSocket is not supported by this browser.');
    }

    var rooms = {},
        socket;

    function getRoom(name) {
        var room = emitter(),
            store = {
                open: false,
                name: name,
                id: '',
                members: []
            };

        if (typeof name !== 'string') {
            throw new TypeError('name is not a string');
        }
        if (rooms.hasOwnProperty(name)) {
            return rooms[name];
        }

        room.send = function (event, payload, dst) {
            var src = store.id,
                data;

            if (typeof event !== 'string') {
                throw new TypeError('event is not a string');
            }
            if (payload === undefined) {
                payload = '';
            }
            if (typeof dst !== 'string') {
                dst = '';
            }
            data = betterview(store.name.length + event.length + dst.length + src.length + (payload.byteLength || payload.length || 0) + 20);
            data.writeUint32(store.name.length);
            data.writeString(store.name);
            data.writeUint32(event.length);
            data.writeString(event);
            data.writeUint32(dst.length);
            data.writeString(dst);
            data.writeUint32(src.length);
            data.writeString(src);
            data.writeUint32(payload.byteLength || payload.length || 0);
            if (typeof payload === 'string') {
                data.writeString(payload);
            } else {
                data.writeBytes(payload);
            }
            socket.send(data.seek(0).getBytes());
        };

        room.join = function (roomname) {
            if (store.open === false) {
                throw new Error('socket is closed');
            }
            if (typeof roomname !== 'string') {
                throw new TypeError('roomname is not a string');
            }
            if (roomname === 'root') {
                throw new Error('cannot join the root room');
            }
            return rooms.hasOwnProperty(roomname) ? rooms[roomname] : getRoom(roomname);
        };

        room.leave = function () {
            room.send('leave');
        };

        room.close = function () {
            store.open = false;
            room.emit('close');
            delete rooms[room];
        };

        room.message = function (packet) {
            var index;

            switch (packet.event) {
            case 'join':
                store.id = packet.src;
                store.members = JSON.parse(betterview.getStringFromCodes(packet.payload));
                store.open = true;
                room.emit('open');
                room.send('joined', packet.src);
                break;
            case 'joined':
                packet.payload = betterview.getStringFromCodes(packet.payload);
                index = store.members.indexOf(packet.payload);
                if (index === -1) {
                    store.members.push(packet.payload);
                    room.emit('joined', packet.payload);
                }
                break;
            case 'leave':
                room.close();
                room.send('left', store.id);
                break;
            case 'left':
                packet.payload = betterview.getStringFromCodes(packet.payload);
                index = store.members.indexOf(packet.payload);
                if (index !== -1) {
                    store.members.splice(index, 1);
                    room.emit('left', packet.payload);
                }
                break;
            default:
                room.emit(packet.event, packet.payload, packet.src);
                break;
            }
        };

        function purge() {
            Object.keys(rooms).forEach(function (name) {
                if (name !== 'root') {
                    rooms[name].close();
                }
            });
        }

        room.getName = function () {
            return store.name;
        };

        room.getMembers = function () {
            return store.members;
        };

        room.getId = function () {
            return store.id;
        };

        rooms[name] = room;

        if (store.name !== 'root') {
            room.send('join');
        } else {
            room.purge = purge;
        }

        return Object.freeze(room);
    }

    function wsrooms(url) {
        var root = getRoom('root');

        if (typeof url !== 'string') {
            throw new TypeError('url must be a string');
        }
        socket = new WebSocket(url);
        socket.binaryType = 'arraybuffer';

        socket.onmessage = function (e) {
            var data = betterview(e.data),
                packet = {};

            packet.room = data.getString(data.getUint32());
            packet.event = data.getString(data.getUint32());
            packet.dst = data.getString(data.getUint32());
            packet.src = data.getString(data.getUint32());
            packet.payload = data.getBytes(data.getUint32());
            if (packet.room !== 'root' && !rooms.hasOwnProperty(packet.room)) {
                throw new Error('room does not exist');
            }
            rooms[packet.room].message(packet);
        };

        socket.onclose = function (e) {
            Object.keys(rooms).forEach(function (name) {
                rooms[name].close();
            });
        };

        socket.onerror = function (err) {
            throw err;
        };

        socket.onopen = function () {
            root.send('join');
        };

        return root;
    }

    global.wsrooms = Object.freeze(wsrooms);

}(window || this));
