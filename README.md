## Что это?
**VK Offline** - это legacy packaged app для браузеров, работающих на базе Chromium (Google Chrome, Яндекс.Браузер, Chromium ит.д.). VK Offline можно установить из [Chrome Web Store](https://chrome.google.com/webstore/detail/vkontakte-offline/jinklgkideaicpdgmomlckebafjfibjk) или со [страницы разработчика](http://staypositive.ru/vkofflineapp-promo).

## Как начать разрабатывать
```bash
$ git clone git@github.com:1999/vkoffline.git
$ npm install
$ ./node_modules/.bin/grunt
```

## Как собрать релизную сборку
`grunt i18n templates release`

## FAQ
 * **Как мне добавить локализацию?**
Откройте issue в [багтрекере](https://github.com/1999/vkoffline/issues?sort=created&state=open), после чего форкните репозиторий, внесите фикс в файл i18n/locales.json и пришлите pull-запрос.
 * **Это приложение позволяет сидеть ВКонтакте в режиме offline?**
К сожалению нет. VK Offline - это e-mail клиент и адресная книга на основе данных ваших профилей ВКонтакте. Также приложение предоставляет доступ к вашим контактам и переписке при отсутствии интернета.
 * **Время отстает на час**
Вам следует установить обновления для вашей ОС Windows, поскольку некоторое время назад переход на летнее/зимнее время был отменен, и это отразилось на работе Windows.
 * **Ключ устарел. Что делать?**
Вам следует зайти в настройки и обновить ключ доступа. Кнопка обновления ключа доступа находится напротив вашего аккаунта.
 * **Я диктую текст на русском, а получаю на другом языке. Что делать?**
Вам нужно зайти в настройки браузера на [эту страницу](chrome://settings/languages) и установить нужный вам языке первым в списке.
 * **Установка приложения отменена т. к. оно не подерживается на вашем компьютере**
VK Offline работает на Chromium 22 версии и выше. Если вы видите эту надпись, значит ваш браузер устарел и вам следует его обновить.
 * **Можно ли восстановить сообщения, удаленные в ВКонтакте?**
Вкратце - нет. Но если вы синхронизировали сообщения до удаления на сайте, то они останутся у вас в приложении.
 * **Как запустить приложение при работающем Speed Dial?**
Расширение Speed Dial не показывает список установленных приложений, поэтому рекомендую вам установить его более функциональные аналоги: [Speed Dial 2 ](https://chrome.google.com/webstore/detail/speed-dial-2/jpfpebmajhhopeonhlcgidhclcccjcik)или [Визуальные Закладки от Яндекса](https://chrome.google.com/webstore/detail/pchfckkccldkbclgdepkaonamkignanh).
 * **Почему не расшифровывается украинская речь?**
Приложение использует технологию [Google Voice Search](http://en.wikipedia.org/wiki/Google_Voice_Search), которая на данный момент не поддерживает украинский язык.

## IndexedDB schema
Each user's data is stored inside database `db_{userId}`. Database contains 3 object stores:

 * contacts (keyPath: "uid")
   * {Number} uid
   * {String} first_name
   * {String} last_name
   * {String} other_data
   * {String} notes
   * {String} photo
   * {String} bdate
   * {Number} sex
   * {Number} last_message_ts - cached timestamp of the last message from contact; cache TTL is 5 minutes
   * {Number} messages_num - cached number of messages got from contact; cache TTL is 1 hour
 * messages (keyPath: "mid")
   * {Number} mid
   * {Number} chat - primary key from `chats` object store
   * {Number} uid
   * {String} title
   * {String} body
   * {Array} tags - any of "inbox", "sent", "attachments", "important", "trash", "outbox", "drafts"
   * {Number} date - message timestamp
   * {Boolean} read - former {Number} `status` in WebDatabase
   * {Array} attachments - former serialized property in WebDatabase
   * {Object} other_data - former serialized property in WebDatabase
 * chats (autoIncrement: true)
   * {Array} participants - serves as a multiEntry index
   * {Number} chat_id
   * {String} title
   * {Object} picture
   * {Number} last_message_ts - servers as an index

There's also a special database `meta` with (currently) only one object store:

 * log (autoIncrement: true)
   * {String} data
   * {Number} ts - timestamp of record (Date.now() by default)
   * {String} level - one of "config", "error", "warn", "log", "info"

## Автор

 * [Дмитрий Сорин](http://www.staypositive.ru)

## Лицензия

Copyright 2013 Dmitry Sorin - info@staypositive.ru

Licensed under the Apache License, Version 2.0: http://www.apache.org/licenses/LICENSE-2.0
