'use strict';

const config = require('../../ivis-core/server/lib/config');
const jobs = require('../../ivis-core/server/models/jobs');
const { SignalType } = require('../../ivis-core/shared/signals');
const { removeJobByName } = require('../lib/helpers');
const { BuiltinTaskNames } = require('../../shared/builtin-tasks');
const { getBuiltinTask } = require('../../ivis-core/server/models/builtin-tasks');
const { JobState } = require('../../ivis-core/shared/jobs');


const signalSetSchema = {
    timestamp: {
        type: SignalType.DATE_TIME,
        name: 'Timestamp',
        settings: {},
        indexed: true,
        weight_list: 0,
        weight_edit: 0
    },
    subscribed: {
        type: SignalType.INTEGER,
        name: 'Subscribed',
        settings: {},
        indexed: false,
        weight_list: 1,
        weight_edit: 1
    },
    unsubscribed: {
        type: SignalType.INTEGER,
        name: 'Unsubscribed',
        settings: {},
        indexed: false,
        weight_list: 2,
        weight_edit: 2
    },
    bounced: {
        type: SignalType.INTEGER,
        name: 'Bounced',
        settings: {},
        indexed: false,
        weight_list: 3,
        weight_edit: 3
    },
    complained: {
        type: SignalType.INTEGER,
        name: 'Complained',
        settings: {},
        indexed: false,
        weight_list: 4,
        weight_edit: 4
    },
};

function signalSetCid(listId) {
    return `list_subscriptions_${listId}`;
}

function signalSetName(listId) {
    return `List ${listId} subscriptions`;
}

function jobName(listId) {
    return `List ${listId} subscriptions`;
}

async function createJob(context, listId, listTrackerSigSet, creationTimestamp) {
    const task = await getBuiltinTask(BuiltinTaskNames.LIST);
    const job = {
        name: jobName(listId),
        description: '',
        namespace: config.mailtrain.namespace,
        task: task.id,
        state: JobState.ENABLED,
        params: {
            listId,
            creationTimestamp,
            listTracker: listTrackerSigSet.cid,
            listSubscriptionsCid: signalSetCid(listId)
        },
        signal_sets_triggers: [
            listTrackerSigSet.id
        ],
        min_gap: 60,    // 1 minute
        trigger: null,
        delay: null,
    };
    const jobId = await jobs.create(context, job, true);

    // the job will initialize the list subscriptions signal set
    await jobs.run(context, jobId);

    return jobId;
}

async function removeJob(context, listId) {
    await removeJobByName(context, jobName(listId));
}


module.exports = {
    signalSetName,
    signalSetCid,
    jobName,
    createJob,
    removeJob,
};
