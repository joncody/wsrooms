"use strict";

function isGG(val) {
    return val && typeof val === "object" && val.gg === true;
}

function toCodesFromString(val) {
    const len = val.length;
    const codes = new Uint8Array(len);
    for (let i = 0; i < len; i += 1) {
        codes[i] = val.charCodeAt(i);
    }
    return codes;
}

function toStringFromCodes(val) {
    return String.fromCharCode.apply(null, val);
}

function toUint8(val) {
    if (val instanceof Uint8Array) {
        return val;
    }
    if (isGG(val)) {
        const raw = val.length() === 1 ? [val.raw()] : val.raw();
        return new Uint8Array(raw);
    }
    if (typeof val === "string") {
        return toCodesFromString(val);
    }
    if (val instanceof ArrayBuffer) {
        return new Uint8Array(val);
    }
    if (Array.isArray(val) || (val && val.buffer instanceof ArrayBuffer)) {
        return new Uint8Array(val);
    }
    return new Uint8Array([val]);
}

function toBuffer(val) {
    return toUint8(val).buffer;
}

export default function betterview(value, offset, length) {
    const numbersandbytes = {
        "Int8": 1, "Uint8": 1,
        "Int16": 2, "Uint16": 2,
        "Int32": 4, "Uint32": 4,
        "Float32": 4, "Float64": 8
    };
    const better = {};
    const store = {};
    store.buffer = toBuffer(value); // Initialize buffer and view
    const bufLen = store.buffer.byteLength;
    const viewOffset = offset || 0;
    const viewLength = length === undefined ? (bufLen - viewOffset) : length;
    store.view = new DataView(store.buffer, viewOffset, viewLength);
    store.offset = 0; // The internal cursor relative to the View

    // --------------------------------------------------------------------------
    // Helpers
    // --------------------------------------------------------------------------

    function checkBounds(relativeOffset, byteSize) {
        if (typeof relativeOffset !== "number") {
            throw new TypeError("Offset must be a number");
        }
        if (typeof byteSize !== "number") {
            throw new TypeError("Length must be a number");
        }
        if (relativeOffset < 0) {
            throw new RangeError("Offset is negative");
        }
        if (byteSize < 0) {
            throw new RangeError("Length is negative");
        }
        if (relativeOffset + byteSize > store.view.byteLength) {
            throw new RangeError("Offset + length exceeds view bounds");
        }
    }

    function getAbsoluteAddr(relativeOffset) {
        return store.view.byteOffset + relativeOffset;
    }

    // --------------------------------------------------------------------------
    // Cursor Management
    // --------------------------------------------------------------------------

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

    function seek(val) {
        checkBounds(val, 0);
        store.offset = val;
        return better;
    }

    function skip(val) {
        checkBounds(store.offset + val, 0);
        store.offset += val;
        return better;
    }

    // --------------------------------------------------------------------------
    // Buffer / Byte Operations
    // --------------------------------------------------------------------------

    function slice(start, end) {
        const viewStart = store.view.byteOffset;
        const absStart = viewStart + (start || 0);
        const absEnd = (end === undefined) ? (viewStart + store.view.byteLength) : (viewStart + end);
        return store.view.buffer.slice(absStart, absEnd);
    }

    function getBytes(len, activeOffset) {
        const useCursor = (activeOffset === undefined);
        const currentOffset = useCursor ? store.offset : activeOffset;
        const activeLen = (len === undefined)
            ? store.view.byteLength - currentOffset
            : len;
        checkBounds(currentOffset, activeLen);
        if (useCursor) {
            store.offset += activeLen;
        }
        const absStart = getAbsoluteAddr(currentOffset);
        return toUint8(store.view.buffer.slice(absStart, absStart + activeLen));
    }

    function setBytes(activeOffset, val) {
        const currentOffset = (activeOffset === undefined) ? store.offset : activeOffset;
        const bytes = toUint8(val);
        const len = bytes.byteLength || bytes.length || 0;
        checkBounds(currentOffset, len);
        const absStart = getAbsoluteAddr(currentOffset);
        new Uint8Array(store.view.buffer, absStart, len).set(bytes);
        return better;
    }

    function writeBytes(val) {
        const bytes = toUint8(val);
        const len = bytes.byteLength;
        checkBounds(store.offset, len);
        const absStart = getAbsoluteAddr(store.offset);
        new Uint8Array(store.view.buffer, absStart, len).set(bytes);
        store.offset += len;
        return better;
    }

    // --------------------------------------------------------------------------
    // String Operations
    // --------------------------------------------------------------------------

    function getString(len, activeOffset) {
        return toStringFromCodes(getBytes(len, activeOffset));
    }

    function setString(activeOffset, val) {
        return setBytes(activeOffset, toCodesFromString(val));
    }

    function writeString(val) {
        return writeBytes(toCodesFromString(val));
    }

    function getChar(activeOffset) {
        return getString(1, activeOffset);
    }

    function setChar(activeOffset, character) {
        return setString(activeOffset, character);
    }

    function writeChar(character) {
        return writeString(character);
    }

    // --------------------------------------------------------------------------
    // Numeric Operations (Factories)
    // --------------------------------------------------------------------------

    function getNumber(type, byteSize) {
        return function (activeOffset, littleEndian) {
            if (typeof activeOffset === "boolean") {
                littleEndian = activeOffset;
                activeOffset = undefined;
            }
            const useCursor = (activeOffset === undefined);
            const currentOffset = useCursor ? store.offset : activeOffset;
            checkBounds(currentOffset, byteSize);
            const val = store.view["get" + type](currentOffset, littleEndian);
            if (useCursor) {
                store.offset += byteSize;
            }
            return val;
        };
    }

    function setNumber(type, byteSize) {
        return function (activeOffset, val, littleEndian) {
            const currentOffset = (activeOffset === undefined) ? store.offset : activeOffset;
            checkBounds(currentOffset, byteSize);
            store.view["set" + type](currentOffset, val, littleEndian);
            return better;
        };
    }

    function writeNumber(type, byteSize) {
        return function (val, littleEndian) {
            checkBounds(store.offset, byteSize);
            store.view["set" + type](store.offset, val, littleEndian);
            store.offset += byteSize;
            return better;
        };
    }

    // --------------------------------------------------------------------------
    // Build Interface
    // --------------------------------------------------------------------------

    Object.keys(numbersandbytes).forEach(function (type) {
        const bytes = numbersandbytes[type];
        better["get" + type] = getNumber(type, bytes);
        better["set" + type] = setNumber(type, bytes);
        better["write" + type] = writeNumber(type, bytes);
    });

    Object.assign(better, {
        betterview: true,
        rewind,
        eof,
        tell,
        seek,
        skip,
        slice,
        getBytes,
        setBytes,
        writeBytes,
        getString,
        setString,
        writeString,
        getChar,
        setChar,
        writeChar
    });

    Object.defineProperties(better, {
        "view": {
            value: store.view,
            writable: false,
            enumerable: true,
            configurable: false
        },
        "buffer": {
            value: store.buffer,
            writable: false,
            enumerable: true,
            configurable: false
        },
        "length": {
            value: () => store.view.byteLength,
            writable: false,
            enumerable: true
        }
    });

    return Object.freeze(better);
}
