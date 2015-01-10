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
	GOODBYE_PAGE_URL: "http://staypositive.ru/goodbye-vkofflineapp.html",
	LISTENAPP_ID: "bggaejdaachpiaibkedeoadbglgdjpab",
	LAUNCHER_EXTENSION_ID: "kokdpdbdcbjlehlgbkaoandedpmjodfh",

	GOOGLE_ANALYTICS_CPA_ID: "vkoffline_chrome_app",
	GOOGLE_ANALYTICS_CPA_COUNTER: "UA-20919085-11",

	NAME: chrome.runtime.getManifest().name,
	ID: chrome.runtime.id,
	VERSION: chrome.runtime.getManifest().version,

	VK_ADV_GROUP: [29809053, 636], // [ID группы, ignorePostsBeforeId]
	VK_ID: 2438161, /* ID приложения ВКонтакте */
	VK_APP_SCOPE: ['friends', 'messages', 'offline', 'photos', 'audio', 'video', 'docs', 'wall', 'groups'], // OAuth-scope для приложения ВКонтакте

	FRIENDS_UPDATE_TIMEOUT: 86400 // промежуток между обновлениями списка друзей в секундах
};
