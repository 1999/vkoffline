'use strict';

import assert from 'assert';
import {v4 as uuid} from 'uuid';
import chrome from '../chrome';
import DatabaseManager from '../db';

// initialize chrome.runtime
chrome.runtime.init(false);

// One MailSyncBroadcaster for one user id
// If both "inbox" and "sent" messages are synced it's obsolete
// Which means that new MailSyncBroadcaster should be used for next sync op
const broadcasters = new Map;

/**
 * Special helper object which sends `syncProgress` when it's not full
 * and `ui` when object store with messages is synced
 */
class MailSyncBroadcaster {
    constructor(userId) {
        this._userId = userId;
        this._ops = {
            inbox: new Map,
            sent: new Map
        };

        this._total = {
            inbox: 0,
            sent: 0
        };

        // add this MailSyncBroadcaster to broadcasters map
        assert(!broadcasters.has(userId), `Broadcasters map already contains object with ${userId} user id`);
        broadcasters.set(userId, this);
    }

    /**
     * Schedule to insert messages array into the database
     *
     * @param {String} mailType
     * @param {Number} total
     * @param {Array} messages
     * @param {Boolean} isLastChunk
     */
    async scheduleInsertMessages(mailType, total, messages, isLastChunk) {
        const opId = uuid();
        const totalMessagesInOp = messages.length;

        this._ops[mailType].set(opId, {
            isLastChunk,
            totalMessages: totalMessagesInOp,
            finished: false
        });

        if (total) {
            this._total[mailType] = total;
        }

        try {
            const insertMessagesOp = new Promise((resolve, reject) => {
                DatabaseManager.insertMessages(this._userId, messages, resolve, reject);
            });

            await insertMessagesOp;
        } catch (err) {
            // TODO handle error
            throw err;
        }

        this._ops[mailType].set(opId, {
            isLastChunk,
            totalMessages: totalMessagesInOp,
            finished: true
        });

        this._broadcastProgress(mailType);
        this._checkIsFinished();
    }

    _broadcastProgress(mailType) {
        let messagesInserted = 0;
        for (let [, opData] of this._ops[mailType]) {
            messagesInserted += opData.totalMessages;
        }

        chrome.runtime.sendMessage({
            action: 'syncProgress',
            userId: this._userId,
            type: mailType,
            total: this._total[mailType],
            current: messagesInserted
        });
    }

    _checkIsFinished() {
        // dataSyncedFn = function() {
        //         var inboxSynced, sentSynced, friendsSynced,
        //             wallTokenUpdated;

        //         StorageManager.set(permKey, 1);

        //         inboxSynced = (StorageManager.get("perm_inbox_" + currentUserId) !== null);
        //         sentSynced = (StorageManager.get("perm_outbox_" + currentUserId) !== null);
        //         friendsSynced = (StorageManager.get("friends_sync_time", {constructor: Object, strict: true, create: true})[currentUserId] !== undefined);

        //         if (AccountsManager.currentUserId === currentUserId) {
        //             // если к этому моменту вся почта синхронизирована и друзья тоже, то перерисовываем фронт
        //             if (inboxSynced && sentSynced && friendsSynced) {
        //                 // сбрасываем счетчик синхронизации
        //                 clearSyncingDataCounters(currentUserId);

        //                 // маленькое замечение: после того как аккаунт мигрирован с 3 на 4 версию, стартует startUserSession()
        //                 // она запускает mailSync(), что в свою очередь породит перерисовку фронта на "ui" => "user"
        //                 // чтобы защититься от этого проверяем, был ли обновлен токен
        //                 wallTokenUpdated = (StorageManager.get("wall_token_updated", {constructor: Object, strict: true, create: true})[AccountsManager.currentUserId] !== undefined);
        //                 if (wallTokenUpdated) {
        //                     Promise.all([
        //                         DatabaseManager.actualizeContacts(currentUserId),
        //                         DatabaseManager.actualizeChatDates(currentUserId)
        //                     ]).then(function () {
        //                         chrome.runtime.sendMessage({
        //                             action: "ui",
        //                             which: "user",
        //                             currentUserId: AccountsManager.currentUserId,
        //                             currentUserFio: AccountsManager.current ? AccountsManager.current.fio : null
        //                         });
        //                     });
        //                 }
        //             }
        //         }
        //     };
    }

    _markObsolete() {
        assert(broadcasters.has(this._userId), `Broadcasters map is missing obsolete object with ${this._userId} user id`);
        broadcasters.delete(this._userId);
    }
}

export function insertMessagesAndBroadcastProgress(userId, mailType, messages, total, isLastChunk) {
    const broadcaster = broadcasters.has(userId)
        ? broadcasters.get(userId)
        : new MailSyncBroadcaster(userId);

    broadcaster.scheduleInsertMessages(mailType, total, messages, isLastChunk);
};

export function processResponseMessages({response}, mailType, latestStoredMessageId = 0) {
    const messages = [];
    let total;
    let isLastChunk = false;

    // got everything
    if (response === 0 || (Array.isArray(response) && response.length === 1)) {
        isLastChunk = true;
    } else {
        total = response[0];

        for (let msgData of response.slice(1)) {
            if (msgData.mid <= latestStoredMessageId) {
                isLastChunk = true;
                break;
            }

            msgData.attachments = msgData.attachments || [];

            // treat geodata as attachment
            if (msgData.geo && msgData.geo.type === 'point') {
                const coords = msgData.geo.coordinates.split(' ');

                msgData.attachments.push({
                    type: 'geopoint',
                    geopoint: {
                        lat: coords[0],
                        lng: coords[1]
                    }
                });
            }

            msgData.chat_id = msgData.chat_id || 0;
            msgData.tags = [mailType];

            if (msgData.attachments.length) {
                msgData.tags.push('attachments');
            }

            messages.push(msgData);
        }
    }

    return {messages, total, isLastChunk};
};
