'use strict';

import assert from 'assert';
import {resolve} from 'path';
import {v4 as uuid} from 'uuid';
import {appVersion} from '../remote';
import {openMeta} from '../idb';

const onMessageListeners = new Set;
const onInstalledListeners = new Set;
const waitingCallbacks = new Map;
const uiToSyncChannel = new BroadcastChannel('uiToSyncChannel');
const syncToUiChannel = new BroadcastChannel('syncToUiChannel');

let isUiWindow;

const checkIsInitialized = () => {
    assert(isUiWindow !== undefined, 'chrome.runtime API has not yet been initialized');
};

const sendMessage = (msg, responseCallback, messageId = uuid()) => {
    checkIsInitialized();

    const channelToSendDataTo = isUiWindow ? uiToSyncChannel : syncToUiChannel;

    if (responseCallback) {
        waitingCallbacks.set(messageId, responseCallback);
    }

    channelToSendDataTo.postMessage({
        id: messageId,
        body: msg
    });
};

const currySendResponse = (messageId) => {
    return (msg) => sendMessage(msg, null, messageId);
};

const init = async (_isUiWindow) => {
    isUiWindow = _isUiWindow;
    const channelListenTo = _isUiWindow ? syncToUiChannel : uiToSyncChannel;

    channelListenTo.onmessage = ({data}) => {
        // first check whether this is a response to send message
        if (waitingCallbacks.has(data.id)) {
            const responseCallback = waitingCallbacks.get(data.id);
            responseCallback(data.body);

            waitingCallbacks.delete(data.id);
            return;
        }

        /**
         * Every callback is invoked with three arguments:
         * @msg - message itself
         * @sender - an object with id equal to `null`
         * @sendResponse - callback to be invoked in response to incoming data
         */
        for (const cb in onMessageListeners) {
            cb(data.body, {id: null}, currySendResponse(data.id));
        }
    };

    // also update information about app version
    if (!_isUiWindow) {
        await updateAppVersionInfo();
    }
};

const updateAppVersionInfo = async () => {
    const conn = await openMeta();
    const records = await conn.get('meta', {range: IDBKeyRange.only('app_version')});

    const previousAppVersion = records.length ? records[0].value : null;
    const currentAppVersion = appVersion;

    await conn.upsert('meta', {key: 'app_version', value: currentAppVersion});

    if (previousAppVersion !== currentAppVersion) {
        for (let cb of onInstalledListeners) {
            cb({
                reason: previousAppVersion ? 'update' : 'install',
                previousVersion: previousAppVersion
            });
        }
    }

    onInstalledListeners.clear();
};

const getURL = (relativePath) => {
    // TODO: is there a better way not to use global?
    return resolve(`${global.__dirname}/../assets/${relativePath}`);
};

/**
 * sendMessage() sends data to sync window via BroadcastChannel API.
 * Every message has structure:
 * @id: string
 * @body: mixed - message itself
 *
 * Same works for communicating between sync and UI windows.
 * If responseCallback is supplied it's saved into the `waitingCallbacks` map
 */
const runtimeSendMessage = (msg, responseCallback) => sendMessage(msg, responseCallback);

const onMessage = {
    addListener(cb) {
        checkIsInitialized();
        onMessageListeners.add(cb);
    }
};

const onInstalled = {
    addListener(cb) {
        checkIsInitialized();
        onInstalledListeners.add(cb);
    }
};

export default {
    init,
    onMessage,
    getURL,
    onInstalled,
    sendMessage: runtimeSendMessage
}
