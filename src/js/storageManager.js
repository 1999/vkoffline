/* ==========================================================
 * LocalStorage Manager (VK Offline Chrome app)
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

var StorageManager = {
	set: function(key, value) {
		if (typeof value !== "string")
			value = JSON.stringify(value);

		localStorage.setItem(key, value);
	},

	/**
	 * Получение данных из LocalStorage, автоматическая валидация
	 * default params: {constructor: String, strict: false, create: false}
	 * @param {String} key ключ LocalStorage
	 * @param {Object} params {constructor: {Function} функция-конструктор, strict: {Boolean} проверка на ожидаемый тип данных через instanceof, create: {Boolean} создавать если данных нет}
	 */
	get: function(key, params) {
		var value = localStorage.getItem(key),
			valueCreated = false;

		params = params || {};
		params.constructor = params.constructor || String;
		params.strict = params.strict || false;
		params.create = params.create || false;

		if (value === null && params.create) {
			value = (params.constructor === String) ? "" : new params.constructor();
			valueCreated = true;
		}

		if (params.strict && params.constructor !== String && valueCreated === false) {
			try {
				value = JSON.parse(value);
			} catch (e) {
				throw new Error("Wrong storage data type of key \"" + key + "\": " + e.message);
			}

			// проверка на тип данных
			if (!(value instanceof params.constructor)) {
				throw new Error("Wrong storage data type of key \"" + key + "\"");
			}
		}

		return value;
	},

	remove: function(key) {
		localStorage.removeItem(key);
	}
};
