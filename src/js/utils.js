/* ==========================================================
 * App utils (VK Offline Chrome app)
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
var Utils = {
	async: {
		/**
		 * Параллельное выполнение задач
		 * @param {Object|Array} tasks пул задач в виде массива или объекта, где каждый элемент - это {Function}, которая принимает:
		 *      * @param {Function} callback
		 *
		 * @param {Number} concurrency количество одновременно выполняемых операций (необязат.)
		 * @param {Function} callback принимает:
		 *      * @param {String|Null} err
		 *      * @param {Object|Array} results
		 *
		 * @link https://npmjs.org/package/async#parallel
		 */
		parallel: function async_parallel(tasks, concurrency, callback) {
			if (arguments.length === 2) {
				callback = concurrency;
				concurrency = 0;
			}

			var isNamedQueue = !Array.isArray(tasks);
			var tasksKeys = isNamedQueue ? Object.keys(tasks) : new Array(tasks.length);
			var resultsData = isNamedQueue ? {} : [];

			if (!tasksKeys.length)
				return callback(null, resultsData);

			var tasksProcessedNum = 0;
			var tasksBeingProcessed = 0;
			var tasksTotalNum = tasksKeys.length;

			(function processTasks() {
				if (!tasksKeys.length || (concurrency && concurrency <= tasksBeingProcessed))
					return;

				var taskIndex = tasksKeys.pop() || tasksKeys.length;
				tasksBeingProcessed += 1;

				tasks[taskIndex](function (err, data) {
					tasksBeingProcessed -= 1;

					if (err) {
						var originalCallback = callback;
						callback = function () { return true };

						return originalCallback(err);
					}

					resultsData[taskIndex] = data;
					tasksProcessedNum += 1;

					if (tasksProcessedNum === tasksTotalNum)
						return callback(null, resultsData);

					processTasks();
				});

				processTasks();
			})();
		},

		/**
		 * Последовательное выполнение задач
		 * @param {Object|Array} tasks пул задач в виде массива или объекта, где каждый элемент - это {Function}, которая принимает:
		 *      * @param {Function} callback
		 *
		 * @param {Function} callback принимает:
		 *      * @param {String|Null} err
		 *      * @param {Object|Array} results
		 *
		 * @link https://npmjs.org/package/async#series
		 */
		series: function async_series(tasks, callback) {
			var isNamedQueue = !Array.isArray(tasks);
			var tasksKeys = isNamedQueue ? Object.keys(tasks) : new Array(tasks.length);
			var resultsData = isNamedQueue ? {} : [];

			if (!tasksKeys.length)
				return callback(null, resultsData);

			(function processTasks(numTasksProcessed) {
				if (numTasksProcessed === tasksKeys.length)
					return callback(null, resultsData);

				var taskIndex = isNamedQueue ? tasksKeys[numTasksProcessed] : numTasksProcessed;
				tasks[taskIndex](function (err, data) {
					if (err)
						return callback(err);

					resultsData[taskIndex] = data;
					processTasks(++numTasksProcessed);
				});
			})(0);
		},

		/**
		 * Последовательное выполнение задач с сохранением промежуточных данных между задачами
		 * @param {Object|Array} tasks пул задач в виде массива или объекта, где каждый элемент - это {Function}, которая принимает:
		 *      * @param {Function} callback
		 *
		 * @param {Function} callback принимает:
		 *      * @param {String|Null} err
		 *      * @param {Object|Array} results
		 *
		 * @link https://npmjs.org/package/async#waterfall
		 */
		waterfall: function async_waterfall(tasks, callback) {
			var isNamedQueue = !Array.isArray(tasks);
			var tasksKeys = isNamedQueue ? Object.keys(tasks) : new Array(tasks.length);

			if (!tasksKeys.length)
				return callback();

			tasksKeys.reverse();
			if (!isNamedQueue)
				tasks.reverse();

			(function processTasks() {
				var addArgs = Array.prototype.slice.call(arguments, 0);

				if (!tasksKeys.length)
					return callback.apply(null, [null].concat(addArgs));

				var taskIndex = tasksKeys.pop() || tasksKeys.length;
				var internalCallback = function (err) {
					if (err)
						return callback(err);

					processTasks.apply(null, Array.prototype.slice.call(arguments, 1));
				};

				tasks[taskIndex].apply(null, addArgs.concat(internalCallback));
			})();
		},

		/**
		 * Более эффективный в некоторых случаях setTimeout(callback, 0)
		 * @param {Function} callback
		 * @param {Object} ctx контект выполнения callback
		 * @link https://developer.mozilla.org/en-US/docs/XPCOM_Interface_Reference/nsIThread#processNextEvent()
		 */
		nextTick: function async_nextTick(callback, ctx) {
			if (ctx)
				callback = callback.bind(ctx);

			setTimeout(callback, 0);
		}
	},

	string: {
		plural: function (number, pluralForms) {
			var uiLocale = chrome.i18n.getMessage('@@ui_locale');
			if (uiLocale.indexOf('en') !== -1) {
				return (number === 1)
					? pluralForms[0]
					: pluralForms[1];
			}

			if (number%10 == 1 && number%100 != 11) {
				return pluralForms[0];
			}

			if (number%10>=2 && number%10<=4 && (number%100<10 || number%100>=20)) {
				return pluralForms[1];
			}

			return pluralForms[2];
		},

		humanDate: function (ts) {
			var now = Date.now()/1000,
				diff = now - ts,
				tsDate = new Date(ts*1000),
				hours = tsDate.getHours(),
				minutes = tsDate.getMinutes(),
				monthes = chrome.i18n.getMessage('monthesCut').split('|');

			if (diff < 60)
				return chrome.i18n.getMessage('justNow');

			if (diff < 60*60) {
				diff = Math.floor(diff/60);
				return diff + ' ' + Utils.string.plural(diff, chrome.i18n.getMessage('minutesAgo').split('|')) + ' ' + chrome.i18n.getMessage('ago');
			}

			if (diff < 24*60*60) {
				diff = Math.floor(diff/60/60);
				return diff + ' ' + Utils.string.plural(diff, chrome.i18n.getMessage('hoursAgo').split('|')) + ' ' + chrome.i18n.getMessage('ago');
			}

			return (diff < 3*24*60*60)
				? tsDate.getDate() + ' ' + monthes[tsDate.getMonth()] + ' ' + tsDate.getFullYear() + ' ' + chrome.i18n.getMessage('dayAndTimeSeparator') + ' ' + ((hours < 10) ? '0' + hours : hours) + ':' + ((minutes < 10) ? '0' + minutes : minutes)
				: tsDate.getDate() + ' ' + monthes[tsDate.getMonth()] + ' ' + tsDate.getFullYear();
		},

		humanFileSize: function (size) {
			if (size < 1024)
				return '1 ' + chrome.i18n.getMessage('kb');

			if (size < 1024*1024)
				return Math.round(size/1024) + ' ' + chrome.i18n.getMessage('kb');

			return Math.round(size/1024/1024) + ' ' + chrome.i18n.getMessage('mb');
		},

		replaceLinks: function (str) {
			return str.replace(/(https?:\/\/([^\/|\s|<]+)([^\s|<]+)?)/ig, '<a target="_blank" href="$1">$2</a>');
		},

		emoji: function (str, replaceWithImages) {
			var output = "";
			var baseImgPath = "http://vk.com/images/emoji/";

			// http://vk.com/dev/emoji
			var vkSymbols = ["D83DDE0A","D83DDE03","D83DDE09","D83DDE06","D83DDE1C","D83DDE0B","D83DDE0D","D83DDE0E","D83DDE12","D83DDE0F","D83DDE14","D83DDE22","D83DDE2D","D83DDE29","D83DDE28","D83DDE10","D83DDE0C","D83DDE20","D83DDE21","D83DDE07","D83DDE30","D83DDE32","D83DDE33","D83DDE37","D83DDE1A","D83DDE08","2764","D83DDC4D","D83DDC4E","261D","270C","D83DDC4C","26BD","26C5","D83CDF1F","D83CDF4C","D83CDF7A","D83CDF7B","D83CDF39","D83CDF45","D83CDF52","D83CDF81","D83CDF82","D83CDF84","D83CDFC1","D83CDFC6","D83DDC0E","D83DDC0F","D83DDC1C","D83DDC2B","D83DDC2E","D83DDC03","D83DDC3B","D83DDC3C","D83DDC05","D83DDC13","D83DDC18","D83DDC94","D83DDCAD","D83DDC36","D83DDC31","D83DDC37","D83DDC11","23F3","26BE","26C4","2600","D83CDF3A","D83CDF3B","D83CDF3C","D83CDF3D","D83CDF4A","D83CDF4B","D83CDF4D","D83CDF4E","D83CDF4F","D83CDF6D","D83CDF37","D83CDF38","D83CDF46","D83CDF49","D83CDF50","D83CDF51","D83CDF53","D83CDF54","D83CDF55","D83CDF56","D83CDF57","D83CDF69","D83CDF83","D83CDFAA","D83CDFB1","D83CDFB2","D83CDFB7","D83CDFB8","D83CDFBE","D83CDFC0","D83CDFE6","D83DDC00","D83DDC0C","D83DDC1B","D83DDC1D","D83DDC1F","D83DDC2A","D83DDC2C","D83DDC2D","D83DDC3A","D83DDC3D","D83DDC2F","D83DDC5C","D83DDC7B","D83DDC14","D83DDC23","D83DDC24","D83DDC40","D83DDC42","D83DDC43","D83DDC46","D83DDC47","D83DDC48","D83DDC51","D83DDC60","D83DDCA1","D83DDCA3","D83DDCAA","D83DDCAC","D83DDD14","D83DDD25"];
			var stopCharCode = "d83d";

			var charCode;
			var codesArray = [];

			for (var i = 0; i < str.length; i++) {
				charCode = str.charCodeAt(i).toString(16);
				if (charCode === stopCharCode) {
					codesArray.push(stopCharCode);
					continue;
				}

				if (codesArray.length) {
					codesArray.push(charCode);
					charCode = codesArray.join("").toUpperCase();
				} else {
					charCode = charCode.toUpperCase();
				}

				if (vkSymbols.indexOf(charCode) !== -1) {
					output += replaceWithImages ? " <img is='external-image' class='emoji' src='" + baseImgPath + charCode + ".png' width='16' height='16' alt=''/> " : " ";
				} else {
					output += str[i];
				}

				codesArray.length = 0;
			}

			return output;
		},

		ucfirst: function (str) {
			return str.charAt(0).toUpperCase() + str.substr(1);
		}
	},

	misc: {
		searchBiggestImage: function (photoInfo) {
			var photoUrls = [];
			for (var prop in photoInfo) {
				if (photoInfo.hasOwnProperty(prop) && /^src_x*big$/.test(prop)) {
					photoUrls.push(prop);
				}
			}

			photoUrls.sort(function (a, b) {
				return b.length - a.length;
			});

			return photoInfo[photoUrls[0]];
		},

		drawCanvasImageCentered: function (ctx2d, dataImage, imgWidth, imgHeight) {
			var canvas = ctx2d.canvas;
			var ratioDst = canvas.width / canvas.height;
			var ratioSrc = imgWidth / imgHeight;
			var dstX, dstY, dstW, dstH, srcX, srcY, srcH, srcW, collapseLevel;

			if (imgWidth <= canvas.width && imgHeight <= canvas.height) {
				dstX = Math.round( (canvas.width - imgWidth) / 2);
				dstY = Math.round( (canvas.height - imgHeight) / 2);

				ctx2d.drawImage(dataImage, 0, 0, imgWidth, imgHeight, dstX, dstY, imgWidth, imgHeight);
			} else {
				if (ratioSrc > ratioDst) {
					srcY = 0;
					srcH = imgHeight;
					dstX = 0;
					dstW = canvas.width;

					if (imgHeight > canvas.height) {
						collapseLevel = imgHeight / canvas.height;

						srcW = canvas.width * collapseLevel;
						srcX = Math.round( ( (imgWidth/collapseLevel - canvas.width) / 2) * collapseLevel);

						dstY = 0;
						dstH = canvas.height;
					} else {
						srcW = canvas.width;
						srcX = Math.round( (imgWidth - canvas.width) / 2);

						dstY = Math.round( (canvas.height - imgHeight) / 2);
						dstH = imgHeight;
					}
				} else {
					srcX = 0;
					srcW = imgWidth;
					dstY = 0;
					dstH = canvas.height;

					if (imgWidth > canvas.width) {
						collapseLevel = imgWidth / canvas.width;

						srcH = canvas.height * collapseLevel;
						srcY = Math.round( ( (imgHeight/collapseLevel - canvas.height) / 2) * collapseLevel);

						dstX = 0;
						dstW = canvas.width;
					} else {
						srcH = canvas.height;
						srcY = Math.round( (imgHeight - canvas.height) / 2);

						dstX = Math.round( (canvas.width - imgWidth) / 2);
						dstW = imgWidth;
					}
				}

				ctx2d.drawImage(dataImage, srcX, srcY, srcW, srcH, dstX, dstY, dstW, dstH);
			}
		}
	}
};

(function (exports) {
	"use strict";

	var BLANK_TRANSPARENT_IMG = "data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==";

	function fetchImage(url) {
		return new Promise(function (resolve, reject) {
			var xhr = new XMLHttpRequest;
			xhr.open("GET", url, true);
			xhr.responseType = "blob";

			xhr.addEventListener("load", function () {
				resolve(this.response);
			}, false);

			xhr.addEventListener("error", function () {
				reject();
			}, false);

			xhr.send();
		});
	}

	function requestFileSystem() {
		return new Promise(function (resolve, reject) {
			(window.webkitRequestFileSystem || window.requestFileSystem)(window.PERSISTENT, 0, resolve, reject);
		});
	}

	/**
	 * Get contact photo stored inside local filesystem
	 * @param {Number} uid
	 * @return {Promise}
	 */
	function getContactStoredPhoto(uid) {
		return new Promise(function (resolve, reject) {
			requestFileSystem().then(function (fsLink) {
				fsLink.root.getFile(uid + "_th.jpg", {create: false}, function (fileEntry) {
					// check if file was created more than 1d ago
					fileEntry.file(function (fileBlob) {
						var dayBeforeNow = new Date;
						dayBeforeNow.setDate(dayBeforeNow.getDate() - 1);

						if (fileBlob.lastModifiedDate > dayBeforeNow) {
							resolve(fileEntry);
						} else {
							reject();
						}
					}, reject);

					resolve(fileEntry);
				}, reject);
			}, reject);
		});
	}

	function processExternalImage() {
		var that = this;
		var imageSource = this.getAttribute("src") || "";

		if (!imageSource) {
			return;
		}

		this.setAttribute("src", BLANK_TRANSPARENT_IMG);
		this.dataset.originalSrc = imageSource;
		this.classList.add("loading");

		// download image
		fetchImage(imageSource).then(function (blob) {
			var uri = URL.createObjectURL(blob);
			that.setAttribute("src", uri);

			that.classList.remove("loading");
		});
	}

	function getAvatarImage(imageSource, uid) {
		return new Promise(function (resolve, reject) {
			getContactStoredPhoto(uid).then(function (fileEntry) {
				resolve(fileEntry.toURL());
			}, function () {
				if (imageSource.indexOf("http") !== 0) {
					resolve(imageSource);
					return;
				}

				Promise.all([
					fetchImage(imageSource),
					requestFileSystem()
				]).then(function (res) {
					var blob = res[0];
					var fsLink = res[1];

					fsLink.root.getFile(uid + "_th.jpg", {create: true}, function (fileEntry) {
						fileEntry.createWriter(function (fileWriter) {
							fileWriter.onwriteend = function () {
								resolve(fileEntry.toURL());
							}

							fileWriter.onerror = reject;
							fileWriter.write(blob);
						});
					});
				}, reject);
			});
		});
	}

	/**
	 * Get downloaded or download avatar image
	 *
	 * @param {String} imageSource
	 * @param {Number} uid
	 * @return {Promise} which resolves with downloaded URL (filesystem: or blob:)
	 */
	exports.getAvatarImage = getAvatarImage;

	exports.uuid = function uuid() {
		return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
			var r = Math.random() * 16 | 0;
			var v = (c == "x") ? r : (r&0x3|0x8);

			return v.toString(16);
		});
	};

	exports.openInNewWindow = function openInNewWindow(url) {
		chrome.app.window.create(url, {
			id: uuid(),
			innerBounds: {
				minWidth: 1000,
				maxHeight: 50
			}
		});
	};

	/**
	 * Notify app windows about smth
	 */
	exports.notifySelf = function notifySelf(data) {
		chrome.runtime.sendMessage(data);
	};

	/**
	 * Get data from background page
	 * @param {Mixed} data
	 * @return {Promise}
	 */
	exports.requestBackground = function requestBackground(data) {
		return new Promise(function (resolve) {
			chrome.runtime.sendMessage(data, resolve);
		});
	};

	/**
	 * Custom <img is="external-image"> container for loading external images
	 */
	document.registerElement("external-image", {
		extends: "img",
		prototype: _.create(HTMLImageElement.prototype, {
			createdCallback: processExternalImage,

			attributeChangedCallback: function (attrName, oldVal, newVal) {
				if (attrName !== "src") {
					return;
				}

				if (newVal.indexOf("http") !== 0) {
					return;
				}

				processExternalImage.call(this);
			},

			detachedCallback: function () {
				var imageSource = this.getAttribute("src");
				if (imageSource.indexOf("blob:") === 0) {
					URL.revokeObjectURL(imageSource);
				}
			}
		})
	});

	/**
	 * Custom <img is="avatar-image"> container for loading and saving avatars
	 */
	document.registerElement("avatar-image", {
		extends: "img",
		prototype: _.create(HTMLImageElement.prototype, {
			createdCallback: function () {
				var that = this;
				var imageSource = this.getAttribute("src");
				var uid = Number(this.dataset.uid);

				this.setAttribute("src", BLANK_TRANSPARENT_IMG);
				this.dataset.originalSrc = imageSource;
				this.classList.add("loading");

				getAvatarImage(imageSource, uid).then(function (uri) {
					that.classList.remove("loading");
					that.setAttribute("src", uri);
				}, function () {
					that.classList.remove("loading");
					that.setAttribute("src", chrome.runtime.getURL("pic/question_th.gif"));
				});
			}
		})
	});
})(window);
