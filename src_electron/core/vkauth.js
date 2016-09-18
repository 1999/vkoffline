'use strict';

const querystring = require('querystring');
const url = require('url');
const {BrowserWindow} = require('electron');
const {VK_ID, VK_APP_SCOPE} = require('../lib/config');

module.exports = function (type) {
    return new Promise((resolve, reject) => {
        const partition = (type === 'new') ? 'persist:app' : `ram:${Date.now()}`;

        // Build the OAuth consent page URL
        const authWindow = new BrowserWindow({
            width: 800,
            height: 600,
            webPreferences: {
                partition,
                nodeIntegration: false
            }
        });

        const oauthRedirectURI = 'https://oauth.vk.com/blank.html';
        const oauthUrl = `https://oauth.vk.com/authorize?client_id=${VK_ID}&scope=${VK_APP_SCOPE.join(',')}&redirect_uri=${oauthRedirectURI}&display=page&response_type=token`;

        authWindow.loadURL(oauthUrl);
        authWindow.show();

        function handleUrlChange(windowUrl) {
            if (!windowUrl.startsWith(oauthRedirectURI)) {
                return;
            }

            const {hash} = url.parse(windowUrl);
            const hashData = querystring.parse(hash.substr(1));

            authWindow.removeAllListeners('close');
            authWindow.close();

            if (hashData.error) {
                reject({
                    error: hashData.error,
                    description: hashData.error_description
                });
            } else {
                resolve({
                    token: hashData.access_token,
                    uid: Number(hashData.user_id)
                });
            }
        }

        authWindow.webContents.on('will-navigate', function (event, url) {
            handleUrlChange(url);
        });

        authWindow.webContents.on('did-get-redirect-request', function (evt, oldUrl, newUrl) {
            handleUrlChange(newUrl);
        });

        authWindow.on('close', () => {
            reject({
                error: 'denyAccess',
                description: ''
            });
        }, false);
    });
};
