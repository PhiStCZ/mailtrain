'use strict';

const knex = require('../../ivis-core/server/lib/knex');
const jobs = require('../../ivis-core/server/models/jobs');
const signals = require('../../ivis-core/server/models/signals');
const signalSets = require('../../ivis-core/server/models/signal-sets');
const { filterObject } = require('../../ivis-core/server/lib/helpers');
const { allowedKeysCreate } = require('../../ivis-core/server/lib/signal-set-helpers');
const { SignalSource } = require('../../ivis-core/shared/signals');
const { SignalSetType } = require('../../ivis-core/shared/signal-sets');


async function createSignalSetWithSignals(context, entity, isComputed = false) {
    const filteredEntity = filterObject(entity, allowedKeysCreate);
    const new_signals = entity.signals || {};

    if (isComputed) {
        filteredEntity.type = SignalSetType.COMPUTED;

        for (const sigCid in new_signals) {
            new_signals[sigCid] = {
                ...new_signals[sigCid],
                source: SignalSource.JOB
            }
        }
    }

    return await knex.transaction(async tx => {
        filteredEntity.id = await signalSets.createTx(tx, context, filteredEntity);

        for (const signalCid in new_signals) {
            const signal = {
                ...new_signals[signalCid],
                cid: signalCid
            };
            if (!signal.namespace) {
                signal.namespace = filteredEntity.namespace;
            }
            await signals.createTx(tx, context, filteredEntity.id, signal);
        }

        filteredEntity.signalByCidMap = await signalSets.getSignalByCidMapTx(tx, filteredEntity);
        return filteredEntity;
    });
}

async function getSignalSetWithSigMapIfExists(context, cid) {
    return await knex.transaction(async tx => {
        const sigSet = await tx('signal_sets').where('cid', cid).first();
        if (!sigSet) {
            return null;
        }

        sigSet.signalByCidMap = await signalSets.getSignalByCidMapTx(tx, sigSet);
        return sigSet;
    });
}

async function removeSignalSetIfExists(context, cid) {
    const sigSet = await knex('signal_sets').where('cid', cid).select('id').first();
    if (!sigSet) {
        return null;
    }
    return await signalSets.removeByCid(context, cid);
}


// NOTE: as there is no cid for jobs, panels, etc., MVIS' entities with
//       are identified by their name; this may be changed in the future

async function createJobByName(context, job, isSystemJobAllowed = false) {
    const res = await knex('jobs').where('name', job.name).select('id').first();
    if (res) {
        return res.id;
    }
    return await jobs.create(context, job, isSystemJobAllowed);
}

async function removeJobByName(context, name) {
    const res = await knex('jobs').where('name', name).select('id').first();
    if (!res) {
        return false;
    }
    await jobs.remove(context, res.id);
    return true;
}


module.exports.createSignalSetWithSignals = createSignalSetWithSignals;
module.exports.getSignalSetWithSigMapIfExists = getSignalSetWithSigMapIfExists;
module.exports.removeSignalSetIfExists = removeSignalSetIfExists;
module.exports.createJobByName = createJobByName;
module.exports.removeJobByName = removeJobByName;
