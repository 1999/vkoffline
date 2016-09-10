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
/******/ 	return __webpack_require__(__webpack_require__.s = 7);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_electron__ = __webpack_require__(1);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_electron___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_0_electron__);
'use strict';



const prepareStackText = errStack => {
	return errStack.split('\n    ');
};

const flattenError = err => {
	const isErrorInstance = err instanceof Error;
	const message = isErrorInstance ? err.message : err;
	const stack = isErrorInstance ? prepareStackText(err.stack) : null;

	return { message, stack };
};

/* harmony default export */ exports["a"] = file => {
	// listen to node-related errors
	process.on('uncaughtException', err => {
		// TODO log errors to IndexedDB
		// LogManager.error(msgError);

		__WEBPACK_IMPORTED_MODULE_0_electron__["ipcRenderer"].send('rendererError', {
			file,
			err: flattenError(err),
			type: 'uncaughtException'
		});
	});

	// listen to unhandled promises being rejected
	process.on('unhandledRejection', reason => {
		// TODO log errors to IndexedDB
		// LogManager.error(msgError);
		// reason is mostly an Error instance

		__WEBPACK_IMPORTED_MODULE_0_electron__["ipcRenderer"].send('rendererError', {
			file,
			err: flattenError(err),
			type: 'unhandledRejection'
		});
	});
};

/***/ },
/* 1 */
/***/ function(module, exports) {

module.exports = require("electron");

/***/ },
/* 2 */,
/* 3 */
/***/ function(module, exports) {

module.exports = {
	"name": "vkoffline",
	"chrome_app_name": "VK Offline",
	"electron_app_name": "VK Backup",
	"version": "5.6.0",
	"private": true,
	"main": "src_electron/core/index.js",
	"dependencies": {
		"electron-prebuilt": "1.3.5",
		"hogan.js": "2.0.x",
		"kinopromise": "0.3.2",
		"lodash": "4.15.0",
		"sklad": "4.2.0"
	},
	"devDependencies": {
		"babel-core": "^6.14.0",
		"babel-loader": "^6.2.5",
		"babel-plugin-transform-async-to-generator": "^6.8.0",
		"babel-plugin-transform-object-rest-spread": "^6.8.0",
		"eslint": "^3.4.0",
		"json-loader": "^0.5.4",
		"pre-commit": "^1.1.3",
		"webpack": "^2.1.0-beta.22"
	},
	"engines": {
		"node": ">=6"
	},
	"scripts": {
		"lint": "eslint src_electron/",
		"start": "WATCH=1 NODE_ENV=development ./node_modules/.bin/electron .",
		"test": "npm run lint"
	},
	"pre-commit": "lint"
};

/***/ },
/* 4 */,
/* 5 */,
/* 6 */,
/* 7 */
/***/ function(module, exports, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__errorhandler__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__package_json__ = __webpack_require__(3);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__package_json___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_1__package_json__);
'use strict';




// enable error processing
__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__errorhandler__["a" /* default */])(global.__filename);

document.title = __WEBPACK_IMPORTED_MODULE_1__package_json__["electron_app_name"];

chrome.runtime.getBackgroundPage(function (backend) {
    var AccountsManager = backend.AccountsManager;

    chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
        var sendAsyncResponse = false;

        switch (request.action) {
            case "tokenExpired":
                var networkStatusElem = $(".network-status.online");
                if (networkStatusElem) {
                    networkStatusElem.classList.add("tokenexpired");
                }

                break;

            case "settingsChanged":
                _.forIn(request.settings, function (value, key) {
                    Settings[key] = value;
                });

                break;

            case "appWontWorkWithoutAccessGranted":
                var i18nTerm, accountsContainer, warnSection, closeBtn, descriptionElem;

                // FIXME: request.reason === 'unknown'
                i18nTerm = request.reason === "denyAccess" ? chrome.i18n.getMessage("appWontWorkWithoutAccessGranted").replace("%appname%", App.NAME) : chrome.i18n.getMessage("appWontWorkDueSecurityBreach");

                if (request.from === "new") {
                    descriptionElem = $("p.description");
                    if (descriptionElem === null) {
                        return;
                    }

                    descriptionElem.text(i18nTerm);
                } else {
                    accountsContainer = $("#content > section.accounts-list");
                    if (accountsContainer === null) {
                        return;
                    }

                    closeBtn = $("<span class='close'/>").bind("click", function () {
                        this.parentNode.remove();
                    });

                    warnSection = $("<section class='result warn'/>").html(i18nTerm).prepend(closeBtn);
                    accountsContainer.prepend(warnSection);

                    window.setTimeout(function () {
                        var warnSection = $("#content > section.accounts-list section.result.warn");
                        if (warnSection !== null) {
                            warnSection.remove();
                        }
                    }, 8000);
                }

                break;

            case "tokenUpdatedInsteadOfAccountAdd":
                var accountsContainer = $("#content > section.accounts-list"),
                    i18nTerm = chrome.i18n.getMessage("tokenUpdatedInsteadOfAccountAdd").replace("%id%", request.uid).replace("%fio%", request.fio),
                    warnSection,
                    closeBtn;

                if (accountsContainer === null) {
                    return;
                }

                closeBtn = $("<span class='close'/>").bind("click", function () {
                    this.parentNode.remove();
                });

                warnSection = $("<section class='result warn'/>").html(i18nTerm).prepend(closeBtn);
                accountsContainer.prepend(warnSection);

                window.setTimeout(function () {
                    var warnSection = $("#content > section.accounts-list section.result.warn");
                    if (warnSection !== null) {
                        warnSection.remove();
                    }
                }, 8000);

                break;

            case "tokenAddedInsteadOfUpdate":
                var accountsContainer = $("#content > section.accounts-list"),
                    i18nTerm = chrome.i18n.getMessage("tokenAddedInsteadOfUpdate").replace(/%id%/g, request.uid),
                    warnSection,
                    closeBtn,
                    continueBtn;

                if (accountsContainer === null) {
                    return;
                }

                closeBtn = $("<span>").addClass("close").bind("click", function () {
                    this.parentNode.remove();
                });

                continueBtn = $("<button>").text(chrome.i18n.getMessage("yes")).bind("click", function () {
                    chrome.runtime.sendMessage({
                        "action": "newUserAfterUpdateToken",
                        "uid": request.uid,
                        "token": request.token
                    });
                });

                warnSection = $("<section>").addClass("result", "warn").html(i18nTerm).prepend(closeBtn).append(continueBtn);
                accountsContainer.prepend(warnSection);
                break;

            case "tokenUpdatedForWrongUser":
                var accountsContainer = $("#content > section.accounts-list"),
                    i18nTerm = chrome.i18n.getMessage("tokenUpdatedForWrongUser").replace("%id%", request.uid).replace("%fio%", request.fio),
                    warnSection,
                    closeBtn;

                if (!accountsContainer) return;

                closeBtn = $("<span>").addClass("close");

                warnSection = $("<section>").addClass("result", "warn").html(i18nTerm).prepend(closeBtn);
                accountsContainer.prepend(warnSection);

                window.setTimeout(function () {
                    var warnSection = $("#content > section.accounts-list section.result.warn");
                    if (warnSection) {
                        warnSection.remove();
                    }
                }, 8000);

                break;

            case "tokenUpdated":
                var accountsContainer = $("#content > section.accounts-list"),
                    infoSection,
                    closeBtn;

                if (accountsContainer === null) {
                    return;
                }

                closeBtn = $("<span>").addClass("close");
                infoSection = $("<section>").addClass("result", "info").text(chrome.i18n.getMessage("tokenUpdated")).prepend(closeBtn);
                accountsContainer.prepend(infoSection);

                window.setTimeout(function () {
                    var infoSection = $("#content > section.accounts-list section.result.info");
                    if (infoSection !== null) {
                        infoSection.remove();
                    }
                }, 3000);

                break;
            case "contactOnlineStatus":
                var selectors = ["#content > section.contacts-container img[data-uid='" + request.uid + "']", "#content > section.contact-data img[data-uid='" + request.uid + "']"];

                selectors.forEach(function (selector) {
                    var elem = $(selector);
                    if (elem !== null) {
                        if (request.online) {
                            elem.addClass("online");
                        } else {
                            elem.addClass("offline");
                        }
                    }
                });

                break;

            case "accountFioLoaded":
                var selectors = ["#header > section.acc-container > span.fio", "body.grey > h1 span"];

                $$(selectors.join(",")).each(function () {
                    this.text(AccountsManager.current.fio);
                });

                break;

            case "newWallPosts":
                var newsIcon = $("aside > span.news");
                AppUI.updateNewsIcon(newsIcon, request.newPostsNum);

                break;

            case "errorLogAttaching":
                var progressElem = $("#errorlog");
                if (progressElem === null) {
                    return;
                }

                if (request.value !== undefined && request.max !== undefined) {
                    progressElem.attr("max", request.max).val(request.value);
                } else {
                    progressElem.remove();
                }

                break;

            case "onlineStatusChanged":
            case "tokenStatus":
                var networkStatusElem = $("#header > section.acc-container > span.network-status"),
                    contentElem = $("#content");

                if (networkStatusElem === null || contentElem === null) {
                    return;
                }

                if (request.action === "onlineStatusChanged") {
                    networkStatusElem.removeClass().addClass(request.status, "network-status");

                    if (request.status === "offline") {
                        contentElem.addClass("offline");
                    } else {
                        contentElem.removeClass("offline");
                    }
                } else {
                    if (request.expired) {
                        networkStatusElem.addClass("tokenexpired");
                    } else {
                        networkStatusElem.removeClass("tokenexpired");
                    }
                }

                break;

            case "ui":
                // user, guest, syncing, migrating, migrated
                if (request.which !== undefined) {
                    if (request.which === "user") {
                        chrome.storage.local.set({
                            "dayuse.dau": true,
                            "weekuse.wau": true
                        });
                    }

                    Account.currentUserId = request.currentUserId;
                    Account.currentUserFio = request.currentUserFio;

                    AppUI.main(request.which);
                } else {
                    window.location.reload();
                }

                break;

            case "msgReadStatusChange":
                var selectors, elem;

                selectors = ["#content > section.right.thread-container > section.half[data-mid='" + request.id + "']", "#content > section.right.chat-container section.msg[data-mid='" + request.id + "']"];

                elem = $(selectors.join(", "));
                if (!elem) return;

                if (request.read) {
                    elem.removeClass("new");
                } else {
                    elem.addClass("new");
                }

                break;

            case "syncProgress":
                var elem = $("#" + request.type + "_" + request.userId);

                if (elem) {
                    // обновляем progressbar
                    $(elem, "progress").attr("max", request.total).val(request.current);

                    // обновляем текстовое отображение загрузки
                    var done = request.current;
                    var total = request.total || request.current;
                    $(elem, "p span").text(done + ' / ' + total);
                }

                break;

            // TODO это же событие должно присылаться при mailSync когда main === user
            // TODO обновлять счетчики в управлении перепиской
            case "messageReceived":
                // NB: это событие приходит ко всем фронтам
                if (AppUI.lastShownView === null) {
                    return;
                }

                var dialogId = request.data.chat_id === 0 ? "0_" + request.data.uid : request.data.chat_id + "",
                    msgData = request.data,
                    threadContainer,
                    formReply,
                    stringMid,
                    threadElem,
                    prtcElem,
                    counterElem,
                    textElem,
                    threadTitle;

                msgData.first_name = request.userdata.first_name;
                msgData.last_name = request.userdata.last_name;
                msgData.status = msgData.read_state;

                switch (AppUI.lastShownView[0]) {
                    case "chat":
                        if (AppUI.lastShownView[1] !== dialogId) {
                            return;
                        }

                        chatContainer = $("#content > section.chat-container");
                        if (!chatContainer) return;

                        formReply = $(chatContainer, "form.reply");
                        stringMid = request.data.mid + "";

                        // удаляем форму, если она относится к этому новому сообщению
                        if (formReply !== null && formReply.data("mid") === stringMid) {
                            window.clearTimeout(formReply.data("timeoutId"));
                            formReply.remove();
                        }

                        // добавляем новое сообщение
                        AppUI.addReceivedMessage(msgData);
                        break;

                    case "mailList":
                        threadElem = $("#content > section.dialogs-container > section[data-id='" + dialogId + "']");
                        if (!threadElem) return;

                        // устанавливаем дату
                        $(threadElem, "div.date").text(Utils.string.humanDate(msgData.date));

                        // обновляем счетчик
                        counterElem = $(threadElem, "div.counter");
                        counterElem.text(parseInt(counterElem.text(), 10) + 1);

                        // добавляем собеседника в список при необходимости
                        prtcId = msgData.tags.indexOf("sent") !== -1 ? AccountsManager.currentUserId : msgData.uid;
                        prtcElem = $(threadElem, "span.user[data-uid='" + prtcId + "']");
                        if (prtcElem === null) {
                            prtcElem = $("<span>").addClass("user").data("uid", prtcId);

                            if (prtcId === AccountsManager.currentUserId) {
                                prtcElem.text(chrome.i18n.getMessage("participantMe"));
                            } else {
                                prtcElem.attr("title", msgData.first_name + " " + msgData.last_name).text(msgData.first_name);
                            }

                            counterElem.before(prtcElem);
                        }

                        textElem = $(threadElem, "span.text");

                        // обновляем тему
                        threadTitle = msgData.title.trim().replace(/(Re(\([\d]+\))?:[\s]+)+/, "").replace(/VKontakte\sOffline\smessage/, "VK Offline message");
                        textElem.dom.firstChild.nodeValue = ["...", ""].indexOf(threadTitle) !== -1 ? chrome.i18n.getMessage("commonDialog") : threadTitle;

                        // обновляем текст последнего сообщения
                        textElem.dom.lastChild.text(msgData.body);

                        // переносим тред в начало
                        $("#content > section.dialogs-container").prepend(threadElem);
                        break;
                }

                break;
        }

        if (sendAsyncResponse) {
            return true;
        }
    });

    // при загрузке страницы спрашиваем бэкенд, что нужно отрисовывать
    chrome.runtime.sendMessage({ "action": "uiDraw" }, function (backendWindowLoaded) {
        if (!backendWindowLoaded) {
            AppUI.main("backendLoading");
        }
    });
});

// <script src="bower_components/lodash/dist/lodash.min.js"></script>
//  <script src="js/app.js"></script>
//  <script src="js/utils.js"></script>

//  <script src="js/soundManager.js"></script>
//  <script src="js/storageManager.js"></script>

//  <script src="js/tipsy.js"></script>
//  <script src="js/dom.js"></script>

//  <script src="js/hogan.js"></script>
//  <script src="js/precompiledTemplates.js"></script>
//  <script src="js/templates.js"></script>

//  <script src="ui/auth.js"></script>

//  <script src="js/ui.js"></script>
//  <script src="js/frontend.js"></script>

//  <link rel="stylesheet" href="css/reset.css" media="all">
//  <link rel="stylesheet" href="css/tipsy.css" media="all">
//  <link rel="stylesheet" href="css/main.css" media="all">
//  <link rel="stylesheet" href="css/small.css" media="screen and (max-height: 600px)">

/***/ }
/******/ ]);
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly8vd2VicGFjay9ib290c3RyYXAgZTc4Mjc3ZmE4MDIzNWYxOTg4OGY/NmE4ZiIsIndlYnBhY2s6Ly8vLi9zcmNfZWxlY3Ryb24vdWkvanMvZXJyb3JoYW5kbGVyLmpzPzFjZGQiLCJ3ZWJwYWNrOi8vL2V4dGVybmFsIFwiZWxlY3Ryb25cIj82OTI4Iiwid2VicGFjazovLy8uL3BhY2thZ2UuanNvbiIsIndlYnBhY2s6Ly8vLi9zcmNfZWxlY3Ryb24vdWkvanMvbWFpbi5qcyJdLCJuYW1lcyI6WyJwcmVwYXJlU3RhY2tUZXh0IiwiZXJyU3RhY2siLCJzcGxpdCIsImZsYXR0ZW5FcnJvciIsImVyciIsImlzRXJyb3JJbnN0YW5jZSIsIkVycm9yIiwibWVzc2FnZSIsInN0YWNrIiwiZmlsZSIsInByb2Nlc3MiLCJvbiIsImlwY1JlbmRlcmVyIiwic2VuZCIsInR5cGUiLCJyZWFzb24iLCJlcnJvcmhhbmRsZXIiLCJnbG9iYWwiLCJfX2ZpbGVuYW1lIiwiZG9jdW1lbnQiLCJ0aXRsZSIsImNocm9tZSIsInJ1bnRpbWUiLCJnZXRCYWNrZ3JvdW5kUGFnZSIsImJhY2tlbmQiLCJBY2NvdW50c01hbmFnZXIiLCJvbk1lc3NhZ2UiLCJhZGRMaXN0ZW5lciIsInJlcXVlc3QiLCJzZW5kZXIiLCJzZW5kUmVzcG9uc2UiLCJzZW5kQXN5bmNSZXNwb25zZSIsImFjdGlvbiIsIm5ldHdvcmtTdGF0dXNFbGVtIiwiJCIsImNsYXNzTGlzdCIsImFkZCIsIl8iLCJmb3JJbiIsInNldHRpbmdzIiwidmFsdWUiLCJrZXkiLCJTZXR0aW5ncyIsImkxOG5UZXJtIiwiYWNjb3VudHNDb250YWluZXIiLCJ3YXJuU2VjdGlvbiIsImNsb3NlQnRuIiwiZGVzY3JpcHRpb25FbGVtIiwiaTE4biIsImdldE1lc3NhZ2UiLCJyZXBsYWNlIiwiQXBwIiwiTkFNRSIsImZyb20iLCJ0ZXh0IiwiYmluZCIsInBhcmVudE5vZGUiLCJyZW1vdmUiLCJodG1sIiwicHJlcGVuZCIsIndpbmRvdyIsInNldFRpbWVvdXQiLCJ1aWQiLCJmaW8iLCJjb250aW51ZUJ0biIsImFkZENsYXNzIiwic2VuZE1lc3NhZ2UiLCJ0b2tlbiIsImFwcGVuZCIsImluZm9TZWN0aW9uIiwic2VsZWN0b3JzIiwiZm9yRWFjaCIsInNlbGVjdG9yIiwiZWxlbSIsIm9ubGluZSIsIiQkIiwiam9pbiIsImVhY2giLCJjdXJyZW50IiwibmV3c0ljb24iLCJBcHBVSSIsInVwZGF0ZU5ld3NJY29uIiwibmV3UG9zdHNOdW0iLCJwcm9ncmVzc0VsZW0iLCJ1bmRlZmluZWQiLCJtYXgiLCJhdHRyIiwidmFsIiwiY29udGVudEVsZW0iLCJyZW1vdmVDbGFzcyIsInN0YXR1cyIsImV4cGlyZWQiLCJ3aGljaCIsInN0b3JhZ2UiLCJsb2NhbCIsInNldCIsIkFjY291bnQiLCJjdXJyZW50VXNlcklkIiwiY3VycmVudFVzZXJGaW8iLCJtYWluIiwibG9jYXRpb24iLCJyZWxvYWQiLCJpZCIsInJlYWQiLCJ1c2VySWQiLCJ0b3RhbCIsImRvbmUiLCJsYXN0U2hvd25WaWV3IiwiZGlhbG9nSWQiLCJkYXRhIiwiY2hhdF9pZCIsIm1zZ0RhdGEiLCJ0aHJlYWRDb250YWluZXIiLCJmb3JtUmVwbHkiLCJzdHJpbmdNaWQiLCJ0aHJlYWRFbGVtIiwicHJ0Y0VsZW0iLCJjb3VudGVyRWxlbSIsInRleHRFbGVtIiwidGhyZWFkVGl0bGUiLCJmaXJzdF9uYW1lIiwidXNlcmRhdGEiLCJsYXN0X25hbWUiLCJyZWFkX3N0YXRlIiwiY2hhdENvbnRhaW5lciIsIm1pZCIsImNsZWFyVGltZW91dCIsImFkZFJlY2VpdmVkTWVzc2FnZSIsIlV0aWxzIiwic3RyaW5nIiwiaHVtYW5EYXRlIiwiZGF0ZSIsInBhcnNlSW50IiwicHJ0Y0lkIiwidGFncyIsImluZGV4T2YiLCJiZWZvcmUiLCJ0cmltIiwiZG9tIiwiZmlyc3RDaGlsZCIsIm5vZGVWYWx1ZSIsImxhc3RDaGlsZCIsImJvZHkiLCJiYWNrZW5kV2luZG93TG9hZGVkIl0sIm1hcHBpbmdzIjoi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QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSx1RiIsImZpbGUiOiJlbnRyeXBvaW50LnVpLmpzIiwic291cmNlc0NvbnRlbnQiOlsiIFx0Ly8gVGhlIG1vZHVsZSBjYWNoZVxuIFx0dmFyIGluc3RhbGxlZE1vZHVsZXMgPSB7fTtcblxuIFx0Ly8gVGhlIHJlcXVpcmUgZnVuY3Rpb25cbiBcdGZ1bmN0aW9uIF9fd2VicGFja19yZXF1aXJlX18obW9kdWxlSWQpIHtcblxuIFx0XHQvLyBDaGVjayBpZiBtb2R1bGUgaXMgaW4gY2FjaGVcbiBcdFx0aWYoaW5zdGFsbGVkTW9kdWxlc1ttb2R1bGVJZF0pXG4gXHRcdFx0cmV0dXJuIGluc3RhbGxlZE1vZHVsZXNbbW9kdWxlSWRdLmV4cG9ydHM7XG5cbiBcdFx0Ly8gQ3JlYXRlIGEgbmV3IG1vZHVsZSAoYW5kIHB1dCBpdCBpbnRvIHRoZSBjYWNoZSlcbiBcdFx0dmFyIG1vZHVsZSA9IGluc3RhbGxlZE1vZHVsZXNbbW9kdWxlSWRdID0ge1xuIFx0XHRcdGk6IG1vZHVsZUlkLFxuIFx0XHRcdGw6IGZhbHNlLFxuIFx0XHRcdGV4cG9ydHM6IHt9XG4gXHRcdH07XG5cbiBcdFx0Ly8gRXhlY3V0ZSB0aGUgbW9kdWxlIGZ1bmN0aW9uXG4gXHRcdG1vZHVsZXNbbW9kdWxlSWRdLmNhbGwobW9kdWxlLmV4cG9ydHMsIG1vZHVsZSwgbW9kdWxlLmV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pO1xuXG4gXHRcdC8vIEZsYWcgdGhlIG1vZHVsZSBhcyBsb2FkZWRcbiBcdFx0bW9kdWxlLmwgPSB0cnVlO1xuXG4gXHRcdC8vIFJldHVybiB0aGUgZXhwb3J0cyBvZiB0aGUgbW9kdWxlXG4gXHRcdHJldHVybiBtb2R1bGUuZXhwb3J0cztcbiBcdH1cblxuXG4gXHQvLyBleHBvc2UgdGhlIG1vZHVsZXMgb2JqZWN0IChfX3dlYnBhY2tfbW9kdWxlc19fKVxuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5tID0gbW9kdWxlcztcblxuIFx0Ly8gZXhwb3NlIHRoZSBtb2R1bGUgY2FjaGVcbiBcdF9fd2VicGFja19yZXF1aXJlX18uYyA9IGluc3RhbGxlZE1vZHVsZXM7XG5cbiBcdC8vIGlkZW50aXR5IGZ1bmN0aW9uIGZvciBjYWxsaW5nIGhhcm1vcnkgaW1wb3J0cyB3aXRoIHRoZSBjb3JyZWN0IGNvbnRleHRcbiBcdF9fd2VicGFja19yZXF1aXJlX18uaSA9IGZ1bmN0aW9uKHZhbHVlKSB7IHJldHVybiB2YWx1ZTsgfTtcblxuIFx0Ly8gZGVmaW5lIGdldHRlciBmdW5jdGlvbiBmb3IgaGFybW9yeSBleHBvcnRzXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLmQgPSBmdW5jdGlvbihleHBvcnRzLCBuYW1lLCBnZXR0ZXIpIHtcbiBcdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIG5hbWUsIHtcbiBcdFx0XHRjb25maWd1cmFibGU6IGZhbHNlLFxuIFx0XHRcdGVudW1lcmFibGU6IHRydWUsXG4gXHRcdFx0Z2V0OiBnZXR0ZXJcbiBcdFx0fSk7XG4gXHR9O1xuXG4gXHQvLyBnZXREZWZhdWx0RXhwb3J0IGZ1bmN0aW9uIGZvciBjb21wYXRpYmlsaXR5IHdpdGggbm9uLWhhcm1vbnkgbW9kdWxlc1xuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5uID0gZnVuY3Rpb24obW9kdWxlKSB7XG4gXHRcdHZhciBnZXR0ZXIgPSBtb2R1bGUgJiYgbW9kdWxlLl9fZXNNb2R1bGUgP1xuIFx0XHRcdGZ1bmN0aW9uIGdldERlZmF1bHQoKSB7IHJldHVybiBtb2R1bGVbJ2RlZmF1bHQnXTsgfSA6XG4gXHRcdFx0ZnVuY3Rpb24gZ2V0TW9kdWxlRXhwb3J0cygpIHsgcmV0dXJuIG1vZHVsZTsgfTtcbiBcdFx0X193ZWJwYWNrX3JlcXVpcmVfXy5kKGdldHRlciwgJ2EnLCBnZXR0ZXIpO1xuIFx0XHRyZXR1cm4gZ2V0dGVyO1xuIFx0fTtcblxuIFx0Ly8gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLm8gPSBmdW5jdGlvbihvYmplY3QsIHByb3BlcnR5KSB7IHJldHVybiBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqZWN0LCBwcm9wZXJ0eSk7IH07XG5cbiBcdC8vIF9fd2VicGFja19wdWJsaWNfcGF0aF9fXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLnAgPSBcIlwiO1xuXG4gXHQvLyBMb2FkIGVudHJ5IG1vZHVsZSBhbmQgcmV0dXJuIGV4cG9ydHNcbiBcdHJldHVybiBfX3dlYnBhY2tfcmVxdWlyZV9fKF9fd2VicGFja19yZXF1aXJlX18ucyA9IDcpO1xuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIHdlYnBhY2svYm9vdHN0cmFwIGU3ODI3N2ZhODAyMzVmMTk4ODhmIiwiJ3VzZSBzdHJpY3QnO1xuXG5pbXBvcnQge2lwY1JlbmRlcmVyfSBmcm9tICdlbGVjdHJvbic7XG5cbmNvbnN0IHByZXBhcmVTdGFja1RleHQgPSAoZXJyU3RhY2spID0+IHtcblx0cmV0dXJuIGVyclN0YWNrLnNwbGl0KCdcXG4gICAgJyk7XG59O1xuXG5jb25zdCBmbGF0dGVuRXJyb3IgPSAoZXJyKSA9PiB7XG5cdGNvbnN0IGlzRXJyb3JJbnN0YW5jZSA9IGVyciBpbnN0YW5jZW9mIEVycm9yOyBcblx0Y29uc3QgbWVzc2FnZSA9IGlzRXJyb3JJbnN0YW5jZSA/IGVyci5tZXNzYWdlIDogZXJyO1xuXHRjb25zdCBzdGFjayA9IGlzRXJyb3JJbnN0YW5jZSA/IHByZXBhcmVTdGFja1RleHQoZXJyLnN0YWNrKSA6IG51bGw7XG5cblx0cmV0dXJuIHttZXNzYWdlLCBzdGFja307XG59O1xuXG5leHBvcnQgZGVmYXVsdCAoZmlsZSkgPT4ge1xuXHQvLyBsaXN0ZW4gdG8gbm9kZS1yZWxhdGVkIGVycm9yc1xuXHRwcm9jZXNzLm9uKCd1bmNhdWdodEV4Y2VwdGlvbicsIGVyciA9PiB7XG5cdFx0Ly8gVE9ETyBsb2cgZXJyb3JzIHRvIEluZGV4ZWREQlxuXHRcdC8vIExvZ01hbmFnZXIuZXJyb3IobXNnRXJyb3IpO1xuXG5cdFx0aXBjUmVuZGVyZXIuc2VuZCgncmVuZGVyZXJFcnJvcicsIHtcblx0XHRcdGZpbGUsXG5cdFx0XHRlcnI6IGZsYXR0ZW5FcnJvcihlcnIpLFxuXHRcdFx0dHlwZTogJ3VuY2F1Z2h0RXhjZXB0aW9uJ1xuXHRcdH0pO1xuXHR9KTtcblxuXHQvLyBsaXN0ZW4gdG8gdW5oYW5kbGVkIHByb21pc2VzIGJlaW5nIHJlamVjdGVkXG5cdHByb2Nlc3Mub24oJ3VuaGFuZGxlZFJlamVjdGlvbicsIHJlYXNvbiA9PiB7XG5cdFx0Ly8gVE9ETyBsb2cgZXJyb3JzIHRvIEluZGV4ZWREQlxuXHRcdC8vIExvZ01hbmFnZXIuZXJyb3IobXNnRXJyb3IpO1xuXHRcdC8vIHJlYXNvbiBpcyBtb3N0bHkgYW4gRXJyb3IgaW5zdGFuY2VcblxuXHRcdGlwY1JlbmRlcmVyLnNlbmQoJ3JlbmRlcmVyRXJyb3InLCB7XG5cdFx0XHRmaWxlLFxuXHRcdFx0ZXJyOiBmbGF0dGVuRXJyb3IoZXJyKSxcblx0XHRcdHR5cGU6ICd1bmhhbmRsZWRSZWplY3Rpb24nXG5cdFx0fSk7XG5cdH0pO1xufVxuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjX2VsZWN0cm9uL3VpL2pzL2Vycm9yaGFuZGxlci5qcyIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcImVsZWN0cm9uXCIpO1xuXG5cbi8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gV0VCUEFDSyBGT09URVJcbi8vIGV4dGVybmFsIFwiZWxlY3Ryb25cIlxuLy8gbW9kdWxlIGlkID0gMVxuLy8gbW9kdWxlIGNodW5rcyA9IDAgMSIsIm1vZHVsZS5leHBvcnRzID0ge1xuXHRcIm5hbWVcIjogXCJ2a29mZmxpbmVcIixcblx0XCJjaHJvbWVfYXBwX25hbWVcIjogXCJWSyBPZmZsaW5lXCIsXG5cdFwiZWxlY3Ryb25fYXBwX25hbWVcIjogXCJWSyBCYWNrdXBcIixcblx0XCJ2ZXJzaW9uXCI6IFwiNS42LjBcIixcblx0XCJwcml2YXRlXCI6IHRydWUsXG5cdFwibWFpblwiOiBcInNyY19lbGVjdHJvbi9jb3JlL2luZGV4LmpzXCIsXG5cdFwiZGVwZW5kZW5jaWVzXCI6IHtcblx0XHRcImVsZWN0cm9uLXByZWJ1aWx0XCI6IFwiMS4zLjVcIixcblx0XHRcImhvZ2FuLmpzXCI6IFwiMi4wLnhcIixcblx0XHRcImtpbm9wcm9taXNlXCI6IFwiMC4zLjJcIixcblx0XHRcImxvZGFzaFwiOiBcIjQuMTUuMFwiLFxuXHRcdFwic2tsYWRcIjogXCI0LjIuMFwiXG5cdH0sXG5cdFwiZGV2RGVwZW5kZW5jaWVzXCI6IHtcblx0XHRcImJhYmVsLWNvcmVcIjogXCJeNi4xNC4wXCIsXG5cdFx0XCJiYWJlbC1sb2FkZXJcIjogXCJeNi4yLjVcIixcblx0XHRcImJhYmVsLXBsdWdpbi10cmFuc2Zvcm0tYXN5bmMtdG8tZ2VuZXJhdG9yXCI6IFwiXjYuOC4wXCIsXG5cdFx0XCJiYWJlbC1wbHVnaW4tdHJhbnNmb3JtLW9iamVjdC1yZXN0LXNwcmVhZFwiOiBcIl42LjguMFwiLFxuXHRcdFwiZXNsaW50XCI6IFwiXjMuNC4wXCIsXG5cdFx0XCJqc29uLWxvYWRlclwiOiBcIl4wLjUuNFwiLFxuXHRcdFwicHJlLWNvbW1pdFwiOiBcIl4xLjEuM1wiLFxuXHRcdFwid2VicGFja1wiOiBcIl4yLjEuMC1iZXRhLjIyXCJcblx0fSxcblx0XCJlbmdpbmVzXCI6IHtcblx0XHRcIm5vZGVcIjogXCI+PTZcIlxuXHR9LFxuXHRcInNjcmlwdHNcIjoge1xuXHRcdFwibGludFwiOiBcImVzbGludCBzcmNfZWxlY3Ryb24vXCIsXG5cdFx0XCJzdGFydFwiOiBcIldBVENIPTEgTk9ERV9FTlY9ZGV2ZWxvcG1lbnQgLi9ub2RlX21vZHVsZXMvLmJpbi9lbGVjdHJvbiAuXCIsXG5cdFx0XCJ0ZXN0XCI6IFwibnBtIHJ1biBsaW50XCJcblx0fSxcblx0XCJwcmUtY29tbWl0XCI6IFwibGludFwiXG59O1xuXG5cbi8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gV0VCUEFDSyBGT09URVJcbi8vIC4vcGFja2FnZS5qc29uXG4vLyBtb2R1bGUgaWQgPSAzXG4vLyBtb2R1bGUgY2h1bmtzID0gMSIsIid1c2Ugc3RyaWN0JztcblxuaW1wb3J0IGVycm9yaGFuZGxlciBmcm9tICcuL2Vycm9yaGFuZGxlcic7XG5pbXBvcnQge2VsZWN0cm9uX2FwcF9uYW1lIGFzIGFwcE5hbWV9IGZyb20gJy4uLy4uLy4uL3BhY2thZ2UuanNvbic7XG5cbi8vIGVuYWJsZSBlcnJvciBwcm9jZXNzaW5nXG5lcnJvcmhhbmRsZXIoZ2xvYmFsLl9fZmlsZW5hbWUpO1xuXG5kb2N1bWVudC50aXRsZSA9IGFwcE5hbWU7XG5cbmNocm9tZS5ydW50aW1lLmdldEJhY2tncm91bmRQYWdlKGZ1bmN0aW9uIChiYWNrZW5kKSB7XG4gICAgdmFyIEFjY291bnRzTWFuYWdlciA9IGJhY2tlbmQuQWNjb3VudHNNYW5hZ2VyO1xuXG4gICAgY2hyb21lLnJ1bnRpbWUub25NZXNzYWdlLmFkZExpc3RlbmVyKGZ1bmN0aW9uIChyZXF1ZXN0LCBzZW5kZXIsIHNlbmRSZXNwb25zZSkge1xuICAgICAgICB2YXIgc2VuZEFzeW5jUmVzcG9uc2UgPSBmYWxzZTtcblxuICAgICAgICBzd2l0Y2ggKHJlcXVlc3QuYWN0aW9uKSB7XG4gICAgICAgICAgICBjYXNlIFwidG9rZW5FeHBpcmVkXCI6XG4gICAgICAgICAgICAgICAgdmFyIG5ldHdvcmtTdGF0dXNFbGVtID0gJChcIi5uZXR3b3JrLXN0YXR1cy5vbmxpbmVcIik7XG4gICAgICAgICAgICAgICAgaWYgKG5ldHdvcmtTdGF0dXNFbGVtKSB7XG4gICAgICAgICAgICAgICAgICAgIG5ldHdvcmtTdGF0dXNFbGVtLmNsYXNzTGlzdC5hZGQoXCJ0b2tlbmV4cGlyZWRcIik7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgIGNhc2UgXCJzZXR0aW5nc0NoYW5nZWRcIjpcbiAgICAgICAgICAgICAgICBfLmZvckluKHJlcXVlc3Quc2V0dGluZ3MsIGZ1bmN0aW9uICh2YWx1ZSwga2V5KSB7XG4gICAgICAgICAgICAgICAgICAgIFNldHRpbmdzW2tleV0gPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICBjYXNlIFwiYXBwV29udFdvcmtXaXRob3V0QWNjZXNzR3JhbnRlZFwiIDpcbiAgICAgICAgICAgICAgICB2YXIgaTE4blRlcm0sXG4gICAgICAgICAgICAgICAgICAgIGFjY291bnRzQ29udGFpbmVyLCB3YXJuU2VjdGlvbiwgY2xvc2VCdG4sXG4gICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uRWxlbTtcblxuICAgICAgICAgICAgICAgIC8vIEZJWE1FOiByZXF1ZXN0LnJlYXNvbiA9PT0gJ3Vua25vd24nXG4gICAgICAgICAgICAgICAgaTE4blRlcm0gPSAocmVxdWVzdC5yZWFzb24gPT09IFwiZGVueUFjY2Vzc1wiKVxuICAgICAgICAgICAgICAgICAgICA/IGNocm9tZS5pMThuLmdldE1lc3NhZ2UoXCJhcHBXb250V29ya1dpdGhvdXRBY2Nlc3NHcmFudGVkXCIpLnJlcGxhY2UoXCIlYXBwbmFtZSVcIiwgQXBwLk5BTUUpXG4gICAgICAgICAgICAgICAgICAgIDogY2hyb21lLmkxOG4uZ2V0TWVzc2FnZShcImFwcFdvbnRXb3JrRHVlU2VjdXJpdHlCcmVhY2hcIik7XG5cbiAgICAgICAgICAgICAgICBpZiAocmVxdWVzdC5mcm9tID09PSBcIm5ld1wiKSB7XG4gICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uRWxlbSA9ICQoXCJwLmRlc2NyaXB0aW9uXCIpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoZGVzY3JpcHRpb25FbGVtID09PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbkVsZW0udGV4dChpMThuVGVybSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgYWNjb3VudHNDb250YWluZXIgPSAkKFwiI2NvbnRlbnQgPiBzZWN0aW9uLmFjY291bnRzLWxpc3RcIik7XG4gICAgICAgICAgICAgICAgICAgIGlmIChhY2NvdW50c0NvbnRhaW5lciA9PT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgY2xvc2VCdG4gPSAkKFwiPHNwYW4gY2xhc3M9J2Nsb3NlJy8+XCIpLmJpbmQoXCJjbGlja1wiLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucGFyZW50Tm9kZS5yZW1vdmUoKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAgICAgd2FyblNlY3Rpb24gPSAkKFwiPHNlY3Rpb24gY2xhc3M9J3Jlc3VsdCB3YXJuJy8+XCIpLmh0bWwoaTE4blRlcm0pLnByZXBlbmQoY2xvc2VCdG4pO1xuICAgICAgICAgICAgICAgICAgICBhY2NvdW50c0NvbnRhaW5lci5wcmVwZW5kKHdhcm5TZWN0aW9uKTtcblxuICAgICAgICAgICAgICAgICAgICB3aW5kb3cuc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciB3YXJuU2VjdGlvbiA9ICQoXCIjY29udGVudCA+IHNlY3Rpb24uYWNjb3VudHMtbGlzdCBzZWN0aW9uLnJlc3VsdC53YXJuXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHdhcm5TZWN0aW9uICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgd2FyblNlY3Rpb24ucmVtb3ZlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0sIDgwMDApO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICBjYXNlIFwidG9rZW5VcGRhdGVkSW5zdGVhZE9mQWNjb3VudEFkZFwiIDpcbiAgICAgICAgICAgICAgICB2YXIgYWNjb3VudHNDb250YWluZXIgPSAkKFwiI2NvbnRlbnQgPiBzZWN0aW9uLmFjY291bnRzLWxpc3RcIiksXG4gICAgICAgICAgICAgICAgICAgIGkxOG5UZXJtID0gY2hyb21lLmkxOG4uZ2V0TWVzc2FnZShcInRva2VuVXBkYXRlZEluc3RlYWRPZkFjY291bnRBZGRcIikucmVwbGFjZShcIiVpZCVcIiwgcmVxdWVzdC51aWQpLnJlcGxhY2UoXCIlZmlvJVwiLCByZXF1ZXN0LmZpbyksXG4gICAgICAgICAgICAgICAgICAgIHdhcm5TZWN0aW9uLCBjbG9zZUJ0bjtcblxuICAgICAgICAgICAgICAgIGlmIChhY2NvdW50c0NvbnRhaW5lciA9PT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgY2xvc2VCdG4gPSAkKFwiPHNwYW4gY2xhc3M9J2Nsb3NlJy8+XCIpLmJpbmQoXCJjbGlja1wiLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wYXJlbnROb2RlLnJlbW92ZSgpO1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgd2FyblNlY3Rpb24gPSAkKFwiPHNlY3Rpb24gY2xhc3M9J3Jlc3VsdCB3YXJuJy8+XCIpLmh0bWwoaTE4blRlcm0pLnByZXBlbmQoY2xvc2VCdG4pO1xuICAgICAgICAgICAgICAgIGFjY291bnRzQ29udGFpbmVyLnByZXBlbmQod2FyblNlY3Rpb24pO1xuXG4gICAgICAgICAgICAgICAgd2luZG93LnNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciB3YXJuU2VjdGlvbiA9ICQoXCIjY29udGVudCA+IHNlY3Rpb24uYWNjb3VudHMtbGlzdCBzZWN0aW9uLnJlc3VsdC53YXJuXCIpO1xuICAgICAgICAgICAgICAgICAgICBpZiAod2FyblNlY3Rpb24gIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHdhcm5TZWN0aW9uLnJlbW92ZSgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSwgODAwMCk7XG5cbiAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgY2FzZSBcInRva2VuQWRkZWRJbnN0ZWFkT2ZVcGRhdGVcIiA6XG4gICAgICAgICAgICAgICAgdmFyIGFjY291bnRzQ29udGFpbmVyID0gJChcIiNjb250ZW50ID4gc2VjdGlvbi5hY2NvdW50cy1saXN0XCIpLFxuICAgICAgICAgICAgICAgICAgICBpMThuVGVybSA9IGNocm9tZS5pMThuLmdldE1lc3NhZ2UoXCJ0b2tlbkFkZGVkSW5zdGVhZE9mVXBkYXRlXCIpLnJlcGxhY2UoLyVpZCUvZywgcmVxdWVzdC51aWQpLFxuICAgICAgICAgICAgICAgICAgICB3YXJuU2VjdGlvbiwgY2xvc2VCdG4sIGNvbnRpbnVlQnRuO1xuXG4gICAgICAgICAgICAgICAgaWYgKGFjY291bnRzQ29udGFpbmVyID09PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBjbG9zZUJ0biA9ICQoXCI8c3Bhbj5cIikuYWRkQ2xhc3MoXCJjbG9zZVwiKS5iaW5kKFwiY2xpY2tcIiwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucGFyZW50Tm9kZS5yZW1vdmUoKTtcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIGNvbnRpbnVlQnRuID0gJChcIjxidXR0b24+XCIpLnRleHQoY2hyb21lLmkxOG4uZ2V0TWVzc2FnZShcInllc1wiKSkuYmluZChcImNsaWNrXCIsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICBjaHJvbWUucnVudGltZS5zZW5kTWVzc2FnZSh7XG4gICAgICAgICAgICAgICAgICAgICAgICBcImFjdGlvblwiIDogXCJuZXdVc2VyQWZ0ZXJVcGRhdGVUb2tlblwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJ1aWRcIiA6IHJlcXVlc3QudWlkLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJ0b2tlblwiIDogcmVxdWVzdC50b2tlblxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIHdhcm5TZWN0aW9uID0gJChcIjxzZWN0aW9uPlwiKS5hZGRDbGFzcyhcInJlc3VsdFwiLCBcIndhcm5cIikuaHRtbChpMThuVGVybSkucHJlcGVuZChjbG9zZUJ0bikuYXBwZW5kKGNvbnRpbnVlQnRuKTtcbiAgICAgICAgICAgICAgICBhY2NvdW50c0NvbnRhaW5lci5wcmVwZW5kKHdhcm5TZWN0aW9uKTtcbiAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgY2FzZSBcInRva2VuVXBkYXRlZEZvcldyb25nVXNlclwiIDpcbiAgICAgICAgICAgICAgICB2YXIgYWNjb3VudHNDb250YWluZXIgPSAkKFwiI2NvbnRlbnQgPiBzZWN0aW9uLmFjY291bnRzLWxpc3RcIiksXG4gICAgICAgICAgICAgICAgICAgIGkxOG5UZXJtID0gY2hyb21lLmkxOG4uZ2V0TWVzc2FnZShcInRva2VuVXBkYXRlZEZvcldyb25nVXNlclwiKS5yZXBsYWNlKFwiJWlkJVwiLCByZXF1ZXN0LnVpZCkucmVwbGFjZShcIiVmaW8lXCIsIHJlcXVlc3QuZmlvKSxcbiAgICAgICAgICAgICAgICAgICAgd2FyblNlY3Rpb24sIGNsb3NlQnRuO1xuXG4gICAgICAgICAgICAgICAgaWYgKCFhY2NvdW50c0NvbnRhaW5lcilcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuXG4gICAgICAgICAgICAgICAgY2xvc2VCdG4gPSAkKFwiPHNwYW4+XCIpLmFkZENsYXNzKFwiY2xvc2VcIik7XG5cbiAgICAgICAgICAgICAgICB3YXJuU2VjdGlvbiA9ICQoXCI8c2VjdGlvbj5cIikuYWRkQ2xhc3MoXCJyZXN1bHRcIiwgXCJ3YXJuXCIpLmh0bWwoaTE4blRlcm0pLnByZXBlbmQoY2xvc2VCdG4pO1xuICAgICAgICAgICAgICAgIGFjY291bnRzQ29udGFpbmVyLnByZXBlbmQod2FyblNlY3Rpb24pO1xuXG4gICAgICAgICAgICAgICAgd2luZG93LnNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciB3YXJuU2VjdGlvbiA9ICQoXCIjY29udGVudCA+IHNlY3Rpb24uYWNjb3VudHMtbGlzdCBzZWN0aW9uLnJlc3VsdC53YXJuXCIpO1xuICAgICAgICAgICAgICAgICAgICBpZiAod2FyblNlY3Rpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHdhcm5TZWN0aW9uLnJlbW92ZSgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSwgODAwMCk7XG5cbiAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgY2FzZSBcInRva2VuVXBkYXRlZFwiIDpcbiAgICAgICAgICAgICAgICB2YXIgYWNjb3VudHNDb250YWluZXIgPSAkKFwiI2NvbnRlbnQgPiBzZWN0aW9uLmFjY291bnRzLWxpc3RcIiksXG4gICAgICAgICAgICAgICAgICAgIGluZm9TZWN0aW9uLCBjbG9zZUJ0bjtcblxuICAgICAgICAgICAgICAgIGlmIChhY2NvdW50c0NvbnRhaW5lciA9PT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgY2xvc2VCdG4gPSAkKFwiPHNwYW4+XCIpLmFkZENsYXNzKFwiY2xvc2VcIik7XG4gICAgICAgICAgICAgICAgaW5mb1NlY3Rpb24gPSAkKFwiPHNlY3Rpb24+XCIpLmFkZENsYXNzKFwicmVzdWx0XCIsIFwiaW5mb1wiKS50ZXh0KGNocm9tZS5pMThuLmdldE1lc3NhZ2UoXCJ0b2tlblVwZGF0ZWRcIikpLnByZXBlbmQoY2xvc2VCdG4pO1xuICAgICAgICAgICAgICAgIGFjY291bnRzQ29udGFpbmVyLnByZXBlbmQoaW5mb1NlY3Rpb24pO1xuXG4gICAgICAgICAgICAgICAgd2luZG93LnNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBpbmZvU2VjdGlvbiA9ICQoXCIjY29udGVudCA+IHNlY3Rpb24uYWNjb3VudHMtbGlzdCBzZWN0aW9uLnJlc3VsdC5pbmZvXCIpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoaW5mb1NlY3Rpb24gIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGluZm9TZWN0aW9uLnJlbW92ZSgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSwgMzAwMCk7XG5cbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgXCJjb250YWN0T25saW5lU3RhdHVzXCIgOlxuICAgICAgICAgICAgICAgIHZhciBzZWxlY3RvcnMgPSBbXG4gICAgICAgICAgICAgICAgICAgIFwiI2NvbnRlbnQgPiBzZWN0aW9uLmNvbnRhY3RzLWNvbnRhaW5lciBpbWdbZGF0YS11aWQ9J1wiICsgcmVxdWVzdC51aWQgKyBcIiddXCIsXG4gICAgICAgICAgICAgICAgICAgIFwiI2NvbnRlbnQgPiBzZWN0aW9uLmNvbnRhY3QtZGF0YSBpbWdbZGF0YS11aWQ9J1wiICsgcmVxdWVzdC51aWQgKyBcIiddXCJcbiAgICAgICAgICAgICAgICBdO1xuXG4gICAgICAgICAgICAgICAgc2VsZWN0b3JzLmZvckVhY2goZnVuY3Rpb24oc2VsZWN0b3IpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGVsZW0gPSAkKHNlbGVjdG9yKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGVsZW0gIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChyZXF1ZXN0Lm9ubGluZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsZW0uYWRkQ2xhc3MoXCJvbmxpbmVcIik7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsZW0uYWRkQ2xhc3MoXCJvZmZsaW5lXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgY2FzZSBcImFjY291bnRGaW9Mb2FkZWRcIiA6XG4gICAgICAgICAgICAgICAgdmFyIHNlbGVjdG9ycyA9IFtcbiAgICAgICAgICAgICAgICAgICAgXCIjaGVhZGVyID4gc2VjdGlvbi5hY2MtY29udGFpbmVyID4gc3Bhbi5maW9cIixcbiAgICAgICAgICAgICAgICAgICAgXCJib2R5LmdyZXkgPiBoMSBzcGFuXCJcbiAgICAgICAgICAgICAgICBdO1xuXG4gICAgICAgICAgICAgICAgJCQoc2VsZWN0b3JzLmpvaW4oXCIsXCIpKS5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy50ZXh0KEFjY291bnRzTWFuYWdlci5jdXJyZW50LmZpbyk7XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgY2FzZSBcIm5ld1dhbGxQb3N0c1wiIDpcbiAgICAgICAgICAgICAgICB2YXIgbmV3c0ljb24gPSAkKFwiYXNpZGUgPiBzcGFuLm5ld3NcIik7XG4gICAgICAgICAgICAgICAgQXBwVUkudXBkYXRlTmV3c0ljb24obmV3c0ljb24sIHJlcXVlc3QubmV3UG9zdHNOdW0pO1xuXG4gICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgIGNhc2UgXCJlcnJvckxvZ0F0dGFjaGluZ1wiIDpcbiAgICAgICAgICAgICAgICB2YXIgcHJvZ3Jlc3NFbGVtID0gJChcIiNlcnJvcmxvZ1wiKTtcbiAgICAgICAgICAgICAgICBpZiAocHJvZ3Jlc3NFbGVtID09PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAocmVxdWVzdC52YWx1ZSAhPT0gdW5kZWZpbmVkICYmIHJlcXVlc3QubWF4ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgcHJvZ3Jlc3NFbGVtLmF0dHIoXCJtYXhcIiwgcmVxdWVzdC5tYXgpLnZhbChyZXF1ZXN0LnZhbHVlKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBwcm9ncmVzc0VsZW0ucmVtb3ZlKCk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgIGNhc2UgXCJvbmxpbmVTdGF0dXNDaGFuZ2VkXCIgOlxuICAgICAgICAgICAgY2FzZSBcInRva2VuU3RhdHVzXCIgOlxuICAgICAgICAgICAgICAgIHZhciBuZXR3b3JrU3RhdHVzRWxlbSA9ICQoXCIjaGVhZGVyID4gc2VjdGlvbi5hY2MtY29udGFpbmVyID4gc3Bhbi5uZXR3b3JrLXN0YXR1c1wiKSxcbiAgICAgICAgICAgICAgICAgICAgY29udGVudEVsZW0gPSAkKFwiI2NvbnRlbnRcIik7XG5cbiAgICAgICAgICAgICAgICBpZiAobmV0d29ya1N0YXR1c0VsZW0gPT09IG51bGwgfHwgY29udGVudEVsZW0gPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmIChyZXF1ZXN0LmFjdGlvbiA9PT0gXCJvbmxpbmVTdGF0dXNDaGFuZ2VkXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgbmV0d29ya1N0YXR1c0VsZW0ucmVtb3ZlQ2xhc3MoKS5hZGRDbGFzcyhyZXF1ZXN0LnN0YXR1cywgXCJuZXR3b3JrLXN0YXR1c1wiKTtcblxuICAgICAgICAgICAgICAgICAgICBpZiAocmVxdWVzdC5zdGF0dXMgPT09IFwib2ZmbGluZVwiKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb250ZW50RWxlbS5hZGRDbGFzcyhcIm9mZmxpbmVcIik7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb250ZW50RWxlbS5yZW1vdmVDbGFzcyhcIm9mZmxpbmVcIik7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBpZiAocmVxdWVzdC5leHBpcmVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBuZXR3b3JrU3RhdHVzRWxlbS5hZGRDbGFzcyhcInRva2VuZXhwaXJlZFwiKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5ldHdvcmtTdGF0dXNFbGVtLnJlbW92ZUNsYXNzKFwidG9rZW5leHBpcmVkXCIpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgIGNhc2UgXCJ1aVwiIDogLy8gdXNlciwgZ3Vlc3QsIHN5bmNpbmcsIG1pZ3JhdGluZywgbWlncmF0ZWRcbiAgICAgICAgICAgICAgICBpZiAocmVxdWVzdC53aGljaCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChyZXF1ZXN0LndoaWNoID09PSBcInVzZXJcIikge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2hyb21lLnN0b3JhZ2UubG9jYWwuc2V0KHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcImRheXVzZS5kYXVcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIndlZWt1c2Uud2F1XCI6IHRydWVcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgQWNjb3VudC5jdXJyZW50VXNlcklkID0gcmVxdWVzdC5jdXJyZW50VXNlcklkO1xuICAgICAgICAgICAgICAgICAgICBBY2NvdW50LmN1cnJlbnRVc2VyRmlvID0gcmVxdWVzdC5jdXJyZW50VXNlckZpbztcblxuICAgICAgICAgICAgICAgICAgICBBcHBVSS5tYWluKHJlcXVlc3Qud2hpY2gpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbi5yZWxvYWQoKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgY2FzZSBcIm1zZ1JlYWRTdGF0dXNDaGFuZ2VcIiA6XG4gICAgICAgICAgICAgICAgdmFyIHNlbGVjdG9ycywgZWxlbTtcblxuICAgICAgICAgICAgICAgIHNlbGVjdG9ycyA9IFtcbiAgICAgICAgICAgICAgICAgICAgXCIjY29udGVudCA+IHNlY3Rpb24ucmlnaHQudGhyZWFkLWNvbnRhaW5lciA+IHNlY3Rpb24uaGFsZltkYXRhLW1pZD0nXCIgKyByZXF1ZXN0LmlkICsgXCInXVwiLFxuICAgICAgICAgICAgICAgICAgICBcIiNjb250ZW50ID4gc2VjdGlvbi5yaWdodC5jaGF0LWNvbnRhaW5lciBzZWN0aW9uLm1zZ1tkYXRhLW1pZD0nXCIgKyByZXF1ZXN0LmlkICsgXCInXVwiXG4gICAgICAgICAgICAgICAgXTtcblxuICAgICAgICAgICAgICAgIGVsZW0gPSAkKHNlbGVjdG9ycy5qb2luKFwiLCBcIikpO1xuICAgICAgICAgICAgICAgIGlmICghZWxlbSlcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuXG4gICAgICAgICAgICAgICAgaWYgKHJlcXVlc3QucmVhZCkge1xuICAgICAgICAgICAgICAgICAgICBlbGVtLnJlbW92ZUNsYXNzKFwibmV3XCIpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGVsZW0uYWRkQ2xhc3MoXCJuZXdcIik7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgIGNhc2UgXCJzeW5jUHJvZ3Jlc3NcIiA6XG4gICAgICAgICAgICAgICAgdmFyIGVsZW0gPSAkKFwiI1wiICsgcmVxdWVzdC50eXBlICsgXCJfXCIgKyByZXF1ZXN0LnVzZXJJZCk7XG5cbiAgICAgICAgICAgICAgICBpZiAoZWxlbSkge1xuICAgICAgICAgICAgICAgICAgICAvLyDQvtCx0L3QvtCy0LvRj9C10LwgcHJvZ3Jlc3NiYXJcbiAgICAgICAgICAgICAgICAgICAgJChlbGVtLCBcInByb2dyZXNzXCIpLmF0dHIoXCJtYXhcIiwgcmVxdWVzdC50b3RhbCkudmFsKHJlcXVlc3QuY3VycmVudCk7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8g0L7QsdC90L7QstC70Y/QtdC8INGC0LXQutGB0YLQvtCy0L7QtSDQvtGC0L7QsdGA0LDQttC10L3QuNC1INC30LDQs9GA0YPQt9C60LhcbiAgICAgICAgICAgICAgICAgICAgdmFyIGRvbmUgPSByZXF1ZXN0LmN1cnJlbnQ7XG4gICAgICAgICAgICAgICAgICAgIHZhciB0b3RhbCA9IHJlcXVlc3QudG90YWwgfHwgcmVxdWVzdC5jdXJyZW50O1xuICAgICAgICAgICAgICAgICAgICAkKGVsZW0sIFwicCBzcGFuXCIpLnRleHQoZG9uZSArICcgLyAnICsgdG90YWwpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICAvLyBUT0RPINGN0YLQviDQttC1INGB0L7QsdGL0YLQuNC1INC00L7Qu9C20L3QviDQv9GA0LjRgdGL0LvQsNGC0YzRgdGPINC/0YDQuCBtYWlsU3luYyDQutC+0LPQtNCwIG1haW4gPT09IHVzZXJcbiAgICAgICAgICAgIC8vIFRPRE8g0L7QsdC90L7QstC70Y/RgtGMINGB0YfQtdGC0YfQuNC60Lgg0LIg0YPQv9GA0LDQstC70LXQvdC40Lgg0L/QtdGA0LXQv9C40YHQutC+0LlcbiAgICAgICAgICAgIGNhc2UgXCJtZXNzYWdlUmVjZWl2ZWRcIiA6IC8vIE5COiDRjdGC0L4g0YHQvtCx0YvRgtC40LUg0L/RgNC40YXQvtC00LjRgiDQutC+INCy0YHQtdC8INGE0YDQvtC90YLQsNC8XG4gICAgICAgICAgICAgICAgaWYgKEFwcFVJLmxhc3RTaG93blZpZXcgPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHZhciBkaWFsb2dJZCA9IChyZXF1ZXN0LmRhdGEuY2hhdF9pZCA9PT0gMCkgPyBcIjBfXCIgKyByZXF1ZXN0LmRhdGEudWlkIDogcmVxdWVzdC5kYXRhLmNoYXRfaWQgKyBcIlwiLFxuICAgICAgICAgICAgICAgICAgICBtc2dEYXRhID0gcmVxdWVzdC5kYXRhLFxuICAgICAgICAgICAgICAgICAgICB0aHJlYWRDb250YWluZXIsIGZvcm1SZXBseSwgc3RyaW5nTWlkLFxuICAgICAgICAgICAgICAgICAgICB0aHJlYWRFbGVtLCBwcnRjRWxlbSwgY291bnRlckVsZW0sIHRleHRFbGVtLCB0aHJlYWRUaXRsZTtcblxuICAgICAgICAgICAgICAgIG1zZ0RhdGEuZmlyc3RfbmFtZSA9IHJlcXVlc3QudXNlcmRhdGEuZmlyc3RfbmFtZTtcbiAgICAgICAgICAgICAgICBtc2dEYXRhLmxhc3RfbmFtZSA9IHJlcXVlc3QudXNlcmRhdGEubGFzdF9uYW1lO1xuICAgICAgICAgICAgICAgIG1zZ0RhdGEuc3RhdHVzID0gbXNnRGF0YS5yZWFkX3N0YXRlO1xuXG4gICAgICAgICAgICAgICAgc3dpdGNoIChBcHBVSS5sYXN0U2hvd25WaWV3WzBdKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgXCJjaGF0XCIgOlxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKEFwcFVJLmxhc3RTaG93blZpZXdbMV0gIT09IGRpYWxvZ0lkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICBjaGF0Q29udGFpbmVyID0gJChcIiNjb250ZW50ID4gc2VjdGlvbi5jaGF0LWNvbnRhaW5lclwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghY2hhdENvbnRhaW5lcilcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGZvcm1SZXBseSA9ICQoY2hhdENvbnRhaW5lciwgXCJmb3JtLnJlcGx5XCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgc3RyaW5nTWlkID0gcmVxdWVzdC5kYXRhLm1pZCArIFwiXCI7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vINGD0LTQsNC70Y/QtdC8INGE0L7RgNC80YMsINC10YHQu9C4INC+0L3QsCDQvtGC0L3QvtGB0LjRgtGB0Y8g0Log0Y3RgtC+0LzRgyDQvdC+0LLQvtC80YMg0YHQvtC+0LHRidC10L3QuNGOXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZm9ybVJlcGx5ICE9PSBudWxsICYmIGZvcm1SZXBseS5kYXRhKFwibWlkXCIpID09PSBzdHJpbmdNaWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB3aW5kb3cuY2xlYXJUaW1lb3V0KGZvcm1SZXBseS5kYXRhKFwidGltZW91dElkXCIpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3JtUmVwbHkucmVtb3ZlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vINC00L7QsdCw0LLQu9GP0LXQvCDQvdC+0LLQvtC1INGB0L7QvtCx0YnQtdC90LjQtVxuICAgICAgICAgICAgICAgICAgICAgICAgQXBwVUkuYWRkUmVjZWl2ZWRNZXNzYWdlKG1zZ0RhdGEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcIm1haWxMaXN0XCIgOlxuICAgICAgICAgICAgICAgICAgICAgICAgdGhyZWFkRWxlbSA9ICQoXCIjY29udGVudCA+IHNlY3Rpb24uZGlhbG9ncy1jb250YWluZXIgPiBzZWN0aW9uW2RhdGEtaWQ9J1wiICsgZGlhbG9nSWQgKyBcIiddXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCF0aHJlYWRFbGVtKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8g0YPRgdGC0LDQvdCw0LLQu9C40LLQsNC10Lwg0LTQsNGC0YNcbiAgICAgICAgICAgICAgICAgICAgICAgICQodGhyZWFkRWxlbSwgXCJkaXYuZGF0ZVwiKS50ZXh0KFV0aWxzLnN0cmluZy5odW1hbkRhdGUobXNnRGF0YS5kYXRlKSk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vINC+0LHQvdC+0LLQu9GP0LXQvCDRgdGH0LXRgtGH0LjQulxuICAgICAgICAgICAgICAgICAgICAgICAgY291bnRlckVsZW0gPSAkKHRocmVhZEVsZW0sIFwiZGl2LmNvdW50ZXJcIik7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb3VudGVyRWxlbS50ZXh0KHBhcnNlSW50KGNvdW50ZXJFbGVtLnRleHQoKSwgMTApICsgMSk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vINC00L7QsdCw0LLQu9GP0LXQvCDRgdC+0LHQtdGB0LXQtNC90LjQutCwINCyINGB0L/QuNGB0L7QuiDQv9GA0Lgg0L3QtdC+0LHRhdC+0LTQuNC80L7RgdGC0LhcbiAgICAgICAgICAgICAgICAgICAgICAgIHBydGNJZCA9IChtc2dEYXRhLnRhZ3MuaW5kZXhPZihcInNlbnRcIikgIT09IC0xKSA/IEFjY291bnRzTWFuYWdlci5jdXJyZW50VXNlcklkIDogbXNnRGF0YS51aWQ7XG4gICAgICAgICAgICAgICAgICAgICAgICBwcnRjRWxlbSA9ICQodGhyZWFkRWxlbSwgXCJzcGFuLnVzZXJbZGF0YS11aWQ9J1wiICsgcHJ0Y0lkICsgXCInXVwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwcnRjRWxlbSA9PT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBydGNFbGVtID0gJChcIjxzcGFuPlwiKS5hZGRDbGFzcyhcInVzZXJcIikuZGF0YShcInVpZFwiLCBwcnRjSWQpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHBydGNJZCA9PT0gQWNjb3VudHNNYW5hZ2VyLmN1cnJlbnRVc2VySWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJ0Y0VsZW0udGV4dChjaHJvbWUuaTE4bi5nZXRNZXNzYWdlKFwicGFydGljaXBhbnRNZVwiKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJ0Y0VsZW0uYXR0cihcInRpdGxlXCIsIG1zZ0RhdGEuZmlyc3RfbmFtZSArIFwiIFwiICsgbXNnRGF0YS5sYXN0X25hbWUpLnRleHQobXNnRGF0YS5maXJzdF9uYW1lKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb3VudGVyRWxlbS5iZWZvcmUocHJ0Y0VsZW0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXh0RWxlbSA9ICQodGhyZWFkRWxlbSwgXCJzcGFuLnRleHRcIik7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vINC+0LHQvdC+0LLQu9GP0LXQvCDRgtC10LzRg1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhyZWFkVGl0bGUgPSBtc2dEYXRhLnRpdGxlLnRyaW0oKS5yZXBsYWNlKC8oUmUoXFwoW1xcZF0rXFwpKT86W1xcc10rKSsvLCBcIlwiKS5yZXBsYWNlKC9WS29udGFrdGVcXHNPZmZsaW5lXFxzbWVzc2FnZS8sIFwiVksgT2ZmbGluZSBtZXNzYWdlXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGV4dEVsZW0uZG9tLmZpcnN0Q2hpbGQubm9kZVZhbHVlID0gKFtcIi4uLlwiLCBcIlwiXS5pbmRleE9mKHRocmVhZFRpdGxlKSAhPT0gLTEpID8gY2hyb21lLmkxOG4uZ2V0TWVzc2FnZShcImNvbW1vbkRpYWxvZ1wiKSA6IHRocmVhZFRpdGxlO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyDQvtCx0L3QvtCy0LvRj9C10Lwg0YLQtdC60YHRgiDQv9C+0YHQu9C10LTQvdC10LPQviDRgdC+0L7QsdGJ0LXQvdC40Y9cbiAgICAgICAgICAgICAgICAgICAgICAgIHRleHRFbGVtLmRvbS5sYXN0Q2hpbGQudGV4dChtc2dEYXRhLmJvZHkpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyDQv9C10YDQtdC90L7RgdC40Lwg0YLRgNC10LQg0LIg0L3QsNGH0LDQu9C+XG4gICAgICAgICAgICAgICAgICAgICAgICAkKFwiI2NvbnRlbnQgPiBzZWN0aW9uLmRpYWxvZ3MtY29udGFpbmVyXCIpLnByZXBlbmQodGhyZWFkRWxlbSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChzZW5kQXN5bmNSZXNwb25zZSkge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIC8vINC/0YDQuCDQt9Cw0LPRgNGD0LfQutC1INGB0YLRgNCw0L3QuNGG0Ysg0YHQv9GA0LDRiNC40LLQsNC10Lwg0LHRjdC60LXQvdC0LCDRh9GC0L4g0L3Rg9C20L3QviDQvtGC0YDQuNGB0L7QstGL0LLQsNGC0YxcbiAgICBjaHJvbWUucnVudGltZS5zZW5kTWVzc2FnZSh7XCJhY3Rpb25cIiA6IFwidWlEcmF3XCJ9LCBmdW5jdGlvbiAoYmFja2VuZFdpbmRvd0xvYWRlZCkge1xuICAgICAgICBpZiAoIWJhY2tlbmRXaW5kb3dMb2FkZWQpIHtcbiAgICAgICAgICAgIEFwcFVJLm1haW4oXCJiYWNrZW5kTG9hZGluZ1wiKTtcbiAgICAgICAgfVxuICAgIH0pO1xufSk7XG5cblxuXG4vLyA8c2NyaXB0IHNyYz1cImJvd2VyX2NvbXBvbmVudHMvbG9kYXNoL2Rpc3QvbG9kYXNoLm1pbi5qc1wiPjwvc2NyaXB0PlxuLy8gIDxzY3JpcHQgc3JjPVwianMvYXBwLmpzXCI+PC9zY3JpcHQ+XG4vLyAgPHNjcmlwdCBzcmM9XCJqcy91dGlscy5qc1wiPjwvc2NyaXB0PlxuXG4vLyAgPHNjcmlwdCBzcmM9XCJqcy9zb3VuZE1hbmFnZXIuanNcIj48L3NjcmlwdD5cbi8vICA8c2NyaXB0IHNyYz1cImpzL3N0b3JhZ2VNYW5hZ2VyLmpzXCI+PC9zY3JpcHQ+XG5cbi8vICA8c2NyaXB0IHNyYz1cImpzL3RpcHN5LmpzXCI+PC9zY3JpcHQ+XG4vLyAgPHNjcmlwdCBzcmM9XCJqcy9kb20uanNcIj48L3NjcmlwdD5cblxuLy8gIDxzY3JpcHQgc3JjPVwianMvaG9nYW4uanNcIj48L3NjcmlwdD5cbi8vICA8c2NyaXB0IHNyYz1cImpzL3ByZWNvbXBpbGVkVGVtcGxhdGVzLmpzXCI+PC9zY3JpcHQ+XG4vLyAgPHNjcmlwdCBzcmM9XCJqcy90ZW1wbGF0ZXMuanNcIj48L3NjcmlwdD5cblxuLy8gIDxzY3JpcHQgc3JjPVwidWkvYXV0aC5qc1wiPjwvc2NyaXB0PlxuXG4vLyAgPHNjcmlwdCBzcmM9XCJqcy91aS5qc1wiPjwvc2NyaXB0PlxuLy8gIDxzY3JpcHQgc3JjPVwianMvZnJvbnRlbmQuanNcIj48L3NjcmlwdD5cblxuLy8gIDxsaW5rIHJlbD1cInN0eWxlc2hlZXRcIiBocmVmPVwiY3NzL3Jlc2V0LmNzc1wiIG1lZGlhPVwiYWxsXCI+XG4vLyAgPGxpbmsgcmVsPVwic3R5bGVzaGVldFwiIGhyZWY9XCJjc3MvdGlwc3kuY3NzXCIgbWVkaWE9XCJhbGxcIj5cbi8vICA8bGluayByZWw9XCJzdHlsZXNoZWV0XCIgaHJlZj1cImNzcy9tYWluLmNzc1wiIG1lZGlhPVwiYWxsXCI+XG4vLyAgPGxpbmsgcmVsPVwic3R5bGVzaGVldFwiIGhyZWY9XCJjc3Mvc21hbGwuY3NzXCIgbWVkaWE9XCJzY3JlZW4gYW5kIChtYXgtaGVpZ2h0OiA2MDBweClcIj5cblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyY19lbGVjdHJvbi91aS9qcy9tYWluLmpzIl0sInNvdXJjZVJvb3QiOiIifQ==