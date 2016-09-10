'use strict';

import {ipcRenderer} from 'electron';

const prepareStackText = (errStack) => {
	return errStack.split('\n    ');
};

const flattenError = (err) => {
	const isErrorInstance = err instanceof Error; 
	const message = isErrorInstance ? err.message : err;
	const stack = isErrorInstance ? prepareStackText(err.stack) : null;

	return {message, stack};
};

export default (file) => {
	// listen to node-related errors
	process.on('uncaughtException', err => {
		// TODO log errors to IndexedDB
		// LogManager.error(msgError);

		ipcRenderer.send('rendererError', {
			file,
			err: flattenError(err),
			type: 'uncaughtException'
		});
	});

	// listen to unhandled promises being rejected
	process.on('unhandledRejection', reason => {
		// TODO log errors to IndexedDB
		// LogManager.error(msgError);
		// reason is mostly an Error instance

		ipcRenderer.send('rendererError', {
			file,
			err: flattenError(err),
			type: 'unhandledRejection'
		});
	});
}
