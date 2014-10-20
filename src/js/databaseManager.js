/* ==========================================================
 * Database Manager (VK Offline Chrome app)
 * https://github.com/1999/vkoffline
 * ==========================================================
 * Copyright 2013-2014 Dmitry Sorin <info@staypositive.ru>
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

var DatabaseManager = {
	dropEverything: function (uids, callback) {
		var promises = uids.map(function (uid) {
			return ["contacts", "messages", "chats"].map(function (objStorePrefix) {
				return new Promise(function (resolve, reject) {
					sklad.deleteDatabase(objStorePrefix + '_' + uid, function (err) {
						if (err) {
							reject(err);
						} else {
							resolve();
						}
					});
				});
			});
		});

		Promise.all(_.flatten(promises)).then(function () {
			callback();
		}, function (err) {
			callback(err);
		});
	},

	migrateWebDatabase: function DatabaseManager_migrateWebDatabase(uids, callback) {
		console.log("Migrate WebDatabase into IndexedDB");

		var that = this;
		var webDatabaseLink = window.openDatabase("vkoffline", "1.0.1", null, 0);

		function getAllWebDatabaseData(table, uid) {
			return new vow.Promise(function (resolve, reject) {
				webDatabaseLink.readTransaction(function (tx) {
					tx.executeSql("SELECT rowid, * FROM " + table + "_" + uid + " ORDER BY rowid", [], function (tx, resultSet) {
						var totalRecords = resultSet.rows.length;
						var output = [];

						for (var i = 0; i < totalRecords; i++) {
							output.push(resultSet.rows.item(i));
						}

						resolve(output);
					}, function (tx, err) {
						reject(err.message);
					});
				});
			});
		}

		function validateJSONString(data, constr) {
			var someData;
			try {
				someData = JSON.parse(data);
				if (!(someData instanceof constr)) {
					throw new Error("Invalid");
				}
			} catch (ex) {
				someData = new constr;
			}

			return someData;
		}

		// FIXME: user can exist but no tables
		function migrateUserData(uid) {
			var that = this;
			var currentUserId = Number(uid);

			return new Promise(function (resolve, reject) {
				that.initUser(uid, function () {
					Promise.all([
						getAllWebDatabaseData("contacts", uid),
						getAllWebDatabaseData("pm", uid)
					]).then(function (res) {
						var fetchedContacts = res[0];
						var fetchedMessages = res[1];

						var contacts = {};
						var messages = {};
						var chats = {};

						fetchedContacts.forEach(function (record) {
							var otherData = validateJSONString(record.other_data, Object);

							contacts[record.uid] = {
								uid: Number(record.uid),
								first_name: record.first_name,
								last_name: record.last_name,
								notes: record.notes,
								last_message_ts: 0,
								messages_num: 0
							};

							if (otherData.photo) {
								contacts[record.uid].photo = otherData.photo;
							}

							if (otherData.bdate) {
								contacts[record.uid].bdate = otherData.bdate;
							}

							if (otherData.sex) {
								contacts[record.uid].sex = Number(otherData.sex) || 0;
							}
						});

						fetchedMessages.forEach(function (record) {
							var isMultiChat = Boolean(record.chatid);
							var chatId = isMultiChat ? record.chatid : "0_" + record.uid;
							var userId = Number(record.uid);
							var lastChatMessageDate = chats[chatId] ? chats[chatId].last_message_ts : 0;

							chats[chatId] = chats[chatId] || {};
							chats[chatId].title = record.title;
							chats[chatId].last_message_ts = Math.max(record.date, lastChatMessageDate);

							if (isMultiChat) {
								chats[chatId].chat_id = Number(record.chatid);
							}

							chats[chatId].participants = chats[chatId].participants || [];
							if (isMultiChat) {
								if (userId !== currentUserId && chats[chatId].participants.indexOf(userId) === -1) {
									chats[chatId].participants.push(userId);
								}
							} else {
								// there should be only one person in chat
								if (!chats[chatId].participants.length) {
									chats[chatId].participants.push(userId);
								}
							}

							var attachments = validateJSONString(record.attachments, Array);
							var tags = [];

							App.INIT_TAGS.forEach(function (tag, i) {
								if (record.tags & Math.pow(2, i)) {
									tags.push(tag);
								}
							});

							messages[record.mid] = {
								mid: Number(record.mid),
								uid: userId,
								title: record.title,
								body: record.body,
								date: record.date,
								read: Boolean(record.status),
								attachments: attachments,
								tags: tags,
								chatId: chatId
							};

							contacts[userId].messages_num += 1;
							contacts[userId].last_message_ts = Math.max(contacts[userId].last_message_ts, record.date);
						});

						var chatsList = []; // list to insert into IndexedDB
						var chatsMap = {}; // map of `chatId -> index` values

						Object.keys(chats).forEach(function (chatId) {
							chatsList.push(chats[chatId]);
							chatsMap[chatId] = chatsList.length - 1;
						});

						// insert chats first
						that._conn[uid].insert({
							"chats": chatsList
						}, function (err, insertedKeys) {
							if (err) {
								reject(err.name + ": " + err.message);
								return;
							}

							console.log("Chats inserted");

							// update messages' string `chatId` into numeric `chat`
							_.forIn(messages, function (msg) {
								var currentStringChatId = msg.chatId;
								var chatInsertedKeyIndex = chatsMap[currentStringChatId];
								var chatNumericId = insertedKeys.chats[chatInsertedKeyIndex];

								msg.chat = chatNumericId;
								delete msg.chatId;
							});

							that._conn[uid].insert({
								"contacts": _.values(contacts),
								"messages": _.values(messages)
							}, function (err, insertedKeys) {
								if (err) {
									reject(err.name + ": " + err.message);
									return;
								}

								console.log("Contacts and PM inserted");

								that._conn[uid].close();
								resolve();
							});
						});
					}, reject);
				}, reject);
			});
		}

		var promises = uids.map(function (uid) {
			console.log("UID found: %s", uid);
			return migrateUserData.call(that, uid);
		});

		Promise.all(promises).then(function () {
			callback();
		}, function (err) {
			callback(err);
		});
	},

	initMeta: function DatabaseManager_initMeta(callback) {
		var that = this;

		sklad.open('meta', {
			version: 1,
			migration: {
				'1': function (database) {
					database.createObjectStore("log", {autoIncrement: true});
				}
			}
		}, function (err, conn) {
			if (err) {
				throw new Error(err.name + ': ' + err.message);
			}

			that._meta = conn;
			callback();
		});
	},

	/**
	 * @param {Integer} userId
	 * @param {Function} fnSuccess
	 * @param {Function} fnFail принимает {String} текст ошибки
	 * @return {Void}
	 */
	initUser: function(userId, fnSuccess, fnFail) {
		var that = this;

		sklad.open('db_' + userId, {
			version: 1,
			migration: {
				'1': function (database) {
					var contactsStore = database.createObjectStore("contacts", {keyPath: "uid"});
					contactsStore.createIndex("last_message", "last_message_ts");
					contactsStore.createIndex("messages_num", "messages_num");
					contactsStore.createIndex("name", ["first_name", "last_name"]);
					contactsStore.createIndex("fulltext", "fulltext", {multiEntry: true});

					var messagesStore = database.createObjectStore("messages", {keyPath: "mid"});
					messagesStore.createIndex("tag", "tags", {multiEntry: true});
					messagesStore.createIndex("fulltext", "fulltext", {multiEntry: true});

					var chatsStore = database.createObjectStore("chats", {autoIncrement: true});
					chatsStore.createIndex("contact", "participants", {multiEntry: true});
					chatsStore.createIndex("last_message", "last_message_ts");
				}
			}
		}, function (err, conn) {
			if (err) {
				fnFail(err.name + ': ' + err.message);
			} else {
				that._conn[userId] = conn;
				that._userId = userId;

				fnSuccess();
			}
		});
	},

	/**
	 *
	 */
	dropUser: function(userId) {
		this._conn[userId].close();
		sklad.deleteDatabase('db_' + userId, _.noop);
	},

	/**
	 * @param {String} outputType - alpha (в алфавитном порядке), lastdate (по дате последнего сообщения), messagesnum (по общему количеству сообщений)
	 * @param {Integer} startFrom
	 * @param {Function} fnSuccess принимает {Array} массив объектов-контактов и {Integer} общее количество контактов
	 * @param {Function} fnFail принимает параметр {String} errorMessage
	 */
	getContactList: function DatabaseManager_getContactList(outputType, startFrom, fnSuccess, fnFail) {
		var userId = this._userId;
		var indexName;

		switch (outputType) {
			case "alpha":
				indexName = "name";
				break;

			case "lastdate":
				indexName = "last_message";
				break;

			case "messagesnum":
				indexName = "messages_num";
				break;
		}

		this._conn[userId].get("contacts", {
			index: indexName,
			limit: 30,
			offset: startFrom
		}, function (err, data) {
			if (err) {
				fnFail(err.name + ": " + err.message);
				return;
			}

			fnSuccess(data.map(function (msgData) {
				return msgData.value;
			}));
		});
	},

	/**
	 * @param {Integer} uid
	 * @param {Function} fnSuccess принимает параметр {Object} контакт
	 * @param {Function} fnFail принимает параметры {Boolean} isDatabaseError и {String} errorMessage
	 */
	getContactById: function(currentUserId, uid, fnSuccess, fnFail) {
		var userId = currentUserId;

		this._dbLink.readTransaction(function(tx) {
			tx.executeSql("SELECT * FROM contacts_" + userId + " WHERE uid = ?", [uid], function(tx, resultSet) {
				if (resultSet.rows.length) {
					if (typeof fnSuccess === "function") {
						fnSuccess(resultSet.rows.item(0));
					}
				} else if (typeof fnFail === "function") {
					fnFail(false, "No user with ID #" + uid);
				}
			}, function(tx, err) {
				if (typeof fnFail === "function") {
					fnFail(true, err.message);
				}
			});
		});
	},

	getConversations: function DatabaseManager_getConversations(startFrom, fnSuccess, fnFail) {
		var that = this;
		var userId = this._userId;

		function fetchParticipants(uids) {
			if (uids.indexOf(userId) === -1) {
				uids.push(userId);
			}

			var promises = {};
			uids.forEach(function (uid) {
				promises[uid] = vow.Promise(function (resolve, reject) {
					that._conn[uid].get("contacts", {
						range: IDBKeyRange.only(uid)
					}, function (err, data) {
						if (err) {
							reject(err.name + ": " + err.message);
							return;
						}

						resolve(data.value);
					});
				});
			});

			return vow.all(promises).then(function (userData) {
				return userData.map(function (user) {
					return user.value;
				});
			});
		}

		this._conn[userId].get("chats", {
			index: "last_message",
			offset: startFrom,
			limit: 30
		}, function (err, data) {
			if (err) {
				fnFail(err.name + ": " + err.message);
				return;
			}

			// fetchParticipants()
			// dialogData.participants = usersList;

			fnSuccess([]);
		});
	},

	/**
	 * @param {Integer} uid
	 * @param {Function} fnSuccess принимает параметр {Array} список объектов
	 * @param {Function} fnFail принимает параметр {String} errorMessage
	 */
	getConversationThreadsWithContact: function DatabaseManager_getConversationThreadsWithContact(uid, fnSuccess, fnFail) {
		var userId = this._userId,
			isMultiChatRegExp = /^[\d]+$/;

		this._dbLink.readTransaction(function(tx) {
			// выборка участников тредов
			var fetchParticipants = function(dialogId, callback) {
				var sql = "",
					bindArgs = [],
					isMultiChat = isMultiChatRegExp.test(dialogId);

				if (isMultiChat) {
					sql = "SELECT c.uid, c.first_name, c.last_name FROM pm_" + userId + " AS pm JOIN contacts_" + userId + " AS c ON pm.uid = c.uid WHERE pm.chatid = ? GROUP BY pm.uid ORDER BY pm.mid DESC";
					bindArgs = [dialogId];
				} else {
					sql = "SELECT uid, first_name, last_name FROM contacts_" + userId + " WHERE uid IN (?, ?) ORDER BY uid";
					bindArgs = [uid, userId];
				}

				tx.executeSql(sql, bindArgs, function(tx, resultSet) {
					var i, users = [];

					for (i = 0; i < resultSet.rows.length; i++) {
						users.push(resultSet.rows.item(i));
					}

					callback(users);
				}, function(tx, err) {
					fnFail(err.message);
				});
			};

			// запрос диалогов
			tx.executeSql("SELECT (CASE chatid WHEN 0 THEN (chatid || '_' || uid) ELSE chatid END) AS id, title, date, body, uid, inner.total \
							FROM pm_" + userId + " AS pm \
							JOIN \
								(SELECT (CASE chatid WHEN 0 THEN (chatid || '_' || uid) ELSE chatid END) AS id, MAX(mid) AS maxmid, COUNT(rowid) AS total FROM pm_" + userId + " WHERE uid = ? AND tags & ? == 0 GROUP BY id) AS inner \
							ON inner.id = id AND mid = inner.maxmid \
							ORDER BY pm.mid DESC", [uid, trashTagId], function(tx, resultSet) {
				var i, item,
					output = [];

				if (resultSet.rows.length === 0) {
					fnSuccess(output);
					return;
				}

				for (i = 0; i < resultSet.rows.length; i++) {
					(function(dialogData) {
						fetchParticipants(dialogData.id, function(usersList) {
							dialogData.participants = usersList;
							output.push(dialogData);

							if (output.length === resultSet.rows.length) {
								fnSuccess(output);
							}
						});
					})(resultSet.rows.item(i));
				}
			}, function(tx, err) {
				if (typeof fnFail === "function") {
					fnFail(err.message);
				}
			});
		});
	},

	/**
	 * Получение сообщений из диалога
	 *
	 * @param {String} dialogId идентификатор диалога: [\d]+ в случае чата, 0_[\d]+ в случае переписки один на один
	 * @param {Integer|Null} from с какой записи нужно все получить
	 * @param {Function} fnSuccess принимает аргументы {Array} сообщения, {Integer} количество сообщений в диалоге и {Array} [messageId второго сообщения, messageId пред-предпоследнего сообщения]
	 * @param {Function} fnFail принимает {String} строка ошибки
	 */
	getDialogThread: function DatabaseManager_getDialogThread(dialogId, from, fnSuccess, fnFail) {
		var userId = this._userId,
			isMultiChat = (/^[\d]+$/.test(dialogId)),
			sqlWhere = (isMultiChat) ? "m.chatid = ?" : "m.uid = ? AND m.chatid = 0",
			bindArgs = (isMultiChat) ? [trashTagId, dialogId] : [trashTagId, dialogId.split("_")[1]];

		this._dbLink.readTransaction(function(tx) {
			tx.executeSql("SELECT m.title, m.status, m.body, m.date, m.uid, m.mid, m.tags, c.first_name, c.last_name, m.attachments, m.other_data \
							FROM pm_" + userId + " AS m \
							JOIN contacts_" + userId + " AS c ON c.uid = m.uid \
							WHERE m.tags & ? == 0 AND " + sqlWhere + " \
							GROUP BY m.mid \
							ORDER BY m.mid", bindArgs, function(tx, resultSet) {
				var i, stop,
					total = resultSet.rows.length,
					output = [];

				if (from === null) {
					for (i = 0; i < total; i++) {
						output.push(resultSet.rows.item(i));
					}
				} else {
					for (i = Math.max(total - from - 30, 0), stop = Math.max(total - from, 0); i < stop; i++) {
						output.push(resultSet.rows.item(i));
					}
				}

				fnSuccess([output, total]);
			}, function (tx, err) {
				if (typeof fnFail === "function") {
					fnFail(err.message);
				}
			});
		});
	},

	/**
	 * @param {Integer} mid
	 * @param {Function} fnSuccess принимает параметр {Object}
	 * @param {Function} fnFail принимает параметры {Boolean} isDatabaseError и {String} errorMessage
	 */
	getMessageById: function(mid, fnSuccess, fnFail) {
		var userId = this._userId;

		this._dbLink.readTransaction(function(tx) {
			tx.executeSql("SELECT * FROM pm_" + userId + " WHERE mid = ?", [mid], function(tx, resultSet) {
				if (resultSet.rows.length === 0) {
					if (typeof fnFail === "function") {
						fnFail(false, "No message with ID #" + mid);
					}

					return;
				}

				fnSuccess(resultSet.rows.item(0));
			}, function(tx, err) {
				if (typeof fnFail === "function") {
					fnFail(true, err.message);
				}
			});
		});
	},

	/**
	 * Внесение и обновление контактов
	 *
	 * @param {Array} data массив из массивов вида [uid, firstName, lastName, otherData, oldNames, notes]
	 * @param {Function} fnSuccess (optional) принимает {Object} данные пользователя
	 * @param {Function} fnFail (optional) принимает {Integer} UID и {String} текст ошибки
	 * @param {Function} fnAfterwards (optional)
	 */
	replaceContacts: function(userId, data, fnSuccess, fnFail, fnAfterwards) {
		var callbacksAreFunctions = [(typeof fnSuccess === "function"), (typeof fnFail === "function"), (typeof fnAfterwards === "function")],
			executedStatements = 0,
			fn;

		fn = function() {
			executedStatements += 1;
			if (executedStatements === data.length && callbacksAreFunctions[2]) {
				fnAfterwards();
			}
		};

		this._dbLink.transaction(function(tx) {
			var columns = ["uid", "first_name", "last_name", "other_data", "notes"];

			data.forEach(function (userData) {
				tx.executeSql('INSERT OR REPLACE INTO contacts_' + userId + '(' + columns.join(", ") + ') VALUES(?, ?, ?, ?, ?)', userData, function(tx, resultSet) {
					if (callbacksAreFunctions[0]) {
						var userDoc = {};
						columns.forEach(function(columnName, index) {
							userDoc[columnName] = userData[index];
						});

						fnSuccess(userDoc);
					}

					fn();
				}, function(tx, err) {
					if (callbacksAreFunctions[1]) {
						fnFail(userData[0], err.message);
					}

					fn();
				});
			});
		});
	},

	/**
	 * Внесение сообщений
	 *
	 * @param {Integer} currentUserId ID аккаунта, для которого заносятся сообщения
	 * @param {Object} data объект с ключами: {Boolean} firstSync первая синхронизация или нет, {Array} messages массив сообщений-объектов с ключами (mid, uid, date, title, body, read_state, attachments, chat_id, tags)
	 * @param {Function} fnSuccess принимает {Object} данные сообщения (копия элемента массива из первого параметра), {Boolean} занесено ли сообщение в БД
	 * @param {Function} fnAfterwards принимает {Integer} количество успешно внесенных сообщений и {Integer} количество фэйлов при занесении
	 */
	insertMessages: function(currentUserId, data, fnSuccess, fnAfterwards) {
		var userId = currentUserId,
			callbacksAreFunctions = [(typeof fnSuccess === "function"), (typeof fnAfterwards === "function")],
			executedStatements = [0, 0], // сумма хороших запросов и сумма плохих
			databaseKeys = ["mid", "uid", "date", "title", "body", "other_data", "status", "attachments", "chatid", "tags"];

		if (data.messages.length === 0) {
			fnAfterwards(0, 0);
			return;
		}

		// вызывается на каждой итерации после занесения сообщения в БД
		var subAfterFn = function(msgData, queryIsOk) {
			if (callbacksAreFunctions[0]) {
				fnSuccess(msgData, queryIsOk);
			}

			if (queryIsOk) {
				executedStatements[0] += 1;
			} else {
				executedStatements[1] += 1;
			}

			if (executedStatements[0] + executedStatements[1] === data.messages.length && callbacksAreFunctions[1]) {
				if (data.firstSync) {
					executedStatements[1] = 0;
				}

				fnAfterwards.apply(null, executedStatements);
			}
		};

		this._dbLink.transaction(function(tx) {
			data.messages.forEach(function(msgData) {
				var databasePlaces = [],
					databaseBindings = [];

				if (typeof msgData.attachments === "object") {
					msgData.attachments = JSON.stringify(msgData.attachments);
				}

				databaseKeys.forEach(function(key) {
					databasePlaces.push("?");

					switch (key) {
						case "other_data" : databaseBindings.push(JSON.stringify(msgData)); break;
						case "status" : databaseBindings.push(msgData.read_state); break;
						case "chatid" : databaseBindings.push(msgData.chat_id); break;
						default : databaseBindings.push(msgData[key]); break;
					}
				});

				tx.executeSql("INSERT INTO pm_" + userId + " (" + databaseKeys.join(",") + ") VALUES (" + databasePlaces.join(",") + ")", databaseBindings, function(tx, resultSet) {
					subAfterFn(msgData, true);
				}, function(tx, err) {
					subAfterFn(msgData, false);
				});
			});
		});
	},

	/**
	 * Обновление полей "other_data" при миграции на 4.7
	 * @param {Array} ids
	 * @param {Function} callback принимает:
	 *		{String|Null} текст ошибки
	 */
	updateMessagesOnMigrate: function (ids, callback) {
		this._dbLink.transaction(function (tx) {
			var tasks = {};
			ids.forEach(function (id) {
				tasks[id] = function (callback) {
					tx.executeSql("UPDATE pm_" + id + " SET other_data = ''", [], function (tx, resultSet) {
						callback();
					}, function (tx, err) {
						// как иначе отследить и передать в GA какие-то данные?
						callback();
					});
				};
			});

			Utils.async.parallel(tasks, callback);
		});
	},

	/**
	 * @param {Integer} msgId
	 * @param {Function} fnSuccess принимает {Void}
	 * @param {Function} fnFail принимает {Boolean} isDatabaseError и {String} errorMessage
	 */
	markAsRead: function(msgId, fnSuccess, fnFail) {
		var userId = this._userId;

		this._dbLink.transaction(function(tx) {
			tx.executeSql("UPDATE pm_" + userId + " SET status = 1 WHERE mid = ?", [msgId], function(tx, resultSet) {
				if (resultSet.rowsAffected) {
					if (typeof fnSuccess === "function") {
						fnSuccess();
					}
				} else {
					if (typeof fnFail === "function") {
						fnFail(false, "No rows were affected when updating status column (mid: " + msgId + ")");
					}
				}
			}, function(tx, err) {
				if (typeof fnFail === "function") {
					fnFail(true, err.message);
				}
			});
		});
	},

	/**
	 * @param {Integer} msgId
	 * @param {Function} fnSuccess принимает {Void}
	 * @param {Function} fnFail принимает {Boolean} isDatabaseError и {String} errorMessage
	 */
	markAsUnread: function(msgId, fnSuccess, fnFail) {
		var userId = this._userId;

		this._dbLink.transaction(function(tx) {
			tx.executeSql("UPDATE pm_" + userId + " SET status = 0 WHERE mid = ?", [msgId], function(tx, resultSet) {
				if (resultSet.rowsAffected) {
					if (typeof fnSuccess === "function") {
						fnSuccess();
					}
				} else {
					if (typeof fnFail === "function") {
						fnFail(false, "No rows were affected when updating status column (mid: " + msgId + ")");
					}
				}
			}, function(tx, err) {
				if (typeof fnFail === "function") {
					fnFail(true, err.message);
				}
			});
		});
	},

	/**
	 * Добавление метки к сообщению
	 * @param {Integer} msgId ID сообщения
	 * @param {Integer} tagId ID тэга
	 * @param {Function} fnSuccess принимает {Void}
	 * @param {Function} fnFail принимает {Boolean} isDatabaseError и {String} errorMessage
	 */
	markMessageWithTag: function(msgId, tagId, fnSuccess, fnFail) {
		var userId = this._userId;

		this._dbLink.transaction(function(tx) {
			tx.executeSql("UPDATE pm_" + userId + " SET tags = tags | ? WHERE mid = ?", [tagId, msgId], function(tx, resultSet) {
				if (resultSet.rowsAffected) {
					fnSuccess();
				} else {
					if (typeof fnFail === "function") {
						fnFail(false, "No rows were affected when updating tags column (mid: " + msgId + ", tag: " + tagId + ")");
					}
				}
			}, function(tx, err) {
				if (typeof fnFail === "function") {
					fnFail(true, err.message);
				}
			});
		});
	},

	/**
	 * Удаление метки с сообщения
	 * @param {Integer} msgId ID сообщения
	 * @param {Integer} tagId ID тэга
	 * @param {Function} fnSuccess принимает {Void}
	 * @param {Function} fnFail принимает {Boolean} isDatabaseError и {String} errorMessage
	 */
	unmarkMessageWithTag: function(msgId, tagId, fnSuccess, fnFail) {
		var userId = this._userId;

		this._dbLink.transaction(function(tx) {
			tx.executeSql("UPDATE pm_" + userId + " SET tags = tags - ? WHERE mid = ? AND tags & ?", [tagId, msgId, tagId], function(tx, resultSet) {
				if (resultSet.rowsAffected) {
					fnSuccess();
				} else {
					if (typeof fnFail === "function") {
						fnFail(false, "No rows were affected when updating tags column (mid: " + msgId + ", tag: " + tagId + ")");
					}
				}
			}, function(tx, err) {
				if (typeof fnFail === "function") {
					fnFail(true, err.message);
				}
			});
		});
	},

	/**
	 * Полное удаление сообщения из БД
	 * @param {Integer} msgId ID сообщения
	 * @param {Function} fn
	 */
	deleteMessage: function(msgId, fn) {
		var userId = this._userId;

		this._dbLink.transaction(function(tx) {
			tx.executeSql("DELETE FROM pm_" + userId + " WHERE mid = ?", [msgId], fn, fn);
		});
	},

	/**
	 * Получение частоты использования тэгов
	 * @param {Function} fnSuccess принимает {Object} объект freq
	 * @param {Function} fnFail принимает {String} errorMessage
	 */
	getTagsCount: function(fnSuccess, fnFail) {
		var userId = this._userId,
			freq = {}, // объект вида {tagId1: количество1, tagId2: количество2, ...}
			steps = 0, // сколько запросов выполнено
			fnAfterwards;

		fnAfterwards = function() {
			steps += 1;
			if (steps !== 2) {
				return;
			}

			fnSuccess(freq);
		};

		this._dbLink.readTransaction(function(tx) {
			// количество всех кроме удаленных
			tx.executeSql("SELECT t.id, COUNT(m.rowid) AS total \
							FROM tags_" + userId + " AS t \
							JOIN pm_" + userId + " AS m ON t.id & m.tags \
							WHERE t.id != ? AND m.tags & ? == 0 \
							GROUP BY t.id", [trashTagId, trashTagId], function(tx, resultSet) {
				var i, item;

				for (i = 0; i < resultSet.rows.length; i++) {
					item = resultSet.rows.item(i);
					freq[item.id] = item.total;
				}

				fnAfterwards();
			}, function(tx, err) {
				if (typeof fnFail === "function") {
					fnFail(err.message);
				}
			});

			// количество удаленных
			tx.executeSql("SELECT COUNT(rowid) AS total FROM pm_" + userId + " WHERE tags & ?", [trashTagId], function(tx, resultSet) {
				freq[trashTagId] = resultSet.rows.item(0).total;
				fnAfterwards();
			}, function(tx, err) {
				if (typeof fnFail === "function") {
					fnFail(err.message);
				}
			});
		});
	},

	/**
	 * Получение сообщений определенного типа
	 * @param {String} tag
	 * @param {Integer} startFrom
	 * @param {Function} fnSuccess принимает {Array} [{Array} сообщения, {Integer} total]
	 * @oaram {Function} fnFail принимает {String} errorMessage
	 */
	getMessagesByType: function DatabaseManager_getMessagesByType(tag, startFrom, fnSuccess, fnFail) {
		var userId = this._userId,
			isTrashFolder = (tagsIds[0] === tagsIds[1]),
			sqlAfter = (isTrashFolder) ? "" : " AND m.tags & ? == 0",
			bindings = (isTrashFolder) ? [tagsIds[0]] : tagsIds;

		this._dbLink.readTransaction(function(tx) {
			tx.executeSql("SELECT (CASE m.chatid WHEN 0 THEN ('0_' || m.uid) ELSE m.chatid END) AS id, m.title, m.status, m.body, m.date, m.uid, m.mid, m.tags, c.first_name, c.last_name \
							FROM pm_" + userId + " AS m \
							JOIN contacts_" + userId + " AS c ON c.uid = m.uid \
							WHERE m.tags & ?" + sqlAfter + " \
							ORDER BY m.mid DESC", bindings, function(tx, resultSet) {
				var total = resultSet.rows.length,
					output = [[], total],
					i, len;

				for (i = startFrom, len = startFrom + 20; i < len; i++) {
					if (i + 1 > total) {
						break;
					}

					output[0].push(resultSet.rows.item(i));
				}

				fnSuccess(output);
			}, function(tx, err) {
				if (typeof fnFail === "function") {
					fnFail(err.message);
				}
			});
		});
	},

	/**
	 * Поиск контактов
	 * @param {Array} searchItems массив искомых строк
	 * @param {Integer} sortType типа сортировки: 0 - по дате последней переписки, 1 - по частоте переписки, 2 - по алфавиту
	 * @param {Function} fnSuccess принимает {Array} массив объектов-контактов, {Integer} общее количество найденных контактов
	 * @param {Function} fnFail принимает параметр {String} errorMessage
	 */
	searchContact: function(searchItems, sortType, startFrom, fnSuccess, fnFail) {
		var userId = this._userId,
			sql,
			bind = [],
			where = [];

		searchItems.forEach(function(item) {
			where.push("LIKE(?, ss)");
			bind.push("%" + item + "%");
		});

		switch (sortType) {
			case 0 :
				sql = "SELECT c.*, pm.date, (c.first_name || ' ' || c.last_name || ' ' || c.first_name) AS ss FROM contacts_" + userId + " AS c LEFT JOIN pm_" + userId + " AS pm ON pm.uid = c.uid WHERE " + where.join(" OR ") + " GROUP BY c.uid ORDER BY pm.date DESC, c.first_name, c.last_name";
				break;

			case 1 :
				sql = "SELECT c.*, COUNT(pm.rowid) AS total, (c.first_name || ' ' || c.last_name || ' ' || c.first_name) AS ss FROM contacts_" + userId + " AS c LEFT JOIN pm_" + userId + " AS pm ON pm.uid = c.uid WHERE " + where.join(" OR ") + " GROUP BY c.uid ORDER BY total DESC, c.first_name, c.last_name";
				break;

			case 2 :
				sql = "SELECT c.*, (c.first_name || ' ' || c.last_name || ' ' || c.first_name) AS ss FROM contacts_" + userId + " AS c WHERE " + where.join(" OR ") + " ORDER BY first_name, last_name";
				break;
		}

		this._dbLink.readTransaction(function(tx) {
			tx.executeSql(sql, bind, function(tx, resultSet) {
				var i, len,
					total = resultSet.rows.length,
					output = [];

				for (i = startFrom, len = startFrom + 20; i < len; i++) {
					if (i + 1 > total) {
						break;
					}

					output.push(resultSet.rows.item(i));
				}

				fnSuccess(output, total);
			}, function(tx, err) {
				if (typeof fnFail === "function") {
					fnFail(err.message);
				}
			});
		});
	},

	/**
	 * Поиск писем
	 * @param {Object} params
	 * @param {String} searchString
	 * @param {Integer} trashTagId
	 * @param {Function} fnSuccess принимает {Array} массив сообщений и {Integer} общее количество найденных сообщений
	 * @param {Function} fnFail принимает {String} текст ошибки
	 */
	searchMail: function DatabaseManager_searchMail(params, searchString, startFrom, fnSuccess, fnFail) {
		var userId = this._userId,
			bindings, sqlWhere;

		params = params || {};

		if (params.id !== undefined) {
			sqlWhere = ["m.tags & ? == 0", "LIKE(?, m.body)", "id = ?"];
			bindings = [trashTagId, "%" + searchString + "%", params.id];
		} else if (params.tag !== undefined) {
			if (trashTagId === params.tag) { // поиск в корзине
				sqlWhere = ["LIKE(?, m.body)", "m.tags & ?"];
				bindings = ["%" + searchString + "%", params.tag];
			} else {
				sqlWhere = ["m.tags & ? == 0", "LIKE(?, m.body)", "m.tags & ?"];
				bindings = [trashTagId, "%" + searchString + "%", params.tag];
			}
		} else {
			sqlWhere = ["m.tags & ? == 0", "LIKE(?, m.body)"];
			bindings = [trashTagId, "%" + searchString + "%"]
		}

		/*
			params.id -> WHERE dialogId = ?
			params.tag -> WHERE tag &
		*/

		this._dbLink.readTransaction(function(tx) {
			tx.executeSql("SELECT \
							(CASE m.chatid WHEN 0 THEN ('0_' || m.uid) ELSE m.chatid END) AS id, m.title, m.status, m.body, m.date, m.uid, m.mid, m.tags, c.first_name, c.last_name \
							FROM pm_" + userId + " AS m \
							JOIN \
								contacts_" + userId + " AS c \
								ON c.uid = m.uid \
							WHERE " + sqlWhere.join(" AND ") + "\
							GROUP BY m.mid \
							ORDER BY m.mid DESC", bindings, function(tx, resultSet) {
				var i, len,
					total = resultSet.rows.length,
					output = [];

				for (i = startFrom, len = startFrom + 20; i < len; i++) {
					if (i + 1 > total) {
						break;
					}

					output.push(resultSet.rows.item(i));
				}

				fnSuccess(output, total);
			}, function(tx, err) {
				if (typeof fnFail === "function") {
					fnFail(err.message);
				}
			});
		});
	},

	/**
	 * Запись данных в общий лог
	 *
	 * @param {String} data
	 * @param {String} level
	 */
	log: function(data, level) {
		this._meta.insert("log", {
			data: data,
			ts: Date.now(),
			level: level
		}, _.noop);
	},

	/**
	 * Выборка всех записей из лога
	 *
	 * @param {Function} fnSuccess принимает {Array} массив записей из лога, готовых к отправке, отсортированных по дате
	 * @param {Function} fnFail текст ошибки
	 */
	collectLogData: function(fnSuccess, fnFail) {
		this._dbLink.readTransaction(function(tx) {
			tx.executeSql("SELECT * FROM log ORDER BY rowid", [], function(tx, resultSet) {
				var logRecords = [],
					i, item, date,
					timeDiff, timeLast;

				for (i = 0; i < resultSet.rows.length; i++) {
					item = resultSet.rows.item(i);
					date = new Date(item.ts);

					if (i === 0) {
						logRecords.push("[" + date + "] " + item.data);
					} else {
						timeDiff = item.ts - timeLast;
						logRecords.push("[" + date + " +" + timeDiff + "ms] " + item.data);
					}

					timeLast = item.ts;
				}

				fnSuccess(logRecords);
			}, function(tx, err) {
				if (typeof fnFail === "function") {
					fnFail(err.message);
				}
			});
		});
	},

	_dbLink: null,
	_userId: null,

	_conn: {},
	_meta: null
};
