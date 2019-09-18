//    Title: gg.js
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

    var cdb;
    var ease = Object.freeze({
        linearTween: function (t, b, c, d) {
            return c * t / d + b;
        },
        easeInQuad: function (t, b, c, d) {
            t /= d;
            return c * t * t + b;
        },
        easeOutQuad: function (t, b, c, d) {
            t /= d;
            return -c * t * (t - 2) + b;
        },
        easeInOutQuad: function (t, b, c, d) {
            t /= d / 2;
            if (t < 1) {
                return c / 2 * t * t + b;
            }
            t -= 1;
            return -c / 2 * (t * (t - 2) - 1) + b;
        },
        easeInCubic: function (t, b, c, d) {
            t /= d;
            return c * t * t * t + b;
        },
        easeOutCubic: function (t, b, c, d) {
            t /= d;
            t -= 1;
            return c * (t * t * t + 1) + b;
        },
        easeInOutCubic: function (t, b, c, d) {
            t /= d / 2;
            if (t < 1) {
                return c / 2 * t * t * t + b;
            }
            t -= 2;
            return c / 2 * (t * t * t + 2) + b;
        },
        easeInQuart: function (t, b, c, d) {
            t /= d;
            return c * t * t * t * t + b;
        },
        easeOutQuart: function (t, b, c, d) {
            t /= d;
            t -= 1;
            return -c * (t * t * t * t - 1) + b;
        },
        easeInOutQuart: function (t, b, c, d) {
            t /= d / 2;
            if (t < 1) {
                return c / 2 * t * t * t * t + b;
            }
            t -= 2;
            return -c / 2 * (t * t * t * t - 2) + b;
        },
        easeInQuint: function (t, b, c, d) {
            t /= d;
            return c * t * t * t * t * t + b;
        },
        easeOutQuint: function (t, b, c, d) {
            t /= d;
            t -= 1;
            return c * (t * t * t * t * t + 1) + b;
        },
        easeInOutQuint: function (t, b, c, d) {
            t /= d / 2;
            if (t < 1) {
                return c / 2 * t * t * t * t * t + b;
            }
            t -= 2;
            return c / 2 * (t * t * t * t * t + 2) + b;
        },
        easeInSine: function (t, b, c, d) {
            return -c * Math.cos(t / d * (Math.PI / 2)) + c + b;
        },
        easeOutSine: function (t, b, c, d) {
            return c * Math.sin(t / d * (Math.PI / 2)) + b;
        },
        easeInOutSine: function (t, b, c, d) {
            return -c / 2 * (Math.cos(Math.PI * t / d) - 1) + b;
        },
        easeInExpo: function (t, b, c, d) {
            return c * Math.pow(2, 10 * (t / d - 1) ) + b;
        },
        easeOutExpo: function (t, b, c, d) {
            return c * (-Math.pow(2, -10 * t / d) + 1) + b;
        },
        easeInOutExpo: function (t, b, c, d) {
            t /= d / 2;
            if (t < 1) {
                return c / 2 * Math.pow(2, 10 * (t - 1)) + b;
            }
            t -= 1;
            return c / 2 * (-Math.pow(2, -10 * t) + 2) + b;
        },
        easeInCirc: function (t, b, c, d) {
            t /= d;
            return -c * (Math.sqrt(1 - t * t) - 1) + b;
        },
        easeOutCirc: function (t, b, c, d) {
            t /= d;
            t -= 1;
            return c * Math.sqrt(1 - t * t) + b;
        },
        easeInOutCirc: function (t, b, c, d) {
            t /= d / 2;
            if (t < 1) {
                return -c / 2 * (Math.sqrt(1 - t * t) - 1) + b;
            }
            t -= 2;
            return c / 2 * (Math.sqrt(1 - t * t) + 1) + b;
        }
    });
    var ggid = (function () {
        var id = 0;
        var maxint = Math.pow(2, 53) - 1;

        return function () {
            id = id < maxint
                ? id + 1
                : 1;
            return id;
        };
    }());
    var indexedDB = global.indexedDB || global.mozIndexedDB || global.webkitIndexedDB || global.msIndexedDB;
    var keyboardListener;
    var keyboardListeners = [];
    var listeners = {};
    var mouseListener;
    var mouseListeners = [];
    var taglist = [
        "a",
        "abbr",
        "address",
        "area",
        "article",
        "aside",
        "audio",
        "b",
        "base",
        "bdo",
        "blockquote",
        "body",
        "br",
        "button",
        "canvas",
        "caption",
        "cite",
        "code",
        "col",
        "colgroup",
        "dd",
        "del",
        "dfn",
        "div",
        "dl",
        "dt",
        "em",
        "embed",
        "fieldset",
        "figcaption",
        "figure",
        "footer",
        "form",
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "h6",
        "head",
        "header",
        "hr",
        "i",
        "iframe",
        "img",
        "input",
        "ins",
        "kbd",
        "label",
        "legend",
        "li",
        "link",
        "map",
        "mark",
        "meta",
        "nav",
        "noscript",
        "object",
        "ol",
        "optgroup",
        "option",
        "p",
        "param",
        "pre",
        "progress",
        "q",
        "rp",
        "rt",
        "ruby",
        "s",
        "samp",
        "script",
        "section",
        "select",
        "small",
        "source",
        "span",
        "strong",
        "style",
        "sub",
        "sup",
        "table",
        "tbody",
        "td",
        "textarea",
        "tfoot",
        "th",
        "thead",
        "time",
        "title",
        "tr",
        "track",
        "u",
        "ul",
        "var",
        "video"
    ];

    // FIXES
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

    Number.isNaN = Number.isNaN || function (value) {
        return value !== value;
    };

    function typeOf(value) {
        var type = typeof value;

        if (Array.isArray(value)) {
            type = "array";
        } else if (value === null) {
            type = "null";
        }
        return type;
    }

    // SHORTHAND
    function arrSlice(value, begin, end) {
        return Array.prototype.slice.call(value, begin, end);
    }

    // IS
    function isArray(value) {
        return typeOf(value) === "array";
    }

    function isBoolean(value) {
        return typeOf(value) === "boolean";
    }

    function isFunction(value) {
        return typeOf(value) === "function";
    }

    function isNull(value) {
        return typeOf(value) === "null";
    }

    function isNumber(value) {
        return typeOf(value) === "number" && !Number.isNaN(value);
    }

    function isObject(value) {
        return typeOf(value) === "object";
    }

    function isString(value) {
        return typeOf(value) === "string";
    }

    function isUndefined(value) {
        return typeOf(value) === "undefined";
    }

    function isArrayLike(value) {
        return isObject(value) && !isUndefined(value.length) && Object.keys(value).every(function (key) {
            return key === "length" || isNumber(global.parseInt(key, 10));
        });
    }

    function isBuffer(value) {
        return !isUndefined(global.ArrayBuffer) && value instanceof ArrayBuffer;
    }

    function isEmpty(value) {
        return isObject(value) && Object.keys(value).length === 0;
    }

    function isGG(value) {
        return isObject(value) && value.gg === true;
    }

    function isNan(value, noparse, base) {
        return noparse
            ? Number.isNaN(value)
            : Number.isNaN(global.parseInt(value, isNumber(base)
                ? base
                : 10));
    }

    function isNode(value) {
        return isObject(value) && isString(value.nodeName) && isNumber(value.nodeType);
    }

    function isTypedArray(value) {
        var types = [
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
        var type = Object.prototype.toString.call(value).replace(/\[object\s(\w+)\]/, "$1");

        return types.indexOf(type) > -1;
    }

    // TO
    function toArray(value) {
        var list;

        if (isGG(value)) {
            list = value.length() === 1
                ? [value.raw()]
                : value.raw();
        } else if (isNumber(value) || isBuffer(value)) {
            list = arrSlice(new Uint8Array(value));
        } else if (isString(value) || isArray(value) || isArrayLike(value) || isTypedArray(value)) {
            list = arrSlice(value);
        } else {
            list = [value];
        }
        return list;
    }

    function toCamelCase(value) {
        return isString(value) && value.replace(/-([a-z])/g, function (a) {
            return a[1].toUpperCase();
        });
    }

    function toCodesFromString(value) {
        var codes = [];

        toArray(value).forEach(function (char) {
            codes.push(char.charCodeAt(0));
        });
        return codes;
    }

    function toFloat(value, decimals) {
        var float = global.parseFloat(isString(value)
            ? value.replace(",", "")
            : value);

        return Number.isNaN(float)
            ? 0
            : isNumber(decimals)
                ? float.toFixed(decimals)
                : float;
    }

    function toHyphenated(value) {
        return isString(value) && value.replace(/([A-Z])/g, function (a) {
            return "-" + a.toLowerCase();
        });
    }

    function toInt(value, radix) {
        var int = global.parseInt(isString(value)
            ? value.replace(",", "")
            : value, isNumber(radix)
                ? radix
                : 10);

        return Number.isNaN(int)
            ? 0
            : int;
    }

    function toUint8(value) {
        var uint8;

        if (isGG(value)) {
            uint8 = new Uint8Array(value.length() === 1
                ? [value.raw()]
                : value.raw());
        } else if (isString(value)) {
            uint8 = new Uint8Array(toCodesFromString(value));
        } else if (isNumber(value) || isArray(value) || isArrayLike(value) || isTypedArray(value) || isBuffer(value)) {
            uint8 = new Uint8Array(value);
        } else {
            uint8 = new Uint8Array([value]);
        }
        return uint8;
    }

    function toBuffer(value) {
        return toUint8(value).buffer;
    }

    function toStringFromCodes(value) {
        var string = "";

        toArray(value).forEach(function (char) {
            string += String.fromCharCode(char);
        });
        return string;
    }

    // MISCELLANEOUS
    function betterview(value, offset, length) {
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
        var better = {};
        var store = {};

        store.buffer = toBuffer(value);
        store.view = new DataView(store.buffer, offset || 0, length || store.buffer.byteLength);
        store.offset = 0;

        function checkBounds(offset, len) {
            if (typeof offset !== "number") {
                return global.console.log("offset is not a number");
            }
            if (offset < 0) {
                return global.console.log("offset is negative");
            }
            if (typeof len !== "number") {
                return global.console.log("len is not a number");
            }
            if (len < 0) {
                return global.console.log("len is negative");
            }
            if (offset + len > store.view.byteLength) {
                return global.console.log("bounds exceeded");
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

        function setBytes(offset, value) {
            var bytes = toUint8(value);
            var len = bytes.byteLength || bytes.length || 0;

            offset = offset === undefined
                ? store.offset
                : offset;
            checkBounds(offset, len);
            store.offset = offset + len;
            toUint8(store.view.buffer).set(bytes, offset);
            return better;
        }

        function writeBytes(value) {
            var bytes = toUint8(value);
            var len = bytes.byteLength || bytes.length || 0;

            checkBounds(store.offset, len);
            toUint8(store.view.buffer).set(bytes, store.offset);
            store.offset = store.offset + len;
            return better;
        }

        function getString(len, offset) {
            return toStringFromCodes(getBytes(len, offset));
        }

        function setString(offset, value) {
            return setBytes(offset, toCodesFromString(value));
        }

        function writeString(value) {
            return writeBytes(toCodesFromString(value));
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

    function copy(value) {
        var c;

        if (isObject(value)) {
            c = {};
            Object.keys(value).forEach(function (key) {
                c[key] = copy(value[key]);
            });
        } else if (isArray(value)) {
            c = [];
            value.forEach(function (v) {
                c.push(copy(v));
            });
        } else {
            c = value;
        }
        return c;
    }

    function each(items, executable, thisarg) {
        if (!isFunction(executable)) {
            return;
        }
        if (isUndefined(thisarg)) {
            thisarg = items;
        }
        if (isGG(items)) {
            items.eachRaw(executable);
        } else if (isNode(items)) {
            executable.call(thisarg, items, 0, thisarg);
        } else if (isArray(items) || isArrayLike(items) || isTypedArray(items) || isBuffer(items)) {
            toArray(items).forEach(executable, thisarg);
        } else if (isObject(items)) {
            Object.keys(items).forEach(function (key) {
                executable.call(thisarg, items[key], key, thisarg);
            });
        }
        return thisarg;
    }

    function emitter(value) {
        var em = (value && typeof value === "object")
            ? value
            : {};
        em.emitter = true;
        em.events = {};

        em.addListener = function (type, listener) {
            var list = em.events[type];

            if (typeof listener === "function") {
                if (em.events.newListener) {
                    em.emit("newListener", type, typeof listener.listener === "function"
                        ? listener.listener
                        : listener);
                }
                if (!list) {
                    em.events[type] = [listener];
                } else {
                    em.events[type].push(listener);
                }
            }
            return em;
        };
        em.on = em.addListener;

        em.once = function (type, listener) {
            function onetime() {
                em.removeListener(type, onetime);
                listener.apply(em);
            }
            if (typeof listener === "function") {
                onetime.listener = listener;
                em.on(type, onetime);
            }
            return em;
        };

        em.removeListener = function (type, listener) {
            var list = em.events[type];
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
                        delete em.events[type];
                    } else {
                        list.splice(position, 1);
                    }
                    if (em.events.removeListener) {
                        em.emit("removeListener", type, listener);
                    }
                }
            }
            return em;
        };
        em.off = em.removeListener;

        em.removeAllListeners = function (type) {
            var list;

            if (!em.events.removeListener) {
                if (!type) {
                    Object.keys(em.events).forEach(function (key) {
                        delete em.events[key];
                    });
                } else {
                    delete em.events[type];
                }
            } else if (!type) {
                Object.keys(em.events).forEach(function (key) {
                    if (key !== "removeListener") {
                        em.removeAllListeners(key);
                    }
                });
                em.removeAllListeners("removeListener");
            } else {
                list = em.events[type];
                list.forEach(function (item) {
                    em.removeListener(type, item);
                });
                delete em.events[type];
            }
            return em;
        };

        em.listeners = function (type) {
            var list = [];

            if (typeof type === "string" && em.events[type]) {
                list = em.events[type];
            } else {
                Object.keys(em.events).forEach(function (key) {
                    list.push(em.events[key]);
                });
            }
            return list;
        };

        em.emit = function (type) {
            var list = em.events[type];
            var emitted = false;
            var args;

            if (list) {
                args = Array.prototype.slice.call(arguments, 1);
                list.forEach(function (value) {
                    value.apply(em, args);
                });
                emitted = true;
            }
            return emitted;
        };

        return em;
    }

    function equal(one, two) {
        var result = true;

        if (typeOf(one) !== typeOf(two) || (typeOf(one) !== "array" && typeOf(one) !== "object" && one !== two)) {
            result = false;
        } else if (typeOf(one) === "array") {
            one.forEach(function (val) {
                if (two.indexOf(val) === -1) {
                    result = false;
                }
            });
        } else if (typeOf(one) === "object") {
            Object.keys(one).forEach(function (key) {
                if (one[key] !== two[key]) {
                    result = false;
                }
            });
        }
        return result;
    }

    function extend(value, add, overwrite) {
        if (!isObject(value) || !isObject(add)) {
            return value;
        }
        overwrite = isBoolean(overwrite)
            ? overwrite
            : true;
        Object.keys(add).forEach(function (key) {
            if (overwrite || !value.hasOwnProperty(key)) {
                value[key] = copy(add[key]);
            }
        });
        return value;
    }

    function inherits(ctor, superCtor) {
        if (!isFunction(ctor) || !isFunction(superCtor)) {
            return ctor;
        }
        ctor.ggSuper = superCtor;
        ctor.prototype = Object.create(superCtor.prototype, {
            constructor: {
                value: ctor,
                enumberable: false,
                writable: true,
                configurable: true
            }
        });
        return ctor;
    }

    function inArray(list, value) {
        return isArray(list) && list.indexOf(value) > -1;
    }

    function noop() {
        return;
    }

    function supplant(value, supplanter) {
        function replaceExpression(expression, key) {
            var val = supplanter[key];

            return !isUndefined(val)
                ? val
                : expression;
        }
        return (isString(value) && isObject(supplanter))
            ? value.replace(/\{([^{}]*)\}/g, replaceExpression)
            : value;
    }

    function uuid() {
        var id = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx";

        return id.replace(/[xy]/g, function (char) {
            var rand = Math.random() * 16 | 0;
            var code = char === "x"
                ? rand
                : rand & 0x3 | 0x8;

            return code.toString(16);
        });
    }

    // GET
    function getPosition(node) {
        var pos = {
            x: 0,
            y: 0
        };

        if (!isNode(node)) {
            return;
        }
        while (node) {
            if (node.nodeName.toLowerCase() === "body") {
                pos.x += (node.offsetLeft - (node.scrollLeft || document.documentElement.scrollLeft) + node.clientLeft);
                pos.y += (node.offsetTop - (node.scrollTop || document.documentElement.scrollTop) + node.clientTop);
            } else {
                pos.x += (node.offsetLeft - node.scrollLeft + node.clientLeft);
                pos.y += (node.offsetTop - node.scrollTop + node.clientTop);
            }
            node = node.offsetParent;
        }
        return pos;
    }

    function getStyle(node, pseudo) {
        return global.getComputedStyle(node, isUndefined(pseudo)
            ? null
            : pseudo);
    }

    // TIMEOUT
    function setImmediate(executable) {
        var args = arrSlice(arguments, 1);

        if (!isFunction(executable)) {
            return;
        }
        return global.setTimeout(executable, 0, args);
    }

    // QUERY
    function getById(id, supplanter) {
        return document.getElementById(supplant(id, supplanter));
    }

    function select(selector, supplanter, node) {
        return isNode(node)
            ? node.querySelector(supplant(selector, supplanter))
            : document.querySelector(supplant(selector, supplanter));
    }

    function selectAll(selector, supplanter, node) {
        return isNode(node)
            ? node.querySelectorAll(supplant(selector, supplanter))
            : document.querySelectorAll(supplant(selector, supplanter));
    }

    // SCROLL
    function scrollIntoView(node, easingExec) {
        var el = isGG(node)
            ? node.raw(0)
            : node;
        var executable = !isFunction(easingExec)
            ? ease.easeInOutSine
            : easingExec
        var relativeTo = document.body;
        var animation;
        var max = relativeTo.scrollHeight - global.innerHeight;
        var current = 0;
        var start = relativeTo.scrollTop;
        var end = relativeTo.scrollTop + getPosition(el).y > max
            ? max
            : relativeTo.scrollTop + getPosition(el).y;
        var framerate = 60 / 1000;
        var duration = 1200;

        function step() {
            var newval;

            if (current >= framerate * duration) {
                return global.cancelAnimationFrame(animation);
            }
            current += 1;
            newval = executable(current, start, end - start, framerate * duration);
            relativeTo.scrollTop = newval;
            animation = global.requestAnimationFrame(step);
        }

        animation = global.requestAnimationFrame(step);
    }

    function scrollToTop(node, easingExec) {
        var el = isGG(node)
            ? node.raw(0)
            : node;
        var executable = !isFunction(easingExec)
            ? ease.easeInOutSine
            : easingExec
        var animation;
        var current = 0;
        var start = el.scrollTop;
        var end = 0;
        var framerate = 60 / 1000;
        var duration = 1200;

        function step() {
            var newval;

            if (current >= framerate * duration) {
                return global.cancelAnimationFrame(animation);
            }
            current += 1;
            newval = executable(current, start, end - start, framerate * duration);
            el.scrollTop = newval;
            animation = global.requestAnimationFrame(step);
        }

        animation = global.requestAnimationFrame(step);
    }

    // GG
    function gg(mselector, supplanter) {
        var gobject = {
            gg: true
        };
        var store = [];

        function closure(executable, node, arg) {
            return function (e) {
                return executable.call(null, e, gg(node), arg);
            };
        }

        function cloneNodeDeeper(node) {
            var nodeid;
            var cloneid;
            var clone;

            if (isGG(node) && node.length() === 1) {
                node = node.raw();
            }
            if (isNode(node)) {
                nodeid = global.parseInt(node.getAttribute("data-gg-id"), 10);
                clone = node.cloneNode(true);
            }
            if (!isNumber(nodeid) || !listeners.hasOwnProperty(nodeid)) {
                return clone;
            }
            cloneid = ggid();
            clone.setAttribute("data-gg-id", cloneid);
            listeners[cloneid] = {};
            each(listeners[nodeid], function (list, type) {
                listeners[cloneid][type] = {};
                each(list, function (params, execid) {
                    var executable = params[0];
                    var bub = params[2];
                    var arg = params[3];
                    var closedExecutable = closure(executable, clone, arg);

                    listeners[cloneid][type][execid] = [executable, closedExecutable, bub, arg];
                    clone.addEventListener(type, closedExecutable, bub);
                });
            });
            return clone;
        }

        if (isGG(mselector)) {
            return mselector;
        }

        if (isString(mselector)) {
            mselector = selectAll(mselector, supplanter);
        }

        each(mselector, function (node) {
            if (isNode(node) && node.nodeType < 9) {
                store.push(node);
            }
        });

        gobject.add = function (nodes) {
            if (isString(nodes)) {
                nodes = gg(nodes);
            }
            each(nodes, function (node) {
                if (isNode(node) && node.nodeType < 9) {
                    store.push(node);
                }
            });
            return gobject;
        };

        gobject.addClass = function (value) {
            if (!isString(value)) {
                return gobject;
            }
            each(store, function (node) {
                value.split(/\s/g).forEach(function (substring) {
                    var match = new RegExp("(?:^|\\s)" + substring + "(?:$|\\s)", "g");

                    if (!isObject(node.className)) {
                        node.className = match.test(node.className)
                            ? node.className
                            : node.className
                                ? node.className + " " + substring
                                : substring;
                    } else {
                        node.classList.add(substring);
                    }
                });
            });
            return gobject;
        };

        gobject.after = function (value) {
            var willcopy = store.length > 1;

            if (isString(value)) {
                value = gg(value);
            }
            each(store, function (node) {
                each(value, function (sibling) {
                    if (!isNode(sibling)) {
                        return;
                    }
                    node.parentNode.insertBefore(willcopy
                        ? cloneNodeDeeper(sibling)
                        : sibling, node.nextSibling);
                });
            });
            return gobject;
        };

        gobject.append = function (value) {
            var willcopy = store.length > 1;

            if (isString(value)) {
                value = gg(value);
            }
            each(store, function (node) {
                each(value, function (child) {
                    if (!isNode(child)) {
                        return;
                    }
                    node.appendChild(willcopy
                        ? cloneNodeDeeper(child)
                        : child);
                });
            });
            return gobject;
        };

        gobject.appendTo = function (value) {
            var willcopy = toArray(value).length > 1;

            if (isString(value)) {
                value = gg(value);
            }
            each(store, function (node) {
                each(value, function (parent) {
                    if (!isNode(parent)) {
                        return;
                    }
                    parent.appendChild(willcopy
                        ? cloneNodeDeeper(node)
                        : node);
                });
            });
            return gobject;
        };

        gobject.attr = function (name, value) {
            var attrname = isString(name) && toCamelCase(name);
            var values;

            if (isObject(name)) {
                each(name, function (value, key) {
                    gobject.attr(key, value);
                });
            } else if (isArray(name)) {
                values = {};
                name.forEach(function (key) {
                    values[key] = gobject.attr(key);
                });
            } else if (isUndefined(value) && attrname) {
                values = [];
                each(store, function (node) {
                    values.push(node[attrname]);
                });
                values = values.length === 0
                    ? null
                    : values.length === 1
                        ? values[0]
                        : values;
            } else if (attrname) {
                each(store, function (node) {
                    node[attrname] = value;
                });
            }
            return isUndefined(values)
                ? gobject
                : values;
        };

        gobject.before = function (value) {
            var willcopy = store.length > 1;

            if (isString(value)) {
                value = gg(value);
            }
            each(store, function (node) {
                each(value, function (sibling) {
                    if (!isNode(sibling)) {
                        return;
                    }
                    node.parentNode.insertBefore(willcopy
                        ? cloneNodeDeeper(sibling)
                        : sibling, node);
                });
            });
            return gobject;
        };

        gobject.children = function () {
            var nodes = [];

            each(store, function (node) {
                nodes = nodes.concat(toArray(node.childNodes));
            });
            return gg(nodes);
        };

        gobject.classes = function (value) {
            var values = [];

            if (isUndefined(value)) {
                each(store, function (node) {
                    values.push(node.className);
                });
                values = values.length === 0
                    ? null
                    : values.length === 1
                        ? values[0]
                        : values;
            } else if (isString(value)) {
                each(store, function (node) {
                    node.className = value.trim();
                });
            }
            return isUndefined(value)
                ? values
                : gobject;
        };

        gobject.clone = function (deep, deeper) {
            var nodes = [];

            deep = isBoolean(deep)
                ? deep
                : false;
            deeper = isBoolean(deeper)
                ? deeper
                : false;
            each(store, function (node) {
                nodes.push(deeper
                    ? cloneNodeDeeper(node)
                    : node.cloneNode(deep));
            });
            return gg(nodes);
        };

        gobject.create = function (tag) {
            return inArray(taglist, tag)
                ? gg(document.createElement(tag)).appendTo(gobject)
                : gobject;
        };

        gobject.data = function (name, value) {
            var dataname = (isString(name) && (name.length < 4 || name.slice(0, 4) !== "data"))
                ? toHyphenated("data-" + name)
                : toHyphenated(name);
            var values;

            if (isObject(name)) {
                each(name, function (value, key) {
                    gobject.data(key, value);
                });
            } else if (isArray(name)) {
                values = {};
                name.forEach(function (key) {
                    values[key] = gobject.data(key);
                });
            } else if (isUndefined(value) && dataname) {
                values = [];
                each(store, function (node) {
                    values.push(node.getAttribute(dataname));
                });
                values = values.length === 0
                    ? null
                    : values.length === 1
                        ? values[0]
                        : values;
            } else if (dataname) {
                each(store, function (node) {
                    node.setAttribute(dataname, value);
                });
            }
            return isUndefined(values)
                ? gobject
                : values;
        };

        gobject.each = function (executable) {
            store.forEach(function (node, index, thisarg) {
                executable.call(thisarg, gg(node), index, thisarg);
            }, gobject);
            return gobject;
        };

        gobject.eachRaw = function (executable) {
            store.forEach(executable, gobject);
            return gobject;
        };

        gobject.get = function (index) {
            if (isNumber(index) && index >= 0 && index < store.length) {
                return gg(store[index]);
            }
            return gobject;
        };

        gobject.hasClass = function (value) {
            var values = [];

            if (!isString(value)) {
                return false;
            }
            each(store, function (node) {
                values.push(value.split(/\s/g).every(function (substring) {
                    var match = new RegExp("(?:^|\\s)" + substring + "(?:$|\\s)", "g");

                    if (!isObject(node.className)) {
                        return match.test(node.className);
                    } else {
                        return node.classList.contains(substring);
                    }
                }));
            });
            return values.length === 0
                ? null
                : values.length === 1
                    ? values[0]
                    : values;
        };

        gobject.html = function (value) {
            var values = [];

            if (isUndefined(value)) {
                each(store, function (node) {
                    values.push(node.innerHTML);
                });
                values = values.length === 0
                    ? null
                    : values.length === 1
                        ? values[0]
                        : values;
            } else if (isString(value) || isNumber(value)) {
                each(store, function (node) {
                    node.innerHTML = value;
                });
            }
            return isUndefined(value)
                ? values
                : gobject;
        };

        gobject.insert = (function () {
            var positions = ["beforebegin", "afterbegin", "beforeend", "afterend"];

            return function (pos, value) {
                if (!isString(value)) {
                    return gobject;
                }
                if (!inArray(positions, pos)) {
                    pos = "beforeend";
                }
                each(store, function (node) {
                    node.insertAdjacentHTML(pos, value);
                });
                return gobject;
            };
        }());

        gobject.length = function () {
            return store.length;
        };

        gobject.off = function (type, executable, bub) {
            if (!isString(type)) {
                return gobject;
            }
            bub = isBoolean(bub)
                ? bub
                : false;
            each(store, function (node) {
                var nodeid = global.parseInt(node.getAttribute("data-gg-id"), 10);
                var execid = isFunction(executable) && executable.ggid;

                if (!isNumber(nodeid) || !listeners.hasOwnProperty(nodeid) || !listeners[nodeid].hasOwnProperty(type)) {
                    return gobject;
                }
                if (isUndefined(executable)) {
                    each(listeners[nodeid][type], function (params, execid, list) {
                        node.removeEventListener(type, params[1], bub);
                    });
                    delete listeners[nodeid][type];
                } else if (isNumber(execid) && listeners[nodeid][type].hasOwnProperty(execid)) {
                    node.removeEventListener(type, listeners[nodeid][type][execid][1], bub);
                    delete listeners[nodeid][type][execid];
                }
            });
            return gobject;
        };

        gobject.on = function (type, executable, bub, arg) {
            var execid;
            var closedExecutable;

            if (!isString(type) || !isFunction(executable)) {
                return gobject;
            }
            bub = isBoolean(bub)
                ? bub
                : false;
            execid = isNumber(executable.ggid)
                ? executable.ggid
                : ggid();
            executable.ggid = execid;
            each(store, function (node) {
                var nodeid = !isNumber(global.parseInt(node.getAttribute("data-gg-id"), 10))
                    ? ggid()
                    : global.parseInt(node.getAttribute("data-gg-id"), 10);

                node.setAttribute("data-gg-id", nodeid);
                if (!listeners.hasOwnProperty(nodeid)) {
                    listeners[nodeid] = {};
                }
                if (!listeners[nodeid].hasOwnProperty(type)) {
                    listeners[nodeid][type] = {};
                }
                if (listeners[nodeid][type].hasOwnProperty(execid)) {
                    node.removeEventListener(type, listeners[nodeid][type][execid][1], bub);
                }
                closedExecutable = closure(executable, node, arg);
                listeners[nodeid][type][execid] = [executable, closedExecutable, bub, arg];
                node.addEventListener(type, closedExecutable, bub);
            });
            return gobject;
        };

        gobject.once = function (type, executable, bub, arg) {
            function handler(node, arg) {
                return function onetime(e) {
                    executable.call(null, e, gg(node), arg);
                    node.removeEventListener(type, onetime, bub);
                };
            }
            if (!isString(type) || !isFunction(executable)) {
                return gobject;
            }
            bub = isBoolean(bub)
                ? bub
                : false;
            each(store, function (node) {
                node.addEventListener(type, handler(node, arg), bub);
            });
            return gobject;
        };

        gobject.parents = function () {
            var nodes = [];

            each(store, function (node) {
                nodes.push(node.parentNode);
            });
            return gg(nodes);
        };

        gobject.prepend = function (value) {
            var willcopy = store.length > 1;

            if (isString(value)) {
                value = gg(value);
            }
            each(store, function (node) {
                each(value, function (child) {
                    if (!isNode(child)) {
                        return;
                    }
                    node.insertBefore(willcopy
                        ? cloneNodeDeeper(child)
                        : child, node.firstChild);
                });
            });
            return gobject;
        };

        gobject.prependTo = function (value) {
            var willcopy = toArray(value).length > 1;

            if (isString(value)) {
                value = gg(value);
            }
            each(store, function (node) {
                each(value, function (parent) {
                    if (!isNode(parent)) {
                        return;
                    }
                    parent.insertBefore(willcopy
                        ? cloneNodeDeeper(node)
                        : node, parent.firstChild);
                });
            });
            return gobject;
        };

        gobject.prop = function (name, value) {
            var propname = isString(name) && toCamelCase(name);
            var values;

            if (isObject(name)) {
                each(name, function (value, key) {
                    gobject.prop(key, value);
                });
            } else if (isArray(name)) {
                values = {};
                name.forEach(function (key) {
                    values[key] = gobject.prop(key);
                });
            } else if (isUndefined(value) && propname) {
                values = [];
                each(store, function (node) {
                    values.push(node.style[propname] || global.getComputedStyle(node, null).getPropertyValue(propname));
                });
                values = values.length === 0
                    ? null
                    : values.length === 1
                        ? values[0]
                        : values;
            } else if (propname) {
                each(store, function (node) {
                    node.style[propname] = value;
                });
            }
            return isUndefined(values)
                ? gobject
                : values;
        };
        gobject.css = gobject.prop;
        gobject.style = gobject.prop;

        gobject.raw = function (index) {
            if (isNumber(index) && index >= 0 && index < store.length) {
                return store[index];
            }
            return store.length === 1
                ? store[0]
                : store;
        };

        gobject.remove = function (value) {
            if (isUndefined(value)) {
                each(store, function (node) {
                    if (node.parentNode) {
                        node.parentNode.removeChild(node);
                    }
                });
            } else {
                each(store, function (node) {
                    each(value, function (child) {
                        if (!isNode(child) || !node.contains(child)) {
                            return;
                        }
                        if (child.parentNode) {
                            node.removeChild(child);
                        }
                    });
                });
            }
            return gobject;
        };

        gobject.remAttr = function (name) {
            var attrname = isString(name) && toCamelCase(name);

            if (isObject(name)) {
                each(name, function (value, key) {
                    gobject.remAttr(key);
                });
            } else if (isArray(name)) {
                name.forEach(function (key) {
                    gobject.remAttr(key);
                });
            } else if (attrname) {
                each(store, function (node) {
                    node.removeAttribute(attrname);
                });
            }
            return gobject;
        };

        gobject.remClass = function (value) {
            if (!isString(value)) {
                return gobject;
            }
            each(store, function (node) {
                value.split(/\s/).forEach(function (substring) {
                    var match = new RegExp("(?:^|\\s)" + substring + "(?:$|\\s)", "g");

                    if (!isObject(node.className)) {
                        node.className = node.className.replace(match, " ").trim();
                    } else {
                        node.classList.remove(substring);
                    }
                });
            });
            return gobject;
        };

        gobject.remData = function (name) {
            var dataname = (isString(name) && (name.length < 4 || name.slice(0, 4) !== "data"))
                ? toHyphenated("data-" + name)
                : toHyphenated(name);

            if (isObject(name)) {
                each(name, function (value, key) {
                    gobject.remData(key);
                });
            } else if (isArray(name)) {
                name.forEach(function (key) {
                    gobject.remData(key);
                });
            } else if (dataname) {
                each(store, function (node) {
                    node.removeAttribute(dataname);
                });
            }
            return gobject;
        };

        gobject.remHtml = function () {
            each(store, function (node) {
                node.innerHTML = "";
            });
            return gobject;
        };

        gobject.remProp = function (name) {
            var propname = isString(name) && toCamelCase(name);

            if (isObject(name)) {
                each(name, function (value, key) {
                    gobject.remProp(key);
                });
            } else if (isArray(name)) {
                name.forEach(function (key) {
                    gobject.remProp(key);
                });
            } else if (propname) {
                each(store, function (node) {
                    node.style.removeProperty(propname);
                });
            }
            return gobject;
        };
        gobject.remCss = gobject.remProp;
        gobject.remStyle = gobject.remProp;

        gobject.remText = function remText() {
            each(store, function (node) {
                node.textContent = "";
            });
            return gobject;
        };

        gobject.select = function (selector, supplanter) {
            var nodes = [];

            each(store, function (node) {
                nodes = nodes.concat(toArray(select(selector, supplanter, node)));
            });
            return gg(nodes);
        };

        gobject.selectAll = function (selector, supplanter) {
            var nodes = [];

            each(store, function (node) {
                nodes = nodes.concat(toArray(selectAll(selector, supplanter, node)));
            });
            return gg(nodes);
        };

        gobject.subtract = function (index) {
            if (isNumber(index) && index >= 0 && index < store.length) {
                store.splice(index, 1);
            }
            return gobject;
        };

        gobject.text = function (value) {
            var values = [];

            if (isUndefined(value)) {
                each(store, function (node) {
                    values.push(node.textContent);
                });
                values = values.length === 0
                    ? null
                    : values.length === 1
                        ? values[0]
                        : values;
            } else if (isString(value) || isNumber(value)) {
                each(store, function (node) {
                    node.textContent = value;
                });
            }
            return isUndefined(value)
                ? values
                : gobject;
        };

        gobject.togClass = function (value) {
            if (!isString(value)) {
                return gobject;
            }
            each(store, function (node) {
                value.split(/\s/).forEach(function (substring) {
                    var match = new RegExp("(?:^|\\s)" + substring + "(?:$|\\s)", "g");

                    if (!isObject(node.className)) {
                        node.className = match.test(node.className)
                            ? node.className.replace(match, " ").trim()
                            : node.className
                                ? node.className + " " + substring
                                : substring;
                    } else {
                        node.classList.toggle(substring);
                    }
                });
            });
            return gobject;
        };

        return Object.freeze(gobject);
    }

    // CREATE
    function create(tag) {
        return inArray(taglist, tag)
            ? gg(document.createElement(tag))
            : null;
    }

    // DEVICES
    keyboardListener = (function () {
        var common = {
            "enter": 13,
            "left": 37,
            "up": 38,
            "right": 39,
            "down": 40
        };

        function keyDown(options, handlers) {
            return function (e) {
                var keycode = e.keyCode;

                if (options.preventDefault) {
                    e.preventDefault();
                }
                if (isNumber(keycode) && handlers.hasOwnProperty(keycode)) {
                    handlers[keycode](e);
                }
            };
        }
        return function (options) {
            var handlers = {};
            var listener;

            options = extend({}, options);
            each(options, function (handler, key) {
                var keycode = isString(key) && common.hasOwnProperty(key)
                    ? common[key]
                    : global.parseInt(key, 10);

                if (isFunction(handler) && isNumber(keycode)) {
                    handlers[keycode] = handler;
                }
            });
            listener = keyDown(options, handlers);
            keyboardListeners.push(listener);
            gg(document.body).on("keydown", listener, false);
        };
    }());

    mouseListener = (function () {
        var common = {
            "left": 0,
            "middle": 1,
            "right": 2
        };

        function mouseDown(options, handlers) {
            return function (e) {
                var buttoncode = e.button;

                if (options.preventDefault) {
                    e.preventDefault();
                }
                if (isNumber(buttoncode) && handlers.hasOwnProperty(buttoncode)) {
                    handlers[buttoncode](e);
                }
            };
        }
        return function (options) {
            var handlers = {};
            var listener;

            options = extend({}, options);
            each(options, function (handler, button) {
                var buttoncode = isString(button) && common.hasOwnProperty(button)
                    ? common[button]
                    : global.parseInt(button, 10);

                if (isFunction(handler) && isNumber(buttoncode)) {
                    handlers[buttoncode] = handler;
                }
            });
            listener = mouseDown(options, handlers);
            mouseListeners.push(listener);
            gg(document.body).on("mousedown", listener, false);
        };
    }());

    function removeKeyboardListeners() {
        keyboardListeners.forEach(function (listener) {
            gg(document.body).off("keydown", listener);
        });
    }

    function removeMouseListeners() {
        mouseListeners.forEach(function (listener) {
            gg(document.body).off("mousedown", listener);
        });
    }

    // STORAGE
    cdb = emitter();

    function cdbRequest(req, db) {
        return Object.freeze({
            request: function () {
                return req;
            },
            database: function () {
                return db;
            },
            select: function (table, key) {
                return db.transaction([table], "readonly").objectStore(table).get(key);
            },
            selectAll: function (table, query, count) {
                return db.transaction([table], "readonly").objectStore(table).getAll(query, count);
            },
            selectAllKeys: function (table, query, count) {
                return db.transaction([table], "readonly").objectStore(table).getAllKeys(query, count);
            },
            selectIndex: function (table, index, key) {
                return db.transaction([table], "readonly").objectStore(table).index(index).get(key);
            },
            delete: function (table, key) {
                return db.transaction([table], "readwrite").objectStore(table).delete(key);
            },
            insert: function (table, value, key) {
                return key === undefined
                    ? db.transaction([table], "readwrite").objectStore(table).add(value)
                    : db.transaction([table], "readwrite").objectStore(table).add(value, key);
            },
            update: function (table, value, key) {
                return key === undefined
                    ? db.transaction([table], "readwrite").objectStore(table).put(value)
                    : db.transaction([table], "readwrite").objectStore(table).put(value, key);
            },
            clear: function (table) {
                return db.transaction([table], "readwrite").objectStore(table).clear();
            },
            count: function (table, query) {
                return db.transaction([table], "readonly").objectStore(table).count(query);
            }
        });
    }

    function cdbDatabase(db) {
        return Object.freeze({
            database: function () {
                return db;
            },
            create: function (table, options, schema) {
                var tableobj = db.createObjectStore(table, options);

                if (!schema) {
                    return tableobj;
                }
                Object.keys(schema).forEach(function (key) {
                    schema[key].unshift(key);
                    tableobj.createIndex.apply(tableobj, schema[key]);
                });
                return tableobj;
            },
            delete: function (table) {
                db.deleteObjectStore(table);
                cdb.emit("delete-table", table);
            }
        });
    }

    function dbError(e) {
        cdb.emit("error", e);
    }

    function dbDeleteSuccess(e) {
        cdb.emit("delete-db", e);
    }

    function dbUpgrade(executable) {
        return function (e) {
            var db = e.target.result;

            db.onerror = dbError;
            executable(e, cdbDatabase(db));
        };
    }

    function dbOpenSuccess(e) {
        var req = e.target;
        var db = req.result;

        db.onerror = dbError;
        cdb.emit("open", e, cdbRequest(req, db));
    }

    cdb.open = function (name, version, executable) {
        var request;

        if (typeOf(executable) !== "function") {
            executable = typeOf(version) === "function"
                ? version
                : noop;
        }
        if (typeOf(version) !== "number") {
            version = 1;
        }
        request = indexedDB.open(name, version);
        request.onerror = dbError;
        request.onsuccess = dbOpenSuccess;
        request.onupgradeneeded = dbUpgrade(executable);
    };

    cdb.delete = function (name) {
        var request = indexedDB.deleteDatabase(name);

        request.onerror = dbError;
        request.onsuccess = dbDeleteSuccess;
    };

    if (!indexedDB) {
        global.console.log("indexedDB was not found and/or supported!");
        cdb = null;
    }

    gg.typeOf = typeOf;
    gg.arrSlice = arrSlice;
    gg.isArray = isArray;
    gg.isBoolean = isBoolean;
    gg.isFunction = isFunction;
    gg.isNull = isNull;
    gg.isNumber = isNumber;
    gg.isObject = isObject;
    gg.isString = isString;
    gg.isUndefined = isUndefined;
    gg.isArrayLike = isArrayLike;
    gg.isBuffer = isBuffer;
    gg.isEmpty = isEmpty;
    gg.isGG = isGG;
    gg.isNan = isNan;
    gg.isNode = isNode;
    gg.isTypedArray = isTypedArray;
    gg.toArray = toArray;
    gg.toCamelCase = toCamelCase;
    gg.toCodesFromString = toCodesFromString;
    gg.toFloat = toFloat;
    gg.toHyphenated = toHyphenated;
    gg.toInt = toInt;
    gg.toUint8 = toUint8;
    gg.toBuffer = toBuffer;
    gg.toStringFromCodes = toStringFromCodes;
    gg.betterview = betterview;
    gg.copy = copy;
    gg.each = each;
    gg.emitter = emitter;
    gg.equal = equal;
    gg.extend = extend;
    gg.inherits = inherits;
    gg.inArray = inArray;
    gg.noop = noop;
    gg.supplant = supplant;
    gg.uuid = uuid;
    gg.getPosition = getPosition;
    gg.getStyle = getStyle;
    gg.setImmediate = setImmediate;
    gg.getById = getById;
    gg.select = select;
    gg.selectAll = selectAll;
    gg.scrollIntoView = scrollIntoView;
    gg.scrollToTop = scrollToTop;
    gg.create = create;
    gg.keyboardListener = keyboardListener;
    gg.mouseListener = mouseListener;
    gg.removeKeyboardListeners = removeKeyboardListeners;
    gg.removeMouseListeners = removeMouseListeners;
    gg.ease = ease;
    gg.cdb = Object.freeze(cdb);

    global.gg = Object.freeze(gg);

}(window || this));
