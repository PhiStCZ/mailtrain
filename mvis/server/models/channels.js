'use strict';

const log = require('../../ivis-core/server/lib/log');
const config = require('../../ivis-core/server/lib/config');
const knex = require('../../ivis-core/server/lib/knex');
const activityLog = require('../lib/activity-log');
const { LogTypeId, EntityActivityType, ChannelActivityType } = require('../../../shared/activity-log');
const { SignalType } = require('../../ivis-core/shared/signals');
const signalSets = require('../../ivis-core/server/models/signal-sets');

const campaignMessages = require('./campaign-messages');
const { removeSignalSetIfExists } = require('../lib/helpers');

const CACHED_NONEXISTENT = null;


const signalSetSchema = {
    campaignId: {
        type: SignalType.INTEGER,
        name: 'Campaign ID',
        settings: {},
        indexed: true,
        weight_list: 0,
        weight_edit: 0
    },
    creationTimestamp: {
        type: SignalType.DATE_TIME,
        name: 'Timestamp',
        settings: {},
        indexed: true,
        weight_list: 1,
        weight_edit: 1
    },
};

for (const signalCid in campaignMessages.signalSetSchema) {
    if (signalCid != 'timestamp') {
        signalSetSchema[signalCid] = { ...campaignMessages.signalSetSchema[signalCid] };
        signalSetSchema[signalCid].weight_list += 2;
        signalSetSchema[signalCid].weight_edit += 2;
    }
}

function signalSetCid(channelId) {
    return `channel_campaigns_${channelId}`;
}

function signalSetCidToChannelId(cid) {
    return parseInt(cid.substring('channel_campaigns_'.length));
}

const channelCampaignsSigSetsByChannel = new Map();

async function createSignalSet(context, channelId) {
    const signalSetWithSignalCidMap = await signalSets.ensure(
        context,
        {
            cid: signalSetCid(channelId),
            name: `Channel ${channelId} campaigns`,
            description: '',
            namespace: config.mailtrain.namespace,
        },
        signalSetSchema,
    );

    channelCampaignsSigSetsByChannel.set(channelId, signalSetWithSignalCidMap);
    return signalSetWithSignalCidMap;
}

async function getCachedSignalSet(context, channelId) {
    const cached = channelCampaignsSigSetsByChannel.get(channelId);
    if (cached === CACHED_NONEXISTENT) {
        return null;
    } else if (cached) {
        return cached;
    }

    return await knex.transaction(async tx => {
        const signalSet = await tx('signal_sets').where('cid', signalSetCid(channelId)).first();
        if (!signalSet) {
            channelCampaignsSigSetsByChannel.set(channelId, CACHED_NONEXISTENT);
            return null;
        }
        const signalByCidMap = await signalSets.getSignalByCidMapTx(tx, signalSet);
        signalSet.signalByCidMap = signalByCidMap;

        channelCampaignsSigSetsByChannel.set(channelId, signalSet);
        return signalSet;
    });
}

async function removeSignalSet(context, channelId) {
    channelCampaignsSigSetsByChannel.set(channelId, CACHED_NONEXISTENT);
    await removeSignalSetIfExists(context, signalSetCid(channelId));
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
        sigSetCid: LogTypeId.CHANNEL,
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
            signals: [ 'activityType', 'entityId' ],

            limit: 1,
            sort: [{ sigCid: 'timestamp', order: 'desc' }]
        }
    }]);

    const lastEntries = lastChannelCampaignEntry[0].docs;

    if (lastEntries.length == 0 || lastEntries[0].entityActivity == EntityActivityType.REMOVE) {
        channelIdsByCampaign.set(campaignId, CACHED_NONEXISTENT);
        return null;
    }

    const channelId = lastEntries[0].entityId;
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

    const lastRecordSignals = await campaignMessages.getLastRecord(context, campaignId) || {};

    const updatedRecord = {
        id: campaignId,
        signals: { campaignId }
    };

    for (const signalCid in campaignMessages.signalSetSchema) {
        if (signalCid != 'timestamp') {
            updatedRecord.signals[signalCid] = lastRecordSignals[signalCid] || 0;
        }
    }

    await signalSets.updateRecord(context, channelSignalSet, campaignId, updatedRecord);
}


async function onChannelCreate(context, channelId) {
    await createSignalSet(context, channelId);
}

async function onChannelRemove(context, channelId) {
    await removeSignalSet(context, channelId);
}


async function onCampaignAdd(context, channelId, campaignId, creationTimestamp = undefined, channelSigSet = undefined) {
    channelIdsByCampaign.set(campaignId, channelId);

    if (!channelSigSet) {
        channelSigSet = await getCachedSignalSet(context, channelId);
    }
    const emptyRecord = { id: campaignId, signals: { creationTimestamp } };
    await signalSets.insertRecords(context, channelSigSet, [emptyRecord]);
    await updateChannelCampaignStats(context, campaignId, channelSigSet);
}

async function onCampaignRemove(context, channelId, campaignId, channelSigSet = undefined) {
    const currentCampaignChannel = channelIdsByCampaign.get(campaignId);
    // synchronization may have at some point assigned one campaign to 2
    // channels, this check should take care of consistency in that case
    if (!currentCampaignChannel || currentCampaignChannel == channelId) {
        channelIdsByCampaign.set(campaignId, CACHED_NONEXISTENT);
    }
    if (!channelSigSet) {
        channelSigSet = await getCachedSignalSet(context, channelId);
    }
    await signalSets.removeRecord(context, channelSigSet, campaignId);
}

function purgeCache() {
    channelIdsByCampaign.clear();
    channelCampaignsSigSetsByChannel.clear();
}

async function init() {
    activityLog.before(LogTypeId.CHANNEL, async(context, events) => {
        for (const event of events) {
            const channelId = event.entityId;
            switch (event.activityType) {

                case EntityActivityType.CREATE:
                    await onChannelCreate(context, channelId);
                    break;

                default: break;
            }
        }
    });
    
    activityLog.on(LogTypeId.CHANNEL, async (context, events) => {
        for (const event of events) {
            const channelId = event.entityId;
            switch (event.activityType) {

                case ChannelActivityType.ADD_CAMPAIGN:
                    await onCampaignAdd(context, channelId, event.campaignId, event.timestamp);
                    break;

                case ChannelActivityType.REMOVE_CAMPAIGN:
                    await onCampaignRemove(context, channelId, event.campaignId);
                    break;

                default: break;
            }
        }
    });

    activityLog.after(LogTypeId.CHANNEL, async(context, events) => {
        for (const event of events) {
            const channelId = event.entityId;
            switch (event.activityType) {

                case EntityActivityType.REMOVE:
                    await onChannelRemove(context, channelId);
                    break;

                default: break;
            }
        }
    });
}

async function synchronize(context, channelsData) {
    purgeCache();

    const toDelete = new Set();
    const sigSets = await knex('signal_sets').whereRaw(`cid LIKE '${signalSetCid('%')}'`).select('cid');
    for (const sigSet of sigSets) {
        toDelete.add(signalSetCidToChannelId(sigSet.cid));
    }


    for (const channel of channelsData) {
        log.verbose('Synchronization', `synchronizing channel ${channel.id} data`);
        toDelete.delete(channel.id);
        const channelSigSet = await createSignalSet(context, channel.id);

        const channelCampaignsSet = new Set(channel.campaignIds);

        const querySize = 5000;
        const query = {
            sigSetCid: signalSetCid(channel.id),
            filter: {
                type: 'range',
                sigCid: 'campaignId',
                gt: 0
            },
            docs: {
                signals: [ 'campaignId' ],
                limit: querySize,
                sort: [{ sigCid: 'campaignId', order: 'asc' }]
            }
        };

        let result, storedCampaignIds;
        do {
            result = await signalSets.query(context, [query]);
            storedCampaignIds = result[0].docs;

            for (const campaign of storedCampaignIds) {
                const campaignId = campaign.campaignId;
                if (channelCampaignsSet.has(campaignId)) {
                    await updateChannelCampaignStats(context, campaignId, channelSigSet);
                    channelCampaignsSet.delete(campaignId);
                } else {
                    log.verbose('Synchronization', `removing campaign ${campaignId} to channel ${channel.id}`);
                    await onCampaignRemove(context, channel.id, campaignId, channelSigSet);
                }
                query.filter.gt = campaignId;
            }

        } while (storedCampaignIds.length == querySize);

        // add remaining not present campaigns
        for (const campaignId of channelCampaignsSet.values()) {
            log.verbose('Synchronization', `adding campaign ${campaignId} to channel ${channel.id}`);
            await onCampaignAdd(context, channel.id, campaignId, undefined, channelSigSet);
        }
    }
    for (const channelId of toDelete.values()) {
        log.verbose('Synchronization', `removing channel ${channelId} data`);
        await onChannelRemove(context, channelId);
    }
}

module.exports = {
    signalSetCid,
    updateChannelCampaignStats,
    init,
    synchronize,
}
