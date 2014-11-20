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
		// FIXME webview width/height
		return new Promise(function (resolve, reject) {
			var oauthRedirectURI = "https://oauth.vk.com/blank.html";
			var webview = document.createElement("webview");
			webview.classList.add("oauth");
			webview.setAttribute("src", "https://oauth.vk.com/authorize?client_id=" + App.VK_ID + "&scope=" + App.VK_APP_SCOPE.join(",") + "&redirect_uri=" + oauthRedirectURI + "&display=page&response_type=token");
			webview.style.width = window.innerWidth + "px";
			webview.style.height = window.innerHeight - 5 + "px";

			webview.addEventListener("loadcommit", function (evt) {
				if (!evt.isTopLevel || evt.url.indexOf(oauthRedirectURI) !== 0) {
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
					// FIXME: fill this with error/errorDescription
					statSend("App-Actions", "OAuth access cancelled");

					reject({
						error: error[1],
						description: errorDescription[1]
					});
				} else {
					// FIXME: update ns App-Actions probably?
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
			}, function (errObj) {
				// FIXME: do smth
			});
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
			}, function (errObj) {

			});
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
			}, function (errObj) {

			});
		}
	};
})();
