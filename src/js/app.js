/* ==========================================================
 * App config (VK Offline Chrome app)
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

var App = {
	CHROME_WEBSTORE_ID: "jinklgkideaicpdgmomlckebafjfibjk", /* ID приложения в CWS */
	ERROR_EMAIL: "vkoffline@staypositive.ru",
	INIT_TAGS: ["inbox", "sent", "attachments", "important", "trash", "outbox", "drafts"], // изначальные тэги для сообщений

	get NAME() {
		var name;

		try {
			name = chrome.runtime.getManifest().name;
		} catch (e) {
			name = chrome.i18n.getMessage("appName");
		}

		delete this.NAME;
		return this.NAME = name;
	},

	get ID() {
		var id;

		try {
			id = chrome.runtime.id;
		} catch (e) {
			id = chrome.i18n.getMessage("@@extension_id");
		}

		delete this.ID;
		return this.ID = id;
	},

	get VERSION() {
		var version;

		try {
			version = chrome.runtime.getManifest().version;
		} catch (e) {
			version = chrome.app.getDetails().version;
		}

		delete this.VERSION;
		return this.VERSION = version;
	},

	get DEBUG() {
		return (this.CHROME_WEBSTORE_ID !== this.ID);
	},

	VK_ID: 2438161, /* ID приложения ВКонтакте */
	VK_APP_SCOPE: ['friends', 'messages', 'offline', 'photos', 'audio', 'video', 'docs', 'wall', 'groups'], // OAuth-scope для приложения ВКонтакте
	VK_ADV_GROUP: (this.DEBUG) ? [38283081, 27] : [29809053, 439], // [ID группы, ignorePostsBeforeId]
	GA_STAT_ID: (this.DEBUG) ? "UA-20919085-6" : "UA-20919085-5", // Google Analytics

	FRIENDS_UPDATE_TIMEOUT: 86400, // промежуток между обновлениями списка друзей в секундах

	resolveURL: function (path) {
		var url;

		try {
			url = chrome.runtime.getURL(path);
		} catch (e) {
			url = chrome.extension.getURL(path);
		}

		return url;
	},

	requestBackgroundPage: function (callback) {
		try {
			chrome.runtime.getBackgroundPage(callback);
		} catch (e) {
			var bgWindow = chrome.extension.getBackgroundPage();
			callback(bgWindow);
		}
	}
};
