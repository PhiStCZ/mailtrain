'use strict';

const moment = require('moment');
const config = require('config');
const axios = require('axios').default;

const activityLog = require('../../shared/activity-log');
// global access token is loaded from config
// TODO: generate and save a token during installation
const APIToken = config.get('mvis.apiToken');
const activityQueueLengthThreshold = 1; // 100;
const activityQueueTimeoutMs = 1000;
const activityQueue = [];

const apiUrlBase = config.get('mvis.apiUrlBase');
const apiurl = `${apiUrlBase}/api/events?global_access_token=${APIToken}`;

let processQueueIsRunning = false;

async function processQueue() {
    if (processQueueIsRunning) {
        return;
    }

    processQueueIsRunning = true;

    // TODO: remove the console.logs when done debugging
    console.log('logging data:')
    console.log(JSON.stringify(activityQueue))
    if (apiurl) {
        try {
            await axios.post(apiurl, { data: activityQueue });
        } catch (e) {
            console.log('failure to send activity-log data');
        }
        // thats all i guess? think about how to prevent a race condition
        // when writing to activityQueue between this and the splice
    }

    activityQueue.splice(0);

    processQueueIsRunning = false;
}

async function _logActivity(typeId, data) {
    // TODO: add time check requirement (using SetTimeout?)

    // if (activityQueue.length == 0) firstInsertTime = getMs();
    activityQueue.push({
        typeId,
        data,
        timestamp: moment.utc().toISOString()
    });

    // if ( length >= threshold || (activityQueue.length >= 0 && firstInsertTime + activityQueueTimeoutMs < getMs())) {
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

/*
Extra data:

campaign:
- status : CampaignStatus

list:
- subscriptionId
- subscriptionStatus : SubscriptionStatus
- fieldId
- segmentId
- importId
- importStatus : ImportStatus
*/
async function logEntityActivity(entityTypeId, activityType, entityId, extraData = {}) {
    const data = {
        ...extraData,
        type: activityType,
        entity: entityId
    };

    await _logActivity(entityTypeId, data);
}

async function logEntityActivityWithContext(context, entityTypeId, activityType, entityId, extraData = {}) {
    _assignIssuedBy(context, extraData);
    logEntityActivity(entityTypeId, activityType, entityId, extraData);
}



async function logCampaignTrackerActivity(activityType, campaignId, listId, subscriptionId, extraData = {}) {
    const data = {
        ...extraData,
        type: activityType,
        campaign: campaignId,
        list: listId,
        subscription: subscriptionId
    };

    await _logActivity('campaign_tracker', data);
}

async function logBlacklistActivity(context, activityType, email) {
    const data = {
        type: activityType,
        email
    };
    _assignIssuedBy(context, data);

    await _logActivity('blacklist', data);
}

async function logShareActivity(context, entityTypeId, entityId, userId, role) {
    const data = {
        userId,
        entityTypeId,
        entityId,
        role
    };
    _assignIssuedBy(context, data);
    await _logActivity('share', data);
}

async function logSettingsActivity(context) {
    const data = {};
    _assignIssuedBy(context, data);
    await _logActivity('settings', data);
}

const listLogNoGlobal = [
    activityLog.ListActivityType.CREATE_SUBSCRIPTION,
    activityLog.ListActivityType.REMOVE_SUBSCRIPTION,
    activityLog.ListActivityType.UPDATE_SUBSCRIPTION,
    activityLog.ListActivityType.SUBSCRIPTION_STATUS_CHANGE
];

/**
 * Allowed extra data:
 * - subscriptionId
 * - subscriptionStatus : SubscriptionStatus
 * - fieldId
 * - segmentId
 * - importId
 * - importStatus : ImportStatus
 */
async function logListActivity(context, activityType, listId, extraData = {}) {
    // if activityType is subscription-add/remove/change, log only to the list signal set
    // otherwise, log both to list sigset and global list sigset
    await logEntityActivityWithContext(context, 'list', activityType, listId, extraData);
    if (listLogNoGlobal.includes(activityType)) {
        // also log in global index ... ?
    }
}

module.exports.logBlacklistActivity = logBlacklistActivity;
module.exports.logCampaignTrackerActivity = logCampaignTrackerActivity;
module.exports.logEntityActivity = logEntityActivity;
module.exports.logEntityActivityWithContext = logEntityActivityWithContext;
module.exports.logListActivity = logListActivity;
module.exports.logShareActivity = logShareActivity;
module.exports.logSettingsActivity = logSettingsActivity;