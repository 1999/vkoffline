/* ==========================================================
 * Front page (VK Offline Chrome app)
 * https://github.com/1999/vkoffline
 * ==========================================================
 * Copyright 2013 Dmitry Sorin <info@staypositive.ru>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * ========================================================== */

window.onerror = function(msg, url, line) {
	var msgError = msg + ' in ' + url + ' (line: ' + line + ')';
	console.error(msgError);

	chrome.runtime.getBackgroundPage(function (backend) {
		var LogManager = backend.LogManager;
		LogManager.error("[ui] " + msgError);
	});
};

document.addEventListener("DOMContentLoaded", function () {
	document.title = App.NAME;

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

			case "appWontWorkWithoutAccessGranted" :
				var i18nTerm,
					accountsContainer, warnSection, closeBtn,
					descriptionElem;

				// FIXME: request.reason === 'unknown'
				i18nTerm = (request.reason === "denyAccess")
					? chrome.i18n.getMessage("appWontWorkWithoutAccessGranted").replace("%appname%", App.NAME)
					: chrome.i18n.getMessage("appWontWorkDueSecurityBreach");

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

					closeBtn = $("<span class='close'/>").bind("click", function() {
						this.parentNode.remove();
					});

					warnSection = $("<section class='result warn'/>").html(i18nTerm).prepend(closeBtn);
					accountsContainer.prepend(warnSection);

					window.setTimeout(function() {
						var warnSection = $("#content > section.accounts-list section.result.warn");
						if (warnSection !== null) {
							warnSection.remove();
						}
					}, 8000);
				}

				break;

			case "tokenUpdatedInsteadOfAccountAdd" :
				var accountsContainer = $("#content > section.accounts-list"),
					i18nTerm = chrome.i18n.getMessage("tokenUpdatedInsteadOfAccountAdd").replace("%id%", request.uid).replace("%fio%", request.fio),
					warnSection, closeBtn;

				if (accountsContainer === null) {
					return;
				}

				closeBtn = $("<span class='close'/>").bind("click", function() {
					this.parentNode.remove();
				});

				warnSection = $("<section class='result warn'/>").html(i18nTerm).prepend(closeBtn);
				accountsContainer.prepend(warnSection);

				window.setTimeout(function() {
					var warnSection = $("#content > section.accounts-list section.result.warn");
					if (warnSection !== null) {
						warnSection.remove();
					}
				}, 8000);

				break;

			case "tokenAddedInsteadOfUpdate" :
				var accountsContainer = $("#content > section.accounts-list"),
					i18nTerm = chrome.i18n.getMessage("tokenAddedInsteadOfUpdate").replace(/%id%/g, request.uid),
					warnSection, closeBtn, continueBtn;

				if (accountsContainer === null) {
					return;
				}

				closeBtn = $("<span>").addClass("close").bind("click", function() {
					this.parentNode.remove();
				});

				continueBtn = $("<button>").text(chrome.i18n.getMessage("yes")).bind("click", function() {
					chrome.runtime.sendMessage({
						"action" : "newUserAfterUpdateToken",
						"uid" : request.uid,
						"token" : request.token
					});
				});

				warnSection = $("<section>").addClass("result", "warn").html(i18nTerm).prepend(closeBtn).append(continueBtn);
				accountsContainer.prepend(warnSection);
				break;

			case "tokenUpdatedForWrongUser" :
				var accountsContainer = $("#content > section.accounts-list"),
					i18nTerm = chrome.i18n.getMessage("tokenUpdatedForWrongUser").replace("%id%", request.uid).replace("%fio%", request.fio),
					warnSection, closeBtn;

				if (!accountsContainer)
					return;

				closeBtn = $("<span>").addClass("close");

				warnSection = $("<section>").addClass("result", "warn").html(i18nTerm).prepend(closeBtn);
				accountsContainer.prepend(warnSection);

				window.setTimeout(function() {
					var warnSection = $("#content > section.accounts-list section.result.warn");
					if (warnSection) {
						warnSection.remove();
					}
				}, 8000);

				break;

			case "tokenUpdated" :
				var accountsContainer = $("#content > section.accounts-list"),
					infoSection, closeBtn;

				if (accountsContainer === null) {
					return;
				}

				closeBtn = $("<span>").addClass("close");
				infoSection = $("<section>").addClass("result", "info").text(chrome.i18n.getMessage("tokenUpdated")).prepend(closeBtn);
				accountsContainer.prepend(infoSection);

				window.setTimeout(function() {
					var infoSection = $("#content > section.accounts-list section.result.info");
					if (infoSection !== null) {
						infoSection.remove();
					}
				}, 3000);

				break;
			case "contactOnlineStatus" :
				var selectors = [
					"#content > section.contacts-container img[data-uid='" + request.uid + "']",
					"#content > section.contact-data img[data-uid='" + request.uid + "']"
				];

				selectors.forEach(function(selector) {
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

			case "accountFioLoaded" :
				var selectors = [
					"#header > section.acc-container > span.fio",
					"body.grey > h1 span"
				];

				$$(selectors.join(",")).each(function () {
					this.text(AccountsManager.current.fio);
				});

				break;

			case "newWallPosts" :
				var newsIcon = $("aside > span.news");
				AppUI.updateNewsIcon(newsIcon, request.newPostsNum);

				break;

			case "errorLogAttaching" :
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

			case "onlineStatusChanged" :
			case "tokenStatus" :
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

			case "ui" : // user, guest, syncing, migrating, migrated
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

			case "msgReadStatusChange" :
				var selectors, elem;

				selectors = [
					"#content > section.right.thread-container > section.half[data-mid='" + request.id + "']",
					"#content > section.right.chat-container section.msg[data-mid='" + request.id + "']"
				];

				elem = $(selectors.join(", "));
				if (!elem)
					return;

				if (request.read) {
					elem.removeClass("new");
				} else {
					elem.addClass("new");
				}

				break;

			case "syncProgress" :
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
			case "messageReceived" : // NB: это событие приходит ко всем фронтам
				if (AppUI.lastShownView === null) {
					return;
				}

				var dialogId = (request.data.chat_id === 0) ? "0_" + request.data.uid : request.data.chat_id + "",
					msgData = request.data,
					threadContainer, formReply, stringMid,
					threadElem, prtcElem, counterElem, textElem, threadTitle;

				msgData.first_name = request.userdata.first_name;
				msgData.last_name = request.userdata.last_name;
				msgData.status = msgData.read_state;

				switch (AppUI.lastShownView[0]) {
					case "chat" :
						if (AppUI.lastShownView[1] !== dialogId) {
							return;
						}

						chatContainer = $("#content > section.chat-container");
						if (!chatContainer)
							return;

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

					case "mailList" :
						threadElem = $("#content > section.dialogs-container > section[data-id='" + dialogId + "']");
						if (!threadElem)
							return;

						// устанавливаем дату
						$(threadElem, "div.date").text(Utils.string.humanDate(msgData.date));

						// обновляем счетчик
						counterElem = $(threadElem, "div.counter");
						counterElem.text(parseInt(counterElem.text(), 10) + 1);

						// добавляем собеседника в список при необходимости
						prtcId = (msgData.tags.indexOf("sent") !== -1) ? AccountsManager.currentUserId : msgData.uid;
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
						textElem.dom.firstChild.nodeValue = (["...", ""].indexOf(threadTitle) !== -1) ? chrome.i18n.getMessage("commonDialog") : threadTitle;

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
	chrome.runtime.sendMessage({"action" : "uiDraw"}, function (backendWindowLoaded) {
		if (!backendWindowLoaded) {
			AppUI.main("backendLoading");
		}
	});
	});
}, false);
