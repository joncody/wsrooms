"use strict";

const emitter = function (value) {
    const em = (
        (value && typeof value === "object")
        ? value
        : {}
    );
    const api = Object.create(null);

    api.events = {};
    api.addListener = function (type, listener) {
        if (typeof listener !== "function") {
            return api;
        }
        if (api.events.newListener) {
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
        if (!api.events[type]) {
            api.events[type] = [listener];
        } else {
            api.events[type].push(listener);
        }
        return api;
    };
    api.on = api.addListener;

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

    api.removeListener = function (type, listener) {
        const list = api.events[type];
        if (!Array.isArray(list) || typeof listener !== "function") {
            return api;
        }
        const index = list.findIndex((v) => {
            return v === listener || (v.listener && v.listener === listener);
        });
        if (index >= 0) {
            list.splice(index, 1);
            if (list.length === 0) {
                delete api.events[type];
            }
            if (api.events.removeListener) {
                api.emit("removeListener", type, listener);
            }
        }
        return api;
    };
    api.off = api.removeListener;

    api.removeAllListeners = function (type) {
        if (!type) {
            if (!api.events.removeListener) {
                // Fast path: no removeListener events, delete all keys directly
                Object.keys(api.events).forEach((key) => delete api.events[key]);
            } else {
                Object.keys(api.events).forEach((key) => {
                    if (key !== "removeListener") {
                        api.removeAllListeners(key);
                    }
                });
                api.removeAllListeners("removeListener");
            }
            return api;
        }
        const list = api.events[type];
        if (Array.isArray(list)) {
            list.forEach((fn) => {
                api.removeListener(type, fn);
            });
        }
        return api;
    };

    api.listeners = function (type) {
        if (typeof type === "string") {
            return api.events[type] || [];
        }
        return Object.values(api.events).flat();
    };

    api.emit = function (type, ...args) {
        const list = api.events[type];
        if (!Array.isArray(list)) {
            return false;
        }
        list.forEach((fn) => {
            fn.apply(api, args);
        });
        return true;
    };

    return Object.assign(em, api);
};

export default Object.freeze(emitter);
