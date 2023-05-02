'use strict';

const activityLog = require('../lib/activity-log');
const { LogTypeId, EntityActivityType, ListActivityType } = require('../../../shared/activity-log');

const log = require('../../ivis-core/server/lib/log');
const knex = require('../../ivis-core/server/lib/knex');
const moment = require('moment');
const config = require('../../ivis-core/server/lib/config');
const jobs = require('../../ivis-core/server/models/jobs');
const { removeJobByName, createJobByName } = require('../lib/helpers');
const { BuiltinTaskNames } = require('../../shared/builtin-tasks');
const { getBuiltinTask } = require('../../ivis-core/server/models/builtin-tasks');
const { JobState } = require('../../ivis-core/shared/jobs');

const listSubscriptions = require('./list-subscriptions');
const listTracker = require('./list-tracker');
const listActivity = require('./list-activity');

function jobName(listId) {
    return `List ${listId} processing job`;
}

function jobNameToListId(jobName) {
    return parseInt(jobName.split(' ')[1]);
}

async function createJob(context, listId, listTrackerSigSet, creationTimestamp = null) {
    const task = await getBuiltinTask(BuiltinTaskNames.LIST);
    const job = {
        name: jobName(listId),
        description: '',
        namespace: config.mailtrain.namespace,
        task: task.id,
        state: JobState.ENABLED,
        params: {
            listId,
            creationTimestamp: creationTimestamp || '',
            listTracker: listTrackerSigSet.cid,
            listSubscriptionsCid: listSubscriptions.signalSetCid(listId)
        },
        signal_sets_triggers: [
            listTrackerSigSet.id
        ],
        min_gap: 60,    // 1 minute
        trigger: null,
        delay: null,
    };
    const jobId = await createJobByName(context, job, true);

    // the job will initialize the list subscriptions signal set
    await jobs.run(context, jobId);

    return jobId;
}

async function removeJob(context, listId) {
    await removeJobByName(context, jobName(listId));
}

async function getLastRecord(context, listId) {
    const listSubsId = await knex('signal_sets').where('cid', signalSetCid(listId)).select('id').first();
    if (!listSubsId) {
        return null;
    }

    const lastListSubsEntries = await signalSets.query(context, [{
        params: {},
        sigSetCid: signalSetCid(ListId),
        docs: {
            signals: [ 'subscribed' ],
            limit: 1,
            sort: [{ sigCid: 'timestamp', order: 'desc' }]
        }
    }]);

    const lastEntry = lastListSubsEntries[0].docs;

    if (lastEntry.length == 0) {
        return null;
    }

    return lastEntry[0];
}

async function onCreateList(context, listId, creationTimestamp = null) {
    await listActivity.createSignalSet(context, listId);
    const tracker = await listTracker.createListTracker(context, listId);
    await createJob(context, listId, tracker, creationTimestamp);
}

async function onRemoveList(context, listId) {
    await removeJob(context, listId);
    await listTracker.removeListTracker(context, listId);
    await listActivity.removeSignalSet(context, listId);
}

async function init() {
    activityLog.on(LogTypeId.LIST_TRACKER, async (context, events) => {
        const eventsByListId = activityLog.groupEventsByField(events, 'listId');

        await listTracker.addListTrackerEvents(context, eventsByListId);
    });

    activityLog.before(LogTypeId.LIST, async (context, events) => {
        for (const event of events) {
            const listId = event.entityId;
            if (event.activityType === EntityActivityType.CREATE) {
                await onCreateList(context, listId, event.timestamp);
            }
        }
    });

    activityLog.on(LogTypeId.LIST, async (context, events) => {
        const eventsByListId = activityLog.groupEventsByField(events, 'entityId');

        for (const [listId, events] of eventsByListId.entries()) {
            const signalSet = await listActivity.getSignalSet(context, listId);
            await activityLog.transformAndStoreEvents(context, events, signalSet, listActivity.signalSetSchema);
        }
    });

    activityLog.after(LogTypeId.LIST, async (context, events) => {
        for (const event of events) {
            const listId = event.entityId;
            if (event.activityType === EntityActivityType.REMOVE) {
                await onRemoveList(context, listId);
            }
        }
    });
}

async function synchronize(context, listsData) {
    listTracker.purgeCache();

    const toDelete = new Set();
    const jobs = await knex('jobs').whereRaw(`name LIKE '${jobName('%')}'`).select('name');
    for (const job of jobs) {
        toDelete.add(jobNameToListId(job.name));
    }
    let sigSets;
    sigSets = await knex('signal_sets').whereRaw(`cid LIKE '${listActivity.signalSetCid('%')}'`).select('cid');
    for (const sigSet of sigSets) {
        toDelete.add(listActivity.signalSetCidToListId(sigSet.cid));
    }
    sigSets = await knex('signal_sets').whereRaw(`cid LIKE '${listTracker.listTrackerCid('%')}'`).select('cid');
    for (const sigSet of sigSets) {
        toDelete.add(listTracker.signalSetCidToListId(sigSet.cid));
    }


    for (const list of listsData) {
        const lastRecord = getLastRecord(context, list.id);
        const lastSubs = lastRecord && lastRecord.subscribed ? lastRecord.subscribed : 0;
        if (list.subscribers == lastSubs) continue;

        log.verbose('Synchronization', `synchronizing list ${list.id} data`);
        toDelete.delete(list.id);
        await onCreateList(context, list.id);
        const listEvents = new Map();
        listEvents.set(list.id, [{
            timestamp: moment.utc().toISOString(),
            activityType: ListActivityType.SYNCHRONIZE,
            subscribers: list.subscribers
        }]);
        await listTracker.addListTrackerEvents(context, listEvents);
    }
    for (const listId of toDelete.values()) {
        log.verbose('Synchronization', `removing list ${listId} data`);
        await onRemoveList(context, listId);
    }
}

module.exports.init = init;
module.exports.synchronize = synchronize;
