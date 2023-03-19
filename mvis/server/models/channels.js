'use strict';

const config = require('../../ivis-core/server/lib/config');
const knex = require('../../ivis-core/server/lib/knex');
const activityLog = require('../lib/activity-log');
const { LogTypeId, EntityActivityType, ChannelActivityType } = require('../../../shared/activity-log');
const { removeWorkspaceByName } = require('../lib/helpers');
const workspaces = require('../../ivis-core/server/models/workspaces');
const jobs = require('../../ivis-core/server/models/jobs');
const { removeJobByName, removePanelByName } = require('../lib/helpers');
const { BuiltinTaskNames } = require('../../shared/builtin-tasks');
const { getBuiltinTask } = require('../../ivis-core/server/models/builtin-tasks');
const { JobState } = require('../../ivis-core/shared/jobs');

const panels = require('../../ivis-core/server/models/panels');
const { SignalType } = require('../../ivis-core/shared/signals');
const { BuiltinTemplateIds } = require('../../shared/builtin-templates');
const signalSets = require('../../ivis-core/server/models/signal-sets');

const campaignMessages = require('./campaign-messages');
const { SignalSetType } = require('../../ivis-core/shared/signal-sets');

const CACHED_NONEXISTENT = null;


function workspaceName(channelId) {
    return `Channel ${channelId} workspace`;
}


const signalSetSchema = {
    campaignId: {
        type: SignalType.INTEGER,
        name: 'Campaign ID',
        settings: {},
        indexed: true,
        weight_list: 0,
        weight_edit: 0
    },
    // creationTimestamp: {
    //     type: SignalType.DATE_TIME,
    //     name: 'Timestamp',
    //     settings: {},
    //     indexed: true,
    //     weight_list: 1,
    //     weight_edit: 1
    // },
};

for (const signalCid in campaignMessages.signalSetSchema) {
    signalSetSchema[signalCid] = { ...campaignMessages.signalSetSchema[signalCid] };
    signalSetSchema[signalCid].weight_list += 1; // 2
    signalSetSchema[signalCid].weight_edit += 1; //
}

function signalSetCid(channelId) {
    return `channel_campaigns_${channelId}`;
}

function signalSetName(channelId) {
    return `Channel ${channelId} campaigns`;
}

const channelCampaignsById = new Map();

async function createSignalSet(context, channelId) {
    // so far it needs to be of type COMPUTED (or created by a task) to
    // register record inserts from tasks (not sure why tho)
    const signalSetWithSignalCidMap = await signalSets.ensure(
        context,
        {
            cid: signalSetCid(channelId),
            name: signalSetName(channelId),
            description: '',
            namespace: config.mailtrain.namespace,
            type: SignalSetType.COMPUTED,
        },
        signalSetSchema,
    );

    channelCampaignsById.set(channelId, signalSetWithSignalCidMap);
    return signalSetWithSignalCidMap;
}

async function getCachedSignalSet(context, channelId) {
    const cached = channelCampaignsById.get(channelId);
    if (cached === CACHED_NONEXISTENT) {
        return null;
    } else if (cached) {
        return cached;
    }

    return await knex.transaction(async tx => {
        const signalSet = await tx('signal_sets').where('cid', signalSetCid(channelId)).first();
        if (!signalSet) {
            channelCampaignsById.set(channelId, CACHED_NONEXISTENT);
            return null;
        }
        const signalByCidMap = await signalSets.getSignalByCidMapTx(tx, signalSet);
        signalSet.signalByCidMap = signalByCidMap;

        channelCampaignsById.set(channelId, signalSet);
        return signalSet;
    });
}

async function removeSignalSet(context, channelId) {
    channelCampaignsById.set(channelId, CACHED_NONEXISTENT);
    await signalSets.removeByCid(context, signalSetCid(channelId));
}


function panelName(channelId) {
    return `Channel ${channelId} campaigns`;
}


const channelIdsByCampaign = new Map();

async function findCampaignChannelId(context, campaignId) {
    const existing = channelIdsByCampaign.get(campaignId);
    if (existing === CACHED_NONEXISTENT) {
        return null;
    } else if (existing) {
        return existing;
    }

    const lastChannelCampaignEntry = await signalSets.query(context, [{
        params: {},
        sigSetCid: LogTypeId.CHANNEL,
        signals: [ 'activityType', 'entityId' ],
        filter: {
            type: 'and',
            children: [
                {
                    type: 'range',
                    sigCid: 'activityType',
                    gte: ChannelActivityType.ADD_CAMPAIGN,
                    lte: ChannelActivityType.REMOVE_CAMPAIGN,
                },
                {
                    type: 'range',
                    sigCid: 'campaignId',
                    gte: campaignId,
                    lte: campaignId,
                }
            ]
        },
        docs: {
            from: 0,
            limit: 1,
            sort: [{ sigCid: 'timestamp', order: 'desc' }]
        }
    }]);

    if (lastChannelCampaignEntry.length == 0 || lastChannelCampaignEntry[0].entityActivity == EntityActivityType.REMOVE) {
        channelIdsByCampaign.set(campaignId, CACHED_NONEXISTENT);
        return null;
    }

    const channelId = lastChannelCampaignEntry[0].entityId;
    channelIdsByCampaign.set(campaignId, CACHED_NONEXISTENT);
    return channelId;
}

async function updateChannelCampaignStats(context, campaignId, channelSignalSet = undefined) {
    if (!channelSignalSet) {
        const channelId = await findCampaignChannelId(context, campaignId);
        if (!channelId) {
            return;
        }

        channelSignalSet = await getCachedSignalSet(context, channelId);
    }

    const lastRecord = await campaignMessages.getLastRecord(context, campaignId);
    const updatedRecord = {
        id: campaignId,
        signals: { campaignId }
    };
    for (const signalCid in lastRecord.signals) {
        if (signalCid != 'timestamp') {
            updatedRecord.signals[signalCid] = lastRecord.signals[signalCid];
        }
    }

    await signalSets.updateRecord(context, channelSignalSet, campaignId, updatedRecord);
}


async function onChannelCreate(context, channelId) {
    createSignalSet(context, channelId);

    // const workspaceId = await workspaces.create(context, {
    //     name: workspaceName(campaignId),
    //     description: '',
    //     namespace: config.mailtrain.namespace,
    // });

    // TODO: create panel
}

async function onChannelRemove(context, channelId) {
    removeSignalSet(context, channelId);

    // TODO: remove panel & workspace
}


async function onCampaignAdd(context, channelId, campaignId) {
    channelIdsByCampaign.set(campaignId, channelId);

    const channelSigSet = await getCachedSignalSet(context, channelId);
    const emptyRecord = { id: campaignId, signals: {} };
    await signalSets.insertRecords(context, channelSigSet, [emptyRecord]);
    await updateChannelCampaignStats(context, campaignId, channelSigSet);
}

async function onCampaignRemove(context, channelId, campaignId) {
    channelIdsByCampaign.set(campaignId, CACHED_NONEXISTENT);

    const channelSigSet = await getCachedSignalSet(context, channelId);
    await signalSets.removeRecord(context, channelSigSet, campaignId);
}


async function init() {
    activityLog.on(LogTypeId.CHANNEL, async (context, events) => {
        for (const event of events) {
            const channelId = event.entityId;
            switch (event.activityType) {

                case EntityActivityType.CREATE:
                    await onChannelCreate(context, channelId);
                    break;

                case EntityActivityType.REMOVE:
                    await onChannelRemove(context, channelId);
                    break;

                case ChannelActivityType.ADD_CAMPAIGN:
                    await onCampaignAdd(context, channelId, event.campaignId);
                    break;

                case ChannelActivityType.REMOVE_CAMPAIGN:
                    await onCampaignRemove(context, channelId, event.campaignId);
                    break;

                default: break;
            }
        }
    });
}

module.exports = {
    signalSetCid,
    updateChannelCampaignStats,
    init,
}
