CPA = (function () {
	"use strict";

	var service = analytics.getService(App.GOOGLE_ANALYTICS_CPA_ID);
	var tracker = service.getTracker(App.GOOGLE_ANALYTICS_CPA_COUNTER);

	chrome.runtime.onMessage.addListener(function (req, sender, sendResponse) {
		if (req.action !== "stat")
			return;

		var returnValue = false;
		var args = req.args || [];

		if (req.method === "isTrackingPermitted") {
			args.push(sendResponse);
			returnValue = true;
		}

		CPA[req.method] && CPA[req.method].apply(CPA, args);
		return returnValue;
	});

	chrome.alarms.onAlarm.addListener(function (alarmInfo) {
		switch (alarmInfo.name) {
			case "dayuse":
				// chrome.storage.local.get({
				// 	"settings.lastfmToken": Config.default_settings_local.lastfmToken,
				// 	"settings.vkToken": Config.default_settings_local.vkToken,
				// 	"settings.vkUID": Config.default_settings_local.vkUID,
				// 	"settings.appUsedToday": Config.default_settings_local.appUsedToday,
				// 	"settings.stat": Config.default_settings_local.stat,
				// 	appInstallDate: Date.now(),
				// 	firstStatSent: false
				// }, function (records) {
				// 	if (!supportsMP3()) {
				// 		chrome.management.uninstallSelf();
				// 		return;
				// 	}

				// 	var isAppUsed = records["settings.appUsedToday"];
				// 	var isFirstStat = !records.firstStatSent;

				// 	// total app users
				// 	CPA.sendEvent("Lyfecycle", "Dayuse.New", "Total", 1);

				// 	// active newbie users
				// 	// @see https://github.com/1999/listen/issues/95
				// 	if (isFirstStat) {
				// 		CPA.sendEvent("Lyfecycle", "Dayuse.New", "Active newbies", isAppUsed);
				// 	}

				// 	// total users, who opened app today
				// 	// actually not today, but rather after previous alarm's fire event
				// 	// because alarm can run after the scheduledTime and re-set the scheduledTime = Date.now() + periodInMinutes,
				// 	// this value is not totally precise
				// 	CPA.sendEvent("Lyfecycle", "Dayuse.New", "Active users", isAppUsed);

				// 	// authorized users: total and event value
				// 	var isAuthorized = (records["settings.vkToken"].length > 0);
				// 	CPA.sendEvent("Lyfecycle", "Dayuse.New", "Is authorized", isAuthorized);

				// 	// LFM users
				// 	var isLFMAuthorized = (records["settings.lastfmToken"].length > 0);
				// 	CPA.sendEvent("Lyfecycle", "Dayuse.New", "Is scrobbling", isAuthorized && isLFMAuthorized);

				// 	// custom stat data
				// 	var totalSongsPlayed = 0;
				// 	for (var key in records["settings.stat"]) {
				// 		if (key.indexOf("songs.") === 0) {
				// 			totalSongsPlayed += records["settings.stat"][key];
				// 		} else if (key.indexOf("views.") === 0) {
				// 			CPA.sendEvent("Lyfecycle", "Dayuse.Views", key.substr(6), records["settings.stat"][key]);
				// 		} else {
				// 			CPA.sendEvent("Lyfecycle", "Dayuse.Custom", key, records["settings.stat"][key]);
				// 		}
				// 	}

				// 	// number of today-played songs
				// 	// played song is a song, which was played first or which was preceded by a song with another URI
				// 	// URI params are currently cut away, song can be counted twice and more times (first song -> second -> first again)
				// 	CPA.sendEvent("Lyfecycle", "Dayuse.New", "Played songs", totalSongsPlayed);

				// 	// send custom data for the number played songs
				// 	// prior to 5.2 vkUID was not saved during OAuth process, so it's time to get it here
				// 	if (isAuthorized && totalSongsPlayed) {
				// 		if (records["settings.vkUID"]) {
				// 			CPA.sendEvent("Lyfecycle", "Dayuse.UsersTop", records["settings.vkUID"], totalSongsPlayed);
				// 		} else {
				// 			loadResource("https://api.vk.com/method/users.get.xml", {
				// 				responseType: "xml",
				// 				data: {
				// 					access_token: records["settings.vkToken"],
				// 					v: "5.0"
				// 				},
				// 				onload: function (xml) {
				// 					var error = xml.querySelector("error");
				// 					if (error)
				// 						return;

				// 					var node = xml.querySelector("response > user > id");
				// 					var uid = parseInt(node.textContent);

				// 					CPA.sendEvent("Lyfecycle", "Dayuse.UsersTop", uid, totalSongsPlayed);
				// 					chrome.storage.local.set({"settings.vkUID": uid});
				// 				}
				// 			});
				// 		}
				// 	}

				// 	// reset "appUsedToday" and "stat" settings
				// 	chrome.storage.local.set({
				// 		"settings.appUsedToday": false,
				// 		"settings.stat": {},
				// 		firstStatSent: true
				// 	});
				// });

				break;
		}
	});


	return {
		changePermittedState: function CPA_changePermittedState(permitted) {
			service.getConfig().addCallback(function (config) {
				config.setTrackingPermitted(permitted);
			});
		},

		isTrackingPermitted: function CPA_isTrackingPermitted(callback) {
			service.getConfig().addCallback(function (config) {
				callback(config.isTrackingPermitted());
			});
		},

		sendEvent: function CPA_sendEvent(category, action, label, valueCount) {
			var args = [];

			for (var i = 0, len = Math.min(arguments.length, 4); i < len; i++) {
				if (i === 3) {
					if (typeof valueCount === "boolean") {
						valueCount = Number(valueCount);
					} else if (typeof valueCount !== "number") {
						valueCount = parseInt(valueCount, 10) || 0;
					}

					args.push(valueCount);
				} else {
					if (typeof arguments[i] !== "string") {
						args.push(JSON.stringify(arguments[i]));
					} else {
						args.push(arguments[i]);
					}
				}
			}

			tracker.sendEvent.apply(tracker, args);
		},

		sendAppView: function CPA_sendAppView(viewName) {
			tracker.sendAppView(viewName);
		}
	};
})();