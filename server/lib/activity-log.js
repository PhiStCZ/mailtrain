'use strict';

const moment = require('moment');
const config = require('config');
const axios = require('axios').default;

const apiToken = require('./mvis').apiToken;
const activityQueueLengthThreshold = 100;
const activityQueueTimeoutMs = 1000;
const logSensitiveUserData = config.get('mvis.logSensitiveUserData');
const { LogTypeId } = require('../../shared/activity-log');

let activityQueue = [];
let activityQueue2 = [];

const apiUrlBase = config.get('mvis.apiUrlBase');
const apiurl = `${apiUrlBase}/api/events?global_access_token=${apiToken}`;

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

    if (apiurl) {
        await axios.post(apiurl, { data: activityQueue2 });
    }

    activityQueue2.splice(0);
    processQueueIsRunning = false;
}

async function _logActivity(typeId, data, extraIds = {}) {
    activityQueue.push({
        ...extraIds,
        typeId,
        data,
        timestamp: moment.utc().toISOString()
    });

    if (activityQueue.length >= activityQueueLengthThreshold) {
        // noinspection ES6MissingAwait
        processQueue();
    }
}

function _assignIssuedBy(context, data) {
    // if the data's issued by is already filled, then that data has more priority and won't be overwritten
    if (data.issuedBy === undefined) {
        data.issuedBy = context.user.id;
    }
}


async function logEntityActivity(entityTypeId, activityType, entityId, extraData = {}) {
    const data = {
        ...extraData,
        activityType,
        entityId
    };

    await _logActivity(entityTypeId, data);
}

async function logEntityActivityWithContext(context, entityTypeId, activityType, entityId, extraData = {}) {
    _assignIssuedBy(context, extraData);
    logEntityActivity(entityTypeId, activityType, entityId, extraData);
}


async function logBlacklistActivity(context, activityType, email) {
    const data = {
        type: activityType,
        email
    };
    _assignIssuedBy(context, data);

    await _logActivity(LogTypeId.BLACKLIST, data);
}

async function logSettingsActivity(context) {
    const data = {};
    _assignIssuedBy(context, data);
    await _logActivity(LogTypeId.SETTINGS, data);
}

async function logShareActivity(context, entityTypeId, entityId, userId, role) {
    const data = {
        userId,
        entityTypeId,
        entityId,
        role
    };
    _assignIssuedBy(context, data);
    await _logActivity(LogTypeId.SHARE, data);
}


async function logCampaignTrackerActivity(activityType, campaignId, listId, subscriptionId, extraData = {}) {
    const data = {
        ...extraData,
        activityType,
        listId,
        subscriptionId
    };
    if (!logSensitiveUserData) {
        delete data.country;
        delete data.deviceType;
    }

    await _logActivity(LogTypeId.CAMPAIGN_TRACKER, data, {campaignId});
}

async function logListTrackerActivity(activityType, listId, subscriptionId, subscriptionStatus = undefined, previousSubscriptionStatus = undefined) {
    const data = {
        activityType,
        subscriptionId,
    };
    if (subscriptionStatus) {
        data.subscriptionStatus = subscriptionStatus;
    }
    if (previousSubscriptionStatus) {
        data.previousSubscriptionStatus = previousSubscriptionStatus;
    }

    await _logActivity(LogTypeId.LIST_TRACKER, data, {listId});
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
module.exports.logEntityActivityWithContext = logEntityActivityWithContext;
module.exports.logListTrackerActivity = logListTrackerActivity;
module.exports.logShareActivity = logShareActivity;
module.exports.logSettingsActivity = logSettingsActivity;
