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

				if (currentVersion === "5.0" && appVersionsHistory.length > 1) {
					DatabaseManager.getMessagesWithFalsyAttachments().then(function (mids) {
						var currentUserId = AccountsManager.currentUserId;

						mids.forEach(function (msgId) {
							ReqManager.apiMethod("messages.getById", {
								mid: msgId
							}, function (data) {
								if (!Array.isArray(data.response) || data.response.length !== 2) {
									return;
								}

								var msgData = data.response[1];
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

								if (!msgData.attachments.length) {
									return;
								}

								msgData.chat_id = msgData.chat_id || 0;
								msgData.tags = ["attachments"];

								if (msgData.out === 1) {
									msgData.tags.push("sent");
								} else {
									msgData.tags.push("inbox");
								}

								DatabaseManager.insertMessages(currentUserId, [msgData], _.noop, _.noop);
								CPA.sendEvent("App-Actions", "Migrate falsy attachments");
							});
						});
					});
				}
			});
		}
	};
})();
