'use strict';

import {ipcRenderer} from 'electron';
import LogManager from './logs';

const prepareStackText = (errStack) => {
    return errStack.split('\n    ');
};

const flattenError = (err) => {
    const isErrorInstance = err instanceof Error;
    const message = isErrorInstance ? err.message : err;
    const stack = isErrorInstance ? prepareStackText(err.stack) : null;

    return {message, stack};
};

export default (file) => {
    // listen to node-related errors
    process.on('uncaughtException', err => {
        const errObj = flattenError(err);
        LogManager.error(errObj.message);

        ipcRenderer.send('rendererError', {
            file,
            err: errObj,
            type: 'uncaughtException'
        });
    });

    // listen to unhandled promises being rejected
    process.on('unhandledRejection', reason => {
        const errObj = flattenError(reason);
        LogManager.error(errObj.message);

        ipcRenderer.send('rendererError', {
            file,
            err: errObj,
            type: 'unhandledRejection'
        });
    });
}
