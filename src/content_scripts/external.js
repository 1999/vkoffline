
(function () {
    "use strict";

    var LISTEN_APP_ID = "nhpdcfndackfenecoefcmphfjhdnaedi";
    var AD_URL = "14300_286";
    var LEFT_MENU_ID = "l_listen_app";
    var LEFT_MENU_COUNTER_ID = "left_listen_app_cnt";
    var DOM_PREVENT_ELEM_ID = "prevent_listen_tmp";
    var STORAGE_KEY_PREVENT = "prevent_listen_app_ad";
    var STORAGE_KEY_SEEN = "prevent_listen_app_seen";
    var WIKIBOX_AD_ID = "listen_app_wikiad";
    var TIMEOUT_DEBOUNCE_MS = 500;

    var debounceTimeoutId;

    console.log("Check needs for showing menu element");

    // mutation observer
    function mutatoDebounce() {
        if (debounceTimeoutId)
            window.clearTimeout(debounceTimeoutId);

        debounceTimeoutId = window.setTimeout(mutatoInternal, TIMEOUT_DEBOUNCE_MS);
    }

    function mutatoInternal() {
        var menuSettingsItem = document.getElementById("l_set");
        if (!menuSettingsItem)
            return;

        processWikiBox();
        processPreventDOMItem();

        chrome.runtime.sendMessage(LISTEN_APP_ID, {action: "isAlive"}, function (isAlive) {
            var menuItemLeft = document.getElementById(LEFT_MENU_ID);

            if (isAlive) {
                if (menuItemLeft) {
                    menuItemLeft.parentNode.removeChild(menuItemLeft);
                }

                // в зависимости от URL показать ad
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
        console.log("Insert menu element");

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
                menuItemLeft.firstChild.insertAdjacentHTML("afterbegin", counterElemHTML);
            } else if (!withCnt && menuItemLeftCnt) {
                menuItemLeftCnt.parentNode.removeChild(menuItemLeftCnt);
            }
        } else {
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

    var observer = new (window.MutationObserver || window.WebKitMutationObserver)(mutatoDebounce);

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    // run on page load
    mutatoDebounce();
})();
