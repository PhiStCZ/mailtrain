'use strict';

const config = require('../../ivis-core/server/lib/config');
const signalSets = require('../../ivis-core/server/models/signal-sets');
const { SignalType } = require('../../ivis-core/shared/signals');
const schemas = require('./schemas');
const knex = require('../../ivis-core/server/lib/knex');
const { getSignalSetWithSigMapIfExists, removeSignalSetIfExists } = require('../lib/helpers');

const signalSetSchema = {
    ...schemas.entityActivitySchema,
    status: {
        type: SignalType.INTEGER,
        name: 'Campaign Status',
        settings: {},
        indexed: true,
        weight_list: schemas.ENTITY_ACTIVITY_SCHEMA_MAX + 1,
        weight_edit: schemas.ENTITY_ACTIVITY_SCHEMA_MAX + 1
    },
    channelId: {
        type: SignalType.INTEGER,
        name: 'Channel ID',
        settings: {},
        indexed: true,
        weight_list: schemas.ENTITY_ACTIVITY_SCHEMA_MAX + 2,
        weight_edit: schemas.ENTITY_ACTIVITY_SCHEMA_MAX + 2
    },
    triggerId: {
        type: SignalType.INTEGER,
        name: 'Campaign Trigger ID',
        settings: {},
        indexed: true,
        weight_list: schemas.ENTITY_ACTIVITY_SCHEMA_MAX + 3,
        weight_edit: schemas.ENTITY_ACTIVITY_SCHEMA_MAX + 3
    },
    listId: {
        type: SignalType.INTEGER,
        name: 'List ID',
        settings: {},
        indexed: true,
        weight_list: schemas.ENTITY_ACTIVITY_SCHEMA_MAX + 4,
        weight_edit: schemas.ENTITY_ACTIVITY_SCHEMA_MAX + 4
    },
    subscriptionId: {
        type: SignalType.INTEGER,
        name: 'Subscription ID',
        settings: {},
        indexed: true,
        weight_list: schemas.ENTITY_ACTIVITY_SCHEMA_MAX + 5,
        weight_edit: schemas.ENTITY_ACTIVITY_SCHEMA_MAX + 5
    },
    linkId: {
        type: SignalType.INTEGER,
        name: 'Link ID',
        settings: {},
        indexed: true,
        weight_list: schemas.ENTITY_ACTIVITY_SCHEMA_MAX + 6,
        weight_edit: schemas.ENTITY_ACTIVITY_SCHEMA_MAX + 6
    },
    url: {
        type: SignalType.TEXT,
        name: 'Link URL',
        settings: {},
        indexed: true,
        weight_list: schemas.ENTITY_ACTIVITY_SCHEMA_MAX + 7,
        weight_edit: schemas.ENTITY_ACTIVITY_SCHEMA_MAX + 7
    },
    type: {
        type: SignalType.INTEGER,
        name: 'Campaign type',
        settings: {},
        indexed: true,
        weight_list: schemas.ENTITY_ACTIVITY_SCHEMA_MAX + 8,
        weight_edit: schemas.ENTITY_ACTIVITY_SCHEMA_MAX + 8
    },
};

function signalSetCid(campaignId) {
    return `campaign_activity_${campaignId}`;
}

function signalSetCidToCampaignId(cid) {
    return parseInt(cid.substring('campaign_activity_'.length));
}

async function createSignalSet(context, campaignId) {
    const existing = await getSignalSetWithSigMapIfExists(context, signalSetCid(campaignId));
    if (existing) {
        return existing;
    }

    const sigSetWithSigMap = await signalSets.ensure(context, {
        cid: signalSetCid(campaignId),
        name: `Campaign ${campaignId} activity`,
        description: '',
        namespace: config.mailtrain.namespace,
    }, signalSetSchema);

    return sigSetWithSigMap;
}

async function getSignalSet(context, campaignId) {
    return await getSignalSetWithSigMapIfExists(context, signalSetCid(campaignId));
}

async function removeSignalSet(context, campaignId) {
    await removeSignalSetIfExists(context, signalSetCid(campaignId));
}

module.exports = {
    signalSetSchema,
    signalSetCid,
    signalSetCidToCampaignId,
    createSignalSet,
    getSignalSet,
    removeSignalSet,
}
