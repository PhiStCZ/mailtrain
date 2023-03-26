'use strict';

const config = require('../../ivis-core/server/lib/config');
const knex = require('../../ivis-core/server/lib/knex');
const signalSets = require('../../ivis-core/server/models/signal-sets');
const activityLog = require('../lib/activity-log');
const { SignalType } = require('../../ivis-core/shared/signals');
const log = require('../../ivis-core/server/lib/log');


function campaignTrackerCid(campaignId) {
    return `campaign_tracker_${campaignId}`;
}

const campaignTrackerSchema = {
    timestamp: {
        type: SignalType.DATE_TIME,
        name: 'Timestamp',
        settings: {},
        indexed: true,
        weight_list: 0,
        weight_edit: 0
    },
    activityType: {
        type: SignalType.INTEGER,
        name: 'Activity Type',
        settings: {},
        indexed: true,
        weight_list: 1,
        weight_edit: 1
    },
    listId: {
        type: SignalType.INTEGER,
        name: 'List ID',
        settings: {},
        indexed: true,
        weight_list: 2,
        weight_edit: 2
    },
    subscriptionId: {
        type: SignalType.INTEGER,
        name: 'Subscription ID',
        settings: {},
        indexed: true,
        weight_list: 3,
        weight_edit: 3
    },
    linkId: {
        type: SignalType.INTEGER,
        name: 'Link ID',
        settings: {},
        indexed: true,
        weight_list: 4,
        weight_edit: 4
    },
    triggerId: {
        type: SignalType.INTEGER,
        name: 'Trigger ID',
        settings: {},
        indexed: true,
        weight_list: 5,
        weight_edit: 5
    },
    country: {
        type: SignalType.TEXT,
        name: 'Country',
        settings: {},
        indexed: true,
        weight_list: 6,
        weight_edit: 6
    },
    deviceType: {
        type: SignalType.TEXT,
        name: 'Device Type',
        settings: {},
        indexed: true,
        weight_list: 7,
        weight_edit: 7
    },
};

/** Indicates that a signal set was searched for but wasn't found. */
const CACHED_NONEXISTENT = -1;

const campaignTrackersByCampaignId = new Map();

async function createCampaignTracker(context, campaignId) {
    const signalSetWithSignalCidMap = await signalSets.ensure(
        context,
        {
            cid: campaignTrackerCid(campaignId),
            name: `Campaign ${campaignId} tracker`,
            description: '',
            namespace: config.mailtrain.namespace,
        },
        campaignTrackerSchema
    );

    campaignTrackersByCampaignId.set(campaignId, signalSetWithSignalCidMap);
    return signalSetWithSignalCidMap;
}

async function getCachedCampaignTracker(context, campaignId) {
    const cached = campaignTrackersByCampaignId.get(campaignId);
    if (cached === CACHED_NONEXISTENT) {
        return null;
    } else if (cached) {
        return cached;
    }

    return await knex.transaction(async tx => {
        const signalSet = await tx('signal_sets').where('cid', campaignTrackerCid(campaignId)).first();
        if (!signalSet) {
            campaignTrackersByCampaignId.set(campaignId, CACHED_NONEXISTENT);
            return null;
        }
        const signalByCidMap = await signalSets.getSignalByCidMapTx(tx, signalSet);
        signalSet.signalByCidMap = signalByCidMap;

        campaignTrackersByCampaignId.set(campaignId, signalSet);
        return signalSet;
    });
}

async function removeCampaignTracker(context, campaignId) {
    await signalSets.removeByCid(context, campaignTrackerCid(campaignId));
    campaignTrackersByCampaignId.set(campaignId, CACHED_NONEXISTENT);
}


async function addCampaignTrackerEvents(context, eventsByCampaignId) {
    for (const [campaignId, campaignEvents] of eventsByCampaignId.entries()) {
        const campaignTracker = await getCachedCampaignTracker(context, campaignId);
        if (campaignTracker) {
            await activityLog.transformAndStoreEvents(context, campaignEvents, campaignTracker, campaignTrackerSchema);
        } else {
            log.warn('Activity-log', 'Unrecognised campaign with id ' + campaignId);
        }
    }
}

module.exports = {
    campaignTrackerCid,
    createCampaignTracker,
    getCachedCampaignTracker,
    removeCampaignTracker,
    addCampaignTrackerEvents,
};
