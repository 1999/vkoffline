'use strict';

const {resolve} = require('path');
const {app, BrowserWindow, ipcMain} = require('electron');
const IS_DEBUG = (process.env.NODE_ENV === 'development');

// Keep a global reference of the window objects, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let windows = new Map;

const createSyncWindow = () => {
	const window = new BrowserWindow({show: false});

	const url = resolve(`${__dirname}/../ui/sync.html`);
	window.loadURL(`file://${url}`);

	windows.set('sync', window);
};

const createUiWindow = () => {
	const window = new BrowserWindow({
        width: 800,
        height: 600,
		title: 'Loading...'
    });

	const url = resolve(`${__dirname}/../ui/main.html`);
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
		app.quit()
	}
});

app.on('activate', () => {
	// On macOS it's common to re-create a window in the app when the
	// dock icon is clicked and there are no other windows open.
	if (IS_DEBUG && !windows.has('ui')) {
		createUiWindow();
	}
});

ipcMain.on('rendererError', (evt, {type, err, file}) => {
	console.log({type, err, file});
});
