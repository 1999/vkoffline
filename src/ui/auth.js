"use strict";

var Auth = (function () {
	function statSend() {
		var args = [].slice.call(arguments, 0);

		chrome.runtime.getBackgroundPage(function (win) {
			win.CPA.sendEvent.apply(win.CPA, args);
		});
	}

	/**
	 * VK OAuth webview
	 * @return {Promise}
	 */
	function initAuthWebview() { // new, add, update (uid)
		return new Promise(function (resolve, reject) {
			var oauthRedirectURI = "https://oauth.vk.com/blank.html";
			var webview = document.createElement("webview");
			webview.classList.add("oauth");
			webview.style.width = window.innerWidth + "px";
			webview.style.height = window.innerHeight - 5 + "px";

			var isFirstLoad = true;
			webview.setAttribute("src", oauthRedirectURI);

			webview.addEventListener("loadcommit", function (evt) {
				if (!evt.isTopLevel || evt.url.indexOf(oauthRedirectURI) !== 0) {
					return;
				}

				if (isFirstLoad) {
					// @see http://stackoverflow.com/questions/27259427/when-is-the-best-time-to-call-webview-cleardata/27259660
					webview.clearData({since: 0}, {cookies: true});

					setTimeout(function () {
						webview.setAttribute("src", "https://oauth.vk.com/authorize?client_id=" + App.VK_ID + "&scope=" + App.VK_APP_SCOPE.join(",") + "&redirect_uri=" + oauthRedirectURI + "&display=page&response_type=token");
					}, 100);

					isFirstLoad = false;
					return;
				}

				var tmp = document.createElement("a");
				tmp.setAttribute("href", evt.url);

				var token = tmp.hash.match(/access_token=([a-z0-9]+)/);
				var userId = tmp.hash.match(/user_id=([\d]+)/);
				var error = tmp.search.match(/error=([^&]+)/)
				var errorDescription = tmp.search.match(/error_description=([^&]+)/);

				webview.remove();

				if (error) {
					statSend("App-Actions", "OAuth access cancelled", error[1], errorDescription[1]);

					reject({
						error: error[1],
						description: errorDescription[1]
					});
				} else {
					statSend("App-Actions", "OAuth access granted", userId[1]);

					resolve({
						token: token[1],
						uid: Number(userId[1])
					});
				}
			}, false);

			document.body.appendChild(webview);
		});
	}

	/**
	 * @param {String} type - one of "new", "add", "update"
	 * @param {Object} errObj
	 */
	function authErrorsHandler(type, errObj) {
		var userDeniedAccess = (errObj.error.indexOf("access_denied") !== -1) || (errObj.error.indexOf("denyAccess") !== -1);
		var securityBreach = errObj.error.indexOf("security") !== -1;
		var failReason;

		if (userDeniedAccess) {
			failReason = "securityBreach";
		} else if (securityBreach) {
			failReason = "denyAccess";
		} else {
			failReason = "unknown"
		};

		notifySelf({
			action: "appWontWorkWithoutAccessGranted",
			from: type,
			reason: failReason
		});
	}


	return {
		/**
		 * Request token for the first user in app
		 */
		requestFirstToken: function Auth_requestFirstToken() {
			initAuthWebview().then(function (res) {
				statSend("App-Actions", "First account added");

				chrome.runtime.sendMessage({
					action: "addFirstAccount",
					token: res.token,
					uid: res.uid
				});
			}, authErrorsHandler.bind(null, "new"));
		},

		/**
		 * Add another account into app
		 * @return {Promise}
		 */
		addNewAccount: function Auth_addNewAccount() {
			return initAuthWebview().then(function (res) {
				chrome.runtime.sendMessage({
					action: "addAnotherAccount",
					token: res.token,
					uid: res.uid
				});
			}, authErrorsHandler.bind(null, "add"));
		},

		/**
		 * Update expired token for existing app user
		 * @return {Promise}
		 */
		updateExistingToken: function Auth_updateExistingToken(updateTokenForUserId) {
			return initAuthWebview().then(function (res) {
				chrome.runtime.sendMessage({
					action: "updateExistingToken",
					token: res.token,
					uid: res.uid,
					neededUid: updateTokenForUserId
				});
			}, authErrorsHandler.bind(null, "update"));
		}
	};
})();
