window.onerror = function(msg, url, line) {
	var msgError = msg + ' in ' + url + ' (line: ' + line + ')';

	console.error(msgError);
	LogManager.error(msgError);
};

(function () {
	"use strict";

	var navigatorVersion = parseInt(navigator.userAgent.match(/Chrome\/([\d]+)/)[1], 10);
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
		if (!chrome.notifications)
			return;

		var promise = data.uid
			? getAvatarImage(data.icon, data.uid)
			: Promise.resolve(data.icon);

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
		}

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
	var notificationHandlers = {};
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
	chrome.app.runtime.onRestarted.addListener(openAppWindow);

	Promise.all([
		StorageManager.load(),
		DatabaseManager.initMeta()
	]).then(function readyToGo(err) {
		SettingsManager.init();
		LogManager.config("App started");

		var syncingData = {}, // объект с ключами inbox, sent и contacts - счетчик максимальных чисел
			uidsProcessing = {}; // объект из элементов вида {currentUserId1: {uid1: true, uid2: true, uid3: true}, ...}

		var clearSyncingDataCounters = function(userId) {
			if (syncingData[userId] !== undefined) {
				syncingData[userId].contacts[0] = 0;
				syncingData[userId].contacts[1] = 0;

				syncingData[userId].inbox[0] = 0;
				syncingData[userId].inbox[1] = 0;

				syncingData[userId].sent[0] = 0;
				syncingData[userId].sent[1] = 0;
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

		var longPollEventsRegistrar = {
			init: function(currentUserId) {
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

					this.init(currentUserId);
					return;
				}

				LogManager.info(JSON.stringify(res));

				res.updates.forEach(function (data) {
					switch (data[0]) {
						case 2 :
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
									chrome.runtime.sendMessage({"action" : "msgReadStatusChange", "read" : false, "id" : data[1]});
								}, function (errMsg) {
									LogManager.error(errMsg);
									CPA.sendEvent("Custom-Errors", "Database error", errMsg);
								});
							}

							break;

						case 3 :
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
									chrome.runtime.sendMessage({"action" : "msgReadStatusChange", "read" : true, "id" : data[1]});
								}, function (errMsg) {
									LogManager.error(errMsg);
									CPA.sendEvent("Custom-Errors", "Database error", errMsg);
								});
							}

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
										if (SettingsManager.NotificationsTime === 0/* || SettingsManager.ShowWhenVK === 0*/)
											return;

										showChromeNotification({
											uid: uid,
											title: userData.first_name + " " + userData.last_name,
											message: msgData.body.replace(/<br>/gm, "\n"),
											icon: avatarUrl,
											sound: "message",
											timeout: (SettingsManager.NotificationsTime === 12) ? undefined : SettingsManager.NotificationsTime * 5,
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

				this.init(currentUserId);

				if (AccountsManager.currentUserId === currentUserId) {
					mailSync(currentUserId, "inbox");
					mailSync(currentUserId, "sent");
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

					if (errCode === ReqManager.ACCESS_DENIED) {
						chrome.runtime.sendMessage({action: "tokenExpired"});
					}

					switch (errCode) {
						case ReqManager.ABORT:
						case ReqManager.ACCESS_DENIED:
							return;
					}

					window.setTimeout(self.init.bind(self), 5000, currentUserId);
				});
			},

			_longPollInit: function(currentUserId) {
				var domain = this._longPollData[currentUserId].server.replace("vkontakte.ru", "vk.com");

				this._longPollXhrIds[currentUserId] = ReqManager.forceUrlGet("https://" + domain, {
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
					case ReqManager.ABORT :
					case ReqManager.ACCESS_DENIED :
						return;
				}

				window.setTimeout(getUserProfile, 5*1000, currentUserId, uid, callback);
			});
		}

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
				var nowDate = new Date(),
					nowDay = nowDate.getDate(),
					nowYear = nowDate.getFullYear(),
					nowMonth = nowDate.getMonth() + 1,
					bDate, i, notification, msg;

				if (currentUserData.bdate === undefined || currentUserData.bdate.length === 0)
					return;

				// разбиваем и преобразуем в числа
				bDate = currentUserData.bdate.split(".");
				for (i = 0; i < bDate.length; i++)
					bDate[i] = parseInt(bDate[i], 10);

				if (bDate[0] !== nowDay || bDate[1] !== nowMonth)
					return;

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

			ReqManager.apiMethod("friends.get", {fields: "first_name,last_name,sex,domain,bdate,photo,contacts"}, function (data) {
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

						if (SettingsManager.ShowBirthdayNotifications === 0)
							return;

						// показываем уведомление, если у кого-то из друзей ДР
						if (userDoc.bdate === undefined || userDoc.bdate.length === 0)
							return;

						// разбиваем и преобразуем в числа
						bDate = userDoc.bdate.split(".");
						for (i = 0; i < bDate.length; i++)
							bDate[i] = parseInt(bDate[i], 10);

						if (bDate[0] !== nowDay || bDate[1] !== nowMonth)
							return;

						// показываем уведомление о ДР
						var i18nBirthDay = chrome.i18n.getMessage("birthday").split("|"),
							i18nYears = chrome.i18n.getMessage("years").split("|"),
							hisHerMatches = i18nBirthDay[0].match(/([^\s]+)-([^\s]+)/),
							msg, yoNow, notification;

						userDoc.sex = userDoc.sex || 0;
						switch (userDoc.sex) {
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

					var inboxSynced = (StorageManager.get("perm_inbox_" + currentUserId) !== null);
					var sentSynced = (StorageManager.get("perm_outbox_" + currentUserId) !== null);

					friendsSyncTimes[currentUserId] = Date.now();
					StorageManager.set("friends_sync_time", friendsSyncTimes);

					// следующая синхронизация должна начаться через FRIENDS_UPDATE_TIMEOUT
					window.setTimeout(friendsSync, milliSecondsTimeout, currentUserId);

					// если к этому моменту уже синхронизированы входящие и исходящие
					if (AccountsManager.currentUserId === currentUserId) {
						if (inboxSynced && sentSynced) {
							// сбрасываем счетчик синхронизации
							clearSyncingDataCounters(currentUserId);

							Promise.all([
								DatabaseManager.actualizeContacts(currentUserId),
								DatabaseManager.actualizeChatDates(currentUserId)
							]).then(function () {
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
		var mailSync = function(currentUserId, mailType, latestMessageId) {
			var offset = syncingData[currentUserId][mailType][1];
			var userDataForRequest = AccountsManager.list[currentUserId],
				compatName = (mailType === "inbox") ? "inbox" : "outbox",
				permKey = "perm_" + compatName + "_" + currentUserId,
				firstSync = (StorageManager.get(permKey) === null);

			var latestMsg = offset
				? Promise.resolve(latestMessageId)
				: DatabaseManager.getLatestTagMessageId(mailType);

			var getMessages = new Promise(function (resolve, reject) {
				var reqData = {
					access_token: userDataForRequest.token,
					count: 100,
					preview_length: 0,
					out: (mailType === "sent") ? 1 : 0,
					offset: offset
				};

				ReqManager.apiMethod("messages.get", reqData, resolve, function (errCode, errData) {
					reject({
						code: errCode,
						data: errData
					});
				});
			});

			Promise.all([
				getMessages,
				latestMsg
			]).then(function (res) {
				var data = res[0];
				var latestMessageId = res[1];
				var timeToStopAfter = false; // message found with id equal to latestMessageId

				// flatten response structure
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
								Promise.all([
									DatabaseManager.actualizeContacts(currentUserId),
									DatabaseManager.actualizeChatDates(currentUserId)
								]).then(function () {
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
				if (data.response === 0 || (data.response instanceof Array && data.response.length === 1) || forceSkipSync) {
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
					if (!index)
						return;

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

					if (msgData.attachments.length)
						msgData.tags.push("attachments");

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
						"action" : "syncProgress",
						"userId" : currentUserId,
						"type" : mailType,
						"total" : syncingData[currentUserId][mailType][0],
						"current" : syncingData[currentUserId][mailType][1]
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
					case ReqManager.ACCESS_DENIED :
						// TODO error
						break;

					default :
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
		var startUserSession = function(callback) {
			var currentUserId = AccountsManager.currentUserId;

			// сбрасываем все XHR-запросы
			ReqManager.abortAll();

			// инициализируем БД
			DatabaseManager.initUser(currentUserId, function () {
				if (AccountsManager.currentUserId !== currentUserId)
					return;

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

					var wallTokenUpdated = StorageManager.get("wall_token_updated", {constructor: Object, strict: true, create: true});
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
					var newUserGranted = (AccountsManager.list[request.uid] === undefined);
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

					var wallTokenUpdated = StorageManager.get("wall_token_updated", {constructor: Object, strict: true, create: true});
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
					var neededUserTokenUpdated = (request.neededUid === request.uid);
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
						})
					}

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

				case "uiDraw" :
					sendAsyncResponse = true;
					sendResponse(true);

					var uiType;
					var changelogNotified = StorageManager.get("changelog_notified", {constructor: Array, strict: true, create: true});
					var inboxSynced, sentSynced, friendsSynced;
					var wallTokenUpdated;

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
							CPA.sendAppView("Users");
							CPA.sendEvent("UI-Draw", "Users", AccountsManager.currentUserId);

							chrome.storage.local.set({
								"dayuse.dau": true,
								"weekuse.wau": true
							});

							break;

						case "syncing" :
							CPA.sendAppView("Syncing");
							CPA.sendEvent("UI-Draw", "Syncing", AccountsManager.currentUserId);
							break;

						case "guest" :
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

						DatabaseManager.getContactList("alpha", request.totalShown, function(contacts) {
							sendResponse(contacts);

							if (SettingsManager.ShowOnline === 1) {
								onContactsListReady(contacts[0]);
							}
						}, function(errMsg) {
							sendResponse([[], 0]);
							LogManager.error(errMsg);
						});
					}, 3000);

					DatabaseManager.getContactList(request.type, request.totalShown, function(contacts) {
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
					DatabaseManager.getConversations(request.totalShown, sendResponse, function (errMsg) {
						sendResponse([[], 0]);
						LogManager.error(errMsg);
					});

					break;

				case "getDialogThread" :
					sendAsyncResponse = true;

					DatabaseManager.getDialogThread(request.id, {
						from: (request.from !== undefined) ? request.from : 0,
						everything: Boolean(request.print)
					}, sendResponse, function (errMsg) {
						sendResponse([[], 0]);
						LogManager.error(errMsg);
					});

					break;

				case "getMessageInfo" :
					sendAsyncResponse = true;
					DatabaseManager.getMessageById(Number(request.mid), sendResponse, function (isDatabaseError, errMsg) {
						sendResponse(undefined);

						if (isDatabaseError) {
							LogManager.error(errMsg);
							CPA.sendEvent("Custom-Errors", "Database error", errMsg);
						}
					});

					break;

				case "getConversationThreadsWithContact" :
					sendAsyncResponse = true;
					DatabaseManager.getConversationThreadsWithContact(request.uid, sendResponse, function (errMsg) {
						sendResponse([]);
						LogManager.error(errMsg);
					});

					break;

				case "getContactData" :
					sendAsyncResponse = true;
					DatabaseManager.getContactById(AccountsManager.currentUserId, request.uid, sendResponse, function (err) {
						sendResponse(null);
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
					CPA.sendEvent("Custom-Errors", request.error, request.message);
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
						CPA.sendEvent("App-Actions", "Sent Message", AccountsManager.currentUserId);
						SoundManager.play("sent");

						sendResponse([0, data]);
					}, function(errCode, errData) {
						CPA.sendEvent("Custom-Errors", "Failed to send message", errCode);
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
					CPA.sendEvent("App-Actions", "Like and repost");
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
									CPA.sendEvent("Custom-Errors", "Attachment info missing", requestData);
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
								CPA.sendEvent("Custom-Errors", "Attachment info missing", request);

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
								CPA.sendEvent("Custom-Errors", "Attachment info missing", requestData);
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
								CPA.sendEvent("Custom-Errors", "Attachment info missing", requestData);
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
									CPA.sendEvent("Custom-Errors", "Attachment info missing", requestData);
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
					DatabaseManager.markMessageWithTag(request.mid, request.tag, function() {
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

				case "unmarkMessageTag" :
					DatabaseManager.unmarkMessageWithTag(request.mid, request.tag, function() {
						sendResponse(true);
					}, function(isDatabaseError, errMsg) {
						if (isDatabaseError) {
							LogManager.error(errMsg);
							CPA.sendEvent("Custom-Errors", "Database error", errMsg);
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
					CPA.sendEvent("App-Data", "Use restore messages");

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
					CPA.sendEvent("App-Actions", "Speech change", {
						"chrome" : navigatorVersion,
						"app" : App.VERSION,
						"uid" : AccountsManager.currentUserId
					});

					break;

				case "newsPostSeen" :
					CPA.sendEvent("App-Data", "News seen", request.id);
					break;

				case "newsLinkClicked" :
					CPA.sendEvent("App-Actions", "News link clicked", [request.id, request.url]);
					break;

				case "newsAudioPlaying" :
					CPA.sendEvent("App-Actions", "Audio playing", [request.id, request.owner_id, request.aid]);
					break;

				case "tourWatch" :
					CPA.sendEvent("App-Data", "WP seen", request.step);
					break;

				case "useImportantTag" :
					CPA.sendEvent("App-Data", "Use important tag", request.type);
					break;

				case "getTagsFrequency" :
					sendAsyncResponse = true;
					DatabaseManager.getTagsCount(sendResponse, function (errMsg) {
						LogManager.error(errMsg);
						CPA.sendEvent("Custom-Errors", "Database error", errMsg);

						sendResponse({});
					});

					break;

				case "getMessagesByTagName" :
					sendAsyncResponse = true;
					DatabaseManager.getMessagesByType(request.tag, request.totalShown || 0, sendResponse, function(errMsg) {
						LogManager.error(errMsg);
						CPA.sendEvent("Custom-Errors", "Database error", errMsg);

						sendResponse([[], 0]);
					});

					break;

				case "searchContact" :
					DatabaseManager.searchContact(request.value, request.totalShown, function (contacts, total) {
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
					}, function (errMsg) {
						LogManager.error(errMsg);
						CPA.sendEvent("Custom-Errors", "Database error", errMsg);

						sendResponse([[], 0, request.value]);
					});

					sendAsyncResponse = true;
					break;

				case "searchMail" :
					sendAsyncResponse = true;

					DatabaseManager.searchMail(request.params, request.value, request.totalShown, function (correspondence, total) {
						sendResponse([correspondence, total, request.value]);
					}, function(errMsg) {
						LogManager.error(errMsg);
						CPA.sendEvent("Custom-Errors", "Database error", errMsg);

						sendResponse([[], 0, request.value]);
					});

					break;

				case "skipSync":
					forceSkipSync = true;
					CPA.sendEvent("App-Actions", "Skip sync");
					break;

				case "currentSyncValues" :
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

				case "switchToAccount" :
					ReqManager.abortAll();
					AccountsManager.currentUserId = request.uid;

					var changelogNotified = StorageManager.get("changelog_notified", {constructor: Array, strict: true, create: true});
					var wallTokenUpdated = (StorageManager.get("wall_token_updated", {constructor: Object, strict: true, create: true})[AccountsManager.currentUserId] !== undefined);
					var startUser = true;

					if (startUser) {
						startUserSession(leaveOneAppWindowInstance);
					} else {
						leaveOneAppWindowInstance();
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
					leaveOneAppWindowInstance();

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
					DatabaseManager.markAsRead(request.mid, null, function (errMsg) {
						LogManager.error(errMsg);
						CPA.sendEvent("Custom-Errors", "Database error", errMsg);
					});

					break;

				case "DNDhappened" :
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
})();
