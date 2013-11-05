/* ==========================================================
 * Background page (VK Offline Chrome app)
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

(function () {
	var previewListener = function(request, sender, sendResponse) {
		if (request.action === "uiDraw") {
			sendResponse(false);
			return true;
		}
	};

	window.addEventListener("load", function () {
		chrome.runtime.onMessage.removeListener(previewListener);
		chrome.runtime.sendMessage({action: "ui"});
	}, false);

	chrome.alarms.onAlarm.addListener(function (alarmInfo) {
		if (alarmInfo.name === "dayuse") {
			statSend("Lifecycle", "Dayuse", "Total users", 1);
			statSend("Lifecycle", "Dayuse", "Authorized users", AccountsManager.currentUserId ? 1 : 0);

			var appInstallTime = StorageManager.get("app_install_time");
			if (appInstallTime) {
				var totalDaysLive = Math.floor((Date.now() - appInstallTime) / 1000 / 60 / 60 / 24);
				statSend("Lifecycle", "Dayuse", "App life time", totalDaysLive);
			}

			var requestsLog = StorageManager.get("requests", {constructor: Object, strict: true, create: true});
			for (var url in requestsLog) {
				statSend("Lifecycle", "Dayuse", "Requests: " + url, requestsLog[url]);
			}

			StorageManager.remove("requests");
		}
	});

	chrome.runtime.onMessage.addListener(previewListener);
})();


window.onerror = function(msg, url, line) {
	var msgError = msg + ' in ' + url + ' (line: ' + line + ')';

	if (App.DEBUG)
		alert([msgError]);

	LogManager.error(msgError);
};

// запись custom-статистики
function statSend(category, action, optLabel, optValue) {
	var argsArray = Array.prototype.map.call(arguments, function (element) {
		return (typeof element === "string") ? element : JSON.stringify(element);
	});

	try {
		window._gaq.push(["_trackEvent"].concat(argsArray));
	} catch (e) {}
};

document.addEventListener("DOMContentLoaded", function () {
	var navigatorVersion = parseInt(navigator.userAgent.match(/Chrome\/([\d]+)/)[1], 10);

	// получение аватарок
	var fetchPhoto = function (photoUrl, fn) {
		var xhr = new XMLHttpRequest();
		xhr.open("GET", photoUrl, true);
		xhr.responseType = "blob";

		xhr.addEventListener("load", function () {
			fn(xhr.response);
			xhr = null;
		}, false);

		xhr.send();
	};

	/**
	 * Нахождение табов фронтенда
	 * @param {Function} callback принимает:
	 *		{Boolean} есть ли открытые окна Chrome
	 *		{Array} массив открытых вкладок
	 */
	var findFrontendTabs = function (callback) {
		chrome.windows.getAll({populate: true}, function (windows) {
			var foundAppTabs = [];
			var appFrontendUrl = App.resolveURL("main.html");

			if (!windows.length)
				return callback(false, foundAppTabs);

			windows.forEach(function (windowElem) {
				windowElem.tabs.forEach(function (tab) {
					// ищем таб приложения
					if (tab.url.indexOf(appFrontendUrl) !== 0)
						return;

					if (windowElem.type === "popup" || windowElem.type === "app") {
						if (windowElem.focused) {
							foundAppTabs.push({"type" : "app", "priority" : 1, "windowId" : windowElem.id});
						} else {
							foundAppTabs.push({"type" : "app", "priority" : 2, "windowId" : windowElem.id});
						}
					} else {
						if (windowElem.focused) {
							if (tab.active) {
								foundAppTabs.push({"type" : "tab", "priority" : 3, "windowId" : windowElem.id, "tabId" : tab.id});
							} else {
								if (tab.pinned) {
									foundAppTabs.push({"type" : "tab", "priority" : 4, "windowId" : windowElem.id, "tabId" : tab.id});
								} else {
									foundAppTabs.push({"type" : "tab", "priority" : 5, "windowId" : windowElem.id, "tabId" : tab.id});
								}
							}
						} else {
							if (tab.active) {
								foundAppTabs.push({"type" : "tab", "priority" : 6, "windowId" : windowElem.id, "tabId" : tab.id});
							} else {
								if (tab.pinned) {
									foundAppTabs.push({"type" : "tab", "priority" : 7, "windowId" : windowElem.id, "tabId" : tab.id});
								} else {
									foundAppTabs.push({"type" : "tab", "priority" : 8, "windowId" : windowElem.id, "tabId" : tab.id});
								}
							}
						}
					}
				});
			});

			// сортируем найденные табы фронтэнда по приоритету
			foundAppTabs.sort(function (a, b) {
				return a.priority - b.priority;
			});

			callback(true, foundAppTabs);
		});
	};

	// записываем дату установки
	if (StorageManager.get("app_install_time") === null)
		StorageManager.set("app_install_time", Date.now());

	// начинаем работу с БД и ФС
	Utils.async.parallel({
		fs: function (callback) {
			(window.webkitRequestFileSystem || window.requestFileSystem)(window.PERSISTENT, 0, function (windowFsLink) {
				callback(null, windowFsLink);
			}, function () {
				statSend("App-Data", "FS Broken", {
					chrome: navigatorVersion,
					app: app.VERSION
				});

				// http://code.google.com/p/chromium/issues/detail?id=94314
				callback(null, null);
			});
		},
		db: function (callback) {
			var dbLink = window.openDatabase("vkoffline", "1.0.1", null, 0);
			dbLink.transaction(function (tx) {
				tx.executeSql("CREATE TABLE IF NOT EXISTS log (data TEXT, ts INTEGER, level TEXT)", [], function () {
					callback(null, dbLink);
				}, function (tx, err) {
					statSend("Critical-Errors", "Database Log Error", err.message);
					callback(err);
				});
			});
		}
	}, function readyToGo(err, results) {
		var dbLink = results.db;
		var fsLink = results.fs;

		// инициализируем менеджер работы с БД
		DatabaseManager.init(dbLink);
		ReqManager.init(statSend);
		LogManager.config("App started");

		// проверка на обновление версии, уведомление
		MigrationManager.start(fsLink, function (appState) {
			chrome.alarms.get("dayuse", function (alarmInfo) {
				if (!alarmInfo) {
					chrome.alarms.create("dayuse", {
						delayInMinutes: 24 * 60,
						periodInMinutes: 24 * 60
					});
				}
			});

			switch (appState) {
				case MigrationManager.INSTALLED:
					statSend("App-Data", "New User");
					break;

				case MigrationManager.UNCHANGED:
					statSend("App-Data", "App Version", App.VERSION);
					break;

				case MigrationManager.UPDATE_FAILED:
					statSend("Critical-Errors", "Migrate error", MigrationManager.lastError.message);
					throw MigrationManager.lastError;
					break;

				case MigrationManager.UPDATED:
					statSend("App-Data", "App Version", App.VERSION);

					var updateText = chrome.i18n.getMessage("appUpdated").replace("%appname%", App.NAME).replace("%appversion%", App.VERSION);
					var notification = window.webkitNotifications.createNotification(App.resolveURL("pic/icon48.png"), App.NAME, updateText);

					notification.onclick = function () {
						notification.cancel();
						statSend("App-Actions", "Upgrade NW click");

						// закрываем все вкладки с приложением
						findFrontendTabs(function (chromeWindowsExist, tabsList) {
							var appFrontendUrl = App.resolveURL("main.html");

							if (!chromeWindowsExist)
								return chrome.windows.create({"url" : appFrontendUrl});

							if (!tabsList.length)
								return chrome.tabs.create({"url" : appFrontendUrl});

							// закрываем все табы, кроме первого в списке по приоритету
							tabsList.forEach(function (tabData, index) {
								if (index === 0) {
									chrome.windows.update(tabData.windowId, {focused: true});
									if (tabsList[0].type === "tab") {
										try {
											chrome.tabs.update(tabData.tabId, {active: true});
										} catch (e) {
											chrome.tabs.update(tabData.tabId, {selected: true});
										}
									}

									return chrome.runtime.sendMessage({action: "ui"});
								}

								if (tabData.tabId) {
									chrome.tabs.remove(tabInfo.tabId);
								} else {
									chrome.windows.remove(tabInfo.windowId);
								}
							});
						});
					};

					notification.show();
					statSend("App-Actions", "Upgrade NW show");

					window.setTimeout(function() {
						notification.cancel();
					}, 5000);

					break;
			}

			var OAuthTabData = []; // массив открытых вкладок авторизации OAuth
			var oAuthRequestData; // "new", "add", "update" (варианты получения токена ВКонтакте)

			var updateTokenForUserId = null, // при обновлении токенов нужно запоминать для какого пользователя требовалось обновление
				syncingData = {}, // объект с ключами inbox, sent и contacts - счетчик максимальных чисел
				cachedUIDs = [],
				uidsProcessing = {}; // объект из элементов вида {currentUserId1: {uid1: true, uid2: true, uid3: true}, ...},
				newMessagesNotifications = {}; // объект вида {msgId1: уведомление1, msgId2: уведомление2, ...)

			var clearSyncingDataCounters = function(userId) {
				if (syncingData[userId] !== undefined) {
					syncingData[userId].contacts[0] = 0;
					syncingData[userId].contacts[1] = 0;

					syncingData[userId].inbox[0] = 0;
					syncingData[userId].inbox[1] = 0;

					syncingData[userId].sent[0] = 0;
					syncingData[userId].sent[1] = 0;

					cachedUIDs.length = 0;
				} else {
					syncingData[userId] = {
						"contacts" : [0, 0], // [total, current]
						"inbox" : [0, 0],
						"sent" : [0, 0]
					};
				}
			};


			// устанавливаем обработчики offline-событий
			window.addEventListener("online", function (e) {
				chrome.runtime.sendMessage({"action" : "onlineStatusChanged", "status" : "online"});

				// на самом деле сеть может быть, а связи с интернетом - нет
				if (AccountsManager.currentUserId) {
					startUserSession();
				}
			}, false);

			window.addEventListener("offline", function (e) {
				ReqManager.abortAll();
				chrome.runtime.sendMessage({"action" : "onlineStatusChanged", "status" : "offline"});
			}, false);




			var loadAvatar = function(contactId, fnSuccess, fnFail) {
				CacheManager.avatars[contactId] = ""; // положение обозначает, что данные загружаются

				if (fsLink === null) {
					DatabaseManager.getContactById(AccountsManager.currentUserId, contactId, function(userDoc) {
						var photoGot = false;

						try {
							CacheManager.avatars[contactId] = JSON.parse(userDoc.other_data).photo;
							photoGot = true;
						} catch (e) {
							statSend("Custom-Errors", "Exception error", e.message);
							delete CacheManager.avatars[contactId];

							if (typeof fnFail === "function") {
								fnFail();
							}
						}

						if (photoGot) {
							fnSuccess();
						}
					}, function(isDatabaseError, errMsg) {
						if (isDatabaseError) {
							LogManager.error(errMsg);
							statSend("Custom-Errors", "Database error", errMsg);
						}

						delete CacheManager.avatars[contactId];

						if (typeof fnFail === "function") {
							fnFail();
						}
					});
				} else {
					fsLink.root.getFile(contactId + "_th.jpg", {"create" : false}, function(fileEntry) {
						CacheManager.avatars[contactId] = fileEntry.toURL();
						fnSuccess();
					}, function(err) {
						statSend("Custom-Errors", "Filesystem error", err.message)

						delete CacheManager.avatars[contactId];

						if (typeof fnFail === "function") {
							fnFail();
						}
					});
				}
			};


			var longPollEventsRegistrar = {
				init: function(currentUserId, tags) {
					this._tags[currentUserId] = tags || CacheManager.tags;

					// обрываем LP-запрос старого пользователя
					if (this._longPollXhrIds[currentUserId]) {
						ReqManager.abort(this._longPollXhrIds[currentUserId]);
						delete this._longPollXhrIds[currentUserId];
					}

					// [ISSUES6] решение проблемы
					this._longPollXhrIds[currentUserId] = null;
					this._getCredentials(currentUserId);
				},

				_onLoad: function(currentUserId, res) {
					var self = this;

					if (res.failed !== undefined) {
						if (res.failed === 2) { // ключ устарел
							LogManager.warn("LongPoll server key is now obsolete. Re-requesting a new key..." + " [" + this._longPollXhrIds[currentUserId] + "]");
						} else {
							LogManager.error("LongPoll server request failed: " + JSON.stringify(res) + " [" + this._longPollXhrIds[currentUserId] + "]");
						}

						delete this._longPollXhrIds[currentUserId];

						this.init(currentUserId, this._tags[currentUserId]);
						return;
					}

					LogManager.info(JSON.stringify(res));

					res.updates.forEach(function(data) {
						switch (data[0]) {
							case 2 :
								if (data[2] & 128) {
									// Сообщение удалено на сайте.
									// в идеале нужно менять соответствующий индекс массива "messagesGot" для корректной работы mailSync
									// В то же время и для исходящих, и для входящих сообщений data[2] === 128, и чтобы определить входящее сообщение или нет, необходимо делать доп. запрос.
									// За это время может произойти ошибка duplicate key
								} else {
									DatabaseManager.markAsUnread(data[1], function() {
										chrome.runtime.sendMessage({"action" : "msgReadStatusChange", "read" : false, "id" : data[1]});
									}, function(isDatabaseError, errMsg) {
										if (isDatabaseError) {
											LogManager.error(errMsg);
											statSend("Custom-Errors", "Database error", errMsg);
										}
									});
								}

								break;

							case 3 :
								DatabaseManager.markAsRead(data[1], function() {
									chrome.runtime.sendMessage({"action" : "msgReadStatusChange", "read" : true, "id" : data[1]});
								}, function(isDatabaseError, errMsg) {
									if (isDatabaseError) {
										LogManager.error(errMsg);
										statSend("Custom-Errors", "Database error", errMsg);
									}
								});

								break;

							case 4 :
								var uid = (data[7].from !== undefined) ? data[7].from : data[3],
									mailType = (data[2] & 2) ? "sent" : "inbox",
									onUserDataReady;

								syncingData[currentUserId][mailType][1] += 1;

								onUserDataReady = function(userData) {
									var attachments = [];
									var msgData = {};

									for (var field in data[7]) {
										var matches = field.match(/^attach([\d]+)$/);
										if (!matches)
											continue;

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
									msgData.read_state = (data[2] & 1) ? 0 : 1;
									msgData.attachments = attachments;
									msgData.chat_id = (data[7].from !== undefined) ? data[3] - 2000000000 : 0;
									msgData.tags = self._tags[currentUserId][mailType];

									if (data[7].emoji)
										msgData.emoji = 1;

									if (attachments.length)
										msgData.tags |= self._tags[currentUserId].attachments;

									DatabaseManager.insertMessages(currentUserId, {"firstSync" : false, "messages" : [msgData]}, function(msgData) {
										// обновляем фронтенд
										chrome.runtime.sendMessage({"action" : "messageReceived", "data" : msgData, "userdata" : userData});

										var showNotification = function(avatarUrl) {
											var img = new Image();
											img.onload = function() {
												var canvas = document.createElement("canvas"),
													notificationTimeoutId = null;

												canvas.setAttribute("width", 50);
												canvas.setAttribute("height", 50);
												Utils.misc.drawCanvasImageCentered(canvas.getContext("2d"), img, 50, 50);

												var fio = userData.first_name + " " + userData.last_name,
													notification = window.webkitNotifications.createNotification(canvas.toDataURL(), fio, msgData.body.replace(/<br>/gm, "\n"));

												notification.onclick = function() {
													LogManager.config("Clicked notification with message #" + msgData.mid);
													notification.cancel();

													if (notificationTimeoutId !== null) {
														window.clearTimeout(notificationTimeoutId);
														notificationTimeoutId = null;
													}

													// показываем окно приложения
													findFrontendTabs(function(chromeWindowsExist, tabsList) {
														var appFrontendUrl = App.resolveURL("main.html");

														if (chromeWindowsExist === false) {
															chrome.windows.create({"url" : appFrontendUrl});
															return;
														}

														if (tabsList.length === 0) {
															chrome.tabs.create({"url" : appFrontendUrl});
															return;
														}

														// показываем первый по важности таб
														chrome.windows.update(tabsList[0].windowId, {"focused" : true});
														if (tabsList[0].type === "tab") {
															try {
																chrome.tabs.update(tabsList[0].tabId, {"active" : true});
															} catch (e) {
																chrome.tabs.update(tabsList[0].tabId, {"selected" : true});
															}
														}
													});
												};

												// play sound
												SoundManager.play("message");

												if (SettingsManager.NotificationsTime === 0) {
													return;
												}

												// TODO необходимость заключается в том, чтобы не показывать уведомления, когда в браузере активен таб с приложением
												// для этого нужно по URL определять тип открытого таба. Сейчас это невозможно или же придется ради этого отслеживать
												// все изменения в chrome.tabs

												// ищем открытые вкладки ВКонтакте
												chrome.windows.getAll({"populate" : true}, function(windows) {
													var vkTabFound = false,
														appTabActive = false,
														appFrontendUrl = App.resolveURL("main.html");

													windows.forEach(function(windowElem) {
														windowElem.tabs.forEach(function(tab) {
															if (/^https?:\/\/vk\.com\//.test(tab.url)) {
																vkTabFound = true;
															}

															if (windowElem.focused && tab.active && tab.url.indexOf(appFrontendUrl) === 0) {
																appTabActive = true;
															}
														});
													});

													if (SettingsManager.ShowWhenVK === 0 && vkTabFound) {
														return;
													}

													// не показываем уведомления, когда активен таб приложения
													if (appTabActive) {
														return;
													}

													LogManager.config("Open notification with message #" + msgData.mid);
													notification.show();

													newMessagesNotifications[msgData.mid] = notification;

													if (SettingsManager.NotificationsTime === 12) {
														return;
													}

													// добавлTяем закрытие уведомления через определенное время
													notificationTimeoutId = window.setTimeout(function() {
														notification.cancel();
													}, SettingsManager.NotificationsTime * 5 * 1000);
												});
											};

											img.src = avatarUrl;
										};

										if (mailType === "inbox") {
											if (CacheManager.avatars[msgData.uid] !== undefined && CacheManager.avatars[msgData.uid].length) {
												showNotification(CacheManager.avatars[msgData.uid]);
											} else {
												loadAvatar(msgData.uid, function() {
													showNotification(CacheManager.avatars[msgData.uid]);
												}, function() {
													showNotification(App.resolveURL("pic/question_th.gif"));
												});
											}
										}
									});
								};

								DatabaseManager.getContactById(currentUserId, uid, onUserDataReady, function(isDatabaseError, errMsg) {
									if (isDatabaseError) {
										LogManager.error(errMsg);
										statSend("Custom-Errors", "Database error", errMsg);
									}

									// теоретически может измениться currentUserId
									if (currentUserId === AccountsManager.currentUserId) {
										getUserProfile(currentUserId, parseInt(uid, 10), onUserDataReady);
									}
								});

								break;

							case 8 : // пользователь -data[1] онлайн
								if (SettingsManager.ShowOnline === 1) {
									chrome.runtime.sendMessage({"action" : "contactOnlineStatus", "uid" : -data[1], "online" : true});
								}

								break;

							case 9 : // пользователь -data[1] оффлайн (нажал кнопку "выйти" если data[2] === 0, иначе по таймауту)
								if (SettingsManager.ShowOnline === 1) {
									chrome.runtime.sendMessage({"action" : "contactOnlineStatus", "uid" : -data[1], "online" : false});
								}

								break;

							case 61 : // пользователь data[1] начал набирать текст в диалоге
							case 62 : // пользователь data[1] начал набирать текст в беседе data[2]
								break;

							default :
								LogManager.info([data[0], data]);
						}
					});

					if (AccountsManager.currentUserId === currentUserId) {
						this._longPollData[currentUserId].ts = res.ts;
						this._longPollInit(currentUserId);
					}
				},

				_onError: function(currentUserId, errorCode, errorData) {
					delete this._longPollXhrIds[currentUserId];
					if (errorCode === ReqManager.ABORT)
						return;

					this.init(currentUserId, this._tags[currentUserId]);

					if (AccountsManager.currentUserId === currentUserId) {
						mailSync(currentUserId, "inbox", [this._tags[currentUserId].inbox, this._tags[currentUserId].attachments]);
						mailSync(currentUserId, "sent", [this._tags[currentUserId].sent, this._tags[currentUserId].attachments]);
					}
				},

				_getCredentials: function(currentUserId) {
					var self = this;

					ReqManager.apiMethod("messages.getLongPollServer", function (data) {
						if (AccountsManager.currentUserId !== currentUserId)
							return;

						self._longPollData[currentUserId] = data.response;
						self._longPollInit(currentUserId);
					}, function (errCode) {
						delete self._longPollXhrIds[currentUserId];

						if (errCode === ReqManager.ACCESS_DENIED)
							CacheManager.isTokenExpired = true;

						switch (errCode) {
							case ReqManager.ABORT:
							case ReqManager.ACCESS_DENIED:
								return;
						}

						window.setTimeout(self.init.bind(self), 5000, currentUserId, self._tags[currentUserId]);
					});
				},

				_longPollInit: function(currentUserId) {
					var domain = this._longPollData[currentUserId].server.replace("vkontakte.ru", "vk.com");

					this._longPollXhrIds[currentUserId] = ReqManager.forceUrlGet("http://" + domain, {
						"act" : "a_check",
						"key" : this._longPollData[currentUserId].key,
						"ts" : this._longPollData[currentUserId].ts,
						"wait" : 25,
						"mode" : 2,
						"timeout" : 30
					}, this._onLoad.bind(this, currentUserId), this._onError.bind(this, currentUserId));
				},

				_longPollData: {},
				_longPollXhrIds: {},
				_tags: {}
			};

			/**
			 * Запрос к API ВКонтакте за пользователями и последующая запись их в БД
			 *
			 * @param {Integer} currentUserId
			 * @param {Array or Integer} массив UIDs или один UID
			 * @param {Function} callback функция, в которую передается весь объект-ответ для каждого из UIDs от API ВКонтакте
			 * @param {Function} callbackFinally итоговая функция, которая вызывается после всех манипуляций с БД
			 */
			var getUserProfile = function(currentUserId, uids, callback, callbackFinally) {
				var tokenForRequest = AccountsManager.list[currentUserId].token,
					uidsForRequest = [];

				if ((uids instanceof Array) === false) {
					uids = [uids];
				}

				if (uidsProcessing[currentUserId] === undefined) {
					uidsProcessing[currentUserId] = {};
				}

				// проверяем UIDs на нахождение в списке обрабатываемых
				uids.forEach(function(uid) {
					if (uidsProcessing[currentUserId][uid] !== undefined) {
						return;
					}

					uidsForRequest.push(uid);
				});

				if (uidsForRequest.length === 0) {
					if (typeof callbackFinally === "function") {
						callbackFinally();
					}

					return;
				}

				ReqManager.apiMethod("users.get", {
					"uids" : uidsForRequest.join(","),
					"fields" : "first_name,last_name,sex,domain,bdate,photo,contacts",
					"access_token" : tokenForRequest
				}, function(data) {
					// записываем данные друзей в БД и скачиваем их аватарки
					updateUsersData(currentUserId, data.response, function(userData) {
						// удаляем из списка обрабатываемых
						delete uidsProcessing[currentUserId][userData.uid];

						if (typeof callback === "function") {
							callback(userData);
						}
					}, callbackFinally);
				}, function(errCode, errData) {
					switch (errCode) {
						case ReqManager.ABORT :
						case ReqManager.ACCESS_DENIED :
							return;
					}

					window.setTimeout(getUserProfile, 5*1000, currentUserId, uids, callback, callbackFinally);
				});
			};

			/**
			 * Синхронизация списка друзей
			 * @param {Integer} currentUserId
			 */
			var friendsSync = function (currentUserId) {
				if (friendsSync.running)
					return;

				// флаг, чтобы не вызывать метод одновременно несколько раз подряд
				friendsSync.running = true;

				var friendsSyncTimes = StorageManager.get("friends_sync_time", {constructor: Object, strict: true, create: true});
				var milliSecondsTimeout = App.FRIENDS_UPDATE_TIMEOUT * 1000;
				var nextRequestTimeout;

				// проверяем, чтобы запросы на синхронизацию шли только от текущего активного пользователя
				if (currentUserId !== AccountsManager.currentUserId) {
					friendsSync.running = false;
					return;
				}

				// проверяем, чтобы не было слишком частых запросов
				if (friendsSyncTimes[currentUserId]) {
					nextRequestTimeout = Math.max((milliSecondsTimeout - Math.abs(Date.now() - friendsSyncTimes[currentUserId])), 0);
					if (nextRequestTimeout > 0) {
						window.setTimeout(friendsSync, nextRequestTimeout, currentUserId);

						friendsSync.running = false;
						return;
					}
				}

				// поздравляем текущего пользователя с ДР
				getUserProfile(currentUserId, currentUserId, function (currentUserData) {
					// пробуем сразу же загрузить аватарку активного профиля
					loadAvatar(currentUserId, function() {
						chrome.runtime.sendMessage({"action" : "avatarLoaded", "uid" : currentUserId});
					});

					try {
						currentUserData.other_data = JSON.parse(currentUserData.other_data);
					} catch (e) {
						currentUserData.other_data = {};
					}

					var nowDate = new Date(),
						nowDay = nowDate.getDate(),
						nowYear = nowDate.getFullYear(),
						nowMonth = nowDate.getMonth() + 1,
						bDate, i, notification, msg;

					if (currentUserData.other_data.bdate === undefined || currentUserData.other_data.bdate.length === 0)
						return;

					// разбиваем и преобразуем в числа
					bDate = currentUserData.other_data.bdate.split(".");
					for (i = 0; i < bDate.length; i++)
						bDate[i] = parseInt(bDate[i], 10);

					if (bDate[0] !== nowDay || bDate[1] !== nowMonth)
						return;

					// show notification
					msg = chrome.i18n.getMessage("happyBirthday").replace("%appname%", App.NAME);
					notification = window.webkitNotifications.createNotification(App.resolveURL("pic/smile.png"), App.NAME, msg);

					notification.onclick = function () {
						statSend("App-Actions", "BD notification click");
						notification.cancel();

						// закрываем все вкладки с приложением
						findFrontendTabs(function (chromeWindowsExist, tabsList) {
							var appFrontendUrl = App.resolveURL("main.html");

							if (!chromeWindowsExist)
								return chrome.windows.create({"url" : appFrontendUrl});

							if (!tabsList.length)
								return chrome.tabs.create({"url" : appFrontendUrl});

							// фокусируем первый таб приложения в списке
							chrome.windows.update(tabsList[0].windowId, {"focused" : true});
							if (tabsList[0].type === "tab") {
								try {
									chrome.tabs.update(tabsList[0].tabId, {"active" : true});
								} catch (e) {
									chrome.tabs.update(tabsList[0].tabId, {"selected" : true});
								}
							}
						});
					};

					SoundManager.play("message");
					statSend("App-Data", "Show BD notification");

					notification.show();
				});

				ReqManager.apiMethod("friends.get", {fields: "first_name,last_name,sex,domain,bdate,photo,contacts"}, function (data) {
					var nowDate = new Date(),
						nowDay = nowDate.getDate(),
						nowYear = nowDate.getFullYear(),
						nowMonth = nowDate.getMonth() + 1;

					syncingData[currentUserId].contacts[0] += data.response.length;

					// кэшируем ID
					for (var i = 0; i < data.response.length; i++) {
						if (cachedUIDs.indexOf(data.response[i].uid) === -1) {
							cachedUIDs.push(data.response[i].uid);
						}
					}

					var showBirthdayNotification = function (userId, avatarUrl, userFio, msg) {
						var img = new Image();
						img.onload = function () {
							var canvas = document.createElement("canvas");
							canvas.setAttribute("width", 50);
							canvas.setAttribute("height", 50);
							Utils.misc.drawCanvasImageCentered(canvas.getContext("2d"), img, 50, 50);

							var notification = window.webkitNotifications.createNotification(canvas.toDataURL(), userFio, msg);
							notification.onclick = function() {
								// почему-то когда открыт таб приложения, код этой функции не срабатывает
								notification.cancel();

								findFrontendTabs(function(chromeWindowsExist, tabsList) {
									var appFrontendUrl = App.resolveURL("main.html");
									if (chromeWindowsExist === false) {
										chrome.windows.create({"url" : appFrontendUrl});
										return;
									}

									if (tabsList.length === 0) {
										chrome.tabs.create({"url" : appFrontendUrl});
										return;
									}

									// показываем первый таб по приоритету
									chrome.windows.update(tabsList[0].windowId, {"focused" : true});
									if (tabsList[0].type === "tab") {
										try {
											chrome.tabs.update(tabsList[0].tabId, {"active" : true});
										} catch (e) {
											chrome.tabs.update(tabsList[0].tabId, {"selected" : true});
										}
									}
								});
							};

							SoundManager.play("message");
							notification.show();
						};

						img.src = avatarUrl;
					};

					// записываем данные друзей в БД и скачиваем их аватарки
					updateUsersData(currentUserId, data.response, function (userDoc) {
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

						if (SettingsManager.ShowBirthdayNotifications === 0)
							return;

						// показываем уведомление, если у кого-то из друзей ДР
						try {
							userDoc.other_data = JSON.parse(userDoc.other_data);
						} catch (e) {
							userDoc.other_data = {};
						}

						if (userDoc.other_data.bdate === undefined || userDoc.other_data.bdate.length === 0)
							return;

						// разбиваем и преобразуем в числа
						bDate = userDoc.other_data.bdate.split(".");
						for (i = 0; i < bDate.length; i++)
							bDate[i] = parseInt(bDate[i], 10);

						if (bDate[0] !== nowDay || bDate[1] !== nowMonth)
							return;

						// показываем уведомление о ДР
						var i18nBirthDay = chrome.i18n.getMessage("birthday").split("|"),
							i18nYears = chrome.i18n.getMessage("years").split("|"),
							hisHerMatches = i18nBirthDay[0].match(/([^\s]+)-([^\s]+)/),
							msg, yoNow, notification;

						userDoc.other_data.sex = userDoc.other_data.sex || 0;
						switch (userDoc.other_data.sex) {
							case 1 : // female
								msg = i18nBirthDay[0].replace(hisHerMatches[0], hisHerMatches[2]) + "!";
								break;

							case 2 : // male
								msg = i18nBirthDay[0].replace(hisHerMatches[0], hisHerMatches[1]) + "!";
								break;

							default : // non-specified
								msg = i18nBirthDay[0].replace(hisHerMatches[0], hisHerMatches[1] + " (" + hisHerMatches[2] + ")") + "!";
						}

						if (bDate.length === 3) {
							yoNow = nowYear - bDate[2];
							msg += " (" + i18nBirthDay[1].replace("%years%", yoNow + " " + Utils.string.plural(yoNow, i18nYears)) + ")";
						}

						if (CacheManager.avatars[userDoc.uid] !== undefined && CacheManager.avatars[userDoc.uid].length) {
							showBirthdayNotification(userDoc.uid, CacheManager.avatars[userDoc.uid], userDoc.first_name + " " + userDoc.last_name, msg);
						} else {
							loadAvatar(userDoc.uid, function() {
								showBirthdayNotification(userDoc.uid, CacheManager.avatars[userDoc.uid], userDoc.first_name + " " + userDoc.last_name, msg);
							}, function() {
								showBirthdayNotification(userDoc.uid, App.resolveURL("pic/question_th.gif"), userDoc.first_name + " " + userDoc.last_name, msg);
							});
						}
					}, function () {
						var inboxSynced = (StorageManager.get("perm_inbox_" + currentUserId) !== null),
							sentSynced = (StorageManager.get("perm_outbox_" + currentUserId) !== null);

						friendsSyncTimes[currentUserId] = Date.now();
						StorageManager.set("friends_sync_time", friendsSyncTimes);

						// следующая синхронизация должна начаться через FRIENDS_UPDATE_TIMEOUT
						window.setTimeout(friendsSync, milliSecondsTimeout, currentUserId);

						// если к этому моменту уже синхронизированы входящие и исходящие
						if (AccountsManager.currentUserId === currentUserId) {
							if (inboxSynced && sentSynced) {
								// сбрасываем счетчик синхронизации
								clearSyncingDataCounters(currentUserId);

								chrome.runtime.sendMessage({"action" : "ui", "which" : "user"});
							}
						}

						friendsSync.running = false;
					});
				}, function (errCode, errData) {
					friendsSync.running = false;

					switch (errCode) {
						case ReqManager.ABORT :
						case ReqManager.ACCESS_DENIED :
							return;
					}

					window.setTimeout(friendsSync, 5*1000, currentUserId);
				});
			};

			/**
			 * Функция-обработчик, которая запускается в методах friends.get/users.get, поскольку оба метода возвращают примерно
			 * одинаковый ответ и имеют общую логику записи данных в БД
			 */
			var updateUsersData = function (currentUserId, userObjectsArray, callback, callbackFinally) {
				var dataToReplace = [];

				if (!uidsProcessing[currentUserId])
					uidsProcessing[currentUserId] = {};

				userObjectsArray.forEach(function (userData) {
					// добавляем UID в список обрабатываемых
					uidsProcessing[currentUserId][userData.uid] = true;

					// скачиваем аватарку
					if (fsLink) {
						fetchPhoto(userData.photo, function (blob) {
							fsLink.root.getFile(userData.uid + "_th.jpg", {create: true}, function(fileEntry) {
								fileEntry.createWriter(function(fileWriter) {
									fileWriter.write(blob);
								}, function(err) {
									LogManager.warn(err.message);
								});
							}, function(err) {
								LogManager.warn(err.message);
							});
						});
					}

					// очищаем закэшированную аватарку
					delete CacheManager.avatars[userData.uid];

					// обновляем ФИО пользователя
					if (currentUserId === userData.uid)
						AccountsManager.setFio(currentUserId, userData.first_name + " " + userData.last_name);

					dataToReplace.push([userData.uid, userData.first_name, userData.last_name, JSON.stringify(userData), ""]);
				});

				if (dataToReplace.length === 0) {
					if (typeof callbackFinally === "function") {
						callbackFinally();
					}

					return;
				}

				DatabaseManager.replaceContacts(currentUserId, dataToReplace, callback, function(uid, errMessage) {
					LogManager.error(errMessage);
					statSend("Custom-Errors", "Database error", "Failed to replace contact: " + errMessage);
				}, callbackFinally);
			};

			/**
			 * Особенность mailSync заключается в том, что она должна запускаться редко и из startUserSession
			 * К моменту начала работы mailSync текущий активный пользователь может смениться. Тем не менее
			 * функция должна отработать до конца, то есть или скачать все сообщения до нуля in descending order, или
			 * дойти до момента, когда внутреннняя функция записи сообщений в БД вернет ошибку DUPLICATE ID. mailSync не должна
			 * показывать всплывающие уведомления, это прерогатива обработчика данных от LongPoll-сервера
			 */
			var mailSync = function(currentUserId, mailType, referTagIds) {
				var reqData = {},
					userDataForRequest = AccountsManager.list[currentUserId],
					compatName = (mailType === "inbox") ? "inbox" : "outbox",
					permKey = "perm_" + compatName + "_" + currentUserId,
					firstSync = (StorageManager.get(permKey) === null);

				reqData.offset = syncingData[currentUserId][mailType][1];
				reqData.access_token = userDataForRequest.token;
				reqData.count = 100;
				reqData.preview_length = 0;
				if (mailType === "sent") {
					reqData.out = 1;
				}

				ReqManager.apiMethod("messages.get", reqData, function(data) {
					var messages = [],
						dataSyncedFn;

					dataSyncedFn = function() {
						var inboxSynced, sentSynced, friendsSynced,
							wallTokenUpdated;

						StorageManager.set(permKey, 1);

						inboxSynced = (StorageManager.get("perm_inbox_" + currentUserId) !== null);
						sentSynced = (StorageManager.get("perm_outbox_" + currentUserId) !== null);
						friendsSynced = (StorageManager.get("friends_sync_time", {constructor: Object, strict: true, create: true})[currentUserId] !== undefined);

						if (AccountsManager.currentUserId === currentUserId) {
							// если к этому моменту вся почта синхронизирована и друзья тоже, то перерисовываем фронт
							if (inboxSynced && sentSynced && friendsSynced) {
								// сбрасываем счетчик синхронизации
								clearSyncingDataCounters(currentUserId);

								// маленькое замечение: после того как аккаунт мигрирован с 3 на 4 версию, стартует startUserSession()
								// она запускает mailSync(), что в свою очередь породит перерисовку фронта на "ui" => "user"
								// чтобы защититься от этого проверяем, был ли обновлен токен
								wallTokenUpdated = (StorageManager.get("wall_token_updated", {constructor: Object, strict: true, create: true})[AccountsManager.currentUserId] !== undefined);
								if (wallTokenUpdated) {
									chrome.runtime.sendMessage({"action" : "ui", "which" : "user"});
								}
							}
						}
					};

					// все получили
					if (data.response === 0 || (data.response instanceof Array && data.response.length === 1)) {
						dataSyncedFn();
						return;
					}

					syncingData[currentUserId][mailType][0] = data.response[0];

					if (uidsProcessing[currentUserId] === undefined) {
						uidsProcessing[currentUserId] = {};
					}

					// отсекаем общий счетчик сообщений
					data.response.forEach(function(msgData, index) {
						var coords;

						// пропускаем общий счетчик
						if (!index)
							return;

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
						msgData.tags = referTagIds[0];

						if (msgData.attachments.length)
							msgData.tags |= referTagIds[1];

						// проверяем существует ли пользователь
						if (uidsProcessing[currentUserId][msgData.uid] === undefined && cachedUIDs.indexOf(msgData.uid) === -1) {
							cachedUIDs.push(msgData.uid);

							DatabaseManager.getContactById(currentUserId, msgData.uid, null, function(isDatabaseError, errMsg) {
								if (isDatabaseError) {
									LogManager.error(errMsg);
									statSend("Custom-Errors", "Database error", errMsg);
								}

								getUserProfile(currentUserId, msgData.uid);
							});
						}

						messages.push(msgData);
						if (msgData.read_state === 0 && StorageManager.get(permKey) === null) {
							// до 4 версии здесь показывалось уведомление
							// TODO учесть var isSupportAccount = (userData.uid === config.VkSupportUid),
						}
					});

					DatabaseManager.insertMessages(currentUserId, {"firstSync" : firstSync, "messages" : messages}, function(msgData, queryIsOk) {
						if (queryIsOk) {
							syncingData[currentUserId][mailType][1] += 1;

							chrome.runtime.sendMessage({
								"action" : "syncProgress",
								"userId" : currentUserId,
								"type" : mailType,
								"total" : syncingData[currentUserId][mailType][0],
								"current" : syncingData[currentUserId][mailType][1]
							});
						}
					}, function (msgInsertedNum, msgInsertFailedNum) {
						if (msgInsertFailedNum > 0 || syncingData[currentUserId][mailType][1] > data.response[0]) {
							dataSyncedFn();
							return;
						}

						window.setTimeout(mailSync, 350, currentUserId, mailType, referTagIds);
					});
				}, function(errCode, errData) {
					switch (errCode) {
						case ReqManager.ACCESS_DENIED :
							// TODO error
							break;

						default :
							window.setTimeout(mailSync, 5000, currentUserId, mailType, referTagIds);
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
			var startUserSession = function(callback) {
				var currentUserId = AccountsManager.currentUserId;

				// сбрасываем все XHR-запросы
				ReqManager.abortAll();

				// сбрасываем закэшированные ID контактов
				cachedUIDs.length = 0;

				// инициализация кэша URL аватарок
				CacheManager.init(AccountsManager.currentUserId, "avatars");
				CacheManager.init(AccountsManager.currentUserId, "isTokenExpired", false);

				// инициализируем БД
				DatabaseManager.initUser(currentUserId, App.INIT_TAGS, function(tagsInDatabase) {
					if (AccountsManager.currentUserId !== currentUserId)
						return;

					// сбрасываем счетчики синхронизации
					clearSyncingDataCounters(AccountsManager.currentUserId);

					// записываем метки в кэш
					CacheManager.init(AccountsManager.currentUserId, "tags");
					CacheManager.tags = tagsInDatabase;

					if (navigator.onLine) {
						friendsSync(AccountsManager.currentUserId);
						longPollEventsRegistrar.init(AccountsManager.currentUserId);

						mailSync(AccountsManager.currentUserId, "inbox", [tagsInDatabase.inbox, tagsInDatabase.attachments]);
						mailSync(AccountsManager.currentUserId, "sent", [tagsInDatabase.sent, tagsInDatabase.attachments]);
					}

					if (typeof callback === "function") {
						callback();
					}
				}, function (errMsg) {
					LogManager.error(errMsg);
					statSend("Critical-Errors", "Database init user", errMsg);
				});
			};

			/**
			 * Обработка результатов OAuth-авторизации
			 */
			chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
				var tabIndex = OAuthTabData.indexOf(tabId);
				if (tabIndex === -1 || !changeInfo.url)
					return;

				if (changeInfo.url.indexOf("#error") !== -1 || changeInfo.url.indexOf("security breach") !== -1) {
					OAuthTabData.splice(tabIndex, 1);
					statSend("App-Actions", "OAuth access cancelled");

					// закрываем таб oAuth
					chrome.tabs.remove(tabId);

					var failReason = (changeInfo.url.indexOf("security breach") !== -1) ? "securityBreach" : "denyAccess";
					findFrontendTabs(function (chromeWindowsExist, tabsList) {
						var appFrontendUrl = App.resolveURL("main.html");

						if (!chromeWindowsExist)
							return chrome.windows.create({url: appFrontendUrl});

						if (!tabsList.length)
							return chrome.tabs.create({url: appFrontendUrl});

						// закрываем все табы, кроме первого в списке по приоритету
						tabsList.forEach(function (tabInfo, index) {
							if (index === 0) {
								chrome.windows.update(tabInfo.windowId, {focused: true});
								if (tabInfo.type === "tab") {
									try {
										chrome.tabs.update(tabInfo.tabId, {active: true});
									} catch (e) {
										chrome.tabs.update(tabInfo.tabId, {selected: true});
									}
								}
							} else {
								if (tabInfo.type === "app") {
									chrome.windows.remove(tabInfo.windowId);
								} else {
									chrome.tabs.remove(tabInfo.tabId);
								}
							}
						});

						chrome.runtime.sendMessage({
							action: "appWontWorkWithoutAccessGranted",
							from: oAuthRequestData,
							reason: failReason
						});
					});

					return;
				}

				var tokenMatches = changeInfo.url.match(/#access_token=(\w+).*user_id=(\d+)/);
				if (tokenMatches) {
					var token = tokenMatches[1];
					var userId = tokenMatches[2];

					OAuthTabData.splice(tabIndex, 1);
					statSend("App-Actions", "OAuth access granted", userId);

					chrome.tabs.remove(tabId);

					findFrontendTabs(function (chromeWindowsExist, tabsList) {
						var appFrontendUrl = App.resolveURL("main.html");

						switch (oAuthRequestData) {
							case "new" :
								AccountsManager.setData(userId, token, "...");
								AccountsManager.currentUserId = userId;

								var wallTokenUpdated = StorageManager.get("wall_token_updated", {constructor: Object, strict: true, create: true});
								wallTokenUpdated[AccountsManager.currentUserId] = 1;
								StorageManager.set("wall_token_updated", wallTokenUpdated);

								startUserSession(function () {
									if (!chromeWindowsExist)
										return chrome.windows.create({url: appFrontendUrl});

									if (!tabsList.length)
										return chrome.tabs.create({url: appFrontendUrl});

									// закрываем все табы, кроме первого в списке по приоритету
									tabsList.forEach(function (tabInfo, index) {
										if (index === 0) {
											chrome.windows.update(tabInfo.windowId, {focused: true});
											if (tabInfo.type === "tab") {
												try {
													chrome.tabs.update(tabInfo.tabId, {active: true});
												} catch (e) {
													chrome.tabs.update(tabInfo.tabId, {selected: true});
												}
											}
										} else {
											if (tabInfo.type === "app") {
												chrome.windows.remove(tabInfo.windowId);
											} else {
												chrome.tabs.remove(tabInfo.tabId);
											}
										}
									});

									chrome.runtime.sendMessage({
										action: "ui",
										which: "syncing"
									});
								});

								statSend("App-Actions", "First account added");
								break;

							case "add" :
								var newUserGranted = (AccountsManager.list[userId] === undefined);
								if (newUserGranted) {
									AccountsManager.setData(userId, token, "...");
									AccountsManager.currentUserId = userId;

									var wallTokenUpdated = StorageManager.get("wall_token_updated", {constructor: Object, strict: true, create: true});
									wallTokenUpdated[AccountsManager.currentUserId] = 1;
									StorageManager.set("wall_token_updated", wallTokenUpdated);

									startUserSession(function () {
										if (!chromeWindowsExist)
											return chrome.windows.create({url: appFrontendUrl});

										if (!tabsList.length)
											return chrome.tabs.create({url: appFrontendUrl});

										// закрываем все табы, кроме первого в списке по приоритету
										tabsList.forEach(function (tabInfo, index) {
											if (index === 0) {
												chrome.windows.update(tabInfo.windowId, {focused: true});
												if (tabInfo.type === "tab") {
													try {
														chrome.tabs.update(tabInfo.tabId, {active: true});
													} catch (e) {
														chrome.tabs.update(tabInfo.tabId, {selected: true});
													}
												}
											} else {
												if (tabInfo.type === "app") {
													chrome.windows.remove(tabInfo.windowId);
												} else {
													chrome.tabs.remove(tabInfo.tabId);
												}
											}
										});

										chrome.runtime.sendMessage({
											action: "ui",
											which: "syncing"
										});
									});

									statSend("App-Actions", "2+ account added");
								} else {
									AccountsManager.setData(userId, token);

									// показываем таб приложения
									findFrontendTabs(function (chromeWindowsExist, tabsList) {
										if (!chromeWindowsExist)
											return chrome.windows.create({url: appFrontendUrl});

										if (!tabsList.length)
											return chrome.tabs.create({url: appFrontendUrl});

										chrome.windows.update(tabsList[0].windowId, {focused: true});
										if (tabsList[0].type === "tab") {
											try {
												chrome.tabs.update(tabsList[0].tabId, {active: true});
											} catch (e) {
												chrome.tabs.update(tabsList[0].tabId, {selected: true});
											}
										}
									});

									// уведомляем об ошибке
									chrome.runtime.sendMessage({
										action: "tokenUpdatedInsteadOfAccountAdd",
										uid: userId,
										fio: AccountsManager.list[userId].fio
									});
								}

								break;

							case "update" :
								var neededUserTokenUpdated = (updateTokenForUserId === userId);
								var newUserGranted = true;

								for (var listUserId in AccountsManager.list) {
									if (listUserId === userId) {
										newUserGranted = false;
										break;
									}
								}

								if (newUserGranted) {
									// уведомляем об ошибке
									chrome.runtime.sendMessage({
										action: "tokenAddedInsteadOfUpdate",
										uid: userId,
										token: token
									});
								} else {
									AccountsManager.setData(userId, token);

									if (neededUserTokenUpdated) {
										statSend("App-Actions", "Account token updated");
										chrome.runtime.sendMessage({
											action: "tokenUpdated"
										});
									} else {
										chrome.runtime.sendMessage({
											action: "tokenUpdatedForWrongUser",
											uid: userId,
											fio: AccountsManager.list[userId].fio
										});
									}
								}

								if (!chromeWindowsExist)
									return chrome.windows.create({url: appFrontendUrl});

								if (!tabsList.length)
									return chrome.tabs.create({url: appFrontendUrl});

								// показываем первый таб
								chrome.windows.update(tabsList[0].windowId, {focused: true});
								if (tabsList[0].type === "tab") {
									try {
										chrome.tabs.update(tabsList[0].tabId, {active: true});
									} catch (e) {
										chrome.tabs.update(tabsList[0].tabId, {selected: true});
									}
								}

								break;
						}
					});

					return;
				}
			});


			chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
				var sendAsyncResponse = false;

				switch (request.action) {
					case "uiDraw" :
						sendAsyncResponse = true;
						sendResponse(true);

						var changelogNotified = StorageManager.get("changelog_notified", {constructor: Array, strict: true}),
							inboxSynced, sentSynced, friendsSynced,
							wallTokenUpdated;

						if (AccountsManager.currentUserId) {
							inboxSynced = (StorageManager.get("perm_inbox_" + AccountsManager.currentUserId) !== null);
							sentSynced = (StorageManager.get("perm_outbox_" + AccountsManager.currentUserId) !== null);
							friendsSynced = (StorageManager.get("friends_sync_time", {constructor: Object, strict: true, create: true})[AccountsManager.currentUserId] !== undefined);

							if (inboxSynced && sentSynced && friendsSynced) {
								uiType = "user";
							} else {
								uiType = "syncing";
							}
						} else {
							uiType = "guest";
						}

						switch (uiType) {
							case "user" :
								statSend("UI-Draw", "Users", AccountsManager.currentUserId);
								break;

							case "syncing" :
								statSend("UI-Draw", "Syncing", AccountsManager.currentUserId);
								break;

							case "guest" :
								statSend("UI-Draw", "Guests");
								break;
						}

						// уведомляем фронт
						chrome.runtime.sendMessage({"action" : "ui", "which" : uiType});
						break;

					case "closeNotification" :
						if (newMessagesNotifications[request.mid] !== undefined) {
							newMessagesNotifications[request.mid].cancel();
							delete newMessagesNotifications[request.mid];
						}

						break;

					// NB. Есть баг, когда в некоторых версиях браузера сортировка работает слишком долго. Для определения этого момента в 4.4 внедрено следующее решение:
					// При первом запросе контактов проверяем, сколько времени работал запрос к бэкенду. Если это заняло больше 3 секунд, то меняем настройку сортировки.
					// Соответственно "забываем" запрос и порождаем новый.
					// 13.0.755.0 (83879) - долгая выборка контактов
					case "fetchContactList" :
						var breakNeeded = false,
							timeoutId,
							onContactsListReady;

						sendAsyncResponse = true;
						onContactsListReady = function(contactsList) {
							if (contactsList.length === 0) {
								return;
							}

							var contactsIds = contactsList.map(function(contactData) {
								return contactData.uid;
							});

							ReqManager.apiMethod("users.get", {"uids" : contactsIds.join(","), "fields" : "online"}, function(data) {
								data.response.forEach(function(chunk) {
									var isOnline = (chunk.online === 1 || chunk.online_mobile === 1);
									chrome.runtime.sendMessage({"action" : "contactOnlineStatus", "uid" : chunk.uid, "online" : isOnline});
								});
							});
						};

						timeoutId = window.setTimeout(function() {
							var defaultSettingsUsed = (StorageManager.get("settings") === null);
							if (defaultSettingsUsed === false) {
								return;
							}

							breakNeeded = true;
							SettingsManager.SortContacts = 2;

							DatabaseManager.getContactList("alpha", request.totalShown, CacheManager.tags.trash, function(contacts) {
								sendResponse(contacts);

								if (SettingsManager.ShowOnline === 1) {
									onContactsListReady(contacts[0]);
								}
							}, function(errMsg) {
								sendResponse([[], 0]);
								LogManager.error(errMsg);
							});
						}, 3000);

						DatabaseManager.getContactList(request.type, request.totalShown, CacheManager.tags.trash, function(contacts) {
							if (breakNeeded) {
								return;
							}

							sendResponse(contacts);
							window.clearTimeout(timeoutId);

							if (SettingsManager.ShowOnline === 1) {
								onContactsListReady(contacts[0]);
							}
						}, function(errMsg) {
							if (breakNeeded) {
								return;
							}

							sendResponse([[], 0]);
							LogManager.error(errMsg);

							window.clearTimeout(timeoutId);
						});

						break;

					case "fetchConversations" :
						sendAsyncResponse = true;
						DatabaseManager.getConversations(request.totalShown, CacheManager.tags.trash, sendResponse, function(errMsg) {
							sendResponse([[], 0]);
							LogManager.error(errMsg);
						});

						break;

					case "getDialogThread" :
						var from = (request.from !== undefined) ? request.from : null;

						sendAsyncResponse = true;
						DatabaseManager.getDialogThread(request.id, CacheManager.tags.trash, from, sendResponse, function(errMsg) {
							sendResponse([[], 0]);
							LogManager.error(errMsg);
						});

						break;

					case "getMessageInfo" :
						sendAsyncResponse = true;
						DatabaseManager.getMessageById(request.mid, sendResponse, function(isDatabaseError, errMsg) {
							sendResponse(undefined);

							if (isDatabaseError) {
								LogManager.error(errMsg);
								statSend("Custom-Errors", "Database error", errMsg);
							}
						});

						break;

					case "loadAvatar" :
						loadAvatar(request.uid, function() {
							chrome.runtime.sendMessage({"action" : "avatarLoaded", "uid" : request.uid});
						});

						break;

					case "getConversationThreadsWithContact" :
						sendAsyncResponse = true;
						DatabaseManager.getConversationThreadsWithContact(request.uid, CacheManager.tags.trash, sendResponse, function(errMsg) {
							sendResponse([]);
							LogManager.error(errMsg);
						});

						break;

					case "getContactData" :
						sendAsyncResponse = true;
						DatabaseManager.getContactById(AccountsManager.currentUserId, request.uid, sendResponse, function(isDatabaseError, errorMsg) {
							sendResponse(null);

							if (isDatabaseError) {
								LogManager.error(errMsg);
								statSend("Custom-Errors", "Database error", errMsg);
							}
						});

						if (SettingsManager.ShowOnline === 1 && request.includeOnlineStatus) {
							ReqManager.apiMethod("users.get", {"uids" : request.uid, "fields" : "online"}, function(data) {
								data.response.forEach(function(chunk) {
									var isOnline = (chunk.online === 1 || chunk.online_mobile === 1);
									chrome.runtime.sendMessage({"action" : "contactOnlineStatus", "uid" : chunk.uid, "online" : isOnline});
								});
							});
						}

						break;

					// TODO как-то формализировать
					case "errorGot" :
						statSend("Custom-Errors", request.error, request.message);
						break;

					case "sendMessage" :
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

						ReqManager.apiMethod("messages.send", msgParams, function(data) {
							statSend("App-Actions", "Sent Message", AccountsManager.currentUserId);
							SoundManager.play("sent");

							sendResponse([0, data]);
						}, function(errCode, errData) {
							statSend("Custom-Errors", "Failed to send message", errCode);
							SoundManager.play("error");

							switch (errCode) {
								case ReqManager.CAPTCHA :
									sendResponse([1, errData]);
									break;

								default :
									if (errCode === ReqManager.RESPONSE_ERROR && errData.code === 7) {
										sendResponse([2]);
										return;
									}

									sendResponse([3]);
									break;
							}
						});

						break;

					case "collectLogData":
						sendAsyncResponse = true;
						LogManager.collect(sendResponse);
						break;

					case "getMessagesUploadServer" :
						var sendRequest = function() {
							ReqManager.apiMethod("photos.getMessagesUploadServer", sendResponse, function(errCode, errData) {
								switch (errCode) {
									case ReqManager.NO_INTERNET :
									case ReqManager.NOT_JSON :
									case ReqManager.TIMEOUT :
									case ReqManager.RESPONSE_ERROR :
										window.setTimeout(sendRequest, 5*1000);
										break;

									default :
										sendResponse(null);
								}
							});
						};

						sendRequest();
						sendAsyncResponse = true;
						break;

					case "getDocsUploadServer" :
						var sendRequest = function() {
							ReqManager.apiMethod("docs.getUploadServer", sendResponse, function(errCode, errData) {
								switch (errCode) {
									case ReqManager.NO_INTERNET :
									case ReqManager.NOT_JSON :
									case ReqManager.TIMEOUT :
									case ReqManager.RESPONSE_ERROR :
										window.setTimeout(sendRequest, 5*1000);
										break;

									default :
										sendResponse(null);
								}
							});
						};

						sendRequest();
						sendAsyncResponse = true;
						break;

					case "saveMessagesPhoto" :
						var sendRequest = function(requestData) {
							ReqManager.apiMethod("photos.saveMessagesPhoto", {
								"server" : requestData.server,
								"photo" : requestData.photo,
								"hash" : requestData.hash
							}, sendResponse, function(errCode, errData) {
								switch (errCode) {
									case ReqManager.NO_INTERNET :
									case ReqManager.NOT_JSON :
									case ReqManager.TIMEOUT :
									case ReqManager.RESPONSE_ERROR :
										window.setTimeout(sendRequest, 5*1000, requestData);
										break;

									default :
										sendResponse(null);
								}
							});
						};

						sendRequest(request);
						sendAsyncResponse = true;
						break;

					case "saveMessagesDoc" :
						var sendRequest = function(requestData) {
							ReqManager.apiMethod("docs.save", {
								"file" : requestData.file
							}, sendResponse, function(errCode, errData) {
								switch (errCode) {
									case ReqManager.NO_INTERNET :
									case ReqManager.NOT_JSON :
									case ReqManager.TIMEOUT :
									case ReqManager.RESPONSE_ERROR :
										window.setTimeout(sendRequest, 5*1000, requestData);
										break;

									default :
										sendResponse(null);
								}
							});
						};

						sendRequest(request);
						sendAsyncResponse = true;
						break;

					case "addLike" :
						statSend("App-Actions", "Like and repost");
						sendAsyncResponse = true;

						var sendLikeRequest = function() {
							ReqManager.apiMethod("wall.addLike", {
								"owner_id" : -29809053,
								"post_id" : 454,
								"repost" : 1
							}, function(data) {
								sendResponse(1);
							}, function(errCode, errData) {
								switch (errCode) {
									case ReqManager.NO_INTERNET :
									case ReqManager.NOT_JSON :
									case ReqManager.TIMEOUT :
										window.setTimeout(sendLikeRequest, 5*1000);
										break;

									case ReqManager.RESPONSE_ERROR :
										if (errData.code === 217 || errData.code === 215) {
											sendResponse(1);
											return;
										}

										window.setTimeout(sendLikeRequest, 5*1000);
										break;

									default :
										sendResponse(0);
								}
							});
						};

						var sendJoinGroupRequest = function() {
							ReqManager.apiMethod("groups.join", {
								"gid" : 29809053
							}, null, function(errCode, errData) {
								switch (errCode) {
									case ReqManager.NO_INTERNET :
									case ReqManager.NOT_JSON :
									case ReqManager.TIMEOUT :
									case ReqManager.RESPONSE_ERROR :
										window.setTimeout(sendJoinGroupRequest, 5*1000);
										break;
								}
							});
						};

						sendLikeRequest();
						sendJoinGroupRequest();
						break;

					case "userUIDrawn" :
						var milliSecondsTimeout = 86400*1000, // one request per day
							groupWallSyncTime = parseInt(StorageManager.get("vkgroupwall_sync_time"), 10) || 0,
							nextRequestTimeout, syncWallFn;

						syncWallFn = function() {
							ReqManager.apiMethod("wall.get", {
								"access_token" : null, // объявления получать обязательно, поэтому ходим без токенов
								"owner_id" : (0 - App.VK_ADV_GROUP[0]),
								"count" : 5,
								"filter" : "owner" // перестраховка
							}, function(data) {
								var seenPosts = StorageManager.get("vkgroupwall_synced_posts", {constructor: Array, strict: true, create: true}),
									postsToStore = [];

								data.response.forEach(function (post, index) {
									if (!index || seenPosts.indexOf(post.id) !== -1 || App.VK_ADV_GROUP[1] >= post.id)
										return;

									postsToStore.push(post);
								});

								if (postsToStore.length) {
									StorageManager.set("vkgroupwall_stored_posts", postsToStore);
									chrome.runtime.sendMessage({"action" : "newWallPosts"});
								}

								// обновляем счетчик следующего запроса к стенке
								StorageManager.set("vkgroupwall_sync_time", Date.now());
								window.setTimeout(syncWallFn, milliSecondsTimeout);
							}, function(errCode, errData) {
								switch (errCode) {
									case ReqManager.NO_INTERNET :
									case ReqManager.NOT_JSON :
									case ReqManager.TIMEOUT :
									case ReqManager.RESPONSE_ERROR :
										window.setTimeout(syncWallFn, 5*60*1000);
										break;
								}
							});
						};

						// проверяем, чтобы не было слишком частых запросов
						if (groupWallSyncTime > 0) {
							nextRequestTimeout = Math.max((milliSecondsTimeout - Math.abs(Date.now() - groupWallSyncTime)), 0);
							if (nextRequestTimeout > 0) {
								window.setTimeout(syncWallFn, nextRequestTimeout);
								return;
							}
						}

						syncWallFn();
						break;

					case "getDocById" :
						// vk bug: метод docs.getById возвращает response: []
						// http://vkontakte.ru/topic-1_21972169?post=36014
						var sendRequest;

						sendAsyncResponse = true;

						if (request.mid !== undefined) {
							sendRequest = function(requestData) {
								requestData.ownerId = parseInt(requestData.ownerId, 10);
								requestData.id = parseInt(requestData.id, 10);

								ReqManager.apiMethod("messages.getById", {"mid" : requestData.mid}, function(data) {
									if ((data.response instanceof Array) === false || data.response.length !== 2 || data.response[1].attachments === undefined) {
										statSend("Custom-Errors", "Attachment info missing", requestData);

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

									statSend("Custom-Errors", "Attachment info missing", requestData);
								}, function(errCode, errData) {
									switch (errCode) {
										case ReqManager.NO_INTERNET :
										case ReqManager.NOT_JSON :
										case ReqManager.TIMEOUT :
										case ReqManager.RESPONSE_ERROR :
											window.setTimeout(sendRequest, 5*1000, requestData);
											break;

										default :
											sendResponse(null);
									}
								});
							};
						} else {
							sendRequest = function(requestData) {
								ReqManager.apiMethod("docs.getById", {"docs" : requestData.ownerId + "_" + requestData.id}, function(data) {
									var output = (data.response.length) ? data.response[0] : null;
									if (output === null) {
										statSend("Custom-Errors", "Attachment info missing", requestData);
									}

									sendResponse(output);
								}, function(errCode, errData) {
									switch (errCode) {
										case ReqManager.NO_INTERNET :
										case ReqManager.NOT_JSON :
										case ReqManager.TIMEOUT :
										case ReqManager.RESPONSE_ERROR :
											window.setTimeout(sendRequest, 5*1000, requestData);
											break;

										default :
											sendResponse(null);
									}
								});
							};
						}

						sendRequest(request);
						break;

					case "getGeopointById" :
						sendAsyncResponse = true;

						var sendRequest = function(msgId) {
							ReqManager.apiMethod("messages.getById", {"mid" : msgId}, function(data) {
								if ((data.response instanceof Array) === false || data.response.length !== 2 || data.response[1].geo === undefined) {
									statSend("Custom-Errors", "Attachment info missing", request);

									sendResponse(null);
									return;
								}

								var coords = data.response[1].geo.coordinates.split(" ");
								sendResponse(coords);
							}, function(errCode, errData) {
								switch (errCode) {
									case ReqManager.NO_INTERNET :
									case ReqManager.NOT_JSON :
									case ReqManager.TIMEOUT :
									case ReqManager.RESPONSE_ERROR :
										window.setTimeout(sendRequest, 5*1000, msgId);
										break;

									default :
										sendResponse(null);
								}
							});
						};

						sendRequest(request.mid);
						break;

					case "getAudioById" :
						var sendRequest = function(requestData) {
							ReqManager.apiMethod("audio.getById", {"audios" : requestData.ownerId + "_" + requestData.id}, function(data) {
								var output = (data.response.length) ? data.response[0] : null;
								if (output === null) {
									statSend("Custom-Errors", "Attachment info missing", requestData);
								}

								sendResponse(output);
							}, function(errCode, errData) {
								switch (errCode) {
									case ReqManager.NO_INTERNET :
									case ReqManager.NOT_JSON :
									case ReqManager.TIMEOUT :
									case ReqManager.RESPONSE_ERROR :
										window.setTimeout(sendRequest, 5*1000, requestData);
										break;

									default :
										sendResponse(null);
								}
							});
						};

						sendRequest(request);
						sendAsyncResponse = true;
						break;

					case "getVideoById" :
						var sendRequest = function(requestData) {
							ReqManager.apiMethod("video.get", {"videos" : requestData.ownerId + "_" + requestData.id}, function(data) {
								var output = (data.response instanceof Array && data.response.length === 2) ? data.response[1] : null;
								if (output === null) {
									statSend("Custom-Errors", "Attachment info missing", requestData);
								}

								sendResponse(output);
							}, function(errCode, errData) {
								switch (errCode) {
									case ReqManager.NO_INTERNET :
									case ReqManager.NOT_JSON :
									case ReqManager.TIMEOUT :
									case ReqManager.RESPONSE_ERROR :
										window.setTimeout(sendRequest, 5*1000, requestData);
										break;

									default :
										sendResponse(null);
								}
							});
						};

						sendRequest(request);
						sendAsyncResponse = true;
						break;

					case "getPhotoById" :
						var sendRequest;

						if (request.mid !== undefined) {
							sendRequest = function(requestData) {
								requestData.ownerId = parseInt(requestData.ownerId, 10);
								requestData.id = parseInt(requestData.id, 10);

								ReqManager.apiMethod("messages.getById", {"mid" : requestData.mid}, function(data) {
									if ((data.response instanceof Array) === false || data.response.length !== 2 || data.response[1].attachments === undefined) {
										statSend("Custom-Errors", "Attachment info missing", requestData);

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

									statSend("Custom-Errors", "Attachment info missing", requestData);
								}, function(errCode, errData) {
									switch (errCode) {
										case ReqManager.NO_INTERNET :
										case ReqManager.NOT_JSON :
										case ReqManager.TIMEOUT :
										case ReqManager.RESPONSE_ERROR :
											window.setTimeout(sendRequest, 5*1000, requestData);
											break;

										default :
											sendResponse(null);
									}
								});
							};
						} else {
							sendRequest = function(requestData) {
								ReqManager.apiMethod("photos.getById", {"photos" : requestData.ownerId + "_" + requestData.id}, function(data) {
									var output = (data.response.length) ? data.response[0] : null;
									if (output === null) {
										statSend("Custom-Errors", "Attachment info missing", requestData);
									}

									sendResponse(output);
								}, function(errCode, errData) {
									switch (errCode) {
										case ReqManager.NO_INTERNET :
										case ReqManager.NOT_JSON :
										case ReqManager.TIMEOUT :
										case ReqManager.RESPONSE_ERROR :
											window.setTimeout(sendRequest, 5*1000, requestData);
											break;

										default :
											sendResponse(null);
									}
								});
							};
						}

						sendRequest(request);
						sendAsyncResponse = true;
						break;

					case "markMessageTag" :
						DatabaseManager.markMessageWithTag(request.mid, request.tagId, function() {
							sendResponse(true);
						}, function (isDatabaseError, errMsg) {
							if (isDatabaseError) {
								LogManager.error(errMsg);
								statSend("Custom-Errors", "Database error", errMsg);
							}

							sendResponse(false);
						});

						sendAsyncResponse = true;
						break;

					case "unmarkMessageTag" :
						DatabaseManager.unmarkMessageWithTag(request.mid, request.tagId, function() {
							sendResponse(true);
						}, function(isDatabaseError, errMsg) {
							if (isDatabaseError) {
								LogManager.error(errMsg);
								statSend("Custom-Errors", "Database error", errMsg);
							}

							sendResponse(false);
						});

						sendAsyncResponse = true;
						break;

					case "serverDeleteMessage" :
						var sendDropMessageRequest = function(msgId) {
							ReqManager.apiMethod("messages.delete", {"mid" : msgId}, function(data) {
								sendResponse(true);
							}, function(errCode, errData) {
								switch (errCode) {
									case ReqManager.NO_INTERNET :
									case ReqManager.NOT_JSON :
									case ReqManager.TIMEOUT :
									case ReqManager.RESPONSE_ERROR :
										window.setTimeout(sendDropMessageRequest, 60*1000, msgId);
										break;
								}

								LogManager.error("Deleting message failed (got error code " + errCode + ")");
								sendResponse(false);
							});
						};

						sendDropMessageRequest(request.mid);
						sendAsyncResponse = true;
						break;

					case "serverRestoreMessage" :
						statSend("App-Data", "Use restore messages");

						var sendRestoreMessageRequest = function(msgId) {
							ReqManager.apiMethod("messages.restore", {"mid" : msgId}, function(data) {
								sendResponse(true);
							}, function(errCode, errData) {
								switch (errCode) {
									case ReqManager.NO_INTERNET :
									case ReqManager.NOT_JSON :
									case ReqManager.TIMEOUT :
										window.setTimeout(sendRestoreMessageRequest, 60*1000, msgId);
										break;
								}

								LogManager.error("Restoring message failed (got error code " + errCode + ")");
								sendResponse(false);
							});
						};

						sendRestoreMessageRequest(request.mid);
						sendAsyncResponse = true;
						break;

					case "deleteMessageForever" :
						var onDrop,
							sendDropMessageRequest,
							actionsToGo = (request.serverToo) ? 2 : 1,
							actionsMade = 0;

						sendAsyncResponse = true;

						onDrop = function() {
							actionsMade += 1;
							if (actionsMade !== actionsToGo) {
								return;
							}

							sendResponse(null);
						}

						sendDropMessageRequest = function(msgId) {
							ReqManager.apiMethod("messages.delete", {"mid" : msgId}, function(data) {
								onDrop();
							}, function(errCode, errData) {
								switch (errCode) {
									case ReqManager.NO_INTERNET :
									case ReqManager.NOT_JSON :
									case ReqManager.TIMEOUT :
										window.setTimeout(sendDropMessageRequest, 60*1000, msgId);
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

					case "speechChange" :
						statSend("App-Actions", "Speech change", {
							"chrome" : navigatorVersion,
							"app" : App.VERSION,
							"uid" : AccountsManager.currentUserId
						});

						break;

					case "newsPostSeen" :
						statSend("App-Data", "News seen", request.id);
						break;

					case "newsLinkClicked" :
						statSend("App-Actions", "News link clicked", [request.id, request.url]);
						break;

					case "newsAudioPlaying" :
						statSend("App-Actions", "Audio playing", [request.id, request.owner_id, request.aid]);
						break;

					case "tourWatch" :
						statSend("App-Data", "WP seen", request.step);
						break;

					case "useImportantTag" :
						statSend("App-Data", "Use important tag", request.type);
						break;

					case "getTagsFrequency" :
						sendAsyncResponse = true;
						DatabaseManager.getTagsCount(CacheManager.tags.trash, sendResponse, function(errMsg) {
							LogManager.error(errMsg);
							statSend("Custom-Errors", "Database error", errMsg);

							sendResponse({});
						});

						break;

					case "getMessagesByTagId" :
						sendAsyncResponse = true;
						DatabaseManager.getMessagesByType([request.tagId, CacheManager.tags.trash], request.totalShown, sendResponse, function(errMsg) {
							LogManager.error(errMsg);
							statSend("Custom-Errors", "Database error", errMsg);

							sendResponse([[], 0]);
						});

						break;

					case "searchContact" :
						var latin = "qwertyuiopasdfghjklzxcvbnm".split(""),
							rus = chrome.i18n.getMessage("ruSymbols").split(""),
							search = [request.value],
							correction = [];

						sendAsyncResponse = true;

						if (/[a-zA-Z]/.test(request.value)) {
							request.value.split("").forEach(function(letter) {
								var pos = latin.indexOf(letter);
								if (pos === -1) {
									correction.push(letter);
								} else {
									correction.push(rus[pos]);
								}
							});

							search.push(correction.join(""));
						}

						DatabaseManager.searchContact(search, SettingsManager.SortContacts, request.totalShown, function(contacts, total) {
							sendResponse([contacts, total, request.value]);

							if (SettingsManager.ShowOnline === 1 && contacts.length) {
								var uids = contacts.map(function(contactData) {
									return contactData.uid;
								});

								ReqManager.apiMethod("users.get", {"uids" : uids.join(","), "fields" : "online"}, function(data) {
									data.response.forEach(function(chunk) {
										var isOnline = (chunk.online === 1 || chunk.online_mobile === 1);
										chrome.runtime.sendMessage({"action" : "contactOnlineStatus", "uid" : chunk.uid, "online" : isOnline});
									});
								});
							}
						}, function(errMsg) {
							LogManager.error(errMsg);
							statSend("Custom-Errors", "Database error", errMsg);

							sendResponse([[], 0, request.value]);
						});

						break;

					case "searchMail" :
						sendAsyncResponse = true;

						DatabaseManager.searchMail(request.params, request.value, CacheManager.tags.trash, request.totalShown, function(correspondence, total) {
							sendResponse([correspondence, total, request.value]);
						}, function(errMsg) {
							LogManager.error(errMsg);
							statSend("Custom-Errors", "Database error", errMsg);

							sendResponse([[], 0, request.value]);
						});

						break;

					case "getOAuthToken":
						oAuthRequestData = request.type;

						if (request.type === "update")
							updateTokenForUserId = request.uid;

						chrome.tabs.create({
							"url" : "http://api.vk.com/oauth/authorize?client_id=" + App.VK_ID + "&scope=" + App.VK_APP_SCOPE.join(",") + "&redirect_uri=http://api.vk.com/blank.html&display=page&response_type=token"
						}, function (tab) {
							OAuthTabData.push(tab.id);
						});

						break;

					case "newUserAfterUpdateToken" :
						findFrontendTabs(function(chromeWindowsExist, tabsList) {
							var appFrontendUrl = App.resolveURL("main.html");

							AccountsManager.setData(request.uid, request.token, "...");
							AccountsManager.currentUserId = request.uid;

							startUserSession(function() {
								if (chromeWindowsExist === false) {
									chrome.windows.create({"url" : appFrontendUrl});
									return;
								}

								if (tabsList.length === 0) {
									chrome.tabs.create({"url" : appFrontendUrl});
									return;
								}

								// закрываем все табы, кроме первого в списке по приоритету
								tabsList.forEach(function(tabInfo, index) {
									if (index === 0) {
										chrome.windows.update(tabInfo.windowId, {"focused" : true});
										if (tabInfo.type === "tab") {
											try {
												chrome.tabs.update(tabInfo.tabId, {"active" : true});
											} catch (e) {
												chrome.tabs.update(tabInfo.tabId, {"selected" : true});
											}
										}
									} else {
										if (tabInfo.type === "app") {
											chrome.windows.remove(tabInfo.windowId);
										} else {
											chrome.tabs.remove(tabInfo.tabId);
										}
									}
								});

								chrome.runtime.sendMessage({"action" : "ui", "which" : "syncing"});
							});
						});

						break;

					case "currentSyncValues" :
						var output = syncingData[AccountsManager.currentUserId];
						sendAsyncResponse = true;

						sendResponse(output);
						break;

					case "switchToAccount" :
						ReqManager.abortAll();
						AccountsManager.currentUserId = request.uid;

						var changelogNotified = StorageManager.get("changelog_notified", {constructor: Array, strict: true}),
							wallTokenUpdated = (StorageManager.get("wall_token_updated", {constructor: Object, strict: true, create: true})[AccountsManager.currentUserId] !== undefined),
							startUser = true,
							leaveOneTabFn;

						leaveOneTabFn = function() {
							findFrontendTabs(function(chromeWindowsExist, tabsList) {
								var appFrontendUrl = App.resolveURL("main.html");

								if (chromeWindowsExist === false) {
									chrome.windows.create({"url" : appFrontendUrl});
									return;
								}

								if (tabsList.length === 0) {
									chrome.tabs.create({"url" : appFrontendUrl});
									return;
								}

								// закрываем все табы, кроме первого в списке по приоритету
								tabsList.forEach(function(tabInfo, index) {
									if (index === 0) {
										chrome.windows.update(tabInfo.windowId, {"focused" : true});
										if (tabInfo.type === "tab") {
											try {
												chrome.tabs.update(tabInfo.tabId, {"active" : true});
											} catch (e) {
												chrome.tabs.update(tabInfo.tabId, {"selected" : true});
											}
										}
									} else {
										if (tabInfo.type === "app") {
											chrome.windows.remove(tabInfo.windowId);
										} else {
											chrome.tabs.remove(tabInfo.tabId);
										}
									}
								});

								chrome.runtime.sendMessage({"action" : "ui"});
							});
						};

						if (startUser) {
							startUserSession(leaveOneTabFn);
						} else {
							leaveOneTabFn();
						}

						break;

					case "deleteAccount" :
						ReqManager.abortAll();
						AccountsManager.drop(request.uid);
						DatabaseManager.dropUser(request.uid);

						var friendsSyncTime = StorageManager.get("friends_sync_time", {constructor: Object, strict: true, create: true});
						delete friendsSyncTime[request.uid];
						StorageManager.set("friends_sync_time", friendsSyncTime);

						var wallTokenUpdated = StorageManager.get("wall_token_updated", {constructor: Object, strict: true, create: true});
						delete wallTokenUpdated[request.uid];
						StorageManager.set("wall_token_updated", wallTokenUpdated);

						StorageManager.remove("perm_inbox_" + request.uid);
						StorageManager.remove("perm_outbox_" + request.uid);

						if (request.next !== false) {
							AccountsManager.currentUserId = request.next;
							startUserSession();
						}

						// закрываем все табы приложения кроме одного
						findFrontendTabs(function(chromeWindowsExist, tabsList) {
							var appFrontendUrl = App.resolveURL("main.html");

							if (chromeWindowsExist === false) {
								chrome.windows.create({"url" : appFrontendUrl});
								return;
							}

							if (tabsList.length === 0) {
								chrome.tabs.create({"url" : appFrontendUrl});
								return;
							}

							// закрываем все табы, кроме первого в списке по приоритету
							tabsList.forEach(function(tabInfo, index) {
								if (index === 0) {
									chrome.windows.update(tabInfo.windowId, {"focused" : true});
									if (tabInfo.type === "tab") {
										try {
											chrome.tabs.update(tabInfo.tabId, {"active" : true});
										} catch (e) {
											chrome.tabs.update(tabInfo.tabId, {"selected" : true});
										}
									}
								} else {
									if (tabInfo.type === "app") {
										chrome.windows.remove(tabInfo.windowId);
									} else {
										chrome.tabs.remove(tabInfo.tabId);
									}
								}
							});

							chrome.runtime.sendMessage({"action" : "ui"});
						});

						break;

					case "markAsRead" :
						var sendReadMessageRequest = function (msgId) {
							ReqManager.apiMethod("messages.markAsRead", {"mids" : msgId}, null, function (errCode, errData) {
								switch (errCode) {
									case ReqManager.NO_INTERNET :
									case ReqManager.NOT_JSON :
									case ReqManager.TIMEOUT :
										window.setTimeout(sendReadMessageRequest, 60*1000, msgId);
										break;
								}

								LogManager.error("Marking message as read failed (got error code " + errCode + ")");
							});
						};

						sendReadMessageRequest(request.mid);
						DatabaseManager.markAsRead(request.mid, null, function(isDatabaseError, errMsg) {
							if (isDatabaseError) {
								LogManager.error(errMsg);
								statSend("Custom-Errors", "Database error", errMsg);
							}
						});

						break;

					case "DNDhappened" :
						statSend("App-Actions", "DND", request.num);
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
	});
});
