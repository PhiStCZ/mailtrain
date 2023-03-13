'use strict';

const config = require('../../ivis-core/server/lib/config');
const jobs = require('../../ivis-core/server/models/jobs');
const panels = require('../../ivis-core/server/models/panels');
const signalSets = require('../../ivis-core/server/models/signal-sets');
const { SignalType } = require('../../ivis-core/shared/signals');
const { LogTypeId } = require('../../../shared/activity-log');
const activityLog = require('../lib/activity-log');
const { removePanelByName, removeJobByName } = require('../lib/helpers');
const { BuiltinTemplateIds } = require('../../shared/builtin-templates');
const { BuiltinTaskNames } = require('../../shared/builtin-tasks');

const signalSetSchema = {
    // not included: test_sent, clicked, triggered
    timestamp: {
        type: SignalType.DATE_TIME,
        name: 'Timestamp',
        settings: {},
        indexed: true,
        weight_list: 0,
        weight_edit: 0
    },
    failed: {
        type: SignalType.INTEGER,
        name: 'Failed',
        settings: {},
        indexed: false,
        weight_list: 1,
        weight_edit: 1
    },
    sent: {
        type: SignalType.INTEGER,
        name: 'Sent',
        settings: {},
        indexed: false,
        weight_list: 2,
        weight_edit: 2
    },
    opened: {
        type: SignalType.INTEGER,
        name: 'Opened',
        settings: {},
        indexed: false,
        weight_list: 3,
        weight_edit: 3
    },
    bounced: {
        type: SignalType.INTEGER,
        name: 'Bounced',
        settings: {},
        indexed: false,
        weight_list: 4,
        weight_edit: 4
    },
    unsubscribed: {
        type: SignalType.INTEGER,
        name: 'Unsubscribed',
        settings: {},
        indexed: false,
        weight_list: 5,
        weight_edit: 5
    },
    complained: {
        type: SignalType.INTEGER,
        name: 'Complained',
        settings: {},
        indexed: false,
        weight_list: 6,
        weight_edit: 6
    },
};


function signalSetName(campaignId) {
    return `Campaign messages ${campaignId}`;
}
function signalSetCid(campaignId) {
    return `campaign_messages_${campaignId}`;
}
function jobName(campaignId) {
    return `Campaign messages ${campaignId}`;
}
function panelName(campaignId) {
    return `Campaign messages ${campaignId}`;
}


async function createSignalSet(context, campaignId, creationTimestamp) {
    const signalSet = await signalSets.ensure(
        context,
        {
            cid: signalSetCid(campaignId),
            name: signalSetName(campaignId),
            description: '',
            namespace: config.mailtrain.namespace,
        },
        campaignMessagesSchema
    );

    // insert first (empty) record
    const initRecord = {
        id: activityLog.formatRecordId(1),
        signals: {}
    };
    for (const field in campaignMessagesSchema) {
        if (field == 'timestamp') {
            initRecord.signals[field] = creationTimestamp;
        } else {
            initRecord.signals[field] = 0;
        }
    }
    await signalSets.insertRecords(context, signalSet, [initRecord]);
    return signalSet;
}

async function removeSignalSet(context, campaignId) {
    await signalSets.removeByCid(context, getCampaignMessagesSigSetCid(campaignId));
}


async function createJob(context, campaignId, campaignTrackerSigSet, campaignSigSet, creationTimestamp) {
    const task = await getBuiltinTask(BuiltinTaskNames.CAMPAIGN_MESSAGES);
    const job = {
        name: jobName(campaignId),
        description: '',
        namespace: config.mailtrain.namespace,
        task: task.id,
        state: JobState.ENABLED,
        params: {
            campaignId,
            creationTimestamp,
            campaign: campaignSigSet.cid,
            campaignTracker: campaignTrackerSigSet.cid,
            campaignMessagesCid: signalSetCid(campaignId)
        },
        signal_sets_triggers: [
            campaignTrackerSigSet.id,
            campaignSigSet.id
        ],
        trigger: null,  // no automatic trigger
        min_gap: 60,    // 1 minute
        delay: 60,      // 1 minute
    };
    const jobId = await jobs.create(context, job, true);

    // run the first 
    try {
        await jobs.run(context, jobId);
    } catch (err) {
        log.error('activity-log', err)
    }

    return jobId;
}

async function removeJob(context, campaignId) {
    await removeJobByName(context, jobName(campaignId));
}


async function createPanel(context, campaignId, campaignWorkspaceId) {
    const sigSetCid = signalSetCid(campaignId);
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

    await panels.create(context, campaignWorkspaceId, {
        name: panelName(campaignId),
        description: '',
        builtin_template: BuiltinTemplateIds.LINECHART,
        namespace: config.mailtrain.namespace,
        params,
    });
}

async function removePanel(context, campaignId) {
    await removePanelByName(context, panelName(campaignId));
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
