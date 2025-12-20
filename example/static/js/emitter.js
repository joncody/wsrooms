"use strict";

const emitter = function (value) {
    const em = (
        (value && typeof value === "object")
        ? value
        : {}
    );
    const events = {};
    const api = Object.create(null);

    api.emit = function (type, ...args) {
        const list = events[type];
        if (!Array.isArray(list)) {
            return false;
        }
        list.forEach((fn) => {
            fn.apply(api, args);
        });
        return true;
    };

    api.addListener = function (type, listener) {
        if (typeof listener !== "function") {
            return api;
        }
        if (events.newListener) {
            api.emit(
                "newListener",
                type,
                (
                    typeof listener.listener === "function"
                    ? listener.listener
                    : listener
                )
            );
        }
        if (!events[type]) {
            events[type] = [listener];
        } else {
            events[type].push(listener);
        }
        return api;
    };
    api.on = api.addListener;

    api.removeListener = function (type, listener) {
        const list = events[type];
        if (!Array.isArray(list) || typeof listener !== "function") {
            return api;
        }
        const index = list.findIndex((v) => {
            return v === listener || (v.listener && v.listener === listener);
        });
        if (index >= 0) {
            list.splice(index, 1);
            if (list.length === 0) {
                delete events[type];
            }
            if (events.removeListener) {
                api.emit("removeListener", type, listener);
            }
        }
        return api;
    };
    api.off = api.removeListener;

    api.once = function (type, listener) {
        if (typeof listener !== "function") {
            return api;
        }
        const onetime = (...args) => {
            api.removeListener(type, onetime);
            listener.apply(api, args);
        };
        onetime.listener = listener;
        return api.on(type, onetime);
    };

    api.removeAllListeners = function (type) {
        if (!type) {
            if (!events.removeListener) {
                // Fast path: no removeListener events, delete all keys directly
                Object.keys(events).forEach((key) => delete events[key]);
            } else {
                Object.keys(events).forEach((key) => {
                    if (key !== "removeListener") {
                        api.removeAllListeners(key);
                    }
                });
                api.removeAllListeners("removeListener");
            }
            return api;
        }
        const list = events[type];
        if (Array.isArray(list)) {
            list.forEach((fn) => {
                api.removeListener(type, fn);
            });
        }
        return api;
    };

    api.listeners = function (type) {
        if (typeof type === "string") {
            return events[type] || [];
        }
        return Object.values(events).flat();
    };

    api.events = events;

    return Object.assign(em, api);
};

export default Object.freeze(emitter);
