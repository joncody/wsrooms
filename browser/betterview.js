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

    var number_types_and_bytes = {
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
        var array_types = [
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

        return array_types.indexOf(type) > -1;
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
        store.view = new DataView(store.buffer, offset, length);
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
            var converted_bytes = toUint8(bytes);
            var len = converted_bytes.byteLength || converted_bytes.length || 0;

            offset = offset === undefined
                ? store.offset
                : offset;
            checkBounds(offset, len);
            store.offset = offset + len;
            toUint8(store.view.buffer).set(converted_bytes, offset);
            return better;
        }

        function writeBytes(bytes) {
            var converted_bytes = toUint8(bytes);
            var len = converted_bytes.byteLength || converted_bytes.length || 0;

            checkBounds(store.offset, len);
            toUint8(store.view.buffer).set(converted_bytes, store.offset);
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

        Object.keys(number_types_and_bytes).forEach(function (type) {
            var bytes = number_types_and_bytes[type];

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
