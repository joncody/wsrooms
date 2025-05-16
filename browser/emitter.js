"use strict";

export default function emitter(value) {
    const em = (value && typeof value === "object")
        ? value
        : {};
    em.emitter = true;
    em.events = {};

    em.addListener = function (type, listener) {
        const list = em.events[type];

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
        const list = em.events[type];
        let position = -1;

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
        let list;

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
        const list = [];

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
        const list = em.events[type];
        let emitted = false;
        let args;

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
