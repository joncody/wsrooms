"use strict";

if (ArrayBuffer.prototype.slice === undefined) {
    ArrayBuffer.prototype.slice = function (start, end) {
        let that = new Uint8Array(this);
        let result;
        let resultarray;
        let i;

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

const global = globalThis || window || this;

const ease = Object.freeze({
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

function typeOf(value) {
    let type = typeof value;

    if (Array.isArray(value)) {
        type = "array";
    } else if (value === null) {
        type = "null";
    }
    return type;
}

function arrSlice(value, begin, end) {
    return Array.prototype.slice.call(value, begin, end);
}

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
    const types = [
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
    let type = Object.prototype.toString.call(value).replace(/\[object\s(\w+)\]/, "$1");

    return types.indexOf(type) > -1;
}

function toArray(value) {
    let list;

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
    const codes = [];

    toArray(value).forEach(function (char) {
        codes.push(char.charCodeAt(0));
    });
    return codes;
}

function toFloat(value, decimals) {
    const float = global.parseFloat(isString(value)
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
    const int = global.parseInt(isString(value)
        ? value.replace(",", "")
        : value, isNumber(radix)
            ? radix
            : 10);

    return Number.isNaN(int)
        ? 0
        : int;
}

function toUint8(value) {
    let uint8;

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
    let string = "";

    toArray(value).forEach(function (char) {
        string += String.fromCharCode(char);
    });
    return string;
}

function copy(value) {
    let c;

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
            enumerable: false,
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
        const val = supplanter[key];

        return !isUndefined(val)
            ? val
            : expression;
    }
    return (isString(value) && isObject(supplanter))
        ? value.replace(/\{([^{}]*)\}/g, replaceExpression)
        : value;
}

function uuid() {
    let id = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx";

    return id.replace(/[xy]/g, function (char) {
        const rand = Math.random() * 16 | 0;
        const code = char === "x"
            ? rand
            : rand & 0x3 | 0x8;

        return code.toString(16);
    });
}

function getPosition(node) {
    const pos = {
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

function setImmediate(executable) {
    const args = arrSlice(arguments, 1);

    if (!isFunction(executable)) {
        return;
    }
    return global.setTimeout(executable, 0, args);
}

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

function scrollIntoView(node, easingExec) {
    const el = isGG(node)
        ? node.raw(0)
        : node;
    const executable = !isFunction(easingExec)
        ? ease.easeInOutSine
        : easingExec
    const relativeTo = document.scrollingElement || document.documentElement || document.body;
    let animation;
    const max = relativeTo.scrollHeight - global.innerHeight;
    let current = 0;
    const start = relativeTo.scrollTop;
    const end = relativeTo.scrollTop + getPosition(el).y > max
        ? max
        : relativeTo.scrollTop + getPosition(el).y;
    const framerate = 60 / 1000;
    const duration = 1200;

    function step() {
        let newval;

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
    const el = isGG(node)
        ? node.raw(0)
        : node;
    const executable = !isFunction(easingExec)
        ? ease.easeInOutSine
        : easingExec
    let animation;
    let current = 0;
    const start = el.scrollTop;
    const end = 0;
    const framerate = 60 / 1000;
    const duration = 1200;

    function step() {
        let newval;

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

export default Object.freeze({
    ease,
    typeOf,
    arrSlice,
    isArray,
    isBoolean,
    isFunction,
    isNull,
    isNumber,
    isObject,
    isString,
    isUndefined,
    isArrayLike,
    isBuffer,
    isEmpty,
    isGG,
    isNan,
    isNode,
    isTypedArray,
    toArray,
    toCamelCase,
    toCodesFromString,
    toFloat,
    toHyphenated,
    toInt,
    toUint8,
    toBuffer,
    toStringFromCodes,
    copy,
    each,
    extend,
    inherits,
    inArray,
    noop,
    supplant,
    uuid,
    getPosition,
    getStyle,
    setImmediate,
    getById,
    select,
    selectAll,
    scrollIntoView,
    scrollToTop
});
