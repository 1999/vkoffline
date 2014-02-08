(function () {
    "use strict";

    var LISTEN_APP_ID = "bggaejdaachpiaibkedeoadbglgdjpab";
    var AD_URL = "14300_286";
    var LEFT_MENU_ID = "l_listen_app";
    var LEFT_MENU_LAUNCH_ID = "l_listen_app_launch";
    var LEFT_MENU_COUNTER_ID = "left_listen_app_cnt";
    var DOM_PREVENT_ELEM_ID = "prevent_listen_tmp";
    var DOM_ELEM_AUDIO_RESULT_CHOICE = "tmp_audio_choice";
    var DOM_ELEM_LAUNCH = "tmp_launch_app";
    var STORAGE_KEY_PREVENT = "prevent_listen_app_ad";
    var STORAGE_KEY_PREVENT_AUDIO = "prevent_listen_app_audio";
    var STORAGE_KEY_SEEN = "prevent_listen_app_seen";
    var WIKIBOX_AD_ID = "listen_app_wikiad";
    var AUDIOBOX_AD_ID = "listen_app_audioad";
    var TIMEOUT_DEBOUNCE_MS = 500;

    var debounceTimeoutId;

    console.log("Check needs for showing menu element");

    // mutation observer
    function mutatoDebounce() {
        processPreventAudio();
        processPreventDOMItem();
        processLaunchApp();

        if (debounceTimeoutId)
            window.clearTimeout(debounceTimeoutId);

        debounceTimeoutId = window.setTimeout(mutatoInternal, TIMEOUT_DEBOUNCE_MS);
    }

    function mutatoInternal() {
        var menuSettingsItem = document.getElementById("l_set");
        if (!menuSettingsItem)
            return;

        processWikiBox();

        chrome.runtime.sendMessage(LISTEN_APP_ID, {action: "isAlive"}, function (isAlive) {
            var menuItemLeft = document.getElementById(LEFT_MENU_ID);

            if (isAlive) {
                if (menuItemLeft) {
                    menuItemLeft.parentNode.removeChild(menuItemLeft);
                }

                processAudioSearch();
                appendLaunchMenuItem();
            } else {
                var keys = {};
                keys[STORAGE_KEY_SEEN] = false;
                keys[STORAGE_KEY_PREVENT] = false;

                chrome.storage.sync.get(keys, function (records) {
                    if (records[STORAGE_KEY_PREVENT]) {
                        if (menuItemLeft) {
                            menuItemLeft.parentNode.removeChild(menuItemLeft);
                        }
                    } else {
                        appendMenuItem(!records[STORAGE_KEY_SEEN]);
                    }
                });
            }
        });
    }

    function appendMenuItem(withCnt) {
        var menuItemLeftLauncher = document.getElementById(LEFT_MENU_LAUNCH_ID);
        if (menuItemLeftLauncher) {
            menuItemLeftLauncher.parentNode.removeChild(menuItemLeftLauncher);
        }

        var menuSettingsItem = document.getElementById("l_set");
        var menuItemLeft = document.getElementById(LEFT_MENU_ID);
        var menuItemLeftCnt = document.getElementById(LEFT_MENU_COUNTER_ID);

        var counterElemHTML = withCnt ? [
            '<span class="left_count_pad" id="' + LEFT_MENU_COUNTER_ID + '">',
                '<span class="left_count_wrap fl_r">',
                    '<span class="inl_bl left_count">+1</span>',
                '</span>',
            '</span>'
        ].join("") : "";

        if (menuItemLeft) {
            if (withCnt && !menuItemLeftCnt) {
                console.log("Update menu element");
                menuItemLeft.firstChild.insertAdjacentHTML("afterbegin", counterElemHTML);
            } else if (!withCnt && menuItemLeftCnt) {
                console.log("Update menu element");
                menuItemLeftCnt.parentNode.removeChild(menuItemLeftCnt);
            }
        } else {
            console.log("Insert menu element");

            var menuElementTitle = withCnt ? "Моя Реклама" : "Приложение Listen!";

            var menuElementHTML = [
                '<li id="' + LEFT_MENU_ID + '">',
                    '<a href="/wall-' + AD_URL + '" onclick="sessionStorage.listenAd = 1; return showWiki({w: \'wall-' + AD_URL + '\'}, false, event);" class="left_row">',
                        counterElemHTML,
                        '<span class="left_label inl_bl">' + menuElementTitle + '</span>',
                    '</a>',
                '</li>'
            ].join("");

            menuSettingsItem.insertAdjacentHTML("afterend", menuElementHTML);
        }
    }

    function appendLaunchMenuItem() {
        var menuItemLeftSimple = document.getElementById(LEFT_MENU_ID);
        if (menuItemLeftSimple) {
            menuItemLeftSimple.parentNode.removeChild(menuItemLeftSimple);
        }

        var menuItemLeft = document.getElementById(LEFT_MENU_LAUNCH_ID);
        if (menuItemLeft)
            return;

        console.log("Insert launch menu element");

        var menuElementTitle = (!/^en/i.test(navigator.language)) ? "Приложение Listen!" : "Listen! app";

        var menuElementHTML = [
            '<li id="' + LEFT_MENU_LAUNCH_ID + '">',
                '<a href="/wall-' + AD_URL + '" onclick="el = document.createElement(\'span\'); el.id = \'' + DOM_ELEM_LAUNCH + '\'; document.body.appendChild(el); return false;" class="left_row">',
                    '<span class="left_label inl_bl">' + menuElementTitle + '</span>',
                '</a>',
            '</li>'
        ].join("");

        var menuSettingsItem = document.getElementById("l_set");
        menuSettingsItem.insertAdjacentHTML("afterend", menuElementHTML);
    }

    function processWikiBox() {
        var wikiBox = document.getElementById("wk_box");
        if (!wikiBox || location.href.indexOf(AD_URL) === -1)
            return;

        // wiki box was opened from adv
        if (sessionStorage.listenAd == 1) {
            console.log("Wiki box was opened via advertisement");

            var records = {};
            records[STORAGE_KEY_SEEN] = true;
            chrome.storage.sync.set(records);

            var advHTML = (!/^en/i.test(navigator.language))
                ? 'Информация о Listen! для Google Chrome показана с помощью приложения VK Offline. Если вы больше не хотите ее видеть, нажмите <a href="javascript:;" onclick="el = document.createElement(\'span\'); el.id = \'' + DOM_PREVENT_ELEM_ID + '\'; document.body.appendChild(el); ad = document.getElementById(\'' + WIKIBOX_AD_ID + '\'); ad.parentNode.removeChild(ad); return false;">здесь</a>.'
                : 'This advertisement is shown by VK Offline app for Google Chrome. If you don\'t want to see it again, click <a href="javascript:;" onclick="el = document.createElement(\'span\'); el.id = \'' + DOM_PREVENT_ELEM_ID + '\'; document.body.appendChild(el); ad = document.getElementById(\'' + WIKIBOX_AD_ID + '\'); ad.parentNode.removeChild(ad); return false;">here</a>.';

            var advBlockHTML = '<div style="border: 1px dotted; text-align: left" class="left_box" id="' + WIKIBOX_AD_ID + '" style="text-align: left">' + advHTML + '</div>';
            document.getElementById("wl_post_body").insertAdjacentHTML("beforebegin", advBlockHTML);
        }

        delete sessionStorage.listenAd;
    }

    function processPreventDOMItem() {
        var preventElem = document.getElementById(DOM_PREVENT_ELEM_ID);
        if (!preventElem)
            return;

        var records = {};
        records[STORAGE_KEY_PREVENT] = true;
        chrome.storage.sync.set(records);

        preventElem.parentNode.removeChild(preventElem);
    }

    function parseSearch() {
        var searchParts = {};
        location.search.substr(1).split("&").forEach(function (part) {
            if (!part)
                return;

            part = part.split("=", 2);
            searchParts[part[0]] = decodeURIComponent(part[1]);
        });

        var audioSearchInput = document.getElementById("s_search");
        if (audioSearchInput) {
            searchParts.q = audioSearchInput.value;
        }

        return searchParts;
    }

    function processAudioSearch() {
        if (location.pathname !== "/audio" && !/^\/audios[\d]+/.test(location.pathname))
            return;

        chrome.storage.sync.get(STORAGE_KEY_PREVENT_AUDIO, function (records) {
            var searchParts = parseSearch();
            var audioBox = document.getElementById(AUDIOBOX_AD_ID);

            if (records[STORAGE_KEY_PREVENT_AUDIO]) {
                if (audioBox) {
                    audioBox.parentNode.removeChild(audioBox);
                }

                return;
            }

            if (audioBox) {
                if (audioBox.dataset.search === JSON.stringify(searchParts))
                    return;

                audioBox.parentNode.removeChild(audioBox);
            }

            console.log("Insert audio box");

            var openPlayer = (!/^en/i.test(navigator.language)) ? "Открыть Listen!" : "Launch Listen!";
            var noThanks = (!/^en/i.test(navigator.language)) ? "Спасибо, не надо" : "No, thanks";
            var textAd;

            if (!searchParts.q) {
                textAd = (!/^en/i.test(navigator.language))
                    ? "Слушать свои песни гораздо удобнее в облачном плеере Listen! для Google Chrome. А LastFM подберет вам близких по звучанию исполнителей."
                    : "You can listen to your own music collection in Listen! app for Google Chrome. LastFM service will also find the most similar artists for you.";
            } else if (searchParts.performer == 1) {
                textAd = (!/^en/i.test(navigator.language))
                    ? "Вы можете найти самые популярные песни и список альбомов <b>" + searchParts.q + "</b> в облачном плеере Listen! для Google Chrome"
                    : "You can listen to the most popular songs and see full discography of <b>" + searchParts.q + "</b> in Listen! app for Google Chrome";
            } else {
                textAd = (!/^en/i.test(navigator.language))
                    ? "Искать музыку гораздо удобнее в облачном плеере Listen! для Google Chrome. Попробуйте поискать <b>" + searchParts.q + "</b> там и почувствуйте разницу!"
                    : "Search for <b>" + searchParts.q + "</b> is really smarter in Listen! app for Google Chrome. Check this out and feel the difference!";
            }

            var externalBoxStyle = "text-align: left; margin-bottom: 0; padding-left: 13px; padding-right: 13px;";
            var onClickActionRemoveBox = "elem = document.getElementById('" + AUDIOBOX_AD_ID + "'); elem.parentNode.removeChild(elem);";
            var onClickAction = "newNode = document.createElement('span'); newNode.id = '" + DOM_ELEM_AUDIO_RESULT_CHOICE + "'; newNode.dataset.choice = '%choice%'; document.body.appendChild(newNode);";

            var advBlockHTML = [
                '<div style="' + externalBoxStyle + '" class="left_box" id="' + AUDIOBOX_AD_ID + '">',
                    textAd,
                    '<div style="margin-top: 8px">',
                        '<div class="button_blue" style="margin-right: 8px">',
                            '<button type="button" onclick="' + onClickAction.replace("%choice%", "1") + ' return false;">' + openPlayer + '</button>',
                        '</div>',
                        '<div class="button_gray">',
                            '<button type="button" onclick="' + onClickAction.replace("%choice%", "0") + onClickActionRemoveBox + ' return false;">' + noThanks + '</button>',
                        '</div>',
                    '</div>',
                '</div>'
            ].join('');

            var searchBox = document.getElementById("audio_search");
            searchBox.insertAdjacentHTML("afterend", advBlockHTML);

            document.getElementById(AUDIOBOX_AD_ID).dataset.search = JSON.stringify(searchParts);
        });
    }

    function processPreventAudio() {
        var preventElem = document.getElementById(DOM_ELEM_AUDIO_RESULT_CHOICE);
        if (!preventElem)
            return;

        var searchParts = parseSearch();
        var launchListen = (preventElem.dataset.choice == 1);
        var msgData;

        if (launchListen) {
            if (!searchParts.q) {
                msgData = {action: "getCurrent"};
            } else if (searchParts.performer == 1) {
                msgData = {action: "searchArtist", q: searchParts.q};
            } else {
                msgData = {action: "searchSongs", q: searchParts.q};
            }

            chrome.runtime.sendMessage(LISTEN_APP_ID, msgData);
        } else {
            var records = {};
            records[STORAGE_KEY_PREVENT_AUDIO] = true;
            chrome.storage.sync.set(records);
        }

        preventElem.parentNode.removeChild(preventElem);
    }

    function processLaunchApp() {
        var tmpElem = document.getElementById(DOM_ELEM_LAUNCH);
        if (!tmpElem)
            return;

        chrome.runtime.sendMessage(LISTEN_APP_ID, {action: "getCurrent"});
        tmpElem.parentNode.removeChild(tmpElem);
    }

    var observer = new (window.MutationObserver || window.WebKitMutationObserver)(mutatoDebounce);

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    // run on page load
    mutatoDebounce();
})();
