'use strict';

const moment = require('moment');
const config = require('../../ivis-core/server/lib/config');
const activityLog = require('../lib/activity-log');
const { LogTypeId, EntityActivityType, CampaignActivityType } = require('../../../shared/activity-log');
const { removeJobByName, createJobByName } = require('../lib/helpers');
const { BuiltinTaskNames } = require('../../shared/builtin-tasks');
const { getBuiltinTask } = require('../../ivis-core/server/models/builtin-tasks');
const { JobState } = require('../../ivis-core/shared/jobs');

const campaignActivity = require('./campaign-activity');
const campaignTracker = require('./campaign-tracker');
const campaignMessages = require('./campaign-messages');
const channels = require('./channels');

function jobName(campaignId) {
    return `Campaign ${campaignId} processing job`;
}

function jobNameToCampaignId(jobName) {
    return parseInt(jobName.split(' ')[1]);
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
    const jobId = await createJobByName(context, job, true);

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

    await campaignActivity.createSignalSet(context, campaignId);

    const campaignTrackerSigSet = await campaignTracker.createCampaignTracker(context, campaignId);

    await campaignMessages.createSignalSet(context, campaignId, creationTimestamp);

    await createJob(context, campaignId, campaignTrackerSigSet, creationTimestamp);
}

async function onCampaignRemove(context, event) {
    const campaignId = event.entityId;

    await removeJob(context, campaignId);

    await campaignMessages.removeSignalSet(context, campaignId);

    await campaignTracker.removeCampaignTracker(context, campaignId);

    await campaignActivity.removeSignalSet(context, campaignId);
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
    activityLog.before(LogTypeId.CAMPAIGN, async (context, events) => {
        for (const event of events) {
            switch (event.activityType) {
                case EntityActivityType.CREATE:
                    await onCampaignCreate(context, event);
                    break;

                case CampaignActivityType.RESET:
                    await onCampaignReset(context, event);
                    break;

                default: break;
            }
        }
    });

    activityLog.on(LogTypeId.CAMPAIGN, async (context, events) => {
        const eventsByCampaignId = activityLog.groupEventsByField(events, 'entityId');

        for (const [campaignId, campaigns] of eventsByCampaignId.entries()) {
            await activityLog.transformAndStoreEvents(context, campaigns, campaignActivity.signalSetCid(campaignId), campaignActivity.signalSetSchema);
        }
    });

    activityLog.on(LogTypeId.CAMPAIGN_TRACKER, async (context, events) => {
        const eventsByCampaignId = activityLog.groupEventsByField(events, 'campaignId');
        campaignTracker.addCampaignTrackerEvents(context, eventsByCampaignId);
        for (const campaignId of eventsByCampaignId.keys()) {
            channels.updateChannelCampaignStats(context, campaignId);
        }
    });

    activityLog.after(LogTypeId.CAMPAIGN, async(context, events) => {
        for (const event of events) {
            switch (event.activityType) {
                case EntityActivityType.REMOVE:
                    await onCampaignRemove(context, event);
                    break;

                default: break;
            }
        }
    });
}

async function synchronize(context, campaignData) {
    const toDelete = new Set();
    const jobs = await knex('jobs').whereLike('name', jobName('%')).select('name');
    for (const job of jobs) {
        toDelete.add(jobNameToCampaignId(job.name));
    }

    let sigSets;
    sigSets = await knex('signal_sets').whereLike('cid', campaignActivity.signalSetCid('%')).select('cid');
    for (const sigSet of sigSets) {
        toDelete.add(campaignActivity.signalSetCidToCampaignId(sigSet.cid));
    }
    sigSets = await knex('signal_sets').whereLike('cid', campaignTracker.campaignTrackerCid('%')).select('cid');
    for (const sigSet of sigSets) {
        toDelete.add(campaignTracker.signalSetCidToCampaignId(sigSet.cid));
    }
    sigSets = await knex('signal_sets').whereLike('cid', campaignMessages.signalSetCid('%')).select('cid');
    for (const sigSet of sigSets) {
        toDelete.add(campaignMessages.signalSetCidToCampaignId(sigSet.cid));
    }

    const timestamp = moment.utc().toISOString();

    for (const campaign of campaignData) {
        toDelete.delete(campaign.id);
        await onCampaignCreate(context, { entityId: campaign.id, timestamp });
        // campaign data aren't synced, there isn't much we can do anyway
    }
    for (const campaignId of toDelete.values()) {
        await onCampaignRemove(context, { entityId: campaignId });
    }
}

module.exports.init = init;
module.exports.synchronize = synchronize;
