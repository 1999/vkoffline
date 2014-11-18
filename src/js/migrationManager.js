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
					// FIXME: initUser?
					// FIXME: all users?
					// DatabaseManager.getMessagesWithFalsyAttachments
				}
			});
		}
	};
})();
