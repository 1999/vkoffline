'use strict';

import {appName, appVersion} from '../ui/js/remote';

export default {
    CHROME_WEBSTORE_ID: 'jinklgkideaicpdgmomlckebafjfibjk', /* ID приложения в CWS */
    ERROR_EMAIL: 'vkoffline@staypositive.ru',
    INIT_TAGS: ['inbox', 'sent', 'attachments', 'important', 'trash', 'outbox', 'drafts'], // изначальные тэги для сообщений
    GOODBYE_PAGE_URL: 'http://staypositive.ru/goodbye-vkofflineapp.html',
    LISTENAPP_ID: 'bggaejdaachpiaibkedeoadbglgdjpab',
    LAUNCHER_EXTENSION_ID: 'kokdpdbdcbjlehlgbkaoandedpmjodfh',

    GOOGLE_ANALYTICS_CPA_ID: 'vkoffline_chrome_app',
    GOOGLE_ANALYTICS_CPA_COUNTER: 'UA-20919085-11',

    NAME: appName,
    ID: 'jinklgkideaicpdgmomlckebafjfibjk', // TODO remove
    VERSION: appVersion,

    VK_ADV_GROUP: [29809053, 672], // [ID группы, ignorePostsBeforeId]
    VK_ID: 2438161, /* ID приложения ВКонтакте */
    VK_APP_SCOPE: ['friends', 'messages', 'offline', 'photos', 'audio', 'video', 'docs', 'wall', 'groups'], // OAuth-scope для приложения ВКонтакте

    FRIENDS_UPDATE_TIMEOUT: 86400 // промежуток между обновлениями списка друзей в секундах
};
