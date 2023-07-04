'use strict';

const fork = require('./fork').fork;
const log = require('./log');
const path = require('path');
const bluebird = require('bluebird');
const crypto = require('crypto');
const knex = require('./knex');
const users = require('../models/users');
const shares = require('../models/shares');
const { getAdminContext } = require('./context-helpers');
const mvisApiToken = require('./mvis-api').token;

let mvisProcess;
let mvisReadyState = null;

function spawn(callback) {
    log.verbose('Mvis', 'Spawning mvis process');

    const wDir = path.join(__dirname, '..', '..', 'mvis', 'server');
    
    mvisProcess = fork(path.join(wDir, 'index.js'), [], {
        cwd: wDir,
        env: {
            NODE_ENV: process.env.NODE_ENV,
            API_TOKEN: mvisApiToken
        }
    });

    mvisProcess.on('message', async msg => {
        if (!msg) return;

        if (msg.type === 'mvis-started') {
            log.info('Mvis', 'Mvis process started');
            return callback();
        } else if (msg.type === 'entity-info') {
            const response = await handleEntityInfo(msg);
            mvisProcess.send({
                type: 'response',
                data: response,
                requestId: msg.requestId,
            });
        } else if (msg.type === 'synchronize') {
            const response = await handleSynchronize();
            mvisProcess.send({
                type: 'response',
                data: response,
                requestId: msg.requestId,
            });
        }
    });

    mvisReadyState = new Promise((resolve, reject) => {
        let ready = false;
        setTimeout(() => {
            if (!ready) {
                reject('Mvis start message not received');
            }
        }, 5 * 60 * 1000);
        mvisProcess.on('message', msg => {
            if (msg && msg.type === 'mvis-ready') {
                ready = true;
                resolve();
            }
        });
    });
};

const allowedKeysCampaign = ['id', 'name', 'cid'];
const allowedKeysList = ['id', 'name'];
const allowedKeysLink = ['id', 'url'];

// quick bulk info about a batch of entities; used by IVIS embeds to extract data from Mailtrain
async function handleEntityInfo(msg) {
    async function getData(ids, keys, checkPerms, query) {
        query = query(ids).select(keys);
        const entities = await query;
        const entityMap = new Map();
        for (const e of entities) {
            entityMap.set(e.id, e);
        }

        const resp = [];
        for (const id of ids) {
            const entity = entityMap.get(id);
            const hasPerms = await checkPerms(id);
            if (!hasPerms || entity === null) {
                resp.push(null);
            } else {
                resp.push(entity);
            }
        }

        return resp;
    }

    const context = {
        user: await users.getById(getAdminContext(), msg.mailtrainUserId)
    };
    const entityReqs = msg.data;
    const result = {};
    if (entityReqs.campaign) {
        result.campaign = await getData(
            entityReqs.campaign.ids, allowedKeysCampaign,
            async id => await shares.checkEntityPermission(context, 'campaign', id, 'view'),
            ids => knex('campaigns').whereIn('id', ids)
        );
    }
    if (entityReqs.list) {
        result.list = await getData(
            entityReqs.list.ids, allowedKeysList,
            async id => await shares.checkEntityPermission(context, 'list', id, 'view'),
            ids => knex('lists').whereIn('id', ids)
        );
    }
    if (entityReqs.link) {
        const links = entityReqs.link;
        const hasPerms = await shares.checkEntityPermission(context, 'campaign', links.campaignId, 'view');
        if (!hasPerms) {
            result.link = [];
        } else {
            result.link = await getData(
                links.ids, allowedKeysLink,
                () => true,
                ids => knex('links').where('campaign', links.campaignId).whereIn('id', ids)
            );
        }
    }

    return result;
}

/**
 * Synchronizes mvis' data with current mailtrain data.
 */
async function handleSynchronize() {
    const list = await knex('lists').select('id', 'subscribers');
    const campaign = await knex('campaigns').select('id', 'channel');
    const channel = await knex('channels').select('id');

    const channelsById = new Map();
    for (const ch of channel) {
        channelsById.set(ch.id, ch);
    }

    for (const c of campaign) {
        if (!c.channel) {
            continue;
        }
        const campaignChannel = channelsById.get(c.channel);
        if (!campaignChannel.campaignIds) {
            campaignChannel.campaignIds = [];
        }
        campaignChannel.campaignIds.push(c.id);
    }

    log.info('Activity-log', 'Synchronizing data with IVIS');

    return {
        list,
        campaign,
        channel
    }
}

/** Returns from the function when Mvis is ready. */
async function mvisReady() {
    if (!mvisReadyState) {
        throw new Error('Mvis wasn\'t launched yet');
    }
    await mvisReadyState;
}

module.exports.spawn = bluebird.promisify(spawn);
module.exports.mvisReady = mvisReady;
