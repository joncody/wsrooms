"use strict";

const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8");

const betterview = function (buffer, viewOffset = 0, viewLength = undefined) {
    if (!(buffer instanceof ArrayBuffer)) {
        throw new TypeError("betterview requires an ArrayBuffer");
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
        check(pos, size); // Ensure we're not going out of bounds
        cursor += size;   // Move the cursor forward by `size`
        return pos;       // Return the previous position
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
        if (!(bytes instanceof Uint8Array)) {
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
        return api.writeBytes(encoder.encode(string));
    };

    // -------------------------------------------------------------------------
    // Numbers
    // -------------------------------------------------------------------------

    api.getUint8 = function () {
        return view.getUint8(advance(1));
    };

    api.getInt8 = function () {
        return view.getInt8(advance(1));
    };

    api.getUint16 = function (littleEndian = false) {
        return view.getUint16(advance(2), littleEndian);
    };

    api.getInt16 = function (littleEndian = false) {
        return view.getInt16(advance(2), littleEndian);
    };

    api.getUint32 = function (littleEndian = false) {
        return view.getUint32(advance(4), littleEndian);
    };

    api.getInt32 = function (littleEndian = false) {
        return view.getInt32(advance(4), littleEndian);
    };

    api.getFloat32 = function (littleEndian = false) {
        return view.getFloat32(advance(4), littleEndian);
    };

    api.getFloat64 = function (littleEndian = false) {
        return view.getFloat64(advance(8), littleEndian);
    };

    api.writeUint8 = function (v) {
        view.setUint8(advance(1), v);
        return api;
    };

    api.writeInt8 = function (v) {
        view.setInt8(advance(1), v);
        return api;
    };

    api.writeUint16 = function (v, littleEndian = false) {
        view.setUint16(advance(2), v, littleEndian);
        return api;
    };
    
    api.writeInt16 = function (v, littleEndian = false) {
        view.setInt16(advance(2), v, littleEndian);
        return api;
    };

    api.writeUint32 = function (v, littleEndian = false) {
        view.setUint32(advance(4), v, littleEndian);
        return api;
    };

    api.writeInt32 = function (v, littleEndian = false) {
        view.setInt32(advance(4), v, littleEndian);
        return api;
    };

    api.writeFloat32 = function (v, littleEndian = false) {
        view.setFloat32(advance(4), v, littleEndian);
        return api;
    };

    api.writeFloat64 = function (v, littleEndian = false) {
        view.setFloat64(advance(8), v, littleEndian);
        return api;
    };

    // -------------------------------------------------------------------------
    // Public, immutable properties
    // -------------------------------------------------------------------------

    Object.defineProperties(api, {
        "buffer": {
            value: buffer,
            enumerable: true,
        },
        "view": {
            value: view,
            enumerable: true,
        },
        "length": {
            value: view.byteLength,
            enumerable: true
        }
    });

    return Object.freeze(api);
};

export default Object.freeze(betterview);
