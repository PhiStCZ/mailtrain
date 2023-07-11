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
    const mvisRes = await mvisApi.get(embedUrl + embedPath, {
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
        const linksPie = data.params.pies.find(p => p.label === 'Link Clicks');
        if (!linksPie) return data;

        for (const linkArc of linksPie.segments) {
            const link = await knex('links').where('id', linkArc.linkId).where('campaign', campaignId).first();
            linkArc.label = (link && link.url) || 'UNKNOWN LINK';
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
            if (!signal.linkId) continue;

            const link = await knex('links').where('id', signal.linkId).where('campaign', campaignId).first();
            signal.label = 'Clicks of ' + ((link && link.url) || 'UNKNOWN LINK');
            delete signal.linkId;
        }
        return data;
    });
});

const TableAndLabelMap = {
    campaign: ['campaigns', 'name'],
    channel: ['channels', 'name'],
    form: ['custom_forms', 'name'],
    list: ['lists', 'name'],
    namespace: ['namespaces', 'name'],
    report_template: ['report_templates', 'name'],
    report: ['reports', 'name'],
    send_configuration: ['send_configurations', 'name'],
    template: ['templates', 'name'],
    mosaico_template: ['mosaico_templates', 'name'],
    user: ['users', 'username'],
}

router.getAsync('/embed/audit', passport.loggedIn, async (req, res) => {
    enforce(req.context.user.id == getAdminId(), 'Audit can only be done by admin');

    return await redirectDataFromMvis(req, res, `audit`, async data => {
        for (const set of data.params.signalSets) {
            const [tableName, labelName] = TableAndLabelMap[set.type];

            const entities = await knex(tableName).select('id', labelName);

            set.entities = entities.map(e => ({id: e.id, label: e[labelName]}));
        }

        return data;
    });
});


module.exports = router;
