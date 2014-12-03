var MigrationManager = (function () {
	"use strict";

	var CHANGELOG_KEY = "changelog_notified";

	// FIXME: migration scripts
	// which run from previousVersion to current

	return {
		start: function MigrationManager_start(currentVersion) {
			StorageManager.load().then(function () {
				var appVersionsHistory = StorageManager.get(CHANGELOG_KEY, {constructor: Array, strict: true, create: true});
				if (appVersionsHistory.indexOf(currentVersion) === -1) {
					appVersionsHistory.push(currentVersion);
					StorageManager.set(CHANGELOG_KEY, appVersionsHistory);
				}

				if (currentVersion === "5.2" && appVersionsHistory.length > 1) {
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
						CPA.sendEvent("Lifecycle", "Actions", "Migrate52.NotifyLauncherPromote.Show");
					});
				}

				// if (currentVersion === "5.1" && appVersionsHistory.length > 1) {
				// 	// promote self
				// 	chrome.notifications && chrome.notifications.create(Math.random() + "", {
				// 		type: "basic",
				// 		iconUrl: chrome.runtime.getURL("pic/icon48.png"),
				// 		buttons: [
				// 			{title: chrome.i18n.getMessage("newApp50OpenLink")}
				// 		],
				// 		title: chrome.i18n.getMessage("newApp50Title").replace("%appname%", App.NAME) + " " + currentVersion,
				// 		message: chrome.i18n.getMessage("newApp50Message"),
				// 		isClickable: true
				// 	}, function (id) {
				// 		SoundManager.play("message");
				// 		CPA.sendEvent("Lifecycle", "Actions", "Migrate50.Notify.Show");

				// 		chrome.notifications.onClicked.addListener(function (notificationId) {
				// 			if (notificationId !== id) {
				// 				return;
				// 			}

				// 			notifySelf({action: "migrateIntrested"});
				// 			chrome.notifications.clear(notificationId, _.noop);

				// 			CPA.sendEvent("Lifecycle", "Actions", "Migrate50.Notify.Clck");
				// 			CPA.sendEvent("Lifecycle", "Actions", "Migrate50.Notify.Clck.All");
				// 		});

				// 		chrome.notifications.onButtonClicked.addListener(function (notificationId) {
				// 			if (notificationId !== id) {
				// 				return;
				// 			}

				// 			notifySelf({action: "migrateIntrested"});
				// 			chrome.notifications.clear(notificationId, _.noop);

				// 			CPA.sendEvent("Lifecycle", "Actions", "Migrate50.Notify.Clck");
				// 			CPA.sendEvent("Lifecycle", "Actions", "Migrate50.Notify.Clck.Btn");
				// 		});

				// 		chrome.notifications.onClosed.addListener(function (notificationId, byUser) {
				// 			if (notificationId !== id) {
				// 				return;
				// 			}

				// 			if (byUser) {
				// 				CPA.sendEvent("Lifecycle", "Actions", "Migrate50.Notify.Close");
				// 			}
				// 		});
				// 	});

				// 	// fix problem with falsy attachments since 4.11
				// 	DatabaseManager.getMessagesWithFalsyAttachments().then(function (mids) {
				// 		var currentUserId = AccountsManager.currentUserId;

				// 		mids.forEach(function (msgId) {
				// 			ReqManager.apiMethod("messages.getById", {
				// 				mid: msgId
				// 			}, function (data) {
				// 				if (!Array.isArray(data.response) || data.response.length !== 2) {
				// 					return;
				// 				}

				// 				var msgData = data.response[1];
				// 				msgData.attachments = msgData.attachments || [];

				// 				// геоданные также пишем как вложение
				// 				if (msgData.geo && msgData.geo.type === "point") {
				// 					coords = msgData.geo.coordinates.split(" ");

				// 					msgData.attachments.push({
				// 						type: "geopoint",
				// 						geopoint: {
				// 							lat: coords[0],
				// 							lng: coords[1]
				// 						}
				// 					});
				// 				}

				// 				if (!msgData.attachments.length) {
				// 					return;
				// 				}

				// 				msgData.chat_id = msgData.chat_id || 0;
				// 				msgData.tags = ["attachments"];

				// 				if (msgData.out === 1) {
				// 					msgData.tags.push("sent");
				// 				} else {
				// 					msgData.tags.push("inbox");
				// 				}

				// 				DatabaseManager.insertMessages(currentUserId, [msgData], _.noop, _.noop);
				// 				CPA.sendEvent("App-Actions", "Migrate falsy attachments");
				// 			});
				// 		});
				// 	});
				// }
			});
		}
	};
})();
