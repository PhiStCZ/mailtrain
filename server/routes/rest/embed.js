'use strict';

const config = require('../../lib/config');
const passport = require('../../lib/passport');
const shares = require('../../models/shares');
const axios = require('axios').default;
const knex = require('../../lib/knex');

const router = require('../../lib/router-async').create();
const {castToInteger, enforce, filterObject} = require('../../lib/helpers');
const { getAdminId } = require('../../../shared/users');

const mvisApiUrlBase = config.get('mvis.apiUrlBase');
const embedUrl = `${mvisApiUrlBase}/api/mt-embed/`;
const apiToken = require('../../lib/mvis').apiToken;

async function redirectDataFromMvis(res, embedPath, transformData = null) {
    const mvisRes = await axios.get(embedUrl + embedPath, {
        headers: { 'global-access-token': apiToken }
    });
    let data = transformData ? await transformData(mvisRes.data) : mvisRes.data;
    return res.json(data);
}


router.getAsync('/embed/list-subscriptions/:listId', passport.loggedIn, async (req, res) => {
    const listId = castToInteger(req.params.listId);
    await shares.enforceEntityPermission(req.context, 'list', listId, 'view');
    return await redirectDataFromMvis(res, `list-subscriptions/${listId}`);
});

router.getAsync('/embed/channel-recent-campaigns/:channelId', passport.loggedIn, async (req, res) => {
    const channelId = castToInteger(req.params.channelId);
    await shares.enforceEntityPermission(req.context, 'channel', channelId, 'view');
    return await redirectDataFromMvis(res, `channel-recent-campaigns/${channelId}`);
});

router.getAsync('/embed/channel-campaign-contributions/:channelId', passport.loggedIn, async (req, res) => {
    const channelId = castToInteger(req.params.channelId);
    await shares.enforceEntityPermission(req.context, 'channel', channelId, 'view');
    return await redirectDataFromMvis(res, `channel-campaign-contributions/${channelId}`);
});

router.getAsync('/embed/campaign-overview/:campaignId', passport.loggedIn, async (req, res) => {
    const campaignId = castToInteger(req.params.campaignId);
    await shares.enforceEntityPermission(req.context, 'campaign', campaignId, 'view');
    return await redirectDataFromMvis(res, `campaign-overview/${campaignId}`, async data => {
        let linkPie = data.params.pies.find(p => p.label == 'Links');
        if (!linkPie) {
            return data;
        }

        for (const linkArc of data.params.pies[1]) {
            const link = await knex('links').where('id', linkArc.linkId).where('campaign', campaignId).first();
            linkArc.label = link ? 'clicks of ' + link.url : '(unknown link clicks)';
            delete linkArc.linkId;
        }

        return data;
    });
});

router.getAsync('/embed/campaign-messages/:campaignId', passport.loggedIn, async (req, res) => {
    const campaignId = castToInteger(req.params.campaignId);
    await shares.enforceEntityPermission(req.context, 'campaign', campaignId, 'view');
    return await redirectDataFromMvis(res, `campaign-messages/${campaignId}`, async data => {
        for (const signal of data.params.sensors) {
            if (signal.linkId) {
                const link = await knex('links').where('id', signal.linkId).where('campaign', campaignId).first();
                signal.label = link ? 'clicks of ' + link.url : '(unknown link clicks)';
                delete signal.linkId;
            }
        }
        return data;
    });
});

router.getAsync('/embed/audit', passport.loggedIn, async (req, res) => {
    enforce(req.context.user.id == getAdminId(), 'Audit can only be done by admin');
    return await redirectDataFromMvis(res, `audit`);
});


const allowedKeysCampaign = new Set('name');
const allowedKeysList = new Set('name');
const allowedKeysLink = new Set('url');

// quick bulk info about a batch of entities; used by IVIS embeds to extract data from Mailtrain
router.postAsync('/entity-info', passport.loggedIn, async (req, res) => {

    async function getData(reqs, allowedKeys, checkPerms, query) {
        const resp = [];
        for (const req of reqs) {
            const id = req.id;
            const validKeys = new Set(req.keys.filter(k => allowedKeys.has(k)));
            const hasPerms = await checkPerms(id);
            if (!hasPerms) {
                resp.push(null);
            } else {
                const entity = await query(id);
                resp.push(entity == null ? null : filterObject(entity, validKeys));
            }
        }

        return resp;
    }

    const entityReqs = req.body || {};
    const result = {};
    if (entityReqs.campaign) {
        result.campaign = await getData(
            entityReqs.campaign,
            allowedKeysCampaign,
            async id => await shares.checkEntityPermission(req.context, 'campaign', id, 'view'),
            async id => await knex('campaigns').where('id', id).first()
        );
    }
    if (entityReqs.list) {
        result.list = await getData(
            entityReqs.list,
            allowedKeysList,
            async id => await shares.checkEntityPermission(req.context, 'list', id, 'view'),
            async id => await knex('lists').where('id', id).first()
        );
    }
    if (entityReqs.link) {
        result.link = await getData(
            entityReqs.link,
            allowedKeysLink,
            async id => await shares.checkEntityPermission(req.context, 'campaign', id, 'view'),
            async id => await knex('links').where('id', id).where('campaign', campaignId).first()
        );
    }

    return res.json(result);
});


module.exports = router;
