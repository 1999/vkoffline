/* ==========================================================
 * Migration Manager (VK Offline Chrome app)
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

var MigrationManager = (function () {
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
