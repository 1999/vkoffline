'use strict';

import {remote} from 'electron';

export const appName = remote.app.getName();
export const appVersion = remote.app.getVersion();
export const appLocale = remote.app.getLocale();
