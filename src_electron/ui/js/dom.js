/* ==========================================================
 * DOM sugar (VK Offline Chrome app)
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

(function (w) {
	w["$"] = function () {
		switch (arguments.length) {
			case 1:
				if (arguments[0] instanceof HTMLElement)
					return arguments[0];

				if (typeof arguments[0] === "string") {
					if (!/^<(.|[\r\n\t])+>$/.test(arguments[0]))
						return document.querySelector(arguments[0]);

					// $("<div>text</div>")
					var tmpElem = document.createElement("div");
					tmpElem.innerHTML = arguments[0];

					return (tmpElem.childNodes.length > 1) ? tmpElem.childNodes : tmpElem.firstChild;
				}

				break;

			case 2:
				if (arguments[0] instanceof HTMLElement && typeof arguments[1] === "string")
					return arguments[0].querySelector(arguments[1]);

				break;
		}

		throw new Error("Can't use these arguments");
	};

	w["$$"] = function () {
		switch (arguments.length) {
			case 1:
				if (typeof arguments[0] === "string")
					return document.querySelectorAll(arguments[0]);

				break;

			case 2:
				if (arguments[0] instanceof HTMLElement && typeof arguments[1] === "string")
					return arguments[0].querySelectorAll(arguments[1]);

				break;
		}

		throw new Error("Can't use these arguments");
	};

	var HTMLExtendedProto = {
		closestParent: function (selector) {
			var matchesSelectorFn = (Element.prototype.webkitMatchesSelector || Element.prototype.matchesSelector);
			var elem = this;

			while (elem.parentNode) {
				if (matchesSelectorFn.call(elem, selector))
					return elem;

				elem = elem.parentNode;
			}

			return null;
		},

		bind: function (evtType, callback, singleton) {
			if (singleton) {
				this["on" + evtType] = callback;
			} else {
				this.addEventListener(evtType, callback, false);
			}

			return this;
		},

		remove: function () {
			return this.parentNode.removeChild(this);
		},

		html: function (newHTML) {
			if (newHTML !== undefined) {
				this.innerHTML = newHTML;
				return this;
			}

			return this.innerHTML;
		},

		text: function (newContent) {
			if (newContent !== undefined) {
				this.textContent = newContent;
				return this;
			}

			return this.textContent;
		},

		empty: function () {
			return this.html("");
		},

		/**
		 * @param {String|Array|HTMLElement} contents
		 */
		append: function (contents) {
			if (typeof contents === "string") {
				this.insertAdjacentHTML("beforeEnd", contents);
			} else {
				if (contents instanceof HTMLElement)
					contents = [contents];

				for (var i = 0; i < contents.length; i++) {
					this.insertAdjacentElement("beforeEnd", contents[i]);
				}
			}

			return this;
		},

		/**
		 * @param {String|Array|HTMLElement} contents
		 */
		prepend: function (contents) {
			if (typeof contents === "string") {
				this.insertAdjacentHTML("afterBegin", contents);
			} else {
				if (contents instanceof HTMLElement)
					contents = [contents];

				for (var i = contents.length - 1; i >= 0; i--) {
					this.insertAdjacentElement("afterBegin", contents[i]);
				}
			}

			return this;
		},

		/**
		 * @param {String|Array|HTMLElement} contents
		 */
		before: function (contents) {
			if (typeof contents === "string") {
				this.insertAdjacentHTML("beforeBegin", contents);
			} else {
				if (contents instanceof HTMLElement)
					contents = [contents];

				for (var i = 0; i < contents.length; i++) {
					this.insertAdjacentElement("beforeBegin", contents[i]);
				}
			}

			return this;
		},

		/**
		 * @param {String|Array|HTMLElement} contents
		 */
		after: function (contents) {
			if (typeof contents === "string") {
				this.insertAdjacentHTML("afterEnd", contents);
			} else {
				if (contents instanceof HTMLElement)
					contents = [contents];

				for (var i = 0; i < contents.length; i++) {
					this.insertAdjacentElement("afterEnd", contents[i]);
				}
			}

			return this;
		},

		val: function (newValue) {
			if (newValue === undefined)
				return this.value;

			this.value = newValue;
			return this;
		},

		addClass: function () {
			var classNames = Array.prototype.slice.call(arguments, 0);
			for (var i = 0; i < classNames.length; i++)
				this.classList.add(classNames[i]);

			return this;
		},

		/**
		 * if multiple aguments are supplied, checks whether all of them are in the classList
		 */
		hasClass: function () {
			var classNames = Array.prototype.slice.call(arguments, 0);
			var contains = true;

			for (var i = 0; i < classNames.length; i++) {
				if (!this.classList.contains(classNames[i])) {
					contains = false;
					break;
				}
			}

			return contains;
		},

		toggleClass: function (className) {
			return this.classList.toggle(className);
		},

		/**
		 * if no aguments are supplied, clears all classes from the DOM element(s)
		 */
		removeClass: function () {
			var classNames = Array.prototype.slice.call(arguments, 0);
			if (classNames.length) {
				for (var i = 0; i < classNames.length; i++) {
					this.classList.remove(classNames[i]);
				}
			} else {
				this.className = "";
			}

			return this;
		},

		attr: function (key, value) {
			if (value === undefined && typeof key === "string")
				return this.getAttribute(key);

			var attributes = {};
			if (arguments.length === 1) {
				attributes = key;
			} else {
				attributes[key] = value;
			}

			for (var key in attributes)
				this.setAttribute(key, attributes[key]);

			return this;
		},

		removeAttr: function (key) {
			this.removeAttribute(key);
			return this;
		},

		data: function (key, value) {
			if (value === undefined && typeof key === "string")
				return (this.dataset[key] || "");

			var data = {};
			if (arguments.length === 1) {
				data = key;
			} else {
				data[key] = value;
			}

			for (var key in data)
				this.dataset[key] = data[key];

			return this;
		},

		/**
		 * if no aguments are supplied, clears all dataset from the DOM element(s)
		 */
		removeData: function () {
			var datasetKeys = Array.prototype.slice.call(arguments, 0);

			for (var key in this.dataset) {
				if (!datasetKeys.length || datasetKeys.indexOf(key) !== -1) {
					delete this.dataset[key];
				}
			}

			return this;
		},

		css: function (key, value) {
			if (value === undefined && typeof key === "string")
				return this.style[key];

			var styles = {};
			if (arguments.length === 1) {
				styles = key;
			} else {
				styles[key] = value;
			}

			for (var key in styles)
				this.style[key] = styles[key];

			return this;
		},

		__proto__: HTMLElement.prototype.__proto__
	};

	var NodeListExtendedProto = {
		each: function (fn) {
			for (var i = 0; i < this.length; i++) {
				fn.call(this[i], i);
			}
		},

		bind: function (evtType, callback) {
			for (var i = 0; i < this.length; i++)
				this[i].addEventListener(evtType, callback, false);

			return this;
		},

		empty: function () {
			for (var i = 0; i < this.length; i++) {
				this[i].empty();
			}
		},

		remove: function () {
			for (var i = 0; i < this.length; i++) {
				this[i].parentNode.removeChild(this[i]);
			}
		},

		addClass: function () {
			var classNames = Array.prototype.slice.call(arguments, 0);
			for (var i = 0; i < classNames.length; i++) {
				for (var j = 0; j < this.length; j++) {
					this[j].classList.add(classNames[i]);
				}
			}

			return this;
		},

		/**
		 * if no aguments are supplied, clears all classes from the DOM element(s)
		 */
		removeClass: function () {
			var classNames = Array.prototype.slice.call(arguments, 0);
			var i, j;

			if (classNames.length) {
				for (i = 0; i < classNames.length; i++) {
					for (j = 0; j < this.length; j++) {
						this[j].classList.remove(classNames[i]);
					}
				}
			} else {
				for (j = 0; j < this.length; j++) {
					this[j].className = "";
				}
			}

			return this;
		},

		__proto__: NodeList.prototype.__proto__
	};

	HTMLElement.prototype.__proto__ = HTMLExtendedProto;
	NodeList.prototype.__proto__ = NodeListExtendedProto;
})(window);
