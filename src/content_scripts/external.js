
(function () {
    "use strict";

    var CONTEST_URL = "14300_27";
    var L_MENU_ID = "l_listen_contest";
    var l_MENU_COUNTER_ID = "left_listen_contest_counter";
    var WIKIBOX_AD_ID = "listen_contest_wikiad";
    var PREVENT_AD_ID = "preventAd";
    var showCode = 0;

    console.log("Check needs for showing menu element");
    chrome.runtime.sendMessage({action: "listenContestNeedsMenu"}, function (resCode) {
        console.log("Res code is " + resCode);
        showCode = resCode;

        if (resCode === 0)
            return;

        var observer = new (window.MutationObserver || window.WebKitMutationObserver)(mutationListener);

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    });

    window.setInterval(function () {
        console.log("Re-check needs for showing menu element");

        chrome.runtime.sendMessage({action: "listenContestNeedsMenu"}, function (resCode) {
            console.log("Res code is " + resCode);

            showCode = resCode;
            mutationListener();
        });
    }, 60000);

    function mutationListener() {
        var isAuthorized = (document.getElementById("myprofile") !== null);
        if (!isAuthorized) {
            console.log("Not authorized");
            return;
        }

        var preventAd = document.getElementById(PREVENT_AD_ID);
        if (preventAd) {
            chrome.runtime.sendMessage({action: "listenContestPreventAds"});
            showCode = 0;

            var menuElem = document.getElementById(L_MENU_ID);
            if (menuElem) {
                console.log("Remove menu advertisement element");
                menuElem.parentNode.removeChild(menuElem);
            }

            var wikiAd = document.getElementById(WIKIBOX_AD_ID);
            if (wikiAd) {
                wikiAd.parentNode.removeChild(wikiAd);
            }

            preventAd.parentNode.removeChild(preventAd);
            return;
        }

        var menuSettingsItem = document.getElementById("l_set");
        var menuElem = document.getElementById(L_MENU_ID);
        var isMenuElementInserted = (menuElem !== null);

        if (showCode === 0) {
            if (isMenuElementInserted) {
                console.log("Hide element");
                menuElem.parentNode.removeChild(menuElem);
            }

            return;
        }

        if (!isMenuElementInserted) {
            console.log("Insert menu element");

            var counterElemHTML = (showCode === 2) ? [
                '<span class="left_count_pad" id="' + l_MENU_COUNTER_ID + '">',
                    '<span class="left_count_wrap fl_r">',
                        '<span class="inl_bl left_count">+1</span>',
                    '</span>',
                '</span>'
            ].join("") : "";

            var menuElementHTML = [
                '<li id="' + L_MENU_ID + '">',
                    '<a href="/wall-14300_27" onclick="sessionStorage.listenContest = 1; return showWiki({w: \'wall-14300_27\'}, false, event);" class="left_row">',
                        counterElemHTML,
                        '<span class="left_label inl_bl">Конкурс Listen!</span>',
                    '</a>',
                '</li>'
            ].join("");

            menuSettingsItem.insertAdjacentHTML("afterend", menuElementHTML);
            chrome.runtime.sendMessage({action: "listenContestAdvShow"});
        }

        var wikiBox = document.getElementById("wk_box");
        if (!wikiBox || location.href.indexOf(CONTEST_URL) === -1)
            return;

        // wiki box was opened from adv
        if (sessionStorage.listenContest == 1) {
            console.log("Wiki box was opened via advertisement");
            chrome.runtime.sendMessage({action: "listenContestAdvClick"});

            var advHTML = (!/^en/i.test(navigator.language))
                ? 'Информация о конкурсе показана с помощью приложения VK Offline для Google Chrome. Если вы больше не хотите ее видеть, нажмите <a href="javascript:;" onclick="el = document.createElement(\'span\'); el.id = \'' + PREVENT_AD_ID + '\'; document.body.appendChild(el); return false;">здесь</a>.'
                : 'Contest advertisement is shown by VK Offline app for Google Chrome. If you don\'t want to see it again, click <a href="javascript:;" onclick="el = document.createElement(\'span\'); el.id = \'' + PREVENT_AD_ID + '\'; document.body.appendChild(el); return false;">here</a>.';

            var advBlockHTML = '<div class="left_box" id="' + WIKIBOX_AD_ID + '" style="text-align: left">' + advHTML + '</div>';
            document.getElementById("wl_post_body").insertAdjacentHTML("beforebegin", advBlockHTML);

            var counterElem = document.getElementById(l_MENU_COUNTER_ID);
            if (counterElem) {
                counterElem.parentNode.removeChild(counterElem);
            }

            chrome.runtime.sendMessage({action: "listenContestPreventShowCounter"});
        }

        delete sessionStorage.listenContest;
    }
})();
