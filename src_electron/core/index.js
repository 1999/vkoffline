'use strict';

const {resolve} = require('path');
const {app, BrowserWindow, ipcMain} = require('electron');
const vkAuth = require('./vkauth');

const IS_DEBUG = (process.env.NODE_ENV === 'development');

// Keep a global reference of the window objects, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let windows = new Map;

const createSyncWindow = () => {
    const window = new BrowserWindow({
        show: IS_DEBUG,
        x: 0,
        y: 0
    });

    const url = resolve(`${__dirname}/../ui/sync.html`);
    window.loadURL(`file://${url}`);
    window.webContents.openDevTools();

    windows.set('sync', window);
};

const createUiWindow = (isTokenExpired) => {
    const window = new BrowserWindow({
        width: 1000,
        height: 700,
        title: 'Loading...'
    });

    const url = resolve(`${__dirname}/../ui/main.html?tokenExpired=${isTokenExpired}`);
    window.loadURL(`file://${url}`);

    window.on('closed', () => {
        // Dereference the window object, usually you would store windows
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
        windows.delete('ui');
    });

    windows.set('ui', window);
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app
    .on('ready', createSyncWindow)
    .on('ready', createUiWindow);

// Quit when all windows are closed.
app.on('window-all-closed', () => {
    // On macOS it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (IS_DEBUG || process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (IS_DEBUG && !windows.has('ui')) {
        createUiWindow();
    }
});

ipcMain
    .on('rendererError', (evt, {type, err, file}) => {
        /* eslint-disable no-console */
        console.log({type, err, file});
        /* eslint-enable no-console */
    })
    .on('vkAuth', ({sender}, type) => {
        const onPromiseFulfilled = (data) => {
            sender.send('vkAuth', data);
        };

        vkAuth(type).then(onPromiseFulfilled).catch(onPromiseFulfilled);
    })
    .on('chromeAppWindow:leaveOneAppWindowInstance', (evt, openIfNoExist) => {
        app.focus();

        if (!windows.size && openIfNoExist) {
            createUiWindow(false);
        }
    })
    .on('chromeAppWindow:openWindow', (evt, tokenExpired) => {
        createUiWindow(tokenExpired);
    })
    .on('chromeAppWindow:closeAllOpenOne', () => {
        // close all app windows
        if (windows.has('ui')) {
            windows.get('ui').close();
        }

        createUiWindow(true);
    })
    .on('openCustomUrl', (evt, url) => {
        const window = new BrowserWindow({
            width: 1000,
            height: 50,
            title: 'Loading...'
        });

        window.loadURL(url);
    });
