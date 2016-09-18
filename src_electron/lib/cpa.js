CPA = (function () {
    'use strict';

    var service = analytics.getService(App.GOOGLE_ANALYTICS_CPA_ID);
    var tracker = service.getTracker(App.GOOGLE_ANALYTICS_CPA_COUNTER);


    return {
        changePermittedState: function CPA_changePermittedState(permitted) {
            service.getConfig().addCallback(function (config) {
                config.setTrackingPermitted(permitted);
            });
        },

        isTrackingPermitted: function CPA_isTrackingPermitted(callback) {
            service.getConfig().addCallback(function (config) {
                callback(config.isTrackingPermitted());
            });
        },

        sendEvent: function CPA_sendEvent(category, action, label, valueCount) {
            var args = [];

            for (var i = 0, len = Math.min(arguments.length, 4); i < len; i++) {
                if (i === 3) {
                    if (typeof valueCount === 'boolean') {
                        valueCount = Number(valueCount);
                    } else if (typeof valueCount !== 'number') {
                        valueCount = parseInt(valueCount, 10) || 0;
                    }

                    args.push(valueCount);
                } else {
                    if (typeof arguments[i] !== 'string') {
                        args.push(JSON.stringify(arguments[i]));
                    } else {
                        args.push(arguments[i]);
                    }
                }
            }

            tracker.sendEvent.apply(tracker, args);
        },

        sendAppView: function CPA_sendAppView(viewName) {
            tracker.sendAppView(viewName);
        }
    };
})();
