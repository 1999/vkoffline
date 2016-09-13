'use strict';

import chrome from './chrome';

const buffers = new Map;
const availableSounds = ['message', 'error', 'clear', 'sent'];

export default (function () {
    var context = new AudioContext;

    // создаем буферы звуков
    availableSounds.forEach(function (type) {
        const url = chrome.runtime.getURL(`sound/${type}.mp3`);
        var xhr = new XMLHttpRequest;
        xhr.open('GET', url, true);
        xhr.responseType = 'arraybuffer';

        xhr.addEventListener('load', function () {
            context.decodeAudioData(xhr.response, function (buffer) {
                buffers.set(type, buffer);
            }, function () {});
        }, false);

        xhr.send();
    });

    return {
        play: function SoundManager_play(type, volume) {
            if (availableSounds.indexOf(type) === -1) {
                throw new Error('No such sound available: ' + type);
            }

            // буферы еще не загружены
            if (!buffers.has(type)) {
                return;
            }

            if (volume === 0) {
                return;
            }

            volume = volume || SettingsManager.SoundLevel;

            var gainNode = context.createGain();
            gainNode.gain.value = volume;

            var source = context.createBufferSource();
            source.buffer = buffers.get(type);

            source.connect(gainNode);
            gainNode.connect(context.destination);

            source.start(0);
        }
    };
})();
