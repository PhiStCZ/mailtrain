'use strict';

const knex = require('../../ivis-core/server/lib/knex');
const jobs = require('../../ivis-core/server/models/jobs');
const panels = require('../../ivis-core/server/models/panels');
const workspaces = require('../../ivis-core/server/models/workspaces');
const signals = require('../../ivis-core/server/models/signals');
const signalSets = require('../../ivis-core/server/models/signal-sets');
const { filterObject } = require('../../ivis-core/server/lib/helpers');
const { allowedKeysCreate } = require('../../ivis-core/server/lib/signal-set-helpers');


async function createSignalSetWithSignals(context, entity) {
    const filteredEntity = filterObject(entity, allowedKeysCreate);
    const new_signals = entity.signals || {};

    return await knex.transaction(async tx => {
        filteredEntity.id = await signalSets.createTx(tx, context, filteredEntity);

        for (const signalCid in new_signals) {
            const signal = {
                ...new_signals[signalCid],
                cid: signalCid
            };
            await signals.createTx(tx, context, filteredEntity.id, signal);
        }

        filteredEntity.signalByCidMap = await signalSets.getSignalByCidMapTx(tx, filteredEntity);
        return filteredEntity;
    });
}




// NOTE: as there is no cid for workspaces, panels, etc., MVIS' entities with
//       are identified by their name; this may be changed in the future

async function removeJobByName(context, name) {
    const res = await knex('jobs').where('name', name).select('id').first();
    await jobs.remove(context, res.id);
}

async function removePanelByName(context, name) {
    const res = await knex('panels').where('name', name).select('id').first();
    await panels.remove(context, res.id);
}

async function removeWorkspaceByName(context, name) {
    const res = await knex('workspaces').where('name', name).select('id').first();
    await workspaces.remove(context, res.id);
}


module.exports.createSignalSetWithSignals = createSignalSetWithSignals;
module.exports.removeJobByName = removeJobByName;
module.exports.removeWorkspaceByName = removeWorkspaceByName;
module.exports.removePanelByName = removePanelByName;
