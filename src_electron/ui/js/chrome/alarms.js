'use strict';

/**
 * chrome.alarms API port
 *
 * Alarm objects are stored inside "alarms" object store.
 * @periodic: bool
 * @periodInMinutes: int
 * @lastFired: date
 * @name: string
 *
 * @see https://developer.chrome.com/apps/alarms
 *
 */
import assert from 'assert';
import {openMeta} from '../idb';

const OBJ_STORE_NAME = 'alarms';
const onAlarmListeners = new Set;
const scheduledAlarmIds = new Set;

const fireAlarm = async (alarm) => {
    const now = new Date;

    // run onAlarm callbacks
    for (let cb of onAlarmListeners) {
        const scheduledTime = alarm.lastFired;
        scheduledTime.setMinutes(scheduledTime.getMinutes() + alarm.periodInMinutes);

        cb({
            scheduledTime,
            name: alarm.name,
            periodInMinutes: alarm.periodInMinutes
        });
    }

    const conn = await openMeta();

    // if alarm is not periodical remove it from database
    // otherwise upsert lastFired property and schedule next run
    if (alarm.periodic) {
        alarm.lastFired = now;
        await conn.upsert(OBJ_STORE_NAME, alarm);

        setTimeout(fireAlarm, alarm.periodInMinutes * 60 * 1000, alarm);
    } else {
        await conn.delete(OBJ_STORE_NAME, alarm.name);
    }
};

const clearExistingScheduledAlarms = () => {
    for (timeoutId of scheduledAlarmIds) {
        clearTimeout(timeoutId);
    }

    scheduledAlarmIds.clear();
};

const initAlarmsFromScratch = async () => {
    clearExistingScheduledAlarms();

    const conn = await openMeta();
    const alarms = await conn.get(OBJ_STORE_NAME);
    const now = new Date;

    for (let {value: alarm} of alarms) {
        // fire event for outdated alarms
        const scheduledTime = alarm.lastFired;
        scheduledTime.setMinutes(scheduledTime.getMinutes() + alarm.periodInMinutes);

        if (now > scheduledTime) {
            setTimeout(fireAlarm, now - scheduledTime, alarm);
        } else {
            fireAlarm(alarm);
        }
    }
};

const create = async (name, alarmInfo) => {
    if (typeof name === 'object') {
        alarmInfo = name;
        name = '';
    }

    const now = new Date;
    const alarmObj = {
        name,
        periodic: false,
        periodInMinutes: 0,
        lastFired: now
    };

    if (alarmInfo.periodInMinutes) {
        alarmObj.periodic = true;
        alarmObj.periodInMinutes = alarmInfo.periodInMinutes;
    }

    // calc lastFired field value from `when` and `delayInMinutes`
    if (alarmInfo.when || alarmInfo.delayInMinutes) {
        let scheduledTime;

        if (alarmInfo.when) {
            // the exact "when to fire" time is known
            scheduledTime = new Date(alarmInfo.when);
        } else {
            // schedule alarm to run after alarmInfo.delayInMinutes
            scheduledTime = new Date;
            scheduledTime.setMinutes(scheduledTime.getMinutes() + alarmInfo.delayInMinutes);
        }

        if (alarmInfo.periodInMinutes) {
            alarmObj.lastFired = scheduledTime;
            alarmObj.lastFired.setMinutes(alarmObj.lastFired.getMinutes() - alarmInfo.periodInMinutes);
        } else {
            alarmInfo.periodInMinutes = Math.round(scheduledTime - now) / 60 / 1000;
        }
    } else {
        assert(alarmObj.periodic, 'Non-periodical alarms should have either `when` or `delayInMinutes` properties set');
    }

    const conn = await openMeta();
    await conn.upsert(OBJ_STORE_NAME, alarmObj);

    // re-initialize alarms listening process
    await initAlarmsFromScratch();
};

const get = (name, cb) => {
    openMeta()
        .then(conn => conn.get(OBJ_STORE_NAME, {
            range: IDBKeyRange.only(name)
        }))
        .then(records => {
            cb(records.length ? records[0].value : null);
        });
};

const getAll = (cb) => {
    openMeta()
        .then(conn => conn.get(OBJ_STORE_NAME))
        .then(records => cb(records));
};

const clear = (name, cb) => {
    openMeta
        .then(conn => conn.delete(OBJ_STORE_NAME, name))
        .then(() => cb(true))
        .catch(() => cb(false));
};

const clearAll = (cb) => {
    openMeta()
        .then(conn => conn.clear(OBJ_STORE_NAME))
        .then(() => cb(true))
        .catch(() => cb(false));
};

const onAlarm = {
    async addListener(cb) {
        onAlarmListeners.add(cb);
        await initAlarmsFromScratch();
    }
};

export default {
    create,
    get,
    getAll,
    clear,
    clearAll,
    onAlarm
}
