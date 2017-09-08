'use strict';

import {appName, appVersion} from './remote';

let sendEvents = true;

export default {
    sendEvent(...args) {
        if (sendEvents) {
            ga('send', 'event', ...args);
        }
    },

    changePermittedState(permitEvents) {
        sendEvents = permitEvents;
    },

    /**
     * @see https://developers.google.com/analytics/devguides/collection/analyticsjs/screens
     */
    sendAppView(viewName) {
        if (sendEvents) {
            ga('send', 'screenview', {
                appName,
                appVersion,
                screenName: viewName
            });
        }
    }
};
