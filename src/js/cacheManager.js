/* ==========================================================
 * Cache Manager (VK Offline Chrome app)
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

var CacheManager = {
	init: function(currentUserId, keyset, defaultValue) {
		if (defaultValue === undefined)
			defaultValue = {};

		// сбрасываем весь кэш/геттеры/сеттеры как только видим, что сменился пользователь
		if (currentUserId !== this._currentUserId) {
			for (var keysetId in this._cachedElements) {
				delete this._cachedElements[keysetId];
			}

			this._currentUserId = currentUserId;
			this._cachedElements = {};
		}

		this._cachedElements[keyset] = defaultValue;

		// ставим сеттер/геттер
		this.__defineGetter__(keyset, function() {
			return this._cachedElements[keyset];
		});

		this.__defineSetter__(keyset, function(value) {
			this._cachedElements[keyset] = value;
		});
	},

	_cachedElements: {},
	_currentUserId: null
};
