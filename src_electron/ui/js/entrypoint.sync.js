/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;
/******/
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// identity function for calling harmory imports with the correct context
/******/ 	__webpack_require__.i = function(value) { return value; };
/******/
/******/ 	// define getter function for harmory exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		Object.defineProperty(exports, name, {
/******/ 			configurable: false,
/******/ 			enumerable: true,
/******/ 			get: getter
/******/ 		});
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 2);
/******/ })
/************************************************************************/
/******/ ({

/***/ 2:
/***/ function(module, exports) {

"use strict";
'use strict';

process.on('uncaughtException', err => {
    // TODO log errors somewhere
    // console.error(msgError);
    // LogManager.error(msgError);

    process.exit(1);
});

process.on('unhandledRejection', reason => {
    // TODO log errors somewhere
    // reason is mostly an Error instance
});

var forceSkipSync = false;

/**
 * Показать chrome.notification
 *
 * @param {Object} data
 * @param {String} data.title
 * @param {String} data.message
 * @param {String} data.icon
 * @param {Number} [data.uid]
 * @param {String} [data.id]
 * @param {String} [data.sound]
 * @param {Number} [data.timeout]
 * @param {Function} [data.onclick]
 */
function showChromeNotification(data) {
    // Linux check
    // @see https://developer.chrome.com/extensions/notifications
    if (!chrome.notifications) return;

    var promise = data.uid ? getAvatarImage(data.icon, data.uid) : Promise.resolve(data.icon);

    var showChromeNotificationInner = function (uri) {
        uri = uri || data.icon;

        chrome.notifications.create((data.id || Math.random()) + '', {
            type: 'basic',
            iconUrl: uri,
            title: data.title,
            message: data.message,
            isClickable: true
        }, function (notificationId) {
            if (data.onclick) {
                notificationHandlers[notificationId] = data.onclick;
            }

            if (data.sound) {
                SoundManager.play(data.sound);
            }

            if (data.timeout) {
                setTimeout(function () {
                    chrome.notifications.clear(notificationId, _.noop);
                }, data.timeout * 1000);
            }
        });
    };

    promise.then(showChromeNotificationInner, function () {
        showChromeNotificationInner();
    });
}

/**
 * Flatten settings by getting their values in this moment
 * @return {Object}
 */
function getFlatSettings() {
    var flatSettings = {};
    SettingsManager.getAvailable().forEach(function (key) {
        flatSettings[key] = SettingsManager[key];
    });

    return flatSettings;
}

function leaveOneAppWindowInstance(openIfNoExist) {
    var appWindows = chrome.app.window.getAll();
    appWindows.forEach(function (win, isNotFirst) {
        if (isNotFirst) {
            win.close();
        } else {
            win.focus();
            win.show();
        }
    });

    if (!appWindows.length && openIfNoExist) {
        openAppWindow();
    }
}

// notification click handlers
// FIXME refactor
/*var notificationHandlers = {};
chrome.notifications.onClicked.addListener(function notificationHandler(notificationId) {
    var notificationCallback = notificationHandlers[notificationId];

    if (notificationId === "tokenExpiredRequest") {
        notificationCallback = function () {
            CPA.sendEvent("App-Data", "tokenExpired notification click");

            // close all app windows
            var appWindows = chrome.app.window.getAll();
            appWindows.forEach(function (win) {
                win.close();
            });

            openAppWindow(null, true);
        };
    }

    if (!notificationCallback)
        return;

    chrome.notifications.clear(notificationId, _.noop);
    notificationCallback();

    delete notificationHandlers[notificationId];
});

chrome.alarms.onAlarm.addListener(function (alarmInfo) {
    switch (alarmInfo.name) {
        case "dayuse":
            CPA.sendEvent("Lifecycle", "Dayuse", "Total users", 1);
            CPA.sendEvent("Lifecycle", "Dayuse", "Authorized users", AccountsManager.currentUserId ? 1 : 0);

            var appInstallTime = StorageManager.get("app_install_time");
            if (appInstallTime) {
                var totalDaysLive = Math.floor((Date.now() - appInstallTime) / 1000 / 60 / 60 / 24);
                CPA.sendEvent("Lifecycle", "Dayuse", "App life time", totalDaysLive);
            }

            var requestsLog = StorageManager.get("requests", {constructor: Object, strict: true, create: true});
            for (var url in requestsLog) {
                CPA.sendEvent("Lifecycle", "Dayuse", "Requests: " + url, requestsLog[url]);
            }

            StorageManager.remove("requests");

            chrome.storage.local.get("dayuse.dau", function (records) {
                var isActiveUser = records["dayuse.dau"];
                if (!isActiveUser) {
                    return;
                }

                CPA.sendEvent("Lifecycle", "DAU");
                chrome.storage.local.remove("dayuse.dau", _.noop);
            });

            break;

        case "weekuse":
            chrome.storage.local.get("weekuse.wau", function (records) {
                var isActiveUser = records["weekuse.wau"];
                if (!isActiveUser) {
                    return;
                }

                CPA.sendEvent("Lifecycle", "WAU");
                chrome.storage.local.remove("weekuse.wau", _.noop);
            });

            break;

        case "fetchnews":
            ReqManager.apiMethod("wall.get", {
                access_token: null, // объявления получать обязательно, поэтому ходим без токенов
                owner_id: (0 - App.VK_ADV_GROUP[0]),
                count: 5,
                filter: "owner"
            }, function (data) {
                var seenPosts = StorageManager.get("vkgroupwall_synced_posts", {constructor: Array, strict: true, create: true});
                var postsToStore = [];

                data.response.slice(1).forEach(function (post) {
                    if (seenPosts.indexOf(post.id) !== -1 || App.VK_ADV_GROUP[1] >= post.id)
                        return;

                    postsToStore.push(post);
                });

                if (postsToStore.length) {
                    StorageManager.set("vkgroupwall_stored_posts", postsToStore);

                    chrome.runtime.sendMessage({
                        action: "newWallPosts",
                        newPostsNum: postsToStore.length
                    });
                }
            }, _.noop);

            break;

        case "actualizeChats":
            DatabaseManager.actualizeChatDates();
            break;

        case "actualizeContacts":
            DatabaseManager.actualizeContacts().catch(function (errMsg) {
                LogManager.error(errMsg);
                CPA.sendEvent("Custom-Errors", "Database error", errMsg);
            });

            break;

        case "propose-launcher":
            // promote VK Offline launcher
            chrome.notifications && chrome.notifications.create(Math.random() + "", {
                type: "image",
                imageUrl: chrome.runtime.getURL("pic/launcher.png"),
                title: chrome.i18n.getMessage("launcherNotificationTitle"),
                message: chrome.i18n.getMessage("launcherNotificationMessage"),
                iconUrl: chrome.runtime.getURL("pic/icon48.png"),
                isClickable: false
            }, function (id) {
                SoundManager.play("message");
                CPA.sendEvent("Lifecycle", "Actions", "Install.NotifyLauncherPromote.Show");
            });

            break;

        case "sleeping-awake":
            // do nothing. this alarm is just for waking up an app
            break;
    }
});

// install & update handling
chrome.runtime.onInstalled.addListener(function (details) {
    var appName = chrome.runtime.getManifest().name;
    var currentVersion = chrome.runtime.getManifest().version;

    switch (details.reason) {
        case "install":
            CPA.changePermittedState(true);
            CPA.sendEvent("Lifecycle", "Dayuse", "Install", 1);

            MigrationManager.start(currentVersion);

            // propose to install VK Offline launcher after 2 minutes on inactivity after install
            // inactivity means not opening app window
            chrome.alarms.create("propose-launcher", {delayInMinutes: 2});
            break;

        case "update":
            if (currentVersion !== details.previousVersion) {
                MigrationManager.start(currentVersion);
                CPA.sendEvent("Lifecycle", "Dayuse", "Upgrade", 1);
            }

            break;
    }

    chrome.alarms.get("dayuse", function (alarmInfo) {
        if (!alarmInfo) {
            chrome.alarms.create("dayuse", {
                delayInMinutes: 24 * 60,
                periodInMinutes: 24 * 60
            });
        }
    });

    chrome.alarms.get("fetchnews", function (alarmInfo) {
        if (!alarmInfo) {
            chrome.alarms.create("fetchnews", {
                periodInMinutes: 24 * 60,
                delayInMinutes: 1
            });
        }
    });

    chrome.alarms.get("weekuse", function (alarmInfo) {
        if (!alarmInfo) {
            chrome.alarms.create("weekuse", {
                delayInMinutes: 7 * 24 * 60,
                periodInMinutes: 7 * 24 * 60
            });
        }
    });

    var uninstallUrl = App.GOODBYE_PAGE_URL + "?ver=" + currentVersion;
    if (typeof chrome.runtime.setUninstallURL === "function") {
        chrome.runtime.setUninstallURL(uninstallUrl);
    }

    var installDateKey = "app_install_time";
    chrome.storage.local.get(installDateKey, function (records) {
        records[installDateKey] = records[installDateKey] || Date.now();
        chrome.storage.local.set(records);
    });

    // create sleeping awake alarm
    chrome.alarms.create("sleeping-awake", {periodInMinutes: 1});
});

// listen to messages from Listen! app
chrome.runtime.onMessageExternal.addListener(function (msg, sender, sendResponse) {
    if (sender.id === App.LISTENAPP_ID && msg.action === "importAuthToken") {
        if (AccountsManager.currentUserId) {
            sendResponse({
                user_id: Number(AccountsManager.currentUserId),
                token: AccountsManager.list[AccountsManager.currentUserId].token
            });
        } else {
            sendResponse(null);
        }
    } else if (sender.id === App.LAUNCHER_EXTENSION_ID && msg.action === "launch") {
        leaveOneAppWindowInstance(true);
    } else {
        sendResponse(false);
    }
});

function openAppWindow(evt, tokenExpired) {
    chrome.app.window.create("main.html", {
        id: uuid(),
        innerBounds: {
            minWidth: 1000,
            minHeight: 700
        }
    }, function (win) {
        // flatten settings by getting their values in this moment
        win.contentWindow.Settings = getFlatSettings();

        // pass current user data
        win.contentWindow.Account = {
            currentUserId: AccountsManager.currentUserId,
            currentUserFio: AccountsManager.current ? AccountsManager.current.fio : null,
            tokenExpired: tokenExpired
        };
    });

    chrome.alarms.clear("propose-launcher", _.noop);
}

// app lifecycle
chrome.app.runtime.onLaunched.addListener(openAppWindow);
chrome.app.runtime.onRestarted.addListener(openAppWindow);*/

Promise.all([StorageManager.load(), DatabaseManager.initMeta()]).then(function readyToGo(err) {
    SettingsManager.init();
    LogManager.config("App started");

    var syncingData = {},
        // объект с ключами inbox, sent и contacts - счетчик максимальных чисел
    uidsProcessing = {}; // объект из элементов вида {currentUserId1: {uid1: true, uid2: true, uid3: true}, ...}

    var clearSyncingDataCounters = function (userId) {
        if (syncingData[userId] !== undefined) {
            syncingData[userId].contacts[0] = 0;
            syncingData[userId].contacts[1] = 0;

            syncingData[userId].inbox[0] = 0;
            syncingData[userId].inbox[1] = 0;

            syncingData[userId].sent[0] = 0;
            syncingData[userId].sent[1] = 0;
        } else {
            syncingData[userId] = {
                "contacts": [0, 0], // [total, current]
                "inbox": [0, 0],
                "sent": [0, 0]
            };
        }
    };

    // устанавливаем обработчики offline-событий
    window.addEventListener("online", function (e) {
        chrome.runtime.sendMessage({ "action": "onlineStatusChanged", "status": "online" });

        // на самом деле сеть может быть, а связи с интернетом - нет
        if (AccountsManager.currentUserId) {
            startUserSession();
        }
    }, false);

    window.addEventListener("offline", function (e) {
        ReqManager.abortAll();
        chrome.runtime.sendMessage({ "action": "onlineStatusChanged", "status": "offline" });
    }, false);

    var longPollEventsRegistrar = {
        init: function (currentUserId) {
            // обрываем LP-запрос старого пользователя
            if (this._longPollXhrIds[currentUserId]) {
                ReqManager.abort(this._longPollXhrIds[currentUserId]);
                delete this._longPollXhrIds[currentUserId];
            }

            // [ISSUES6] решение проблемы
            this._longPollXhrIds[currentUserId] = null;
            this._getCredentials(currentUserId);
        },

        _onLoad: function (currentUserId, res) {
            var self = this;

            if (res.failed !== undefined) {
                if (res.failed === 2) {
                    // ключ устарел
                    LogManager.warn("LongPoll server key is now obsolete. Re-requesting a new key..." + " [" + this._longPollXhrIds[currentUserId] + "]");
                } else {
                    LogManager.error("LongPoll server request failed: " + JSON.stringify(res) + " [" + this._longPollXhrIds[currentUserId] + "]");
                }

                delete this._longPollXhrIds[currentUserId];

                this.init(currentUserId);
                return;
            }

            LogManager.info(JSON.stringify(res));

            res.updates.forEach(function (data) {
                switch (data[0]) {
                    case 2:
                        if (data[2] & 128) {
                            // Сообщение удалено на сайте.
                            // в идеале нужно менять соответствующий индекс массива "messagesGot" для корректной работы mailSync
                            // В то же время и для исходящих, и для входящих сообщений data[2] === 128, и чтобы определить входящее сообщение или нет, необходимо делать доп. запрос.
                            // За это время может произойти ошибка duplicate key
                        } else if (data[2] & 8) {
                            // сообщение отмечено как важное
                            DatabaseManager.markMessageWithTag(data[1], "important", _.noop, function (isDatabaseError, errMsg) {
                                if (isDatabaseError) {
                                    LogManager.error(errMsg);
                                    CPA.sendEvent("Custom-Errors", "Database error", errMsg);
                                }
                            });
                        } else if (data[2] & 1) {
                            DatabaseManager.markAsUnread(data[1], function () {
                                chrome.runtime.sendMessage({ "action": "msgReadStatusChange", "read": false, "id": data[1] });
                            }, function (errMsg) {
                                LogManager.error(errMsg);
                                CPA.sendEvent("Custom-Errors", "Database error", errMsg);
                            });
                        }

                        break;

                    case 3:
                        if (data[2] & 128) {
                            // сообщение восстановлено на сайте
                            DatabaseManager.unmarkMessageWithTag(data[1], "trash", _.noop, function (isDatabaseError, errMsg) {
                                if (isDatabaseError) {
                                    LogManager.error(errMsg);
                                    CPA.sendEvent("Custom-Errors", "Database error", errMsg);
                                }
                            });
                        } else if (data[2] & 8) {
                            // сообщение больше не важное
                            DatabaseManager.unmarkMessageWithTag(data[1], "important", _.noop, function (isDatabaseError, errMsg) {
                                if (isDatabaseError) {
                                    LogManager.error(errMsg);
                                    CPA.sendEvent("Custom-Errors", "Database error", errMsg);
                                }
                            });
                        } else if (data[2] & 1) {
                            DatabaseManager.markAsRead(data[1], function () {
                                chrome.runtime.sendMessage({ "action": "msgReadStatusChange", "read": true, "id": data[1] });
                            }, function (errMsg) {
                                LogManager.error(errMsg);
                                CPA.sendEvent("Custom-Errors", "Database error", errMsg);
                            });
                        }

                        break;

                    case 4:
                        var uid = data[7].from !== undefined ? data[7].from : data[3],
                            mailType = data[2] & 2 ? "sent" : "inbox",
                            onUserDataReady;

                        syncingData[currentUserId][mailType][1] += 1;

                        onUserDataReady = function (userData) {
                            var attachments = [];
                            var msgData = {};

                            for (var field in data[7]) {
                                var matches = field.match(/^attach([\d]+)$/);
                                if (!matches) continue;

                                var attachType = data[7]["attach" + matches[1] + "_type"];
                                attachments.push([attachType].concat(data[7][field].split("_")));
                            }

                            if (data[7].geo !== undefined) {
                                attachments.push(["geopoint", data[7].geo]);
                            }

                            msgData.mid = data[1];
                            msgData.uid = userData.uid;
                            msgData.date = data[4];
                            msgData.title = data[5];
                            msgData.body = data[6];
                            msgData.read_state = data[2] & 1 ? 0 : 1;
                            msgData.attachments = attachments;
                            msgData.chat_id = data[7].from !== undefined ? data[3] - 2000000000 : 0;
                            msgData.tags = [mailType];
                            msgData.emoji = data[7].emoji ? 1 : 0;

                            if (attachments.length) {
                                msgData.tags.push("attachments");
                            }

                            DatabaseManager.insertMessages(currentUserId, [msgData], function () {
                                // обновляем фронтенд
                                chrome.runtime.sendMessage({
                                    action: "messageReceived",
                                    data: msgData,
                                    userdata: userData
                                });

                                if (mailType === "inbox") {
                                    var avatar = userData.photo || chrome.runtime.getURL("pic/question_th.gif");
                                    showNotification(avatar, userData.uid);
                                }

                                function showNotification(avatarUrl, uid) {
                                    if (SettingsManager.NotificationsTime === 0 /* || SettingsManager.ShowWhenVK === 0*/) return;

                                    showChromeNotification({
                                        uid: uid,
                                        title: userData.first_name + " " + userData.last_name,
                                        message: msgData.body.replace(/<br>/gm, "\n"),
                                        icon: avatarUrl,
                                        sound: "message",
                                        timeout: SettingsManager.NotificationsTime === 12 ? undefined : SettingsManager.NotificationsTime * 5,
                                        onclick: function () {
                                            LogManager.config("Clicked notification with message #" + msgData.mid);
                                            leaveOneAppWindowInstance(true);
                                        }
                                    });

                                    LogManager.config("Open notification with message #" + msgData.mid);
                                }
                            });
                        };

                        DatabaseManager.getContactById(currentUserId, uid, onUserDataReady, function (err) {
                            // теоретически может измениться currentUserId
                            if (currentUserId === AccountsManager.currentUserId) {
                                getUserProfile(currentUserId, parseInt(uid, 10), onUserDataReady);
                            }
                        });

                        break;

                    case 8:
                        // пользователь -data[1] онлайн
                        if (SettingsManager.ShowOnline === 1) {
                            chrome.runtime.sendMessage({ "action": "contactOnlineStatus", "uid": -data[1], "online": true });
                        }

                        break;

                    case 9:
                        // пользователь -data[1] оффлайн (нажал кнопку "выйти" если data[2] === 0, иначе по таймауту)
                        if (SettingsManager.ShowOnline === 1) {
                            chrome.runtime.sendMessage({ "action": "contactOnlineStatus", "uid": -data[1], "online": false });
                        }

                        break;

                    case 61: // пользователь data[1] начал набирать текст в диалоге
                    case 62:
                        // пользователь data[1] начал набирать текст в беседе data[2]
                        break;

                    default:
                        LogManager.info([data[0], data]);
                }
            });

            if (AccountsManager.currentUserId === currentUserId) {
                this._longPollData[currentUserId].ts = res.ts;
                this._longPollInit(currentUserId);
            }
        },

        _onError: function (currentUserId, errorCode, errorData) {
            delete this._longPollXhrIds[currentUserId];
            if (errorCode === ReqManager.ABORT) return;

            this.init(currentUserId);

            if (AccountsManager.currentUserId === currentUserId) {
                mailSync(currentUserId, "inbox");
                mailSync(currentUserId, "sent");
            }
        },

        _getCredentials: function (currentUserId) {
            var self = this;

            ReqManager.apiMethod("messages.getLongPollServer", function (data) {
                if (AccountsManager.currentUserId !== currentUserId) return;

                self._longPollData[currentUserId] = data.response;
                self._longPollInit(currentUserId);
            }, function (errCode) {
                delete self._longPollXhrIds[currentUserId];

                if (errCode === ReqManager.ACCESS_DENIED) {
                    chrome.runtime.sendMessage({ action: "tokenExpired" });
                }

                switch (errCode) {
                    case ReqManager.ABORT:
                    case ReqManager.ACCESS_DENIED:
                        return;
                }

                window.setTimeout(self.init.bind(self), 5000, currentUserId);
            });
        },

        _longPollInit: function (currentUserId) {
            var domain = this._longPollData[currentUserId].server.replace("vkontakte.ru", "vk.com");

            this._longPollXhrIds[currentUserId] = ReqManager.forceUrlGet("https://" + domain, {
                "act": "a_check",
                "key": this._longPollData[currentUserId].key,
                "ts": this._longPollData[currentUserId].ts,
                "wait": 25,
                "mode": 2,
                "timeout": 30
            }, this._onLoad.bind(this, currentUserId), this._onError.bind(this, currentUserId));
        },

        _longPollData: {},
        _longPollXhrIds: {},
        _tags: {}
    };

    /**
     * Запрос к API ВКонтакте за пользователями и последующая запись их в БД
     *
     * @param {Number} currentUserId
     * @param {Number} uid
     * @param {Function} callback функция, в которую передается весь объект-ответ от API ВКонтакте
     */
    function getUserProfile(currentUserId, uid, callback) {
        var tokenForRequest = AccountsManager.list[currentUserId].token;

        uidsProcessing[currentUserId] = uidsProcessing[currentUserId] || {};
        callback = callback || _.noop;

        // проверяем uid на нахождение в списке обрабатываемых
        if (uidsProcessing[currentUserId][uid]) {
            return;
        }

        ReqManager.apiMethod("users.get", {
            uids: String(uid),
            fields: "first_name,last_name,sex,domain,bdate,photo,contacts",
            access_token: tokenForRequest
        }, function (data) {
            // записываем данные друзей в БД и скачиваем их аватарки
            updateUsersData(currentUserId, data.response).then(function (users) {
                var userData = users[0];

                // удаляем из списка обрабатываемых
                delete uidsProcessing[currentUserId][userData.uid];

                callback(userData);
            });
        }, function (errCode, errData) {
            switch (errCode) {
                case ReqManager.ABORT:
                case ReqManager.ACCESS_DENIED:
                    return;
            }

            window.setTimeout(getUserProfile, 5 * 1000, currentUserId, uid, callback);
        });
    }

    /**
     * Синхронизация списка друзей
     * @param {Integer} currentUserId
     */
    var friendsSync = function (currentUserId) {
        if (friendsSync.running) return;

        // флаг, чтобы не вызывать метод одновременно несколько раз подряд
        friendsSync.running = true;

        var friendsSyncTimes = StorageManager.get("friends_sync_time", { constructor: Object, strict: true, create: true });
        var milliSecondsTimeout = App.FRIENDS_UPDATE_TIMEOUT * 1000;
        var nextRequestTimeout;

        // проверяем, чтобы запросы на синхронизацию шли только от текущего активного пользователя
        if (currentUserId !== AccountsManager.currentUserId) {
            friendsSync.running = false;
            return;
        }

        // проверяем, чтобы не было слишком частых запросов
        if (friendsSyncTimes[currentUserId]) {
            nextRequestTimeout = Math.max(milliSecondsTimeout - Math.abs(Date.now() - friendsSyncTimes[currentUserId]), 0);
            if (nextRequestTimeout > 0) {
                window.setTimeout(friendsSync, nextRequestTimeout, currentUserId);

                friendsSync.running = false;
                return;
            }
        }

        // поздравляем текущего пользователя с ДР
        getUserProfile(currentUserId, currentUserId, function (currentUserData) {
            var nowDate = new Date(),
                nowDay = nowDate.getDate(),
                nowYear = nowDate.getFullYear(),
                nowMonth = nowDate.getMonth() + 1,
                bDate,
                i,
                notification,
                msg;

            if (currentUserData.bdate === undefined || currentUserData.bdate.length === 0) return;

            // разбиваем и преобразуем в числа
            bDate = currentUserData.bdate.split(".");
            for (i = 0; i < bDate.length; i++) bDate[i] = parseInt(bDate[i], 10);

            if (bDate[0] !== nowDay || bDate[1] !== nowMonth) return;

            showChromeNotification({
                title: App.NAME,
                message: chrome.i18n.getMessage("happyBirthday").replace("%appname%", App.NAME),
                icon: chrome.runtime.getURL("pic/smile.png"),
                sound: "message",
                onclick: function () {
                    CPA.sendEvent("App-Actions", "BD notification click");
                    leaveOneAppWindowInstance(true);
                }
            });

            CPA.sendEvent("App-Data", "Show BD notification");
        });

        ReqManager.apiMethod("friends.get", { fields: "first_name,last_name,sex,domain,bdate,photo,contacts" }, function (data) {
            var nowDate = new Date(),
                nowDay = nowDate.getDate(),
                nowYear = nowDate.getFullYear(),
                nowMonth = nowDate.getMonth() + 1;

            syncingData[currentUserId].contacts[0] += data.response.length;

            // записываем данные друзей в БД и скачиваем их аватарки
            updateUsersData(currentUserId, data.response).then(function (users) {
                users.forEach(function (userDoc) {
                    var bDate, i;

                    // удаляем из списка обрабатываемых
                    delete uidsProcessing[currentUserId][userDoc.uid];

                    syncingData[currentUserId].contacts[1] += 1;
                    chrome.runtime.sendMessage({
                        action: "syncProgress",
                        userId: currentUserId,
                        type: "contacts",
                        total: syncingData[currentUserId].contacts[0],
                        current: syncingData[currentUserId].contacts[1]
                    });

                    if (SettingsManager.ShowBirthdayNotifications === 0) return;

                    // показываем уведомление, если у кого-то из друзей ДР
                    if (userDoc.bdate === undefined || userDoc.bdate.length === 0) return;

                    // разбиваем и преобразуем в числа
                    bDate = userDoc.bdate.split(".");
                    for (i = 0; i < bDate.length; i++) bDate[i] = parseInt(bDate[i], 10);

                    if (bDate[0] !== nowDay || bDate[1] !== nowMonth) return;

                    // показываем уведомление о ДР
                    var i18nBirthDay = chrome.i18n.getMessage("birthday").split("|"),
                        i18nYears = chrome.i18n.getMessage("years").split("|"),
                        hisHerMatches = i18nBirthDay[0].match(/([^\s]+)-([^\s]+)/),
                        msg,
                        yoNow,
                        notification;

                    userDoc.sex = userDoc.sex || 0;
                    switch (userDoc.sex) {
                        case 1:
                            // female
                            msg = i18nBirthDay[0].replace(hisHerMatches[0], hisHerMatches[2]) + "!";
                            break;

                        case 2:
                            // male
                            msg = i18nBirthDay[0].replace(hisHerMatches[0], hisHerMatches[1]) + "!";
                            break;

                        default:
                            // non-specified
                            msg = i18nBirthDay[0].replace(hisHerMatches[0], hisHerMatches[1] + " (" + hisHerMatches[2] + ")") + "!";
                    }

                    if (bDate.length === 3) {
                        yoNow = nowYear - bDate[2];
                        msg += " (" + i18nBirthDay[1].replace("%years%", yoNow + " " + Utils.string.plural(yoNow, i18nYears)) + ")";
                    }

                    showChromeNotification({
                        uid: userDoc.uid,
                        title: userDoc.first_name + " " + userDoc.last_name,
                        message: msg,
                        icon: userDoc.photo || chrome.runtime.getURL("pic/question_th.gif"),
                        sound: "message",
                        onclick: function () {
                            leaveOneAppWindowInstance(true);
                        }
                    });
                });

                var inboxSynced = StorageManager.get("perm_inbox_" + currentUserId) !== null;
                var sentSynced = StorageManager.get("perm_outbox_" + currentUserId) !== null;

                friendsSyncTimes[currentUserId] = Date.now();
                StorageManager.set("friends_sync_time", friendsSyncTimes);

                // следующая синхронизация должна начаться через FRIENDS_UPDATE_TIMEOUT
                window.setTimeout(friendsSync, milliSecondsTimeout, currentUserId);

                // если к этому моменту уже синхронизированы входящие и исходящие
                if (AccountsManager.currentUserId === currentUserId) {
                    if (inboxSynced && sentSynced) {
                        // сбрасываем счетчик синхронизации
                        clearSyncingDataCounters(currentUserId);

                        Promise.all([DatabaseManager.actualizeContacts(currentUserId), DatabaseManager.actualizeChatDates(currentUserId)]).then(function () {
                            chrome.runtime.sendMessage({
                                action: "ui",
                                which: "user",
                                currentUserId: AccountsManager.currentUserId,
                                currentUserFio: AccountsManager.current ? AccountsManager.current.fio : null
                            });
                        });
                    }
                }

                friendsSync.running = false;
            });
        }, function (errCode, errData) {
            friendsSync.running = false;

            switch (errCode) {
                case ReqManager.ABORT:
                case ReqManager.ACCESS_DENIED:
                    return;
            }

            window.setTimeout(friendsSync, 5 * 1000, currentUserId);
        });
    };

    /**
     * Функция-обработчик, которая запускается в методах friends.get/users.get, поскольку оба метода возвращают примерно
     * одинаковый ответ и имеют общую логику записи данных в БД
     *
     * @param {Number} currentUserId
     * @param {Array} users
     * @return {Promise} [description]
     */
    function updateUsersData(currentUserId, users) {
        return new Promise(function (resolve, reject) {
            var dataToReplace = [];
            uidsProcessing[currentUserId] = uidsProcessing[currentUserId] || {};

            users.forEach(function (userData) {
                // добавляем uid в список обрабатываемых
                uidsProcessing[currentUserId][userData.uid] = true;

                // обновляем ФИО пользователя
                if (currentUserId === userData.uid) {
                    AccountsManager.setFio(currentUserId, userData.first_name + " " + userData.last_name);
                }

                dataToReplace.push([userData.uid, userData.first_name, userData.last_name, userData]);
            });

            if (!dataToReplace.length) {
                resolve([]);
                return;
            }

            DatabaseManager.replaceContacts(currentUserId, dataToReplace).then(resolve, function (err) {
                var errMessage = err.name + ": " + err.message;

                LogManager.error(errMessage);
                CPA.sendEvent("Custom-Errors", "Database error", "Failed to replace contact: " + errMessage);

                reject(errMessage);
            });
        });
    }

    /**
     * Особенность mailSync заключается в том, что она должна запускаться редко и из startUserSession
     * К моменту начала работы mailSync текущий активный пользователь может смениться. Тем не менее
     * функция должна отработать до конца, то есть или скачать все сообщения до нуля in descending order, или
     * дойти до момента, когда внутреннняя функция записи сообщений в БД вернет ошибку DUPLICATE ID. mailSync не должна
     * показывать всплывающие уведомления, это прерогатива обработчика данных от LongPoll-сервера
     */
    var mailSync = function (currentUserId, mailType, latestMessageId) {
        var offset = syncingData[currentUserId][mailType][1];
        var userDataForRequest = AccountsManager.list[currentUserId],
            compatName = mailType === "inbox" ? "inbox" : "outbox",
            permKey = "perm_" + compatName + "_" + currentUserId,
            firstSync = StorageManager.get(permKey) === null;

        var latestMsg = offset ? Promise.resolve(latestMessageId) : DatabaseManager.getLatestTagMessageId(mailType);

        var getMessages = new Promise(function (resolve, reject) {
            var reqData = {
                access_token: userDataForRequest.token,
                count: 100,
                preview_length: 0,
                out: mailType === "sent" ? 1 : 0,
                offset: offset
            };

            ReqManager.apiMethod("messages.get", reqData, resolve, function (errCode, errData) {
                reject({
                    code: errCode,
                    data: errData
                });
            });
        });

        Promise.all([getMessages, latestMsg]).then(function (res) {
            var data = res[0];
            var latestMessageId = res[1];
            var timeToStopAfter = false; // message found with id equal to latestMessageId

            // flatten response structure
            var messages = [],
                dataSyncedFn;

            dataSyncedFn = function () {
                var inboxSynced, sentSynced, friendsSynced, wallTokenUpdated;

                StorageManager.set(permKey, 1);

                inboxSynced = StorageManager.get("perm_inbox_" + currentUserId) !== null;
                sentSynced = StorageManager.get("perm_outbox_" + currentUserId) !== null;
                friendsSynced = StorageManager.get("friends_sync_time", { constructor: Object, strict: true, create: true })[currentUserId] !== undefined;

                if (AccountsManager.currentUserId === currentUserId) {
                    // если к этому моменту вся почта синхронизирована и друзья тоже, то перерисовываем фронт
                    if (inboxSynced && sentSynced && friendsSynced) {
                        // сбрасываем счетчик синхронизации
                        clearSyncingDataCounters(currentUserId);

                        // маленькое замечение: после того как аккаунт мигрирован с 3 на 4 версию, стартует startUserSession()
                        // она запускает mailSync(), что в свою очередь породит перерисовку фронта на "ui" => "user"
                        // чтобы защититься от этого проверяем, был ли обновлен токен
                        wallTokenUpdated = StorageManager.get("wall_token_updated", { constructor: Object, strict: true, create: true })[AccountsManager.currentUserId] !== undefined;
                        if (wallTokenUpdated) {
                            Promise.all([DatabaseManager.actualizeContacts(currentUserId), DatabaseManager.actualizeChatDates(currentUserId)]).then(function () {
                                chrome.runtime.sendMessage({
                                    action: "ui",
                                    which: "user",
                                    currentUserId: AccountsManager.currentUserId,
                                    currentUserFio: AccountsManager.current ? AccountsManager.current.fio : null
                                });
                            });
                        }
                    }
                }
            };

            // все получили
            if (data.response === 0 || data.response instanceof Array && data.response.length === 1 || forceSkipSync) {
                dataSyncedFn();
                return;
            }

            syncingData[currentUserId][mailType][0] = data.response[0];

            if (uidsProcessing[currentUserId] === undefined) {
                uidsProcessing[currentUserId] = {};
            }

            // отсекаем общий счетчик сообщений
            _.forEach(data.response, function (msgData, index) {
                var coords;

                // пропускаем общий счетчик
                if (!index) return;

                if (msgData.mid === latestMessageId) {
                    timeToStopAfter = true;
                    return false;
                }

                // backwards-compatibility. До 4 версии при отсутствии вложений писался пустой объект
                // теперь мы определяем это на фронте при отрисовке
                msgData.attachments = msgData.attachments || [];

                // геоданные также пишем как вложение
                if (msgData.geo && msgData.geo.type === "point") {
                    coords = msgData.geo.coordinates.split(" ");

                    msgData.attachments.push({
                        type: "geopoint",
                        geopoint: {
                            lat: coords[0],
                            lng: coords[1]
                        }
                    });
                }

                msgData.chat_id = msgData.chat_id || 0;
                msgData.tags = [mailType];

                if (msgData.attachments.length) msgData.tags.push("attachments");

                // проверяем существует ли пользователь
                if (!uidsProcessing[currentUserId][msgData.uid]) {
                    DatabaseManager.getContactById(currentUserId, msgData.uid, null, function (err) {
                        getUserProfile(currentUserId, msgData.uid);
                    });
                }

                messages.push(msgData);
                if (msgData.read_state === 0 && StorageManager.get(permKey) === null) {
                    // FIXME: calculate number of new messages
                    // show notification afterwards
                }
            });

            DatabaseManager.insertMessages(currentUserId, messages, function () {
                syncingData[currentUserId][mailType][1] += messages.length;

                chrome.runtime.sendMessage({
                    "action": "syncProgress",
                    "userId": currentUserId,
                    "type": mailType,
                    "total": syncingData[currentUserId][mailType][0],
                    "current": syncingData[currentUserId][mailType][1]
                });

                if (timeToStopAfter || syncingData[currentUserId][mailType][1] > data.response[0]) {
                    dataSyncedFn();
                    return;
                }

                mailSync(currentUserId, mailType, latestMessageId);
            }, _.noop);
        }, function (err) {
            if (err.name instanceof DOMError) {
                var errMsg = err.name + ": " + err.message;
                throw new Error(errMsg);
            }

            switch (err.code) {
                case ReqManager.ACCESS_DENIED:
                    // TODO error
                    break;

                default:
                    console.log('Error ', err);
                    window.setTimeout(mailSync, 5000, currentUserId, mailType, latestMessageId);
                    break;
            }
        });
    };

    /**
     * Должен запускаться только в четырех случаях: при старте приложения (то есть при загрузке ОС), при смене аккаунта,
     * при добавлении и при удалении аккаунта. При отрисовке UI ничего запускать не нужно - она должна работать с кэшем и событиями.
     * Отличие же friendsSync/eventsRegistrar/mailSync в том, что первые два независимы и работают только для текущего пользователя,
     * а mailSync должен уметь работать не зная кто является текущим
     */
    var startUserSession = function (callback) {
        var currentUserId = AccountsManager.currentUserId;

        // сбрасываем все XHR-запросы
        ReqManager.abortAll();

        // инициализируем БД
        DatabaseManager.initUser(currentUserId, function () {
            if (AccountsManager.currentUserId !== currentUserId) return;

            // сбрасываем счетчики синхронизации
            clearSyncingDataCounters(AccountsManager.currentUserId);

            if (navigator.onLine) {
                friendsSync(AccountsManager.currentUserId);
                longPollEventsRegistrar.init(AccountsManager.currentUserId);

                mailSync(AccountsManager.currentUserId, "inbox");
                mailSync(AccountsManager.currentUserId, "sent");
            }

            if (typeof callback === "function") {
                callback();
            }
        }, function (errMsg) {
            LogManager.error(errMsg);
            CPA.sendEvent("Critical-Errors", "Database init user", errMsg);
        });

        // включаем статистику запросов ВК
        // @see http://vk.com/dev/stats.trackVisitor
        ReqManager.apiMethod("stats.trackVisitor", _.noop);
    };

    chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
        var sendAsyncResponse = false;

        switch (request.action) {
            case "addFirstAccount":
                AccountsManager.setData(request.uid, request.token, "...");
                AccountsManager.currentUserId = request.uid;

                var wallTokenUpdated = StorageManager.get("wall_token_updated", { constructor: Object, strict: true, create: true });
                wallTokenUpdated[AccountsManager.currentUserId] = 1;
                StorageManager.set("wall_token_updated", wallTokenUpdated);

                startUserSession(function () {
                    chrome.runtime.sendMessage({
                        action: "ui",
                        which: "syncing",
                        currentUserId: AccountsManager.currentUserId,
                        currentUserFio: AccountsManager.current ? AccountsManager.current.fio : null
                    });
                });

                break;

            case "addAnotherAccount":
                var newUserGranted = AccountsManager.list[request.uid] === undefined;
                if (!newUserGranted) {
                    AccountsManager.setData(request.uid, request.token);

                    // уведомляем об ошибке
                    chrome.runtime.sendMessage({
                        action: "tokenUpdatedInsteadOfAccountAdd",
                        uid: request.uid,
                        fio: AccountsManager.list[request.uid].fio
                    });

                    return;
                }

                CPA.sendEvent("App-Actions", "2+ account added");

                AccountsManager.setData(request.uid, request.token, "...");
                AccountsManager.currentUserId = request.uid;

                var wallTokenUpdated = StorageManager.get("wall_token_updated", { constructor: Object, strict: true, create: true });
                wallTokenUpdated[AccountsManager.currentUserId] = 1;
                StorageManager.set("wall_token_updated", wallTokenUpdated);

                startUserSession(function () {
                    chrome.runtime.sendMessage({
                        action: "ui",
                        which: "syncing"
                    });
                });

                break;

            case "updateExistingToken":
                var neededUserTokenUpdated = request.neededUid === request.uid;
                var newUserGranted = true;

                for (var listUserId in AccountsManager.list) {
                    listUserId = Number(listUserId);

                    if (listUserId === request.uid) {
                        newUserGranted = false;
                        break;
                    }
                }

                if (newUserGranted) {
                    // уведомляем об ошибке
                    chrome.runtime.sendMessage({
                        action: "tokenAddedInsteadOfUpdate",
                        uid: request.uid,
                        token: request.token
                    });

                    return;
                }

                AccountsManager.setData(request.uid, request.token);

                if (neededUserTokenUpdated) {
                    CPA.sendEvent("App-Actions", "Account token updated");

                    chrome.runtime.sendMessage({
                        action: "tokenUpdated"
                    });
                } else {
                    chrome.runtime.sendMessage({
                        action: "tokenUpdatedForWrongUser",
                        uid: request.uid,
                        fio: AccountsManager.list[request.uid].fio
                    });
                }

                break;

            case "getAccountsList":
                sendAsyncResponse = true;

                var accounts = {};
                var promises = [];

                var assignAvatar = function (account, uid) {
                    return new Promise(function (resolve, reject) {
                        DatabaseManager.getContactById(AccountsManager.currentUserId, uid, function (contactData) {
                            account.avatar = contactData.photo;
                            resolve();
                        }, function (err) {
                            if (err) {
                                LogManager.error(err + '');
                            }

                            resolve();
                        });
                    });
                };

                _.forIn(AccountsManager.list, function (value, key) {
                    accounts[key] = value;
                    promises.push(assignAvatar(value, key));
                });

                Promise.all(promises).then(function () {
                    sendResponse(accounts);
                });

                break;

            case "saveSettings":
                _.forIn(request.settings, function (value, key) {
                    SettingsManager[key] = value;
                });

                // notify app windows
                chrome.runtime.sendMessage({
                    action: "settingsChanged",
                    settings: getFlatSettings()
                });

                break;

            case "tokenExpiredRequest":
                var tokenExpiredAlarmName = "tokenExpiredNotifyThrottle";
                chrome.alarms.get(tokenExpiredAlarmName, function (alarmInfo) {
                    // if alarm is set user has already seen notification about expired token
                    if (alarmInfo) {
                        return;
                    }

                    // create alarm to prevent notifying user too often
                    chrome.alarms.create(tokenExpiredAlarmName, {
                        delayInMinutes: 60 * 24
                    });

                    // show notification
                    showChromeNotification({
                        id: "tokenExpiredRequest",
                        title: chrome.i18n.getMessage("tokenExpiredNotificationTitle"),
                        message: chrome.i18n.getMessage("tokenExpiredNotificationMessage"),
                        icon: chrome.runtime.getURL("pic/icon48.png"),
                        sound: "error"
                    });

                    CPA.sendEvent("App-Data", "tokenExpired notification seen");
                });

                break;

            case "uiDraw":
                sendAsyncResponse = true;
                sendResponse(true);

                var uiType;
                var changelogNotified = StorageManager.get("changelog_notified", { constructor: Array, strict: true, create: true });
                var inboxSynced, sentSynced, friendsSynced;
                var wallTokenUpdated;

                if (AccountsManager.currentUserId) {
                    inboxSynced = StorageManager.get("perm_inbox_" + AccountsManager.currentUserId) !== null;
                    sentSynced = StorageManager.get("perm_outbox_" + AccountsManager.currentUserId) !== null;
                    friendsSynced = StorageManager.get("friends_sync_time", { constructor: Object, strict: true, create: true })[AccountsManager.currentUserId] !== undefined;

                    if (inboxSynced && sentSynced && friendsSynced) {
                        uiType = "user";
                    } else {
                        uiType = "syncing";
                    }
                } else {
                    uiType = "guest";
                }

                switch (uiType) {
                    case "user":
                        CPA.sendAppView("Users");
                        CPA.sendEvent("UI-Draw", "Users", AccountsManager.currentUserId);

                        chrome.storage.local.set({
                            "dayuse.dau": true,
                            "weekuse.wau": true
                        });

                        break;

                    case "syncing":
                        CPA.sendAppView("Syncing");
                        CPA.sendEvent("UI-Draw", "Syncing", AccountsManager.currentUserId);
                        break;

                    case "guest":
                        CPA.sendAppView("Guests");
                        CPA.sendEvent("UI-Draw", "Guests");
                        break;
                }

                // уведомляем фронт
                chrome.runtime.sendMessage({
                    action: "ui",
                    which: uiType,
                    currentUserId: AccountsManager.currentUserId,
                    currentUserFio: AccountsManager.current ? AccountsManager.current.fio : null
                });

                break;

            case "closeNotification":
                if (notificationHandlers[request.mid]) {
                    chrome.notifications.clear(request.mid, _.noop);
                    delete notificationHandlers[request.mid];
                }

                break;

            // NB. Есть баг, когда в некоторых версиях браузера сортировка работает слишком долго. Для определения этого момента в 4.4 внедрено следующее решение:
            // При первом запросе контактов проверяем, сколько времени работал запрос к бэкенду. Если это заняло больше 3 секунд, то меняем настройку сортировки.
            // Соответственно "забываем" запрос и порождаем новый.
            // 13.0.755.0 (83879) - долгая выборка контактов
            case "fetchContactList":
                var breakNeeded = false,
                    timeoutId,
                    onContactsListReady;

                sendAsyncResponse = true;
                onContactsListReady = function (contactsList) {
                    if (contactsList.length === 0) {
                        return;
                    }

                    var contactsIds = contactsList.map(function (contactData) {
                        return contactData.uid;
                    });

                    ReqManager.apiMethod("users.get", { "uids": contactsIds.join(","), "fields": "online" }, function (data) {
                        data.response.forEach(function (chunk) {
                            var isOnline = chunk.online === 1 || chunk.online_mobile === 1;
                            chrome.runtime.sendMessage({ "action": "contactOnlineStatus", "uid": chunk.uid, "online": isOnline });
                        });
                    });
                };

                timeoutId = window.setTimeout(function () {
                    var defaultSettingsUsed = StorageManager.get("settings") === null;
                    if (defaultSettingsUsed === false) {
                        return;
                    }

                    breakNeeded = true;
                    SettingsManager.SortContacts = 2;

                    DatabaseManager.getContactList("alpha", request.totalShown, function (contacts) {
                        sendResponse(contacts);

                        if (SettingsManager.ShowOnline === 1) {
                            onContactsListReady(contacts[0]);
                        }
                    }, function (errMsg) {
                        sendResponse([[], 0]);
                        LogManager.error(errMsg);
                    });
                }, 3000);

                DatabaseManager.getContactList(request.type, request.totalShown, function (contacts) {
                    if (breakNeeded) {
                        return;
                    }

                    sendResponse(contacts);
                    window.clearTimeout(timeoutId);

                    if (SettingsManager.ShowOnline === 1) {
                        onContactsListReady(contacts[0]);
                    }
                }, function (errMsg) {
                    if (breakNeeded) {
                        return;
                    }

                    sendResponse([[], 0]);
                    LogManager.error(errMsg);

                    window.clearTimeout(timeoutId);
                });

                break;

            case "fetchConversations":
                sendAsyncResponse = true;
                DatabaseManager.getConversations(request.totalShown, sendResponse, function (errMsg) {
                    sendResponse([[], 0]);
                    LogManager.error(errMsg);
                });

                break;

            case "getDialogThread":
                sendAsyncResponse = true;

                DatabaseManager.getDialogThread(request.id, {
                    from: request.from !== undefined ? request.from : 0,
                    everything: Boolean(request.print)
                }, sendResponse, function (errMsg) {
                    sendResponse([[], 0]);
                    LogManager.error(errMsg);
                });

                break;

            case "getMessageInfo":
                sendAsyncResponse = true;
                DatabaseManager.getMessageById(Number(request.mid), sendResponse, function (isDatabaseError, errMsg) {
                    sendResponse(undefined);

                    if (isDatabaseError) {
                        LogManager.error(errMsg);
                        CPA.sendEvent("Custom-Errors", "Database error", errMsg);
                    }
                });

                break;

            case "getConversationThreadsWithContact":
                sendAsyncResponse = true;
                DatabaseManager.getConversationThreadsWithContact(request.uid, sendResponse, function (errMsg) {
                    sendResponse([]);
                    LogManager.error(errMsg);
                });

                break;

            case "getContactData":
                sendAsyncResponse = true;
                DatabaseManager.getContactById(AccountsManager.currentUserId, request.uid, sendResponse, function (err) {
                    sendResponse(null);
                });

                if (SettingsManager.ShowOnline === 1 && request.includeOnlineStatus) {
                    ReqManager.apiMethod("users.get", { "uids": request.uid, "fields": "online" }, function (data) {
                        data.response.forEach(function (chunk) {
                            var isOnline = chunk.online === 1 || chunk.online_mobile === 1;
                            chrome.runtime.sendMessage({ "action": "contactOnlineStatus", "uid": chunk.uid, "online": isOnline });
                        });
                    });
                }

                break;

            // TODO как-то формализировать
            case "errorGot":
                CPA.sendEvent("Custom-Errors", request.error, request.message);
                break;

            case "sendMessage":
                var msgParams = {};
                sendAsyncResponse = true;

                if (request.body !== undefined) {
                    msgParams.message = request.body;
                }

                if (request.subject !== undefined) {
                    msgParams.title = request.subject;
                }

                if (request.sid !== undefined) {
                    msgParams.captcha_sid = request.sid;
                }

                if (request.key !== undefined) {
                    msgParams.captcha_key = request.key;
                }

                if (request.attachments.length) {
                    msgParams.attachment = request.attachments.join(",");
                }

                if (/^[\d]+$/.test(request.to)) {
                    msgParams.chat_id = request.to;
                } else {
                    msgParams.uid = request.to.split("_")[1];
                }

                if (request.coords !== undefined) {
                    msgParams.lat = request.coords.latitude;
                    msgParams.long = request.coords.longitude;
                }

                ReqManager.apiMethod("messages.send", msgParams, function (data) {
                    CPA.sendEvent("App-Actions", "Sent Message", AccountsManager.currentUserId);
                    SoundManager.play("sent");

                    sendResponse([0, data]);
                }, function (errCode, errData) {
                    CPA.sendEvent("Custom-Errors", "Failed to send message", errCode);
                    SoundManager.play("error");

                    switch (errCode) {
                        case ReqManager.CAPTCHA:
                            sendResponse([1, errData]);
                            break;

                        default:
                            if (errCode === ReqManager.RESPONSE_ERROR && errData.code === 7) {
                                sendResponse([2]);
                                return;
                            }

                            sendResponse([3]);
                            break;
                    }
                });

                break;

            case "getMessagesUploadServer":
                var sendRequest = function () {
                    ReqManager.apiMethod("photos.getMessagesUploadServer", sendResponse, function (errCode, errData) {
                        switch (errCode) {
                            case ReqManager.NO_INTERNET:
                            case ReqManager.NOT_JSON:
                            case ReqManager.TIMEOUT:
                            case ReqManager.RESPONSE_ERROR:
                                window.setTimeout(sendRequest, 5 * 1000);
                                break;

                            default:
                                sendResponse(null);
                        }
                    });
                };

                sendRequest();
                sendAsyncResponse = true;
                break;

            case "getDocsUploadServer":
                var sendRequest = function () {
                    ReqManager.apiMethod("docs.getUploadServer", sendResponse, function (errCode, errData) {
                        switch (errCode) {
                            case ReqManager.NO_INTERNET:
                            case ReqManager.NOT_JSON:
                            case ReqManager.TIMEOUT:
                            case ReqManager.RESPONSE_ERROR:
                                window.setTimeout(sendRequest, 5 * 1000);
                                break;

                            default:
                                sendResponse(null);
                        }
                    });
                };

                sendRequest();
                sendAsyncResponse = true;
                break;

            case "saveMessagesPhoto":
                var sendRequest = function (requestData) {
                    ReqManager.apiMethod("photos.saveMessagesPhoto", {
                        "server": requestData.server,
                        "photo": requestData.photo,
                        "hash": requestData.hash
                    }, sendResponse, function (errCode, errData) {
                        switch (errCode) {
                            case ReqManager.NO_INTERNET:
                            case ReqManager.NOT_JSON:
                            case ReqManager.TIMEOUT:
                            case ReqManager.RESPONSE_ERROR:
                                window.setTimeout(sendRequest, 5 * 1000, requestData);
                                break;

                            default:
                                sendResponse(null);
                        }
                    });
                };

                sendRequest(request);
                sendAsyncResponse = true;
                break;

            case "saveMessagesDoc":
                var sendRequest = function (requestData) {
                    ReqManager.apiMethod("docs.save", {
                        "file": requestData.file
                    }, sendResponse, function (errCode, errData) {
                        switch (errCode) {
                            case ReqManager.NO_INTERNET:
                            case ReqManager.NOT_JSON:
                            case ReqManager.TIMEOUT:
                            case ReqManager.RESPONSE_ERROR:
                                window.setTimeout(sendRequest, 5 * 1000, requestData);
                                break;

                            default:
                                sendResponse(null);
                        }
                    });
                };

                sendRequest(request);
                sendAsyncResponse = true;
                break;

            case "addLike":
                CPA.sendEvent("App-Actions", "Like and repost");
                sendAsyncResponse = true;

                var sendLikeRequest = function () {
                    ReqManager.apiMethod("wall.addLike", {
                        "owner_id": -29809053,
                        "post_id": 454,
                        "repost": 1
                    }, function (data) {
                        sendResponse(1);
                    }, function (errCode, errData) {
                        switch (errCode) {
                            case ReqManager.NO_INTERNET:
                            case ReqManager.NOT_JSON:
                            case ReqManager.TIMEOUT:
                                window.setTimeout(sendLikeRequest, 5 * 1000);
                                break;

                            case ReqManager.RESPONSE_ERROR:
                                if (errData.code === 217 || errData.code === 215) {
                                    sendResponse(1);
                                    return;
                                }

                                window.setTimeout(sendLikeRequest, 5 * 1000);
                                break;

                            default:
                                sendResponse(0);
                        }
                    });
                };

                var sendJoinGroupRequest = function () {
                    ReqManager.apiMethod("groups.join", {
                        "gid": 29809053
                    }, null, function (errCode, errData) {
                        switch (errCode) {
                            case ReqManager.NO_INTERNET:
                            case ReqManager.NOT_JSON:
                            case ReqManager.TIMEOUT:
                            case ReqManager.RESPONSE_ERROR:
                                window.setTimeout(sendJoinGroupRequest, 5 * 1000);
                                break;
                        }
                    });
                };

                sendLikeRequest();
                sendJoinGroupRequest();
                break;

            case "getDocById":
                // vk bug: метод docs.getById возвращает response: []
                // http://vkontakte.ru/topic-1_21972169?post=36014
                var sendRequest;

                sendAsyncResponse = true;

                if (request.mid !== undefined) {
                    sendRequest = function (requestData) {
                        requestData.ownerId = parseInt(requestData.ownerId, 10);
                        requestData.id = parseInt(requestData.id, 10);

                        ReqManager.apiMethod("messages.getById", { "mid": requestData.mid }, function (data) {
                            if (data.response instanceof Array === false || data.response.length !== 2 || data.response[1].attachments === undefined) {
                                CPA.sendEvent("Custom-Errors", "Attachment info missing", requestData);

                                sendResponse(null);
                                return;
                            }

                            var i;

                            for (i = 0; i < data.response[1].attachments.length; i++) {
                                if (data.response[1].attachments[i].type === "doc" && data.response[1].attachments[i].doc.owner_id === requestData.ownerId && data.response[1].attachments[i].doc.did === requestData.id) {
                                    sendResponse(data.response[1].attachments[i].doc);
                                    return;
                                }
                            }

                            CPA.sendEvent("Custom-Errors", "Attachment info missing", requestData);
                        }, function (errCode, errData) {
                            switch (errCode) {
                                case ReqManager.NO_INTERNET:
                                case ReqManager.NOT_JSON:
                                case ReqManager.TIMEOUT:
                                case ReqManager.RESPONSE_ERROR:
                                    window.setTimeout(sendRequest, 5 * 1000, requestData);
                                    break;

                                default:
                                    sendResponse(null);
                            }
                        });
                    };
                } else {
                    sendRequest = function (requestData) {
                        ReqManager.apiMethod("docs.getById", { "docs": requestData.ownerId + "_" + requestData.id }, function (data) {
                            var output = data.response.length ? data.response[0] : null;
                            if (output === null) {
                                CPA.sendEvent("Custom-Errors", "Attachment info missing", requestData);
                            }

                            sendResponse(output);
                        }, function (errCode, errData) {
                            switch (errCode) {
                                case ReqManager.NO_INTERNET:
                                case ReqManager.NOT_JSON:
                                case ReqManager.TIMEOUT:
                                case ReqManager.RESPONSE_ERROR:
                                    window.setTimeout(sendRequest, 5 * 1000, requestData);
                                    break;

                                default:
                                    sendResponse(null);
                            }
                        });
                    };
                }

                sendRequest(request);
                break;

            case "getGeopointById":
                sendAsyncResponse = true;

                var sendRequest = function (msgId) {
                    ReqManager.apiMethod("messages.getById", { "mid": msgId }, function (data) {
                        if (data.response instanceof Array === false || data.response.length !== 2 || data.response[1].geo === undefined) {
                            CPA.sendEvent("Custom-Errors", "Attachment info missing", request);

                            sendResponse(null);
                            return;
                        }

                        var coords = data.response[1].geo.coordinates.split(" ");
                        sendResponse(coords);
                    }, function (errCode, errData) {
                        switch (errCode) {
                            case ReqManager.NO_INTERNET:
                            case ReqManager.NOT_JSON:
                            case ReqManager.TIMEOUT:
                            case ReqManager.RESPONSE_ERROR:
                                window.setTimeout(sendRequest, 5 * 1000, msgId);
                                break;

                            default:
                                sendResponse(null);
                        }
                    });
                };

                sendRequest(request.mid);
                break;

            case "getAudioById":
                var sendRequest = function (requestData) {
                    ReqManager.apiMethod("audio.getById", { "audios": requestData.ownerId + "_" + requestData.id }, function (data) {
                        var output = data.response.length ? data.response[0] : null;
                        if (output === null) {
                            CPA.sendEvent("Custom-Errors", "Attachment info missing", requestData);
                        }

                        sendResponse(output);
                    }, function (errCode, errData) {
                        switch (errCode) {
                            case ReqManager.NO_INTERNET:
                            case ReqManager.NOT_JSON:
                            case ReqManager.TIMEOUT:
                            case ReqManager.RESPONSE_ERROR:
                                window.setTimeout(sendRequest, 5 * 1000, requestData);
                                break;

                            default:
                                sendResponse(null);
                        }
                    });
                };

                sendRequest(request);
                sendAsyncResponse = true;
                break;

            case "getVideoById":
                var sendRequest = function (requestData) {
                    ReqManager.apiMethod("video.get", { "videos": requestData.ownerId + "_" + requestData.id }, function (data) {
                        var output = data.response instanceof Array && data.response.length === 2 ? data.response[1] : null;
                        if (output === null) {
                            CPA.sendEvent("Custom-Errors", "Attachment info missing", requestData);
                        }

                        sendResponse(output);
                    }, function (errCode, errData) {
                        switch (errCode) {
                            case ReqManager.NO_INTERNET:
                            case ReqManager.NOT_JSON:
                            case ReqManager.TIMEOUT:
                            case ReqManager.RESPONSE_ERROR:
                                window.setTimeout(sendRequest, 5 * 1000, requestData);
                                break;

                            default:
                                sendResponse(null);
                        }
                    });
                };

                sendRequest(request);
                sendAsyncResponse = true;
                break;

            case "getPhotoById":
                var sendRequest;

                if (request.mid !== undefined) {
                    sendRequest = function (requestData) {
                        requestData.ownerId = parseInt(requestData.ownerId, 10);
                        requestData.id = parseInt(requestData.id, 10);

                        ReqManager.apiMethod("messages.getById", { "mid": requestData.mid }, function (data) {
                            if (data.response instanceof Array === false || data.response.length !== 2 || data.response[1].attachments === undefined) {
                                CPA.sendEvent("Custom-Errors", "Attachment info missing", requestData);

                                sendResponse(null);
                                return;
                            }

                            var i;

                            for (i = 0; i < data.response[1].attachments.length; i++) {
                                if (data.response[1].attachments[i].type === "photo" && data.response[1].attachments[i].photo.owner_id === requestData.ownerId && data.response[1].attachments[i].photo.pid === requestData.id) {
                                    sendResponse(data.response[1].attachments[i].photo);
                                    return;
                                }
                            }

                            CPA.sendEvent("Custom-Errors", "Attachment info missing", requestData);
                        }, function (errCode, errData) {
                            switch (errCode) {
                                case ReqManager.NO_INTERNET:
                                case ReqManager.NOT_JSON:
                                case ReqManager.TIMEOUT:
                                case ReqManager.RESPONSE_ERROR:
                                    window.setTimeout(sendRequest, 5 * 1000, requestData);
                                    break;

                                default:
                                    sendResponse(null);
                            }
                        });
                    };
                } else {
                    sendRequest = function (requestData) {
                        ReqManager.apiMethod("photos.getById", { "photos": requestData.ownerId + "_" + requestData.id }, function (data) {
                            var output = data.response.length ? data.response[0] : null;
                            if (output === null) {
                                CPA.sendEvent("Custom-Errors", "Attachment info missing", requestData);
                            }

                            sendResponse(output);
                        }, function (errCode, errData) {
                            switch (errCode) {
                                case ReqManager.NO_INTERNET:
                                case ReqManager.NOT_JSON:
                                case ReqManager.TIMEOUT:
                                case ReqManager.RESPONSE_ERROR:
                                    window.setTimeout(sendRequest, 5 * 1000, requestData);
                                    break;

                                default:
                                    sendResponse(null);
                            }
                        });
                    };
                }

                sendRequest(request);
                sendAsyncResponse = true;
                break;

            case "markMessageTag":
                DatabaseManager.markMessageWithTag(request.mid, request.tag, function () {
                    sendResponse(true);
                }, function (isDatabaseError, errMsg) {
                    if (isDatabaseError) {
                        LogManager.error(errMsg);
                        CPA.sendEvent("Custom-Errors", "Database error", errMsg);
                    }

                    sendResponse(false);
                });

                sendAsyncResponse = true;
                break;

            case "migrateIntrested":
                openAppWindow();
                break;

            case "unmarkMessageTag":
                DatabaseManager.unmarkMessageWithTag(request.mid, request.tag, function () {
                    sendResponse(true);
                }, function (isDatabaseError, errMsg) {
                    if (isDatabaseError) {
                        LogManager.error(errMsg);
                        CPA.sendEvent("Custom-Errors", "Database error", errMsg);
                    }

                    sendResponse(false);
                });

                sendAsyncResponse = true;
                break;

            case "serverDeleteMessage":
                var sendDropMessageRequest = function (msgId) {
                    ReqManager.apiMethod("messages.delete", { "mid": msgId }, function (data) {
                        sendResponse(true);
                    }, function (errCode, errData) {
                        switch (errCode) {
                            case ReqManager.NO_INTERNET:
                            case ReqManager.NOT_JSON:
                            case ReqManager.TIMEOUT:
                            case ReqManager.RESPONSE_ERROR:
                                window.setTimeout(sendDropMessageRequest, 60 * 1000, msgId);
                                break;
                        }

                        LogManager.error("Deleting message failed (got error code " + errCode + ")");
                        sendResponse(false);
                    });
                };

                sendDropMessageRequest(request.mid);
                sendAsyncResponse = true;
                break;

            case "serverRestoreMessage":
                CPA.sendEvent("App-Data", "Use restore messages");

                var sendRestoreMessageRequest = function (msgId) {
                    ReqManager.apiMethod("messages.restore", { "mid": msgId }, function (data) {
                        sendResponse(true);
                    }, function (errCode, errData) {
                        switch (errCode) {
                            case ReqManager.NO_INTERNET:
                            case ReqManager.NOT_JSON:
                            case ReqManager.TIMEOUT:
                                window.setTimeout(sendRestoreMessageRequest, 60 * 1000, msgId);
                                break;
                        }

                        LogManager.error("Restoring message failed (got error code " + errCode + ")");
                        sendResponse(false);
                    });
                };

                sendRestoreMessageRequest(request.mid);
                sendAsyncResponse = true;
                break;

            case "deleteMessageForever":
                var onDrop,
                    sendDropMessageRequest,
                    actionsToGo = request.serverToo ? 2 : 1,
                    actionsMade = 0;

                sendAsyncResponse = true;

                onDrop = function () {
                    actionsMade += 1;
                    if (actionsMade !== actionsToGo) {
                        return;
                    }

                    sendResponse(null);
                };

                sendDropMessageRequest = function (msgId) {
                    ReqManager.apiMethod("messages.delete", { "mid": msgId }, function (data) {
                        onDrop();
                    }, function (errCode, errData) {
                        switch (errCode) {
                            case ReqManager.NO_INTERNET:
                            case ReqManager.NOT_JSON:
                            case ReqManager.TIMEOUT:
                                window.setTimeout(sendDropMessageRequest, 60 * 1000, msgId);
                                break;
                        }

                        LogManager.error("Deleting message failed (got error code " + errCode + ")");
                        onDrop();
                    });
                };

                if (request.serverToo) {
                    // посылаем запрос на сервер
                    sendDropMessageRequest(request.mid);
                }

                // удаляем все данные о сообщении в БД
                DatabaseManager.deleteMessage(request.mid, onDrop);
                break;

            case "speechChange":
                CPA.sendEvent("App-Actions", "Speech change", {
                    "chrome": process.versions.chrome,
                    "app": App.VERSION,
                    "uid": AccountsManager.currentUserId
                });

                break;

            case "newsPostSeen":
                CPA.sendEvent("App-Data", "News seen", request.id);
                break;

            case "newsLinkClicked":
                CPA.sendEvent("App-Actions", "News link clicked", [request.id, request.url]);
                break;

            case "newsAudioPlaying":
                CPA.sendEvent("App-Actions", "Audio playing", [request.id, request.owner_id, request.aid]);
                break;

            case "tourWatch":
                CPA.sendEvent("App-Data", "WP seen", request.step);
                break;

            case "useImportantTag":
                CPA.sendEvent("App-Data", "Use important tag", request.type);
                break;

            case "getTagsFrequency":
                sendAsyncResponse = true;
                DatabaseManager.getTagsCount(sendResponse, function (errMsg) {
                    LogManager.error(errMsg);
                    CPA.sendEvent("Custom-Errors", "Database error", errMsg);

                    sendResponse({});
                });

                break;

            case "getMessagesByTagName":
                sendAsyncResponse = true;
                DatabaseManager.getMessagesByType(request.tag, request.totalShown || 0, sendResponse, function (errMsg) {
                    LogManager.error(errMsg);
                    CPA.sendEvent("Custom-Errors", "Database error", errMsg);

                    sendResponse([[], 0]);
                });

                break;

            case "searchContact":
                DatabaseManager.searchContact(request.value, request.totalShown, function (contacts, total) {
                    sendResponse([contacts, total, request.value]);

                    if (SettingsManager.ShowOnline === 1 && contacts.length) {
                        var uids = contacts.map(function (contactData) {
                            return contactData.uid;
                        });

                        ReqManager.apiMethod("users.get", { "uids": uids.join(","), "fields": "online" }, function (data) {
                            data.response.forEach(function (chunk) {
                                var isOnline = chunk.online === 1 || chunk.online_mobile === 1;
                                chrome.runtime.sendMessage({ "action": "contactOnlineStatus", "uid": chunk.uid, "online": isOnline });
                            });
                        });
                    }
                }, function (errMsg) {
                    LogManager.error(errMsg);
                    CPA.sendEvent("Custom-Errors", "Database error", errMsg);

                    sendResponse([[], 0, request.value]);
                });

                sendAsyncResponse = true;
                break;

            case "searchMail":
                sendAsyncResponse = true;

                DatabaseManager.searchMail(request.params, request.value, request.totalShown, function (correspondence, total) {
                    sendResponse([correspondence, total, request.value]);
                }, function (errMsg) {
                    LogManager.error(errMsg);
                    CPA.sendEvent("Custom-Errors", "Database error", errMsg);

                    sendResponse([[], 0, request.value]);
                });

                break;

            case "skipSync":
                forceSkipSync = true;
                CPA.sendEvent("App-Actions", "Skip sync");
                break;

            case "currentSyncValues":
                var output = syncingData[AccountsManager.currentUserId];
                sendAsyncResponse = true;

                DatabaseManager.getContactById(AccountsManager.currentUserId, AccountsManager.currentUserId, function (userData) {
                    sendResponse({
                        data: output,
                        avatar: userData.photo
                    });
                }, function () {
                    sendResponse({
                        data: output
                    });
                });

                break;

            case "switchToAccount":
                ReqManager.abortAll();
                AccountsManager.currentUserId = request.uid;

                var changelogNotified = StorageManager.get("changelog_notified", { constructor: Array, strict: true, create: true });
                var wallTokenUpdated = StorageManager.get("wall_token_updated", { constructor: Object, strict: true, create: true })[AccountsManager.currentUserId] !== undefined;
                var startUser = true;

                if (startUser) {
                    startUserSession(leaveOneAppWindowInstance);
                } else {
                    leaveOneAppWindowInstance();
                }

                break;

            case "deleteAccount":
                ReqManager.abortAll();
                AccountsManager.drop(request.uid);
                DatabaseManager.dropUser(request.uid);

                var friendsSyncTime = StorageManager.get("friends_sync_time", { constructor: Object, strict: true, create: true });
                delete friendsSyncTime[request.uid];
                StorageManager.set("friends_sync_time", friendsSyncTime);

                var wallTokenUpdated = StorageManager.get("wall_token_updated", { constructor: Object, strict: true, create: true });
                delete wallTokenUpdated[request.uid];
                StorageManager.set("wall_token_updated", wallTokenUpdated);

                StorageManager.remove("perm_inbox_" + request.uid);
                StorageManager.remove("perm_outbox_" + request.uid);

                if (request.next !== false) {
                    AccountsManager.currentUserId = request.next;
                    startUserSession();
                }

                // закрываем все табы приложения кроме одного
                leaveOneAppWindowInstance();

                break;

            case "markAsRead":
                var sendReadMessageRequest = function (msgId) {
                    ReqManager.apiMethod("messages.markAsRead", { "mids": msgId }, null, function (errCode, errData) {
                        switch (errCode) {
                            case ReqManager.NO_INTERNET:
                            case ReqManager.NOT_JSON:
                            case ReqManager.TIMEOUT:
                                window.setTimeout(sendReadMessageRequest, 60 * 1000, msgId);
                                break;
                        }

                        LogManager.error("Marking message as read failed (got error code " + errCode + ")");
                    });
                };

                sendReadMessageRequest(request.mid);
                DatabaseManager.markAsRead(request.mid, null, function (errMsg) {
                    LogManager.error(errMsg);
                    CPA.sendEvent("Custom-Errors", "Database error", errMsg);
                });

                break;

            case "DNDhappened":
                CPA.sendEvent("App-Actions", "DND", request.num);
                break;
        }

        if (sendAsyncResponse) {
            return true;
        }
    });

    // при загрузке приложения...
    if (AccountsManager.currentUserId) {
        startUserSession();
    }
});

/***/ }

/******/ });
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly8vd2VicGFjay9ib290c3RyYXAgMWQyZTdkOGY0ODc1ZGI5NWNlZjM/ODVhOSIsIndlYnBhY2s6Ly8vLi9zcmNfZWxlY3Ryb24vdWkvanMvc3luYy5qcyJdLCJuYW1lcyI6WyJwcm9jZXNzIiwib24iLCJlcnIiLCJleGl0IiwicmVhc29uIiwiZm9yY2VTa2lwU3luYyIsInNob3dDaHJvbWVOb3RpZmljYXRpb24iLCJkYXRhIiwiY2hyb21lIiwibm90aWZpY2F0aW9ucyIsInByb21pc2UiLCJ1aWQiLCJnZXRBdmF0YXJJbWFnZSIsImljb24iLCJQcm9taXNlIiwicmVzb2x2ZSIsInNob3dDaHJvbWVOb3RpZmljYXRpb25Jbm5lciIsInVyaSIsImNyZWF0ZSIsImlkIiwiTWF0aCIsInJhbmRvbSIsInR5cGUiLCJpY29uVXJsIiwidGl0bGUiLCJtZXNzYWdlIiwiaXNDbGlja2FibGUiLCJub3RpZmljYXRpb25JZCIsIm9uY2xpY2siLCJub3RpZmljYXRpb25IYW5kbGVycyIsInNvdW5kIiwiU291bmRNYW5hZ2VyIiwicGxheSIsInRpbWVvdXQiLCJzZXRUaW1lb3V0IiwiY2xlYXIiLCJfIiwibm9vcCIsInRoZW4iLCJnZXRGbGF0U2V0dGluZ3MiLCJmbGF0U2V0dGluZ3MiLCJTZXR0aW5nc01hbmFnZXIiLCJnZXRBdmFpbGFibGUiLCJmb3JFYWNoIiwia2V5IiwibGVhdmVPbmVBcHBXaW5kb3dJbnN0YW5jZSIsIm9wZW5JZk5vRXhpc3QiLCJhcHBXaW5kb3dzIiwiYXBwIiwid2luZG93IiwiZ2V0QWxsIiwid2luIiwiaXNOb3RGaXJzdCIsImNsb3NlIiwiZm9jdXMiLCJzaG93IiwibGVuZ3RoIiwib3BlbkFwcFdpbmRvdyIsImFsbCIsIlN0b3JhZ2VNYW5hZ2VyIiwibG9hZCIsIkRhdGFiYXNlTWFuYWdlciIsImluaXRNZXRhIiwicmVhZHlUb0dvIiwiaW5pdCIsIkxvZ01hbmFnZXIiLCJjb25maWciLCJzeW5jaW5nRGF0YSIsInVpZHNQcm9jZXNzaW5nIiwiY2xlYXJTeW5jaW5nRGF0YUNvdW50ZXJzIiwidXNlcklkIiwidW5kZWZpbmVkIiwiY29udGFjdHMiLCJpbmJveCIsInNlbnQiLCJhZGRFdmVudExpc3RlbmVyIiwiZSIsInJ1bnRpbWUiLCJzZW5kTWVzc2FnZSIsIkFjY291bnRzTWFuYWdlciIsImN1cnJlbnRVc2VySWQiLCJzdGFydFVzZXJTZXNzaW9uIiwiUmVxTWFuYWdlciIsImFib3J0QWxsIiwibG9uZ1BvbGxFdmVudHNSZWdpc3RyYXIiLCJfbG9uZ1BvbGxYaHJJZHMiLCJhYm9ydCIsIl9nZXRDcmVkZW50aWFscyIsIl9vbkxvYWQiLCJyZXMiLCJzZWxmIiwiZmFpbGVkIiwid2FybiIsImVycm9yIiwiSlNPTiIsInN0cmluZ2lmeSIsImluZm8iLCJ1cGRhdGVzIiwibWFya01lc3NhZ2VXaXRoVGFnIiwiaXNEYXRhYmFzZUVycm9yIiwiZXJyTXNnIiwiQ1BBIiwic2VuZEV2ZW50IiwibWFya0FzVW5yZWFkIiwidW5tYXJrTWVzc2FnZVdpdGhUYWciLCJtYXJrQXNSZWFkIiwiZnJvbSIsIm1haWxUeXBlIiwib25Vc2VyRGF0YVJlYWR5IiwidXNlckRhdGEiLCJhdHRhY2htZW50cyIsIm1zZ0RhdGEiLCJmaWVsZCIsIm1hdGNoZXMiLCJtYXRjaCIsImF0dGFjaFR5cGUiLCJwdXNoIiwiY29uY2F0Iiwic3BsaXQiLCJnZW8iLCJtaWQiLCJkYXRlIiwiYm9keSIsInJlYWRfc3RhdGUiLCJjaGF0X2lkIiwidGFncyIsImVtb2ppIiwiaW5zZXJ0TWVzc2FnZXMiLCJhY3Rpb24iLCJ1c2VyZGF0YSIsImF2YXRhciIsInBob3RvIiwiZ2V0VVJMIiwic2hvd05vdGlmaWNhdGlvbiIsImF2YXRhclVybCIsIk5vdGlmaWNhdGlvbnNUaW1lIiwiZmlyc3RfbmFtZSIsImxhc3RfbmFtZSIsInJlcGxhY2UiLCJnZXRDb250YWN0QnlJZCIsImdldFVzZXJQcm9maWxlIiwicGFyc2VJbnQiLCJTaG93T25saW5lIiwiX2xvbmdQb2xsRGF0YSIsInRzIiwiX2xvbmdQb2xsSW5pdCIsIl9vbkVycm9yIiwiZXJyb3JDb2RlIiwiZXJyb3JEYXRhIiwiQUJPUlQiLCJtYWlsU3luYyIsImFwaU1ldGhvZCIsInJlc3BvbnNlIiwiZXJyQ29kZSIsIkFDQ0VTU19ERU5JRUQiLCJiaW5kIiwiZG9tYWluIiwic2VydmVyIiwiZm9yY2VVcmxHZXQiLCJfdGFncyIsImNhbGxiYWNrIiwidG9rZW5Gb3JSZXF1ZXN0IiwibGlzdCIsInRva2VuIiwidWlkcyIsIlN0cmluZyIsImZpZWxkcyIsImFjY2Vzc190b2tlbiIsInVwZGF0ZVVzZXJzRGF0YSIsInVzZXJzIiwiZXJyRGF0YSIsImZyaWVuZHNTeW5jIiwicnVubmluZyIsImZyaWVuZHNTeW5jVGltZXMiLCJnZXQiLCJjb25zdHJ1Y3RvciIsIk9iamVjdCIsInN0cmljdCIsIm1pbGxpU2Vjb25kc1RpbWVvdXQiLCJBcHAiLCJGUklFTkRTX1VQREFURV9USU1FT1VUIiwibmV4dFJlcXVlc3RUaW1lb3V0IiwibWF4IiwiYWJzIiwiRGF0ZSIsIm5vdyIsImN1cnJlbnRVc2VyRGF0YSIsIm5vd0RhdGUiLCJub3dEYXkiLCJnZXREYXRlIiwibm93WWVhciIsImdldEZ1bGxZZWFyIiwibm93TW9udGgiLCJnZXRNb250aCIsImJEYXRlIiwiaSIsIm5vdGlmaWNhdGlvbiIsIm1zZyIsImJkYXRlIiwiTkFNRSIsImkxOG4iLCJnZXRNZXNzYWdlIiwidXNlckRvYyIsInRvdGFsIiwiY3VycmVudCIsIlNob3dCaXJ0aGRheU5vdGlmaWNhdGlvbnMiLCJpMThuQmlydGhEYXkiLCJpMThuWWVhcnMiLCJoaXNIZXJNYXRjaGVzIiwieW9Ob3ciLCJzZXgiLCJVdGlscyIsInN0cmluZyIsInBsdXJhbCIsImluYm94U3luY2VkIiwic2VudFN5bmNlZCIsInNldCIsImFjdHVhbGl6ZUNvbnRhY3RzIiwiYWN0dWFsaXplQ2hhdERhdGVzIiwid2hpY2giLCJjdXJyZW50VXNlckZpbyIsImZpbyIsInJlamVjdCIsImRhdGFUb1JlcGxhY2UiLCJzZXRGaW8iLCJyZXBsYWNlQ29udGFjdHMiLCJlcnJNZXNzYWdlIiwibmFtZSIsImxhdGVzdE1lc3NhZ2VJZCIsIm9mZnNldCIsInVzZXJEYXRhRm9yUmVxdWVzdCIsImNvbXBhdE5hbWUiLCJwZXJtS2V5IiwiZmlyc3RTeW5jIiwibGF0ZXN0TXNnIiwiZ2V0TGF0ZXN0VGFnTWVzc2FnZUlkIiwiZ2V0TWVzc2FnZXMiLCJyZXFEYXRhIiwiY291bnQiLCJwcmV2aWV3X2xlbmd0aCIsIm91dCIsImNvZGUiLCJ0aW1lVG9TdG9wQWZ0ZXIiLCJtZXNzYWdlcyIsImRhdGFTeW5jZWRGbiIsImZyaWVuZHNTeW5jZWQiLCJ3YWxsVG9rZW5VcGRhdGVkIiwiQXJyYXkiLCJpbmRleCIsImNvb3JkcyIsImNvb3JkaW5hdGVzIiwiZ2VvcG9pbnQiLCJsYXQiLCJsbmciLCJET01FcnJvciIsIkVycm9yIiwiY29uc29sZSIsImxvZyIsImluaXRVc2VyIiwibmF2aWdhdG9yIiwib25MaW5lIiwib25NZXNzYWdlIiwiYWRkTGlzdGVuZXIiLCJyZXF1ZXN0Iiwic2VuZGVyIiwic2VuZFJlc3BvbnNlIiwic2VuZEFzeW5jUmVzcG9uc2UiLCJzZXREYXRhIiwibmV3VXNlckdyYW50ZWQiLCJuZWVkZWRVc2VyVG9rZW5VcGRhdGVkIiwibmVlZGVkVWlkIiwibGlzdFVzZXJJZCIsIk51bWJlciIsImFjY291bnRzIiwicHJvbWlzZXMiLCJhc3NpZ25BdmF0YXIiLCJhY2NvdW50IiwiY29udGFjdERhdGEiLCJmb3JJbiIsInZhbHVlIiwic2V0dGluZ3MiLCJ0b2tlbkV4cGlyZWRBbGFybU5hbWUiLCJhbGFybXMiLCJhbGFybUluZm8iLCJkZWxheUluTWludXRlcyIsInVpVHlwZSIsImNoYW5nZWxvZ05vdGlmaWVkIiwic2VuZEFwcFZpZXciLCJzdG9yYWdlIiwibG9jYWwiLCJicmVha05lZWRlZCIsInRpbWVvdXRJZCIsIm9uQ29udGFjdHNMaXN0UmVhZHkiLCJjb250YWN0c0xpc3QiLCJjb250YWN0c0lkcyIsIm1hcCIsImpvaW4iLCJjaHVuayIsImlzT25saW5lIiwib25saW5lIiwib25saW5lX21vYmlsZSIsImRlZmF1bHRTZXR0aW5nc1VzZWQiLCJTb3J0Q29udGFjdHMiLCJnZXRDb250YWN0TGlzdCIsInRvdGFsU2hvd24iLCJjbGVhclRpbWVvdXQiLCJnZXRDb252ZXJzYXRpb25zIiwiZ2V0RGlhbG9nVGhyZWFkIiwiZXZlcnl0aGluZyIsIkJvb2xlYW4iLCJwcmludCIsImdldE1lc3NhZ2VCeUlkIiwiZ2V0Q29udmVyc2F0aW9uVGhyZWFkc1dpdGhDb250YWN0IiwiaW5jbHVkZU9ubGluZVN0YXR1cyIsIm1zZ1BhcmFtcyIsInN1YmplY3QiLCJzaWQiLCJjYXB0Y2hhX3NpZCIsImNhcHRjaGFfa2V5IiwiYXR0YWNobWVudCIsInRlc3QiLCJ0byIsImxhdGl0dWRlIiwibG9uZyIsImxvbmdpdHVkZSIsIkNBUFRDSEEiLCJSRVNQT05TRV9FUlJPUiIsInNlbmRSZXF1ZXN0IiwiTk9fSU5URVJORVQiLCJOT1RfSlNPTiIsIlRJTUVPVVQiLCJyZXF1ZXN0RGF0YSIsImhhc2giLCJmaWxlIiwic2VuZExpa2VSZXF1ZXN0Iiwic2VuZEpvaW5Hcm91cFJlcXVlc3QiLCJvd25lcklkIiwiZG9jIiwib3duZXJfaWQiLCJkaWQiLCJvdXRwdXQiLCJtc2dJZCIsInBpZCIsInRhZyIsInNlbmREcm9wTWVzc2FnZVJlcXVlc3QiLCJzZW5kUmVzdG9yZU1lc3NhZ2VSZXF1ZXN0Iiwib25Ecm9wIiwiYWN0aW9uc1RvR28iLCJzZXJ2ZXJUb28iLCJhY3Rpb25zTWFkZSIsImRlbGV0ZU1lc3NhZ2UiLCJ2ZXJzaW9ucyIsIlZFUlNJT04iLCJ1cmwiLCJhaWQiLCJzdGVwIiwiZ2V0VGFnc0NvdW50IiwiZ2V0TWVzc2FnZXNCeVR5cGUiLCJzZWFyY2hDb250YWN0Iiwic2VhcmNoTWFpbCIsInBhcmFtcyIsImNvcnJlc3BvbmRlbmNlIiwic3RhcnRVc2VyIiwiZHJvcCIsImRyb3BVc2VyIiwiZnJpZW5kc1N5bmNUaW1lIiwicmVtb3ZlIiwibmV4dCIs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aURGLE1BQWpEO0FBQ0gsaUJBSEQ7O0FBS0E7O0FBRUosaUJBQUssYUFBTDtBQUNJQyxvQkFBSUMsU0FBSixDQUFjLGFBQWQsRUFBNkIsS0FBN0IsRUFBb0NpSyxRQUFRMEcsR0FBNUM7QUFDQTtBQW5sQ1I7O0FBc2xDQSxZQUFJdkcsaUJBQUosRUFBdUI7QUFDbkIsbUJBQU8sSUFBUDtBQUNIO0FBQ0osS0E1bENEOztBQThsQ0E7QUFDQSxRQUFJM0wsZ0JBQWdCQyxhQUFwQixFQUFtQztBQUMvQkM7QUFDSDtBQUNKLENBNTNERCxFIiwiZmlsZSI6ImVudHJ5cG9pbnQuc3luYy5qcyIsInNvdXJjZXNDb250ZW50IjpbIiBcdC8vIFRoZSBtb2R1bGUgY2FjaGVcbiBcdHZhciBpbnN0YWxsZWRNb2R1bGVzID0ge307XG5cbiBcdC8vIFRoZSByZXF1aXJlIGZ1bmN0aW9uXG4gXHRmdW5jdGlvbiBfX3dlYnBhY2tfcmVxdWlyZV9fKG1vZHVsZUlkKSB7XG5cbiBcdFx0Ly8gQ2hlY2sgaWYgbW9kdWxlIGlzIGluIGNhY2hlXG4gXHRcdGlmKGluc3RhbGxlZE1vZHVsZXNbbW9kdWxlSWRdKVxuIFx0XHRcdHJldHVybiBpbnN0YWxsZWRNb2R1bGVzW21vZHVsZUlkXS5leHBvcnRzO1xuXG4gXHRcdC8vIENyZWF0ZSBhIG5ldyBtb2R1bGUgKGFuZCBwdXQgaXQgaW50byB0aGUgY2FjaGUpXG4gXHRcdHZhciBtb2R1bGUgPSBpbnN0YWxsZWRNb2R1bGVzW21vZHVsZUlkXSA9IHtcbiBcdFx0XHRpOiBtb2R1bGVJZCxcbiBcdFx0XHRsOiBmYWxzZSxcbiBcdFx0XHRleHBvcnRzOiB7fVxuIFx0XHR9O1xuXG4gXHRcdC8vIEV4ZWN1dGUgdGhlIG1vZHVsZSBmdW5jdGlvblxuIFx0XHRtb2R1bGVzW21vZHVsZUlkXS5jYWxsKG1vZHVsZS5leHBvcnRzLCBtb2R1bGUsIG1vZHVsZS5leHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKTtcblxuIFx0XHQvLyBGbGFnIHRoZSBtb2R1bGUgYXMgbG9hZGVkXG4gXHRcdG1vZHVsZS5sID0gdHJ1ZTtcblxuIFx0XHQvLyBSZXR1cm4gdGhlIGV4cG9ydHMgb2YgdGhlIG1vZHVsZVxuIFx0XHRyZXR1cm4gbW9kdWxlLmV4cG9ydHM7XG4gXHR9XG5cblxuIFx0Ly8gZXhwb3NlIHRoZSBtb2R1bGVzIG9iamVjdCAoX193ZWJwYWNrX21vZHVsZXNfXylcbiBcdF9fd2VicGFja19yZXF1aXJlX18ubSA9IG1vZHVsZXM7XG5cbiBcdC8vIGV4cG9zZSB0aGUgbW9kdWxlIGNhY2hlXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLmMgPSBpbnN0YWxsZWRNb2R1bGVzO1xuXG4gXHQvLyBpZGVudGl0eSBmdW5jdGlvbiBmb3IgY2FsbGluZyBoYXJtb3J5IGltcG9ydHMgd2l0aCB0aGUgY29ycmVjdCBjb250ZXh0XG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLmkgPSBmdW5jdGlvbih2YWx1ZSkgeyByZXR1cm4gdmFsdWU7IH07XG5cbiBcdC8vIGRlZmluZSBnZXR0ZXIgZnVuY3Rpb24gZm9yIGhhcm1vcnkgZXhwb3J0c1xuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5kID0gZnVuY3Rpb24oZXhwb3J0cywgbmFtZSwgZ2V0dGVyKSB7XG4gXHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBuYW1lLCB7XG4gXHRcdFx0Y29uZmlndXJhYmxlOiBmYWxzZSxcbiBcdFx0XHRlbnVtZXJhYmxlOiB0cnVlLFxuIFx0XHRcdGdldDogZ2V0dGVyXG4gXHRcdH0pO1xuIFx0fTtcblxuIFx0Ly8gZ2V0RGVmYXVsdEV4cG9ydCBmdW5jdGlvbiBmb3IgY29tcGF0aWJpbGl0eSB3aXRoIG5vbi1oYXJtb255IG1vZHVsZXNcbiBcdF9fd2VicGFja19yZXF1aXJlX18ubiA9IGZ1bmN0aW9uKG1vZHVsZSkge1xuIFx0XHR2YXIgZ2V0dGVyID0gbW9kdWxlICYmIG1vZHVsZS5fX2VzTW9kdWxlID9cbiBcdFx0XHRmdW5jdGlvbiBnZXREZWZhdWx0KCkgeyByZXR1cm4gbW9kdWxlWydkZWZhdWx0J107IH0gOlxuIFx0XHRcdGZ1bmN0aW9uIGdldE1vZHVsZUV4cG9ydHMoKSB7IHJldHVybiBtb2R1bGU7IH07XG4gXHRcdF9fd2VicGFja19yZXF1aXJlX18uZChnZXR0ZXIsICdhJywgZ2V0dGVyKTtcbiBcdFx0cmV0dXJuIGdldHRlcjtcbiBcdH07XG5cbiBcdC8vIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbFxuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5vID0gZnVuY3Rpb24ob2JqZWN0LCBwcm9wZXJ0eSkgeyByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9iamVjdCwgcHJvcGVydHkpOyB9O1xuXG4gXHQvLyBfX3dlYnBhY2tfcHVibGljX3BhdGhfX1xuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5wID0gXCJcIjtcblxuIFx0Ly8gTG9hZCBlbnRyeSBtb2R1bGUgYW5kIHJldHVybiBleHBvcnRzXG4gXHRyZXR1cm4gX193ZWJwYWNrX3JlcXVpcmVfXyhfX3dlYnBhY2tfcmVxdWlyZV9fLnMgPSAyKTtcblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyB3ZWJwYWNrL2Jvb3RzdHJhcCAxZDJlN2Q4ZjQ4NzVkYjk1Y2VmMyIsIid1c2Ugc3RyaWN0JztcblxucHJvY2Vzcy5vbigndW5jYXVnaHRFeGNlcHRpb24nLCBlcnIgPT4ge1xuICAgIC8vIFRPRE8gbG9nIGVycm9ycyBzb21ld2hlcmVcbiAgICAvLyBjb25zb2xlLmVycm9yKG1zZ0Vycm9yKTtcbiAgICAvLyBMb2dNYW5hZ2VyLmVycm9yKG1zZ0Vycm9yKTtcblxuICAgIHByb2Nlc3MuZXhpdCgxKTtcbn0pO1xuXG5wcm9jZXNzLm9uKCd1bmhhbmRsZWRSZWplY3Rpb24nLCByZWFzb24gPT4ge1xuICAgIC8vIFRPRE8gbG9nIGVycm9ycyBzb21ld2hlcmVcbiAgICAvLyByZWFzb24gaXMgbW9zdGx5IGFuIEVycm9yIGluc3RhbmNlXG59KTtcblxudmFyIGZvcmNlU2tpcFN5bmMgPSBmYWxzZTtcblxuLyoqXG4gKiDQn9C+0LrQsNC30LDRgtGMIGNocm9tZS5ub3RpZmljYXRpb25cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gZGF0YVxuICogQHBhcmFtIHtTdHJpbmd9IGRhdGEudGl0bGVcbiAqIEBwYXJhbSB7U3RyaW5nfSBkYXRhLm1lc3NhZ2VcbiAqIEBwYXJhbSB7U3RyaW5nfSBkYXRhLmljb25cbiAqIEBwYXJhbSB7TnVtYmVyfSBbZGF0YS51aWRdXG4gKiBAcGFyYW0ge1N0cmluZ30gW2RhdGEuaWRdXG4gKiBAcGFyYW0ge1N0cmluZ30gW2RhdGEuc291bmRdXG4gKiBAcGFyYW0ge051bWJlcn0gW2RhdGEudGltZW91dF1cbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtkYXRhLm9uY2xpY2tdXG4gKi9cbmZ1bmN0aW9uIHNob3dDaHJvbWVOb3RpZmljYXRpb24oZGF0YSkge1xuICAgIC8vIExpbnV4IGNoZWNrXG4gICAgLy8gQHNlZSBodHRwczovL2RldmVsb3Blci5jaHJvbWUuY29tL2V4dGVuc2lvbnMvbm90aWZpY2F0aW9uc1xuICAgIGlmICghY2hyb21lLm5vdGlmaWNhdGlvbnMpXG4gICAgICAgIHJldHVybjtcblxuICAgIHZhciBwcm9taXNlID0gZGF0YS51aWRcbiAgICAgICAgPyBnZXRBdmF0YXJJbWFnZShkYXRhLmljb24sIGRhdGEudWlkKVxuICAgICAgICA6IFByb21pc2UucmVzb2x2ZShkYXRhLmljb24pO1xuXG4gICAgdmFyIHNob3dDaHJvbWVOb3RpZmljYXRpb25Jbm5lciA9IGZ1bmN0aW9uICh1cmkpIHtcbiAgICAgICAgdXJpID0gdXJpIHx8IGRhdGEuaWNvbjtcblxuICAgICAgICBjaHJvbWUubm90aWZpY2F0aW9ucy5jcmVhdGUoKGRhdGEuaWQgfHwgTWF0aC5yYW5kb20oKSkgKyAnJywge1xuICAgICAgICAgICAgdHlwZTogJ2Jhc2ljJyxcbiAgICAgICAgICAgIGljb25Vcmw6IHVyaSxcbiAgICAgICAgICAgIHRpdGxlOiBkYXRhLnRpdGxlLFxuICAgICAgICAgICAgbWVzc2FnZTogZGF0YS5tZXNzYWdlLFxuICAgICAgICAgICAgaXNDbGlja2FibGU6IHRydWVcbiAgICAgICAgfSwgZnVuY3Rpb24gKG5vdGlmaWNhdGlvbklkKSB7XG4gICAgICAgICAgICBpZiAoZGF0YS5vbmNsaWNrKSB7XG4gICAgICAgICAgICAgICAgbm90aWZpY2F0aW9uSGFuZGxlcnNbbm90aWZpY2F0aW9uSWRdID0gZGF0YS5vbmNsaWNrO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoZGF0YS5zb3VuZCkge1xuICAgICAgICAgICAgICAgIFNvdW5kTWFuYWdlci5wbGF5KGRhdGEuc291bmQpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoZGF0YS50aW1lb3V0KSB7XG4gICAgICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIGNocm9tZS5ub3RpZmljYXRpb25zLmNsZWFyKG5vdGlmaWNhdGlvbklkLCBfLm5vb3ApO1xuICAgICAgICAgICAgICAgIH0sIGRhdGEudGltZW91dCAqIDEwMDApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwcm9taXNlLnRoZW4oc2hvd0Nocm9tZU5vdGlmaWNhdGlvbklubmVyLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHNob3dDaHJvbWVOb3RpZmljYXRpb25Jbm5lcigpO1xuICAgIH0pO1xufVxuXG4vKipcbiAqIEZsYXR0ZW4gc2V0dGluZ3MgYnkgZ2V0dGluZyB0aGVpciB2YWx1ZXMgaW4gdGhpcyBtb21lbnRcbiAqIEByZXR1cm4ge09iamVjdH1cbiAqL1xuZnVuY3Rpb24gZ2V0RmxhdFNldHRpbmdzKCkge1xuICAgIHZhciBmbGF0U2V0dGluZ3MgPSB7fTtcbiAgICBTZXR0aW5nc01hbmFnZXIuZ2V0QXZhaWxhYmxlKCkuZm9yRWFjaChmdW5jdGlvbiAoa2V5KSB7XG4gICAgICAgIGZsYXRTZXR0aW5nc1trZXldID0gU2V0dGluZ3NNYW5hZ2VyW2tleV07XG4gICAgfSk7XG5cbiAgICByZXR1cm4gZmxhdFNldHRpbmdzO1xufVxuXG5mdW5jdGlvbiBsZWF2ZU9uZUFwcFdpbmRvd0luc3RhbmNlKG9wZW5JZk5vRXhpc3QpIHtcbiAgICB2YXIgYXBwV2luZG93cyA9IGNocm9tZS5hcHAud2luZG93LmdldEFsbCgpO1xuICAgIGFwcFdpbmRvd3MuZm9yRWFjaChmdW5jdGlvbiAod2luLCBpc05vdEZpcnN0KSB7XG4gICAgICAgIGlmIChpc05vdEZpcnN0KSB7XG4gICAgICAgICAgICB3aW4uY2xvc2UoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHdpbi5mb2N1cygpO1xuICAgICAgICAgICAgd2luLnNob3coKTtcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgaWYgKCFhcHBXaW5kb3dzLmxlbmd0aCAmJiBvcGVuSWZOb0V4aXN0KSB7XG4gICAgICAgIG9wZW5BcHBXaW5kb3coKTtcbiAgICB9XG59XG5cbi8vIG5vdGlmaWNhdGlvbiBjbGljayBoYW5kbGVyc1xuLy8gRklYTUUgcmVmYWN0b3Jcbi8qdmFyIG5vdGlmaWNhdGlvbkhhbmRsZXJzID0ge307XG5jaHJvbWUubm90aWZpY2F0aW9ucy5vbkNsaWNrZWQuYWRkTGlzdGVuZXIoZnVuY3Rpb24gbm90aWZpY2F0aW9uSGFuZGxlcihub3RpZmljYXRpb25JZCkge1xuICAgIHZhciBub3RpZmljYXRpb25DYWxsYmFjayA9IG5vdGlmaWNhdGlvbkhhbmRsZXJzW25vdGlmaWNhdGlvbklkXTtcblxuICAgIGlmIChub3RpZmljYXRpb25JZCA9PT0gXCJ0b2tlbkV4cGlyZWRSZXF1ZXN0XCIpIHtcbiAgICAgICAgbm90aWZpY2F0aW9uQ2FsbGJhY2sgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBDUEEuc2VuZEV2ZW50KFwiQXBwLURhdGFcIiwgXCJ0b2tlbkV4cGlyZWQgbm90aWZpY2F0aW9uIGNsaWNrXCIpO1xuXG4gICAgICAgICAgICAvLyBjbG9zZSBhbGwgYXBwIHdpbmRvd3NcbiAgICAgICAgICAgIHZhciBhcHBXaW5kb3dzID0gY2hyb21lLmFwcC53aW5kb3cuZ2V0QWxsKCk7XG4gICAgICAgICAgICBhcHBXaW5kb3dzLmZvckVhY2goZnVuY3Rpb24gKHdpbikge1xuICAgICAgICAgICAgICAgIHdpbi5jbG9zZSgpO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIG9wZW5BcHBXaW5kb3cobnVsbCwgdHJ1ZSk7XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgaWYgKCFub3RpZmljYXRpb25DYWxsYmFjaylcbiAgICAgICAgcmV0dXJuO1xuXG4gICAgY2hyb21lLm5vdGlmaWNhdGlvbnMuY2xlYXIobm90aWZpY2F0aW9uSWQsIF8ubm9vcCk7XG4gICAgbm90aWZpY2F0aW9uQ2FsbGJhY2soKTtcblxuICAgIGRlbGV0ZSBub3RpZmljYXRpb25IYW5kbGVyc1tub3RpZmljYXRpb25JZF07XG59KTtcblxuY2hyb21lLmFsYXJtcy5vbkFsYXJtLmFkZExpc3RlbmVyKGZ1bmN0aW9uIChhbGFybUluZm8pIHtcbiAgICBzd2l0Y2ggKGFsYXJtSW5mby5uYW1lKSB7XG4gICAgICAgIGNhc2UgXCJkYXl1c2VcIjpcbiAgICAgICAgICAgIENQQS5zZW5kRXZlbnQoXCJMaWZlY3ljbGVcIiwgXCJEYXl1c2VcIiwgXCJUb3RhbCB1c2Vyc1wiLCAxKTtcbiAgICAgICAgICAgIENQQS5zZW5kRXZlbnQoXCJMaWZlY3ljbGVcIiwgXCJEYXl1c2VcIiwgXCJBdXRob3JpemVkIHVzZXJzXCIsIEFjY291bnRzTWFuYWdlci5jdXJyZW50VXNlcklkID8gMSA6IDApO1xuXG4gICAgICAgICAgICB2YXIgYXBwSW5zdGFsbFRpbWUgPSBTdG9yYWdlTWFuYWdlci5nZXQoXCJhcHBfaW5zdGFsbF90aW1lXCIpO1xuICAgICAgICAgICAgaWYgKGFwcEluc3RhbGxUaW1lKSB7XG4gICAgICAgICAgICAgICAgdmFyIHRvdGFsRGF5c0xpdmUgPSBNYXRoLmZsb29yKChEYXRlLm5vdygpIC0gYXBwSW5zdGFsbFRpbWUpIC8gMTAwMCAvIDYwIC8gNjAgLyAyNCk7XG4gICAgICAgICAgICAgICAgQ1BBLnNlbmRFdmVudChcIkxpZmVjeWNsZVwiLCBcIkRheXVzZVwiLCBcIkFwcCBsaWZlIHRpbWVcIiwgdG90YWxEYXlzTGl2ZSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciByZXF1ZXN0c0xvZyA9IFN0b3JhZ2VNYW5hZ2VyLmdldChcInJlcXVlc3RzXCIsIHtjb25zdHJ1Y3RvcjogT2JqZWN0LCBzdHJpY3Q6IHRydWUsIGNyZWF0ZTogdHJ1ZX0pO1xuICAgICAgICAgICAgZm9yICh2YXIgdXJsIGluIHJlcXVlc3RzTG9nKSB7XG4gICAgICAgICAgICAgICAgQ1BBLnNlbmRFdmVudChcIkxpZmVjeWNsZVwiLCBcIkRheXVzZVwiLCBcIlJlcXVlc3RzOiBcIiArIHVybCwgcmVxdWVzdHNMb2dbdXJsXSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIFN0b3JhZ2VNYW5hZ2VyLnJlbW92ZShcInJlcXVlc3RzXCIpO1xuXG4gICAgICAgICAgICBjaHJvbWUuc3RvcmFnZS5sb2NhbC5nZXQoXCJkYXl1c2UuZGF1XCIsIGZ1bmN0aW9uIChyZWNvcmRzKSB7XG4gICAgICAgICAgICAgICAgdmFyIGlzQWN0aXZlVXNlciA9IHJlY29yZHNbXCJkYXl1c2UuZGF1XCJdO1xuICAgICAgICAgICAgICAgIGlmICghaXNBY3RpdmVVc2VyKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBDUEEuc2VuZEV2ZW50KFwiTGlmZWN5Y2xlXCIsIFwiREFVXCIpO1xuICAgICAgICAgICAgICAgIGNocm9tZS5zdG9yYWdlLmxvY2FsLnJlbW92ZShcImRheXVzZS5kYXVcIiwgXy5ub29wKTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBicmVhaztcblxuICAgICAgICBjYXNlIFwid2Vla3VzZVwiOlxuICAgICAgICAgICAgY2hyb21lLnN0b3JhZ2UubG9jYWwuZ2V0KFwid2Vla3VzZS53YXVcIiwgZnVuY3Rpb24gKHJlY29yZHMpIHtcbiAgICAgICAgICAgICAgICB2YXIgaXNBY3RpdmVVc2VyID0gcmVjb3Jkc1tcIndlZWt1c2Uud2F1XCJdO1xuICAgICAgICAgICAgICAgIGlmICghaXNBY3RpdmVVc2VyKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBDUEEuc2VuZEV2ZW50KFwiTGlmZWN5Y2xlXCIsIFwiV0FVXCIpO1xuICAgICAgICAgICAgICAgIGNocm9tZS5zdG9yYWdlLmxvY2FsLnJlbW92ZShcIndlZWt1c2Uud2F1XCIsIF8ubm9vcCk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgY2FzZSBcImZldGNobmV3c1wiOlxuICAgICAgICAgICAgUmVxTWFuYWdlci5hcGlNZXRob2QoXCJ3YWxsLmdldFwiLCB7XG4gICAgICAgICAgICAgICAgYWNjZXNzX3Rva2VuOiBudWxsLCAvLyDQvtCx0YrRj9Cy0LvQtdC90LjRjyDQv9C+0LvRg9GH0LDRgtGMINC+0LHRj9C30LDRgtC10LvRjNC90L4sINC/0L7RjdGC0L7QvNGDINGF0L7QtNC40Lwg0LHQtdC3INGC0L7QutC10L3QvtCyXG4gICAgICAgICAgICAgICAgb3duZXJfaWQ6ICgwIC0gQXBwLlZLX0FEVl9HUk9VUFswXSksXG4gICAgICAgICAgICAgICAgY291bnQ6IDUsXG4gICAgICAgICAgICAgICAgZmlsdGVyOiBcIm93bmVyXCJcbiAgICAgICAgICAgIH0sIGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgICAgICAgICAgdmFyIHNlZW5Qb3N0cyA9IFN0b3JhZ2VNYW5hZ2VyLmdldChcInZrZ3JvdXB3YWxsX3N5bmNlZF9wb3N0c1wiLCB7Y29uc3RydWN0b3I6IEFycmF5LCBzdHJpY3Q6IHRydWUsIGNyZWF0ZTogdHJ1ZX0pO1xuICAgICAgICAgICAgICAgIHZhciBwb3N0c1RvU3RvcmUgPSBbXTtcblxuICAgICAgICAgICAgICAgIGRhdGEucmVzcG9uc2Uuc2xpY2UoMSkuZm9yRWFjaChmdW5jdGlvbiAocG9zdCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoc2VlblBvc3RzLmluZGV4T2YocG9zdC5pZCkgIT09IC0xIHx8IEFwcC5WS19BRFZfR1JPVVBbMV0gPj0gcG9zdC5pZClcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcblxuICAgICAgICAgICAgICAgICAgICBwb3N0c1RvU3RvcmUucHVzaChwb3N0KTtcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIGlmIChwb3N0c1RvU3RvcmUubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIFN0b3JhZ2VNYW5hZ2VyLnNldChcInZrZ3JvdXB3YWxsX3N0b3JlZF9wb3N0c1wiLCBwb3N0c1RvU3RvcmUpO1xuXG4gICAgICAgICAgICAgICAgICAgIGNocm9tZS5ydW50aW1lLnNlbmRNZXNzYWdlKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFjdGlvbjogXCJuZXdXYWxsUG9zdHNcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIG5ld1Bvc3RzTnVtOiBwb3N0c1RvU3RvcmUubGVuZ3RoXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sIF8ubm9vcCk7XG5cbiAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgIGNhc2UgXCJhY3R1YWxpemVDaGF0c1wiOlxuICAgICAgICAgICAgRGF0YWJhc2VNYW5hZ2VyLmFjdHVhbGl6ZUNoYXREYXRlcygpO1xuICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgY2FzZSBcImFjdHVhbGl6ZUNvbnRhY3RzXCI6XG4gICAgICAgICAgICBEYXRhYmFzZU1hbmFnZXIuYWN0dWFsaXplQ29udGFjdHMoKS5jYXRjaChmdW5jdGlvbiAoZXJyTXNnKSB7XG4gICAgICAgICAgICAgICAgTG9nTWFuYWdlci5lcnJvcihlcnJNc2cpO1xuICAgICAgICAgICAgICAgIENQQS5zZW5kRXZlbnQoXCJDdXN0b20tRXJyb3JzXCIsIFwiRGF0YWJhc2UgZXJyb3JcIiwgZXJyTXNnKTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBicmVhaztcblxuICAgICAgICBjYXNlIFwicHJvcG9zZS1sYXVuY2hlclwiOlxuICAgICAgICAgICAgLy8gcHJvbW90ZSBWSyBPZmZsaW5lIGxhdW5jaGVyXG4gICAgICAgICAgICBjaHJvbWUubm90aWZpY2F0aW9ucyAmJiBjaHJvbWUubm90aWZpY2F0aW9ucy5jcmVhdGUoTWF0aC5yYW5kb20oKSArIFwiXCIsIHtcbiAgICAgICAgICAgICAgICB0eXBlOiBcImltYWdlXCIsXG4gICAgICAgICAgICAgICAgaW1hZ2VVcmw6IGNocm9tZS5ydW50aW1lLmdldFVSTChcInBpYy9sYXVuY2hlci5wbmdcIiksXG4gICAgICAgICAgICAgICAgdGl0bGU6IGNocm9tZS5pMThuLmdldE1lc3NhZ2UoXCJsYXVuY2hlck5vdGlmaWNhdGlvblRpdGxlXCIpLFxuICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGNocm9tZS5pMThuLmdldE1lc3NhZ2UoXCJsYXVuY2hlck5vdGlmaWNhdGlvbk1lc3NhZ2VcIiksXG4gICAgICAgICAgICAgICAgaWNvblVybDogY2hyb21lLnJ1bnRpbWUuZ2V0VVJMKFwicGljL2ljb240OC5wbmdcIiksXG4gICAgICAgICAgICAgICAgaXNDbGlja2FibGU6IGZhbHNlXG4gICAgICAgICAgICB9LCBmdW5jdGlvbiAoaWQpIHtcbiAgICAgICAgICAgICAgICBTb3VuZE1hbmFnZXIucGxheShcIm1lc3NhZ2VcIik7XG4gICAgICAgICAgICAgICAgQ1BBLnNlbmRFdmVudChcIkxpZmVjeWNsZVwiLCBcIkFjdGlvbnNcIiwgXCJJbnN0YWxsLk5vdGlmeUxhdW5jaGVyUHJvbW90ZS5TaG93XCIpO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgIGNhc2UgXCJzbGVlcGluZy1hd2FrZVwiOlxuICAgICAgICAgICAgLy8gZG8gbm90aGluZy4gdGhpcyBhbGFybSBpcyBqdXN0IGZvciB3YWtpbmcgdXAgYW4gYXBwXG4gICAgICAgICAgICBicmVhaztcbiAgICB9XG59KTtcblxuLy8gaW5zdGFsbCAmIHVwZGF0ZSBoYW5kbGluZ1xuY2hyb21lLnJ1bnRpbWUub25JbnN0YWxsZWQuYWRkTGlzdGVuZXIoZnVuY3Rpb24gKGRldGFpbHMpIHtcbiAgICB2YXIgYXBwTmFtZSA9IGNocm9tZS5ydW50aW1lLmdldE1hbmlmZXN0KCkubmFtZTtcbiAgICB2YXIgY3VycmVudFZlcnNpb24gPSBjaHJvbWUucnVudGltZS5nZXRNYW5pZmVzdCgpLnZlcnNpb247XG5cbiAgICBzd2l0Y2ggKGRldGFpbHMucmVhc29uKSB7XG4gICAgICAgIGNhc2UgXCJpbnN0YWxsXCI6XG4gICAgICAgICAgICBDUEEuY2hhbmdlUGVybWl0dGVkU3RhdGUodHJ1ZSk7XG4gICAgICAgICAgICBDUEEuc2VuZEV2ZW50KFwiTGlmZWN5Y2xlXCIsIFwiRGF5dXNlXCIsIFwiSW5zdGFsbFwiLCAxKTtcblxuICAgICAgICAgICAgTWlncmF0aW9uTWFuYWdlci5zdGFydChjdXJyZW50VmVyc2lvbik7XG5cbiAgICAgICAgICAgIC8vIHByb3Bvc2UgdG8gaW5zdGFsbCBWSyBPZmZsaW5lIGxhdW5jaGVyIGFmdGVyIDIgbWludXRlcyBvbiBpbmFjdGl2aXR5IGFmdGVyIGluc3RhbGxcbiAgICAgICAgICAgIC8vIGluYWN0aXZpdHkgbWVhbnMgbm90IG9wZW5pbmcgYXBwIHdpbmRvd1xuICAgICAgICAgICAgY2hyb21lLmFsYXJtcy5jcmVhdGUoXCJwcm9wb3NlLWxhdW5jaGVyXCIsIHtkZWxheUluTWludXRlczogMn0pO1xuICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgY2FzZSBcInVwZGF0ZVwiOlxuICAgICAgICAgICAgaWYgKGN1cnJlbnRWZXJzaW9uICE9PSBkZXRhaWxzLnByZXZpb3VzVmVyc2lvbikge1xuICAgICAgICAgICAgICAgIE1pZ3JhdGlvbk1hbmFnZXIuc3RhcnQoY3VycmVudFZlcnNpb24pO1xuICAgICAgICAgICAgICAgIENQQS5zZW5kRXZlbnQoXCJMaWZlY3ljbGVcIiwgXCJEYXl1c2VcIiwgXCJVcGdyYWRlXCIsIDEpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBicmVhaztcbiAgICB9XG5cbiAgICBjaHJvbWUuYWxhcm1zLmdldChcImRheXVzZVwiLCBmdW5jdGlvbiAoYWxhcm1JbmZvKSB7XG4gICAgICAgIGlmICghYWxhcm1JbmZvKSB7XG4gICAgICAgICAgICBjaHJvbWUuYWxhcm1zLmNyZWF0ZShcImRheXVzZVwiLCB7XG4gICAgICAgICAgICAgICAgZGVsYXlJbk1pbnV0ZXM6IDI0ICogNjAsXG4gICAgICAgICAgICAgICAgcGVyaW9kSW5NaW51dGVzOiAyNCAqIDYwXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgY2hyb21lLmFsYXJtcy5nZXQoXCJmZXRjaG5ld3NcIiwgZnVuY3Rpb24gKGFsYXJtSW5mbykge1xuICAgICAgICBpZiAoIWFsYXJtSW5mbykge1xuICAgICAgICAgICAgY2hyb21lLmFsYXJtcy5jcmVhdGUoXCJmZXRjaG5ld3NcIiwge1xuICAgICAgICAgICAgICAgIHBlcmlvZEluTWludXRlczogMjQgKiA2MCxcbiAgICAgICAgICAgICAgICBkZWxheUluTWludXRlczogMVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIGNocm9tZS5hbGFybXMuZ2V0KFwid2Vla3VzZVwiLCBmdW5jdGlvbiAoYWxhcm1JbmZvKSB7XG4gICAgICAgIGlmICghYWxhcm1JbmZvKSB7XG4gICAgICAgICAgICBjaHJvbWUuYWxhcm1zLmNyZWF0ZShcIndlZWt1c2VcIiwge1xuICAgICAgICAgICAgICAgIGRlbGF5SW5NaW51dGVzOiA3ICogMjQgKiA2MCxcbiAgICAgICAgICAgICAgICBwZXJpb2RJbk1pbnV0ZXM6IDcgKiAyNCAqIDYwXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgdmFyIHVuaW5zdGFsbFVybCA9IEFwcC5HT09EQllFX1BBR0VfVVJMICsgXCI/dmVyPVwiICsgY3VycmVudFZlcnNpb247XG4gICAgaWYgKHR5cGVvZiBjaHJvbWUucnVudGltZS5zZXRVbmluc3RhbGxVUkwgPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICBjaHJvbWUucnVudGltZS5zZXRVbmluc3RhbGxVUkwodW5pbnN0YWxsVXJsKTtcbiAgICB9XG5cbiAgICB2YXIgaW5zdGFsbERhdGVLZXkgPSBcImFwcF9pbnN0YWxsX3RpbWVcIjtcbiAgICBjaHJvbWUuc3RvcmFnZS5sb2NhbC5nZXQoaW5zdGFsbERhdGVLZXksIGZ1bmN0aW9uIChyZWNvcmRzKSB7XG4gICAgICAgIHJlY29yZHNbaW5zdGFsbERhdGVLZXldID0gcmVjb3Jkc1tpbnN0YWxsRGF0ZUtleV0gfHwgRGF0ZS5ub3coKTtcbiAgICAgICAgY2hyb21lLnN0b3JhZ2UubG9jYWwuc2V0KHJlY29yZHMpO1xuICAgIH0pO1xuXG4gICAgLy8gY3JlYXRlIHNsZWVwaW5nIGF3YWtlIGFsYXJtXG4gICAgY2hyb21lLmFsYXJtcy5jcmVhdGUoXCJzbGVlcGluZy1hd2FrZVwiLCB7cGVyaW9kSW5NaW51dGVzOiAxfSk7XG59KTtcblxuLy8gbGlzdGVuIHRvIG1lc3NhZ2VzIGZyb20gTGlzdGVuISBhcHBcbmNocm9tZS5ydW50aW1lLm9uTWVzc2FnZUV4dGVybmFsLmFkZExpc3RlbmVyKGZ1bmN0aW9uIChtc2csIHNlbmRlciwgc2VuZFJlc3BvbnNlKSB7XG4gICAgaWYgKHNlbmRlci5pZCA9PT0gQXBwLkxJU1RFTkFQUF9JRCAmJiBtc2cuYWN0aW9uID09PSBcImltcG9ydEF1dGhUb2tlblwiKSB7XG4gICAgICAgIGlmIChBY2NvdW50c01hbmFnZXIuY3VycmVudFVzZXJJZCkge1xuICAgICAgICAgICAgc2VuZFJlc3BvbnNlKHtcbiAgICAgICAgICAgICAgICB1c2VyX2lkOiBOdW1iZXIoQWNjb3VudHNNYW5hZ2VyLmN1cnJlbnRVc2VySWQpLFxuICAgICAgICAgICAgICAgIHRva2VuOiBBY2NvdW50c01hbmFnZXIubGlzdFtBY2NvdW50c01hbmFnZXIuY3VycmVudFVzZXJJZF0udG9rZW5cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc2VuZFJlc3BvbnNlKG51bGwpO1xuICAgICAgICB9XG4gICAgfSBlbHNlIGlmIChzZW5kZXIuaWQgPT09IEFwcC5MQVVOQ0hFUl9FWFRFTlNJT05fSUQgJiYgbXNnLmFjdGlvbiA9PT0gXCJsYXVuY2hcIikge1xuICAgICAgICBsZWF2ZU9uZUFwcFdpbmRvd0luc3RhbmNlKHRydWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHNlbmRSZXNwb25zZShmYWxzZSk7XG4gICAgfVxufSk7XG5cbmZ1bmN0aW9uIG9wZW5BcHBXaW5kb3coZXZ0LCB0b2tlbkV4cGlyZWQpIHtcbiAgICBjaHJvbWUuYXBwLndpbmRvdy5jcmVhdGUoXCJtYWluLmh0bWxcIiwge1xuICAgICAgICBpZDogdXVpZCgpLFxuICAgICAgICBpbm5lckJvdW5kczoge1xuICAgICAgICAgICAgbWluV2lkdGg6IDEwMDAsXG4gICAgICAgICAgICBtaW5IZWlnaHQ6IDcwMFxuICAgICAgICB9XG4gICAgfSwgZnVuY3Rpb24gKHdpbikge1xuICAgICAgICAvLyBmbGF0dGVuIHNldHRpbmdzIGJ5IGdldHRpbmcgdGhlaXIgdmFsdWVzIGluIHRoaXMgbW9tZW50XG4gICAgICAgIHdpbi5jb250ZW50V2luZG93LlNldHRpbmdzID0gZ2V0RmxhdFNldHRpbmdzKCk7XG5cbiAgICAgICAgLy8gcGFzcyBjdXJyZW50IHVzZXIgZGF0YVxuICAgICAgICB3aW4uY29udGVudFdpbmRvdy5BY2NvdW50ID0ge1xuICAgICAgICAgICAgY3VycmVudFVzZXJJZDogQWNjb3VudHNNYW5hZ2VyLmN1cnJlbnRVc2VySWQsXG4gICAgICAgICAgICBjdXJyZW50VXNlckZpbzogQWNjb3VudHNNYW5hZ2VyLmN1cnJlbnQgPyBBY2NvdW50c01hbmFnZXIuY3VycmVudC5maW8gOiBudWxsLFxuICAgICAgICAgICAgdG9rZW5FeHBpcmVkOiB0b2tlbkV4cGlyZWRcbiAgICAgICAgfTtcbiAgICB9KTtcblxuICAgIGNocm9tZS5hbGFybXMuY2xlYXIoXCJwcm9wb3NlLWxhdW5jaGVyXCIsIF8ubm9vcCk7XG59XG5cbi8vIGFwcCBsaWZlY3ljbGVcbmNocm9tZS5hcHAucnVudGltZS5vbkxhdW5jaGVkLmFkZExpc3RlbmVyKG9wZW5BcHBXaW5kb3cpO1xuY2hyb21lLmFwcC5ydW50aW1lLm9uUmVzdGFydGVkLmFkZExpc3RlbmVyKG9wZW5BcHBXaW5kb3cpOyovXG5cblByb21pc2UuYWxsKFtcbiAgICBTdG9yYWdlTWFuYWdlci5sb2FkKCksXG4gICAgRGF0YWJhc2VNYW5hZ2VyLmluaXRNZXRhKClcbl0pLnRoZW4oZnVuY3Rpb24gcmVhZHlUb0dvKGVycikge1xuICAgIFNldHRpbmdzTWFuYWdlci5pbml0KCk7XG4gICAgTG9nTWFuYWdlci5jb25maWcoXCJBcHAgc3RhcnRlZFwiKTtcblxuICAgIHZhciBzeW5jaW5nRGF0YSA9IHt9LCAvLyDQvtCx0YrQtdC60YIg0YEg0LrQu9GO0YfQsNC80LggaW5ib3gsIHNlbnQg0LggY29udGFjdHMgLSDRgdGH0LXRgtGH0LjQuiDQvNCw0LrRgdC40LzQsNC70YzQvdGL0YUg0YfQuNGB0LXQu1xuICAgICAgICB1aWRzUHJvY2Vzc2luZyA9IHt9OyAvLyDQvtCx0YrQtdC60YIg0LjQtyDRjdC70LXQvNC10L3RgtC+0LIg0LLQuNC00LAge2N1cnJlbnRVc2VySWQxOiB7dWlkMTogdHJ1ZSwgdWlkMjogdHJ1ZSwgdWlkMzogdHJ1ZX0sIC4uLn1cblxuICAgIHZhciBjbGVhclN5bmNpbmdEYXRhQ291bnRlcnMgPSBmdW5jdGlvbih1c2VySWQpIHtcbiAgICAgICAgaWYgKHN5bmNpbmdEYXRhW3VzZXJJZF0gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgc3luY2luZ0RhdGFbdXNlcklkXS5jb250YWN0c1swXSA9IDA7XG4gICAgICAgICAgICBzeW5jaW5nRGF0YVt1c2VySWRdLmNvbnRhY3RzWzFdID0gMDtcblxuICAgICAgICAgICAgc3luY2luZ0RhdGFbdXNlcklkXS5pbmJveFswXSA9IDA7XG4gICAgICAgICAgICBzeW5jaW5nRGF0YVt1c2VySWRdLmluYm94WzFdID0gMDtcblxuICAgICAgICAgICAgc3luY2luZ0RhdGFbdXNlcklkXS5zZW50WzBdID0gMDtcbiAgICAgICAgICAgIHN5bmNpbmdEYXRhW3VzZXJJZF0uc2VudFsxXSA9IDA7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzeW5jaW5nRGF0YVt1c2VySWRdID0ge1xuICAgICAgICAgICAgICAgIFwiY29udGFjdHNcIiA6IFswLCAwXSwgLy8gW3RvdGFsLCBjdXJyZW50XVxuICAgICAgICAgICAgICAgIFwiaW5ib3hcIiA6IFswLCAwXSxcbiAgICAgICAgICAgICAgICBcInNlbnRcIiA6IFswLCAwXVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgIH07XG5cblxuICAgIC8vINGD0YHRgtCw0L3QsNCy0LvQuNCy0LDQtdC8INC+0LHRgNCw0LHQvtGC0YfQuNC60Lggb2ZmbGluZS3RgdC+0LHRi9GC0LjQuVxuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKFwib25saW5lXCIsIGZ1bmN0aW9uIChlKSB7XG4gICAgICAgIGNocm9tZS5ydW50aW1lLnNlbmRNZXNzYWdlKHtcImFjdGlvblwiIDogXCJvbmxpbmVTdGF0dXNDaGFuZ2VkXCIsIFwic3RhdHVzXCIgOiBcIm9ubGluZVwifSk7XG5cbiAgICAgICAgLy8g0L3QsCDRgdCw0LzQvtC8INC00LXQu9C1INGB0LXRgtGMINC80L7QttC10YIg0LHRi9GC0YwsINCwINGB0LLRj9C30Lgg0YEg0LjQvdGC0LXRgNC90LXRgtC+0LwgLSDQvdC10YJcbiAgICAgICAgaWYgKEFjY291bnRzTWFuYWdlci5jdXJyZW50VXNlcklkKSB7XG4gICAgICAgICAgICBzdGFydFVzZXJTZXNzaW9uKCk7XG4gICAgICAgIH1cbiAgICB9LCBmYWxzZSk7XG5cbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcIm9mZmxpbmVcIiwgZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgUmVxTWFuYWdlci5hYm9ydEFsbCgpO1xuICAgICAgICBjaHJvbWUucnVudGltZS5zZW5kTWVzc2FnZSh7XCJhY3Rpb25cIiA6IFwib25saW5lU3RhdHVzQ2hhbmdlZFwiLCBcInN0YXR1c1wiIDogXCJvZmZsaW5lXCJ9KTtcbiAgICB9LCBmYWxzZSk7XG5cbiAgICB2YXIgbG9uZ1BvbGxFdmVudHNSZWdpc3RyYXIgPSB7XG4gICAgICAgIGluaXQ6IGZ1bmN0aW9uKGN1cnJlbnRVc2VySWQpIHtcbiAgICAgICAgICAgIC8vINC+0LHRgNGL0LLQsNC10LwgTFAt0LfQsNC/0YDQvtGBINGB0YLQsNGA0L7Qs9C+INC/0L7Qu9GM0LfQvtCy0LDRgtC10LvRj1xuICAgICAgICAgICAgaWYgKHRoaXMuX2xvbmdQb2xsWGhySWRzW2N1cnJlbnRVc2VySWRdKSB7XG4gICAgICAgICAgICAgICAgUmVxTWFuYWdlci5hYm9ydCh0aGlzLl9sb25nUG9sbFhocklkc1tjdXJyZW50VXNlcklkXSk7XG4gICAgICAgICAgICAgICAgZGVsZXRlIHRoaXMuX2xvbmdQb2xsWGhySWRzW2N1cnJlbnRVc2VySWRdO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBbSVNTVUVTNl0g0YDQtdGI0LXQvdC40LUg0L/RgNC+0LHQu9C10LzRi1xuICAgICAgICAgICAgdGhpcy5fbG9uZ1BvbGxYaHJJZHNbY3VycmVudFVzZXJJZF0gPSBudWxsO1xuICAgICAgICAgICAgdGhpcy5fZ2V0Q3JlZGVudGlhbHMoY3VycmVudFVzZXJJZCk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgX29uTG9hZDogZnVuY3Rpb24oY3VycmVudFVzZXJJZCwgcmVzKSB7XG4gICAgICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgICAgICAgIGlmIChyZXMuZmFpbGVkICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICBpZiAocmVzLmZhaWxlZCA9PT0gMikgeyAvLyDQutC70Y7RhyDRg9GB0YLQsNGA0LXQu1xuICAgICAgICAgICAgICAgICAgICBMb2dNYW5hZ2VyLndhcm4oXCJMb25nUG9sbCBzZXJ2ZXIga2V5IGlzIG5vdyBvYnNvbGV0ZS4gUmUtcmVxdWVzdGluZyBhIG5ldyBrZXkuLi5cIiArIFwiIFtcIiArIHRoaXMuX2xvbmdQb2xsWGhySWRzW2N1cnJlbnRVc2VySWRdICsgXCJdXCIpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIExvZ01hbmFnZXIuZXJyb3IoXCJMb25nUG9sbCBzZXJ2ZXIgcmVxdWVzdCBmYWlsZWQ6IFwiICsgSlNPTi5zdHJpbmdpZnkocmVzKSArIFwiIFtcIiArIHRoaXMuX2xvbmdQb2xsWGhySWRzW2N1cnJlbnRVc2VySWRdICsgXCJdXCIpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGRlbGV0ZSB0aGlzLl9sb25nUG9sbFhocklkc1tjdXJyZW50VXNlcklkXTtcblxuICAgICAgICAgICAgICAgIHRoaXMuaW5pdChjdXJyZW50VXNlcklkKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIExvZ01hbmFnZXIuaW5mbyhKU09OLnN0cmluZ2lmeShyZXMpKTtcblxuICAgICAgICAgICAgcmVzLnVwZGF0ZXMuZm9yRWFjaChmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgICAgICAgICAgIHN3aXRjaCAoZGF0YVswXSkge1xuICAgICAgICAgICAgICAgICAgICBjYXNlIDIgOlxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGRhdGFbMl0gJiAxMjgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDQodC+0L7QsdGJ0LXQvdC40LUg0YPQtNCw0LvQtdC90L4g0L3QsCDRgdCw0LnRgtC1LlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vINCyINC40LTQtdCw0LvQtSDQvdGD0LbQvdC+INC80LXQvdGP0YLRjCDRgdC+0L7RgtCy0LXRgtGB0YLQstGD0Y7RidC40Lkg0LjQvdC00LXQutGBINC80LDRgdGB0LjQstCwIFwibWVzc2FnZXNHb3RcIiDQtNC70Y8g0LrQvtGA0YDQtdC60YLQvdC+0Lkg0YDQsNCx0L7RgtGLIG1haWxTeW5jXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g0JIg0YLQviDQttC1INCy0YDQtdC80Y8g0Lgg0LTQu9GPINC40YHRhdC+0LTRj9GJ0LjRhSwg0Lgg0LTQu9GPINCy0YXQvtC00Y/RidC40YUg0YHQvtC+0LHRidC10L3QuNC5IGRhdGFbMl0gPT09IDEyOCwg0Lgg0YfRgtC+0LHRiyDQvtC/0YDQtdC00LXQu9C40YLRjCDQstGF0L7QtNGP0YnQtdC1INGB0L7QvtCx0YnQtdC90LjQtSDQuNC70Lgg0L3QtdGCLCDQvdC10L7QsdGF0L7QtNC40LzQviDQtNC10LvQsNGC0Ywg0LTQvtC/LiDQt9Cw0L/RgNC+0YEuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g0JfQsCDRjdGC0L4g0LLRgNC10LzRjyDQvNC+0LbQtdGCINC/0YDQvtC40LfQvtC50YLQuCDQvtGI0LjQsdC60LAgZHVwbGljYXRlIGtleVxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChkYXRhWzJdICYgOCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vINGB0L7QvtCx0YnQtdC90LjQtSDQvtGC0LzQtdGH0LXQvdC+INC60LDQuiDQstCw0LbQvdC+0LVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBEYXRhYmFzZU1hbmFnZXIubWFya01lc3NhZ2VXaXRoVGFnKGRhdGFbMV0sIFwiaW1wb3J0YW50XCIsIF8ubm9vcCwgZnVuY3Rpb24gKGlzRGF0YWJhc2VFcnJvciwgZXJyTXNnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpc0RhdGFiYXNlRXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIExvZ01hbmFnZXIuZXJyb3IoZXJyTXNnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIENQQS5zZW5kRXZlbnQoXCJDdXN0b20tRXJyb3JzXCIsIFwiRGF0YWJhc2UgZXJyb3JcIiwgZXJyTXNnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChkYXRhWzJdICYgMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIERhdGFiYXNlTWFuYWdlci5tYXJrQXNVbnJlYWQoZGF0YVsxXSwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjaHJvbWUucnVudGltZS5zZW5kTWVzc2FnZSh7XCJhY3Rpb25cIiA6IFwibXNnUmVhZFN0YXR1c0NoYW5nZVwiLCBcInJlYWRcIiA6IGZhbHNlLCBcImlkXCIgOiBkYXRhWzFdfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSwgZnVuY3Rpb24gKGVyck1zZykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBMb2dNYW5hZ2VyLmVycm9yKGVyck1zZyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIENQQS5zZW5kRXZlbnQoXCJDdXN0b20tRXJyb3JzXCIsIFwiRGF0YWJhc2UgZXJyb3JcIiwgZXJyTXNnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgICAgICAgICAgY2FzZSAzIDpcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChkYXRhWzJdICYgMTI4KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g0YHQvtC+0LHRidC10L3QuNC1INCy0L7RgdGB0YLQsNC90L7QstC70LXQvdC+INC90LAg0YHQsNC50YLQtVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIERhdGFiYXNlTWFuYWdlci51bm1hcmtNZXNzYWdlV2l0aFRhZyhkYXRhWzFdLCBcInRyYXNoXCIsIF8ubm9vcCwgZnVuY3Rpb24gKGlzRGF0YWJhc2VFcnJvciwgZXJyTXNnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpc0RhdGFiYXNlRXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIExvZ01hbmFnZXIuZXJyb3IoZXJyTXNnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIENQQS5zZW5kRXZlbnQoXCJDdXN0b20tRXJyb3JzXCIsIFwiRGF0YWJhc2UgZXJyb3JcIiwgZXJyTXNnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChkYXRhWzJdICYgOCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vINGB0L7QvtCx0YnQtdC90LjQtSDQsdC+0LvRjNGI0LUg0L3QtSDQstCw0LbQvdC+0LVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBEYXRhYmFzZU1hbmFnZXIudW5tYXJrTWVzc2FnZVdpdGhUYWcoZGF0YVsxXSwgXCJpbXBvcnRhbnRcIiwgXy5ub29wLCBmdW5jdGlvbiAoaXNEYXRhYmFzZUVycm9yLCBlcnJNc2cpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlzRGF0YWJhc2VFcnJvcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgTG9nTWFuYWdlci5lcnJvcihlcnJNc2cpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgQ1BBLnNlbmRFdmVudChcIkN1c3RvbS1FcnJvcnNcIiwgXCJEYXRhYmFzZSBlcnJvclwiLCBlcnJNc2cpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGRhdGFbMl0gJiAxKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgRGF0YWJhc2VNYW5hZ2VyLm1hcmtBc1JlYWQoZGF0YVsxXSwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjaHJvbWUucnVudGltZS5zZW5kTWVzc2FnZSh7XCJhY3Rpb25cIiA6IFwibXNnUmVhZFN0YXR1c0NoYW5nZVwiLCBcInJlYWRcIiA6IHRydWUsIFwiaWRcIiA6IGRhdGFbMV19KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LCBmdW5jdGlvbiAoZXJyTXNnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIExvZ01hbmFnZXIuZXJyb3IoZXJyTXNnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgQ1BBLnNlbmRFdmVudChcIkN1c3RvbS1FcnJvcnNcIiwgXCJEYXRhYmFzZSBlcnJvclwiLCBlcnJNc2cpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgICAgICAgICBjYXNlIDQgOlxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHVpZCA9IChkYXRhWzddLmZyb20gIT09IHVuZGVmaW5lZCkgPyBkYXRhWzddLmZyb20gOiBkYXRhWzNdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1haWxUeXBlID0gKGRhdGFbMl0gJiAyKSA/IFwic2VudFwiIDogXCJpbmJveFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9uVXNlckRhdGFSZWFkeTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgc3luY2luZ0RhdGFbY3VycmVudFVzZXJJZF1bbWFpbFR5cGVdWzFdICs9IDE7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIG9uVXNlckRhdGFSZWFkeSA9IGZ1bmN0aW9uKHVzZXJEYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGF0dGFjaG1lbnRzID0gW107XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIG1zZ0RhdGEgPSB7fTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGZpZWxkIGluIGRhdGFbN10pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIG1hdGNoZXMgPSBmaWVsZC5tYXRjaCgvXmF0dGFjaChbXFxkXSspJC8pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIW1hdGNoZXMpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgYXR0YWNoVHlwZSA9IGRhdGFbN11bXCJhdHRhY2hcIiArIG1hdGNoZXNbMV0gKyBcIl90eXBlXCJdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhdHRhY2htZW50cy5wdXNoKFthdHRhY2hUeXBlXS5jb25jYXQoZGF0YVs3XVtmaWVsZF0uc3BsaXQoXCJfXCIpKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGRhdGFbN10uZ2VvICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXR0YWNobWVudHMucHVzaChbXCJnZW9wb2ludFwiLCBkYXRhWzddLmdlb10pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1zZ0RhdGEubWlkID0gZGF0YVsxXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtc2dEYXRhLnVpZCA9IHVzZXJEYXRhLnVpZDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtc2dEYXRhLmRhdGUgPSBkYXRhWzRdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1zZ0RhdGEudGl0bGUgPSBkYXRhWzVdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1zZ0RhdGEuYm9keSA9IGRhdGFbNl07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbXNnRGF0YS5yZWFkX3N0YXRlID0gKGRhdGFbMl0gJiAxKSA/IDAgOiAxO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1zZ0RhdGEuYXR0YWNobWVudHMgPSBhdHRhY2htZW50cztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtc2dEYXRhLmNoYXRfaWQgPSAoZGF0YVs3XS5mcm9tICE9PSB1bmRlZmluZWQpID8gZGF0YVszXSAtIDIwMDAwMDAwMDAgOiAwO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1zZ0RhdGEudGFncyA9IFttYWlsVHlwZV07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbXNnRGF0YS5lbW9qaSA9IGRhdGFbN10uZW1vamkgPyAxIDogMDtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhdHRhY2htZW50cy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbXNnRGF0YS50YWdzLnB1c2goXCJhdHRhY2htZW50c1wiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBEYXRhYmFzZU1hbmFnZXIuaW5zZXJ0TWVzc2FnZXMoY3VycmVudFVzZXJJZCwgW21zZ0RhdGFdLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vINC+0LHQvdC+0LLQu9GP0LXQvCDRhNGA0L7QvdGC0LXQvdC0XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNocm9tZS5ydW50aW1lLnNlbmRNZXNzYWdlKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFjdGlvbjogXCJtZXNzYWdlUmVjZWl2ZWRcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGE6IG1zZ0RhdGEsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB1c2VyZGF0YTogdXNlckRhdGFcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG1haWxUeXBlID09PSBcImluYm94XCIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBhdmF0YXIgPSB1c2VyRGF0YS5waG90byB8fCBjaHJvbWUucnVudGltZS5nZXRVUkwoXCJwaWMvcXVlc3Rpb25fdGguZ2lmXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2hvd05vdGlmaWNhdGlvbihhdmF0YXIsIHVzZXJEYXRhLnVpZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiBzaG93Tm90aWZpY2F0aW9uKGF2YXRhclVybCwgdWlkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoU2V0dGluZ3NNYW5hZ2VyLk5vdGlmaWNhdGlvbnNUaW1lID09PSAwLyogfHwgU2V0dGluZ3NNYW5hZ2VyLlNob3dXaGVuVksgPT09IDAqLylcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNob3dDaHJvbWVOb3RpZmljYXRpb24oe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVpZDogdWlkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRpdGxlOiB1c2VyRGF0YS5maXJzdF9uYW1lICsgXCIgXCIgKyB1c2VyRGF0YS5sYXN0X25hbWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogbXNnRGF0YS5ib2R5LnJlcGxhY2UoLzxicj4vZ20sIFwiXFxuXCIpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGljb246IGF2YXRhclVybCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzb3VuZDogXCJtZXNzYWdlXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGltZW91dDogKFNldHRpbmdzTWFuYWdlci5Ob3RpZmljYXRpb25zVGltZSA9PT0gMTIpID8gdW5kZWZpbmVkIDogU2V0dGluZ3NNYW5hZ2VyLk5vdGlmaWNhdGlvbnNUaW1lICogNSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvbmNsaWNrOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIExvZ01hbmFnZXIuY29uZmlnKFwiQ2xpY2tlZCBub3RpZmljYXRpb24gd2l0aCBtZXNzYWdlICNcIiArIG1zZ0RhdGEubWlkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGVhdmVPbmVBcHBXaW5kb3dJbnN0YW5jZSh0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgTG9nTWFuYWdlci5jb25maWcoXCJPcGVuIG5vdGlmaWNhdGlvbiB3aXRoIG1lc3NhZ2UgI1wiICsgbXNnRGF0YS5taWQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBEYXRhYmFzZU1hbmFnZXIuZ2V0Q29udGFjdEJ5SWQoY3VycmVudFVzZXJJZCwgdWlkLCBvblVzZXJEYXRhUmVhZHksIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDRgtC10L7RgNC10YLQuNGH0LXRgdC60Lgg0LzQvtC20LXRgiDQuNC30LzQtdC90LjRgtGM0YHRjyBjdXJyZW50VXNlcklkXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGN1cnJlbnRVc2VySWQgPT09IEFjY291bnRzTWFuYWdlci5jdXJyZW50VXNlcklkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGdldFVzZXJQcm9maWxlKGN1cnJlbnRVc2VySWQsIHBhcnNlSW50KHVpZCwgMTApLCBvblVzZXJEYXRhUmVhZHkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgICAgICAgICBjYXNlIDggOiAvLyDQv9C+0LvRjNC30L7QstCw0YLQtdC70YwgLWRhdGFbMV0g0L7QvdC70LDQudC9XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoU2V0dGluZ3NNYW5hZ2VyLlNob3dPbmxpbmUgPT09IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjaHJvbWUucnVudGltZS5zZW5kTWVzc2FnZSh7XCJhY3Rpb25cIiA6IFwiY29udGFjdE9ubGluZVN0YXR1c1wiLCBcInVpZFwiIDogLWRhdGFbMV0sIFwib25saW5lXCIgOiB0cnVlfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgOSA6IC8vINC/0L7Qu9GM0LfQvtCy0LDRgtC10LvRjCAtZGF0YVsxXSDQvtGE0YTQu9Cw0LnQvSAo0L3QsNC20LDQuyDQutC90L7Qv9C60YMgXCLQstGL0LnRgtC4XCIg0LXRgdC70LggZGF0YVsyXSA9PT0gMCwg0LjQvdCw0YfQtSDQv9C+INGC0LDQudC80LDRg9GC0YMpXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoU2V0dGluZ3NNYW5hZ2VyLlNob3dPbmxpbmUgPT09IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjaHJvbWUucnVudGltZS5zZW5kTWVzc2FnZSh7XCJhY3Rpb25cIiA6IFwiY29udGFjdE9ubGluZVN0YXR1c1wiLCBcInVpZFwiIDogLWRhdGFbMV0sIFwib25saW5lXCIgOiBmYWxzZX0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgICAgICAgICBjYXNlIDYxIDogLy8g0L/QvtC70YzQt9C+0LLQsNGC0LXQu9GMIGRhdGFbMV0g0L3QsNGH0LDQuyDQvdCw0LHQuNGA0LDRgtGMINGC0LXQutGB0YIg0LIg0LTQuNCw0LvQvtCz0LVcbiAgICAgICAgICAgICAgICAgICAgY2FzZSA2MiA6IC8vINC/0L7Qu9GM0LfQvtCy0LDRgtC10LvRjCBkYXRhWzFdINC90LDRh9Cw0Lsg0L3QsNCx0LjRgNCw0YLRjCDRgtC10LrRgdGCINCyINCx0LXRgdC10LTQtSBkYXRhWzJdXG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0IDpcbiAgICAgICAgICAgICAgICAgICAgICAgIExvZ01hbmFnZXIuaW5mbyhbZGF0YVswXSwgZGF0YV0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBpZiAoQWNjb3VudHNNYW5hZ2VyLmN1cnJlbnRVc2VySWQgPT09IGN1cnJlbnRVc2VySWQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9sb25nUG9sbERhdGFbY3VycmVudFVzZXJJZF0udHMgPSByZXMudHM7XG4gICAgICAgICAgICAgICAgdGhpcy5fbG9uZ1BvbGxJbml0KGN1cnJlbnRVc2VySWQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIF9vbkVycm9yOiBmdW5jdGlvbihjdXJyZW50VXNlcklkLCBlcnJvckNvZGUsIGVycm9yRGF0YSkge1xuICAgICAgICAgICAgZGVsZXRlIHRoaXMuX2xvbmdQb2xsWGhySWRzW2N1cnJlbnRVc2VySWRdO1xuICAgICAgICAgICAgaWYgKGVycm9yQ29kZSA9PT0gUmVxTWFuYWdlci5BQk9SVClcbiAgICAgICAgICAgICAgICByZXR1cm47XG5cbiAgICAgICAgICAgIHRoaXMuaW5pdChjdXJyZW50VXNlcklkKTtcblxuICAgICAgICAgICAgaWYgKEFjY291bnRzTWFuYWdlci5jdXJyZW50VXNlcklkID09PSBjdXJyZW50VXNlcklkKSB7XG4gICAgICAgICAgICAgICAgbWFpbFN5bmMoY3VycmVudFVzZXJJZCwgXCJpbmJveFwiKTtcbiAgICAgICAgICAgICAgICBtYWlsU3luYyhjdXJyZW50VXNlcklkLCBcInNlbnRcIik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG5cbiAgICAgICAgX2dldENyZWRlbnRpYWxzOiBmdW5jdGlvbihjdXJyZW50VXNlcklkKSB7XG4gICAgICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgICAgICAgIFJlcU1hbmFnZXIuYXBpTWV0aG9kKFwibWVzc2FnZXMuZ2V0TG9uZ1BvbGxTZXJ2ZXJcIiwgZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgICAgICAgICBpZiAoQWNjb3VudHNNYW5hZ2VyLmN1cnJlbnRVc2VySWQgIT09IGN1cnJlbnRVc2VySWQpXG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcblxuICAgICAgICAgICAgICAgIHNlbGYuX2xvbmdQb2xsRGF0YVtjdXJyZW50VXNlcklkXSA9IGRhdGEucmVzcG9uc2U7XG4gICAgICAgICAgICAgICAgc2VsZi5fbG9uZ1BvbGxJbml0KGN1cnJlbnRVc2VySWQpO1xuICAgICAgICAgICAgfSwgZnVuY3Rpb24gKGVyckNvZGUpIHtcbiAgICAgICAgICAgICAgICBkZWxldGUgc2VsZi5fbG9uZ1BvbGxYaHJJZHNbY3VycmVudFVzZXJJZF07XG5cbiAgICAgICAgICAgICAgICBpZiAoZXJyQ29kZSA9PT0gUmVxTWFuYWdlci5BQ0NFU1NfREVOSUVEKSB7XG4gICAgICAgICAgICAgICAgICAgIGNocm9tZS5ydW50aW1lLnNlbmRNZXNzYWdlKHthY3Rpb246IFwidG9rZW5FeHBpcmVkXCJ9KTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBzd2l0Y2ggKGVyckNvZGUpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBSZXFNYW5hZ2VyLkFCT1JUOlxuICAgICAgICAgICAgICAgICAgICBjYXNlIFJlcU1hbmFnZXIuQUNDRVNTX0RFTklFRDpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB3aW5kb3cuc2V0VGltZW91dChzZWxmLmluaXQuYmluZChzZWxmKSwgNTAwMCwgY3VycmVudFVzZXJJZCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSxcblxuICAgICAgICBfbG9uZ1BvbGxJbml0OiBmdW5jdGlvbihjdXJyZW50VXNlcklkKSB7XG4gICAgICAgICAgICB2YXIgZG9tYWluID0gdGhpcy5fbG9uZ1BvbGxEYXRhW2N1cnJlbnRVc2VySWRdLnNlcnZlci5yZXBsYWNlKFwidmtvbnRha3RlLnJ1XCIsIFwidmsuY29tXCIpO1xuXG4gICAgICAgICAgICB0aGlzLl9sb25nUG9sbFhocklkc1tjdXJyZW50VXNlcklkXSA9IFJlcU1hbmFnZXIuZm9yY2VVcmxHZXQoXCJodHRwczovL1wiICsgZG9tYWluLCB7XG4gICAgICAgICAgICAgICAgXCJhY3RcIiA6IFwiYV9jaGVja1wiLFxuICAgICAgICAgICAgICAgIFwia2V5XCIgOiB0aGlzLl9sb25nUG9sbERhdGFbY3VycmVudFVzZXJJZF0ua2V5LFxuICAgICAgICAgICAgICAgIFwidHNcIiA6IHRoaXMuX2xvbmdQb2xsRGF0YVtjdXJyZW50VXNlcklkXS50cyxcbiAgICAgICAgICAgICAgICBcIndhaXRcIiA6IDI1LFxuICAgICAgICAgICAgICAgIFwibW9kZVwiIDogMixcbiAgICAgICAgICAgICAgICBcInRpbWVvdXRcIiA6IDMwXG4gICAgICAgICAgICB9LCB0aGlzLl9vbkxvYWQuYmluZCh0aGlzLCBjdXJyZW50VXNlcklkKSwgdGhpcy5fb25FcnJvci5iaW5kKHRoaXMsIGN1cnJlbnRVc2VySWQpKTtcbiAgICAgICAgfSxcblxuICAgICAgICBfbG9uZ1BvbGxEYXRhOiB7fSxcbiAgICAgICAgX2xvbmdQb2xsWGhySWRzOiB7fSxcbiAgICAgICAgX3RhZ3M6IHt9XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqINCX0LDQv9GA0L7RgSDQuiBBUEkg0JLQmtC+0L3RgtCw0LrRgtC1INC30LAg0L/QvtC70YzQt9C+0LLQsNGC0LXQu9GP0LzQuCDQuCDQv9C+0YHQu9C10LTRg9GO0YnQsNGPINC30LDQv9C40YHRjCDQuNGFINCyINCR0JRcbiAgICAgKlxuICAgICAqIEBwYXJhbSB7TnVtYmVyfSBjdXJyZW50VXNlcklkXG4gICAgICogQHBhcmFtIHtOdW1iZXJ9IHVpZFxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrINGE0YPQvdC60YbQuNGPLCDQsiDQutC+0YLQvtGA0YPRjiDQv9C10YDQtdC00LDQtdGC0YHRjyDQstC10YHRjCDQvtCx0YrQtdC60YIt0L7RgtCy0LXRgiDQvtGCIEFQSSDQktCa0L7QvdGC0LDQutGC0LVcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBnZXRVc2VyUHJvZmlsZShjdXJyZW50VXNlcklkLCB1aWQsIGNhbGxiYWNrKSB7XG4gICAgICAgIHZhciB0b2tlbkZvclJlcXVlc3QgPSBBY2NvdW50c01hbmFnZXIubGlzdFtjdXJyZW50VXNlcklkXS50b2tlbjtcblxuICAgICAgICB1aWRzUHJvY2Vzc2luZ1tjdXJyZW50VXNlcklkXSA9IHVpZHNQcm9jZXNzaW5nW2N1cnJlbnRVc2VySWRdIHx8IHt9O1xuICAgICAgICBjYWxsYmFjayA9IGNhbGxiYWNrIHx8IF8ubm9vcDtcblxuICAgICAgICAvLyDQv9GA0L7QstC10YDRj9C10LwgdWlkINC90LAg0L3QsNGF0L7QttC00LXQvdC40LUg0LIg0YHQv9C40YHQutC1INC+0LHRgNCw0LHQsNGC0YvQstCw0LXQvNGL0YVcbiAgICAgICAgaWYgKHVpZHNQcm9jZXNzaW5nW2N1cnJlbnRVc2VySWRdW3VpZF0pIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIFJlcU1hbmFnZXIuYXBpTWV0aG9kKFwidXNlcnMuZ2V0XCIsIHtcbiAgICAgICAgICAgIHVpZHM6IFN0cmluZyh1aWQpLFxuICAgICAgICAgICAgZmllbGRzOiBcImZpcnN0X25hbWUsbGFzdF9uYW1lLHNleCxkb21haW4sYmRhdGUscGhvdG8sY29udGFjdHNcIixcbiAgICAgICAgICAgIGFjY2Vzc190b2tlbjogdG9rZW5Gb3JSZXF1ZXN0XG4gICAgICAgIH0sIGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgICAgICAvLyDQt9Cw0L/QuNGB0YvQstCw0LXQvCDQtNCw0L3QvdGL0LUg0LTRgNGD0LfQtdC5INCyINCR0JQg0Lgg0YHQutCw0YfQuNCy0LDQtdC8INC40YUg0LDQstCw0YLQsNGA0LrQuFxuICAgICAgICAgICAgdXBkYXRlVXNlcnNEYXRhKGN1cnJlbnRVc2VySWQsIGRhdGEucmVzcG9uc2UpLnRoZW4oZnVuY3Rpb24gKHVzZXJzKSB7XG4gICAgICAgICAgICAgICAgdmFyIHVzZXJEYXRhID0gdXNlcnNbMF07XG5cbiAgICAgICAgICAgICAgICAvLyDRg9C00LDQu9GP0LXQvCDQuNC3INGB0L/QuNGB0LrQsCDQvtCx0YDQsNCx0LDRgtGL0LLQsNC10LzRi9GFXG4gICAgICAgICAgICAgICAgZGVsZXRlIHVpZHNQcm9jZXNzaW5nW2N1cnJlbnRVc2VySWRdW3VzZXJEYXRhLnVpZF07XG5cbiAgICAgICAgICAgICAgICBjYWxsYmFjayh1c2VyRGF0YSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSwgZnVuY3Rpb24gKGVyckNvZGUsIGVyckRhdGEpIHtcbiAgICAgICAgICAgIHN3aXRjaCAoZXJyQ29kZSkge1xuICAgICAgICAgICAgICAgIGNhc2UgUmVxTWFuYWdlci5BQk9SVCA6XG4gICAgICAgICAgICAgICAgY2FzZSBSZXFNYW5hZ2VyLkFDQ0VTU19ERU5JRUQgOlxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHdpbmRvdy5zZXRUaW1lb3V0KGdldFVzZXJQcm9maWxlLCA1KjEwMDAsIGN1cnJlbnRVc2VySWQsIHVpZCwgY2FsbGJhY2spO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiDQodC40L3RhdGA0L7QvdC40LfQsNGG0LjRjyDRgdC/0LjRgdC60LAg0LTRgNGD0LfQtdC5XG4gICAgICogQHBhcmFtIHtJbnRlZ2VyfSBjdXJyZW50VXNlcklkXG4gICAgICovXG4gICAgdmFyIGZyaWVuZHNTeW5jID0gZnVuY3Rpb24gKGN1cnJlbnRVc2VySWQpIHtcbiAgICAgICAgaWYgKGZyaWVuZHNTeW5jLnJ1bm5pbmcpXG4gICAgICAgICAgICByZXR1cm47XG5cbiAgICAgICAgLy8g0YTQu9Cw0LMsINGH0YLQvtCx0Ysg0L3QtSDQstGL0LfRi9Cy0LDRgtGMINC80LXRgtC+0LQg0L7QtNC90L7QstGA0LXQvNC10L3QvdC+INC90LXRgdC60L7Qu9GM0LrQviDRgNCw0Lcg0L/QvtC00YDRj9C0XG4gICAgICAgIGZyaWVuZHNTeW5jLnJ1bm5pbmcgPSB0cnVlO1xuXG4gICAgICAgIHZhciBmcmllbmRzU3luY1RpbWVzID0gU3RvcmFnZU1hbmFnZXIuZ2V0KFwiZnJpZW5kc19zeW5jX3RpbWVcIiwge2NvbnN0cnVjdG9yOiBPYmplY3QsIHN0cmljdDogdHJ1ZSwgY3JlYXRlOiB0cnVlfSk7XG4gICAgICAgIHZhciBtaWxsaVNlY29uZHNUaW1lb3V0ID0gQXBwLkZSSUVORFNfVVBEQVRFX1RJTUVPVVQgKiAxMDAwO1xuICAgICAgICB2YXIgbmV4dFJlcXVlc3RUaW1lb3V0O1xuXG4gICAgICAgIC8vINC/0YDQvtCy0LXRgNGP0LXQvCwg0YfRgtC+0LHRiyDQt9Cw0L/RgNC+0YHRiyDQvdCwINGB0LjQvdGF0YDQvtC90LjQt9Cw0YbQuNGOINGI0LvQuCDRgtC+0LvRjNC60L4g0L7RgiDRgtC10LrRg9GJ0LXQs9C+INCw0LrRgtC40LLQvdC+0LPQviDQv9C+0LvRjNC30L7QstCw0YLQtdC70Y9cbiAgICAgICAgaWYgKGN1cnJlbnRVc2VySWQgIT09IEFjY291bnRzTWFuYWdlci5jdXJyZW50VXNlcklkKSB7XG4gICAgICAgICAgICBmcmllbmRzU3luYy5ydW5uaW5nID0gZmFsc2U7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyDQv9GA0L7QstC10YDRj9C10LwsINGH0YLQvtCx0Ysg0L3QtSDQsdGL0LvQviDRgdC70LjRiNC60L7QvCDRh9Cw0YHRgtGL0YUg0LfQsNC/0YDQvtGB0L7QslxuICAgICAgICBpZiAoZnJpZW5kc1N5bmNUaW1lc1tjdXJyZW50VXNlcklkXSkge1xuICAgICAgICAgICAgbmV4dFJlcXVlc3RUaW1lb3V0ID0gTWF0aC5tYXgoKG1pbGxpU2Vjb25kc1RpbWVvdXQgLSBNYXRoLmFicyhEYXRlLm5vdygpIC0gZnJpZW5kc1N5bmNUaW1lc1tjdXJyZW50VXNlcklkXSkpLCAwKTtcbiAgICAgICAgICAgIGlmIChuZXh0UmVxdWVzdFRpbWVvdXQgPiAwKSB7XG4gICAgICAgICAgICAgICAgd2luZG93LnNldFRpbWVvdXQoZnJpZW5kc1N5bmMsIG5leHRSZXF1ZXN0VGltZW91dCwgY3VycmVudFVzZXJJZCk7XG5cbiAgICAgICAgICAgICAgICBmcmllbmRzU3luYy5ydW5uaW5nID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8g0L/QvtC30LTRgNCw0LLQu9GP0LXQvCDRgtC10LrRg9GJ0LXQs9C+INC/0L7Qu9GM0LfQvtCy0LDRgtC10LvRjyDRgSDQlNCgXG4gICAgICAgIGdldFVzZXJQcm9maWxlKGN1cnJlbnRVc2VySWQsIGN1cnJlbnRVc2VySWQsIGZ1bmN0aW9uIChjdXJyZW50VXNlckRhdGEpIHtcbiAgICAgICAgICAgIHZhciBub3dEYXRlID0gbmV3IERhdGUoKSxcbiAgICAgICAgICAgICAgICBub3dEYXkgPSBub3dEYXRlLmdldERhdGUoKSxcbiAgICAgICAgICAgICAgICBub3dZZWFyID0gbm93RGF0ZS5nZXRGdWxsWWVhcigpLFxuICAgICAgICAgICAgICAgIG5vd01vbnRoID0gbm93RGF0ZS5nZXRNb250aCgpICsgMSxcbiAgICAgICAgICAgICAgICBiRGF0ZSwgaSwgbm90aWZpY2F0aW9uLCBtc2c7XG5cbiAgICAgICAgICAgIGlmIChjdXJyZW50VXNlckRhdGEuYmRhdGUgPT09IHVuZGVmaW5lZCB8fCBjdXJyZW50VXNlckRhdGEuYmRhdGUubGVuZ3RoID09PSAwKVxuICAgICAgICAgICAgICAgIHJldHVybjtcblxuICAgICAgICAgICAgLy8g0YDQsNC30LHQuNCy0LDQtdC8INC4INC/0YDQtdC+0LHRgNCw0LfRg9C10Lwg0LIg0YfQuNGB0LvQsFxuICAgICAgICAgICAgYkRhdGUgPSBjdXJyZW50VXNlckRhdGEuYmRhdGUuc3BsaXQoXCIuXCIpO1xuICAgICAgICAgICAgZm9yIChpID0gMDsgaSA8IGJEYXRlLmxlbmd0aDsgaSsrKVxuICAgICAgICAgICAgICAgIGJEYXRlW2ldID0gcGFyc2VJbnQoYkRhdGVbaV0sIDEwKTtcblxuICAgICAgICAgICAgaWYgKGJEYXRlWzBdICE9PSBub3dEYXkgfHwgYkRhdGVbMV0gIT09IG5vd01vbnRoKVxuICAgICAgICAgICAgICAgIHJldHVybjtcblxuICAgICAgICAgICAgc2hvd0Nocm9tZU5vdGlmaWNhdGlvbih7XG4gICAgICAgICAgICAgICAgdGl0bGU6IEFwcC5OQU1FLFxuICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGNocm9tZS5pMThuLmdldE1lc3NhZ2UoXCJoYXBweUJpcnRoZGF5XCIpLnJlcGxhY2UoXCIlYXBwbmFtZSVcIiwgQXBwLk5BTUUpLFxuICAgICAgICAgICAgICAgIGljb246IGNocm9tZS5ydW50aW1lLmdldFVSTChcInBpYy9zbWlsZS5wbmdcIiksXG4gICAgICAgICAgICAgICAgc291bmQ6IFwibWVzc2FnZVwiLFxuICAgICAgICAgICAgICAgIG9uY2xpY2s6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgQ1BBLnNlbmRFdmVudChcIkFwcC1BY3Rpb25zXCIsIFwiQkQgbm90aWZpY2F0aW9uIGNsaWNrXCIpO1xuICAgICAgICAgICAgICAgICAgICBsZWF2ZU9uZUFwcFdpbmRvd0luc3RhbmNlKHRydWUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBDUEEuc2VuZEV2ZW50KFwiQXBwLURhdGFcIiwgXCJTaG93IEJEIG5vdGlmaWNhdGlvblwiKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgUmVxTWFuYWdlci5hcGlNZXRob2QoXCJmcmllbmRzLmdldFwiLCB7ZmllbGRzOiBcImZpcnN0X25hbWUsbGFzdF9uYW1lLHNleCxkb21haW4sYmRhdGUscGhvdG8sY29udGFjdHNcIn0sIGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgICAgICB2YXIgbm93RGF0ZSA9IG5ldyBEYXRlKCksXG4gICAgICAgICAgICAgICAgbm93RGF5ID0gbm93RGF0ZS5nZXREYXRlKCksXG4gICAgICAgICAgICAgICAgbm93WWVhciA9IG5vd0RhdGUuZ2V0RnVsbFllYXIoKSxcbiAgICAgICAgICAgICAgICBub3dNb250aCA9IG5vd0RhdGUuZ2V0TW9udGgoKSArIDE7XG5cbiAgICAgICAgICAgIHN5bmNpbmdEYXRhW2N1cnJlbnRVc2VySWRdLmNvbnRhY3RzWzBdICs9IGRhdGEucmVzcG9uc2UubGVuZ3RoO1xuXG4gICAgICAgICAgICAvLyDQt9Cw0L/QuNGB0YvQstCw0LXQvCDQtNCw0L3QvdGL0LUg0LTRgNGD0LfQtdC5INCyINCR0JQg0Lgg0YHQutCw0YfQuNCy0LDQtdC8INC40YUg0LDQstCw0YLQsNGA0LrQuFxuICAgICAgICAgICAgdXBkYXRlVXNlcnNEYXRhKGN1cnJlbnRVc2VySWQsIGRhdGEucmVzcG9uc2UpLnRoZW4oZnVuY3Rpb24gKHVzZXJzKSB7XG4gICAgICAgICAgICAgICAgdXNlcnMuZm9yRWFjaChmdW5jdGlvbiAodXNlckRvYykge1xuICAgICAgICAgICAgICAgICAgICB2YXIgYkRhdGUsIGk7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8g0YPQtNCw0LvRj9C10Lwg0LjQtyDRgdC/0LjRgdC60LAg0L7QsdGA0LDQsdCw0YLRi9Cy0LDQtdC80YvRhVxuICAgICAgICAgICAgICAgICAgICBkZWxldGUgdWlkc1Byb2Nlc3NpbmdbY3VycmVudFVzZXJJZF1bdXNlckRvYy51aWRdO1xuXG4gICAgICAgICAgICAgICAgICAgIHN5bmNpbmdEYXRhW2N1cnJlbnRVc2VySWRdLmNvbnRhY3RzWzFdICs9IDE7XG4gICAgICAgICAgICAgICAgICAgIGNocm9tZS5ydW50aW1lLnNlbmRNZXNzYWdlKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFjdGlvbjogXCJzeW5jUHJvZ3Jlc3NcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIHVzZXJJZDogY3VycmVudFVzZXJJZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IFwiY29udGFjdHNcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIHRvdGFsOiBzeW5jaW5nRGF0YVtjdXJyZW50VXNlcklkXS5jb250YWN0c1swXSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGN1cnJlbnQ6IHN5bmNpbmdEYXRhW2N1cnJlbnRVc2VySWRdLmNvbnRhY3RzWzFdXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgICAgIGlmIChTZXR0aW5nc01hbmFnZXIuU2hvd0JpcnRoZGF5Tm90aWZpY2F0aW9ucyA9PT0gMClcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcblxuICAgICAgICAgICAgICAgICAgICAvLyDQv9C+0LrQsNC30YvQstCw0LXQvCDRg9Cy0LXQtNC+0LzQu9C10L3QuNC1LCDQtdGB0LvQuCDRgyDQutC+0LPQvi3RgtC+INC40Lcg0LTRgNGD0LfQtdC5INCU0KBcbiAgICAgICAgICAgICAgICAgICAgaWYgKHVzZXJEb2MuYmRhdGUgPT09IHVuZGVmaW5lZCB8fCB1c2VyRG9jLmJkYXRlLmxlbmd0aCA9PT0gMClcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcblxuICAgICAgICAgICAgICAgICAgICAvLyDRgNCw0LfQsdC40LLQsNC10Lwg0Lgg0L/RgNC10L7QsdGA0LDQt9GD0LXQvCDQsiDRh9C40YHQu9CwXG4gICAgICAgICAgICAgICAgICAgIGJEYXRlID0gdXNlckRvYy5iZGF0ZS5zcGxpdChcIi5cIik7XG4gICAgICAgICAgICAgICAgICAgIGZvciAoaSA9IDA7IGkgPCBiRGF0ZS5sZW5ndGg7IGkrKylcbiAgICAgICAgICAgICAgICAgICAgICAgIGJEYXRlW2ldID0gcGFyc2VJbnQoYkRhdGVbaV0sIDEwKTtcblxuICAgICAgICAgICAgICAgICAgICBpZiAoYkRhdGVbMF0gIT09IG5vd0RheSB8fCBiRGF0ZVsxXSAhPT0gbm93TW9udGgpXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG5cbiAgICAgICAgICAgICAgICAgICAgLy8g0L/QvtC60LDQt9GL0LLQsNC10Lwg0YPQstC10LTQvtC80LvQtdC90LjQtSDQviDQlNCgXG4gICAgICAgICAgICAgICAgICAgIHZhciBpMThuQmlydGhEYXkgPSBjaHJvbWUuaTE4bi5nZXRNZXNzYWdlKFwiYmlydGhkYXlcIikuc3BsaXQoXCJ8XCIpLFxuICAgICAgICAgICAgICAgICAgICAgICAgaTE4blllYXJzID0gY2hyb21lLmkxOG4uZ2V0TWVzc2FnZShcInllYXJzXCIpLnNwbGl0KFwifFwiKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGhpc0hlck1hdGNoZXMgPSBpMThuQmlydGhEYXlbMF0ubWF0Y2goLyhbXlxcc10rKS0oW15cXHNdKykvKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIG1zZywgeW9Ob3csIG5vdGlmaWNhdGlvbjtcblxuICAgICAgICAgICAgICAgICAgICB1c2VyRG9jLnNleCA9IHVzZXJEb2Muc2V4IHx8IDA7XG4gICAgICAgICAgICAgICAgICAgIHN3aXRjaCAodXNlckRvYy5zZXgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgMSA6IC8vIGZlbWFsZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1zZyA9IGkxOG5CaXJ0aERheVswXS5yZXBsYWNlKGhpc0hlck1hdGNoZXNbMF0sIGhpc0hlck1hdGNoZXNbMl0pICsgXCIhXCI7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgMiA6IC8vIG1hbGVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtc2cgPSBpMThuQmlydGhEYXlbMF0ucmVwbGFjZShoaXNIZXJNYXRjaGVzWzBdLCBoaXNIZXJNYXRjaGVzWzFdKSArIFwiIVwiO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0IDogLy8gbm9uLXNwZWNpZmllZFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1zZyA9IGkxOG5CaXJ0aERheVswXS5yZXBsYWNlKGhpc0hlck1hdGNoZXNbMF0sIGhpc0hlck1hdGNoZXNbMV0gKyBcIiAoXCIgKyBoaXNIZXJNYXRjaGVzWzJdICsgXCIpXCIpICsgXCIhXCI7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBpZiAoYkRhdGUubGVuZ3RoID09PSAzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB5b05vdyA9IG5vd1llYXIgLSBiRGF0ZVsyXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1zZyArPSBcIiAoXCIgKyBpMThuQmlydGhEYXlbMV0ucmVwbGFjZShcIiV5ZWFycyVcIiwgeW9Ob3cgKyBcIiBcIiArIFV0aWxzLnN0cmluZy5wbHVyYWwoeW9Ob3csIGkxOG5ZZWFycykpICsgXCIpXCI7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBzaG93Q2hyb21lTm90aWZpY2F0aW9uKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHVpZDogdXNlckRvYy51aWQsXG4gICAgICAgICAgICAgICAgICAgICAgICB0aXRsZTogdXNlckRvYy5maXJzdF9uYW1lICsgXCIgXCIgKyB1c2VyRG9jLmxhc3RfbmFtZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IG1zZyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGljb246IHVzZXJEb2MucGhvdG8gfHwgY2hyb21lLnJ1bnRpbWUuZ2V0VVJMKFwicGljL3F1ZXN0aW9uX3RoLmdpZlwiKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHNvdW5kOiBcIm1lc3NhZ2VcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIG9uY2xpY2s6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZWF2ZU9uZUFwcFdpbmRvd0luc3RhbmNlKHRydWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIHZhciBpbmJveFN5bmNlZCA9IChTdG9yYWdlTWFuYWdlci5nZXQoXCJwZXJtX2luYm94X1wiICsgY3VycmVudFVzZXJJZCkgIT09IG51bGwpO1xuICAgICAgICAgICAgICAgIHZhciBzZW50U3luY2VkID0gKFN0b3JhZ2VNYW5hZ2VyLmdldChcInBlcm1fb3V0Ym94X1wiICsgY3VycmVudFVzZXJJZCkgIT09IG51bGwpO1xuXG4gICAgICAgICAgICAgICAgZnJpZW5kc1N5bmNUaW1lc1tjdXJyZW50VXNlcklkXSA9IERhdGUubm93KCk7XG4gICAgICAgICAgICAgICAgU3RvcmFnZU1hbmFnZXIuc2V0KFwiZnJpZW5kc19zeW5jX3RpbWVcIiwgZnJpZW5kc1N5bmNUaW1lcyk7XG5cbiAgICAgICAgICAgICAgICAvLyDRgdC70LXQtNGD0Y7RidCw0Y8g0YHQuNC90YXRgNC+0L3QuNC30LDRhtC40Y8g0LTQvtC70LbQvdCwINC90LDRh9Cw0YLRjNGB0Y8g0YfQtdGA0LXQtyBGUklFTkRTX1VQREFURV9USU1FT1VUXG4gICAgICAgICAgICAgICAgd2luZG93LnNldFRpbWVvdXQoZnJpZW5kc1N5bmMsIG1pbGxpU2Vjb25kc1RpbWVvdXQsIGN1cnJlbnRVc2VySWQpO1xuXG4gICAgICAgICAgICAgICAgLy8g0LXRgdC70Lgg0Log0Y3RgtC+0LzRgyDQvNC+0LzQtdC90YLRgyDRg9C20LUg0YHQuNC90YXRgNC+0L3QuNC30LjRgNC+0LLQsNC90Ysg0LLRhdC+0LTRj9GJ0LjQtSDQuCDQuNGB0YXQvtC00Y/RidC40LVcbiAgICAgICAgICAgICAgICBpZiAoQWNjb3VudHNNYW5hZ2VyLmN1cnJlbnRVc2VySWQgPT09IGN1cnJlbnRVc2VySWQpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGluYm94U3luY2VkICYmIHNlbnRTeW5jZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vINGB0LHRgNCw0YHRi9Cy0LDQtdC8INGB0YfQtdGC0YfQuNC6INGB0LjQvdGF0YDQvtC90LjQt9Cw0YbQuNC4XG4gICAgICAgICAgICAgICAgICAgICAgICBjbGVhclN5bmNpbmdEYXRhQ291bnRlcnMoY3VycmVudFVzZXJJZCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIFByb21pc2UuYWxsKFtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBEYXRhYmFzZU1hbmFnZXIuYWN0dWFsaXplQ29udGFjdHMoY3VycmVudFVzZXJJZCksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgRGF0YWJhc2VNYW5hZ2VyLmFjdHVhbGl6ZUNoYXREYXRlcyhjdXJyZW50VXNlcklkKVxuICAgICAgICAgICAgICAgICAgICAgICAgXSkudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2hyb21lLnJ1bnRpbWUuc2VuZE1lc3NhZ2Uoe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhY3Rpb246IFwidWlcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd2hpY2g6IFwidXNlclwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjdXJyZW50VXNlcklkOiBBY2NvdW50c01hbmFnZXIuY3VycmVudFVzZXJJZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY3VycmVudFVzZXJGaW86IEFjY291bnRzTWFuYWdlci5jdXJyZW50ID8gQWNjb3VudHNNYW5hZ2VyLmN1cnJlbnQuZmlvIDogbnVsbFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBmcmllbmRzU3luYy5ydW5uaW5nID0gZmFsc2U7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSwgZnVuY3Rpb24gKGVyckNvZGUsIGVyckRhdGEpIHtcbiAgICAgICAgICAgIGZyaWVuZHNTeW5jLnJ1bm5pbmcgPSBmYWxzZTtcblxuICAgICAgICAgICAgc3dpdGNoIChlcnJDb2RlKSB7XG4gICAgICAgICAgICAgICAgY2FzZSBSZXFNYW5hZ2VyLkFCT1JUIDpcbiAgICAgICAgICAgICAgICBjYXNlIFJlcU1hbmFnZXIuQUNDRVNTX0RFTklFRCA6XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgd2luZG93LnNldFRpbWVvdXQoZnJpZW5kc1N5bmMsIDUqMTAwMCwgY3VycmVudFVzZXJJZCk7XG4gICAgICAgIH0pO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiDQpNGD0L3QutGG0LjRjy3QvtCx0YDQsNCx0L7RgtGH0LjQuiwg0LrQvtGC0L7RgNCw0Y8g0LfQsNC/0YPRgdC60LDQtdGC0YHRjyDQsiDQvNC10YLQvtC00LDRhSBmcmllbmRzLmdldC91c2Vycy5nZXQsINC/0L7RgdC60L7Qu9GM0LrRgyDQvtCx0LAg0LzQtdGC0L7QtNCwINCy0L7Qt9Cy0YDQsNGJ0LDRjtGCINC/0YDQuNC80LXRgNC90L5cbiAgICAgKiDQvtC00LjQvdCw0LrQvtCy0YvQuSDQvtGC0LLQtdGCINC4INC40LzQtdGO0YIg0L7QsdGJ0YPRjiDQu9C+0LPQuNC60YMg0LfQsNC/0LjRgdC4INC00LDQvdC90YvRhSDQsiDQkdCUXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge051bWJlcn0gY3VycmVudFVzZXJJZFxuICAgICAqIEBwYXJhbSB7QXJyYXl9IHVzZXJzXG4gICAgICogQHJldHVybiB7UHJvbWlzZX0gW2Rlc2NyaXB0aW9uXVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIHVwZGF0ZVVzZXJzRGF0YShjdXJyZW50VXNlcklkLCB1c2Vycykge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICAgICAgdmFyIGRhdGFUb1JlcGxhY2UgPSBbXTtcbiAgICAgICAgICAgIHVpZHNQcm9jZXNzaW5nW2N1cnJlbnRVc2VySWRdID0gdWlkc1Byb2Nlc3NpbmdbY3VycmVudFVzZXJJZF0gfHwge307XG5cbiAgICAgICAgICAgIHVzZXJzLmZvckVhY2goZnVuY3Rpb24gKHVzZXJEYXRhKSB7XG4gICAgICAgICAgICAgICAgLy8g0LTQvtCx0LDQstC70Y/QtdC8IHVpZCDQsiDRgdC/0LjRgdC+0Log0L7QsdGA0LDQsdCw0YLRi9Cy0LDQtdC80YvRhVxuICAgICAgICAgICAgICAgIHVpZHNQcm9jZXNzaW5nW2N1cnJlbnRVc2VySWRdW3VzZXJEYXRhLnVpZF0gPSB0cnVlO1xuXG4gICAgICAgICAgICAgICAgLy8g0L7QsdC90L7QstC70Y/QtdC8INCk0JjQniDQv9C+0LvRjNC30L7QstCw0YLQtdC70Y9cbiAgICAgICAgICAgICAgICBpZiAoY3VycmVudFVzZXJJZCA9PT0gdXNlckRhdGEudWlkKSB7XG4gICAgICAgICAgICAgICAgICAgIEFjY291bnRzTWFuYWdlci5zZXRGaW8oY3VycmVudFVzZXJJZCwgdXNlckRhdGEuZmlyc3RfbmFtZSArIFwiIFwiICsgdXNlckRhdGEubGFzdF9uYW1lKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBkYXRhVG9SZXBsYWNlLnB1c2goW3VzZXJEYXRhLnVpZCwgdXNlckRhdGEuZmlyc3RfbmFtZSwgdXNlckRhdGEubGFzdF9uYW1lLCB1c2VyRGF0YV0pO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGlmICghZGF0YVRvUmVwbGFjZS5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKFtdKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIERhdGFiYXNlTWFuYWdlci5yZXBsYWNlQ29udGFjdHMoY3VycmVudFVzZXJJZCwgZGF0YVRvUmVwbGFjZSkudGhlbihyZXNvbHZlLCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgdmFyIGVyck1lc3NhZ2UgPSBlcnIubmFtZSArIFwiOiBcIiArIGVyci5tZXNzYWdlO1xuXG4gICAgICAgICAgICAgICAgTG9nTWFuYWdlci5lcnJvcihlcnJNZXNzYWdlKTtcbiAgICAgICAgICAgICAgICBDUEEuc2VuZEV2ZW50KFwiQ3VzdG9tLUVycm9yc1wiLCBcIkRhdGFiYXNlIGVycm9yXCIsIFwiRmFpbGVkIHRvIHJlcGxhY2UgY29udGFjdDogXCIgKyBlcnJNZXNzYWdlKTtcblxuICAgICAgICAgICAgICAgIHJlamVjdChlcnJNZXNzYWdlKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiDQntGB0L7QsdC10L3QvdC+0YHRgtGMIG1haWxTeW5jINC30LDQutC70Y7Rh9Cw0LXRgtGB0Y8g0LIg0YLQvtC8LCDRh9GC0L4g0L7QvdCwINC00L7Qu9C20L3QsCDQt9Cw0L/Rg9GB0LrQsNGC0YzRgdGPINGA0LXQtNC60L4g0Lgg0LjQtyBzdGFydFVzZXJTZXNzaW9uXG4gICAgICog0Jog0LzQvtC80LXQvdGC0YMg0L3QsNGH0LDQu9CwINGA0LDQsdC+0YLRiyBtYWlsU3luYyDRgtC10LrRg9GJ0LjQuSDQsNC60YLQuNCy0L3Ri9C5INC/0L7Qu9GM0LfQvtCy0LDRgtC10LvRjCDQvNC+0LbQtdGCINGB0LzQtdC90LjRgtGM0YHRjy4g0KLQtdC8INC90LUg0LzQtdC90LXQtVxuICAgICAqINGE0YPQvdC60YbQuNGPINC00L7Qu9C20L3QsCDQvtGC0YDQsNCx0L7RgtCw0YLRjCDQtNC+INC60L7QvdGG0LAsINGC0L4g0LXRgdGC0Ywg0LjQu9C4INGB0LrQsNGH0LDRgtGMINCy0YHQtSDRgdC+0L7QsdGJ0LXQvdC40Y8g0LTQviDQvdGD0LvRjyBpbiBkZXNjZW5kaW5nIG9yZGVyLCDQuNC70LhcbiAgICAgKiDQtNC+0LnRgtC4INC00L4g0LzQvtC80LXQvdGC0LAsINC60L7Qs9C00LAg0LLQvdGD0YLRgNC10L3QvdC90Y/RjyDRhNGD0L3QutGG0LjRjyDQt9Cw0L/QuNGB0Lgg0YHQvtC+0LHRidC10L3QuNC5INCyINCR0JQg0LLQtdGA0L3QtdGCINC+0YjQuNCx0LrRgyBEVVBMSUNBVEUgSUQuIG1haWxTeW5jINC90LUg0LTQvtC70LbQvdCwXG4gICAgICog0L/QvtC60LDQt9GL0LLQsNGC0Ywg0LLRgdC/0LvRi9Cy0LDRjtGJ0LjQtSDRg9Cy0LXQtNC+0LzQu9C10L3QuNGPLCDRjdGC0L4g0L/RgNC10YDQvtCz0LDRgtC40LLQsCDQvtCx0YDQsNCx0L7RgtGH0LjQutCwINC00LDQvdC90YvRhSDQvtGCIExvbmdQb2xsLdGB0LXRgNCy0LXRgNCwXG4gICAgICovXG4gICAgdmFyIG1haWxTeW5jID0gZnVuY3Rpb24oY3VycmVudFVzZXJJZCwgbWFpbFR5cGUsIGxhdGVzdE1lc3NhZ2VJZCkge1xuICAgICAgICB2YXIgb2Zmc2V0ID0gc3luY2luZ0RhdGFbY3VycmVudFVzZXJJZF1bbWFpbFR5cGVdWzFdO1xuICAgICAgICB2YXIgdXNlckRhdGFGb3JSZXF1ZXN0ID0gQWNjb3VudHNNYW5hZ2VyLmxpc3RbY3VycmVudFVzZXJJZF0sXG4gICAgICAgICAgICBjb21wYXROYW1lID0gKG1haWxUeXBlID09PSBcImluYm94XCIpID8gXCJpbmJveFwiIDogXCJvdXRib3hcIixcbiAgICAgICAgICAgIHBlcm1LZXkgPSBcInBlcm1fXCIgKyBjb21wYXROYW1lICsgXCJfXCIgKyBjdXJyZW50VXNlcklkLFxuICAgICAgICAgICAgZmlyc3RTeW5jID0gKFN0b3JhZ2VNYW5hZ2VyLmdldChwZXJtS2V5KSA9PT0gbnVsbCk7XG5cbiAgICAgICAgdmFyIGxhdGVzdE1zZyA9IG9mZnNldFxuICAgICAgICAgICAgPyBQcm9taXNlLnJlc29sdmUobGF0ZXN0TWVzc2FnZUlkKVxuICAgICAgICAgICAgOiBEYXRhYmFzZU1hbmFnZXIuZ2V0TGF0ZXN0VGFnTWVzc2FnZUlkKG1haWxUeXBlKTtcblxuICAgICAgICB2YXIgZ2V0TWVzc2FnZXMgPSBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgICAgICB2YXIgcmVxRGF0YSA9IHtcbiAgICAgICAgICAgICAgICBhY2Nlc3NfdG9rZW46IHVzZXJEYXRhRm9yUmVxdWVzdC50b2tlbixcbiAgICAgICAgICAgICAgICBjb3VudDogMTAwLFxuICAgICAgICAgICAgICAgIHByZXZpZXdfbGVuZ3RoOiAwLFxuICAgICAgICAgICAgICAgIG91dDogKG1haWxUeXBlID09PSBcInNlbnRcIikgPyAxIDogMCxcbiAgICAgICAgICAgICAgICBvZmZzZXQ6IG9mZnNldFxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgUmVxTWFuYWdlci5hcGlNZXRob2QoXCJtZXNzYWdlcy5nZXRcIiwgcmVxRGF0YSwgcmVzb2x2ZSwgZnVuY3Rpb24gKGVyckNvZGUsIGVyckRhdGEpIHtcbiAgICAgICAgICAgICAgICByZWplY3Qoe1xuICAgICAgICAgICAgICAgICAgICBjb2RlOiBlcnJDb2RlLFxuICAgICAgICAgICAgICAgICAgICBkYXRhOiBlcnJEYXRhXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgUHJvbWlzZS5hbGwoW1xuICAgICAgICAgICAgZ2V0TWVzc2FnZXMsXG4gICAgICAgICAgICBsYXRlc3RNc2dcbiAgICAgICAgXSkudGhlbihmdW5jdGlvbiAocmVzKSB7XG4gICAgICAgICAgICB2YXIgZGF0YSA9IHJlc1swXTtcbiAgICAgICAgICAgIHZhciBsYXRlc3RNZXNzYWdlSWQgPSByZXNbMV07XG4gICAgICAgICAgICB2YXIgdGltZVRvU3RvcEFmdGVyID0gZmFsc2U7IC8vIG1lc3NhZ2UgZm91bmQgd2l0aCBpZCBlcXVhbCB0byBsYXRlc3RNZXNzYWdlSWRcblxuICAgICAgICAgICAgLy8gZmxhdHRlbiByZXNwb25zZSBzdHJ1Y3R1cmVcbiAgICAgICAgICAgIHZhciBtZXNzYWdlcyA9IFtdLFxuICAgICAgICAgICAgICAgIGRhdGFTeW5jZWRGbjtcblxuICAgICAgICAgICAgZGF0YVN5bmNlZEZuID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgdmFyIGluYm94U3luY2VkLCBzZW50U3luY2VkLCBmcmllbmRzU3luY2VkLFxuICAgICAgICAgICAgICAgICAgICB3YWxsVG9rZW5VcGRhdGVkO1xuXG4gICAgICAgICAgICAgICAgU3RvcmFnZU1hbmFnZXIuc2V0KHBlcm1LZXksIDEpO1xuXG4gICAgICAgICAgICAgICAgaW5ib3hTeW5jZWQgPSAoU3RvcmFnZU1hbmFnZXIuZ2V0KFwicGVybV9pbmJveF9cIiArIGN1cnJlbnRVc2VySWQpICE9PSBudWxsKTtcbiAgICAgICAgICAgICAgICBzZW50U3luY2VkID0gKFN0b3JhZ2VNYW5hZ2VyLmdldChcInBlcm1fb3V0Ym94X1wiICsgY3VycmVudFVzZXJJZCkgIT09IG51bGwpO1xuICAgICAgICAgICAgICAgIGZyaWVuZHNTeW5jZWQgPSAoU3RvcmFnZU1hbmFnZXIuZ2V0KFwiZnJpZW5kc19zeW5jX3RpbWVcIiwge2NvbnN0cnVjdG9yOiBPYmplY3QsIHN0cmljdDogdHJ1ZSwgY3JlYXRlOiB0cnVlfSlbY3VycmVudFVzZXJJZF0gIT09IHVuZGVmaW5lZCk7XG5cbiAgICAgICAgICAgICAgICBpZiAoQWNjb3VudHNNYW5hZ2VyLmN1cnJlbnRVc2VySWQgPT09IGN1cnJlbnRVc2VySWQpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8g0LXRgdC70Lgg0Log0Y3RgtC+0LzRgyDQvNC+0LzQtdC90YLRgyDQstGB0Y8g0L/QvtGH0YLQsCDRgdC40L3RhdGA0L7QvdC40LfQuNGA0L7QstCw0L3QsCDQuCDQtNGA0YPQt9GM0Y8g0YLQvtC20LUsINGC0L4g0L/QtdGA0LXRgNC40YHQvtCy0YvQstCw0LXQvCDRhNGA0L7QvdGCXG4gICAgICAgICAgICAgICAgICAgIGlmIChpbmJveFN5bmNlZCAmJiBzZW50U3luY2VkICYmIGZyaWVuZHNTeW5jZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vINGB0LHRgNCw0YHRi9Cy0LDQtdC8INGB0YfQtdGC0YfQuNC6INGB0LjQvdGF0YDQvtC90LjQt9Cw0YbQuNC4XG4gICAgICAgICAgICAgICAgICAgICAgICBjbGVhclN5bmNpbmdEYXRhQ291bnRlcnMoY3VycmVudFVzZXJJZCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vINC80LDQu9C10L3RjNC60L7QtSDQt9Cw0LzQtdGH0LXQvdC40LU6INC/0L7RgdC70LUg0YLQvtCz0L4g0LrQsNC6INCw0LrQutCw0YPQvdGCINC80LjQs9GA0LjRgNC+0LLQsNC9INGBIDMg0L3QsCA0INCy0LXRgNGB0LjRjiwg0YHRgtCw0YDRgtGD0LXRgiBzdGFydFVzZXJTZXNzaW9uKClcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vINC+0L3QsCDQt9Cw0L/Rg9GB0LrQsNC10YIgbWFpbFN5bmMoKSwg0YfRgtC+INCyINGB0LLQvtGOINC+0YfQtdGA0LXQtNGMINC/0L7RgNC+0LTQuNGCINC/0LXRgNC10YDQuNGB0L7QstC60YMg0YTRgNC+0L3RgtCwINC90LAgXCJ1aVwiID0+IFwidXNlclwiXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyDRh9GC0L7QsdGLINC30LDRidC40YLQuNGC0YzRgdGPINC+0YIg0Y3RgtC+0LPQviDQv9GA0L7QstC10YDRj9C10LwsINCx0YvQuyDQu9C4INC+0LHQvdC+0LLQu9C10L0g0YLQvtC60LXQvVxuICAgICAgICAgICAgICAgICAgICAgICAgd2FsbFRva2VuVXBkYXRlZCA9IChTdG9yYWdlTWFuYWdlci5nZXQoXCJ3YWxsX3Rva2VuX3VwZGF0ZWRcIiwge2NvbnN0cnVjdG9yOiBPYmplY3QsIHN0cmljdDogdHJ1ZSwgY3JlYXRlOiB0cnVlfSlbQWNjb3VudHNNYW5hZ2VyLmN1cnJlbnRVc2VySWRdICE9PSB1bmRlZmluZWQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHdhbGxUb2tlblVwZGF0ZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBQcm9taXNlLmFsbChbXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIERhdGFiYXNlTWFuYWdlci5hY3R1YWxpemVDb250YWN0cyhjdXJyZW50VXNlcklkKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgRGF0YWJhc2VNYW5hZ2VyLmFjdHVhbGl6ZUNoYXREYXRlcyhjdXJyZW50VXNlcklkKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF0pLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjaHJvbWUucnVudGltZS5zZW5kTWVzc2FnZSh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhY3Rpb246IFwidWlcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdoaWNoOiBcInVzZXJcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGN1cnJlbnRVc2VySWQ6IEFjY291bnRzTWFuYWdlci5jdXJyZW50VXNlcklkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY3VycmVudFVzZXJGaW86IEFjY291bnRzTWFuYWdlci5jdXJyZW50ID8gQWNjb3VudHNNYW5hZ2VyLmN1cnJlbnQuZmlvIDogbnVsbFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8vINCy0YHQtSDQv9C+0LvRg9GH0LjQu9C4XG4gICAgICAgICAgICBpZiAoZGF0YS5yZXNwb25zZSA9PT0gMCB8fCAoZGF0YS5yZXNwb25zZSBpbnN0YW5jZW9mIEFycmF5ICYmIGRhdGEucmVzcG9uc2UubGVuZ3RoID09PSAxKSB8fCBmb3JjZVNraXBTeW5jKSB7XG4gICAgICAgICAgICAgICAgZGF0YVN5bmNlZEZuKCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBzeW5jaW5nRGF0YVtjdXJyZW50VXNlcklkXVttYWlsVHlwZV1bMF0gPSBkYXRhLnJlc3BvbnNlWzBdO1xuXG4gICAgICAgICAgICBpZiAodWlkc1Byb2Nlc3NpbmdbY3VycmVudFVzZXJJZF0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIHVpZHNQcm9jZXNzaW5nW2N1cnJlbnRVc2VySWRdID0ge307XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vINC+0YLRgdC10LrQsNC10Lwg0L7QsdGJ0LjQuSDRgdGH0LXRgtGH0LjQuiDRgdC+0L7QsdGJ0LXQvdC40LlcbiAgICAgICAgICAgIF8uZm9yRWFjaChkYXRhLnJlc3BvbnNlLCBmdW5jdGlvbiAobXNnRGF0YSwgaW5kZXgpIHtcbiAgICAgICAgICAgICAgICB2YXIgY29vcmRzO1xuXG4gICAgICAgICAgICAgICAgLy8g0L/RgNC+0L/Rg9GB0LrQsNC10Lwg0L7QsdGJ0LjQuSDRgdGH0LXRgtGH0LjQulxuICAgICAgICAgICAgICAgIGlmICghaW5kZXgpXG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcblxuICAgICAgICAgICAgICAgIGlmIChtc2dEYXRhLm1pZCA9PT0gbGF0ZXN0TWVzc2FnZUlkKSB7XG4gICAgICAgICAgICAgICAgICAgIHRpbWVUb1N0b3BBZnRlciA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBiYWNrd2FyZHMtY29tcGF0aWJpbGl0eS4g0JTQviA0INCy0LXRgNGB0LjQuCDQv9GA0Lgg0L7RgtGB0YPRgtGB0YLQstC40Lgg0LLQu9C+0LbQtdC90LjQuSDQv9C40YHQsNC70YHRjyDQv9GD0YHRgtC+0Lkg0L7QsdGK0LXQutGCXG4gICAgICAgICAgICAgICAgLy8g0YLQtdC/0LXRgNGMINC80Ysg0L7Qv9GA0LXQtNC10LvRj9C10Lwg0Y3RgtC+INC90LAg0YTRgNC+0L3RgtC1INC/0YDQuCDQvtGC0YDQuNGB0L7QstC60LVcbiAgICAgICAgICAgICAgICBtc2dEYXRhLmF0dGFjaG1lbnRzID0gbXNnRGF0YS5hdHRhY2htZW50cyB8fCBbXTtcblxuICAgICAgICAgICAgICAgIC8vINCz0LXQvtC00LDQvdC90YvQtSDRgtCw0LrQttC1INC/0LjRiNC10Lwg0LrQsNC6INCy0LvQvtC20LXQvdC40LVcbiAgICAgICAgICAgICAgICBpZiAobXNnRGF0YS5nZW8gJiYgbXNnRGF0YS5nZW8udHlwZSA9PT0gXCJwb2ludFwiKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvb3JkcyA9IG1zZ0RhdGEuZ2VvLmNvb3JkaW5hdGVzLnNwbGl0KFwiIFwiKTtcblxuICAgICAgICAgICAgICAgICAgICBtc2dEYXRhLmF0dGFjaG1lbnRzLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogXCJnZW9wb2ludFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgZ2VvcG9pbnQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsYXQ6IGNvb3Jkc1swXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsbmc6IGNvb3Jkc1sxXVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBtc2dEYXRhLmNoYXRfaWQgPSBtc2dEYXRhLmNoYXRfaWQgfHwgMDtcbiAgICAgICAgICAgICAgICBtc2dEYXRhLnRhZ3MgPSBbbWFpbFR5cGVdO1xuXG4gICAgICAgICAgICAgICAgaWYgKG1zZ0RhdGEuYXR0YWNobWVudHMubGVuZ3RoKVxuICAgICAgICAgICAgICAgICAgICBtc2dEYXRhLnRhZ3MucHVzaChcImF0dGFjaG1lbnRzXCIpO1xuXG4gICAgICAgICAgICAgICAgLy8g0L/RgNC+0LLQtdGA0Y/QtdC8INGB0YPRidC10YHRgtCy0YPQtdGCINC70Lgg0L/QvtC70YzQt9C+0LLQsNGC0LXQu9GMXG4gICAgICAgICAgICAgICAgaWYgKCF1aWRzUHJvY2Vzc2luZ1tjdXJyZW50VXNlcklkXVttc2dEYXRhLnVpZF0pIHtcbiAgICAgICAgICAgICAgICAgICAgRGF0YWJhc2VNYW5hZ2VyLmdldENvbnRhY3RCeUlkKGN1cnJlbnRVc2VySWQsIG1zZ0RhdGEudWlkLCBudWxsLCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBnZXRVc2VyUHJvZmlsZShjdXJyZW50VXNlcklkLCBtc2dEYXRhLnVpZCk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIG1lc3NhZ2VzLnB1c2gobXNnRGF0YSk7XG4gICAgICAgICAgICAgICAgaWYgKG1zZ0RhdGEucmVhZF9zdGF0ZSA9PT0gMCAmJiBTdG9yYWdlTWFuYWdlci5nZXQocGVybUtleSkgPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gRklYTUU6IGNhbGN1bGF0ZSBudW1iZXIgb2YgbmV3IG1lc3NhZ2VzXG4gICAgICAgICAgICAgICAgICAgIC8vIHNob3cgbm90aWZpY2F0aW9uIGFmdGVyd2FyZHNcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgRGF0YWJhc2VNYW5hZ2VyLmluc2VydE1lc3NhZ2VzKGN1cnJlbnRVc2VySWQsIG1lc3NhZ2VzLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgc3luY2luZ0RhdGFbY3VycmVudFVzZXJJZF1bbWFpbFR5cGVdWzFdICs9IG1lc3NhZ2VzLmxlbmd0aDtcblxuICAgICAgICAgICAgICAgIGNocm9tZS5ydW50aW1lLnNlbmRNZXNzYWdlKHtcbiAgICAgICAgICAgICAgICAgICAgXCJhY3Rpb25cIiA6IFwic3luY1Byb2dyZXNzXCIsXG4gICAgICAgICAgICAgICAgICAgIFwidXNlcklkXCIgOiBjdXJyZW50VXNlcklkLFxuICAgICAgICAgICAgICAgICAgICBcInR5cGVcIiA6IG1haWxUeXBlLFxuICAgICAgICAgICAgICAgICAgICBcInRvdGFsXCIgOiBzeW5jaW5nRGF0YVtjdXJyZW50VXNlcklkXVttYWlsVHlwZV1bMF0sXG4gICAgICAgICAgICAgICAgICAgIFwiY3VycmVudFwiIDogc3luY2luZ0RhdGFbY3VycmVudFVzZXJJZF1bbWFpbFR5cGVdWzFdXG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICBpZiAodGltZVRvU3RvcEFmdGVyIHx8IHN5bmNpbmdEYXRhW2N1cnJlbnRVc2VySWRdW21haWxUeXBlXVsxXSA+IGRhdGEucmVzcG9uc2VbMF0pIHtcbiAgICAgICAgICAgICAgICAgICAgZGF0YVN5bmNlZEZuKCk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBtYWlsU3luYyhjdXJyZW50VXNlcklkLCBtYWlsVHlwZSwgbGF0ZXN0TWVzc2FnZUlkKTtcbiAgICAgICAgICAgIH0sIF8ubm9vcCk7XG4gICAgICAgIH0sIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgIGlmIChlcnIubmFtZSBpbnN0YW5jZW9mIERPTUVycm9yKSB7XG4gICAgICAgICAgICAgICAgdmFyIGVyck1zZyA9IGVyci5uYW1lICsgXCI6IFwiICsgZXJyLm1lc3NhZ2U7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGVyck1zZyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHN3aXRjaCAoZXJyLmNvZGUpIHtcbiAgICAgICAgICAgICAgICBjYXNlIFJlcU1hbmFnZXIuQUNDRVNTX0RFTklFRCA6XG4gICAgICAgICAgICAgICAgICAgIC8vIFRPRE8gZXJyb3JcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgICAgICBkZWZhdWx0IDpcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ0Vycm9yICcsIGVycik7XG4gICAgICAgICAgICAgICAgICAgIHdpbmRvdy5zZXRUaW1lb3V0KG1haWxTeW5jLCA1MDAwLCBjdXJyZW50VXNlcklkLCBtYWlsVHlwZSwgbGF0ZXN0TWVzc2FnZUlkKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiDQlNC+0LvQttC10L0g0LfQsNC/0YPRgdC60LDRgtGM0YHRjyDRgtC+0LvRjNC60L4g0LIg0YfQtdGC0YvRgNC10YUg0YHQu9GD0YfQsNGP0YU6INC/0YDQuCDRgdGC0LDRgNGC0LUg0L/RgNC40LvQvtC20LXQvdC40Y8gKNGC0L4g0LXRgdGC0Ywg0L/RgNC4INC30LDQs9GA0YPQt9C60LUg0J7QoSksINC/0YDQuCDRgdC80LXQvdC1INCw0LrQutCw0YPQvdGC0LAsXG4gICAgICog0L/RgNC4INC00L7QsdCw0LLQu9C10L3QuNC4INC4INC/0YDQuCDRg9C00LDQu9C10L3QuNC4INCw0LrQutCw0YPQvdGC0LAuINCf0YDQuCDQvtGC0YDQuNGB0L7QstC60LUgVUkg0L3QuNGH0LXQs9C+INC30LDQv9GD0YHQutCw0YLRjCDQvdC1INC90YPQttC90L4gLSDQvtC90LAg0LTQvtC70LbQvdCwINGA0LDQsdC+0YLQsNGC0Ywg0YEg0LrRjdGI0LXQvCDQuCDRgdC+0LHRi9GC0LjRj9C80LguXG4gICAgICog0J7RgtC70LjRh9C40LUg0LbQtSBmcmllbmRzU3luYy9ldmVudHNSZWdpc3RyYXIvbWFpbFN5bmMg0LIg0YLQvtC8LCDRh9GC0L4g0L/QtdGA0LLRi9C1INC00LLQsCDQvdC10LfQsNCy0LjRgdC40LzRiyDQuCDRgNCw0LHQvtGC0LDRjtGCINGC0L7Qu9GM0LrQviDQtNC70Y8g0YLQtdC60YPRidC10LPQviDQv9C+0LvRjNC30L7QstCw0YLQtdC70Y8sXG4gICAgICog0LAgbWFpbFN5bmMg0LTQvtC70LbQtdC9INGD0LzQtdGC0Ywg0YDQsNCx0L7RgtCw0YLRjCDQvdC1INC30L3QsNGPINC60YLQviDRj9Cy0LvRj9C10YLRgdGPINGC0LXQutGD0YnQuNC8XG4gICAgICovXG4gICAgdmFyIHN0YXJ0VXNlclNlc3Npb24gPSBmdW5jdGlvbihjYWxsYmFjaykge1xuICAgICAgICB2YXIgY3VycmVudFVzZXJJZCA9IEFjY291bnRzTWFuYWdlci5jdXJyZW50VXNlcklkO1xuXG4gICAgICAgIC8vINGB0LHRgNCw0YHRi9Cy0LDQtdC8INCy0YHQtSBYSFIt0LfQsNC/0YDQvtGB0YtcbiAgICAgICAgUmVxTWFuYWdlci5hYm9ydEFsbCgpO1xuXG4gICAgICAgIC8vINC40L3QuNGG0LjQsNC70LjQt9C40YDRg9C10Lwg0JHQlFxuICAgICAgICBEYXRhYmFzZU1hbmFnZXIuaW5pdFVzZXIoY3VycmVudFVzZXJJZCwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgaWYgKEFjY291bnRzTWFuYWdlci5jdXJyZW50VXNlcklkICE9PSBjdXJyZW50VXNlcklkKVxuICAgICAgICAgICAgICAgIHJldHVybjtcblxuICAgICAgICAgICAgLy8g0YHQsdGA0LDRgdGL0LLQsNC10Lwg0YHRh9C10YLRh9C40LrQuCDRgdC40L3RhdGA0L7QvdC40LfQsNGG0LjQuFxuICAgICAgICAgICAgY2xlYXJTeW5jaW5nRGF0YUNvdW50ZXJzKEFjY291bnRzTWFuYWdlci5jdXJyZW50VXNlcklkKTtcblxuICAgICAgICAgICAgaWYgKG5hdmlnYXRvci5vbkxpbmUpIHtcbiAgICAgICAgICAgICAgICBmcmllbmRzU3luYyhBY2NvdW50c01hbmFnZXIuY3VycmVudFVzZXJJZCk7XG4gICAgICAgICAgICAgICAgbG9uZ1BvbGxFdmVudHNSZWdpc3RyYXIuaW5pdChBY2NvdW50c01hbmFnZXIuY3VycmVudFVzZXJJZCk7XG5cbiAgICAgICAgICAgICAgICBtYWlsU3luYyhBY2NvdW50c01hbmFnZXIuY3VycmVudFVzZXJJZCwgXCJpbmJveFwiKTtcbiAgICAgICAgICAgICAgICBtYWlsU3luYyhBY2NvdW50c01hbmFnZXIuY3VycmVudFVzZXJJZCwgXCJzZW50XCIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAodHlwZW9mIGNhbGxiYWNrID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjaygpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LCBmdW5jdGlvbiAoZXJyTXNnKSB7XG4gICAgICAgICAgICBMb2dNYW5hZ2VyLmVycm9yKGVyck1zZyk7XG4gICAgICAgICAgICBDUEEuc2VuZEV2ZW50KFwiQ3JpdGljYWwtRXJyb3JzXCIsIFwiRGF0YWJhc2UgaW5pdCB1c2VyXCIsIGVyck1zZyk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vINCy0LrQu9GO0YfQsNC10Lwg0YHRgtCw0YLQuNGB0YLQuNC60YMg0LfQsNC/0YDQvtGB0L7QsiDQktCaXG4gICAgICAgIC8vIEBzZWUgaHR0cDovL3ZrLmNvbS9kZXYvc3RhdHMudHJhY2tWaXNpdG9yXG4gICAgICAgIFJlcU1hbmFnZXIuYXBpTWV0aG9kKFwic3RhdHMudHJhY2tWaXNpdG9yXCIsIF8ubm9vcCk7XG4gICAgfTtcblxuICAgIGNocm9tZS5ydW50aW1lLm9uTWVzc2FnZS5hZGRMaXN0ZW5lcihmdW5jdGlvbiAocmVxdWVzdCwgc2VuZGVyLCBzZW5kUmVzcG9uc2UpIHtcbiAgICAgICAgdmFyIHNlbmRBc3luY1Jlc3BvbnNlID0gZmFsc2U7XG5cbiAgICAgICAgc3dpdGNoIChyZXF1ZXN0LmFjdGlvbikge1xuICAgICAgICAgICAgY2FzZSBcImFkZEZpcnN0QWNjb3VudFwiOlxuICAgICAgICAgICAgICAgIEFjY291bnRzTWFuYWdlci5zZXREYXRhKHJlcXVlc3QudWlkLCByZXF1ZXN0LnRva2VuLCBcIi4uLlwiKTtcbiAgICAgICAgICAgICAgICBBY2NvdW50c01hbmFnZXIuY3VycmVudFVzZXJJZCA9IHJlcXVlc3QudWlkO1xuXG4gICAgICAgICAgICAgICAgdmFyIHdhbGxUb2tlblVwZGF0ZWQgPSBTdG9yYWdlTWFuYWdlci5nZXQoXCJ3YWxsX3Rva2VuX3VwZGF0ZWRcIiwge2NvbnN0cnVjdG9yOiBPYmplY3QsIHN0cmljdDogdHJ1ZSwgY3JlYXRlOiB0cnVlfSk7XG4gICAgICAgICAgICAgICAgd2FsbFRva2VuVXBkYXRlZFtBY2NvdW50c01hbmFnZXIuY3VycmVudFVzZXJJZF0gPSAxO1xuICAgICAgICAgICAgICAgIFN0b3JhZ2VNYW5hZ2VyLnNldChcIndhbGxfdG9rZW5fdXBkYXRlZFwiLCB3YWxsVG9rZW5VcGRhdGVkKTtcblxuICAgICAgICAgICAgICAgIHN0YXJ0VXNlclNlc3Npb24oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICBjaHJvbWUucnVudGltZS5zZW5kTWVzc2FnZSh7XG4gICAgICAgICAgICAgICAgICAgICAgICBhY3Rpb246IFwidWlcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIHdoaWNoOiBcInN5bmNpbmdcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIGN1cnJlbnRVc2VySWQ6IEFjY291bnRzTWFuYWdlci5jdXJyZW50VXNlcklkLFxuICAgICAgICAgICAgICAgICAgICAgICAgY3VycmVudFVzZXJGaW86IEFjY291bnRzTWFuYWdlci5jdXJyZW50ID8gQWNjb3VudHNNYW5hZ2VyLmN1cnJlbnQuZmlvIDogbnVsbFxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICBjYXNlIFwiYWRkQW5vdGhlckFjY291bnRcIjpcbiAgICAgICAgICAgICAgICB2YXIgbmV3VXNlckdyYW50ZWQgPSAoQWNjb3VudHNNYW5hZ2VyLmxpc3RbcmVxdWVzdC51aWRdID09PSB1bmRlZmluZWQpO1xuICAgICAgICAgICAgICAgIGlmICghbmV3VXNlckdyYW50ZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgQWNjb3VudHNNYW5hZ2VyLnNldERhdGEocmVxdWVzdC51aWQsIHJlcXVlc3QudG9rZW4pO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vINGD0LLQtdC00L7QvNC70Y/QtdC8INC+0LEg0L7RiNC40LHQutC1XG4gICAgICAgICAgICAgICAgICAgIGNocm9tZS5ydW50aW1lLnNlbmRNZXNzYWdlKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFjdGlvbjogXCJ0b2tlblVwZGF0ZWRJbnN0ZWFkT2ZBY2NvdW50QWRkXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICB1aWQ6IHJlcXVlc3QudWlkLFxuICAgICAgICAgICAgICAgICAgICAgICAgZmlvOiBBY2NvdW50c01hbmFnZXIubGlzdFtyZXF1ZXN0LnVpZF0uZmlvXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBDUEEuc2VuZEV2ZW50KFwiQXBwLUFjdGlvbnNcIiwgXCIyKyBhY2NvdW50IGFkZGVkXCIpO1xuXG4gICAgICAgICAgICAgICAgQWNjb3VudHNNYW5hZ2VyLnNldERhdGEocmVxdWVzdC51aWQsIHJlcXVlc3QudG9rZW4sIFwiLi4uXCIpO1xuICAgICAgICAgICAgICAgIEFjY291bnRzTWFuYWdlci5jdXJyZW50VXNlcklkID0gcmVxdWVzdC51aWQ7XG5cbiAgICAgICAgICAgICAgICB2YXIgd2FsbFRva2VuVXBkYXRlZCA9IFN0b3JhZ2VNYW5hZ2VyLmdldChcIndhbGxfdG9rZW5fdXBkYXRlZFwiLCB7Y29uc3RydWN0b3I6IE9iamVjdCwgc3RyaWN0OiB0cnVlLCBjcmVhdGU6IHRydWV9KTtcbiAgICAgICAgICAgICAgICB3YWxsVG9rZW5VcGRhdGVkW0FjY291bnRzTWFuYWdlci5jdXJyZW50VXNlcklkXSA9IDE7XG4gICAgICAgICAgICAgICAgU3RvcmFnZU1hbmFnZXIuc2V0KFwid2FsbF90b2tlbl91cGRhdGVkXCIsIHdhbGxUb2tlblVwZGF0ZWQpO1xuXG4gICAgICAgICAgICAgICAgc3RhcnRVc2VyU2Vzc2lvbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIGNocm9tZS5ydW50aW1lLnNlbmRNZXNzYWdlKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFjdGlvbjogXCJ1aVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgd2hpY2g6IFwic3luY2luZ1wiXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgIGNhc2UgXCJ1cGRhdGVFeGlzdGluZ1Rva2VuXCI6XG4gICAgICAgICAgICAgICAgdmFyIG5lZWRlZFVzZXJUb2tlblVwZGF0ZWQgPSAocmVxdWVzdC5uZWVkZWRVaWQgPT09IHJlcXVlc3QudWlkKTtcbiAgICAgICAgICAgICAgICB2YXIgbmV3VXNlckdyYW50ZWQgPSB0cnVlO1xuXG4gICAgICAgICAgICAgICAgZm9yICh2YXIgbGlzdFVzZXJJZCBpbiBBY2NvdW50c01hbmFnZXIubGlzdCkge1xuICAgICAgICAgICAgICAgICAgICBsaXN0VXNlcklkID0gTnVtYmVyKGxpc3RVc2VySWQpO1xuXG4gICAgICAgICAgICAgICAgICAgIGlmIChsaXN0VXNlcklkID09PSByZXF1ZXN0LnVpZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbmV3VXNlckdyYW50ZWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKG5ld1VzZXJHcmFudGVkKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vINGD0LLQtdC00L7QvNC70Y/QtdC8INC+0LEg0L7RiNC40LHQutC1XG4gICAgICAgICAgICAgICAgICAgIGNocm9tZS5ydW50aW1lLnNlbmRNZXNzYWdlKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFjdGlvbjogXCJ0b2tlbkFkZGVkSW5zdGVhZE9mVXBkYXRlXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICB1aWQ6IHJlcXVlc3QudWlkLFxuICAgICAgICAgICAgICAgICAgICAgICAgdG9rZW46IHJlcXVlc3QudG9rZW5cbiAgICAgICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIEFjY291bnRzTWFuYWdlci5zZXREYXRhKHJlcXVlc3QudWlkLCByZXF1ZXN0LnRva2VuKTtcblxuICAgICAgICAgICAgICAgIGlmIChuZWVkZWRVc2VyVG9rZW5VcGRhdGVkKSB7XG4gICAgICAgICAgICAgICAgICAgIENQQS5zZW5kRXZlbnQoXCJBcHAtQWN0aW9uc1wiLCBcIkFjY291bnQgdG9rZW4gdXBkYXRlZFwiKTtcblxuICAgICAgICAgICAgICAgICAgICBjaHJvbWUucnVudGltZS5zZW5kTWVzc2FnZSh7XG4gICAgICAgICAgICAgICAgICAgICAgICBhY3Rpb246IFwidG9rZW5VcGRhdGVkXCJcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgY2hyb21lLnJ1bnRpbWUuc2VuZE1lc3NhZ2Uoe1xuICAgICAgICAgICAgICAgICAgICAgICAgYWN0aW9uOiBcInRva2VuVXBkYXRlZEZvcldyb25nVXNlclwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgdWlkOiByZXF1ZXN0LnVpZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGZpbzogQWNjb3VudHNNYW5hZ2VyLmxpc3RbcmVxdWVzdC51aWRdLmZpb1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgY2FzZSBcImdldEFjY291bnRzTGlzdFwiOlxuICAgICAgICAgICAgICAgIHNlbmRBc3luY1Jlc3BvbnNlID0gdHJ1ZTtcblxuICAgICAgICAgICAgICAgIHZhciBhY2NvdW50cyA9IHt9O1xuICAgICAgICAgICAgICAgIHZhciBwcm9taXNlcyA9IFtdO1xuXG4gICAgICAgICAgICAgICAgdmFyIGFzc2lnbkF2YXRhciA9IGZ1bmN0aW9uIChhY2NvdW50LCB1aWQpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIERhdGFiYXNlTWFuYWdlci5nZXRDb250YWN0QnlJZChBY2NvdW50c01hbmFnZXIuY3VycmVudFVzZXJJZCwgdWlkLCBmdW5jdGlvbiAoY29udGFjdERhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhY2NvdW50LmF2YXRhciA9IGNvbnRhY3REYXRhLnBob3RvO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIExvZ01hbmFnZXIuZXJyb3IoZXJyICsgJycpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIF8uZm9ySW4oQWNjb3VudHNNYW5hZ2VyLmxpc3QsIGZ1bmN0aW9uICh2YWx1ZSwga2V5KSB7XG4gICAgICAgICAgICAgICAgICAgIGFjY291bnRzW2tleV0gPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgcHJvbWlzZXMucHVzaChhc3NpZ25BdmF0YXIodmFsdWUsIGtleSkpO1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgUHJvbWlzZS5hbGwocHJvbWlzZXMpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICBzZW5kUmVzcG9uc2UoYWNjb3VudHMpO1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgIGNhc2UgXCJzYXZlU2V0dGluZ3NcIjpcbiAgICAgICAgICAgICAgICBfLmZvckluKHJlcXVlc3Quc2V0dGluZ3MsIGZ1bmN0aW9uICh2YWx1ZSwga2V5KSB7XG4gICAgICAgICAgICAgICAgICAgIFNldHRpbmdzTWFuYWdlcltrZXldID0gdmFsdWU7XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAvLyBub3RpZnkgYXBwIHdpbmRvd3NcbiAgICAgICAgICAgICAgICBjaHJvbWUucnVudGltZS5zZW5kTWVzc2FnZSh7XG4gICAgICAgICAgICAgICAgICAgIGFjdGlvbjogXCJzZXR0aW5nc0NoYW5nZWRcIixcbiAgICAgICAgICAgICAgICAgICAgc2V0dGluZ3M6IGdldEZsYXRTZXR0aW5ncygpXG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgY2FzZSBcInRva2VuRXhwaXJlZFJlcXVlc3RcIjpcbiAgICAgICAgICAgICAgICB2YXIgdG9rZW5FeHBpcmVkQWxhcm1OYW1lID0gXCJ0b2tlbkV4cGlyZWROb3RpZnlUaHJvdHRsZVwiO1xuICAgICAgICAgICAgICAgIGNocm9tZS5hbGFybXMuZ2V0KHRva2VuRXhwaXJlZEFsYXJtTmFtZSwgZnVuY3Rpb24gKGFsYXJtSW5mbykge1xuICAgICAgICAgICAgICAgICAgICAvLyBpZiBhbGFybSBpcyBzZXQgdXNlciBoYXMgYWxyZWFkeSBzZWVuIG5vdGlmaWNhdGlvbiBhYm91dCBleHBpcmVkIHRva2VuXG4gICAgICAgICAgICAgICAgICAgIGlmIChhbGFybUluZm8pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIC8vIGNyZWF0ZSBhbGFybSB0byBwcmV2ZW50IG5vdGlmeWluZyB1c2VyIHRvbyBvZnRlblxuICAgICAgICAgICAgICAgICAgICBjaHJvbWUuYWxhcm1zLmNyZWF0ZSh0b2tlbkV4cGlyZWRBbGFybU5hbWUsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlbGF5SW5NaW51dGVzOiA2MCAqIDI0XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIHNob3cgbm90aWZpY2F0aW9uXG4gICAgICAgICAgICAgICAgICAgIHNob3dDaHJvbWVOb3RpZmljYXRpb24oe1xuICAgICAgICAgICAgICAgICAgICAgICAgaWQ6IFwidG9rZW5FeHBpcmVkUmVxdWVzdFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgdGl0bGU6IGNocm9tZS5pMThuLmdldE1lc3NhZ2UoXCJ0b2tlbkV4cGlyZWROb3RpZmljYXRpb25UaXRsZVwiKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGNocm9tZS5pMThuLmdldE1lc3NhZ2UoXCJ0b2tlbkV4cGlyZWROb3RpZmljYXRpb25NZXNzYWdlXCIpLFxuICAgICAgICAgICAgICAgICAgICAgICAgaWNvbjogY2hyb21lLnJ1bnRpbWUuZ2V0VVJMKFwicGljL2ljb240OC5wbmdcIiksXG4gICAgICAgICAgICAgICAgICAgICAgICBzb3VuZDogXCJlcnJvclwiXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgICAgIENQQS5zZW5kRXZlbnQoXCJBcHAtRGF0YVwiLCBcInRva2VuRXhwaXJlZCBub3RpZmljYXRpb24gc2VlblwiKTtcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICBjYXNlIFwidWlEcmF3XCIgOlxuICAgICAgICAgICAgICAgIHNlbmRBc3luY1Jlc3BvbnNlID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBzZW5kUmVzcG9uc2UodHJ1ZSk7XG5cbiAgICAgICAgICAgICAgICB2YXIgdWlUeXBlO1xuICAgICAgICAgICAgICAgIHZhciBjaGFuZ2Vsb2dOb3RpZmllZCA9IFN0b3JhZ2VNYW5hZ2VyLmdldChcImNoYW5nZWxvZ19ub3RpZmllZFwiLCB7Y29uc3RydWN0b3I6IEFycmF5LCBzdHJpY3Q6IHRydWUsIGNyZWF0ZTogdHJ1ZX0pO1xuICAgICAgICAgICAgICAgIHZhciBpbmJveFN5bmNlZCwgc2VudFN5bmNlZCwgZnJpZW5kc1N5bmNlZDtcbiAgICAgICAgICAgICAgICB2YXIgd2FsbFRva2VuVXBkYXRlZDtcblxuICAgICAgICAgICAgICAgIGlmIChBY2NvdW50c01hbmFnZXIuY3VycmVudFVzZXJJZCkge1xuICAgICAgICAgICAgICAgICAgICBpbmJveFN5bmNlZCA9IChTdG9yYWdlTWFuYWdlci5nZXQoXCJwZXJtX2luYm94X1wiICsgQWNjb3VudHNNYW5hZ2VyLmN1cnJlbnRVc2VySWQpICE9PSBudWxsKTtcbiAgICAgICAgICAgICAgICAgICAgc2VudFN5bmNlZCA9IChTdG9yYWdlTWFuYWdlci5nZXQoXCJwZXJtX291dGJveF9cIiArIEFjY291bnRzTWFuYWdlci5jdXJyZW50VXNlcklkKSAhPT0gbnVsbCk7XG4gICAgICAgICAgICAgICAgICAgIGZyaWVuZHNTeW5jZWQgPSAoU3RvcmFnZU1hbmFnZXIuZ2V0KFwiZnJpZW5kc19zeW5jX3RpbWVcIiwge2NvbnN0cnVjdG9yOiBPYmplY3QsIHN0cmljdDogdHJ1ZSwgY3JlYXRlOiB0cnVlfSlbQWNjb3VudHNNYW5hZ2VyLmN1cnJlbnRVc2VySWRdICE9PSB1bmRlZmluZWQpO1xuXG4gICAgICAgICAgICAgICAgICAgIGlmIChpbmJveFN5bmNlZCAmJiBzZW50U3luY2VkICYmIGZyaWVuZHNTeW5jZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHVpVHlwZSA9IFwidXNlclwiO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgdWlUeXBlID0gXCJzeW5jaW5nXCI7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB1aVR5cGUgPSBcImd1ZXN0XCI7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgc3dpdGNoICh1aVR5cGUpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcInVzZXJcIiA6XG4gICAgICAgICAgICAgICAgICAgICAgICBDUEEuc2VuZEFwcFZpZXcoXCJVc2Vyc1wiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIENQQS5zZW5kRXZlbnQoXCJVSS1EcmF3XCIsIFwiVXNlcnNcIiwgQWNjb3VudHNNYW5hZ2VyLmN1cnJlbnRVc2VySWQpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBjaHJvbWUuc3RvcmFnZS5sb2NhbC5zZXQoe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiZGF5dXNlLmRhdVwiOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwid2Vla3VzZS53YXVcIjogdHJ1ZVxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgXCJzeW5jaW5nXCIgOlxuICAgICAgICAgICAgICAgICAgICAgICAgQ1BBLnNlbmRBcHBWaWV3KFwiU3luY2luZ1wiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIENQQS5zZW5kRXZlbnQoXCJVSS1EcmF3XCIsIFwiU3luY2luZ1wiLCBBY2NvdW50c01hbmFnZXIuY3VycmVudFVzZXJJZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgICAgICAgICBjYXNlIFwiZ3Vlc3RcIiA6XG4gICAgICAgICAgICAgICAgICAgICAgICBDUEEuc2VuZEFwcFZpZXcoXCJHdWVzdHNcIik7XG4gICAgICAgICAgICAgICAgICAgICAgICBDUEEuc2VuZEV2ZW50KFwiVUktRHJhd1wiLCBcIkd1ZXN0c1wiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vINGD0LLQtdC00L7QvNC70Y/QtdC8INGE0YDQvtC90YJcbiAgICAgICAgICAgICAgICBjaHJvbWUucnVudGltZS5zZW5kTWVzc2FnZSh7XG4gICAgICAgICAgICAgICAgICAgIGFjdGlvbjogXCJ1aVwiLFxuICAgICAgICAgICAgICAgICAgICB3aGljaDogdWlUeXBlLFxuICAgICAgICAgICAgICAgICAgICBjdXJyZW50VXNlcklkOiBBY2NvdW50c01hbmFnZXIuY3VycmVudFVzZXJJZCxcbiAgICAgICAgICAgICAgICAgICAgY3VycmVudFVzZXJGaW86IEFjY291bnRzTWFuYWdlci5jdXJyZW50ID8gQWNjb3VudHNNYW5hZ2VyLmN1cnJlbnQuZmlvIDogbnVsbFxuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgIGNhc2UgXCJjbG9zZU5vdGlmaWNhdGlvblwiOlxuICAgICAgICAgICAgICAgIGlmIChub3RpZmljYXRpb25IYW5kbGVyc1tyZXF1ZXN0Lm1pZF0pIHtcbiAgICAgICAgICAgICAgICAgICAgY2hyb21lLm5vdGlmaWNhdGlvbnMuY2xlYXIocmVxdWVzdC5taWQsIF8ubm9vcCk7XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBub3RpZmljYXRpb25IYW5kbGVyc1tyZXF1ZXN0Lm1pZF07XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgIC8vIE5CLiDQldGB0YLRjCDQsdCw0LMsINC60L7Qs9C00LAg0LIg0L3QtdC60L7RgtC+0YDRi9GFINCy0LXRgNGB0LjRj9GFINCx0YDQsNGD0LfQtdGA0LAg0YHQvtGA0YLQuNGA0L7QstC60LAg0YDQsNCx0L7RgtCw0LXRgiDRgdC70LjRiNC60L7QvCDQtNC+0LvQs9C+LiDQlNC70Y8g0L7Qv9GA0LXQtNC10LvQtdC90LjRjyDRjdGC0L7Qs9C+INC80L7QvNC10L3RgtCwINCyIDQuNCDQstC90LXQtNGA0LXQvdC+INGB0LvQtdC00YPRjtGJ0LXQtSDRgNC10YjQtdC90LjQtTpcbiAgICAgICAgICAgIC8vINCf0YDQuCDQv9C10YDQstC+0Lwg0LfQsNC/0YDQvtGB0LUg0LrQvtC90YLQsNC60YLQvtCyINC/0YDQvtCy0LXRgNGP0LXQvCwg0YHQutC+0LvRjNC60L4g0LLRgNC10LzQtdC90Lgg0YDQsNCx0L7RgtCw0Lsg0LfQsNC/0YDQvtGBINC6INCx0Y3QutC10L3QtNGDLiDQldGB0LvQuCDRjdGC0L4g0LfQsNC90Y/Qu9C+INCx0L7Qu9GM0YjQtSAzINGB0LXQutGD0L3QtCwg0YLQviDQvNC10L3Rj9C10Lwg0L3QsNGB0YLRgNC+0LnQutGDINGB0L7RgNGC0LjRgNC+0LLQutC4LlxuICAgICAgICAgICAgLy8g0KHQvtC+0YLQstC10YLRgdGC0LLQtdC90L3QviBcItC30LDQsdGL0LLQsNC10LxcIiDQt9Cw0L/RgNC+0YEg0Lgg0L/QvtGA0L7QttC00LDQtdC8INC90L7QstGL0LkuXG4gICAgICAgICAgICAvLyAxMy4wLjc1NS4wICg4Mzg3OSkgLSDQtNC+0LvQs9Cw0Y8g0LLRi9Cx0L7RgNC60LAg0LrQvtC90YLQsNC60YLQvtCyXG4gICAgICAgICAgICBjYXNlIFwiZmV0Y2hDb250YWN0TGlzdFwiIDpcbiAgICAgICAgICAgICAgICB2YXIgYnJlYWtOZWVkZWQgPSBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgdGltZW91dElkLFxuICAgICAgICAgICAgICAgICAgICBvbkNvbnRhY3RzTGlzdFJlYWR5O1xuXG4gICAgICAgICAgICAgICAgc2VuZEFzeW5jUmVzcG9uc2UgPSB0cnVlO1xuICAgICAgICAgICAgICAgIG9uQ29udGFjdHNMaXN0UmVhZHkgPSBmdW5jdGlvbihjb250YWN0c0xpc3QpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNvbnRhY3RzTGlzdC5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIHZhciBjb250YWN0c0lkcyA9IGNvbnRhY3RzTGlzdC5tYXAoZnVuY3Rpb24oY29udGFjdERhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBjb250YWN0RGF0YS51aWQ7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgICAgIFJlcU1hbmFnZXIuYXBpTWV0aG9kKFwidXNlcnMuZ2V0XCIsIHtcInVpZHNcIiA6IGNvbnRhY3RzSWRzLmpvaW4oXCIsXCIpLCBcImZpZWxkc1wiIDogXCJvbmxpbmVcIn0sIGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEucmVzcG9uc2UuZm9yRWFjaChmdW5jdGlvbihjaHVuaykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBpc09ubGluZSA9IChjaHVuay5vbmxpbmUgPT09IDEgfHwgY2h1bmsub25saW5lX21vYmlsZSA9PT0gMSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2hyb21lLnJ1bnRpbWUuc2VuZE1lc3NhZ2Uoe1wiYWN0aW9uXCIgOiBcImNvbnRhY3RPbmxpbmVTdGF0dXNcIiwgXCJ1aWRcIiA6IGNodW5rLnVpZCwgXCJvbmxpbmVcIiA6IGlzT25saW5lfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgIHRpbWVvdXRJZCA9IHdpbmRvdy5zZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgZGVmYXVsdFNldHRpbmdzVXNlZCA9IChTdG9yYWdlTWFuYWdlci5nZXQoXCJzZXR0aW5nc1wiKSA9PT0gbnVsbCk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChkZWZhdWx0U2V0dGluZ3NVc2VkID09PSBmYWxzZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgYnJlYWtOZWVkZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICBTZXR0aW5nc01hbmFnZXIuU29ydENvbnRhY3RzID0gMjtcblxuICAgICAgICAgICAgICAgICAgICBEYXRhYmFzZU1hbmFnZXIuZ2V0Q29udGFjdExpc3QoXCJhbHBoYVwiLCByZXF1ZXN0LnRvdGFsU2hvd24sIGZ1bmN0aW9uKGNvbnRhY3RzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZW5kUmVzcG9uc2UoY29udGFjdHMpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoU2V0dGluZ3NNYW5hZ2VyLlNob3dPbmxpbmUgPT09IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvbkNvbnRhY3RzTGlzdFJlYWR5KGNvbnRhY3RzWzBdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSwgZnVuY3Rpb24oZXJyTXNnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZW5kUmVzcG9uc2UoW1tdLCAwXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBMb2dNYW5hZ2VyLmVycm9yKGVyck1zZyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sIDMwMDApO1xuXG4gICAgICAgICAgICAgICAgRGF0YWJhc2VNYW5hZ2VyLmdldENvbnRhY3RMaXN0KHJlcXVlc3QudHlwZSwgcmVxdWVzdC50b3RhbFNob3duLCBmdW5jdGlvbihjb250YWN0cykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoYnJlYWtOZWVkZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIHNlbmRSZXNwb25zZShjb250YWN0cyk7XG4gICAgICAgICAgICAgICAgICAgIHdpbmRvdy5jbGVhclRpbWVvdXQodGltZW91dElkKTtcblxuICAgICAgICAgICAgICAgICAgICBpZiAoU2V0dGluZ3NNYW5hZ2VyLlNob3dPbmxpbmUgPT09IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG9uQ29udGFjdHNMaXN0UmVhZHkoY29udGFjdHNbMF0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSwgZnVuY3Rpb24oZXJyTXNnKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChicmVha05lZWRlZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgc2VuZFJlc3BvbnNlKFtbXSwgMF0pO1xuICAgICAgICAgICAgICAgICAgICBMb2dNYW5hZ2VyLmVycm9yKGVyck1zZyk7XG5cbiAgICAgICAgICAgICAgICAgICAgd2luZG93LmNsZWFyVGltZW91dCh0aW1lb3V0SWQpO1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgIGNhc2UgXCJmZXRjaENvbnZlcnNhdGlvbnNcIiA6XG4gICAgICAgICAgICAgICAgc2VuZEFzeW5jUmVzcG9uc2UgPSB0cnVlO1xuICAgICAgICAgICAgICAgIERhdGFiYXNlTWFuYWdlci5nZXRDb252ZXJzYXRpb25zKHJlcXVlc3QudG90YWxTaG93biwgc2VuZFJlc3BvbnNlLCBmdW5jdGlvbiAoZXJyTXNnKSB7XG4gICAgICAgICAgICAgICAgICAgIHNlbmRSZXNwb25zZShbW10sIDBdKTtcbiAgICAgICAgICAgICAgICAgICAgTG9nTWFuYWdlci5lcnJvcihlcnJNc2cpO1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgIGNhc2UgXCJnZXREaWFsb2dUaHJlYWRcIiA6XG4gICAgICAgICAgICAgICAgc2VuZEFzeW5jUmVzcG9uc2UgPSB0cnVlO1xuXG4gICAgICAgICAgICAgICAgRGF0YWJhc2VNYW5hZ2VyLmdldERpYWxvZ1RocmVhZChyZXF1ZXN0LmlkLCB7XG4gICAgICAgICAgICAgICAgICAgIGZyb206IChyZXF1ZXN0LmZyb20gIT09IHVuZGVmaW5lZCkgPyByZXF1ZXN0LmZyb20gOiAwLFxuICAgICAgICAgICAgICAgICAgICBldmVyeXRoaW5nOiBCb29sZWFuKHJlcXVlc3QucHJpbnQpXG4gICAgICAgICAgICAgICAgfSwgc2VuZFJlc3BvbnNlLCBmdW5jdGlvbiAoZXJyTXNnKSB7XG4gICAgICAgICAgICAgICAgICAgIHNlbmRSZXNwb25zZShbW10sIDBdKTtcbiAgICAgICAgICAgICAgICAgICAgTG9nTWFuYWdlci5lcnJvcihlcnJNc2cpO1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgIGNhc2UgXCJnZXRNZXNzYWdlSW5mb1wiIDpcbiAgICAgICAgICAgICAgICBzZW5kQXN5bmNSZXNwb25zZSA9IHRydWU7XG4gICAgICAgICAgICAgICAgRGF0YWJhc2VNYW5hZ2VyLmdldE1lc3NhZ2VCeUlkKE51bWJlcihyZXF1ZXN0Lm1pZCksIHNlbmRSZXNwb25zZSwgZnVuY3Rpb24gKGlzRGF0YWJhc2VFcnJvciwgZXJyTXNnKSB7XG4gICAgICAgICAgICAgICAgICAgIHNlbmRSZXNwb25zZSh1bmRlZmluZWQpO1xuXG4gICAgICAgICAgICAgICAgICAgIGlmIChpc0RhdGFiYXNlRXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIExvZ01hbmFnZXIuZXJyb3IoZXJyTXNnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIENQQS5zZW5kRXZlbnQoXCJDdXN0b20tRXJyb3JzXCIsIFwiRGF0YWJhc2UgZXJyb3JcIiwgZXJyTXNnKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgIGNhc2UgXCJnZXRDb252ZXJzYXRpb25UaHJlYWRzV2l0aENvbnRhY3RcIiA6XG4gICAgICAgICAgICAgICAgc2VuZEFzeW5jUmVzcG9uc2UgPSB0cnVlO1xuICAgICAgICAgICAgICAgIERhdGFiYXNlTWFuYWdlci5nZXRDb252ZXJzYXRpb25UaHJlYWRzV2l0aENvbnRhY3QocmVxdWVzdC51aWQsIHNlbmRSZXNwb25zZSwgZnVuY3Rpb24gKGVyck1zZykge1xuICAgICAgICAgICAgICAgICAgICBzZW5kUmVzcG9uc2UoW10pO1xuICAgICAgICAgICAgICAgICAgICBMb2dNYW5hZ2VyLmVycm9yKGVyck1zZyk7XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgY2FzZSBcImdldENvbnRhY3REYXRhXCIgOlxuICAgICAgICAgICAgICAgIHNlbmRBc3luY1Jlc3BvbnNlID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBEYXRhYmFzZU1hbmFnZXIuZ2V0Q29udGFjdEJ5SWQoQWNjb3VudHNNYW5hZ2VyLmN1cnJlbnRVc2VySWQsIHJlcXVlc3QudWlkLCBzZW5kUmVzcG9uc2UsIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgc2VuZFJlc3BvbnNlKG51bGwpO1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgaWYgKFNldHRpbmdzTWFuYWdlci5TaG93T25saW5lID09PSAxICYmIHJlcXVlc3QuaW5jbHVkZU9ubGluZVN0YXR1cykge1xuICAgICAgICAgICAgICAgICAgICBSZXFNYW5hZ2VyLmFwaU1ldGhvZChcInVzZXJzLmdldFwiLCB7XCJ1aWRzXCIgOiByZXF1ZXN0LnVpZCwgXCJmaWVsZHNcIiA6IFwib25saW5lXCJ9LCBmdW5jdGlvbihkYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkYXRhLnJlc3BvbnNlLmZvckVhY2goZnVuY3Rpb24oY2h1bmspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgaXNPbmxpbmUgPSAoY2h1bmsub25saW5lID09PSAxIHx8IGNodW5rLm9ubGluZV9tb2JpbGUgPT09IDEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNocm9tZS5ydW50aW1lLnNlbmRNZXNzYWdlKHtcImFjdGlvblwiIDogXCJjb250YWN0T25saW5lU3RhdHVzXCIsIFwidWlkXCIgOiBjaHVuay51aWQsIFwib25saW5lXCIgOiBpc09ubGluZX0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICAvLyBUT0RPINC60LDQui3RgtC+INGE0L7RgNC80LDQu9C40LfQuNGA0L7QstCw0YLRjFxuICAgICAgICAgICAgY2FzZSBcImVycm9yR290XCIgOlxuICAgICAgICAgICAgICAgIENQQS5zZW5kRXZlbnQoXCJDdXN0b20tRXJyb3JzXCIsIHJlcXVlc3QuZXJyb3IsIHJlcXVlc3QubWVzc2FnZSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgIGNhc2UgXCJzZW5kTWVzc2FnZVwiIDpcbiAgICAgICAgICAgICAgICB2YXIgbXNnUGFyYW1zID0ge307XG4gICAgICAgICAgICAgICAgc2VuZEFzeW5jUmVzcG9uc2UgPSB0cnVlO1xuXG4gICAgICAgICAgICAgICAgaWYgKHJlcXVlc3QuYm9keSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgIG1zZ1BhcmFtcy5tZXNzYWdlID0gcmVxdWVzdC5ib2R5O1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmIChyZXF1ZXN0LnN1YmplY3QgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICBtc2dQYXJhbXMudGl0bGUgPSByZXF1ZXN0LnN1YmplY3Q7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKHJlcXVlc3Quc2lkICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgbXNnUGFyYW1zLmNhcHRjaGFfc2lkID0gcmVxdWVzdC5zaWQ7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKHJlcXVlc3Qua2V5ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgbXNnUGFyYW1zLmNhcHRjaGFfa2V5ID0gcmVxdWVzdC5rZXk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKHJlcXVlc3QuYXR0YWNobWVudHMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIG1zZ1BhcmFtcy5hdHRhY2htZW50ID0gcmVxdWVzdC5hdHRhY2htZW50cy5qb2luKFwiLFwiKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAoL15bXFxkXSskLy50ZXN0KHJlcXVlc3QudG8pKSB7XG4gICAgICAgICAgICAgICAgICAgIG1zZ1BhcmFtcy5jaGF0X2lkID0gcmVxdWVzdC50bztcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBtc2dQYXJhbXMudWlkID0gcmVxdWVzdC50by5zcGxpdChcIl9cIilbMV07XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKHJlcXVlc3QuY29vcmRzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgbXNnUGFyYW1zLmxhdCA9IHJlcXVlc3QuY29vcmRzLmxhdGl0dWRlO1xuICAgICAgICAgICAgICAgICAgICBtc2dQYXJhbXMubG9uZyA9IHJlcXVlc3QuY29vcmRzLmxvbmdpdHVkZTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBSZXFNYW5hZ2VyLmFwaU1ldGhvZChcIm1lc3NhZ2VzLnNlbmRcIiwgbXNnUGFyYW1zLCBmdW5jdGlvbihkYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgIENQQS5zZW5kRXZlbnQoXCJBcHAtQWN0aW9uc1wiLCBcIlNlbnQgTWVzc2FnZVwiLCBBY2NvdW50c01hbmFnZXIuY3VycmVudFVzZXJJZCk7XG4gICAgICAgICAgICAgICAgICAgIFNvdW5kTWFuYWdlci5wbGF5KFwic2VudFwiKTtcblxuICAgICAgICAgICAgICAgICAgICBzZW5kUmVzcG9uc2UoWzAsIGRhdGFdKTtcbiAgICAgICAgICAgICAgICB9LCBmdW5jdGlvbihlcnJDb2RlLCBlcnJEYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgIENQQS5zZW5kRXZlbnQoXCJDdXN0b20tRXJyb3JzXCIsIFwiRmFpbGVkIHRvIHNlbmQgbWVzc2FnZVwiLCBlcnJDb2RlKTtcbiAgICAgICAgICAgICAgICAgICAgU291bmRNYW5hZ2VyLnBsYXkoXCJlcnJvclwiKTtcblxuICAgICAgICAgICAgICAgICAgICBzd2l0Y2ggKGVyckNvZGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgUmVxTWFuYWdlci5DQVBUQ0hBIDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZW5kUmVzcG9uc2UoWzEsIGVyckRhdGFdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmYXVsdCA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVyckNvZGUgPT09IFJlcU1hbmFnZXIuUkVTUE9OU0VfRVJST1IgJiYgZXJyRGF0YS5jb2RlID09PSA3KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlbmRSZXNwb25zZShbMl0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VuZFJlc3BvbnNlKFszXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICBjYXNlIFwiZ2V0TWVzc2FnZXNVcGxvYWRTZXJ2ZXJcIiA6XG4gICAgICAgICAgICAgICAgdmFyIHNlbmRSZXF1ZXN0ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIFJlcU1hbmFnZXIuYXBpTWV0aG9kKFwicGhvdG9zLmdldE1lc3NhZ2VzVXBsb2FkU2VydmVyXCIsIHNlbmRSZXNwb25zZSwgZnVuY3Rpb24oZXJyQ29kZSwgZXJyRGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgc3dpdGNoIChlcnJDb2RlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBSZXFNYW5hZ2VyLk5PX0lOVEVSTkVUIDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIFJlcU1hbmFnZXIuTk9UX0pTT04gOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgUmVxTWFuYWdlci5USU1FT1VUIDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIFJlcU1hbmFnZXIuUkVTUE9OU0VfRVJST1IgOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB3aW5kb3cuc2V0VGltZW91dChzZW5kUmVxdWVzdCwgNSoxMDAwKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0IDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VuZFJlc3BvbnNlKG51bGwpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgc2VuZFJlcXVlc3QoKTtcbiAgICAgICAgICAgICAgICBzZW5kQXN5bmNSZXNwb25zZSA9IHRydWU7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgIGNhc2UgXCJnZXREb2NzVXBsb2FkU2VydmVyXCIgOlxuICAgICAgICAgICAgICAgIHZhciBzZW5kUmVxdWVzdCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICBSZXFNYW5hZ2VyLmFwaU1ldGhvZChcImRvY3MuZ2V0VXBsb2FkU2VydmVyXCIsIHNlbmRSZXNwb25zZSwgZnVuY3Rpb24oZXJyQ29kZSwgZXJyRGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgc3dpdGNoIChlcnJDb2RlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBSZXFNYW5hZ2VyLk5PX0lOVEVSTkVUIDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIFJlcU1hbmFnZXIuTk9UX0pTT04gOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgUmVxTWFuYWdlci5USU1FT1VUIDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIFJlcU1hbmFnZXIuUkVTUE9OU0VfRVJST1IgOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB3aW5kb3cuc2V0VGltZW91dChzZW5kUmVxdWVzdCwgNSoxMDAwKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0IDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VuZFJlc3BvbnNlKG51bGwpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgc2VuZFJlcXVlc3QoKTtcbiAgICAgICAgICAgICAgICBzZW5kQXN5bmNSZXNwb25zZSA9IHRydWU7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgIGNhc2UgXCJzYXZlTWVzc2FnZXNQaG90b1wiIDpcbiAgICAgICAgICAgICAgICB2YXIgc2VuZFJlcXVlc3QgPSBmdW5jdGlvbihyZXF1ZXN0RGF0YSkge1xuICAgICAgICAgICAgICAgICAgICBSZXFNYW5hZ2VyLmFwaU1ldGhvZChcInBob3Rvcy5zYXZlTWVzc2FnZXNQaG90b1wiLCB7XG4gICAgICAgICAgICAgICAgICAgICAgICBcInNlcnZlclwiIDogcmVxdWVzdERhdGEuc2VydmVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJwaG90b1wiIDogcmVxdWVzdERhdGEucGhvdG8sXG4gICAgICAgICAgICAgICAgICAgICAgICBcImhhc2hcIiA6IHJlcXVlc3REYXRhLmhhc2hcbiAgICAgICAgICAgICAgICAgICAgfSwgc2VuZFJlc3BvbnNlLCBmdW5jdGlvbihlcnJDb2RlLCBlcnJEYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzd2l0Y2ggKGVyckNvZGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIFJlcU1hbmFnZXIuTk9fSU5URVJORVQgOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgUmVxTWFuYWdlci5OT1RfSlNPTiA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBSZXFNYW5hZ2VyLlRJTUVPVVQgOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgUmVxTWFuYWdlci5SRVNQT05TRV9FUlJPUiA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdpbmRvdy5zZXRUaW1lb3V0KHNlbmRSZXF1ZXN0LCA1KjEwMDAsIHJlcXVlc3REYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0IDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VuZFJlc3BvbnNlKG51bGwpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgc2VuZFJlcXVlc3QocmVxdWVzdCk7XG4gICAgICAgICAgICAgICAgc2VuZEFzeW5jUmVzcG9uc2UgPSB0cnVlO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICBjYXNlIFwic2F2ZU1lc3NhZ2VzRG9jXCIgOlxuICAgICAgICAgICAgICAgIHZhciBzZW5kUmVxdWVzdCA9IGZ1bmN0aW9uKHJlcXVlc3REYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgIFJlcU1hbmFnZXIuYXBpTWV0aG9kKFwiZG9jcy5zYXZlXCIsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIFwiZmlsZVwiIDogcmVxdWVzdERhdGEuZmlsZVxuICAgICAgICAgICAgICAgICAgICB9LCBzZW5kUmVzcG9uc2UsIGZ1bmN0aW9uKGVyckNvZGUsIGVyckRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN3aXRjaCAoZXJyQ29kZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgUmVxTWFuYWdlci5OT19JTlRFUk5FVCA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBSZXFNYW5hZ2VyLk5PVF9KU09OIDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIFJlcU1hbmFnZXIuVElNRU9VVCA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBSZXFNYW5hZ2VyLlJFU1BPTlNFX0VSUk9SIDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd2luZG93LnNldFRpbWVvdXQoc2VuZFJlcXVlc3QsIDUqMTAwMCwgcmVxdWVzdERhdGEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlZmF1bHQgOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZW5kUmVzcG9uc2UobnVsbCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICBzZW5kUmVxdWVzdChyZXF1ZXN0KTtcbiAgICAgICAgICAgICAgICBzZW5kQXN5bmNSZXNwb25zZSA9IHRydWU7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgIGNhc2UgXCJhZGRMaWtlXCIgOlxuICAgICAgICAgICAgICAgIENQQS5zZW5kRXZlbnQoXCJBcHAtQWN0aW9uc1wiLCBcIkxpa2UgYW5kIHJlcG9zdFwiKTtcbiAgICAgICAgICAgICAgICBzZW5kQXN5bmNSZXNwb25zZSA9IHRydWU7XG5cbiAgICAgICAgICAgICAgICB2YXIgc2VuZExpa2VSZXF1ZXN0ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIFJlcU1hbmFnZXIuYXBpTWV0aG9kKFwid2FsbC5hZGRMaWtlXCIsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIFwib3duZXJfaWRcIiA6IC0yOTgwOTA1MyxcbiAgICAgICAgICAgICAgICAgICAgICAgIFwicG9zdF9pZFwiIDogNDU0LFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJyZXBvc3RcIiA6IDFcbiAgICAgICAgICAgICAgICAgICAgfSwgZnVuY3Rpb24oZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2VuZFJlc3BvbnNlKDEpO1xuICAgICAgICAgICAgICAgICAgICB9LCBmdW5jdGlvbihlcnJDb2RlLCBlcnJEYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzd2l0Y2ggKGVyckNvZGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIFJlcU1hbmFnZXIuTk9fSU5URVJORVQgOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgUmVxTWFuYWdlci5OT1RfSlNPTiA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBSZXFNYW5hZ2VyLlRJTUVPVVQgOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB3aW5kb3cuc2V0VGltZW91dChzZW5kTGlrZVJlcXVlc3QsIDUqMTAwMCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBSZXFNYW5hZ2VyLlJFU1BPTlNFX0VSUk9SIDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVyckRhdGEuY29kZSA9PT0gMjE3IHx8IGVyckRhdGEuY29kZSA9PT0gMjE1KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZW5kUmVzcG9uc2UoMSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB3aW5kb3cuc2V0VGltZW91dChzZW5kTGlrZVJlcXVlc3QsIDUqMTAwMCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVmYXVsdCA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlbmRSZXNwb25zZSgwKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgIHZhciBzZW5kSm9pbkdyb3VwUmVxdWVzdCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICBSZXFNYW5hZ2VyLmFwaU1ldGhvZChcImdyb3Vwcy5qb2luXCIsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIFwiZ2lkXCIgOiAyOTgwOTA1M1xuICAgICAgICAgICAgICAgICAgICB9LCBudWxsLCBmdW5jdGlvbihlcnJDb2RlLCBlcnJEYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzd2l0Y2ggKGVyckNvZGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIFJlcU1hbmFnZXIuTk9fSU5URVJORVQgOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgUmVxTWFuYWdlci5OT1RfSlNPTiA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBSZXFNYW5hZ2VyLlRJTUVPVVQgOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgUmVxTWFuYWdlci5SRVNQT05TRV9FUlJPUiA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdpbmRvdy5zZXRUaW1lb3V0KHNlbmRKb2luR3JvdXBSZXF1ZXN0LCA1KjEwMDApO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgIHNlbmRMaWtlUmVxdWVzdCgpO1xuICAgICAgICAgICAgICAgIHNlbmRKb2luR3JvdXBSZXF1ZXN0KCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgIGNhc2UgXCJnZXREb2NCeUlkXCIgOlxuICAgICAgICAgICAgICAgIC8vIHZrIGJ1Zzog0LzQtdGC0L7QtCBkb2NzLmdldEJ5SWQg0LLQvtC30LLRgNCw0YnQsNC10YIgcmVzcG9uc2U6IFtdXG4gICAgICAgICAgICAgICAgLy8gaHR0cDovL3Zrb250YWt0ZS5ydS90b3BpYy0xXzIxOTcyMTY5P3Bvc3Q9MzYwMTRcbiAgICAgICAgICAgICAgICB2YXIgc2VuZFJlcXVlc3Q7XG5cbiAgICAgICAgICAgICAgICBzZW5kQXN5bmNSZXNwb25zZSA9IHRydWU7XG5cbiAgICAgICAgICAgICAgICBpZiAocmVxdWVzdC5taWQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICBzZW5kUmVxdWVzdCA9IGZ1bmN0aW9uKHJlcXVlc3REYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXF1ZXN0RGF0YS5vd25lcklkID0gcGFyc2VJbnQocmVxdWVzdERhdGEub3duZXJJZCwgMTApO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVxdWVzdERhdGEuaWQgPSBwYXJzZUludChyZXF1ZXN0RGF0YS5pZCwgMTApO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBSZXFNYW5hZ2VyLmFwaU1ldGhvZChcIm1lc3NhZ2VzLmdldEJ5SWRcIiwge1wibWlkXCIgOiByZXF1ZXN0RGF0YS5taWR9LCBmdW5jdGlvbihkYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKChkYXRhLnJlc3BvbnNlIGluc3RhbmNlb2YgQXJyYXkpID09PSBmYWxzZSB8fCBkYXRhLnJlc3BvbnNlLmxlbmd0aCAhPT0gMiB8fCBkYXRhLnJlc3BvbnNlWzFdLmF0dGFjaG1lbnRzID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgQ1BBLnNlbmRFdmVudChcIkN1c3RvbS1FcnJvcnNcIiwgXCJBdHRhY2htZW50IGluZm8gbWlzc2luZ1wiLCByZXF1ZXN0RGF0YSk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VuZFJlc3BvbnNlKG51bGwpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGkgPSAwOyBpIDwgZGF0YS5yZXNwb25zZVsxXS5hdHRhY2htZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZGF0YS5yZXNwb25zZVsxXS5hdHRhY2htZW50c1tpXS50eXBlID09PSBcImRvY1wiICYmIGRhdGEucmVzcG9uc2VbMV0uYXR0YWNobWVudHNbaV0uZG9jLm93bmVyX2lkID09PSByZXF1ZXN0RGF0YS5vd25lcklkICYmIGRhdGEucmVzcG9uc2VbMV0uYXR0YWNobWVudHNbaV0uZG9jLmRpZCA9PT0gcmVxdWVzdERhdGEuaWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlbmRSZXNwb25zZShkYXRhLnJlc3BvbnNlWzFdLmF0dGFjaG1lbnRzW2ldLmRvYyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBDUEEuc2VuZEV2ZW50KFwiQ3VzdG9tLUVycm9yc1wiLCBcIkF0dGFjaG1lbnQgaW5mbyBtaXNzaW5nXCIsIHJlcXVlc3REYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sIGZ1bmN0aW9uKGVyckNvZGUsIGVyckRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzd2l0Y2ggKGVyckNvZGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBSZXFNYW5hZ2VyLk5PX0lOVEVSTkVUIDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBSZXFNYW5hZ2VyLk5PVF9KU09OIDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBSZXFNYW5hZ2VyLlRJTUVPVVQgOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIFJlcU1hbmFnZXIuUkVTUE9OU0VfRVJST1IgOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd2luZG93LnNldFRpbWVvdXQoc2VuZFJlcXVlc3QsIDUqMTAwMCwgcmVxdWVzdERhdGEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVmYXVsdCA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZW5kUmVzcG9uc2UobnVsbCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgc2VuZFJlcXVlc3QgPSBmdW5jdGlvbihyZXF1ZXN0RGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgUmVxTWFuYWdlci5hcGlNZXRob2QoXCJkb2NzLmdldEJ5SWRcIiwge1wiZG9jc1wiIDogcmVxdWVzdERhdGEub3duZXJJZCArIFwiX1wiICsgcmVxdWVzdERhdGEuaWR9LCBmdW5jdGlvbihkYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIG91dHB1dCA9IChkYXRhLnJlc3BvbnNlLmxlbmd0aCkgPyBkYXRhLnJlc3BvbnNlWzBdIDogbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAob3V0cHV0ID09PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIENQQS5zZW5kRXZlbnQoXCJDdXN0b20tRXJyb3JzXCIsIFwiQXR0YWNobWVudCBpbmZvIG1pc3NpbmdcIiwgcmVxdWVzdERhdGEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlbmRSZXNwb25zZShvdXRwdXQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSwgZnVuY3Rpb24oZXJyQ29kZSwgZXJyRGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN3aXRjaCAoZXJyQ29kZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIFJlcU1hbmFnZXIuTk9fSU5URVJORVQgOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIFJlcU1hbmFnZXIuTk9UX0pTT04gOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIFJlcU1hbmFnZXIuVElNRU9VVCA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgUmVxTWFuYWdlci5SRVNQT05TRV9FUlJPUiA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB3aW5kb3cuc2V0VGltZW91dChzZW5kUmVxdWVzdCwgNSoxMDAwLCByZXF1ZXN0RGF0YSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0IDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlbmRSZXNwb25zZShudWxsKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBzZW5kUmVxdWVzdChyZXF1ZXN0KTtcbiAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgY2FzZSBcImdldEdlb3BvaW50QnlJZFwiIDpcbiAgICAgICAgICAgICAgICBzZW5kQXN5bmNSZXNwb25zZSA9IHRydWU7XG5cbiAgICAgICAgICAgICAgICB2YXIgc2VuZFJlcXVlc3QgPSBmdW5jdGlvbihtc2dJZCkge1xuICAgICAgICAgICAgICAgICAgICBSZXFNYW5hZ2VyLmFwaU1ldGhvZChcIm1lc3NhZ2VzLmdldEJ5SWRcIiwge1wibWlkXCIgOiBtc2dJZH0sIGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICgoZGF0YS5yZXNwb25zZSBpbnN0YW5jZW9mIEFycmF5KSA9PT0gZmFsc2UgfHwgZGF0YS5yZXNwb25zZS5sZW5ndGggIT09IDIgfHwgZGF0YS5yZXNwb25zZVsxXS5nZW8gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIENQQS5zZW5kRXZlbnQoXCJDdXN0b20tRXJyb3JzXCIsIFwiQXR0YWNobWVudCBpbmZvIG1pc3NpbmdcIiwgcmVxdWVzdCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZW5kUmVzcG9uc2UobnVsbCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgY29vcmRzID0gZGF0YS5yZXNwb25zZVsxXS5nZW8uY29vcmRpbmF0ZXMuc3BsaXQoXCIgXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgc2VuZFJlc3BvbnNlKGNvb3Jkcyk7XG4gICAgICAgICAgICAgICAgICAgIH0sIGZ1bmN0aW9uKGVyckNvZGUsIGVyckRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN3aXRjaCAoZXJyQ29kZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgUmVxTWFuYWdlci5OT19JTlRFUk5FVCA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBSZXFNYW5hZ2VyLk5PVF9KU09OIDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIFJlcU1hbmFnZXIuVElNRU9VVCA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBSZXFNYW5hZ2VyLlJFU1BPTlNFX0VSUk9SIDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd2luZG93LnNldFRpbWVvdXQoc2VuZFJlcXVlc3QsIDUqMTAwMCwgbXNnSWQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlZmF1bHQgOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZW5kUmVzcG9uc2UobnVsbCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICBzZW5kUmVxdWVzdChyZXF1ZXN0Lm1pZCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgIGNhc2UgXCJnZXRBdWRpb0J5SWRcIiA6XG4gICAgICAgICAgICAgICAgdmFyIHNlbmRSZXF1ZXN0ID0gZnVuY3Rpb24ocmVxdWVzdERhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgUmVxTWFuYWdlci5hcGlNZXRob2QoXCJhdWRpby5nZXRCeUlkXCIsIHtcImF1ZGlvc1wiIDogcmVxdWVzdERhdGEub3duZXJJZCArIFwiX1wiICsgcmVxdWVzdERhdGEuaWR9LCBmdW5jdGlvbihkYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgb3V0cHV0ID0gKGRhdGEucmVzcG9uc2UubGVuZ3RoKSA/IGRhdGEucmVzcG9uc2VbMF0gOiBudWxsO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG91dHB1dCA9PT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIENQQS5zZW5kRXZlbnQoXCJDdXN0b20tRXJyb3JzXCIsIFwiQXR0YWNobWVudCBpbmZvIG1pc3NpbmdcIiwgcmVxdWVzdERhdGEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICBzZW5kUmVzcG9uc2Uob3V0cHV0KTtcbiAgICAgICAgICAgICAgICAgICAgfSwgZnVuY3Rpb24oZXJyQ29kZSwgZXJyRGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgc3dpdGNoIChlcnJDb2RlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBSZXFNYW5hZ2VyLk5PX0lOVEVSTkVUIDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIFJlcU1hbmFnZXIuTk9UX0pTT04gOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgUmVxTWFuYWdlci5USU1FT1VUIDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIFJlcU1hbmFnZXIuUkVTUE9OU0VfRVJST1IgOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB3aW5kb3cuc2V0VGltZW91dChzZW5kUmVxdWVzdCwgNSoxMDAwLCByZXF1ZXN0RGF0YSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVmYXVsdCA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlbmRSZXNwb25zZShudWxsKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgIHNlbmRSZXF1ZXN0KHJlcXVlc3QpO1xuICAgICAgICAgICAgICAgIHNlbmRBc3luY1Jlc3BvbnNlID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgY2FzZSBcImdldFZpZGVvQnlJZFwiIDpcbiAgICAgICAgICAgICAgICB2YXIgc2VuZFJlcXVlc3QgPSBmdW5jdGlvbihyZXF1ZXN0RGF0YSkge1xuICAgICAgICAgICAgICAgICAgICBSZXFNYW5hZ2VyLmFwaU1ldGhvZChcInZpZGVvLmdldFwiLCB7XCJ2aWRlb3NcIiA6IHJlcXVlc3REYXRhLm93bmVySWQgKyBcIl9cIiArIHJlcXVlc3REYXRhLmlkfSwgZnVuY3Rpb24oZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIG91dHB1dCA9IChkYXRhLnJlc3BvbnNlIGluc3RhbmNlb2YgQXJyYXkgJiYgZGF0YS5yZXNwb25zZS5sZW5ndGggPT09IDIpID8gZGF0YS5yZXNwb25zZVsxXSA6IG51bGw7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAob3V0cHV0ID09PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgQ1BBLnNlbmRFdmVudChcIkN1c3RvbS1FcnJvcnNcIiwgXCJBdHRhY2htZW50IGluZm8gbWlzc2luZ1wiLCByZXF1ZXN0RGF0YSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIHNlbmRSZXNwb25zZShvdXRwdXQpO1xuICAgICAgICAgICAgICAgICAgICB9LCBmdW5jdGlvbihlcnJDb2RlLCBlcnJEYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzd2l0Y2ggKGVyckNvZGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIFJlcU1hbmFnZXIuTk9fSU5URVJORVQgOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgUmVxTWFuYWdlci5OT1RfSlNPTiA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBSZXFNYW5hZ2VyLlRJTUVPVVQgOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgUmVxTWFuYWdlci5SRVNQT05TRV9FUlJPUiA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdpbmRvdy5zZXRUaW1lb3V0KHNlbmRSZXF1ZXN0LCA1KjEwMDAsIHJlcXVlc3REYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0IDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VuZFJlc3BvbnNlKG51bGwpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgc2VuZFJlcXVlc3QocmVxdWVzdCk7XG4gICAgICAgICAgICAgICAgc2VuZEFzeW5jUmVzcG9uc2UgPSB0cnVlO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICBjYXNlIFwiZ2V0UGhvdG9CeUlkXCIgOlxuICAgICAgICAgICAgICAgIHZhciBzZW5kUmVxdWVzdDtcblxuICAgICAgICAgICAgICAgIGlmIChyZXF1ZXN0Lm1pZCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgIHNlbmRSZXF1ZXN0ID0gZnVuY3Rpb24ocmVxdWVzdERhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlcXVlc3REYXRhLm93bmVySWQgPSBwYXJzZUludChyZXF1ZXN0RGF0YS5vd25lcklkLCAxMCk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXF1ZXN0RGF0YS5pZCA9IHBhcnNlSW50KHJlcXVlc3REYXRhLmlkLCAxMCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIFJlcU1hbmFnZXIuYXBpTWV0aG9kKFwibWVzc2FnZXMuZ2V0QnlJZFwiLCB7XCJtaWRcIiA6IHJlcXVlc3REYXRhLm1pZH0sIGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoKGRhdGEucmVzcG9uc2UgaW5zdGFuY2VvZiBBcnJheSkgPT09IGZhbHNlIHx8IGRhdGEucmVzcG9uc2UubGVuZ3RoICE9PSAyIHx8IGRhdGEucmVzcG9uc2VbMV0uYXR0YWNobWVudHMgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBDUEEuc2VuZEV2ZW50KFwiQ3VzdG9tLUVycm9yc1wiLCBcIkF0dGFjaG1lbnQgaW5mbyBtaXNzaW5nXCIsIHJlcXVlc3REYXRhKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZW5kUmVzcG9uc2UobnVsbCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgaTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvciAoaSA9IDA7IGkgPCBkYXRhLnJlc3BvbnNlWzFdLmF0dGFjaG1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChkYXRhLnJlc3BvbnNlWzFdLmF0dGFjaG1lbnRzW2ldLnR5cGUgPT09IFwicGhvdG9cIiAmJiBkYXRhLnJlc3BvbnNlWzFdLmF0dGFjaG1lbnRzW2ldLnBob3RvLm93bmVyX2lkID09PSByZXF1ZXN0RGF0YS5vd25lcklkICYmIGRhdGEucmVzcG9uc2VbMV0uYXR0YWNobWVudHNbaV0ucGhvdG8ucGlkID09PSByZXF1ZXN0RGF0YS5pZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VuZFJlc3BvbnNlKGRhdGEucmVzcG9uc2VbMV0uYXR0YWNobWVudHNbaV0ucGhvdG8pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgQ1BBLnNlbmRFdmVudChcIkN1c3RvbS1FcnJvcnNcIiwgXCJBdHRhY2htZW50IGluZm8gbWlzc2luZ1wiLCByZXF1ZXN0RGF0YSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9LCBmdW5jdGlvbihlcnJDb2RlLCBlcnJEYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3dpdGNoIChlcnJDb2RlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgUmVxTWFuYWdlci5OT19JTlRFUk5FVCA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgUmVxTWFuYWdlci5OT1RfSlNPTiA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgUmVxTWFuYWdlci5USU1FT1VUIDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBSZXFNYW5hZ2VyLlJFU1BPTlNFX0VSUk9SIDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdpbmRvdy5zZXRUaW1lb3V0KHNlbmRSZXF1ZXN0LCA1KjEwMDAsIHJlcXVlc3REYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlZmF1bHQgOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VuZFJlc3BvbnNlKG51bGwpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHNlbmRSZXF1ZXN0ID0gZnVuY3Rpb24ocmVxdWVzdERhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIFJlcU1hbmFnZXIuYXBpTWV0aG9kKFwicGhvdG9zLmdldEJ5SWRcIiwge1wicGhvdG9zXCIgOiByZXF1ZXN0RGF0YS5vd25lcklkICsgXCJfXCIgKyByZXF1ZXN0RGF0YS5pZH0sIGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgb3V0cHV0ID0gKGRhdGEucmVzcG9uc2UubGVuZ3RoKSA/IGRhdGEucmVzcG9uc2VbMF0gOiBudWxsO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChvdXRwdXQgPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgQ1BBLnNlbmRFdmVudChcIkN1c3RvbS1FcnJvcnNcIiwgXCJBdHRhY2htZW50IGluZm8gbWlzc2luZ1wiLCByZXF1ZXN0RGF0YSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VuZFJlc3BvbnNlKG91dHB1dCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9LCBmdW5jdGlvbihlcnJDb2RlLCBlcnJEYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3dpdGNoIChlcnJDb2RlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgUmVxTWFuYWdlci5OT19JTlRFUk5FVCA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgUmVxTWFuYWdlci5OT1RfSlNPTiA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgUmVxTWFuYWdlci5USU1FT1VUIDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBSZXFNYW5hZ2VyLlJFU1BPTlNFX0VSUk9SIDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdpbmRvdy5zZXRUaW1lb3V0KHNlbmRSZXF1ZXN0LCA1KjEwMDAsIHJlcXVlc3REYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlZmF1bHQgOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VuZFJlc3BvbnNlKG51bGwpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHNlbmRSZXF1ZXN0KHJlcXVlc3QpO1xuICAgICAgICAgICAgICAgIHNlbmRBc3luY1Jlc3BvbnNlID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgY2FzZSBcIm1hcmtNZXNzYWdlVGFnXCIgOlxuICAgICAgICAgICAgICAgIERhdGFiYXNlTWFuYWdlci5tYXJrTWVzc2FnZVdpdGhUYWcocmVxdWVzdC5taWQsIHJlcXVlc3QudGFnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgc2VuZFJlc3BvbnNlKHRydWUpO1xuICAgICAgICAgICAgICAgIH0sIGZ1bmN0aW9uIChpc0RhdGFiYXNlRXJyb3IsIGVyck1zZykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoaXNEYXRhYmFzZUVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBMb2dNYW5hZ2VyLmVycm9yKGVyck1zZyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBDUEEuc2VuZEV2ZW50KFwiQ3VzdG9tLUVycm9yc1wiLCBcIkRhdGFiYXNlIGVycm9yXCIsIGVyck1zZyk7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBzZW5kUmVzcG9uc2UoZmFsc2UpO1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgc2VuZEFzeW5jUmVzcG9uc2UgPSB0cnVlO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICBjYXNlIFwibWlncmF0ZUludHJlc3RlZFwiOlxuICAgICAgICAgICAgICAgIG9wZW5BcHBXaW5kb3coKTtcbiAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgY2FzZSBcInVubWFya01lc3NhZ2VUYWdcIiA6XG4gICAgICAgICAgICAgICAgRGF0YWJhc2VNYW5hZ2VyLnVubWFya01lc3NhZ2VXaXRoVGFnKHJlcXVlc3QubWlkLCByZXF1ZXN0LnRhZywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIHNlbmRSZXNwb25zZSh0cnVlKTtcbiAgICAgICAgICAgICAgICB9LCBmdW5jdGlvbihpc0RhdGFiYXNlRXJyb3IsIGVyck1zZykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoaXNEYXRhYmFzZUVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBMb2dNYW5hZ2VyLmVycm9yKGVyck1zZyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBDUEEuc2VuZEV2ZW50KFwiQ3VzdG9tLUVycm9yc1wiLCBcIkRhdGFiYXNlIGVycm9yXCIsIGVyck1zZyk7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBzZW5kUmVzcG9uc2UoZmFsc2UpO1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgc2VuZEFzeW5jUmVzcG9uc2UgPSB0cnVlO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICBjYXNlIFwic2VydmVyRGVsZXRlTWVzc2FnZVwiIDpcbiAgICAgICAgICAgICAgICB2YXIgc2VuZERyb3BNZXNzYWdlUmVxdWVzdCA9IGZ1bmN0aW9uKG1zZ0lkKSB7XG4gICAgICAgICAgICAgICAgICAgIFJlcU1hbmFnZXIuYXBpTWV0aG9kKFwibWVzc2FnZXMuZGVsZXRlXCIsIHtcIm1pZFwiIDogbXNnSWR9LCBmdW5jdGlvbihkYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZW5kUmVzcG9uc2UodHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgIH0sIGZ1bmN0aW9uKGVyckNvZGUsIGVyckRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN3aXRjaCAoZXJyQ29kZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgUmVxTWFuYWdlci5OT19JTlRFUk5FVCA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBSZXFNYW5hZ2VyLk5PVF9KU09OIDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIFJlcU1hbmFnZXIuVElNRU9VVCA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBSZXFNYW5hZ2VyLlJFU1BPTlNFX0VSUk9SIDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd2luZG93LnNldFRpbWVvdXQoc2VuZERyb3BNZXNzYWdlUmVxdWVzdCwgNjAqMTAwMCwgbXNnSWQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgTG9nTWFuYWdlci5lcnJvcihcIkRlbGV0aW5nIG1lc3NhZ2UgZmFpbGVkIChnb3QgZXJyb3IgY29kZSBcIiArIGVyckNvZGUgKyBcIilcIik7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZW5kUmVzcG9uc2UoZmFsc2UpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgc2VuZERyb3BNZXNzYWdlUmVxdWVzdChyZXF1ZXN0Lm1pZCk7XG4gICAgICAgICAgICAgICAgc2VuZEFzeW5jUmVzcG9uc2UgPSB0cnVlO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICBjYXNlIFwic2VydmVyUmVzdG9yZU1lc3NhZ2VcIiA6XG4gICAgICAgICAgICAgICAgQ1BBLnNlbmRFdmVudChcIkFwcC1EYXRhXCIsIFwiVXNlIHJlc3RvcmUgbWVzc2FnZXNcIik7XG5cbiAgICAgICAgICAgICAgICB2YXIgc2VuZFJlc3RvcmVNZXNzYWdlUmVxdWVzdCA9IGZ1bmN0aW9uKG1zZ0lkKSB7XG4gICAgICAgICAgICAgICAgICAgIFJlcU1hbmFnZXIuYXBpTWV0aG9kKFwibWVzc2FnZXMucmVzdG9yZVwiLCB7XCJtaWRcIiA6IG1zZ0lkfSwgZnVuY3Rpb24oZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2VuZFJlc3BvbnNlKHRydWUpO1xuICAgICAgICAgICAgICAgICAgICB9LCBmdW5jdGlvbihlcnJDb2RlLCBlcnJEYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzd2l0Y2ggKGVyckNvZGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIFJlcU1hbmFnZXIuTk9fSU5URVJORVQgOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgUmVxTWFuYWdlci5OT1RfSlNPTiA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBSZXFNYW5hZ2VyLlRJTUVPVVQgOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB3aW5kb3cuc2V0VGltZW91dChzZW5kUmVzdG9yZU1lc3NhZ2VSZXF1ZXN0LCA2MCoxMDAwLCBtc2dJZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICBMb2dNYW5hZ2VyLmVycm9yKFwiUmVzdG9yaW5nIG1lc3NhZ2UgZmFpbGVkIChnb3QgZXJyb3IgY29kZSBcIiArIGVyckNvZGUgKyBcIilcIik7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZW5kUmVzcG9uc2UoZmFsc2UpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgc2VuZFJlc3RvcmVNZXNzYWdlUmVxdWVzdChyZXF1ZXN0Lm1pZCk7XG4gICAgICAgICAgICAgICAgc2VuZEFzeW5jUmVzcG9uc2UgPSB0cnVlO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICBjYXNlIFwiZGVsZXRlTWVzc2FnZUZvcmV2ZXJcIiA6XG4gICAgICAgICAgICAgICAgdmFyIG9uRHJvcCxcbiAgICAgICAgICAgICAgICAgICAgc2VuZERyb3BNZXNzYWdlUmVxdWVzdCxcbiAgICAgICAgICAgICAgICAgICAgYWN0aW9uc1RvR28gPSAocmVxdWVzdC5zZXJ2ZXJUb28pID8gMiA6IDEsXG4gICAgICAgICAgICAgICAgICAgIGFjdGlvbnNNYWRlID0gMDtcblxuICAgICAgICAgICAgICAgIHNlbmRBc3luY1Jlc3BvbnNlID0gdHJ1ZTtcblxuICAgICAgICAgICAgICAgIG9uRHJvcCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICBhY3Rpb25zTWFkZSArPSAxO1xuICAgICAgICAgICAgICAgICAgICBpZiAoYWN0aW9uc01hZGUgIT09IGFjdGlvbnNUb0dvKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBzZW5kUmVzcG9uc2UobnVsbCk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgc2VuZERyb3BNZXNzYWdlUmVxdWVzdCA9IGZ1bmN0aW9uKG1zZ0lkKSB7XG4gICAgICAgICAgICAgICAgICAgIFJlcU1hbmFnZXIuYXBpTWV0aG9kKFwibWVzc2FnZXMuZGVsZXRlXCIsIHtcIm1pZFwiIDogbXNnSWR9LCBmdW5jdGlvbihkYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBvbkRyb3AoKTtcbiAgICAgICAgICAgICAgICAgICAgfSwgZnVuY3Rpb24oZXJyQ29kZSwgZXJyRGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgc3dpdGNoIChlcnJDb2RlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBSZXFNYW5hZ2VyLk5PX0lOVEVSTkVUIDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIFJlcU1hbmFnZXIuTk9UX0pTT04gOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgUmVxTWFuYWdlci5USU1FT1VUIDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd2luZG93LnNldFRpbWVvdXQoc2VuZERyb3BNZXNzYWdlUmVxdWVzdCwgNjAqMTAwMCwgbXNnSWQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgTG9nTWFuYWdlci5lcnJvcihcIkRlbGV0aW5nIG1lc3NhZ2UgZmFpbGVkIChnb3QgZXJyb3IgY29kZSBcIiArIGVyckNvZGUgKyBcIilcIik7XG4gICAgICAgICAgICAgICAgICAgICAgICBvbkRyb3AoKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgIGlmIChyZXF1ZXN0LnNlcnZlclRvbykge1xuICAgICAgICAgICAgICAgICAgICAvLyDQv9C+0YHRi9C70LDQtdC8INC30LDQv9GA0L7RgSDQvdCwINGB0LXRgNCy0LXRgFxuICAgICAgICAgICAgICAgICAgICBzZW5kRHJvcE1lc3NhZ2VSZXF1ZXN0KHJlcXVlc3QubWlkKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyDRg9C00LDQu9GP0LXQvCDQstGB0LUg0LTQsNC90L3Ri9C1INC+INGB0L7QvtCx0YnQtdC90LjQuCDQsiDQkdCUXG4gICAgICAgICAgICAgICAgRGF0YWJhc2VNYW5hZ2VyLmRlbGV0ZU1lc3NhZ2UocmVxdWVzdC5taWQsIG9uRHJvcCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgIGNhc2UgXCJzcGVlY2hDaGFuZ2VcIiA6XG4gICAgICAgICAgICAgICAgQ1BBLnNlbmRFdmVudChcIkFwcC1BY3Rpb25zXCIsIFwiU3BlZWNoIGNoYW5nZVwiLCB7XG4gICAgICAgICAgICAgICAgICAgIFwiY2hyb21lXCIgOiBwcm9jZXNzLnZlcnNpb25zLmNocm9tZSxcbiAgICAgICAgICAgICAgICAgICAgXCJhcHBcIiA6IEFwcC5WRVJTSU9OLFxuICAgICAgICAgICAgICAgICAgICBcInVpZFwiIDogQWNjb3VudHNNYW5hZ2VyLmN1cnJlbnRVc2VySWRcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICBjYXNlIFwibmV3c1Bvc3RTZWVuXCIgOlxuICAgICAgICAgICAgICAgIENQQS5zZW5kRXZlbnQoXCJBcHAtRGF0YVwiLCBcIk5ld3Mgc2VlblwiLCByZXF1ZXN0LmlkKTtcbiAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgY2FzZSBcIm5ld3NMaW5rQ2xpY2tlZFwiIDpcbiAgICAgICAgICAgICAgICBDUEEuc2VuZEV2ZW50KFwiQXBwLUFjdGlvbnNcIiwgXCJOZXdzIGxpbmsgY2xpY2tlZFwiLCBbcmVxdWVzdC5pZCwgcmVxdWVzdC51cmxdKTtcbiAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgY2FzZSBcIm5ld3NBdWRpb1BsYXlpbmdcIiA6XG4gICAgICAgICAgICAgICAgQ1BBLnNlbmRFdmVudChcIkFwcC1BY3Rpb25zXCIsIFwiQXVkaW8gcGxheWluZ1wiLCBbcmVxdWVzdC5pZCwgcmVxdWVzdC5vd25lcl9pZCwgcmVxdWVzdC5haWRdKTtcbiAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgY2FzZSBcInRvdXJXYXRjaFwiIDpcbiAgICAgICAgICAgICAgICBDUEEuc2VuZEV2ZW50KFwiQXBwLURhdGFcIiwgXCJXUCBzZWVuXCIsIHJlcXVlc3Quc3RlcCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgIGNhc2UgXCJ1c2VJbXBvcnRhbnRUYWdcIiA6XG4gICAgICAgICAgICAgICAgQ1BBLnNlbmRFdmVudChcIkFwcC1EYXRhXCIsIFwiVXNlIGltcG9ydGFudCB0YWdcIiwgcmVxdWVzdC50eXBlKTtcbiAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgY2FzZSBcImdldFRhZ3NGcmVxdWVuY3lcIiA6XG4gICAgICAgICAgICAgICAgc2VuZEFzeW5jUmVzcG9uc2UgPSB0cnVlO1xuICAgICAgICAgICAgICAgIERhdGFiYXNlTWFuYWdlci5nZXRUYWdzQ291bnQoc2VuZFJlc3BvbnNlLCBmdW5jdGlvbiAoZXJyTXNnKSB7XG4gICAgICAgICAgICAgICAgICAgIExvZ01hbmFnZXIuZXJyb3IoZXJyTXNnKTtcbiAgICAgICAgICAgICAgICAgICAgQ1BBLnNlbmRFdmVudChcIkN1c3RvbS1FcnJvcnNcIiwgXCJEYXRhYmFzZSBlcnJvclwiLCBlcnJNc2cpO1xuXG4gICAgICAgICAgICAgICAgICAgIHNlbmRSZXNwb25zZSh7fSk7XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgY2FzZSBcImdldE1lc3NhZ2VzQnlUYWdOYW1lXCIgOlxuICAgICAgICAgICAgICAgIHNlbmRBc3luY1Jlc3BvbnNlID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBEYXRhYmFzZU1hbmFnZXIuZ2V0TWVzc2FnZXNCeVR5cGUocmVxdWVzdC50YWcsIHJlcXVlc3QudG90YWxTaG93biB8fCAwLCBzZW5kUmVzcG9uc2UsIGZ1bmN0aW9uKGVyck1zZykge1xuICAgICAgICAgICAgICAgICAgICBMb2dNYW5hZ2VyLmVycm9yKGVyck1zZyk7XG4gICAgICAgICAgICAgICAgICAgIENQQS5zZW5kRXZlbnQoXCJDdXN0b20tRXJyb3JzXCIsIFwiRGF0YWJhc2UgZXJyb3JcIiwgZXJyTXNnKTtcblxuICAgICAgICAgICAgICAgICAgICBzZW5kUmVzcG9uc2UoW1tdLCAwXSk7XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgY2FzZSBcInNlYXJjaENvbnRhY3RcIiA6XG4gICAgICAgICAgICAgICAgRGF0YWJhc2VNYW5hZ2VyLnNlYXJjaENvbnRhY3QocmVxdWVzdC52YWx1ZSwgcmVxdWVzdC50b3RhbFNob3duLCBmdW5jdGlvbiAoY29udGFjdHMsIHRvdGFsKSB7XG4gICAgICAgICAgICAgICAgICAgIHNlbmRSZXNwb25zZShbY29udGFjdHMsIHRvdGFsLCByZXF1ZXN0LnZhbHVlXSk7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKFNldHRpbmdzTWFuYWdlci5TaG93T25saW5lID09PSAxICYmIGNvbnRhY3RzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHVpZHMgPSBjb250YWN0cy5tYXAoZnVuY3Rpb24oY29udGFjdERhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gY29udGFjdERhdGEudWlkO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIFJlcU1hbmFnZXIuYXBpTWV0aG9kKFwidXNlcnMuZ2V0XCIsIHtcInVpZHNcIiA6IHVpZHMuam9pbihcIixcIiksIFwiZmllbGRzXCIgOiBcIm9ubGluZVwifSwgZnVuY3Rpb24oZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEucmVzcG9uc2UuZm9yRWFjaChmdW5jdGlvbihjaHVuaykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgaXNPbmxpbmUgPSAoY2h1bmsub25saW5lID09PSAxIHx8IGNodW5rLm9ubGluZV9tb2JpbGUgPT09IDEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjaHJvbWUucnVudGltZS5zZW5kTWVzc2FnZSh7XCJhY3Rpb25cIiA6IFwiY29udGFjdE9ubGluZVN0YXR1c1wiLCBcInVpZFwiIDogY2h1bmsudWlkLCBcIm9ubGluZVwiIDogaXNPbmxpbmV9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSwgZnVuY3Rpb24gKGVyck1zZykge1xuICAgICAgICAgICAgICAgICAgICBMb2dNYW5hZ2VyLmVycm9yKGVyck1zZyk7XG4gICAgICAgICAgICAgICAgICAgIENQQS5zZW5kRXZlbnQoXCJDdXN0b20tRXJyb3JzXCIsIFwiRGF0YWJhc2UgZXJyb3JcIiwgZXJyTXNnKTtcblxuICAgICAgICAgICAgICAgICAgICBzZW5kUmVzcG9uc2UoW1tdLCAwLCByZXF1ZXN0LnZhbHVlXSk7XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICBzZW5kQXN5bmNSZXNwb25zZSA9IHRydWU7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgIGNhc2UgXCJzZWFyY2hNYWlsXCIgOlxuICAgICAgICAgICAgICAgIHNlbmRBc3luY1Jlc3BvbnNlID0gdHJ1ZTtcblxuICAgICAgICAgICAgICAgIERhdGFiYXNlTWFuYWdlci5zZWFyY2hNYWlsKHJlcXVlc3QucGFyYW1zLCByZXF1ZXN0LnZhbHVlLCByZXF1ZXN0LnRvdGFsU2hvd24sIGZ1bmN0aW9uIChjb3JyZXNwb25kZW5jZSwgdG90YWwpIHtcbiAgICAgICAgICAgICAgICAgICAgc2VuZFJlc3BvbnNlKFtjb3JyZXNwb25kZW5jZSwgdG90YWwsIHJlcXVlc3QudmFsdWVdKTtcbiAgICAgICAgICAgICAgICB9LCBmdW5jdGlvbihlcnJNc2cpIHtcbiAgICAgICAgICAgICAgICAgICAgTG9nTWFuYWdlci5lcnJvcihlcnJNc2cpO1xuICAgICAgICAgICAgICAgICAgICBDUEEuc2VuZEV2ZW50KFwiQ3VzdG9tLUVycm9yc1wiLCBcIkRhdGFiYXNlIGVycm9yXCIsIGVyck1zZyk7XG5cbiAgICAgICAgICAgICAgICAgICAgc2VuZFJlc3BvbnNlKFtbXSwgMCwgcmVxdWVzdC52YWx1ZV0pO1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgIGNhc2UgXCJza2lwU3luY1wiOlxuICAgICAgICAgICAgICAgIGZvcmNlU2tpcFN5bmMgPSB0cnVlO1xuICAgICAgICAgICAgICAgIENQQS5zZW5kRXZlbnQoXCJBcHAtQWN0aW9uc1wiLCBcIlNraXAgc3luY1wiKTtcbiAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgY2FzZSBcImN1cnJlbnRTeW5jVmFsdWVzXCIgOlxuICAgICAgICAgICAgICAgIHZhciBvdXRwdXQgPSBzeW5jaW5nRGF0YVtBY2NvdW50c01hbmFnZXIuY3VycmVudFVzZXJJZF07XG4gICAgICAgICAgICAgICAgc2VuZEFzeW5jUmVzcG9uc2UgPSB0cnVlO1xuXG4gICAgICAgICAgICAgICAgRGF0YWJhc2VNYW5hZ2VyLmdldENvbnRhY3RCeUlkKEFjY291bnRzTWFuYWdlci5jdXJyZW50VXNlcklkLCBBY2NvdW50c01hbmFnZXIuY3VycmVudFVzZXJJZCwgZnVuY3Rpb24gKHVzZXJEYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgIHNlbmRSZXNwb25zZSh7XG4gICAgICAgICAgICAgICAgICAgICAgICBkYXRhOiBvdXRwdXQsXG4gICAgICAgICAgICAgICAgICAgICAgICBhdmF0YXI6IHVzZXJEYXRhLnBob3RvXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgc2VuZFJlc3BvbnNlKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRhdGE6IG91dHB1dFxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICBjYXNlIFwic3dpdGNoVG9BY2NvdW50XCIgOlxuICAgICAgICAgICAgICAgIFJlcU1hbmFnZXIuYWJvcnRBbGwoKTtcbiAgICAgICAgICAgICAgICBBY2NvdW50c01hbmFnZXIuY3VycmVudFVzZXJJZCA9IHJlcXVlc3QudWlkO1xuXG4gICAgICAgICAgICAgICAgdmFyIGNoYW5nZWxvZ05vdGlmaWVkID0gU3RvcmFnZU1hbmFnZXIuZ2V0KFwiY2hhbmdlbG9nX25vdGlmaWVkXCIsIHtjb25zdHJ1Y3RvcjogQXJyYXksIHN0cmljdDogdHJ1ZSwgY3JlYXRlOiB0cnVlfSk7XG4gICAgICAgICAgICAgICAgdmFyIHdhbGxUb2tlblVwZGF0ZWQgPSAoU3RvcmFnZU1hbmFnZXIuZ2V0KFwid2FsbF90b2tlbl91cGRhdGVkXCIsIHtjb25zdHJ1Y3RvcjogT2JqZWN0LCBzdHJpY3Q6IHRydWUsIGNyZWF0ZTogdHJ1ZX0pW0FjY291bnRzTWFuYWdlci5jdXJyZW50VXNlcklkXSAhPT0gdW5kZWZpbmVkKTtcbiAgICAgICAgICAgICAgICB2YXIgc3RhcnRVc2VyID0gdHJ1ZTtcblxuICAgICAgICAgICAgICAgIGlmIChzdGFydFVzZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgc3RhcnRVc2VyU2Vzc2lvbihsZWF2ZU9uZUFwcFdpbmRvd0luc3RhbmNlKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBsZWF2ZU9uZUFwcFdpbmRvd0luc3RhbmNlKCk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgIGNhc2UgXCJkZWxldGVBY2NvdW50XCIgOlxuICAgICAgICAgICAgICAgIFJlcU1hbmFnZXIuYWJvcnRBbGwoKTtcbiAgICAgICAgICAgICAgICBBY2NvdW50c01hbmFnZXIuZHJvcChyZXF1ZXN0LnVpZCk7XG4gICAgICAgICAgICAgICAgRGF0YWJhc2VNYW5hZ2VyLmRyb3BVc2VyKHJlcXVlc3QudWlkKTtcblxuICAgICAgICAgICAgICAgIHZhciBmcmllbmRzU3luY1RpbWUgPSBTdG9yYWdlTWFuYWdlci5nZXQoXCJmcmllbmRzX3N5bmNfdGltZVwiLCB7Y29uc3RydWN0b3I6IE9iamVjdCwgc3RyaWN0OiB0cnVlLCBjcmVhdGU6IHRydWV9KTtcbiAgICAgICAgICAgICAgICBkZWxldGUgZnJpZW5kc1N5bmNUaW1lW3JlcXVlc3QudWlkXTtcbiAgICAgICAgICAgICAgICBTdG9yYWdlTWFuYWdlci5zZXQoXCJmcmllbmRzX3N5bmNfdGltZVwiLCBmcmllbmRzU3luY1RpbWUpO1xuXG4gICAgICAgICAgICAgICAgdmFyIHdhbGxUb2tlblVwZGF0ZWQgPSBTdG9yYWdlTWFuYWdlci5nZXQoXCJ3YWxsX3Rva2VuX3VwZGF0ZWRcIiwge2NvbnN0cnVjdG9yOiBPYmplY3QsIHN0cmljdDogdHJ1ZSwgY3JlYXRlOiB0cnVlfSk7XG4gICAgICAgICAgICAgICAgZGVsZXRlIHdhbGxUb2tlblVwZGF0ZWRbcmVxdWVzdC51aWRdO1xuICAgICAgICAgICAgICAgIFN0b3JhZ2VNYW5hZ2VyLnNldChcIndhbGxfdG9rZW5fdXBkYXRlZFwiLCB3YWxsVG9rZW5VcGRhdGVkKTtcblxuICAgICAgICAgICAgICAgIFN0b3JhZ2VNYW5hZ2VyLnJlbW92ZShcInBlcm1faW5ib3hfXCIgKyByZXF1ZXN0LnVpZCk7XG4gICAgICAgICAgICAgICAgU3RvcmFnZU1hbmFnZXIucmVtb3ZlKFwicGVybV9vdXRib3hfXCIgKyByZXF1ZXN0LnVpZCk7XG5cbiAgICAgICAgICAgICAgICBpZiAocmVxdWVzdC5uZXh0ICE9PSBmYWxzZSkge1xuICAgICAgICAgICAgICAgICAgICBBY2NvdW50c01hbmFnZXIuY3VycmVudFVzZXJJZCA9IHJlcXVlc3QubmV4dDtcbiAgICAgICAgICAgICAgICAgICAgc3RhcnRVc2VyU2Vzc2lvbigpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vINC30LDQutGA0YvQstCw0LXQvCDQstGB0LUg0YLQsNCx0Ysg0L/RgNC40LvQvtC20LXQvdC40Y8g0LrRgNC+0LzQtSDQvtC00L3QvtCz0L5cbiAgICAgICAgICAgICAgICBsZWF2ZU9uZUFwcFdpbmRvd0luc3RhbmNlKCk7XG5cbiAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgY2FzZSBcIm1hcmtBc1JlYWRcIiA6XG4gICAgICAgICAgICAgICAgdmFyIHNlbmRSZWFkTWVzc2FnZVJlcXVlc3QgPSBmdW5jdGlvbiAobXNnSWQpIHtcbiAgICAgICAgICAgICAgICAgICAgUmVxTWFuYWdlci5hcGlNZXRob2QoXCJtZXNzYWdlcy5tYXJrQXNSZWFkXCIsIHtcIm1pZHNcIiA6IG1zZ0lkfSwgbnVsbCwgZnVuY3Rpb24gKGVyckNvZGUsIGVyckRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN3aXRjaCAoZXJyQ29kZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgUmVxTWFuYWdlci5OT19JTlRFUk5FVCA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBSZXFNYW5hZ2VyLk5PVF9KU09OIDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIFJlcU1hbmFnZXIuVElNRU9VVCA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdpbmRvdy5zZXRUaW1lb3V0KHNlbmRSZWFkTWVzc2FnZVJlcXVlc3QsIDYwKjEwMDAsIG1zZ0lkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIExvZ01hbmFnZXIuZXJyb3IoXCJNYXJraW5nIG1lc3NhZ2UgYXMgcmVhZCBmYWlsZWQgKGdvdCBlcnJvciBjb2RlIFwiICsgZXJyQ29kZSArIFwiKVwiKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgIHNlbmRSZWFkTWVzc2FnZVJlcXVlc3QocmVxdWVzdC5taWQpO1xuICAgICAgICAgICAgICAgIERhdGFiYXNlTWFuYWdlci5tYXJrQXNSZWFkKHJlcXVlc3QubWlkLCBudWxsLCBmdW5jdGlvbiAoZXJyTXNnKSB7XG4gICAgICAgICAgICAgICAgICAgIExvZ01hbmFnZXIuZXJyb3IoZXJyTXNnKTtcbiAgICAgICAgICAgICAgICAgICAgQ1BBLnNlbmRFdmVudChcIkN1c3RvbS1FcnJvcnNcIiwgXCJEYXRhYmFzZSBlcnJvclwiLCBlcnJNc2cpO1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgIGNhc2UgXCJETkRoYXBwZW5lZFwiIDpcbiAgICAgICAgICAgICAgICBDUEEuc2VuZEV2ZW50KFwiQXBwLUFjdGlvbnNcIiwgXCJETkRcIiwgcmVxdWVzdC5udW0pO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHNlbmRBc3luY1Jlc3BvbnNlKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgLy8g0L/RgNC4INC30LDQs9GA0YPQt9C60LUg0L/RgNC40LvQvtC20LXQvdC40Y8uLi5cbiAgICBpZiAoQWNjb3VudHNNYW5hZ2VyLmN1cnJlbnRVc2VySWQpIHtcbiAgICAgICAgc3RhcnRVc2VyU2Vzc2lvbigpO1xuICAgIH1cbn0pO1xuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjX2VsZWN0cm9uL3VpL2pzL3N5bmMuanMiXSwic291cmNlUm9vdCI6IiJ9