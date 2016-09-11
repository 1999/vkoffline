'use strict';

const uiToSyncChannel = new BroadcastChannel('chromeMessagesFromUI');
const syncToUiChannel = new BroadcastChannel('chromeMessagesToUI');

export const sendMessageToSyncProcess = (msg) => {
    uiToSyncChannel.postMessage(msg);
};

export const sendMessagesToUiTabs = (msg) => {
    syncToUiChannel.postMessage(msg);
};

export const subscribeToMessagesFromUI = (cb) => {
    uiToSyncChannel.onmessage = ({data}) => cb(data);
};

export const subscribeToMessagesFromSync = (cb) => {
    syncToUiChannel.onmessage = ({data}) => cb(data);
};
