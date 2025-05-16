"use strict";

import emitter from "./emitter.js";
import utils from "./utils.js";

const global = globalThis || window || this;
const indexedDB = global.indexedDB || global.mozIndexedDB || global.webkitIndexedDB || global.msIndexedDB;
const cdb = emitter();

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
            const tableobj = db.createObjectStore(table, options);

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
        const db = e.target.result;

        db.onerror = dbError;
        executable(e, cdbDatabase(db));
    };
}

function dbOpen(name, version, executable) {
    let request;

    if (utils.typeOf(executable) !== "function") {
        executable = utils.typeOf(version) === "function"
            ? version
            : utils.noop;
    }
    if (utils.typeOf(version) !== "number") {
        version = 1;
    }
    request = indexedDB.open(name, version);
    request.onerror = dbError;
    request.onsuccess = dbOpenSuccess;
    request.onupgradeneeded = dbUpgrade(executable);
};

function dbDelete(name) {
    const request = indexedDB.deleteDatabase(name);

    request.onerror = dbError;
    request.onsuccess = dbDeleteSuccess;
};

function dbOpenSuccess(e) {
    const req = e.target;
    const db = req.result;

    db.onerror = dbError;
    cdb.emit("open", e, cdbRequest(req, db));
}

export default Object.freeze(utils.extend(cdb, {
    open: indexedDB ? dbOpen : () => cdb.emit("error", "IndexedDB not supported."),
    delete: indexedDB ? dbDelete : () => cdb.emit("error", "IndexedDB not supported.")
}));
