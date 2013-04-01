/* ==========================================================
 * Log Manager (VK Offline Chrome app)
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

var LogManager = new (function() {
	var levels = [
		["config", "error", "warn"],
		["config", "error", "warn", "log"],
		["config", "error", "warn", "log", "info"]
	];

	["config", "error", "warn", "log", "info"].forEach(function(methodName) {
		this[methodName] = function() {
			var methodArgs = Array.prototype.slice.call(arguments, 0),
				tabs = chrome.extension.getViews({"type" : "tab"}),
				consoleMethodName = (methodName !== "config") ? methodName : "info",
				groupOutputNeeded = false;

			if (levels[SettingsManager.Debug].indexOf(methodName) === -1) {
				return;
			}

			if (typeof methodArgs[0] === "object") {
				groupOutputNeeded = true;
			}

			tabs.forEach(function(tab) {
				if (groupOutputNeeded) {
					tab.console.group(new Date());
					tab.console[consoleMethodName](methodArgs[0]);
					tab.console.groupEnd();
				} else {
					tab.console[consoleMethodName](new Date() + " " + methodArgs[0]);
				}
			});

			DatabaseManager.log(methodArgs[0], methodName);
		};
	}, this);

	/**
	 * Чтение лога
	 * @param {Function} callback принимает {Array} массив записей из лога, готовых к отправке, отсортированных по дате
	 */
	this.collect = function(callback) {
		DatabaseManager.collectLogData(callback);
	};
});
