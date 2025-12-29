"use strict";

const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8");

function objectType(obj) {
    return Object.prototype.toString.call(obj).slice(8, -1).toLowerCase();
}

function assertInteger(value, min, max, name) {
    if (typeof value !== "number") {
        throw new TypeError(`${name} must be a number`);
    }
    if (!Number.isInteger(value)) {
        throw new TypeError(`${name} must be an integer`);
    }
    if (value < min || value > max) {
        throw new RangeError(`${name} must be between ${min} and ${max}`);
    }
}

const bytecursor = function (buffer, viewOffset = 0, viewLength = undefined) {
    // Validate buffer
    if (objectType(buffer) !== "arraybuffer") {
        throw new TypeError("requires an ArrayBuffer");
    }
    // Validate viewOffset
    if (typeof viewOffset !== "number") {
        throw new TypeError("viewOffset must be a number");
    }
    if (!Number.isInteger(viewOffset) || viewOffset < 0) {
        throw new RangeError("viewOffset must be a non-negative integer");
    }
    if (viewOffset > buffer.byteLength) {
        throw new RangeError("viewOffset is out of bounds");
    }
    // Validate viewLength (if provided)
    if (viewLength !== undefined) {
        if (typeof viewLength !== "number") {
            throw new TypeError("viewLength must be a number");
        }
        if (!Number.isInteger(viewLength) || viewLength < 0) {
            throw new RangeError("viewLength must be a non-negative integer");
        }
        if (viewOffset + viewLength > buffer.byteLength) {
            throw new RangeError("viewOffset + viewLength exceeds buffer size");
        }
    }
    const view = new DataView(
        buffer,
        viewOffset,
        viewLength ?? buffer.byteLength - viewOffset
    );
    let cursor = 0;
    const api = Object.create(null);

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    function check(offset, size) {
        if (typeof offset !== "number") {
            throw new TypeError("Offset must be a number");
        }
        if (typeof size !== "number") {
            throw new TypeError("Size must be a number");
        }
        if (offset < 0) {
            throw new RangeError("Offset must be positive");
        }
        if (size < 0) {
            throw new RangeError("Size must be positive");
        }
        if (offset + size > view.byteLength) {
            throw new RangeError("Offset + size exceeds view bounds");
        }
    }

    function advance(size) {
        const pos = cursor;
        check(pos, size);
        cursor += size;
        return pos;
    }

    // -------------------------------------------------------------------------
    // Cursor Management
    // -------------------------------------------------------------------------

    api.rewind = function () {
        cursor = 0;
        return api;
    };

    api.tell = function () {
        return cursor;
    };

    api.seek = function (pos) {
        check(pos, 0);
        cursor = pos;
        return api;
    };

    api.skip = function (n) {
        check(cursor + n, 0);
        cursor += n;
        return api;
    };

    api.eof = function () {
        return cursor >= view.byteLength;
    };

    // -------------------------------------------------------------------------
    // Buffer / Byte Operations
    // -------------------------------------------------------------------------

    api.slice = function (start = 0, end = view.byteLength) {
        if (typeof start !== "number" || typeof end !== "number") {
            throw new TypeError("slice() arguments must be numbers");
        }
        if (start < 0 || end < 0) {
            throw new RangeError("slice() start and end must be non-negative");
        }
        if (start > end) {
            throw new RangeError("slice() start must not exceed end");
        }
        if (end > view.byteLength) {
            throw new RangeError("slice() end exceeds view bounds");
        }
        return buffer.slice(view.byteOffset + start, view.byteOffset + end);
    };

    api.getBytes = function (len = view.byteLength - cursor) {
        const pos = advance(len);
        return new Uint8Array(
            buffer.slice(
                view.byteOffset + pos,
                view.byteOffset + pos + len
            )
        );
    };

    api.writeBytes = function (bytes) {
        if (objectType(bytes) !== "uint8array") {
            throw new TypeError("writeBytes requires a Uint8Array");
        }
        const pos = advance(bytes.byteLength);
        new Uint8Array(
            buffer,
            view.byteOffset + pos,
            bytes.byteLength
        ).set(bytes);
        return api;
    };

    // -------------------------------------------------------------------------
    // Strings (UTF-8)
    // -------------------------------------------------------------------------

    api.getString = function (length) {
        return decoder.decode(api.getBytes(length));
    };

    api.writeString = function (string) {
        if (typeof string !== "string") {
            throw new TypeError("writeString() requires a string");
        }
        return api.writeBytes(encoder.encode(string));
    };

    // -------------------------------------------------------------------------
    // Numbers — Getters
    // -------------------------------------------------------------------------

    api.getUint8 = () => view.getUint8(advance(1));
    api.getInt8 = () => view.getInt8(advance(1));
    api.getUint16 = (littleEndian = false) => view.getUint16(advance(2), littleEndian);
    api.getInt16 = (littleEndian = false) => view.getInt16(advance(2), littleEndian);
    api.getUint32 = (littleEndian = false) => view.getUint32(advance(4), littleEndian);
    api.getInt32 = (littleEndian = false) => view.getInt32(advance(4), littleEndian);
    api.getFloat32 = (littleEndian = false) => view.getFloat32(advance(4), littleEndian);
    api.getFloat64 = (littleEndian = false) => view.getFloat64(advance(8), littleEndian);

    // -------------------------------------------------------------------------
    // Numbers — Writers (with strict validation)
    // -------------------------------------------------------------------------

    api.writeUint8 = function (v) {
        assertInteger(v, 0, 255, "Uint8 value");
        view.setUint8(advance(1), v);
        return api;
    };

    api.writeInt8 = function (v) {
        assertInteger(v, -128, 127, "Int8 value");
        view.setInt8(advance(1), v);
        return api;
    };

    api.writeUint16 = function (v, littleEndian = false) {
        assertInteger(v, 0, 65535, "Uint16 value");
        view.setUint16(advance(2), v, littleEndian);
        return api;
    };

    api.writeInt16 = function (v, littleEndian = false) {
        assertInteger(v, -32768, 32767, "Int16 value");
        view.setInt16(advance(2), v, littleEndian);
        return api;
    };

    api.writeUint32 = function (v, littleEndian = false) {
        assertInteger(v, 0, 4294967295, "Uint32 value");
        view.setUint32(advance(4), v, littleEndian);
        return api;
    };

    api.writeInt32 = function (v, littleEndian = false) {
        assertInteger(v, -2147483648, 2147483647, "Int32 value");
        view.setInt32(advance(4), v, littleEndian);
        return api;
    };

    // Floats: allow NaN, Infinity, etc. — just require "number"
    api.writeFloat32 = function (v, littleEndian = false) {
        if (typeof v !== "number") {
            throw new TypeError("Float32 value must be a number");
        }
        view.setFloat32(advance(4), v, littleEndian);
        return api;
    };

    api.writeFloat64 = function (v, littleEndian = false) {
        if (typeof v !== "number") {
            throw new TypeError("Float64 value must be a number");
        }
        view.setFloat64(advance(8), v, littleEndian);
        return api;
    };

    // -------------------------------------------------------------------------
    // Public, immutable properties
    // -------------------------------------------------------------------------

    Object.defineProperties(api, {
        "buffer": {
            enumerable: true,
            value: buffer
        },
        "length": {
            enumerable: true,
            value: view.byteLength
        },
        "view": {
            enumerable: true,
            value: view
        }
    });

    return Object.freeze(api);
};

export default Object.freeze(bytecursor);
