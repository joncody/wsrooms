"use strict";

import ease from "./ease.js";
import utils from "./utils.js";
import emitter from "./emitter.js";
import betterview from "./betterview.js";
import cdb from "./cdb.js";

const global = globalThis || window || this;

const ggid = (function () {
    let id = 0;
    const maxint = Math.pow(2, 53) - 1;

    return function () {
        id = id < maxint
            ? id + 1
            : 1;
        return id;
    };
}());
let keyboardListener;
const keyboardListeners = [];
const listeners = {};
let mouseListener;
const mouseListeners = [];
const taglist = [
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

// GG
function gg(mselector, supplanter) {
    const gobject = {
        gg: true
    };
    const store = [];

    function closure(executable, node, arg) {
        return function (e) {
            return executable.call(null, e, gg(node), arg);
        };
    }

    function cloneNodeDeeper(node) {
        let nodeid;
        let cloneid;
        let clone;

        if (utils.isGG(node) && node.length() === 1) {
            node = node.raw();
        }
        if (utils.isNode(node)) {
            nodeid = global.parseInt(node.getAttribute("data-gg-id"), 10);
            clone = node.cloneNode();
            clone.textContent = node.textContent;
            utils.each(node.children, function (child) {
                clone.appendChild(cloneNodeDeeper(child));
            });
        }
        if (!utils.isNumber(nodeid) || !listeners.hasOwnProperty(nodeid)) {
            return clone;
        }
        cloneid = ggid();
        clone.setAttribute("data-gg-id", cloneid);
        listeners[cloneid] = {};
        utils.each(listeners[nodeid], function (list, type) {
            listeners[cloneid][type] = {};
            utils.each(list, function (params, execid) {
                const executable = params[0];
                const bub = params[2];
                const arg = params[3];
                const closedExecutable = closure(executable, clone, arg);

                listeners[cloneid][type][execid] = [executable, closedExecutable, bub, arg];
                clone.addEventListener(type, closedExecutable, bub);
            });
        });
        return clone;
    }

    if (utils.isGG(mselector)) {
        return mselector;
    }

    if (utils.isString(mselector)) {
        mselector = utils.selectAll(mselector, supplanter);
    }

    utils.each(mselector, function (node) {
        if (utils.isNode(node) && node.nodeType < 9) {
            store.push(node);
        }
    });

    gobject.add = function (nodes) {
        if (utils.isString(nodes)) {
            nodes = gg(nodes);
        }
        utils.each(nodes, function (node) {
            if (utils.isNode(node) && node.nodeType < 9) {
                store.push(node);
            }
        });
        return gobject;
    };

    gobject.addClass = function (value) {
        if (!utils.isString(value)) {
            return gobject;
        }
        utils.each(store, function (node) {
            value.split(/\s/g).forEach(function (substring) {
                const match = new RegExp("(?:^|\\s)" + substring + "(?:$|\\s)", "g");

                if (!utils.isObject(node.className)) {
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
        const willcopy = store.length > 1;

        if (utils.isString(value)) {
            value = gg(value);
        }
        utils.each(store, function (node) {
            utils.each(value, function (sibling) {
                if (!utils.isNode(sibling)) {
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
        const willcopy = store.length > 1;

        if (utils.isString(value)) {
            value = gg(value);
        }
        utils.each(store, function (node) {
            utils.each(value, function (child) {
                if (!utils.isNode(child)) {
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
        const willcopy = utils.toArray(value).length > 1;

        if (utils.isString(value)) {
            value = gg(value);
        }
        utils.each(store, function (node) {
            utils.each(value, function (parent) {
                if (!utils.isNode(parent)) {
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
        const attrname = utils.isString(name) && utils.toCamelCase(name);
        let values;

        if (utils.isObject(name)) {
            utils.each(name, function (value, key) {
                gobject.attr(key, value);
            });
        } else if (utils.isArray(name)) {
            values = {};
            name.forEach(function (key) {
                values[key] = gobject.attr(key);
            });
        } else if (utils.isUndefined(value) && attrname) {
            values = [];
            utils.each(store, function (node) {
                values.push(node[attrname]);
            });
            values = values.length === 0
                ? null
                : values.length === 1
                    ? values[0]
                    : values;
        } else if (attrname) {
            utils.each(store, function (node) {
                node[attrname] = value;
            });
        }
        return utils.isUndefined(values)
            ? gobject
            : values;
    };

    gobject.before = function (value) {
        const willcopy = store.length > 1;

        if (utils.isString(value)) {
            value = gg(value);
        }
        utils.each(store, function (node) {
            utils.each(value, function (sibling) {
                if (!utils.isNode(sibling)) {
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
        let nodes = [];

        utils.each(store, function (node) {
            nodes = nodes.concat(utils.toArray(node.childNodes));
        });
        return gg(nodes);
    };

    gobject.classes = function (value) {
        let values = [];

        if (utils.isUndefined(value)) {
            utils.each(store, function (node) {
                values.push(node.className);
            });
            values = values.length === 0
                ? null
                : values.length === 1
                    ? values[0]
                    : values;
        } else if (utils.isString(value)) {
            utils.each(store, function (node) {
                node.className = value.trim();
            });
        }
        return utils.isUndefined(value)
            ? values
            : gobject;
    };

    gobject.clone = function (deep, deeper) {
        const nodes = [];

        deep = utils.isBoolean(deep)
            ? deep
            : false;
        deeper = utils.isBoolean(deeper)
            ? deeper
            : false;
        utils.each(store, function (node) {
            nodes.push(deeper
                ? cloneNodeDeeper(node)
                : node.cloneNode(deep));
        });
        return gg(nodes);
    };

    gobject.create = function (tag) {
        return utils.inArray(taglist, tag)
            ? gg(document.createElement(tag)).appendTo(gobject)
            : gobject;
    };

    gobject.data = function (name, value) {
        const dataname = (utils.isString(name) && (name.length < 4 || name.slice(0, 4) !== "data"))
            ? utils.toHyphenated("data-" + name)
            : utils.toHyphenated(name);
        let values;

        if (utils.isObject(name)) {
            utils.each(name, function (value, key) {
                gobject.data(key, value);
            });
        } else if (utils.isArray(name)) {
            values = {};
            name.forEach(function (key) {
                values[key] = gobject.data(key);
            });
        } else if (utils.isUndefined(value) && dataname) {
            values = [];
            utils.each(store, function (node) {
                values.push(node.getAttribute(dataname));
            });
            values = values.length === 0
                ? null
                : values.length === 1
                    ? values[0]
                    : values;
        } else if (dataname) {
            utils.each(store, function (node) {
                node.setAttribute(dataname, value);
            });
        }
        return utils.isUndefined(values)
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
        if (utils.isNumber(index) && index >= 0 && index < store.length) {
            return gg(store[index]);
        }
        return gobject;
    };

    gobject.hasClass = function (value) {
        let values = [];

        if (!utils.isString(value)) {
            return false;
        }
        utils.each(store, function (node) {
            values.push(value.split(/\s/g).every(function (substring) {
                const match = new RegExp("(?:^|\\s)" + substring + "(?:$|\\s)", "g");

                if (!utils.isObject(node.className)) {
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
        let values = [];

        if (utils.isUndefined(value)) {
            utils.each(store, function (node) {
                values.push(node.innerHTML);
            });
            values = values.length === 0
                ? null
                : values.length === 1
                    ? values[0]
                    : values;
        } else if (utils.isString(value) || utils.isNumber(value)) {
            utils.each(store, function (node) {
                node.innerHTML = value;
            });
        }
        return utils.isUndefined(value)
            ? values
            : gobject;
    };

    gobject.insert = (function () {
        const positions = ["beforebegin", "afterbegin", "beforeend", "afterend"];

        return function (pos, value) {
            if (!utils.isString(value)) {
                return gobject;
            }
            if (!utils.inArray(positions, pos)) {
                pos = "beforeend";
            }
            utils.each(store, function (node) {
                node.insertAdjacentHTML(pos, value);
            });
            return gobject;
        };
    }());

    gobject.length = function () {
        return store.length;
    };

    gobject.off = function (type, executable, bub) {
        if (!utils.isString(type)) {
            return gobject;
        }
        bub = utils.isBoolean(bub)
            ? bub
            : false;
        utils.each(store, function (node) {
            const nodeid = global.parseInt(node.getAttribute("data-gg-id"), 10);
            const execid = utils.isFunction(executable) && executable.ggid;

            if (!utils.isNumber(nodeid) || !listeners.hasOwnProperty(nodeid) || !listeners[nodeid].hasOwnProperty(type)) {
                return gobject;
            }
            if (utils.isUndefined(executable)) {
                utils.each(listeners[nodeid][type], function (params, execid, list) {
                    node.removeEventListener(type, params[1], bub);
                });
                delete listeners[nodeid][type];
            } else if (utils.isNumber(execid) && listeners[nodeid][type].hasOwnProperty(execid)) {
                node.removeEventListener(type, listeners[nodeid][type][execid][1], bub);
                delete listeners[nodeid][type][execid];
            }
        });
        return gobject;
    };

    gobject.on = function (type, executable, bub, arg) {
        let execid;
        let closedExecutable;

        if (!utils.isString(type) || !utils.isFunction(executable)) {
            return gobject;
        }
        bub = utils.isBoolean(bub)
            ? bub
            : false;
        execid = utils.isNumber(executable.ggid)
            ? executable.ggid
            : ggid();
        executable.ggid = execid;
        utils.each(store, function (node) {
            const nodeid = !utils.isNumber(global.parseInt(node.getAttribute("data-gg-id"), 10))
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
        if (!utils.isString(type) || !utils.isFunction(executable)) {
            return gobject;
        }
        bub = utils.isBoolean(bub)
            ? bub
            : false;
        utils.each(store, function (node) {
            node.addEventListener(type, handler(node, arg), bub);
        });
        return gobject;
    };

    gobject.parents = function () {
        const nodes = [];

        utils.each(store, function (node) {
            nodes.push(node.parentNode);
        });
        return gg(nodes);
    };

    gobject.prepend = function (value) {
        const willcopy = store.length > 1;

        if (utils.isString(value)) {
            value = gg(value);
        }
        utils.each(store, function (node) {
            utils.each(value, function (child) {
                if (!utils.isNode(child)) {
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
        const willcopy = utils.toArray(value).length > 1;

        if (utils.isString(value)) {
            value = gg(value);
        }
        utils.each(store, function (node) {
            utils.each(value, function (parent) {
                if (!utils.isNode(parent)) {
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
        const propname = utils.isString(name) && utils.toCamelCase(name);
        let values;

        if (utils.isObject(name)) {
            utils.each(name, function (value, key) {
                gobject.prop(key, value);
            });
        } else if (utils.isArray(name)) {
            values = {};
            name.forEach(function (key) {
                values[key] = gobject.prop(key);
            });
        } else if (utils.isUndefined(value) && propname) {
            values = [];
            utils.each(store, function (node) {
                values.push(node.style[propname] || global.getComputedStyle(node, null).getPropertyValue(propname));
            });
            values = values.length === 0
                ? null
                : values.length === 1
                    ? values[0]
                    : values;
        } else if (propname) {
            utils.each(store, function (node) {
                node.style[propname] = value;
            });
        }
        return utils.isUndefined(values)
            ? gobject
            : values;
    };
    gobject.css = gobject.prop;
    gobject.style = gobject.prop;

    gobject.raw = function (index) {
        if (utils.isNumber(index) && index >= 0 && index < store.length) {
            return store[index];
        }
        return store.length === 1
            ? store[0]
            : store;
    };

    gobject.remove = function (value) {
        if (utils.isUndefined(value)) {
            utils.each(store, function (node) {
                if (node.parentNode) {
                    node.parentNode.removeChild(node);
                }
            });
        } else {
            utils.each(store, function (node) {
                utils.each(value, function (child) {
                    if (!utils.isNode(child) || !node.contains(child)) {
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
        const attrname = utils.isString(name) && utils.toCamelCase(name);

        if (utils.isObject(name)) {
            utils.each(name, function (value, key) {
                gobject.remAttr(key);
            });
        } else if (utils.isArray(name)) {
            name.forEach(function (key) {
                gobject.remAttr(key);
            });
        } else if (attrname) {
            utils.each(store, function (node) {
                node.removeAttribute(attrname);
            });
        }
        return gobject;
    };

    gobject.remClass = function (value) {
        if (!utils.isString(value)) {
            return gobject;
        }
        utils.each(store, function (node) {
            value.split(/\s/).forEach(function (substring) {
                const match = new RegExp("(?:^|\\s)" + substring + "(?:$|\\s)", "g");

                if (!utils.isObject(node.className)) {
                    node.className = node.className.replace(match, " ").trim();
                } else {
                    node.classList.remove(substring);
                }
            });
        });
        return gobject;
    };

    gobject.remData = function (name) {
        const dataname = (utils.isString(name) && (name.length < 4 || name.slice(0, 4) !== "data"))
            ? utils.toHyphenated("data-" + name)
            : utils.toHyphenated(name);

        if (utils.isObject(name)) {
            utils.each(name, function (value, key) {
                gobject.remData(key);
            });
        } else if (utils.isArray(name)) {
            name.forEach(function (key) {
                gobject.remData(key);
            });
        } else if (dataname) {
            utils.each(store, function (node) {
                node.removeAttribute(dataname);
            });
        }
        return gobject;
    };

    gobject.remHtml = function () {
        utils.each(store, function (node) {
            node.innerHTML = "";
        });
        return gobject;
    };

    gobject.remProp = function (name) {
        const propname = utils.isString(name) && utils.toCamelCase(name);

        if (utils.isObject(name)) {
            utils.each(name, function (value, key) {
                gobject.remProp(key);
            });
        } else if (utils.isArray(name)) {
            name.forEach(function (key) {
                gobject.remProp(key);
            });
        } else if (propname) {
            utils.each(store, function (node) {
                node.style.removeProperty(propname);
            });
        }
        return gobject;
    };
    gobject.remCss = gobject.remProp;
    gobject.remStyle = gobject.remProp;

    gobject.remText = function remText() {
        utils.each(store, function (node) {
            node.textContent = "";
        });
        return gobject;
    };

    gobject.select = function (selector, supplanter) {
        let nodes = [];

        utils.each(store, function (node) {
            nodes = nodes.concat(utils.toArray(utils.select(selector, supplanter, node)));
        });
        return gg(nodes);
    };

    gobject.selectAll = function (selector, supplanter) {
        let nodes = [];

        utils.each(store, function (node) {
            nodes = nodes.concat(utils.toArray(utils.selectAll(selector, supplanter, node)));
        });
        return gg(nodes);
    };

    gobject.subtract = function (index) {
        if (utils.isNumber(index) && index >= 0 && index < store.length) {
            store.splice(index, 1);
        }
        return gobject;
    };

    gobject.text = function (value) {
        let values = [];

        if (utils.isUndefined(value)) {
            utils.each(store, function (node) {
                values.push(node.textContent);
            });
            values = values.length === 0
                ? null
                : values.length === 1
                    ? values[0]
                    : values;
        } else if (utils.isString(value) || utils.isNumber(value)) {
            utils.each(store, function (node) {
                node.textContent = value;
            });
        }
        return utils.isUndefined(value)
            ? values
            : gobject;
    };

    gobject.togClass = function (value) {
        if (!utils.isString(value)) {
            return gobject;
        }
        utils.each(store, function (node) {
            value.split(/\s/).forEach(function (substring) {
                const match = new RegExp("(?:^|\\s)" + substring + "(?:$|\\s)", "g");

                if (!utils.isObject(node.className)) {
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
    return utils.inArray(taglist, tag)
        ? gg(document.createElement(tag))
        : null;
}

// DEVICES
keyboardListener = (function () {
    const common = {
        "enter": 13,
        "left": 37,
        "up": 38,
        "right": 39,
        "down": 40
    };

    function keyDown(options, handlers) {
        return function (e) {
            const keycode = e.keyCode;

            if (options.preventDefault) {
                e.preventDefault();
            }
            if (utils.isNumber(keycode) && handlers.hasOwnProperty(keycode)) {
                handlers[keycode](e);
            }
        };
    }
    return function (options) {
        const handlers = {};
        let listener;

        options = utils.extend({}, options);
        utils.each(options, function (handler, key) {
            const keycode = utils.isString(key) && common.hasOwnProperty(key)
                ? common[key]
                : global.parseInt(key, 10);

            if (utils.isFunction(handler) && utils.isNumber(keycode)) {
                handlers[keycode] = handler;
            }
        });
        listener = keyDown(options, handlers);
        keyboardListeners.push(listener);
        gg(document.body).on("keydown", listener, false);
    };
}());

mouseListener = (function () {
    const common = {
        "left": 0,
        "middle": 1,
        "right": 2
    };

    function mouseDown(options, handlers) {
        return function (e) {
            const buttoncode = e.button;

            if (options.preventDefault) {
                e.preventDefault();
            }
            if (utils.isNumber(buttoncode) && handlers.hasOwnProperty(buttoncode)) {
                handlers[buttoncode](e);
            }
        };
    }
    return function (options) {
        const handlers = {};
        let listener;

        options = utils.extend({}, options);
        utils.each(options, function (handler, button) {
            const buttoncode = utils.isString(button) && common.hasOwnProperty(button)
                ? common[button]
                : global.parseInt(button, 10);

            if (utils.isFunction(handler) && utils.isNumber(buttoncode)) {
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

gg.create = create;
gg.keyboardListener = keyboardListener;
gg.mouseListener = mouseListener;
gg.removeKeyboardListeners = removeKeyboardListeners;
gg.removeMouseListeners = removeMouseListeners;
gg.ease = ease;
gg.utils = utils;
gg.emitter = emitter;
gg.betterview = betterview;
gg.cdb = cdb;

export default Object.freeze(gg);
