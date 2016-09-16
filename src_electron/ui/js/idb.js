'use strict';

import sklad from 'sklad/es2015';

const dbUserConnections = new Map;
let dbConnectionMeta;

export const openMeta = async () => {
    dbConnectionMeta = dbConnectionMeta || await sklad.open('metadata', {
        version: 1,
        migration: {
            '1': (database) => {
                // object store for logs
                database.createObjectStore('log', {autoIncrement: true});

                // object store for simple localStorage-like data
                // which was previously managed by StorageManager
                database.createObjectStore('keyvalues', {keyPath: 'key'});

                // object store for app specific meta information
                database.createObjectStore('meta', {keyPath: 'key'});

                // object store for chrome.alarms
                database.createObjectStore('alarms', {keyPath: 'name'});
            }
        }
    });

    return dbConnectionMeta;
};

export const openUser = async (userId) => {
    if (!dbUserConnections.has(userId)) {
        const conn = await sklad.open(`db_${userId}`, {
            version: 1,
            migration: {
                '1': (database) => {
                    const contactsStore = database.createObjectStore('contacts', {keyPath: 'uid'});
                    contactsStore.createIndex('last_message', 'last_message_ts');
                    contactsStore.createIndex('messages_num', 'messages_num');
                    contactsStore.createIndex('name', ['first_name', 'last_name']);
                    contactsStore.createIndex('fulltext', 'fulltext', {multiEntry: true});

                    const messagesStore = database.createObjectStore('messages', {keyPath: 'mid'});
                    messagesStore.createIndex('user_chats', ['uid', 'chat']); // get all chats where user said smth
                    messagesStore.createIndex('user_messages', 'uid'); // get all user messages
                    messagesStore.createIndex('chat_participants', ['chat', 'uid']); // get all chat participants
                    messagesStore.createIndex('chat_messages', 'chat'); // get all chat messages sorted by date
                    messagesStore.createIndex('tag', 'tags', {multiEntry: true});
                    messagesStore.createIndex('fulltext', 'fulltext', {multiEntry: true});

                    const chatsStore = database.createObjectStore('chats', {keyPath: 'id'});
                    chatsStore.createIndex('last_message', 'last_message_ts');
                }
            }
        });

        dbUserConnections.set(userId, conn);
    }

    return dbUserConnections.get(userId);
};

export const dropUser = async (userId) => {
    return await sklad.deleteDatabase(`db_${userId}`);
};
