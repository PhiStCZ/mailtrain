'use strict';

const passport = require('../../../ivis-core/server/lib/passport');
const users = require('../../../ivis-core/server/models/users');
const {castToInteger} = require('../../../ivis-core/server/lib/helpers');
const urls = require('../../../ivis-core/server/lib/urls');
const { ensureMailtrainUser } = require('../../models/users');
const { BuiltinTemplateIds } = require('../../../shared/builtin-templates');

const listActivity = require('../../models/list-activity');
const listSubscriptions = require('../../models/list-subscriptions');

const campaignActivity = require('../../models/campaign-activity');
const campaignMessages = require('../../models/campaign-messages');

const channels = require('../../models/channels');
const { LogTypeId } = require('../../../../shared/activity-log');

const router = require('../../../ivis-core/server/lib/router-async').create();

function getLinkColor(idx, count) {
    let g = Math.floor(0xff * idx / count);
    return '#55' + g.toString(16).padStart(2, '0') + 'ff';
}

async function getDataForEmbed(req, builtinTemplateId, params, path) {
    params = {
        ...params,
        mailtrainUserId: req.get('mt-user-id')
    }
    const userId = await ensureMailtrainUser(req.context);
    const token = await users.getRestrictedAccessToken(
        req.context,
        'builtin_template',
        { renewableBySandbox: true, builtinTemplateId, params },
        userId
    );

    return {
        token,
        ivisSandboxUrlBase: urls.getSandboxUrlBase(),
        path,
        params,
    };
}


router.getAsync('/mt-embed/list-subscriptions/:listId', passport.loggedIn, async (req, res) => {
    const listId = castToInteger(req.params.listId);
    const params = {
        sensors: [
            {
                label: 'Subscribers',
                color: '#44dd44',
                sigSet: listSubscriptions.signalSetCid(listId),
                signal: 'subscribed',
                tsSigCid: 'timestamp',
                enabled: true,
            },
        ],
        activitySet: listActivity.signalSetCid(listId),
        activityTs: 'timestamp',
        activityType: 'activityType',
        activityActor: 'actor',
    };

    return res.json(
        await getDataForEmbed(req, BuiltinTemplateIds.EVENT_LINECHART, params, 'mt-list-subscriptions')
    );
});

router.getAsync('/mt-embed/channel-recent-campaigns/:channelId', passport.loggedIn, async (req, res) => {
    const channelId = castToInteger(req.params.channelId);
    const sigSet = channels.signalSetCid(channelId);
    const params = {
        groupsLimit: 5,
        sigSet,
        tsSig: 'creationTimestamp',
        extraSignals: [ { sigSet, sig: 'campaignId' } ],
        bars: [
            {
                label: 'Messages',
                accumulateValues: true,
                segments: [
                    { label: 'Opened', sigSet, signal: 'opened', color: '#44dd44' },
                    { label: 'Sent (but unopened)', sigSet, signal: 'sent', color: '#22aa22' },
                    { label: 'Failed', sigSet, signal: 'failed', color: '#114411' },
                ],
            },
            {
                label: 'Links',
                accumulateValues: true,
                segments: [
                    { label: 'Clicked any', sigSet, signal: 'clicked_any', color: '#55bbff' },
                    // later it may be possible to get the link ids here
                    // and move the clicked to Messages column (as its a subset of opened)
                ],
            },
            {
                label: 'Actions',
                accumulateValues: true,
                segments: [
                    { label: 'Unsubscribed', sigSet, signal: 'unsubscribed', color: '#666666' },
                    { label: 'Bounced', sigSet, signal: 'bounced', color: '#eebb88' },
                    { label: 'Complained', sigSet, signal: 'complained', color: '#dd4444' },
                ],
            },
        ],
    };

    return res.json(
        await getDataForEmbed(req, BuiltinTemplateIds.GROUP_SEG_BARCHART, params, 'mt-channel-recent-campaigns')
    );
});

router.getAsync('/mt-embed/channel-campaign-contributions/:channelId', passport.loggedIn, async (req, res) => {
    const channelId = castToInteger(req.params.channelId);
    const sigSet = channels.signalSetCid(channelId);
    const params = {
        sigSet,
        tsSig: 'creationTimestamp',
        signals: [
            { label: 'Opened', sigSet, signal: 'opened' },
            { label: 'Sent', sigSet, signal: 'sent' },
            { label: 'Failed', sigSet, signal: 'failed' },
            { label: 'Clicked any link', sigSet, signal: 'clicked_any' },
            { label: 'Unsubscribed', sigSet, signal: 'unsubscribed' },
            { label: 'Bounced', sigSet, signal: 'bounced' },
            { label: 'Complained', sigSet, signal: 'complained' },
        ],
        extraSignals: [
            { sigSet, sig: 'campaignId' }
        ]
    };

    return res.json(
        await getDataForEmbed(req, BuiltinTemplateIds.RANGE_VALUE_PIECHART, params, 'mt-channel-campaign-contributions')
    );
});

router.getAsync('/mt-embed/campaign-overview/:campaignId', passport.loggedIn, async (req, res) => {
    const campaignId = castToInteger(req.params.campaignId);
    const sigSet = campaignMessages.signalSetCid(campaignId);
    const extraLinks = await campaignMessages.getRegisteredLinkIds(req.context, campaignId);

    const params = {
        sigSet,
        tsSig: 'timestamp',
        extraSignals: [],
        pies: [
            {
                label: 'Sent Messages',
                segments: [
                    { label: 'Opened', sigSet, signal: 'opened', color: '#44dd44' },
                    { label: 'Sent (but unopened)', sigSet, signal: 'sent', color: '#22aa22' },
                    { label: 'Failed', sigSet, signal: 'failed', color: '#114411' },
                ],
            },
            {
                label: 'Subscriber Actions',
                segments: [
                    { label: 'Unsubscribed', sigSet, signal: 'unsubscribed', color: '#666666' },
                    { label: 'Bounced', sigSet, signal: 'bounced', color: '#eebb88' },
                    { label: 'Complained', sigSet, signal: 'complained', color: '#dd4444' },
                ],
            },
        ],
    };

    if (extraLinks.length > 0) {
        // insert it between the other two pies
        // TODO: maybe sort by size into a limited amount of links (max 5) and put rest into 'other'
        params.pies.push(params.pies[1]);
        params.pies[1] = {
            label: 'Link Clicks',
            segments: extraLinks.map((linkId, idx) => ({
                linkId,
                sigSet,
                signal: campaignMessages.linkSigCid(linkId),
                color: getLinkColor(idx, extraLinks.length)
            })),
        };
    }

    return res.json(
        await getDataForEmbed(req, BuiltinTemplateIds.N_PIECHARTS, params, 'mt-campaign-overview')
    );
});

router.getAsync('/mt-embed/campaign-messages/:campaignId', passport.loggedIn, async (req, res) => {
    const campaignId = castToInteger(req.params.campaignId);
    const sigSet = campaignMessages.signalSetCid(campaignId);
    const extraLinks = await campaignMessages.getRegisteredLinkIds(req.context, campaignId);
    const params = {
        sensors: [
            { label: 'Failed', signal: 'failed', color: '#114411' },
            { label: 'Sent', signal: 'sent', color: '#22aa22' },
            { label: 'Opened', signal: 'opened', color: '#44dd44' },

            { label: 'Unsubscribed', signal: 'unsubscribed', color: '#666666' },
            { label: 'Bounced', signal: 'bounced', color: '#eebb88' },
            { label: 'Complained', signal: 'complained', color: '#dd4444' },
        ],
        activitySet: campaignActivity.signalSetCid(campaignId),
        activityTs: 'timestamp',
        activityType: 'activityType',
        activityActor: 'actor',
    };

    params.sensors.push(...extraLinks.map((linkId, idx) => ({
        linkId,
        signal: campaignMessages.linkSigCid(linkId),
        color: getLinkColor(idx, extraLinks.length)
    })));

    for (const s of params.sensors) {
        s.sigSet = sigSet;
        s.tsSigCid = 'timestamp';
        s.enabled = true;
    }

    return res.json(
        await getDataForEmbed(req, BuiltinTemplateIds.EVENT_LINECHART, params, 'mt-campaign-messages')
    );
});

router.getAsync('/mt-embed/audit', passport.loggedIn, async (req, res) => {
    const params = {
        signalSets: [
            {
                label: 'Campaign',
                cid: LogTypeId.CAMPAIGN,
                color: '#dd4444',
                enabled: 'true',
                type: 'campaign',
                tsSigCid: 'timestamp',
                activitySigCid: 'activityType',
                extraSignals: [
                    { sigSet: LogTypeId.CAMPAIGN, signal: 'entityId' },
                    { sigSet: LogTypeId.CAMPAIGN, signal: 'actor' }
                ]
            },
            {
                label: 'List',
                cid: LogTypeId.LIST,
                color: '#44dd44',
                enabled: 'true',
                type: 'list',
                tsSigCid: 'timestamp',
                activitySigCid: 'activityType',
                extraSignals: [
                    { sigSet: LogTypeId.LIST, signal: 'entityId' },
                    { sigSet: LogTypeId.LIST, signal: 'actor' }
                ]
            },
            {
                label: 'User',
                cid: LogTypeId.USER,
                color: '#44dd44',
                enabled: 'true',
                type: 'user',
                tsSigCid: 'timestamp',
                activitySigCid: 'activityType',
                extraSignals: [
                    { sigSet: LogTypeId.USER, signal: 'entityId' },
                    { sigSet: LogTypeId.USER, signal: 'actor' }
                ]
            },
        ]
    };

    return res.json(
        await getDataForEmbed(req, BuiltinTemplateIds.EVENT_CHART, params, 'mt-audit')
    );
});


module.exports = router;
