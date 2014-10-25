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
	/**
	 * Drop every created database in case migration failed
	 */
	dropEverything: function DatabaseManager_dropEverything(uids, callback) {
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

	/**
	 * Migrate all WebDatabases into IndexedDB
	 */
	migrateWebDatabase: function DatabaseManager_migrateWebDatabase(uids, callback) {
		console.log("Migrate WebDatabase into IndexedDB");
		console.log("UIDS", uids);

		var that = this;
		var webDatabaseLink = window.openDatabase("vkoffline", "1.0.1", null, 0);

		function getAllWebDatabaseData(table, uid) {
			console.log("Collect data from %s_%s", table, uid);

			return new vow.Promise(function (resolve, reject) {
				webDatabaseLink.readTransaction(function (tx) {
					tx.executeSql("SELECT rowid, * FROM " + table + "_" + uid + " ORDER BY rowid", [], function (tx, resultSet) {
						var totalRecords = resultSet.rows.length;
						var output = [];

						console.log("%s records found in %s", totalRecords, table);

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
					console.log("User initialized");

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

							["photo", "bdate", "domain", "home_phone", "mobile_phone"].forEach(function (field) {
								if (otherData[field]) {
									contacts[record.uid][field] = otherData[field];
								}
							});

							if (otherData.sex) {
								contacts[record.uid].sex = Number(otherData.sex) || 0;
							}
						});

						fetchedMessages.forEach(function (record) {
							var isMultiChat = Boolean(record.chatid);
							var chatId = isMultiChat ? String(record.chatid) : "0_" + record.uid;
							var userId = Number(record.uid);
							var lastChatMessageDate = chats[chatId] ? chats[chatId].last_message_ts : 0;

							chats[chatId] = chats[chatId] || {};
							chats[chatId].id = chatId;
							chats[chatId].title = record.title;
							chats[chatId].last_message_ts = Math.max(record.date, lastChatMessageDate);

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
								chat: chatId
							};

							contacts[userId].messages_num += 1;
							contacts[userId].last_message_ts = Math.max(contacts[userId].last_message_ts, record.date);
						});

						// insert data
						that._conn[uid].insert({
							"chats": _.values(chats),
							"contacts": _.values(contacts),
							"messages": _.values(messages)
						}, function (err, insertedKeys) {
							if (err) {
								reject(err.name + ": " + err.message);
								return;
							}

							console.log("Contacts and PMs inserted");

							that._conn[uid].close();
							resolve();
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

	/**
	 * Create meta database with log object store
	 */
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
	initUser: function DatabaseManager_initUser(userId, fnSuccess, fnFail) {
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
					messagesStore.createIndex("user_chats", ["uid", "chat"]); // get all chats where user said smth
					messagesStore.createIndex("chat_participants", ["chat", "uid"]); // get all chat participants
					messagesStore.createIndex("chat_messages", ["chat", "date"]); // get all chat messages sorted by date
					messagesStore.createIndex("tag", "tags", {multiEntry: true});
					messagesStore.createIndex("fulltext", "fulltext", {multiEntry: true});

					var chatsStore = database.createObjectStore("chats", {keyPath: "id"});
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
	dropUser: function DatabaseManager_dropUser(userId) {
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
	getContactById: function DatabaseManager_getContactById(currentUserId, uid, fnSuccess, fnFail) {
		var userId = currentUserId;
		var searchUserId = Number(uid);

		this._conn[userId].get("contacts", {
			range: IDBKeyRange.only(searchUserId)
		}, function (err, data) {
			if (err) {
				fnFail(err.name + ": " + err.message);
				return;
			}

			fnSuccess(data.value);
		});
	},

	/**
	 * Get chats list ordered descending by date
	 * Need also to get chats' participants, chat id, title, date & body of the last message, total messages in chat
	 *
	 * @param {Number} startFrom
	 * @param {Function} fnSuccess which invokes {Array} with {Number} total chats number and {Array} chats data
	 * @param {Function} fnFail
	 */
	getConversations: function DatabaseManager_getConversations(startFrom, fnSuccess, fnFail) {
		var userId = this._userId;
		var conn = this._conn[userId];

		function getChatsList(startFrom) {
			return vow.Promise(function (resolve, reject) {
				conn.get("chats", {
					index: "last_message",
					offset: startFrom,
					limit: 30
				}, function (err, records) {
					if (err) {
						reject(err);
					} else {
						resolve(records);
					}
				});
			});
		}

		function getTotalChats() {
			return vow.Promise(function (resolve, reject) {
				conn.count("chats", function (err, total) {
					if (err) {
						reject(err);
					} else {
						resolve(total);
					}
				});
			});
		}

		function getContactById(id) {
			return vow.Promise(function (resolve, reject) {
				conn.get("contacts", {
					range: IDBKeyRange.only(id)
				}, function (err, records) {
					if (err) {
						reject(err.name + ": " + err.message);
					else if (!records.length) {
						reject("No such contact: " + id);
					} else {
						resolve({
							id: id,
							first_name: records[0].value.first_name,
							last_name: records[0].value.last_name
						});
					}
				});
			});
		}

		function getChatParticipants(record) {
			return vow.Promise(function (resolve, reject) {
				conn.get("messages", {
					index: "chat_participants",
					direction: sklad.ASC_UNIQUE
					range: IDBKeyRange.bound([record.id], Date.now())
				}, function (err, data) {
					if (err) {
						reject(err);
					} else {
						var promises = [];
						var currentUserIsParticipant = false;

						data.forEach(function (contact) {
							if (contact.value.uid == userId) {
								currentUserIsParticipant = true;
								return;
							}

							promises.push(getContactById(contact.value.uid));
						});

						vow.all(promises).then(function (res) {
							record.participants = res;

							if (currentUserIsParticipant) {
								record.participants.push({uid: userId});
							}

							resolve();
						}, function (err) {
							console.error(err);

							record.participants = [];
							resolve();
						});
					}
				});
			});
		}

		function getChatLastMessage(record) {
			return vow.Promise(function (resolve, reject) {
				conn.get("messages", {
					index: "chat_messages",
					range: IDBKeyRange.bound([record.id], Date.now()),
					direction: sklad.DESC,
					limit: 1
				}, function (err, records) {
					if (err) {
						reject(err);
					} else {
						record.body = records[0].value.body;
						record.uid = records[0].value.uid;

						resolve();
					}
				});
			});
		}

		function getChatTotalMessages(record) {
			return vow.Promise(function (resolve, reject) {
				conn.count("messages", {
					index: "chat_messages",
					range: IDBKeyRange.bound([record.id], Date.now())
				}, function (err, total) {
					if (err) {
						reject(err);
					} else {
						record.total = total;
						resolve();
					}
				});
			});
		}

		vow.all({
			chats: getChatsList(startFrom),
			total: getTotalChats()
		}).then(function (res) {
			var output = {};
			var fillDataPromises = [];

			res.chats.forEach(function (record) {
				output[record.value.id] = {
					id: record.value.id,
					title: record.value.title,
					date: record.value.last_message_ts
				};

				fillDataPromises.push(getChatParticipants(record));
				fillDataPromises.push(getChatLastMessage(record));
				fillDataPromises.push(getChatTotalMessages(record));
			});

			vow.all(fillDataPromises).then(function () {
				fnSuccess([
					_.values(output),
					res.total
				]);
			}, function (err) {
				fnFail(err.name + ": " + err.message);
			});
		}, function (err) {
			fnFail(err.name + ": " + err.message);
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
	getDialogThread: function(dialogId, from, fnSuccess, fnFail) {
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
	replaceContacts: function DatabaseManager_replaceContacts(userId, data, fnSuccess, fnFail, fnAfterwards) {
		var that = this;
		var callbacksAreFunctions = [(typeof fnSuccess === "function"), (typeof fnFail === "function"), (typeof fnAfterwards === "function")];
		var executedStatements = 0;

		function fn() {
			executedStatements += 1;
			if (executedStatements === data.length && callbacksAreFunctions[2]) {
				fnAfterwards();
			}
		};

		// it would be faster to insert all contacts using one transaction
		// but current UI should be updated after each contact is inserted
		// FIXME: should be changed afterwards
		data.forEach(function (userData) {
			var otherData = userData[3];
			var contact = {
				uid: Number(userData[0]),
				first_name: userData[1],
				last_name: userData[2],
				notes: "",
				last_message_ts: 0,
				messages_num: 0
			};

			if (otherData.photo) {
				contact.photo = otherData.photo;
			}

			if (otherData.bdate) {
				contact.bdate = otherData.bdate;
			}

			if (otherData.sex) {
				contact.sex = Number(otherData.sex) || 0;
			}

			if (otherData.domain) {
				contact.domain = otherData.domain;
			}

			that._conn[userId].upsert("contacts", contact, function (err, upsertedKey) {
				if (err) {
					if (callbacksAreFunctions[1]) {
						fnFail(userData[0], err.name + ": " + err.message);
					}

					fn();
					return;
				}

				if (callbacksAreFunctions[0]) {
					fnSuccess(contact);
				}

				fn();
			});
		});
	},

	/**
	 * Внесение сообщений
	 *
	 * @param {Number} currentUserId ID аккаунта, для которого заносятся сообщения
	 * @param {Object} data объект с ключами:
	 *     @param {Boolean} data.firstSync первая синхронизация или нет
	 *     @param {Array} data.messages массив сообщений-объектов с ключами (mid, uid, date, title, body, read_state, attachments, chat_id, tags)
	 * @param {Function} fnSuccess принимает
	 *     @param {Object} данные сообщения (копия элемента массива из первого параметра)
	 *     @param {Boolean} занесено ли сообщение в БД
	 * @param {Function} fnAfterwards принимает
	 *     @param {Number} количество успешно внесенных сообщений
	 *     @param {Number} количество фэйлов при занесении
	 */
	insertMessages: function(currentUserId, data, fnSuccess, fnAfterwards) {
		currentUserId = Number(currentUserId);

		// calculate new chats to be inserted / upserted
		var chats = {};
		data.forEach(function (msgData) {
			var chatTempId = msgData.chat_id || "0_" + msgData.uid;
			var uid = Number(msgData.uid);

			chats[chatTempId] = chats[chatTempId] || {};
			chats[chatTempId].participants = chats[chatTempId].participants || [];

			if (uid === currentUserId) {
				return;
			}

			if (chats[chatTempId].participants.indexOf(uid) === -1) {
				chats[chatTempId].participants(uid);
			}
		});

		// sklad.get("chats", {index: "contact", only: uid}) - once for this method
		// insert chat
		// chats[chatId] = chats[chatId] || {};
							// chats[chatId].title = record.title;
							// chats[chatId].last_message_ts = Math.max(record.date, lastChatMessageDate);

							// if (isMultiChat) {
							// 	chats[chatId].chat_id = Number(record.chatid);
							// }

							// chats[chatId].participants = chats[chatId].participants || [];
							// if (isMultiChat) {
							// 	if (userId !== currentUserId && chats[chatId].participants.indexOf(userId) === -1) {
							// 		chats[chatId].participants.push(userId);
							// 	}
							// } else {
							// 	// there should be only one person in chat
							// 	if (!chats[chatId].participants.length) {
							// 		chats[chatId].participants.push(userId);
							// 	}
							// }

	// insert message

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
	 * @param {Number} msgId ID сообщения
	 * @param {String} тэг
	 * @param {Function} fnSuccess принимает {Void}
	 * @param {Function} fnFail принимает {Boolean} isDatabaseError и {String} errorMessage
	 */
	markMessageWithTag: function DatabaseManager_markMessageWithTag(msgId, tag, fnSuccess, fnFail) {
		var userId = this._userId;
		var conn = this._conn[userId];

		conn.get("messages", {
			range: IDBKeyRange.only(msgId)
		}, function (err, records) {
			if (err) {
				fnFail(true, err.name + ": " + err.message);
				return;
			}

			if (!records.length) {
				fnFail(false, "No rows were affected when updating tags column (mid: " + msgId + ", tag: " + tag + ")");
				return;
			}

			var message = records[0].value;
			if (message.tags.indexOf(tag) !== -1) {
				fnFail(false, "No rows were affected when updating tags column (mid: " + msgId + ", tag: " + tag + ")");
				return;
			}

			message.tags.push(tag);
			conn.upsert("messages", message, function (err) {
				if (err) {
					fnFail(true, err.name + ": " + err.message);
					return;
				}

				fnSuccess();
			});
		});
	},

	/**
	 * Удаление метки с сообщения
	 * @param {Number} msgId ID сообщения
	 * @param {String} тэг
	 * @param {Function} fnSuccess принимает {Void}
	 * @param {Function} fnFail принимает {Boolean} isDatabaseError и {String} errorMessage
	 */
	unmarkMessageWithTag: function DatabaseManager_unmarkMessageWithTag(msgId, tag, fnSuccess, fnFail) {
		var userId = this._userId;
		var conn = this._conn[userId];

		conn.get("messages", {
			range: IDBKeyRange.only(msgId)
		}, function (err, records) {
			if (err) {
				fnFail(true, err.name + ": " + err.message);
				return;
			}

			if (!records.length) {
				fnFail(false, "No rows were affected when updating tags column (mid: " + msgId + ", tag: " + tag + ")");
				return;
			}

			var message = records[0].value;
			var tagIndex = message.tags.indexOf(tag);

			if (tagIndex === -1) {
				fnFail(false, "No rows were affected when updating tags column (mid: " + msgId + ", tag: " + tag + ")");
				return;
			}

			message.tags.splice(tagIndex, 1);
			conn.upsert("messages", message, function (err) {
				if (err) {
					fnFail(true, err.name + ": " + err.message);
					return;
				}

				fnSuccess();
			});
		});
	},

	/**
	 * Полное удаление сообщения из БД
	 * @param {Integer} msgId ID сообщения
	 * @param {Function} fn
	 */
	deleteMessage: function DatabaseManager_deleteMessage(msgId, fn) {
		var userId = this._userId;

		// проблема здесь - рассинхронизация messages и chats.last_message_ts
		this._conn[userId].delete("messages", msgId, fn);
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
	log: function DatabaseManager_log(data, level) {
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
	collectLogData: function DatabaseManager_collectLogData(fnSuccess, fnFail) {
		this._meta.get("log", function (err, records) {
			if (err) {
				fnFail(err.name + ": " + err.message);
				return;
			}

			var timeLast = 0;
			var logRecords = records.map(function (record, i) {
				var item = record.value;
				var date = new Date(item.ts);

				var timeDiff = item.ts - timeLast;
				timeLast = item.ts;

				return (i > 0)
					? "[" + date + " +" + timeDiff + "ms] " + item.data
					: "[" + date + "] " + item.data;
			});

			fnSuccess(logRecords);
		});
	},

	_dbLink: null,
	_userId: null,

	_conn: {},
	_meta: null
};
