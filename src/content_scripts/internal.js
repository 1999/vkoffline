(function () {
    "use strict";

    var CONTEST_URL = "14300_27";
    var EXTENSION_ID = "kpdalhfolccbjbaohmiajkmhobdjkice";
    var L_MENU_ID = "l_listen_contest";
    var l_MENU_COUNTER_ID = "left_listen_contest_cunter";
    var showCode = 0;

    chrome.runtime.sendMessage(EXTENSION_ID, {action: "listenContestNeedsMenu"}, function (resCode) {
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
        chrome.runtime.sendMessage(EXTENSION_ID, {action: "listenContestNeedsMenu"}, function (resCode) {
            showCode = resCode;
            mutationListener;
        });
    }, 60000);

    function mutationListener() {
        var isAuthorized = (document.getElementById("myprofile") !== null);
        if (!isAuthorized)
            return;

        var menuSettingsItem = document.getElementById("l_set");
        var menuElem = document.getElementById(L_MENU_ID);
        var isMenuElementInserted = (menuElem !== null);

        if (showCode === 0) {
            menuElem.parentNode.removeChild(menuElem);
            return;
        }

        if (!isMenuElementInserted) {
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
        }

        var wikiBox = document.getElementById("wk_box");
        if (!wikiBox || location.href.indexOf(CONTEST_URL) === -1)
            return;

        // wiki box was opened from adv
        if (sessionStorage.listenContest == 1) {
            var advBlockHTML = '<div class="group_block_module">Информация о конкурсе показана с помощью приложения VK Offline для Google Chrome. Если вы больше не хотите ее видеть, нажмите <a href="javascript:;" onclick="return false">здесь</a>.</div>';
            document.getElementById("wl_post_body").insertAdjacentHTML("beforebegin", advBlockHTML);

            var counterElem = document.getElementById(l_MENU_COUNTER_ID);
            if (counterElem) {
                counterElem.parentNode.removeChild(counterElem);
            }

            chrome.runtime.sendMessage(EXTENSION_ID, {action: "listenContestPreventShowCounter"});
        }

        delete sessionStorage.listenContest;
    }
})();
