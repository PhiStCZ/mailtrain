'use strict';

const moment = require('moment');
const config = require('./config');
const { LogTypeId } = require('../../shared/activity-log');
const { hashEmail } = require('./helpers');
const mvisApi = require('./mvis-api');

let activityQueue = [];
let activityQueue2 = [];

const logSensitiveUserData = config.get('mvis.logSensitiveUserData');
const eventsPath = '/api/events';

const activityQueueLengthThreshold = 100;
const activityQueueTimeoutMs = 1000;

let processQueueIsRunning = false;
let lastProcess = new Date();

async function processQueue() {
    if (activityQueue.length == 0 || processQueueIsRunning) {
        return;
    }

    processQueueIsRunning = true;
    lastProcess = new Date();

    // the switch is to prevent data loss when activityQueue
    // is written to before returning from the axios.post
    [activityQueue2, activityQueue] = [activityQueue, activityQueue2];

    if (eventsPath) {
        await mvisApi.post(eventsPath, { data: activityQueue2 });
    }

    activityQueue2.splice(0);
    processQueueIsRunning = false;
}

async function _logActivity(typeId, data) {
    data.typeId = typeId;
    data.timestamp = moment.utc().toISOString();
    activityQueue.push(data);

    if (activityQueue.length >= activityQueueLengthThreshold) {
        // noinspection ES6MissingAwait
        processQueue();
    }
}

function _assignActor(context, data) {
    // if the data's actor is already filled, then that data has more priority and won't be overwritten
    if (!data.actor && context && context.user && context.user.id) {
        data.actor = context.user.id;
    }
}

/**
 * Log a general activity of an entity. The context will include the user who made the activity (the actor).
 * @param context only needed for actor assignment; may be null for no actor
 * @param entityTypeId
 * @param activityType defined in ../../shared/activity-log.js
 * @param entityId
 * @param extraData different entity types may accept different extra data
 */
async function logEntityActivity(context, entityTypeId, activityType, entityId, extraData = {}) {
    _assignActor(context, extraData);
    const data = {
        ...extraData,
        activityType,
        entityId
    };

    await _logActivity(entityTypeId, data);
}


async function logBlacklistActivity(context, activityType, email) {
    const data = {
        type: activityType,
        email
    };
    _assignActor(context, data);

    await _logActivity(LogTypeId.BLACKLIST, data);
}

async function logSettingsActivity(context) {
    const data = {};
    _assignActor(context, data);
    await _logActivity(LogTypeId.SETTINGS, data);
}

async function logShareActivity(context, entityTypeId, entityId, userId, role) {
    const data = {
        userId,
        entityTypeId,
        entityId,
        role
    };
    _assignActor(context, data);
    await _logActivity(LogTypeId.SHARE, data);
}


/**
 * Log campaign tracker activity.
 * @param activityType
 * @param campaignId
 * @param listid
 * @param subscriptionId
 * @param extraData possible keys: { linkId, ip, country, deviceType, triggerId }
 */
async function logCampaignTrackerActivity(activityType, campaignId, listId, subscriptionId, extraData = {}) {
    const data = {
        ...extraData,
        activityType,
        listId,
        subscriptionId,
        campaignId,
    };
    if (!logSensitiveUserData) {
        delete data.ip;
        delete data.country;
        delete data.deviceType;
    }

    await _logActivity(LogTypeId.CAMPAIGN_TRACKER, data);
}

/**
 * Log list tracker activity. If email is entered, email hash is automatically deduced.
 * @param activityType
 * @param listId
 * @param subscriptionId
 * @param extraData possible keys: { isTest, subscriptionStatus, previousSubscriptionStatus, email }
 */
async function logListTrackerActivity(activityType, listId, subscriptionId, extraData = {}) {
    if (extraData.email) {
        extraData.emailHash = hashEmail(extraData.email);
    }

    const data = {
        ...extraData,
        activityType,
        subscriptionId,
        listId,
    };
    if (!logSensitiveUserData) {
        delete data.email;
    }

    await _logActivity(LogTypeId.LIST_TRACKER, data);
}


function periodicLog() {
    // if a queue limit was reached recently, chances are we don't need extra logs from timeout
    if ((new Date() - lastProcess) >= activityQueueTimeoutMs / 2) {
        // noinspection ES6MissingAwait
        processQueue();
    }

    setTimeout(periodicLog, activityQueueTimeoutMs);
}

periodicLog();

module.exports.logBlacklistActivity = logBlacklistActivity;
module.exports.logCampaignTrackerActivity = logCampaignTrackerActivity;
module.exports.logEntityActivity = logEntityActivity;
module.exports.logListTrackerActivity = logListTrackerActivity;
module.exports.logShareActivity = logShareActivity;
module.exports.logSettingsActivity = logSettingsActivity;
