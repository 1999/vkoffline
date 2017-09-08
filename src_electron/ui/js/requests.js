'use strict';

import {debounce} from 'lodash';
import chrome from './chrome';
import CPA from './cpa';

import AccountsManager from './accounts';
import LogManager from './logs';
import StorageManager from './storage';

// @see http://vk.com/dev/api_requests
const AVAILABLE_LANGUAGES = ['ru', 'ua', 'be', 'en', 'es', 'fi', 'de', 'it'];
const REQUESTS_TIMEOUT_MS = 350;

export default (function () {
    'use strict';

    var currentLocale = chrome.i18n.getMessage('@@ui_locale').split('_')[0];
    var requestsLanguage = AVAILABLE_LANGUAGES.includes(currentLocale) ? currentLocale : 'ru';
    var queuePromise = Promise.resolve();

    var isTokenExpired;
    var callbacksOnSuccess = {};
    var callbacksOnFail = {};
    var timeoutIds = {};
    var xhrs = {};
    var boundCallbacks = null;

    function notifyTokenStatus() {
        return debounce(function () {
            chrome.runtime.sendMessage({
                action: 'tokenStatus',
                expired: isTokenExpired
            });
        }, 1000);
    }

    /**
     * @param {Object} params объект с ключами {String} url, {String} method, {Integer} timeout, {FormData} data
     * @param {Function} fnSuccess
     * @param {Function} fnFail принимает {Integer} код ошибки 1 (нет соединения), 2 (not json), 3 (response.error !== undefined, not auth problem), 4 (timeout), 5 (abort), 6 (oauth revoke)
     */
    function runRequest(params, fnSuccess, fnFail) {
        if (params.url.indexOf('a_check') === -1) {
            var requestsLog = StorageManager.get('requests', {constructor: Object, strict: true, create: true});
            requestsLog[params.url] = requestsLog[params.url] || 0;
            requestsLog[params.url] += 1;
            StorageManager.set('requests', requestsLog);
        }

        var xhrId = params.url.replace(/[^a-z0-9]/g, '') + '_' + Math.random(),
            url = params.url,
            timeout = 25,
            formData;

        // убираем timeout из параметров
        if (params.timeout !== undefined) {
            timeout = params.timeout;
            delete params.timeout;
        }

        // устанавливаем обработчики
        callbacksOnSuccess[xhrId] = fnSuccess || null;
        callbacksOnFail[xhrId] = fnFail || null;

        // создаем XHR и добавляем ему уникальный идентификатор
        // responseType json : http://code.google.com/p/chromium/issues/detail?id=119256
        // FIXME: issue is fixed in M31, check out error behaviour and switch to responseType json
        var xhr = new XMLHttpRequest();
        xhr.urid = xhrId;
        xhrs[xhrId] = xhr;

        // привязываем обработчики намертво
        if (boundCallbacks === null) {
            boundCallbacks = [onLoad.bind(this), onError.bind(this)];
        }

        xhr.addEventListener('load', boundCallbacks[0], false);
        xhr.addEventListener('error', boundCallbacks[1], false);
        xhr.addEventListener('abort', boundCallbacks[1], false);

        queuePromise = queuePromise.then(function () {
            // XHR has already been aborted
            if (!xhrs[xhrId]) {
                return;
            }

            xhr.open(params.method, url, true);

            if (params.data) {
                formData = new FormData();
                for (var prop in params.data) {
                    formData.append(prop, params.data[prop]);
                }

                xhr.send(formData);
            } else {
                xhr.send();
            }

            // таймаут запроса
            // http://code.google.com/p/chromium/issues/detail?id=119500
            timeoutIds[xhrId] = window.setTimeout(boundCallbacks[1], timeout * 1000, xhrId);

            return new Promise(function (resolve) {
                setTimeout(resolve, REQUESTS_TIMEOUT_MS);
            });
        });

        return xhrId;
    }

    function onError(e) {
        var errorCode,
            xhrId;

        if (typeof e === 'object') {
            xhrId = e.target.urid;
            errorCode = (e.type === 'abort') ? this.ABORT : this.NO_INTERNET;
        } else {
            xhrId = e;
            errorCode = this.TIMEOUT;

            // сбрасываем подвисший запрос, чтобы он больше не висел в памяти
            xhrs[xhrId].removeEventListener('abort', boundCallbacks[1], false);
            xhrs[xhrId].abort();
        }

        if (errorCode === this.NO_INTERNET || errorCode === this.TIMEOUT) {
            // уведомление о работе сети
            chrome.runtime.sendMessage({'action' : 'networkDown'});
        }

        if (typeof callbacksOnFail[xhrId] === 'function') {
            callbacksOnFail[xhrId](errorCode);
        }

        finalizeRequest(xhrId);
    }

    function onLoad(e) {
        var res,
            xhr = e.target,
            xhrId = e.target.urid,
            errDataParams = {},
            errMethod = '';

        try {
            /* eslint-disable no-control-regex */
            res = JSON.parse(xhr.responseText.replace(/[\x00-\x1f]/, ''));
            /* eslint-enable no-control-regex */
        } catch (e) {
            CPA.sendEvent('Custom-Errors', 'Exception error', e.message);
            LogManager.error('[' + xhrId + '] Not a JSON response: ' + xhr.responseText + '');

            if (typeof callbacksOnFail[xhrId] === 'function') {
                callbacksOnFail[xhrId](this.NOT_JSON);
            }

            finalizeRequest(xhrId);
            return;
        }

        if (res.error !== undefined) {
            var shouldSendStat = true;

            // вычленяем данные запроса
            res.error.request_params.forEach(function(paramData) {
                if (paramData.key === 'access_token' || paramData.key === 'oauth') {
                    return;
                }

                if (paramData.key === 'method') {
                    errMethod = paramData.value;
                }

                errDataParams[paramData.key] = paramData.value;
            });

            // @see http://vk.com/dev/errors
            switch (res.error.error_code) {
                // case 6:
                    // re-add request to queue

                case 5 :
                    LogManager.error('Access denied for request with params: ' + JSON.stringify(errDataParams));
                    shouldSendStat = false;

                    isTokenExpired = true;
                    notifyTokenStatus();

                    if (typeof callbacksOnFail[xhrId] === 'function') {
                        callbacksOnFail[xhrId](this.ACCESS_DENIED);
                    }

                    // notify user about expired token
                    chrome.runtime.sendMessage({action: 'tokenExpiredRequest'});
                    break;

                case 14 :
                    LogManager.warn('XHR response has error code 14 (captcha). Params: ' + JSON.stringify(errDataParams));

                    isTokenExpired = false;
                    notifyTokenStatus();

                    if (typeof callbacksOnFail[xhrId] === 'function') {
                        callbacksOnFail[xhrId](this.CAPTCHA, {
                            'sid' : res.error.captcha_sid,
                            'img' : res.error.captcha_img
                        });
                    }

                    break;

                default :
                    LogManager.warn('XHR response has error field with code ' + res.error.error_code + '. Params: ' + JSON.stringify(errDataParams));

                    isTokenExpired = false;
                    notifyTokenStatus();

                    if (typeof callbacksOnFail[xhrId] === 'function') {
                        callbacksOnFail[xhrId](this.RESPONSE_ERROR, {
                            'code' : res.error.error_code,
                            'msg' : res.error.error_msg
                        });
                    }

                    break;
            }

            if (shouldSendStat) {
                // уведомляем в GA
                CPA.sendEvent('Custom-Errors', 'Request error', {
                    'method' : errMethod,
                    'code' : res.error.error_code
                });
            }
        } else {
            isTokenExpired = false;
            notifyTokenStatus();

            if (typeof callbacksOnSuccess[xhrId] === 'function') {
                callbacksOnSuccess[xhrId](res);
            }
        }

        finalizeRequest(xhrId);
    }

    function finalizeRequest(xhrId) {
        delete xhrs[xhrId];
        delete callbacksOnSuccess[xhrId];
        delete callbacksOnFail[xhrId];

        clearTimeout(timeoutIds[xhrId]);
        delete timeoutIds[xhrId];
    }


    return {
        apiMethod(method, params, fnSuccess, fnFail) {
            if (typeof params === 'function') {
                fnFail = fnSuccess;
                fnSuccess = params;
                params = {};
            }

            const performParams = this._prepareApiMethodParams(method, params);
            return runRequest.call(this, performParams, fnSuccess, fnFail);
        },

        async promiseApiMethod(method, params = {}) {
            await StorageManager.load();

            const performParams = this._prepareApiMethodParams(method, params);
            return new Promise((resolve, reject) => {
                runRequest.call(this, performParams, resolve, reject);
            });
        },

        forceUrlGet: function(url, params, fnSuccess, fnFail) {
            var getParams = [];
            var performParams = {
                method: 'GET',
                url: url
            };

            if (typeof params === 'function') {
                fnFail = fnSuccess;
                fnSuccess = params;
                params = {};
            }

            if (params.timeout !== undefined) {
                performParams.timeout = params.timeout;
                delete params.timeout;
            }

            for (var prop in params)
                getParams.push(encodeURIComponent(prop) + '=' + encodeURIComponent(params[prop]));

            if (getParams.length)
                performParams.url += '?' + getParams.join('&');

            return runRequest.call(this, performParams, fnSuccess, fnFail);
        },

        abort: function(xhrId) {
            if (xhrs[xhrId] === undefined) {
                throw new ReferenceError('No such request: ' + xhrId);
            }

            xhrs[xhrId].abort();
            finalizeRequest(xhrId);
        },

        abortAll: function () {
            for (var xhrId in xhrs) {
                xhrs[xhrId].abort();
                finalizeRequest(xhrId);
            }
        },

        _prepareApiMethodParams(apiMethod, params = {}) {
            const performParams = {
                method: 'POST',
                url: `https://api.vk.com/method/${apiMethod}`
            };

            if (apiMethod.includes('getLongPollServer')) {
                params.use_ssl = 1;
            }

            if (params.access_token === undefined) {
                params.access_token = AccountsManager.current.token;
            } else if (params.access_token === null) {
                delete params.access_token;
            }

            performParams.data = params;
            performParams.data.lang = requestsLanguage;

            return performParams;
        },

        NO_INTERNET: 1,
        NOT_JSON: 2,
        RESPONSE_ERROR: 3,
        TIMEOUT: 4,
        ABORT: 5,
        ACCESS_DENIED: 6,
        CAPTCHA: 7
    };
})();