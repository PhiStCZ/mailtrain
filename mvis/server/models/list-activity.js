'use strict';

const config = require('../../ivis-core/server/lib/config');
const signalSets = require('../../ivis-core/server/models/signal-sets');
const { SignalType } = require('../../ivis-core/shared/signals');
const schemas = require('./schemas');
const knex = require('../../ivis-core/server/lib/knex');
const { createSignalSetWithSignals } = require('../lib/helpers');

const signalSetSchema = {
    ...schemas.entityActivitySchema,
    fieldId: {
        type: SignalType.INTEGER,
        name: 'Field ID',
        settings: {},
        indexed: true,
        weight_list: schemas.STATIC_ENTITY_ACTIVITY_SCHEMA_MAX + 1,
        weight_edit: schemas.STATIC_ENTITY_ACTIVITY_SCHEMA_MAX + 1
    },
    importId: {
        type: SignalType.INTEGER,
        name: 'Import ID',
        settings: {},
        indexed: true,
        weight_list: schemas.STATIC_ENTITY_ACTIVITY_SCHEMA_MAX + 2,
        weight_edit: schemas.STATIC_ENTITY_ACTIVITY_SCHEMA_MAX + 2
    },
    importStatus: {
        type: SignalType.INTEGER,
        name: 'Import Status',
        settings: {},
        indexed: true,
        weight_list: schemas.STATIC_ENTITY_ACTIVITY_SCHEMA_MAX + 3,
        weight_edit: schemas.STATIC_ENTITY_ACTIVITY_SCHEMA_MAX + 3
    },
    segmentId: {
        type: SignalType.INTEGER,
        name: 'Segment ID',
        settings: {},
        indexed: true,
        weight_list: schemas.STATIC_ENTITY_ACTIVITY_SCHEMA_MAX + 4,
        weight_edit: schemas.STATIC_ENTITY_ACTIVITY_SCHEMA_MAX + 4
    },
    subscriptionId: {
        type: SignalType.INTEGER,
        name: 'Subscription ID',
        settings: {},
        indexed: true,
        weight_list: schemas.STATIC_ENTITY_ACTIVITY_SCHEMA_MAX + 5,
        weight_edit: schemas.STATIC_ENTITY_ACTIVITY_SCHEMA_MAX + 5
    }
};

function signalSetCid(listId) {
    return `list_activity_${listId}`;
}

async function createSignalSet(context, listId) {
    const sigSetWithSigMap = await createSignalSetWithSignals(context, {
        cid: signalSetCid(listId),
        name: `List ${listId} activity`,
        description: '',
        namespace: config.mailtrain.namespace,
        signals: signalSetSchema
    }, false);

    return sigSetWithSigMap;
}

async function getSignalSet(context, listId) {
    return await knex.transaction(async tx => {
        const signalSet = await tx('signal_sets').where('cid', signalSetCid(listId)).first();
        if (!signalSet) {
            return null;
        }
        const signalByCidMap = await signalSets.getSignalByCidMapTx(tx, signalSet);
        signalSet.signalByCidMap = signalByCidMap;

        return signalSet;
    });
}

async function removeSignalSet(context, listId) {
    await signalSets.removeByCid(context, signalSetCid(listId));
}

module.exports = {
    signalSetSchema,
    signalSetCid,
    createSignalSet,
    getSignalSet,
    removeSignalSet,
}

