'use strict';

const knex = require('../../ivis-core/server/lib/knex');
const jobs = require('../../ivis-core/server/models/jobs');
const panels = require('../../ivis-core/server/models/panels');
const workspaces = require('../../ivis-core/server/models/workspaces');

// NOTE: as there is no cid for workspaces, panels, etc., MVIS' entities with
//       are identified by their name; this may be changed in the future

async function removeJobByName(context, name) {
    await knex('jobs').where('name', name).select('id').first();
    await jobs.remove(context, id);
}

async function removePanelByName(context, name) {
    await knex('panels').where('name', name).select('id').first();
    await panels.remove(context, id);
}

async function removeWorkspaceByName(context, name) {
    await knex('workspaces').where('name', name).select('id').first();
    await workspaces.remove(context, id);
}

module.exports.removeJobByName = removeJobByName;
module.exports.removeWorkspaceByName = removeWorkspaceByName;
module.exports.removePanelByName = removePanelByName;
