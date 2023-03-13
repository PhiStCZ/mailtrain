'use strict';

const { LogTypeId } = require("../../../shared/activity-log");
const config = require('../../ivis-core/server/lib/config');
const knex = require('../../ivis-core/server/lib/knex');
const signalSets = require('../../ivis-core/server/models/signal-sets');
const activityLog = require('../lib/activity-log');
const { SignalType } = require('../../ivis-core/shared/signals');
const { LogTypeId, EntityActivityType } = require('../../../shared/activity-log');
const log = require('../../ivis-core/server/lib/log');


function listTrackerName(listId) {
    return `List Tracker ${listId}`;
}
function listTrackerCid(listId) {
    return `list_tracker_${listId}`;
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
    // TODO: other possibly trackable data (in mailtrain/server/subscriptions.js/createTxWithGroupedFieldsMap() - ip, country, timezone = subscription.tz)
};

const listTrackersByListId = new Map();

async function createListTracker(context, listId) {
    const signalSetWithSignalCidMap = await signalSets.ensure(
        context,
        {
            cid: listTrackerCid(listId),
            name: listTrackerName(listId),
            description: '',
            namespace: config.mailtrain.namespace,
        },
        campaignTrackerSchema
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
    await signalSets.removeByCid(context, listTrackerCid(listId));
    listTrackersByListId.set(listId, CACHED_NONEXISTENT);
}


async function onCreateList(context, listId, creationTimestamp) {
    // later have list-related workspace etc.
    await createListTracker(context, listId);
}

async function onRemoveList(context, listId) {
    await removeListTracker(context, listId);
}

async function init() {
    activityLog.on(LogTypeId.LIST_TRACKER, async (context, events) => {
        const eventsByListId = activityLog.groupEventsByField(events, 'listId');

        for (const [listId, listEvents] of eventsByListId.entries()) {
            const listTracker = await getCachedListTracker(context, listId);
            if (listTracker) {
                await activityLog.transformAndStoreEvents(context, listEvents, listTracker, listTrackerSchema);
            } else {
                // this may happen e.g. when a someone tries to unsubscribe from a deleted list, so it may not be as much of an error
                log.error('activity-log', 'Unrecognised list with id ' + listId);
            }
        }
    });

    activityLog.on(LogTypeId.LIST, async (context, events) => {
        for (const event of events) {
            const listId = event.entityId;
            const activity = event.activityType;
            if (activity === EntityActivityType.CREATE) {
                await onCreateList(context, listId, event.timestamp);
            } else if (activity === EntityActivityType.REMOVE) {
                await onRemoveList(context, listId);
            }
        }
    });
}

module.exports.init = init;
