'use strict';

const config = require('../../ivis-core/server/lib/config');
const activityLog = require('../lib/activity-log');
const { LogTypeId, EntityActivityType, CampaignActivityType } = require('../../../shared/activity-log');
const { removeWorkspaceByName } = require('../lib/helpers');
const workspaces = require('../../ivis-core/server/models/workspaces');
const jobs = require('../../ivis-core/server/models/jobs');
const { removeJobByName } = require('../lib/helpers');
const { BuiltinTaskNames } = require('../../shared/builtin-tasks');
const { getBuiltinTask } = require('../../ivis-core/server/models/builtin-tasks');
const { JobState } = require('../../ivis-core/shared/jobs');

const campaignTracker = require('./campaign-tracker');
const campaignMessages = require('./campaign-messages');
const channels = require('./channels');

function workspaceName(campaignId) {
    return `Campaign ${campaignId} workspace`;
}


function jobName(campaignId) {
    return `Campaign ${campaignId} processing job`;
}

async function createJob(context, campaignId, campaignTrackerSigSet, creationTimestamp) {
    const task = await getBuiltinTask(BuiltinTaskNames.CAMPAIGN);
    const job = {
        name: jobName(campaignId),
        description: '',
        namespace: config.mailtrain.namespace,
        task: task.id,
        state: JobState.ENABLED,
        params: {
            campaignId,
            creationTimestamp,
            campaignTracker: campaignTrackerSigSet.cid,
            campaignMessages: campaignMessages.signalSetCid(campaignId)
        },
        signal_sets_triggers: [
            campaignTrackerSigSet.id
        ],
        trigger: null,  // no automatic trigger
        min_gap: 60,    // 1 minute
        delay: 60,      // 1 minute
    };
    const jobId = await jobs.create(context, job, true);

    // the job will initialize the campaign messages signal set
    // await jobs.run(context, jobId);

    return jobId;
}

async function removeJob(context, campaignId) {
    await removeJobByName(context, jobName(campaignId));
}


async function onCampaignCreate(context, event) {
    const campaignId = event.entityId;
    const creationTimestamp = event.timestamp;

    const campaignTrackerSigSet = await campaignTracker.createCampaignTracker(context, campaignId);

    await campaignMessages.createSignalSet(context, campaignId, creationTimestamp);

    await createJob(context, campaignId, campaignTrackerSigSet, creationTimestamp);

    const workspaceId = await workspaces.create(context, {
        name: workspaceName(campaignId),
        description: '',
        namespace: config.mailtrain.namespace,
    });

    await campaignMessages.createPanel(context, campaignId, workspaceId);
}

async function onCampaignRemove(context, event) {
    const campaignId = event.entityId;

    await campaignMessages.removePanel(context, campaignId);

    await removeWorkspaceByName(context, workspaceName(campaignId));

    await removeJob(context, campaignId);

    await campaignMessages.removeSignalSet(context, campaignId);

    await campaignTracker.removeCampaignTracker(context, campaignId);
}

async function onCampaignReset(context, event) {
    const campaignId = event.entityId;
    const resetTimestamp = event.timestamp;

    // restart the job, including its owned signal sets
    await removeJob(context, campaignId);
    const campaignTrackerSigSet = await campaignTracker.getCachedCampaignTracker(context, campaignId);
    await createJob(context, campaignId, campaignTrackerSigSet, resetTimestamp);
}


async function init() {
    activityLog.on(LogTypeId.CAMPAIGN_TRACKER, async (context, events) => {
        const eventsByCampaignId = activityLog.groupEventsByField(events, 'campaignId');
        campaignTracker.addCampaignTrackerEvents(context, eventsByCampaignId);
        for (const campaignId of eventsByCampaignId.keys()) {
            channels.updateChannelCampaignStats(context, campaignId);
        }
    });

    activityLog.on(LogTypeId.CAMPAIGN, async (context, events) => {
        for (const event of events) {
            switch (event.activityType) {
                case EntityActivityType.CREATE:
                    await onCampaignCreate(context, event);
                    break;

                case EntityActivityType.REMOVE:
                    await onCampaignRemove(context, event);
                    break;

                case CampaignActivityType.RESET:
                    await onCampaignReset(context, event);
                    break;

                default: break;
            }
        }
    });
}

module.exports.init = init;
