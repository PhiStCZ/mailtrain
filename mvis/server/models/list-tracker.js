'use strict';

const config = require('../../ivis-core/server/lib/config');
const knex = require('../../ivis-core/server/lib/knex');
const signalSets = require('../../ivis-core/server/models/signal-sets');
const activityLog = require('../lib/activity-log');
const { SignalType } = require('../../ivis-core/shared/signals');
const log = require('../../ivis-core/server/lib/log');

const { getSignalSetWithSigMapIfExists, removeSignalSetIfExists } = require('../lib/helpers');

function listTrackerCid(listId) {
    return `list_tracker_${listId}`;
}

function signalSetCidToListId(cid) {
    return parseInt(cid.substring('list_tracker_'.length));
}

const listTrackerSchema = {
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
    subscriptionId: {
        type: SignalType.INTEGER,
        name: 'Subscription ID',
        settings: {},
        indexed: true,
        weight_list: 2,
        weight_edit: 2
    },
    isTest: {
        type: SignalType.BOOLEAN,
        name: 'Is a Test User',
        settings: {},
        indexed: false,
        weight_list: 3,
        weight_edit: 3
    },
    subscriptionStatus: {
        type: SignalType.INTEGER,
        name: 'Subscription Status',
        settings: {},
        indexed: true,
        weight_list: 4,
        weight_edit: 4
    },
    previousSubscriptionStatus: {
        type: SignalType.INTEGER,
        name: 'Previous Subscription Status',
        settings: {},
        indexed: true,
        weight_list: 5,
        weight_edit: 5
    },
    emailHash: {
        type: SignalType.TEXT,
        name: 'Hashed Email Address',
        settings: {},
        indexed: true,
        weight_list: 6,
        weight_edit: 6
    },
    email: {
        type: SignalType.TEXT,
        name: 'Email Address',
        settings: {},
        indexed: true,
        weight_list: 7,
        weight_edit: 7
    },
    // it's possible to add other trackable data (in mailtrain/server/subscriptions.js/createTxWithGroupedFieldsMap() - ip, country, timezone = subscription.tz)
    subscribers: {
        type: SignalType.INTEGER,
        name: 'Synchronization Subscriber Count',
        settings: {},
        indexed: true,
        weight_list: 8,
        weight_edit: 8
    },
};


/** Indicates that a signal set was searched for but wasn't found. */
const CACHED_NONEXISTENT = -1;

const listTrackersByListId = new Map();

async function createListTracker(context, listId) {
    const existing = await getSignalSetWithSigMapIfExists(context, listTrackerCid(listId));
    if (existing) {
        listTrackersByListId.set(listId, existing);
        return existing;
    }

    const signalSetWithSignalCidMap = await signalSets.ensure(
        context,
        {
            cid: listTrackerCid(listId),
            name: `List ${listId} Tracker`,
            description: '',
            namespace: config.mailtrain.namespace,
        },
        listTrackerSchema
    );

    listTrackersByListId.set(listId, signalSetWithSignalCidMap);
    return signalSetWithSignalCidMap;
}

async function getCachedListTracker(context, listId) {
    const cached = listTrackersByListId.get(listId);
    if (cached === CACHED_NONEXISTENT) {
        return null;
    } else if (cached) {
        return cached;
    }

    return await knex.transaction(async tx => {
        const signalSet = await tx('signal_sets').where('cid', listTrackerCid(listId)).first();
        if (!signalSet) {
            listTrackersByListId.set(listId, CACHED_NONEXISTENT);
            return null;
        }
        const signalByCidMap = await signalSets.getSignalByCidMapTx(tx, signalSet);
        signalSet.signalByCidMap = signalByCidMap;

        listTrackersByListId.set(listId, signalSet);
        return signalSet;
    });
}

async function removeListTracker(context, listId) {
    await removeSignalSetIfExists(context, listTrackerCid(listId));
    listTrackersByListId.set(listId, CACHED_NONEXISTENT);
}

async function addListTrackerEvents(context, eventsByListId) {
    for (const [id, events] of eventsByListId.entries()) {
        const trackerSigSet = await getCachedListTracker(context, id);
        if (trackerSigSet) {
            await activityLog.transformAndStoreEvents(context, events, trackerSigSet, listTrackerSchema);
        } else {
            log.warn('Activity-log', 'Unrecognised list with id ' + id);
        }
    }
}

function purgeCache() {
    listTrackersByListId.clear();
}

module.exports = {
    listTrackerCid,
    signalSetCidToListId,
    createListTracker,
    getCachedListTracker,
    removeListTracker,
    addListTrackerEvents,
    purgeCache
};
