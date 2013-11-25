(function () {
    "use strict";

    var CONTEST_URL = "14300_27";
    var L_MENU_ID = "l_listen_contest";
    var MUTATION_LISTENER_TIMEOUT = 500;

    var mutationThrottlerId;


    chrome.runtime.sendMessage({action: "needsListenContestMenu"}, function (resCode) {
        if (resCode === 0)
            return;

        var observer = new (window.MutationObserver || window.WebKitMutationObserver)(function () {
            if (mutationThrottlerId) {
                window.clearTimeout(mutationThrottlerId)
            }

            mutationThrottlerId = window.setTimeout(mutationListener, MUTATION_LISTENER_TIMEOUT);
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });


    });

    // is liked -> like notification shown
    // dont show counter if shown once

    function mutationListener() {
        var isAuthorized = (document.getElementById("myprofile") !== null);
        if (!isAuthorized)
            return;

        var menuSettingsItem = document.getElementById("l_set");
        var isMenuElementInserted = (document.getElementById(L_MENU_ID) !== null);

        if (!isMenuElementInserted) {
            var menuElementHTML = [
                '<li id="' + L_MENU_ID + '">',
                    '<a href="/wall-14300_27" onclick="sessionStorage.listenContest = 1; return showWiki({w: \'wall-14300_27\'}, false, event);" class="left_row">',
                        '<span class="left_count_pad">',
                            '<span class="left_count_wrap fl_r">',
                                '<span class="inl_bl left_count">+1</span>',
                            '</span>',
                        '</span>',
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
            var advBlockHTML = '<div class="group_block_module">Информация о конкурсе показана с помощью приложения VK Offline для Google Chrome. Если вы больше не хотите ее видеть, нажмите <abbr>здесь</abbr>.</div>';
            document.getElementById("wl_post_body").insertAdjacentHTML("beforebegin", advBlockHTML);
        }

        delete sessionStorage.listenContest;
    }
})();
