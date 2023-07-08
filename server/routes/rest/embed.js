'use strict';

const passport = require('../../lib/passport');
const shares = require('../../models/shares');
const knex = require('../../lib/knex');

const router = require('../../lib/router-async').create();
const {castToInteger, enforce} = require('../../lib/helpers');
const { getAdminId } = require('../../../shared/users');

const embedUrl = '/api/mt-embed/';
const mvisApi = require('../../lib/mvis-api');

async function redirectDataFromMvis(req, res, embedPath, transformData = null) {
    const mvisRes = mvisApi.get(embedUrl + embedPath, {
        headers: { 'mt-user-id': req.user.id }
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

        const linksPie = data.params.pies.filter(p => p.label === 'Link Clicks')[0];
        if (linksPie) {
            for (const linkArc of linksPie.segments) {
                const link = await knex('links').where('id', linkArc.linkId).where('campaign', campaignId).first();
                linkArc.label = (link && link.url) || 'UNKNOWN LINK';
                delete linkArc.linkId;
            }
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
                signal.label = 'Clicks of ' + ((link && link.url) || 'UNKNOWN LINK');
                delete signal.linkId;
            }
        }
        return data;
    });
});

router.getAsync('/embed/audit', passport.loggedIn, async (req, res) => {
    enforce(req.context.user.id == getAdminId(), 'Audit can only be done by admin');

    return await redirectDataFromMvis(req, res, `audit`, async data => {
        for (const set of data.params.signalSets) {
            let tableName, labelName;
            switch (set.type) {
                case 'campaign':
                    [tableName, labelName] = ['campaigns', 'name'];
                    break;
                case 'list':
                    [tableName, labelName] = ['lists', 'name'];
                    break;
                case 'user':
                    [tableName, labelName] = ['users', 'username'];
                    break;
                }
                // TODO: finish

            let entities = await knex(tableName).select('id', labelName);
            set.entities = entities.map(e => ({id: e.id, label: e[labelName]}));
        }
    });
});


module.exports = router;
