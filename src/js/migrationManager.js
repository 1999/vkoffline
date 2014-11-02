/* ==========================================================
 * Migration Manager (VK Offline Chrome app)
 * https://github.com/1999/vkoffline
 * ==========================================================
 * Copyright 2013-2014 Dmitry Sorin <info@staypositive.ru>
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

var MigrationManager = (function () {
	/**
	 * You can restart legacy migration with:
	 *
	 * localStorage.removeItem("legacy_migration");
	 * chrome.storage.local.clear();
	 * DatabaseManager._conn[115118] && DatabaseManager._conn[115118].close()
	 * sklad.deleteDatabase('db_115118', console.log.bind(console))
	 */
	var LAST_LEGACY_MIGRATION_KEY = "legacy_migration";
	var LAST_LEGACY_MIGRATION_STATUS_NO = 0;
	var LAST_LEGACY_MIGRATION_STATUS_STARTED = 1;
	var LAST_LEGACY_MIGRATION_STATUS_FINISHED = 2;

	var STORAGE_KEYS = [
		{key: "app_install_time", type: "number"},
		{key: "app_like", type: "array"},
		{key: "changelog_notified", type: "array"},
		{key: "friends_sync_time", type: "object"},
		{key_regex: /^message_[\d]+_[\d]+$/, type: "string"},
		{key_regex: /^perm_(outbox|inbox)_[\d]+$/, type: "number"},
		{key: "profile_act", type: "number"},
		{key: "request", type: "object"},
		{key: "settings", type: "object"},
		{key: "token", type: "array"},
		{key: "vkgroupwall_stored_posts", type: "array"},
		{key: "vkgroupwall_sync_time", type: "number"},
		{key: "vkgroupwall_synced_posts", type: "array"},
		{key: "wall_token_updated", type: "object"}
	];

	var CHANGELOG_KEY = "changelog_notified";

	function getUsersList() {
		var tokens = localStorage.getItem("token") || "";
		try {
			tokens = JSON.parse(tokens);
			if (!(tokens instanceof Array) || !tokens.length) {
				throw new Error("No tokens");
			}
		} catch (ex) {
			return [];
		}

		if (typeof tokens[0] === "string") {
			tokens = [tokens];
		}

		return tokens.map(function (tokenData) {
			return Number(tokenData[1]);
		});
	}

	function runLegacyMigration(uids, callback) {
		localStorage.setItem(LAST_LEGACY_MIGRATION_KEY, LAST_LEGACY_MIGRATION_STATUS_STARTED);
		createAlarms();

		var migrationStartTime = Date.now();

		Promise.all([
			migrateLocalStorage(),
			migrateWebDatabase(uids)
		]).then(function () {
			localStorage.setItem(LAST_LEGACY_MIGRATION_KEY, LAST_LEGACY_MIGRATION_STATUS_FINISHED);
			statSend("Migrate1", "Successfully finished");

			var migrationTotalTime = Date.now() - migrationStartTime;
			if (uids.length) {
				var processTime = Math,round(migrationTotalTime / 1000 / uids.length);
				statSend("Migrate1", "Process time", processTime);
			}

			callback();
		}, function (err) {
			statSend("Migrate1", "Finish failed", err);
			callback();
		});
	}

	function migrateLocalStorage() {
		console.log("Migrate localStorage data into chrome.storage.local");
		var records = {};

		for (var i = 0; i < localStorage.length; i++) {
			var key = localStorage.key(i);
			var value = localStorage.getItem(key);

			if (key === LAST_LEGACY_MIGRATION_KEY) {
				continue;
			}

			_.forEach(STORAGE_KEYS, function (keyData) {
				if ((keyData.key_regex && keyData.key_regex.test(key)) || keyData.key === key) {
					var returnValue = true;

					console.log("Search for key: %s", key);

					if (keyData.type === "string") {
						if (value.length) {
							records[key] = value;
							returnValue = false;

							console.log("Value found", value);
						}
					} else {
						try {
							value = JSON.parse(value);
						} catch (e) {
							console.error(e.message);
							return;
						}

						// проверка на тип данных
						if ((keyData.type === "array" && Array.isArray(value)) || typeof value === keyData.type) {
							records[key] = value;
							returnValue = false;

							console.log("Value found", value);
						}
					}

					return returnValue;
				}
			});
		}

		return new Promise(function (resolve, reject) {
			chrome.storage.local.set(records, resolve);

			if (chrome.runtime.lastError) {
				reject(chrome.runtime.lastError.message);
			}
		});
	}

	function migrateWebDatabase(uids) {
		return new Promise(function (resolve, reject) {
			DatabaseManager.migrateWebDatabase(uids, function (err) {
				if (err) {
					reject(err.name + ': ' + err.message);
				} else {
					resolve();
				}
			});
		});
	}

	function createAlarms() {
		chrome.alarms.create("actualizeChats", {
			periodInMinutes: 5,
			delayInMinutes: 5
		});

		chrome.alarms.create("actualizeContacts", {
			periodInMinutes: 60,
			delayInMinutes: 60
		});
	}

	return {
		start: function (callback) {
			var appVersionsHistory = StorageManager.get(CHANGELOG_KEY, {constructor: Array, strict: true, create: true});
			var isUpgrade = (appVersionsHistory.indexOf(App.VERSION) === -1);

			if (isUpgrade) {
				appVersionsHistory.push(App.VERSION);
				StorageManager.set(CHANGELOG_KEY, appVersionsHistory);
			}

			var legacyMigrationStatus = Number(localStorage.getItem(LAST_LEGACY_MIGRATION_KEY)) || 0;
			var uids = getUsersList();

			if (legacyMigrationStatus === LAST_LEGACY_MIGRATION_STATUS_FINISHED) {
				callback();
				return;
			}

			// something went wrong, clear migrated data, run migration from scratch
			if (legacyMigrationStatus === LAST_LEGACY_MIGRATION_STATUS_STARTED) {
				Utils.async.parallel({
					storage: function (cb) {
						chrome.storage.local.clear(cb);
					},
					db: function (cb) {
						DatabaseManager.dropEverything(uids, cb);
					}
				}, function (err) {
					if (err) {
						throw new Error(err.name + ': ' + err.message);
					}

					statSend("Migrate1", "Started");
					runLegacyMigration(uids, callback);
				});

				return;
			}

			statSend("Migrate1", "Started");
			runLegacyMigration(uids, callback);
		}
	};
})();
