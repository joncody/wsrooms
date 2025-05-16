"use strict";

import utils from "./utils.js";

export default function betterview(value, offset, length) {
    const numbersandbytes = {
        "Int8": 1,
        "Uint8": 1,
        "Int16": 2,
        "Uint16": 2,
        "Int32": 4,
        "Uint32": 4,
        "Float32": 4,
        "Float64": 8
    };
    const better = {};
    const store = {};

    store.buffer = utils.toBuffer(value);
    store.view = new DataView(store.buffer, offset || 0, length || store.buffer.byteLength);
    store.offset = 0;

    function checkBounds(offset, len) {
        if (typeof offset !== "number") {
            throw new TypeError("offset must be a number");
        }
        if (offset < 0) {
            throw new RangeError("offset is negative");
        }
        if (typeof len !== "number") {
            throw new TypeError("len must be a number");
        }
        if (len < 0) {
            throw new RangeError("len is negative");
        }
        if (offset + len > store.view.byteLength) {
            throw new RangeError("offset + length exceeds view bounds");
        }
    }

    function rewind() {
        store.offset = 0;
        return better;
    }

    function eof() {
        return store.offset >= store.view.byteLength;
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
        return utils.toUint8(store.view.buffer.slice(offset, offset + len));
    }

    function setBytes(offset, value) {
        const bytes = utils.toUint8(value);
        const len = bytes.byteLength || bytes.length || 0;

        offset = offset === undefined
            ? store.offset
            : offset;
        checkBounds(offset, len);
        store.offset = offset + len;
        utils.toUint8(store.view.buffer).set(bytes, offset);
        return better;
    }

    function writeBytes(value) {
        const bytes = utils.toUint8(value);
        const len = bytes.byteLength || bytes.length || 0;

        checkBounds(store.offset, len);
        utils.toUint8(store.view.buffer).set(bytes, store.offset);
        store.offset = store.offset + len;
        return better;
    }

    function getString(len, offset) {
        return utils.toStringFromCodes(getBytes(len, offset));
    }

    function setString(offset, value) {
        return setBytes(offset, utils.toCodesFromString(value));
    }

    function writeString(value) {
        return writeBytes(utils.toCodesFromString(value));
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

    function getNumber(type, value) {
        return function (offset) {
            offset = offset === undefined
                ? store.offset
                : offset;
            checkBounds(offset, value);
            store.offset = offset + value;
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

    Object.keys(numbersandbytes).forEach(function (type) {
        const bytes = numbersandbytes[type];

        better["get" + type] = getNumber(type, bytes);
        better["set" + type] = setNumber(type, bytes);
        better["write" + type] = writeNumber(type, bytes);
    });
    return Object.freeze(utils.extend(better, {
        betterview: true,
        view: store.view,
        buffer: store.buffer,
        length: () => store.view.byteLength,
        rewind,
        eof,
        tell,
        seek,
        skip,
        getBytes,
        setBytes,
        writeBytes,
        getString,
        setString,
        writeString,
        getChar,
        setChar,
        writeChar
    }));
}
