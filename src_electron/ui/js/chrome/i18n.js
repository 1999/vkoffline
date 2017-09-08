'use strict';

import assert from 'assert';
import {appLocale} from '../remote';

import i18nDataRU from '../../../_locales/ru/messages.json';
import i18nDataEN from '../../../_locales/en/messages.json';
import i18nDataUK from '../../../_locales/uk/messages.json';

// osLocale is async, so there's a small chance that getMessage() will return
// values for wrong locale. Otherwise all chrome.i18n.getMessage() calls
// should be rewritten in async manner
const i18nData = new Map;
i18nData.set('ru', i18nDataRU);
i18nData.set('en', i18nDataEN);
i18nData.set('uk', i18nDataUK);

const EXISTING_LOCALES = ['ru', 'en', 'uk'];
const DEFAULT_LOCALE = 'ru';

const getLocaleForMessage = () => {
    const simpleLocale = appLocale.split('-')[0].toLowerCase();
    return EXISTING_LOCALES.includes(simpleLocale) ? simpleLocale : DEFAULT_LOCALE;
};

// TODO use original i18n/locales.json
const getMessage = (...args) => {
    assert(args.length === 1, `Unexpected chrome.i18n.getMessage() arguments number: ${args.length}`);

    const key = args[0];
    const useLocale = getLocaleForMessage();

    if (key === '@@ui_locale') {
        return useLocale;
    }

    const i18nForLocale = i18nData.get(useLocale);

    return i18nForLocale[key]
        ? i18nForLocale[key].message
        : '';
};

export default {
    getMessage
};
