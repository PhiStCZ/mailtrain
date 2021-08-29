'use strict';

const moment = require('moment');
const config = require('config');
const axios = require('axios').default;

const APIToken = config.get('mvis.apiToken');
const activityQueueLengthThreshold = 1; // 100;
const activityQueueTimeoutMs = 1000;
const activityQueue = [];

// load Token from config too... how to save it? script?
const apiUrlBase = config.get('mvis.apiUrlBase');
const apiurl = `${apiUrlBase}/api/events?global_access_token=${APIToken}`;

let processQueueIsRunning = false;

async function processQueue() {
    if (processQueueIsRunning) {
        return;
    }

    processQueueIsRunning = true;

    console.log('logging data:')
    console.log(JSON.stringify(activityQueue))
    if (apiurl) {
        try {
            await axios.post(apiurl, { data: activityQueue });
        } catch (e) {
            console.log('failure to send activity-log data');
        }
        // thats all i guess? think about how to prevent writing to activityQueue between this and the splice
    }

    activityQueue.splice(0);

    processQueueIsRunning = false;
}

async function _logActivity(typeId, data) {
    activityQueue.push({
        typeId,
        data,
        timestamp: moment.utc().toISOString()
    });

    if (activityQueue.length >= activityQueueLengthThreshold) {
        // noinspection ES6MissingAwait
        processQueue();
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

async function logBlacklistActivity(activityType, email) {
    const data = {
        type: activityType,
        email
    };

    await _logActivity('blacklist', data);
}

module.exports.logEntityActivity = logEntityActivity;
module.exports.logBlacklistActivity = logBlacklistActivity;
module.exports.logCampaignTrackerActivity = logCampaignTrackerActivity;