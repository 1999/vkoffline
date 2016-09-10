'use strict';

import assert from 'assert';
import {openMeta} from './idb';

const OBJ_STORE_NAME = 'keyvalues';

class Storage {
    // it's kinda like constructor but other modules need to know the moment
    // when storage is initialized
    async load() {
        const conn = await openMeta();
        const records = await conn.get(OBJ_STORE_NAME);

        console.log(records);
        this._data = records;
    }

    set(key, value) {
        this._checkIsInitialized();



        var storageData = {};
        storageData[key] = value;
        chrome.storage.local.set(storageData);

        this._data[key] = value;

        // this op should not block others so the function is still sync
        openConn().then(conn => conn.upsert(OBJ_STORE_NAME, {key, value}));
    }

    get(key, params) {
        this._checkIsInitialized();

        let value = this._data[key] || null;
        let valueCreated = false;

        params = params || {};
        params.constructor = params.constructor || String;
        params.strict = params.strict || false;
        params.create = params.create || false;

        if (value === null && params.create) {
            value = (params.constructor === String) ? '' : new params.constructor();
            valueCreated = true;
        }

        if (params.strict && params.constructor !== String && valueCreated === false) {
            // проверка на тип данных
            assert(value instanceof params.constructor, `Wrong storage data type of key "${key}"`);
        }

        return value;
    }

    remove(key) {
        this._checkIsInitialized();

        delete this._data[key];

        // this op should not block others so the function is still sync
        openConn().then(conn => conn.delete(OBJ_STORE_NAME, key));
    }

    _checkIsInitialized() {
        assert(this._initialized, 'Storage hasn\'t yet been initialized');
    }
}

export default Storage;
