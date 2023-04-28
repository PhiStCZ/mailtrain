'use strict';

const config = require('../../ivis-core/server/lib/config');
const signalSets = require('../../ivis-core/server/models/signal-sets');
const { SignalType } = require('../../ivis-core/shared/signals');
const schemas = require('./schemas');
const knex = require('../../ivis-core/server/lib/knex');
const { getSignalSetWithSigMapIfExists, removeSignalSetIfExists } = require('../lib/helpers');

const signalSetSchema = {
    ...schemas.entityActivitySchema,
    fieldId: {
        type: SignalType.INTEGER,
        name: 'Field ID',
        settings: {},
        indexed: true,
        weight_list: schemas.ENTITY_ACTIVITY_SCHEMA_MAX + 1,
        weight_edit: schemas.ENTITY_ACTIVITY_SCHEMA_MAX + 1
    },
    importId: {
        type: SignalType.INTEGER,
        name: 'Import ID',
        settings: {},
        indexed: true,
        weight_list: schemas.ENTITY_ACTIVITY_SCHEMA_MAX + 2,
        weight_edit: schemas.ENTITY_ACTIVITY_SCHEMA_MAX + 2
    },
    importStatus: {
        type: SignalType.INTEGER,
        name: 'Import Status',
        settings: {},
        indexed: true,
        weight_list: schemas.ENTITY_ACTIVITY_SCHEMA_MAX + 3,
        weight_edit: schemas.ENTITY_ACTIVITY_SCHEMA_MAX + 3
    },
    segmentId: {
        type: SignalType.INTEGER,
        name: 'Segment ID',
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
    campaignId: {
        type: SignalType.INTEGER,
        name: 'Campaign ID',
        settings: {},
        indexed: true,
        weight_list: schemas.ENTITY_ACTIVITY_SCHEMA_MAX + 6,
        weight_edit: schemas.ENTITY_ACTIVITY_SCHEMA_MAX + 6
    }
};

function signalSetCid(listId) {
    return `list_activity_${listId}`;
}

function signalSetCidToListId(cid) {
    return parseInt(cid.substring('list_activity_'.length));
}

async function createSignalSet(context, listId) {
    const existing = await getSignalSetWithSigMapIfExists(context, signalSetCid(listId));
    if (existing) {
        return existing;
    }

    const sigSetWithSigMap = await signalSets.ensure(context, {
        cid: signalSetCid(listId),
        name: `List ${listId} activity`,
        description: '',
        namespace: config.mailtrain.namespace,
    }, signalSetSchema);

    return sigSetWithSigMap;
}

async function getSignalSet(context, listId) {
    return await getSignalSetWithSigMapIfExists(context, signalSetCid(listId));
}

async function removeSignalSet(context, listId) {
    await removeSignalSetIfExists(context, signalSetCid(listId));
}

module.exports = {
    signalSetSchema,
    signalSetCid,
    signalSetCidToListId,
    createSignalSet,
    getSignalSet,
    removeSignalSet,
}
