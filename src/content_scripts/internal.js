(function () {
    "use strict";

    var CONTEST_URL = "14300_27";
    var L_MENU_ID = "l_listen_contest";

    // notification shown -> stop
    // no show after -> like notification shown
    // is liked -> like notification shown
    // dont show counter if shown once
    // clear alarms on update

    var observer = new (window.MutationObserver || window.WebKitMutationObserver)(function (mutations) {
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
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
})();
