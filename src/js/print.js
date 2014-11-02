/* ==========================================================
 * Print page (VK Offline Chrome app)
 * https://github.com/1999/vkoffline
 * ==========================================================
 * Copyright 2013 Dmitry Sorin <info@staypositive.ru>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * ========================================================== */

window.onload = function() {
	if (!location.search.length)
		return;

	App.requestBackgroundPage(function (backgroundPage) {
		var searchData = {};
		var AccountsManager = backgroundPage.AccountsManager;
		var printType, msgData, userData;

		var onDataLoaded = function () {
			if (msgData === undefined || userData === undefined)
				return;

			var tplData = [];
			msgData.forEach(function (msg) {
				var subject = subjectTitle = msg.title.trim().replace(/(Re(\([\d]+\))?:[\s]+)+/, "").replace(/VKontakte\sOffline\smessage/, "VK Offline message");
				var fio;

				var msgDate = new Date(msg.date * 1000);
				var hours = msgDate.getHours();
				var minutes = msgDate.getMinutes();
				var monthes = chrome.i18n.getMessage("monthesCut").split("|");
				var dateString = msgDate.getDate() + " " + monthes[msgDate.getMonth()] + " " + msgDate.getFullYear() + " " + chrome.i18n.getMessage('dayAndTimeSeparator') + " " + ((hours < 10) ? "0" + hours : hours) + ":" + ((minutes < 10) ? "0" + minutes : minutes);

				if (userData !== null) {
					fio = userData.first_name + " " + userData.last_name;
				} else {
					if (msg.tags.indexOf("inbox") !== -1) {
						fio = msg.first_name + " " + msg.last_name;
					} else {
						fio = AccountsManager.current.fio;
					}
				}

				tplData.push({
					dateString: dateString,
					fio: fio,
					subject: subject,
					body: Utils.string.emoji(msg.body, false)
				});
			});

			var html = Templates.render("print", {messages: tplData});
			document.body.html(html);

			window.print();
			window.close();
		};

		location.search.substr(1).split("&").forEach(function (paramData) {
			var param = paramData.split("=");
			searchData[param[0]] = (param.length > 1) ? param.slice(1).join("=") : null;
		});

		if (searchData.mid !== undefined && /^[0-9]+$/.test(searchData.mid) && searchData.uid !== undefined && /^[0-9]+$/.test(searchData.uid))
			printType = "uniqueMessage";

		if (searchData.did !== undefined && (/^[0-9]+$/.test(searchData.did) || /^0_[0-9]+$/.test(searchData.did)))
			printType = "dialog";

		switch (printType) {
			case "uniqueMessage" :
				chrome.runtime.sendMessage({action: "getContactData", uid: searchData.uid}, function (dbUserData) {
					userData = dbUserData;
					onDataLoaded();
				});

				chrome.runtime.sendMessage({action: "getMessageInfo", mid: searchData.mid}, function (dbMsgInfo) {
					msgData = [dbMsgInfo];
					onDataLoaded();
				});

				break;

			case "dialog" :
				chrome.runtime.sendMessage({action: "getDialogThread", id: searchData.did, print: true}, function (dialogData) {
					userData = null;
					msgData = dialogData[0];

					onDataLoaded();
				});

				break;
		}
	});
};
