'use strict';

import assert from 'assert';
import {resolve} from 'path';
import {v4 as uuid} from 'uuid';

const onMessageListeners = new Set;
const onInstalledListeners = new Set;
const waitingCallbacks = new Map;
const uiToSyncChannel = new BroadcastChannel('uiToSyncChannel');
const syncToUiChannel = new BroadcastChannel('syncToUiChannel');

let isUiWindow;

const sendMessage = (msg, responseCallback, messageId = uuid()) => {
    assert(isUiWindow !== undefined, 'chrome.runtime API has not yet been initialized');

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

const init = (_isUiWindow) => {
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
};

const getURL = (relativePath) => {
    return resolve(`${__dirname}/../../assets/${relativePath}`);
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
        onMessageListeners.add(cb);
    }
};

const onInstalled = {
    addListener(cb) {
        // interesting thing here is the fact that
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
