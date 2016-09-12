'use strict';

import chrome from './chrome';

export default (function () {
    var buffers = {};
    var availableSounds = ["message", "error", "clear", "sent"];
    var context;

    try {
        context = new (AudioContext || webkitAudioContext)();
    } catch (e) {
        // for instance this is unavailable in chromium13/mac
    }

    function fallback(type) {
        buffers[type] = new Audio();
        buffers[type].src = chrome.runtime.getURL("sound/" + type + ".mp3");
    }

    // создаем буферы звуков
    availableSounds.forEach(function (type) {
        if (!context) {
            return fallback(type);
        }

        var xhr = new XMLHttpRequest;
        xhr.open("GET", chrome.runtime.getURL("sound/" + type + ".mp3"), true);
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

    return {
        play: function SoundManager_play(type, volume) {
            if (availableSounds.indexOf(type) === -1) {
                throw new Error("No such sound available: " + type);
            }

            // буферы еще не загружены
            if (!buffers[type]) {
                return;
            }

            if (volume === 0) {
                return;
            }

            volume = volume || SettingsManager.SoundLevel;

            if (buffers[type] instanceof HTMLAudioElement) {
                buffers[type].volume = volume;
                buffers[type].play();
            } else {
                var gainNode = context.createGain();
                gainNode.gain.value = volume;

                var source = context.createBufferSource();
                source.buffer = buffers[type];

                source.connect(gainNode);
                gainNode.connect(context.destination);

                source.start(0);
            }
        }
    };
})();
