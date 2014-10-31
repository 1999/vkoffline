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

function getMessageFulltext(msgBody) {
	return msgBody.replace(/<br\s?\/?\s?>/g, " ").toLowerCase().split(" ").filter(function (word) {
		return word.length >= 3;
	});
}

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
						// let it be
						if (err.message.indexOf("no such table") !== -1) {
							resolve([]);
							return;
						}

						reject(err.message);
					});
				});
			});
		}

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
							var uid = Number(record.uid);

							contacts[record.uid] = {
								uid: uid,
								first_name: record.first_name,
								last_name: record.last_name,
								notes: record.notes,
								last_message_ts: 0,
								messages_num: 0,
								fulltext: [
									record.first_name.toLowerCase(),
									record.last_name.toLowerCase(),
									uid
								]
							};

							if (otherData.domain) {
								contacts[record.uid].fulltext.push(otherData.domain.toLowerCase());
							}

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

							var otherData = validateJSONString(record.other_data, Object);
							var hasEmoji = Boolean(otherData.emoji);

							messages[record.mid] = {
								mid: Number(record.mid),
								uid: userId,
								title: record.title,
								body: record.body,
								date: record.date,
								read: Boolean(record.status),
								attachments: attachments,
								tags: tags,
								has_emoji: hasEmoji,
								chat: chatId,
								fulltext: getMessageFulltext(record.body)
							};

							if (userId == uid || tags.indexOf("inbox") === -1) {
								return;
							}

							if (!contacts[userId]) {
								console.warn("No contact with such id: %s", userId);
								return;
							}

							contacts[userId].messages_num += 1;
							contacts[userId].last_message_ts = Math.max(contacts[userId].last_message_ts, record.date);
						});

						console.log("Start inserting data with uid %s", uid);

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
					messagesStore.createIndex("chat_messages", "chat"); // get all chat messages sorted by date
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
	 * @param {Function} fnSuccess принимает:
	 *     {Array} массив объектов-контактов
	 *     {Number} общее количество контактов
	 * @param {Function} fnFail принимает:
	 *     {String} errorMessage
	 */
	getContactList: function DatabaseManager_getContactList(outputType, startFrom, fnSuccess, fnFail) {
		var userId = this._userId;
		var conn = this._conn[userId];

		function countContacts() {
			return new Promise(function (resolve, reject) {
				conn.count("contacts", function (err, total) {
					if (err) {
						reject(err);
					} else {
						resolve(total);
					}
				});
			});
		}

		function getContacts() {
			var indexName;
			var direction;

			switch (outputType) {
				case "alpha":
					indexName = "name";
					direction = sklad.ASC;
					break;

				case "lastdate":
					indexName = "last_message";
					direction = sklad.DESC;
					break;

				case "messagesnum":
					indexName = "messages_num";
					direction = sklad.DESC;
					break;
			}

			return new Promise(function (resolve, reject) {
				conn.get("contacts", {
					index: indexName,
					limit: 30,
					offset: startFrom,
					direction: direction
				}, function (err, data) {
					if (err) {
						reject(err);
					} else {
						resolve(data.map(function (msgData) {
							return msgData.value;
						}));
					}
				});
			});
		}

		Promise.all([
			getContacts(),
			countContacts()
		]).then(fnSuccess, function (err) {
			fnFail(err.name + ": " + err.message);
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

		fnSuccess = fnSuccess || _.noop;
		fnFail = fnFail || _.noop;

		this._conn[userId].get("contacts", {
			range: IDBKeyRange.only(searchUserId)
		}, function (err, records) {
			if (err) {
				fnFail(err.name + ": " + err.message);
				return;
			}

			if (!records.length) {
				fnFail(null);
				return;
			}

			fnSuccess(records[0].value);
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
			return new vow.Promise(function (resolve, reject) {
				conn.get("chats", {
					index: "last_message",
					offset: startFrom,
					direction: sklad.DESC,
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
			return new vow.Promise(function (resolve, reject) {
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
			return new Promise(function (resolve, reject) {
				conn.get("contacts", {
					range: IDBKeyRange.only(id)
				}, function (err, records) {
					if (err) {
						reject(err.name + ": " + err.message);
					} else if (!records.length) {
						console.warn("No such contact: " + id);
						resolve(null);
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
			return new Promise(function (resolve, reject) {
				conn.get("messages", {
					index: "chat_participants",
					direction: sklad.ASC_UNIQUE,
					range: IDBKeyRange.bound([record.id], [record.id, Date.now()]),
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

						Promise.all(promises).then(function (res) {
							record.participants = _.compact(res);

							if (currentUserIsParticipant) {
								record.participants.push({uid: userId});
							}

							resolve();
						}, function (err) {
							record.participants = [];
							resolve();
						});
					}
				});
			});
		}

		function getChatLastMessage(record) {
			return new Promise(function (resolve, reject) {
				conn.get("messages", {
					index: "chat_messages",
					range: IDBKeyRange.only(record.id),
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
			return new Promise(function (resolve, reject) {
				conn.count("messages", {
					index: "chat_messages",
					range: IDBKeyRange.only(record.id),
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
			var fillDataPromises = [];
			var output = res.chats.map(function (record) {
				var chatData = {
					id: record.value.id,
					title: record.value.title,
					date: record.value.last_message_ts
				};

				fillDataPromises.push(getChatParticipants(chatData));
				fillDataPromises.push(getChatLastMessage(chatData));
				fillDataPromises.push(getChatTotalMessages(chatData));

				return chatData;
			});

			Promise.all(fillDataPromises).then(function () {
				fnSuccess([
					output,
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
		var userId = this._userId;
		var conn = this._conn[userId];

		uid = Number(uid);

		function getContactById(id) {
			return new Promise(function (resolve, reject) {
				conn.get("contacts", {
					range: IDBKeyRange.only(id)
				}, function (err, records) {
					if (err) {
						reject(err);
					} else if (!records.length) {
						resolve(null);
					} else {
						resolve({
							uid: records[0].key,
							first_name: records[0].value.first_name,
							last_name: records[0].value.last_name
						});
					}
				});
			});
		}

		function getChatParticipants(record) {
			return new Promise(function (resolve, reject) {
				var chatId = record.id;
				var to = chatId.substr(0, chatId.length - 1) + String.fromCharCode(chatId.charCodeAt(chatId.length - 1) + 1);
				var range = IDBKeyRange.bound([chatId], [to], true, true);

				conn.get("messages", {
					index: "chat_participants",
					range: range,
					direction: sklad.ASC_UNIQUE
				}, function (err, records) {
					if (err) {
						reject(err);
					} else {
						var promises = [];
						records.forEach(function (record) {
							promises.push(getContactById(record.value.uid));
						});

						Promise.all(promises).then(function (res) {
							record.participants = _.compact(res);
							resolve();
						}, reject);
					}
				});
			});
		}

		function getChatLastMessage(record) {
			return new Promise(function (resolve, reject) {
				conn.get("messages", {
					index: "chat_messages",
					range: IDBKeyRange.only(record.id),
					direction: sklad.DESC
				}, function (err, records) {
					if (err) {
						reject(err);
					} else {
						var title = records.length ? records[0].value.title : '';
						var body = records.length ? records[0].value.body : '';
						var date = records.length ? records[0].value.date : 0;
						var uid = records.length ? records[0].value.uid : userId;

						_.assign(record, {
							title: title,
							body: body,
							date: date,
							uid: uid
						});

						resolve();
					}
				});
			});
		}

		function countChatMessages(record) {
			return new Promise(function (resolve, reject) {
				conn.count("messages", {
					index: "chat_messages",
					range: IDBKeyRange.only(record.id)
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

		conn.get("messages", {
			index: "user_chats",
			range: IDBKeyRange.bound([uid], [uid + 1], true, true),
			direction: sklad.ASC_UNIQUE
		}, function (err, records) {
			if (err) {
				fnFail(err.name + ": " + err.message);
				return;
			}

			var output = [];
			var promises = [];

			records.forEach(function (record) {
				var chatRecord = {
					id: record.key[1]
				};

				output.push(chatRecord);

				promises.push(getChatLastMessage(chatRecord));
				promises.push(getChatParticipants(chatRecord));
				promises.push(countChatMessages(chatRecord));
			});

			Promise.all(promises).then(function () {
				// sort chats
				output.sort(function (a, b) {
					return b.date - a.date;
				});

				fnSuccess(output);
			}, function (err) {
				fnFail(err.name + ": " + err.message);
			});
		});
	},

	/**
	 * Получение сообщений из диалога
	 *
	 * @param {String} dialogId идентификатор диалога: [\d]+ в случае чата, 0_[\d]+ в случае переписки один на один
	 * @param {Integer|Null} from с какой записи нужно все получить
	 * @param {Function} fnSuccess принимает:
	 *     {Array} сообщения
	 *     {Number} количество сообщений в диалоге
	 * @param {Function} fnFail принимает:
	 *     {String} строка ошибки
	 */
	getDialogThread: function DatabaseManager_getDialogThread(dialogId, from, fnSuccess, fnFail) {
		var userId = this._userId;
		var conn = this._conn[userId];

		function getContactById(id) {
			return new vow.Promise(function (resolve, reject) {
				conn.get("contacts", {
					range: IDBKeyRange.only(id)
				}, function (err, records) {
					if (err) {
						reject(err);
					} else if (!records.length) {
						resolve(null);
					} else {
						resolve({
							uid: records[0].key,
							first_name: records[0].value.first_name,
							last_name: records[0].value.last_name
						});
					}
				});
			});
		}

		function countChatMessages() {
			return new vow.Promise(function (resolve, reject) {
				conn.count("messages", {
					index: "chat_messages",
					range: IDBKeyRange.only(dialogId)
				}, function (err, total) {
					if (err) {
						reject(err);
					} else {
						resolve(total);
					}
				});
			});
		}

		function getChatMessages() {
			return new vow.Promise(function (resolve, reject) {
				conn.get("messages", {
					index: "chat_messages",
					range: IDBKeyRange.only(dialogId),
					direction: sklad.DESC,
					offset: from,
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

		vow.all({
			messages: getChatMessages(),
			total: countChatMessages()
		}).then(function (res) {
			var total = res.total;
			var promises = {};
			var output = [];

			res.messages.reverse().forEach(function (record) {
				output.push({
					mid: record.value.mid,
					title: record.value.title,
					body: record.value.body,
					date: record.value.date,
					status: Number(record.value.read),
					uid: record.value.uid,
					tags: record.value.tags,
					has_emoji: record.value.has_emoji,
					attachments: record.value.attachments
				});

				if (!promises[record.value.uid] && record.value.uid != userId) {
					promises[record.value.uid] = getContactById(record.value.uid);
				}
			});

			vow.all(promises).then(function (res) {
				output.forEach(function (message) {
					if (!res[message.uid]) {
						return;
					}

					message.first_name = res[message.uid].first_name;
					message.last_name = res[message.uid].last_name;
				});

				fnSuccess([
					output,
					total
				]);
			}, function (err) {
				fnFail(err.name + ": " + err.message);
			});
		}, function (err) {
			fnFail(err.name + ": " + err.message);
		});
	},

	/**
	 * @param {Integer} mid
	 * @param {Function} fnSuccess принимает параметр {Object}
	 * @param {Function} fnFail принимает параметры {Boolean} isDatabaseError и {String} errorMessage
	 */
	getMessageById: function DatabaseManager_getMessageById(mid, fnSuccess, fnFail) {
		var userId = this._userId;

		this._conn[userId].get("messages", {
			range: IDBKeyRange.only(mid)
		}, function (err, records) {
			if (err) {
				fnFail(true, err.name + ": " + err.message);
				return;
			}

			if (!records.length) {
				fnFail(false, "No message with ID #" + mid);
				return;
			}

			fnSuccess(records[0].value);
		});
	},

	/**
	 * Внесение и обновление контактов
	 *
	 * @param {Number} userId
	 * @param {Array} data массив из массивов вида [uid, firstName, lastName, otherData, oldNames, notes]
	 * @return {Promise}
	 */
	replaceContacts: function DatabaseManager_replaceContacts(userId, data) {
		var conn = this._conn[userId];

		return new Promise(function (resolve, reject) {
			var searchOpts = {};
			var uids = data.map(function (userData) {
				return Number(userData.uid);
			});

			if (uids.length > 1) {
				searchOpts.range = IDBKeyRange.only(uids[0]);
			} else {
				searchOpts.index = "messages_num";
				searchOpts.range = IDBKeyRange.lowerBound(1);
			}

			conn.get("contacts", searchOpts, function (err, records) {
				if (err) {
					reject(err);
				} else {
					var currentContacts = {};
					records.forEach(function (record) {
						if (uids.indexOf(record.value.uid) !== -1) {
							currentContacts[record.value.uid] = record.value;
						}
					});

					var upsertContacts = data.map(function (userData) {
						var otherData = userData[3];
						var uid = Number(userData[0]);

						var contact = {
							uid: uid,
							first_name: userData[1],
							last_name: userData[2],
							notes: "",
							fulltext: [
								userData[1].toLowerCase(),
								userData[2].toLowerCase(),
								uid
							]
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
							contact.fulltext.push(otherData.domain.toLowerCase());
						}

						contact.last_message_ts = currentContacts[uid] ? currentContacts[uid].last_message_ts : 0;
						contact.messages_num = currentContacts[uid] ? currentContacts[uid].messages_num : 0;

						return contact;
					});

					conn.upsert({
						contacts: upsertContacts
					}, function (err) {
						if (err) {
							reject(err);
						} else {
							resolve(upsertContacts);
						}
					});
				}
			});
		});
	},

	/**
	 * Внесение сообщений.
	 * Есть интересная особенность API ВКонтакте: метод messages.get не поддерживает сортировку и отдает сперва самые новые сообщения.
	 *
	 * @param {Number} currentUserId ID аккаунта, для которого заносятся сообщения
	 * @param {Array} messages - сообщения-объекты с ключами (mid, uid, date, title, body, read_state, attachments, chat_id, tags, emoji)
	 * @param {Function} fnSuccess
	 * @param {Function} fnFail
	 */
	insertMessages: function DatabaseManager_insertMessages(currentUserId, messages, fnSuccess, fnFail) {
		var chats = {};
		var messagesToInsert = [];

		messages.forEach(function (message) {
			var chatId = message.chat_id ? String(message.chat_id) : "0_" + message.uid;

			// chat should be inserted only once
			if (!chats[chatId]) {
				chats[chatId] = {
					id: chatId,
					title: message.title,
					last_message_ts: message.date
				};
			}

			var msgData = {
				mid: Number(message.mid),
				uid: Number(message.uid),
				title: message.title,
				body: message.body,
				date: message.date,
				read: Boolean(message.read_state),
				chat: chatId,
				attachments: validateJSONString(message.attachments, Array),
				tags: message.tags,
				has_emoji: Boolean(message.emoji),
				fulltext: getMessageFulltext(message.body)
			};

			if (message.important) {
				msgData.tags.push("important");
			}

			if (message.deleted) {
				msgData.tags.push("trash");
			}

			messagesToInsert.push(msgData);
		});

		this._conn[currentUserId].upsert({
			chats: _.values(chats),
			messages: messagesToInsert
		}, function (err) {
			if (err) {
				fnFail(err.name + ": " + err.message);
				return;
			}

			fnSuccess();
		});
	},

	/**
	 * Actualize chats' dates
	 * @return {Promise}
	 */
	actualizeChatDates: function DatabaseManager_actualizeChatDates() {
		var userId = this._userId;
		var conn = this._conn[userId];

		return new Promise(function (resolve, reject) {
			conn.get("messages", {
				index: "chat_messages",
				direction: sklad.DESC_UNIQUE
			}, function (err, records) {
				if (err) {
					reject(err.name + ": " + err.message);
					return;
				}

				var upsertData = records.map(function (record) {
					return {
						id: record.key,
						title: record.value.title,
						last_message_ts: record.value.date
					};
				});

				conn.upsert({
					chats: upsertData
				}, function (err) {
					if (err) {
						reject(err.name + ": " + err.message);
						return;
					}

					resolve();
				});
			});
		});
	},

	actualizeContacts: function DatabaseManager_actualizeContacts() {
		var userId = this._userId;
		var conn = this._conn[userId];

		return new Promise(function (resolve, reject) {
			conn.get({
				messages: null,
				contacts: null
			}, function (err, records) {
				if (err) {
					reject(err.name + ": " + err.message);
					return;
				}

				var contacts = {};
				records.contacts.forEach(function (contact) {
					contacts[contact.key] = contact.value;

					contacts[contact.key].last_message_ts = 0;
					contacts[contact.key].messages_num = 0;
				});

				records.messages.forEach(function (message) {
					if (message.value.uid == userId || message.value.tags.indexOf("inbox") === -1) {
						return;
					}

					if (!contacts[message.value.uid]) {
						console.warn("No contact with such id: %s", message.value.uid);
						return;
					}

					contacts[message.value.uid].last_message_ts = Math.max(contacts[message.value.uid].last_message_ts, message.value.date);
					contacts[message.value.uid].messages_num += 1;
				});

				conn.upsert({
					contacts: _.values(contacts)
				}, function (err) {
					if (err) {
						reject(err.name + ": " + err.message);
						return;
					}

					resolve();
				});
			});
		});
	},

	/**
	 * @param {Integer} msgId
	 * @param {Function} fnSuccess принимает {Void}
	 * @param {Function} fnFail принимает {String} errorMessage
	 */
	markAsRead: function DatabaseManager_markAsRead(msgId, fnSuccess, fnFail) {
		var userId = this._userId;
		var conn = this._conn[userId];

		conn.get("messages", {
			range: IDBKeyRange.only(Number(msgId))
		}, function (err, records) {
			if (err) {
				fnFail(err.name + ": " + err.message);
				return;
			}

			if (!records.length) {
				fnSuccess && fnSuccess();
				return;
			}

			var message = records[0].value;
			message.read = true;

			conn.upsert("messages", message, function (err) {
				if (err) {
					fnFail(err.name + ": " + err.message);
					return;
				}

				fnSuccess && fnSuccess();
			});
		});
	},

	/**
	 * @param {Integer} msgId
	 * @param {Function} fnSuccess принимает {Void}
	 * @param {Function} fnFail принимает {String} errorMessage
	 */
	markAsUnread: function DatabaseManager_markAsUnread(msgId, fnSuccess, fnFail) {
		var userId = this._userId;
		var conn = this._conn[userId];

		conn.get("messages", {
			range: IDBKeyRange.only(Number(msgId))
		}, function (err, records) {
			if (err) {
				fnFail(err.name + ": " + err.message);
				return;
			}

			if (!records.length) {
				fnSuccess && fnSuccess();
				return;
			}

			var message = records[0].value;
			message.read = false;

			conn.upsert("messages", message, function (err) {
				if (err) {
					fnFail(err.name + ": " + err.message);
					return;
				}

				fnSuccess && fnSuccess();
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
			range: IDBKeyRange.only(Number(msgId))
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
			range: IDBKeyRange.only(Number(msgId))
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
		this._conn[userId].delete("messages", Number(msgId), fn);
	},

	/**
	 * Получение частоты использования тэгов
	 * @param {Function} fnSuccess принимает {Object} объект freq
	 * @param {Function} fnFail принимает {String} errorMessage
	 */
	getTagsCount: function DatabaseManager_getTagsCount(fnSuccess, fnFail) {
		var userId = this._userId;
		var conn = this._conn[userId];

		function countTagOccurrences(tag) {
			return new vow.Promise(function (resolve, reject) {
				conn.count("messages", {
					index: "tag",
					range: IDBKeyRange.only(tag)
				}, function (err, total) {
					if (err) {
						reject(err);
					} else {
						resolve(total);
					}
				});
			});
		}

		conn.get("messages", {
			index: "tag",
			direction: sklad.ASC_UNIQUE
		}, function (err, records) {
			if (err) {
				fnFail(err.name + ": " + err.message);
				return;
			}

			var promises = {};
			records.forEach(function (record) {
				promises[record.key] = countTagOccurrences(record.key);
			});

			vow.all(promises).then(fnSuccess, function (err) {
				fnFail(err.name + ": " + err.message);
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
		var userId = this._userId;
		var conn = this._conn[userId];

		function countTagMessages() {
			return new vow.Promise(function (resolve, reject) {
				conn.count("messages", {
					index: "tag",
					range: IDBKeyRange.only(tag)
				}, function (err, total) {
					if (err) {
						reject(err);
					} else {
						resolve(total);
					}
				});
			});
		}

		function getContactData(message) {
			return new Promise(function (resolve, reject) {
				conn.get("contacts", {
					range: IDBKeyRange.only(message.uid)
				}, function (err, records) {
					if (err) {
						reject(err);
					} else {
						message.first_name = records.length ? records[0].value.first_name : "Not";
						message.last_name = records.length ? records[0].value.last_name : "Found";

						resolve();
					}
				});
			});
		}

		function getTagMessages() {
			return new vow.Promise(function (resolve, reject) {
				conn.get("messages", {
					index: "tag",
					range: IDBKeyRange.only(tag),
					direction: sklad.DESC,
					offset: startFrom,
					limit: 20
				}, function (err, records) {
					if (err) {
						reject(err);
					} else {
						var promises = [];
						var output = [];

						records.forEach(function (record) {
							var message = {
								id: record.value.chat,
								title: record.value.title,
								body: record.value.body,
								date: record.value.date,
								uid: record.value.uid,
								mid: record.value.mid,
								tags: record.value.tags,
								status: Number(record.value.read)
							};

							output.push(message);
							promises.push(getContactData(message));
						});

						Promise.all(promises).then(function () {
							resolve(output);
						}, reject);
					}
				});
			});
		}

		vow.all([
			getTagMessages(),
			countTagMessages()
		]).then(fnSuccess, function (err) {
			fnFail(err.name + ": " + err.message);
		});
	},

	/**
	 * Поиск контактов
	 *
	 * @param {String} q
	 * @param {Number} startFrom
	 * @param {Function} fnSuccess принимает:
	 *     {Array} массив объектов-контактов
	 *     {Number} общее количество найденных контактов
	 * @param {Function} fnFail принимает:
	 *     {String} errorMessage
	 */
	searchContact: function DatabaseManager_searchContact(q, startFrom, fnSuccess, fnFail) {
		q = q.toLowerCase();

		var userId = this._userId;
		var conn = this._conn[userId];
		var to = q.substr(0, q.length - 1) + String.fromCharCode(q.charCodeAt(q.length - 1) + 1);
		var range = IDBKeyRange.bound(q, to, false, true);

		function countContacts() {
			return new Promise(function (resolve, reject) {
				conn.count("contacts", {
					index: "fulltext",
					range: range
				}, function (err, total) {
					if (err) {
						reject(err)
					} else {
						resolve(total);
					}
				});
			});
		}

		function searchContacts() {
			return new Promise(function (resolve, reject) {
				conn.get("contacts", {
					index: "fulltext",
					range: range,
					offset: startFrom,
					limi: 20
				}, function (err, records) {
					if (err) {
						reject(err)
					} else {
						resolve(records.map(function (record) {
							return record.value;
						}));
					}
				});
			});
		}

		Promise.all([
			searchContacts(),
			countContacts()
		]).then(function (res) {
			fnSuccess.apply(null, res);
		}, function (err) {
			fnFail(err.name + ": " + err.message);
		});
	},

	/**
	 * Поиск писем
	 * @param {Object} params
	 * @param {String} q
	 * @param {Number} startFrom
	 * @param {Function} fnSuccess принимает:
	 *     {Array} массив сообщений
	 *     {Number} общее количество найденных сообщений
	 * @param {Function} fnFail принимает:
	 *     {String} текст ошибки
	 */
	searchMail: function DatabaseManager_searchMail(params, q, startFrom, fnSuccess, fnFail) {
		q = q.toLowerCase();

		var userId = this._userId;
		var conn = this._conn[userId];
		var to = q.substr(0, q.length - 1) + String.fromCharCode(q.charCodeAt(q.length - 1) + 1);
		var range = IDBKeyRange.bound(q, to, false, true);

		function countMessages() {
			return new vow.Promise(function (resolve, reject) {
				conn.count("messages", {
					index: "fulltext",
					range: range
				}, function (err, total) {
					if (err) {
						reject(err);
					} else {
						resolve(total)
					}
				});
			});
		}

		function getMessages() {
			return new vow.Promise(function (resolve, reject) {
				conn.get("messages", {
					index: "fulltext",
					range: range,
					offset: startFrom,
					limit: 20,
					direction: sklad.DESC
				}, function (err, records) {
					if (err) {
						reject(err);
					} else {
						resolve(records);
					}
				});
			});
		}

		function getContactById(record) {
			return new vow.Promise(function (resolve, reject) {
				conn.get("contacts", {
					range: IDBKeyRange.only(record.uid)
				}, function (err, records) {
					if (err) {
						reject(err);
					} else if (!records.length) {
						resolve();
					} else {
						record.first_name = records[0].value.first_name;
						record.last_name = records[0].value.last_name;

						resolve();
					}
				});
			});
		}

		/*
			FIXME: was dropped in 4.11
			params.id -> WHERE dialogId = ?
			params.tag -> WHERE tag &
		 */
		vow.all({
			total: countMessages(),
			messages: getMessages()
		}).then(function (res) {
			var total = res.total;
			var promises = [];
			var output = [];

			res.messages.forEach(function (record) {
				var message = {
					id: record.value.chat,
					mid: record.value.mid,
					uid: record.value.uid,
					title: record.value.title,
					body: record.value.body,
					status: Number(record.value.read),
					date: record.value.date,
					tags: record.value.tags
				};

				if (message.uid != userId) {
					promises.push(getContactById(message));
				}

				output.push(message);
			});

			Promise.all(promises).then(function () {
				fnSuccess(output, total);
			}, function (err) {
				fnFail(err.name + ": " + err.message);
			});
		}, function (err) {
			fnFail(err.name + ": " + err.message);
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
