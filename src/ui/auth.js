var statSend = _.noop;

var Auth = (function () {
	/**
	 * VK OAuth webview
	 * @return {Promise}
	 */
	function initAuthWebview() { // new, add, update (uid)
		// FIXME webview width/height
		return new Promise(function (resolve, reject) {
			var oauthRedirectURI = "https://oauth.vk.com/blank.html";
			var webview = document.createElement("webview");
			webview.setAttribute("src", "https://oauth.vk.com/authorize?client_id=" + App.VK_ID + "&scope=" + App.VK_APP_SCOPE.join(",") + "&redirect_uri=" + oauthRedirectURI + "&display=page&response_type=token");
			webview.style.width = window.innerWidth + "px";
			webview.style.height = window.innerHeight + "px";

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

			document.body.innerHTML = "";
			document.body.classList.add("authview");
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
				//      var newUserGranted = (AccountsManager.list[userId] === undefined);
				//      if (newUserGranted) {
				//          AccountsManager.setData(userId, token, "...");
				//          AccountsManager.currentUserId = userId;

				//          var wallTokenUpdated = StorageManager.get("wall_token_updated", {constructor: Object, strict: true, create: true});
				//          wallTokenUpdated[AccountsManager.currentUserId] = 1;
				//          StorageManager.set("wall_token_updated", wallTokenUpdated);

				//          startUserSession(function () {
				//              if (!chromeWindowsExist)
				//                  return chrome.windows.create({url: appFrontendUrl});

				//              if (!tabsList.length)
				//                  return chrome.tabs.create({url: appFrontendUrl});

				//              // закрываем все табы, кроме первого в списке по приоритету
				//              tabsList.forEach(function (tabInfo, index) {
				//                  if (index === 0) {
				//                      chrome.windows.update(tabInfo.windowId, {focused: true});
				//                      if (tabInfo.type === "tab") {
				//                          try {
				//                              chrome.tabs.update(tabInfo.tabId, {active: true});
				//                          } catch (e) {
				//                              chrome.tabs.update(tabInfo.tabId, {selected: true});
				//                          }
				//                      }
				//                  } else {
				//                      if (tabInfo.type === "app") {
				//                          chrome.windows.remove(tabInfo.windowId);
				//                      } else {
				//                          chrome.tabs.remove(tabInfo.tabId);
				//                      }
				//                  }
				//              });

				//              chrome.runtime.sendMessage({
				//                  action: "ui",
				//                  which: "syncing"
				//              });
				//          });

				//          statSend("App-Actions", "2+ account added");
				//      } else {
				//          AccountsManager.setData(userId, token);
				//          focusAppTab();

				//          // уведомляем об ошибке
				//          chrome.runtime.sendMessage({
				//              action: "tokenUpdatedInsteadOfAccountAdd",
				//              uid: userId,
				//              fio: AccountsManager.list[userId].fio
				//          });
				//      }
			}, function (errObj) {

			});
		},

		/**
		 * Update expired token for existing app user
		 * @return {Promise}
		 */
		updateExistingToken: function Auth_updateExistingToken() {
			return initAuthWebview().then(function (res) {
				//      var neededUserTokenUpdated = (updateTokenForUserId === userId);
				//      var newUserGranted = true;

				//      for (var listUserId in AccountsManager.list) {
				//          if (listUserId === userId) {
				//              newUserGranted = false;
				//              break;
				//          }
				//      }

				//      if (newUserGranted) {
				//          // уведомляем об ошибке
				//          chrome.runtime.sendMessage({
				//              action: "tokenAddedInsteadOfUpdate",
				//              uid: userId,
				//              token: token
				//          });
				//      } else {
				//          AccountsManager.setData(userId, token);

				//          if (neededUserTokenUpdated) {
				//              statSend("App-Actions", "Account token updated");
				//              chrome.runtime.sendMessage({
				//                  action: "tokenUpdated"
				//              });
				//          } else {
				//              chrome.runtime.sendMessage({
				//                  action: "tokenUpdatedForWrongUser",
				//                  uid: userId,
				//                  fio: AccountsManager.list[userId].fio
				//              });
				//          }
				//      }

				//      if (!chromeWindowsExist)
				//          return chrome.windows.create({url: appFrontendUrl});

				//      if (!tabsList.length)
				//          return chrome.tabs.create({url: appFrontendUrl});

				//      // показываем первый таб
				//      chrome.windows.update(tabsList[0].windowId, {focused: true});
				//      if (tabsList[0].type === "tab") {
				//          try {
				//              chrome.tabs.update(tabsList[0].tabId, {active: true});
				//          } catch (e) {
				//              chrome.tabs.update(tabsList[0].tabId, {selected: true});
				//          }
				//      }
			}, function (errObj) {

			});
		}
	};
})();
