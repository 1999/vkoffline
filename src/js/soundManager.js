/* ==========================================================
 * Sound Manager (VK Offline Chrome app)
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

var SoundManager = new (function() {
	var buffers = {},
		available = ["message", "error", "clear", "sent"],
		context, fallback;

	try {
		context = new (webkitAudioContext || AudioContext)();
	} catch (e) {
		// for instance this is unavailable in chromium13/mac
	}

	fallback = function(type) {
		buffers[type] = new Audio();
		buffers[type].src = App.resolveURL("sound/" + type + ".mp3");
	};
	
	// создаем буферы звуков
	available.forEach(function (type) {
		if (!context)
			return fallback(type);

		var xhr = new XMLHttpRequest();
		xhr.open("GET", App.resolveURL("sound/" + type + ".mp3"), true);
		xhr.responseType = "arraybuffer";

		xhr.addEventListener("load", function () {
			context.decodeAudioData(xhr.response, function (buffer) {
				buffers[type] = buffer;
		    }, function () {
		    	fallback(type);
		    });
		}, false);

		xhr.addEventListener("error", function () {
			fallback(type);
		}, false);

		xhr.send();
	});

	this.play = function (type, volume) {
		var source, gainNode;

		if (available.indexOf(type) === -1)
			throw new Error("No such sound available: " + type);

		// буферы еще не загружены
		if (!buffers[type])
			return;

		if (volume === 0)
			return;

		volume = volume || SettingsManager.SoundLevel;

		if (buffers[type] instanceof HTMLAudioElement) {
			buffers[type].volume = volume;
			buffers[type].play();
		} else {
			gainNode = context.createGainNode();
			gainNode.gain.value = volume;

			source = context.createBufferSource();
			source.buffer = buffers[type];
			source.connect(gainNode);
			gainNode.connect(context.destination);
			
			source.noteOn(0);
		}
	};
});
