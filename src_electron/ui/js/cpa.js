'use strict';

let sendEvents = true;

export default {
    sendEvent(...args) {
        if (sendEvents) {
            ga('send', 'event', ...args);
        }
    },

    changePermittedState(permitEvents) {
        sendEvents = permitEvents;
    }
}
