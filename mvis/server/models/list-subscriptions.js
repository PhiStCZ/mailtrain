'use strict';

const config = require('../../ivis-core/server/lib/config');
const jobs = require('../../ivis-core/server/models/jobs');
const panels = require('../../ivis-core/server/models/panels');
const { SignalType } = require('../../ivis-core/shared/signals');
const { removePanelByName, removeJobByName } = require('../lib/helpers');
const { BuiltinTemplateIds } = require('../../shared/builtin-templates');
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

function panelName(listId) {
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
        trigger: null,  // no automatic trigger
        min_gap: 60,    // 1 minute
        delay: 60,      // 1 minute
    };
    const jobId = await jobs.create(context, job, true);

    // the job will initialize the list subscriptions signal set
    await jobs.run(context, jobId);

    return jobId;
}

async function removeJob(context, listId) {
    await removeJobByName(context, jobName(listId));
}


async function createPanel(context, listId, workspaceId) {
    const sigSetCid = signalSetCid(listId);
    const params = [];
    for (const sigCid in signalSetSchema) {
        if (sigCid != 'timestamp') {
            params.push({
                label: signalSetSchema[sigCid].name,
                color: '#ff00ff', // or rgb(255, 0, 255) ? TODO: ensure this is correct
                sigSet: sigSetCid,
                signal: sigCid,
                tsSigCid: 'timestamp',
            });
        }
    }

    await panels.create(context, workspaceId, {
        name: panelName(listId),
        description: `Subscription counts for list ${listId}`,
        builtin_template: BuiltinTemplateIds.LINECHART,
        namespace: config.mailtrain.namespace,
        params,
    });
}

async function removePanel(context, listId) {
    await removePanelByName(context, panelName(listId));
}


module.exports = {
    signalSetName,
    signalSetCid,
    jobName,
    panelName,
    createJob,
    removeJob,
    createPanel,
    removePanel,
};
