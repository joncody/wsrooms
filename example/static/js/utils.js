"use strict";

const global = (
    globalThis !== undefined
    ? globalThis
    : (
        window !== undefined
        ? window
        : this
    )
);

export default Object.freeze({
    noop: () => {},
    typeOf: function (value) {
        if (Array.isArray(value)) {
            return "array";
        }
        if (value === null) {
            return "null";
        }
        return typeof value;
    },
    objectType: function (obj) {
        return Object.prototype.toString.call(obj).slice(8, -1).toLowerCase();
    },
    codesFromString: function (s) {
        if (typeof s !== "string") {
            return new Uint8Array(0);
        }
        return Uint8Array.from(s, function (c) {
            return c.charCodeAt(0);
        });
    },
    stringFromCodes: function (c) {
        if (!c || typeof c.length !== "number") {
            return "";
        }
        return Array.from(c, function (x) {
            if (typeof x !== "number") {
                return 0;
            }
            return String.fromCharCode(x);
        }).join("");
    },
    isEmpty: function (value) {
        return value
            && typeof value === "object"
            && Object.keys(value).length === 0;
    },
    isNode: function (value) {
        return value
            && typeof value === "object"
            && typeof value.nodeName === "string"
            && typeof value.nodeType === "number";
    },
    camelCase: function (value) {
        if (typeof value !== "string") {
            return value;
        }
        return value.replace(/-([a-z])/g, (ignore, letter) => letter.toUpperCase());
    },
    kebabCase: function (value) {
        if (typeof value !== "string") {
            return value;
        }
        return value.replace(/([A-Z])/g, '-$1').toLowerCase()
    },
    uuid: function () {
        const id = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx";

        return id.replace(/[xy]/g, function (char) {
            const rand = Math.random() * 16 | 0;
            const code = (
                char === "x"
                ? rand
                : rand & 0x3 | 0x8
            );

            return code.toString(16);
        });
    },
    setImmediate: function (fn, ...args) {
        if (typeof fn !== "function") {
            return;
        }
        return global.setTimeout(fn, 0, ...args);
    }
});
