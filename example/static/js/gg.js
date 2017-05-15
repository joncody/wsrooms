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
    'use strict';

    var xhrReq,
        readFiles = !!global.FileReader,
        mouseHandler,
        keyboardHandler,
        listeners = {},
        ggId = (function () {
            var id = 0,
                maxint = Math.pow(2, 53) - 1;

            return function () {
                return id < maxint ? id += 1 : id = 1;
            };
        }()),
        taglist = [
            'a',
            'abbr',
            'address',
            'area',
            'article',
            'aside',
            'audio',
            'b',
            'base',
            'bdo',
            'blockquote',
            'body',
            'br',
            'button',
            'canvas',
            'caption',
            'cite',
            'code',
            'col',
            'colgroup',
            'dd',
            'del',
            'dfn',
            'div',
            'dl',
            'dt',
            'em',
            'embed',
            'fieldset',
            'figcaption',
            'figure',
            'footer',
            'form',
            'h1',
            'h2',
            'h3',
            'h4',
            'h5',
            'h6',
            'head',
            'header',
            'hr',
            'i',
            'iframe',
            'img',
            'input',
            'ins',
            'kbd',
            'label',
            'legend',
            'li',
            'link',
            'map',
            'mark',
            'meta',
            'nav',
            'noscript',
            'object',
            'ol',
            'optgroup',
            'option',
            'p',
            'param',
            'pre',
            'progress',
            'q',
            'rp',
            'rt',
            'ruby',
            's',
            'samp',
            'script',
            'section',
            'select',
            'small',
            'source',
            'span',
            'strong',
            'style',
            'sub',
            'sup',
            'table',
            'tbody',
            'td',
            'textarea',
            'tfoot',
            'th',
            'thead',
            'time',
            'title',
            'tr',
            'track',
            'u',
            'ul',
            'var',
            'video'
        ];

    function typeOf(value) {
        var type = typeof value;

        if (type === 'object') {
            if (Array.isArray(value)) {
                type = 'array';
            } else if (!value) {
                type = 'null';
            }
        }
        return type;
    }

    function noop() {
        return;
    }

    function arrSlice(value) {
        return Array.prototype.slice.call(value);
    }

    function isBoolean(boolean) {
        return typeOf(boolean) === 'boolean';
    }

    function isNumber(number) {
        return typeOf(number) === 'number' && !global.isNaN(number);
    }

    function isString(string) {
        return typeOf(string) === 'string';
    }

    function isArray(array) {
        return typeOf(array) === 'array';
    }

    function isObject(object) {
        return typeOf(object) === 'object';
    }

    function isFunction(func) {
        return typeOf(func) === 'function';
    }

    function isNull(nul) {
        return typeOf(nul) === 'null';
    }

    function isUndefined(undef) {
        return typeOf(undef) === 'undefined';
    }

    function isArrayLike(object) {
        return isObject(object) && !isUndefined(object.length) && Object.keys(object).every(function (key) {
            return key === 'length' || isNumber(global.parseInt(key, 10));
        });
    }

    function isTypedArray(array) {
        var types = [
                'Int8Array',
                'Uint8Array',
                'Uint8ClampedArray',
                'Int16Array',
                'Uint16Array',
                'Int32Array',
                'Uint32Array',
                'Float32Array',
                'Float64Array'
            ],
            type = Object.prototype.toString.call(array).replace(/\[object\s(\w+)\]/, '$1');

        return types.indexOf(type) > -1;
    }

    function isBuffer(buffer) {
        return !!global.ArrayBuffer && buffer instanceof ArrayBuffer;
    }

    function isNode(node) {
        return isObject(node) && isString(node.nodeName) && isNumber(node.nodeType);
    }

    function isEmpty(object) {
        return isObject(object) && Object.keys(object).length === 0;
    }

    function toArray(value) {
        var array = [];

        if (isBuffer(value)) {
            array = new Uint8Array(value);
        }
        if (isString(value) || isArray(value) || isArrayLike(value) || isTypedArray(value)) {
            array = arrSlice(value);
        } else if (isBoolean(value) || isNumber(value) || isFunction(value) || isObject(value)) {
            array = [value];
        }
        return array;
    }

    function toUint8(value) {
        if (isTypedArray(value) || isArray(value) || isBuffer(value) || isNumber(value)) {
            value = new Uint8Array(value);
        } else if (isString(value)) {
            value = new Uint8Array(getCodesFromString(value));
        } else {
            value = new Uint8Array(0);
        }
        return value;
    }

    function toBuffer(buffer) {
        return toUint8(buffer).buffer;
    }

    function inArray(value, array) {
        return isArray(array) && array.indexOf(value) > -1;
    }

    function toCamelCase(string) {
        return isString(string) && string.replace(/-([a-z])/g, function (a) {
            return a[1].toUpperCase();
        });
    }

    function undoCamelCase(string) {
        return isString(string) && string.replace(/([A-Z])/g, function (a) {
            return '-' + a.toLowerCase();
        });
    }

    function getCodesFromString(string) {
        var codes = [];

        toArray(string).forEach(function (char) {
            codes.push(char.charCodeAt(0));
        });
        return codes;
    }

    function getStringFromCodes(codes) {
        var string = '';

        toArray(codes).forEach(function (char) {
            string += String.fromCharCode(char);
        });
        return string;
    }

    function uuid() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (a) {
            var rand = Math.random() * 16 | 0,
                value = a === 'x' ? rand : rand & 0x3 | 0x8;

            return value.toString(16);
        });
    }

    function supplant(string, object) {
        function replace(a, b) {
            var value = object[b];

            return !isUndefined(value) ? value : a;
        }
        return isString(string) && isObject(object) ? string.replace(/\{([^{}]*)\}/g, replace) : string;
    }

    function inherits(ctor, superCtor) {
        if (isFunction(ctor) && isFunction(superCtor)) {
            ctor.ggSuper = superCtor;
            ctor.prototype = Object.create(superCtor.prototype, {
                constructor: {
                    value: ctor,
                    enumberable: false,
                    writable: true,
                    configurable: true
                }
            });
        }
        return ctor;
    }

    function each(items, func, thisarg) {
        if (isUndefined(thisarg)) {
            thisarg = items;
        }
        if (items && isFunction(func)) {
            if (isNode(items)) {
                func.call(thisarg, items, 0, items);
            } else if (isArrayLike(items)) {
                toArray(items).forEach(func, thisarg);
            } else if (isArray(items)) {
                items.forEach(func, thisarg);
            } else if (isObject(items)) {
                if (items.gg === true) {
                    items.each(func);
                } else {
                    Object.keys(items).forEach(function (key) {
                        func.call(thisarg, items[key], key, items);
                    });
                }
            }
        }
        return thisarg;
    }

    function extend(object, add, overwrite) {
        overwrite = isBoolean(overwrite) ? overwrite : true;
        if (isObject(object) && isObject(add)) {
            each(add, function (value, key) {
                if (overwrite || !object.hasOwnProperty(key)) {
                    object[key] = value;
                }
            });
        }
        return object;
    }

    function closure(func, node, arg) {
        return function (e) {
            return func.call(null, e, gg(node), arg);
        };
    }

    function cloneNodeDeeper(node) {
        var nodeid,
            cloneid,
            clone;

        if (isObject(node) && node.gg === true && node.length() === 1) {
            node = node.getRaw();
        }
        if (isNode(node)) {
            nodeid = global.parseInt(node.getAttribute('data-gg-id'), 10);
        }
        clone = node.cloneNode(true);
        cloneid = ggId();
        clone.setAttribute('data-gg-id', cloneid);
        if (isNumber(nodeid) && listeners.hasOwnProperty(nodeid)) {
            listeners[cloneid] = {};
            each(listeners[nodeid], function (list, type) {
                listeners[cloneid][type] = {};
                each(list, function (funcarray, funcid) {
                    var func = funcarray[0],
                        bub = funcarray[2],
                        arg = funcarray[3],
                        newFunc = closure(func, clone, arg);

                    listeners[cloneid][type][funcid] = [func, newFunc, bub, arg];
                    clone.addEventListener(type, newFunc, bub);
                });
            });
        }
        return clone;
    }

    function getById(id, object) {
        id = supplant(id, object);
        return document.getElementById(id);
    }

    function select(selector, object, node) {
        selector = supplant(selector, object);
        return isNode(node) ? node.querySelector(selector) : document.querySelector(selector);
    }

    function selectAll(selector, object, node) {
        selector = supplant(selector, object);
        return isNode(node) ? node.querySelectorAll(selector) : document.querySelectorAll(selector);
    }

    function gg(selector, object) {
        var gobject = {
                gg: true
            },
            prestore = [],
            store = [];

        if (selector && isString(selector)) {
            prestore = selectAll(selector, object);
        } else if (isNode(selector) || isArray(selector) || isArrayLike(selector) || isObject(selector)) {
            if (selector.gg === true) {
                return selector;
            }
            prestore = selector;
        }
        each(prestore, function (node, index) {
            if (isNode(node) && node.nodeType < 9) {
                store.push(node);
            }
        });

        gobject.get = function (index) {
            if (!isNumber(index) || index < 0 || index > store.length) {
                return gg(store);
            }
            return gg(store[index]);
        };

        gobject.getRaw = function (index) {
            if (!isNumber(index) || index < 0 || index > store.length) {
                return store;
            }
            return store[index];
        };

        gobject.length = function () {
            return store.length;
        };

        gobject.each = function (func) {
            store.forEach(func, gobject);
            return gobject;
        };

        gobject.add = function (nodes) {
            each(nodes, function (node) {
                if (isNode(node)) {
                    store.push(node);
                }
            });
            return gobject;
        };

        gobject.subtract = function (index) {
            if (!isNumber(index) || index < 0 || index > store.length) {
                return gobject;
            }
            store.splice(index, 1);
            return gobject;
        };

        gobject.data = function (name, value) {
            var dataname,
                values;

            if (name && isString(name)) {
                dataname = name.length < 4 || name.slice(0, 4) !== 'data' ? undoCamelCase('data-' + name) : undoCamelCase(name);
                if (isUndefined(value)) {
                    values = [];
                    gobject.each(function (node) {
                        values.push(node.getAttribute(dataname));
                    });
                    if (values.length === 0) {
                        return;
                    } else {
                        return values.length === 1 ? values[0] : values;
                    }
                }
                gobject.each(function (node) {
                    node.setAttribute(dataname, value);
                });
            }
            if (isObject(name)) {
                each(name, function (value, key) {
                    gobject.data(key, value);
                });
            }
            if (isArray(name)) {
                values = {};
                name.forEach(function (key) {
                    values[key] = gobject.data(key);
                });
                return values;
            }
            return gobject;
        };

        gobject.remData = function (name) {
            var dataname;

            if (name && isString(name)) {
                dataname = name.length < 4 || name.slice(0, 4) !== 'data' ? undoCamelCase('data-' + name) : undoCamelCase(name);
                gobject.each(function (node) {
                    node.removeAttribute(dataname);
                });
            } else if (isArray(name)) {
                name.forEach(function (key) {
                    gobject.remData(key);
                });
            }
            return gobject;
        };

        gobject.attr = function (name, value) {
            var attrname,
                values;

            if (name && isString(name)) {
                attrname = toCamelCase(name);
                if (isUndefined(value)) {
                    values = [];
                    gobject.each(function (node) {
                        values.push(node[attrname]);
                    });
                    if (values.length === 0) {
                        return;
                    } else {
                        return values.length === 1 ? values[0] : values;
                    }
                }
                gobject.each(function (node) {
                    node[attrname] = value;
                });
            }
            if (isObject(name)) {
                each(name, function (value, key) {
                    gobject.attr(key, value);
                });
            }
            if (isArray(name)) {
                values = {};
                name.forEach(function (key) {
                    values[key] = gobject.attr(key);
                });
                return values;
            }
            return gobject;
        };

        gobject.remAttr = function (name) {
            var attrname;

            if (name && isString(name)) {
                attrname = toCamelCase(name);
                gobject.each(function (node) {
                    node.removeAttribute(attrname);
                });
            } else if (isArray(name)) {
                name.forEach(function (key) {
                    gobject.remAttr(key);
                });
            }
            return gobject;
        };

        gobject.prop = function (name, value) {
            var propname,
                values;

            if (name && isString(name)) {
                propname = toCamelCase(name);
                if (isUndefined(value)) {
                    values = [];
                    gobject.each(function (node) {
                        values.push(node.style[propname] || global.getComputedStyle(node, null).getPropertyValue(propname));
                    });
                    if (values.length === 0) {
                        return;
                    } else {
                        return values.length === 1 ? values[0] : values;
                    }
                }
                gobject.each(function (node) {
                    if (isNumber(value)) {
                        value = value + 'px';
                    }
                    node.style[propname] = value;
                });
            }
            if (isObject(name)) {
                Object.keys(name).forEach(function (key) {
                    gobject.prop(key, name[key]);
                });
            }
            if (isArray(name)) {
                values = {};
                name.forEach(function (key) {
                    values[key] = gobject.prop(key);
                });
                return values;
            }
            return gobject;
        };
        gobject.css = gobject.prop;
        gobject.style = gobject.prop;

        gobject.remProp = function (name) {
            var propname;

            if (name && isString(name)) {
                propname = toCamelCase(name);
                gobject.each(function (node) {
                    node.style.removeProperty(propname);
                });
            } else if (isArray(name)) {
                name.forEach(function (key) {
                    gobject.remProp(key);
                });
            }
            return gobject;
        };
        gobject.remCss = gobject.remProp;
        gobject.remStyle = gobject.remProp;

        gobject.text = function (string) {
            var values = [];

            if (isUndefined(string)) {
                gobject.each(function (node) {
                    values.push(node.textContent);
                });
                if (values.length === 0) {
                    return;
                } else {
                    return values.length === 1 ? values[0] : values;
                }
            }
            gobject.each(function (node) {
                if (isString(string) || isNumber(string)) {
                    node.textContent = string;
                }
            });
        };

        gobject.remText = function remText() {
            return gobject.each(function (node) {
                node.textContent = '';
            });
        };

        gobject.html = function (string) {
            var values = [];

            if (isUndefined(string)) {
                gobject.each(function (node) {
                    values.push(node.innerHTML);
                });
                if (values.length === 0) {
                    return;
                } else {
                    return values.length === 1 ? values[0] : values;
                }
            }
            return gobject.each(function (node) {
                if (isString(string) || isNumber(string)) {
                    node.innerHTML = string;
                }
            });
        };

        gobject.remHtml = function () {
            return gobject.each(function (node) {
                node.innerHTML = '';
            });
        };

        gobject.classes = function (string) {
            var values = [];

            if (isUndefined(string)) {
                gobject.each(function (node) {
                    values.push(node.className);
                });
                if (values.length === 0) {
                    return;
                } else {
                    return values.length === 1 ? values[0] : values;
                }
            }
            return gobject.each(function (node) {
                if (isString(string)) {
                    node.className = string.trim();
                }
            });
        };

        gobject.addClass = function (string) {
            if (string && isString(string)) {
                gobject.each(function (node) {
                    string.split(/\s/).forEach(function (cls) {
                        var regex = new RegExp('(?:^|\\s)' + cls + '(?:$|\\s)', 'g');

                        if (!regex.test(node.className)) {
                            node.className = node.className ? node.className + ' ' + cls : cls;
                        }
                    });
                });
            }
            return gobject;
        };

        gobject.remClass = function (string) {
            if (string && isString(string)) {
                gobject.each(function (node) {
                    string.split(/\s/).forEach(function (cls) {
                        var regex = new RegExp('(?:^|\\s)' + cls + '(?:$|\\s)', 'g');

                        node.className = node.className.replace(regex, ' ').trim();
                    });
                });
            }
            return gobject;
        };

        gobject.togClass = function (string) {
            if (string && isString(string)) {
                gobject.each(function (node) {
                    string.split(/\s/).forEach(function (cls) {
                        var regex = new RegExp('(?:^|\\s)' + cls + '(?:$|\\s)', 'g');

                        if (!regex.test(node.className)) {
                            node.className = node.className ? node.className + ' ' + cls : cls;
                        } else {
                            node.className = node.className.replace(regex, ' ').trim();
                        }
                    });
                });
            }
            return gobject;
        };

        gobject.hasClass = function (string) {
            var values = [];

            if (string && isString(string)) {
                gobject.each(function (node) {
                    values.push(string.split(/\s/).every(function (cls) {
                        var regex = new RegExp('(?:^|\\s)' + cls + '(?:$|\\s)', 'g');

                        return regex.test(node.className);
                    }));
                });
            }
            if (values.length === 0) {
                return;
            } else {
                return values.length === 1 ? values[0] : values;
            }
        };

        gobject.insert = (function () {
            var positions = ['beforebegin', 'afterbegin', 'beforeend', 'afterend'];

            return function (pos, item) {
                if (item && isString(item)) {
                    if (!inArray(pos, positions)) {
                        pos = 'beforeend';
                    }
                    gobject.each(function (node) {
                        node.insertAdjacentHTML(pos, item);
                    });
                }
                return gobject;
            };
        }());

        gobject.prepend = function (item) {
            var copy = store.length > 1;

            return gobject.each(function (node) {
                each(item, function (child) {
                    if (isNode(child)) {
                        node.insertBefore(copy ? cloneNodeDeeper(child) : child, node.firstChild);
                    }
                });
            });
        };

        gobject.prependTo = function (parent) {
            var copy = isArray(toArray(parent)) && toArray(parent).length > 1;

            return gobject.each(function (node) {
                each(parent, function (par) {
                    if (isNode(par)) {
                        par.insertBefore(copy ? cloneNodeDeeper(node) : node, par.firstChild);
                    }
                });
            });
        };

        gobject.append = function (item) {
            var copy = store.length > 1;

            return gobject.each(function (node) {
                each(item, function (child) {
                    if (isNode(child)) {
                        node.appendChild(copy ? cloneNodeDeeper(child) : child);
                    }
                });
            });
        };

        gobject.appendTo = function (parent) {
            var copy = isArray(toArray(parent)) && toArray(parent).length > 1;

            return gobject.each(function (node) {
                each(parent, function (par) {
                    if (isNode(par)) {
                        par.appendChild(copy ? cloneNodeDeeper(node) : node);
                    }
                });
            });
        };

        gobject.after = function (item) {
            var copy = store.length > 1;

            return gobject.each(function (node) {
                each(item, function (sibling) {
                    if (isNode(sibling)) {
                        node.parentNode.insertBefore(copy ? cloneNodeDeeper(sibling) : sibling, node.nextSibling);
                    }
                });
            });
        };

        gobject.before = function (item) {
            var copy = store.length > 1;

            return gobject.each(function (node) {
                each(item, function (sibling) {
                    if (isNode(sibling)) {
                        node.parentNode.insertBefore(copy ? cloneNodeDeeper(sibling) : sibling, node);
                    }
                });
            });
        };

        gobject.remove = function (children) {
            if (isUndefined(children)) {
                gobject.each(function (node) {
                    node.parentNode.removeChild(node);
                });
            } else {
                gobject.each(function (node) {
                    each(children, function (child) {
                        if (isNode(child) && node.contains(child)) {
                            node.removeChild(child);
                        }
                    });
                });
            }
            return gobject;
        };

        gobject.parents = function () {
            var nodes = [];

            gobject.each(function (node) {
                nodes.push(node.parentNode);
            });
            return gg(nodes);
        };

        gobject.children = function () {
            var nodes = [];

            gobject.each(function (node) {
                nodes = nodes.concat(toArray(node.childNodes));
            });
            return gg(nodes);
        };


        gobject.select = function (selector, object) {
            var nodes = [];

            gobject.each(function (node) {
                nodes = nodes.concat(toArray(select(selector, object, node)));
            });
            return gg(nodes);
        };

        gobject.selectAll = function (selector, object) {
            var nodes = [];

            gobject.each(function (node) {
                nodes = nodes.concat(toArray(selectAll(selector, object, node)));
            });
            return gg(nodes);
        };

        gobject.clone = function (deep, deeper) {
            var nodes = [];

            deep = isBoolean(deep) ? deep : false;
            deeper = isBoolean(deeper) ? deeper : false;
            gobject.each(function (node) {
                nodes.push(deeper ? cloneNodeDeeper(node) : node.cloneNode(deep));
            });
            return gg(nodes);
        };

        gobject.hide = function () {
            return gobject.each(function (node) {
                node.setAttribute('data-default-display-value', node.style.display);
                node.style.display = 'none';
            });
        };

        gobject.show = function () {
            return gobject.each(function (node) {
                node.style.display = node.getAttribute('data-default-display-value') || 'initial';
                node.removeAttribute('data-default-display-value');
            });
        };

        gobject.create = function (tag) {
            var element;

            if (inArray(tag, taglist)) {
                element = document.createElement(tag);
                gobject.append(element);
            }
            return element === undefined ? gobject : gg(element);
        };

        gobject.on = function (type, func, bub, arg) {
            var funcid,
                newFunc;

            if (type && isString(type) && isFunction(func)) {
                bub = isBoolean(bub) ? bub : false;
                funcid = func.ggid;
                if (!isNumber(funcid)) {
                    funcid = ggId();
                    func.ggid = funcid;
                }
                gobject.each(function (node) {
                    var nodeid = global.parseInt(node.getAttribute('data-gg-id'), 10);

                    if (!isNumber(nodeid)) {
                        nodeid = ggId();
                        node.setAttribute('data-gg-id', nodeid);
                    }
                    if (!listeners.hasOwnProperty(nodeid)) {
                        listeners[nodeid] = {};
                    }
                    if (!listeners[nodeid].hasOwnProperty(type)) {
                        listeners[nodeid][type] = {};
                    }
                    newFunc = closure(func, node, arg);
                    listeners[nodeid][type][funcid] = [func, newFunc, bub, arg];
                    node.addEventListener(type, newFunc, bub);
                });
            }
            return gobject;
        };

        gobject.off = function (type, func, bub) {
            var funcid = isFunction(func) && func.ggid;

            if (type && isString(type)) {
                bub = isBoolean(bub) ? bub : false;
                gobject.each(function (node) {
                    var nodeid = global.parseInt(node.getAttribute('data-gg-id'), 10);

                    if (isNumber(nodeid) && listeners.hasOwnProperty(nodeid) && listeners[nodeid].hasOwnProperty(type)) {
                        if (!isNumber(funcid)) {
                            each(listeners[nodeid][type], function (funcarray, funcid, list) {
                                node.removeEventListener(type, funcarray[1], bub);
                                delete list[funcid];
                            });
                            delete listeners[nodeid][type];
                        } else if (listeners[nodeid][type].hasOwnProperty(funcid)) {
                            node.removeEventListener(type, listeners[nodeid][type][funcid][1], bub);
                            delete listeners[nodeid][type][funcid];
                        }
                    }
                });
            }
            return gobject;
        };

        gobject.once = function (type, func, bub, arg) {
            function handler(node, arg) {
                return function onetime(e) {
                    func.call(null, e, gg(node), arg);
                    node.removeEventListener(type, onetime, bub);
                };
            }
            if (type && isString(type) && isFunction(func)) {
                bub = isBoolean(bub) ? bub : false;
                gobject.each(function (node) {
                    node.addEventListener(type, handler(node, arg), bub);
                });
            }
            return gobject;
        };

        return Object.freeze(gobject);
    }

// options = {
//     keyCode: function
// };
    keyboardHandler = (function () {
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

            options = isObject(options) ? options : {};
            each(options, function (handler, key) {
                var keycode = parseInt(key, 10);

                if (isFunction(handler) && isNumber(keycode)) {
                    handlers[keycode] = handler;
                }
            });
            gg(document.body).on('keydown', keyDown(options, handlers), false);
        };
    }());

// options = {
//     keyCode: function
// };
    mouseHandler = (function () {
        function mouseDown(options, handlers) {
            return function (e) {
                var keycode = e.button;

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

            options = isObject(options) ? options : {};
            each(options, function (handler, key) {
                var keycode = parseInt(key, 10);

                if (isFunction(handler) && isNumber(keycode)) {
                    handlers[keycode] = handler;
                }
            });
            gg(document.body).on('mousedown', mouseDown(options, handlers), false);
        };
    }());

// options = {
//     data: data,
//     method: post || get,
//     url: url,
//     async: true || false,
//     username: username,
//     password: password,
//     mimeType: regexp,
//     responseType: arraybuffer || blob || document || json || text || empty string,
//     headers: object,
//     timeout: number,
//     success: function,
//     failure: function,
//     [on]loadstart: function,
//     [on]progress: function,
//     [on]load: function,
//     [on]loadend: function,
//     [on]readystatechange: function,
//     [on]timeout: function,
//     [on]error: function,
//     [on]abort: function
// };
    xhrReq = (function () {
        var responseTypes = [
                '',
                'arraybuffer',
                'blob',
                'document',
                'json',
                'text'
            ],
            forbiddenHeaders = [
                'accept-charset',
                'accept-encoding',
                'access-control-request-headers',
                'access-control-request-method',
                'connection',
                'content-length',
                'cookie',
                'cookie2',
                'date',
                'dnt',
                'expect',
                'host',
                'keep-alive',
                'origin',
                'referer',
                'te',
                'trailer',
                'transfer-encoding',
                'upgrade',
                'user-agent',
                'via'
            ],
            callback = function (options, xhr, type) {
                return function (e) {
                    if (isFunction(options[type])) {
                        options[type](e, xhr);
                    } else if (isFunction(options['on' + type])) {
                        options['on' + type](e, xhr);
                    }
                    if (type === 'readystatechange') {
                        if (xhr.readyState === 2) {
                            xhr.responseHeaders = xhr.getAllResponseHeaders();
                        } else if (xhr.readyState === 4 && (xhr.status >= 200 && xhr.status < 300)) {
                            options.success(e, xhr, xhr.response);
                        } else if (xhr.readyState === 4 && xhr.status >= 300) {
                            options.failure(e, xhr);
                        }
                    } else if (type === 'abort' || type === 'error' || type === 'timeout') {
                        options.failure(e, xhr);
                    }
                };
            };

        return function (options) {
            var xhr;

            options = isObject(options) ? options : {};
            options.data = options.data || '';
            options.method = isString(options.method) ? options.method : 'GET';
            options.url = isString(options.url) ? options.url : global.location.href;
            options.async = isBoolean(options.async) ? options.async : true;
            options.username = isString(options.username) ? options.username : null;
            options.password = isString(options.password) ? options.password : null;
            options.mimeType = isString(options.mimeType) ? options.mimeType : null;
            options.responseType = isString(options.responseType) ? options.responseType : '';
            options.headers = isObject(options.headers) ? options.headers : {};
            options.timeout = isNumber(options.timeout) ? options.timeout : 0;
            options.success = isFunction(options.success) ? options.success : noop;
            options.failure = isFunction(options.failure) ? options.failure : noop;
            options.crossOrigin = !new RegExp(global.location.hostname).test(options.url);
            if (!options.crossOrigin && !options.headers['X-Requested-With']) {
                options.headers['X-Requested-With'] = 'XMLHttpRequest';
            }
            xhr = new XMLHttpRequest();
            xhr.open(options.method, options.url, options.async, options.username, options.password);
            each(options.headers, function (value, key) {
                if (!inArray(key.toLowerCase(), forbiddenHeaders)) {
                    xhr.setRequestHeader(key, value);
                }
            });
            if (options.crossOrigin && options.username && options.password) {
                xhr.withCredentials = true;
            }
            if (options.mimeType && xhr.overrideMimeType) {
                xhr.overrideMimeType(options.mimeType);
            }
            if (options.responseType && inArray(options.responseType, responseTypes)) {
                xhr.responseType = options.responseType;
            }
            xhr.timeout = options.timeout;
            xhr.onreadystatechange = callback(options, xhr, 'readystatechange');
            xhr.onloadstart = callback(options, xhr, 'loadstart');
            if (options.method.toUpperCase() === 'POST') {
                xhr.upload.onprogress = callback(options, xhr, 'progress');
            } else {
                xhr.onprogress = callback(options, xhr, 'progress');
            }
            xhr.onload = callback(options, xhr, 'load');
            xhr.onloadend = callback(options, xhr, 'loadend');
            xhr.onerror = callback(options, xhr, 'error');
            xhr.onabort = callback(options, xhr, 'abort');
            xhr.ontimeout = callback(options, xhr, 'timeout');
            xhr.send(options.data);
        };
    }());

// options = {
//     element: input,
//     readAs: arraybuffer || binary || blob || dataurl || text,
//     mimeType: regexp,
//     success: function,
//     failure: function,
//     [on]loadstart: function,
//     [on]progress: function,
//     [on]load: function,
//     [on]loadend: function,
//     [on]error: function,
//     [on]abort: function
// };
    readFiles = readFiles ? (function () {
        var binary_support = !!global.FileReader.prototype.readAsBinaryString,
            readers = [],
            typeMap = {
                arraybuffer: 'readAsArrayBuffer',
                binary: binary_support ? 'readAsBinaryString' : 'readAsArrayBuffer',
                blob: 'readAsArrayBuffer',
                dataurl: 'readAsDataURL',
                text: 'readAsText'
            },
            callback = function (options, filereader, file, type) {
                return function (e) {
                    if (isFunction(options[type])) {
                        options[type](e, filereader, file);
                    } else if (isFunction(options['on' + type])) {
                        options['on' + type](e, filereader, file);
                    }
                    if (type === 'error' || type === 'abort') {
                        options.failure(e, filereader, file);
                    } else if (type === 'loadend' && (e.target.readyState === 2 || filereader.readyState === 2)) {
                        options.success(e, filereader, file, e.target.result || filereader.result);
                    }
                };
            },
            onFileSelect = function (options) {
                return function (e) {
                    each(e.target.files || options.element.files, function (file) {
                        var filereader;

                        if (file.type.match(options.mimeType)) {
                            filereader = new FileReader();
                            filereader.onloadstart = callback(options, filereader, file, 'loadstart');
                            filereader.onprogress = callback(options, filereader, file, 'progress');
                            filereader.onload = callback(options, filereader, file, 'load');
                            filereader.onloadend = callback(options, filereader, file, 'loadend');
                            filereader.onerror = callback(options, filereader, file, 'error');
                            filereader.onabort = callback(options, filereader, file, 'abort');
                            filereader[options.readAs](file);
                        }
                    });
                };
            };

        return function (options) {
            options = isObject(options) ? options : {};
            options.element = isNode(options.element) ? options.element : null;
            options.readAs = isString(options.readAs) && typeMap.hasOwnProperty(options.readAs.toLowerCase()) ? typeMap[options.readAs.toLowerCase()] : typeMap.blob;
            options.mimeType = isString(options.mimeType) ? options.mimeType : '.*';
            options.success = isFunction(options.success) ? options.success : noop;
            options.failure = isFunction(options.failure) ? options.failure : noop;
            if (options.element && options.element.nodeName === 'INPUT' && options.element.type === 'file') {
                options.element.addEventListener('change', onFileSelect(options), false);
            }
        };
    }()) : noop;

    function create(tag) {
        var element;

        if (inArray(tag, taglist)) {
            element = document.createElement(tag);
            return gg(element);
        }
    }

    gg.typeOf = typeOf;
    gg.noop = noop;
    gg.arrSlice = arrSlice;
    gg.isBoolean = isBoolean;
    gg.isNumber = isNumber;
    gg.isString = isString;
    gg.isArray = isArray;
    gg.isObject = isObject;
    gg.isFunction = isFunction;
    gg.isNull = isNull;
    gg.isUndefined = isUndefined;
    gg.isArrayLike = isArrayLike;
    gg.isTypedArray = isTypedArray;
    gg.isBuffer = isBuffer;
    gg.isNode = isNode;
    gg.isEmpty = isEmpty;
    gg.toArray = toArray;
    gg.toUint8 = toUint8;
    gg.toBuffer = toBuffer;
    gg.inArray = inArray;
    gg.toCamelCase = toCamelCase;
    gg.undoCamelCase = undoCamelCase;
    gg.getCodesFromString = getCodesFromString;
    gg.getStringFromCodes = getStringFromCodes;
    gg.uuid = uuid;
    gg.supplant = supplant;
    gg.inherits = inherits;
    gg.each = each;
    gg.extend = extend;
    gg.cloneNodeDeeper = cloneNodeDeeper;
    gg.getById = getById;
    gg.select = select;
    gg.selectAll = selectAll;
    gg.keyboardHandler = keyboardHandler;
    gg.mouseHandler = mouseHandler;
    gg.xhrReq = xhrReq;
    gg.readFiles = readFiles;
    gg.create = create;

    global.gg = Object.freeze(gg);

}(window || this));
