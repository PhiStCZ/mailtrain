'use strict';

const config = require('../../lib/config');
const passport = require('../../lib/passport');
const shares = require('../../models/shares');
const axios = require('axios').default;

const router = require('../../lib/router-async').create();
const {castToInteger} = require('../../lib/helpers');

const mvisApiUrlBase = config.get('mvis.apiUrlBase');
const embedUrl = `${mvisApiUrlBase}/api/mt-embed/`;
const apiToken = require('../../lib/mvis').apiToken;

async function redirectDataFromMvis(res, embedPath) {
    const mvisRes = await axios.get(embedUrl + embedPath, {
        headers: { 'global-access-token': apiToken }
    });
    return res.json(mvisRes.data);
}


router.getAsync('/embed/list-subscriptions/:listId', passport.loggedIn, async (req, res) => {
    const listId = castToInteger(req.params.listId);
    await shares.enforceEntityPermission(req.context, 'list', listId, 'view');
    return await redirectDataFromMvis(res, `list-subscriptions/${listId}`);
});

router.getAsync('/embed/channel-campaigns/:channelId', passport.loggedIn, async (req, res) => {
    const channelId = castToInteger(req.params.channelId);
    await shares.enforceEntityPermission(req.context, 'channel', channelId, 'view');
    return await redirectDataFromMvis(res, `channel-campaigns/${channelId}`);
});

router.getAsync('/embed/campaign-overview/:campaignId', passport.loggedIn, async (req, res) => {
    const campaignId = castToInteger(req.params.campaignId);
    await shares.enforceEntityPermission(req.context, 'campaign', campaignId, 'view');
    return await redirectDataFromMvis(res, `campaign-overview/${campaignId}`);
});

router.getAsync('/embed/campaign-messages/:campaignId', passport.loggedIn, async (req, res) => {
    const campaignId = castToInteger(req.params.campaignId);
    await shares.enforceEntityPermission(req.context, 'campaign', campaignId, 'view');
    return await redirectDataFromMvis(res, `campaign-messages/${campaignId}`);
});


module.exports = router;
