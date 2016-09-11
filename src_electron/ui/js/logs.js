'use strict';

import SettingsManager from './settings';
import DatabaseManager from './db';

const levels = [
    ['config', 'error', 'warn'],
    ['config', 'error', 'warn', 'log'],
    ['config', 'error', 'warn', 'log', 'info']
];

const curryLogMethod = (methodName) => {
    return async (...methodArgs) => {
        await SettingsManager.init();

        if (!levels[SettingsManager.Debug].includes(methodName)) {
            return;
        }

        await DatabaseManager.log(methodArgs[0], methodName);
    };
};

export default {
    config: curryLogMethod('config'),
    error: curryLogMethod('error'),
    warn: curryLogMethod('warn'),
    log: curryLogMethod('log'),
    info: curryLogMethod('info')
}
