'use strict';

import {ipcRenderer} from 'electron';
import chrome from './chrome';

// initialize chrome.runtime
chrome.runtime.init(true);

export default (function () {
    function statSend(...args) {
        chrome.runtime.sendMessage({
            action: 'sendAuthStat',
            data: args
        });
    }

    /**
     * VK OAuth webview
     * @param {String} type - one of "add", "update" and "new"
     * @return {Promise}
     */
    function initAuthWebview(type) { // new, add, update (uid)
        return new Promise(function (resolve, reject) {
            ipcRenderer
                .once('vkAuth', (evt, data) => {
                    if (data.error) {
                        statSend('App-Actions', 'OAuth access cancelled', data.error, data.description);
                        reject(data);
                    } else {
                        statSend('App-Actions', 'OAuth access granted', data.uid);
                        resolve(data);
                    }
                })
                .send('vkAuth', {type});
        });
    }

    /**
     * @param {String} type - one of "new", "add", "update"
     * @param {Object} errObj
     */
    function authErrorsHandler(type, errObj) {
        var userDeniedAccess = (errObj.error.includes('access_denied')) || (errObj.error.includes('denyAccess'));
        var securityBreach = errObj.error.includes('security');
        var failReason;

        if (userDeniedAccess) {
            failReason = "securityBreach";
        } else if (securityBreach) {
            failReason = "denyAccess";
        } else {
            failReason = "unknown"
        }

        return Promise.reject({
            from: type,
            reason: failReason
        });
    }


    return {
        /**
         * Request token for the first user in app
         */
        requestFirstToken: function Auth_requestFirstToken() {
            return initAuthWebview("new").then(function (res) {
                statSend("App-Actions", "First account added");

                chrome.runtime.sendMessage({
                    action: "addFirstAccount",
                    token: res.token,
                    uid: res.uid
                });
            }, authErrorsHandler.bind(null, "new"));
        },

        /**
         * Add another account into app
         * @return {Promise}
         */
        addNewAccount: function Auth_addNewAccount() {
            return initAuthWebview("add").then(function (res) {
                chrome.runtime.sendMessage({
                    action: "addAnotherAccount",
                    token: res.token,
                    uid: res.uid
                });
            }, authErrorsHandler.bind(null, "add"));
        },

        /**
         * Update expired token for existing app user
         * @return {Promise}
         */
        updateExistingToken: function Auth_updateExistingToken(updateTokenForUserId) {
            return initAuthWebview("update").then(function (res) {
                chrome.runtime.sendMessage({
                    action: "updateExistingToken",
                    token: res.token,
                    uid: res.uid,
                    neededUid: updateTokenForUserId
                });
            }, authErrorsHandler.bind(null, "update"));
        }
    };
})();
