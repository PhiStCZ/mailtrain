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

async function redirectDataFromMvis(req, res, embedPath, transformData = null) {
    const mvisRes = await axios.get(embedUrl + embedPath, {
        headers: {
            'global-access-token': apiToken,
            'mt-user-id': req.user.id
        }
    });
    let data = transformData ? await transformData(mvisRes.data) : mvisRes.data;
    return res.json(data);
}


router.getAsync('/embed/list-subscriptions/:listId', passport.loggedIn, async (req, res) => {
    const listId = castToInteger(req.params.listId);
    await shares.enforceEntityPermission(req.context, 'list', listId, 'view');
    return await redirectDataFromMvis(req, res, `list-subscriptions/${listId}`);
});

router.getAsync('/embed/channel-recent-campaigns/:channelId', passport.loggedIn, async (req, res) => {
    const channelId = castToInteger(req.params.channelId);
    await shares.enforceEntityPermission(req.context, 'channel', channelId, 'view');
    return await redirectDataFromMvis(req, res, `channel-recent-campaigns/${channelId}`);
});

router.getAsync('/embed/channel-campaign-contributions/:channelId', passport.loggedIn, async (req, res) => {
    const channelId = castToInteger(req.params.channelId);
    await shares.enforceEntityPermission(req.context, 'channel', channelId, 'view');
    return await redirectDataFromMvis(req, res, `channel-campaign-contributions/${channelId}`);
});

router.getAsync('/embed/campaign-overview/:campaignId', passport.loggedIn, async (req, res) => {
    const campaignId = castToInteger(req.params.campaignId);
    await shares.enforceEntityPermission(req.context, 'campaign', campaignId, 'view');
    return await redirectDataFromMvis(req, res, `campaign-overview/${campaignId}`, async data => {
        let linkPie = data.params.pies.find(p => p.label == 'Links');
        if (!linkPie) {
            return data;
        }

        for (const linkArc of data.params.pies[1]) {
            const link = await knex('links').where('id', linkArc.linkId).where('campaign', campaignId).first();
            linkArc.label = link ? 'Clicks of ' + link.url : '(unknown link clicks)';
            delete linkArc.linkId;
        }

        return data;
    });
});

router.getAsync('/embed/campaign-messages/:campaignId', passport.loggedIn, async (req, res) => {
    const campaignId = castToInteger(req.params.campaignId);
    await shares.enforceEntityPermission(req.context, 'campaign', campaignId, 'view');
    return await redirectDataFromMvis(req, res, `campaign-messages/${campaignId}`, async data => {
        for (const signal of data.params.sensors) {
            if (signal.linkId) {
                const link = await knex('links').where('id', signal.linkId).where('campaign', campaignId).first();
                signal.label = link ? 'Clicks of ' + link.url : '(unknown link clicks)';
                delete signal.linkId;
            }
        }
        return data;
    });
});

router.getAsync('/embed/audit', passport.loggedIn, async (req, res) => {
    enforce(req.context.user.id == getAdminId(), 'Audit can only be done by admin');
    return await redirectDataFromMvis(req, res, `audit`);
});


module.exports = router;
