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

const router = require('../../../ivis-core/server/lib/router-async').create();

async function getDataForEmbed(context, builtinTemplateId, params, path) {
    const userId = await ensureMailtrainUser(context);
    const token = await users.getRestrictedAccessToken(
        context,
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
        activityIssuedBy: 'issuedBy',
    };

    return res.json(
        await getDataForEmbed(req.context, BuiltinTemplateIds.EVENT_LINECHART, params, 'mt-list-subscriptions')
    );
});


router.getAsync('/mt-embed/channel-campaigns/:channelId', passport.loggedIn, async (req, res) => {
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
        await getDataForEmbed(req.context, BuiltinTemplateIds.GROUP_SEG_BARCHART, params, 'mt-channel-campaigns')
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
                label: 'Messages',
                segments: [
                    { label: 'Opened', sigSet, signal: 'opened', color: '#44dd44' },
                    { label: 'Sent (but unopened)', sigSet, signal: 'sent', color: '#22aa22' },
                    { label: 'Failed', sigSet, signal: 'failed', color: '#114411' },
                ],
            },
            {
                label: 'Links',
                segments: extraLinks.map((linkId, idx) => ({
                    label: `Link ${linkId}`,
                    sigSet,
                    signal: campaignMessages.linkSigId(linkId),
                    color: idx % 2 ? '#55bbff' : '#5599ff'
                })),
            },
            {
                label: 'Actions',
                segments: [
                    { label: 'Unsubscribed', sigSet, signal: 'unsubscribed', color: '#666666' },
                    { label: 'Bounced', sigSet, signal: 'bounced', color: '#eebb88' },
                    { label: 'Complained', sigSet, signal: 'complained', color: '#dd4444' },
                ],
            },
        ],
    };

    return res.json(
        await getDataForEmbed(req.context, BuiltinTemplateIds.GROUP_SEG_BARCHART, params, 'mt-channel-campaigns')
    );
});


module.exports = router;
