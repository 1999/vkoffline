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
	var LAST_LEGACY_MIGRATION_KEY = "legacy_migration";
	var LAST_LEGACY_MIGRATION_STATUS_NO = 0;
	var LAST_LEGACY_MIGRATION_STATUS_STARTED = 1;
	var LAST_LEGACY_MIGRATION_STATUS_FINISHED = 2;

	var STORAGE_KEYS = [
		{key: "app_install_time", constructor: Number},
		{key: "app_like", constructor: Array},
		{key: "changelog_notified", constructor: Array},
		{key: "friends_sync_time", constructor: Object},
		{key_regex: /^message_[\d]+_[\d]+$/, constructor: String},
		{key_regex: /^perm_(outbox|inbox)_[\d]+$/, constructor: Number},
		{key: "profile_act", constructor: Number},
		{key: "request", constructor: Object},
		{key: "settings", constructor: Object},
		{key: "token", constructor: Array},
		{key: "vkgroupwall_stored_posts", constructor: Array},
		{key: "vkgroupwall_sync_time", constructor: Number},
		{key: "vkgroupwall_synced_posts", constructor: Array},
		{key: "wall_token_updated", constructor: Object}
	];

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

		Promise.all([migrateLocalStorage(), migrateWebDatabase(uids)]).then(function () {
			localStorage.setItem(LAST_LEGACY_MIGRATION_KEY, LAST_LEGACY_MIGRATION_STATUS_FINISHED);
			callback();
		}, function (err) {
			throw new Error(err);
		});
	}

	function migrateLocalStorage() {
		var records = {};
		for (var i = 0; i < localStorage.length; i++) {
			var key = localStorage.key(i);
			var value = localStorage.getItem(key);

			if (key === LAST_LEGACY_MIGRATION_KEY) {
				continue;
			}

			_.forEach(STORAGE_KEYS, function (keyData) {
				if ((keyData.regex && keyData.regex.test(value)) || keyData.key === key) {
					var returnValue = true;

					if (keyData.constructor === String) {
						if (value.length) {
							records[key] = value;
							returnValue = false;
						}
					} else {
						try {
							value = JSON.parse(value);
						} catch (e) {
							return;
						}

						// проверка на тип данных
						if (value instanceof keyData.constructor) {
							records[key] = value;
							returnValue = false;
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

	return {
		start: function (callback) {
			var legacyMigrationStatus = Number(localStorage.getItem(LAST_LEGACY_MIGRATION_KEY)) || 0;
			var uids = getUsersList();

			if (legacyMigrationStatus === LAST_LEGACY_MIGRATION_STATUS_FINISHED) {
				callback(true);
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

					runLegacyMigration(uids, callback);
				});

				return;
			}

			runLegacyMigration(uids, callback);
		}
	};



	var STORAGE_KEY = "changelog_notified";
	var appVersionsHistory = StorageManager.get(STORAGE_KEY, {constructor: Array, strict: true, create: true});
	var lastErrorObj = null;

	/**
	 * Нужно ли запустить шаг миграции
	 *
	 * @param {String} appVersion
	 * @return {Boolean}
	 */
	var migrationStepNeeded = function (appVersion) {
		return (appVersionsHistory.length && appVersionsHistory.indexOf(appVersion) === -1);
	};

	// используем массив, поскольку важен порядок запуска скриптов миграции
	var migrateData = [
		{
			version: "4.7",
			task: function (callback) {
				var ids = [];
				for (var uid in self.AccountsManager.list)
					ids.push(uid);

				StorageManager.remove("friends_sync_time");
				DatabaseManager.updateMessagesOnMigrate(ids, callback);
			}
		}
	];

	return {
		/**
		 * @param {DOMFileSystem|Null} fsLink
		 * @param {Function} callback принимает:
		 *		{Number} произошло ли обновление приложения
		 */
		start: function (fsLink, callback) {
			if (appVersionsHistory.indexOf(App.VERSION) !== -1)
				return callback(this.UNCHANGED);

			// запуск скриптов миграции
			var code = appVersionsHistory.length ? this.UPDATED : this.INSTALLED;
			var failCode = this.UPDATE_FAILED;
			var tasks = [];

			for (var i = 0; i < migrateData.length; i++) {
				if (migrationStepNeeded(migrateData[i].version)) {
					tasks.push(migrateData[i].task);
				}
			}

			Utils.async.series(tasks, function (err) {
				if (err) {
					lastErrorObj = new Error("Failed to migrate app: " + err);
					return callback(failCode);
				}

				// сохраняем, чтобы больше не уведомлять об этой версии
				appVersionsHistory.push(App.VERSION);
				StorageManager.set(STORAGE_KEY, appVersionsHistory);

				SoundManager.play("message", Math.max(0.8, SettingsManager.SoundLevel));
				callback(code);
			});
		},

		get lastError() {
			return lastErrorObj;
		},

		INSTALLED: 0,
		UPDATED: 1,
		UNCHANGED: 2,
		UPDATE_FAILED: 3
	};
})();
