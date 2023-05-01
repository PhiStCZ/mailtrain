'use strict';

const config = require('../../ivis-core/server/lib/config');
const knex = require('../../ivis-core/server/lib/knex');
const { SignalType } = require('../../ivis-core/shared/signals');
const { createSignalSetWithSignals, getSignalSetWithSigMapIfExists, removeSignalSetIfExists } = require('../lib/helpers');
const signalSets = require('../../ivis-core/server/models/signal-sets');

const signalSetSchema = {
    // not included: test_sent, triggered
    timestamp: {
        type: SignalType.DATE_TIME,
        name: 'Timestamp',
        settings: {},
        indexed: true,
        weight_list: 0,
        weight_edit: 0,
    },
    failed: {
        type: SignalType.INTEGER,
        name: 'Failed',
        settings: {},
        indexed: false,
        weight_list: 1,
        weight_edit: 1,
    },
    sent: {
        type: SignalType.INTEGER,
        name: 'Sent',
        settings: {},
        indexed: false,
        weight_list: 2,
        weight_edit: 2,
    },
    opened: {
        type: SignalType.INTEGER,
        name: 'Opened',
        settings: {},
        indexed: false,
        weight_list: 3,
        weight_edit: 3,
    },
    bounced: {
        type: SignalType.INTEGER,
        name: 'Bounced',
        settings: {},
        indexed: false,
        weight_list: 4,
        weight_edit: 4,
    },
    unsubscribed: {
        type: SignalType.INTEGER,
        name: 'Unsubscribed',
        settings: {},
        indexed: false,
        weight_list: 5,
        weight_edit: 5,
    },
    complained: {
        type: SignalType.INTEGER,
        name: 'Complained',
        settings: {},
        indexed: false,
        weight_list: 6,
        weight_edit: 6,
    },
    clicked_any: {
        type: SignalType.INTEGER,
        name: 'Clicked',
        settings: {},
        indexed: false,
        weight_list: 7,
        weight_edit: 7,
    }
};

function signalSetCid(campaignId) {
    return `campaign_messages_${campaignId}`;
}

function signalSetCidToCampaignId(cid) {
    return parseInt(cid.substring('campaign_messages_'.length));
}

function linkSigCid(linkId) {
    return `link_${linkId}`;
}

function linkSigCidToLinkId(cid) {
    return parseInt(cid.substring('link_'.length));
}

async function createSignalSet(context, campaignId, creationTimestamp) {
    const existing = await getSignalSetWithSigMapIfExists(context, signalSetCid(campaignId));
    if (existing) {
        return existing;
    }

    const sigSetWithSigMap = await createSignalSetWithSignals(context, {
        cid: signalSetCid(campaignId),
        name: `Campaign ${campaignId} messages`,
        description: '',
        namespace: config.mailtrain.namespace,
        signals: signalSetSchema
    }, true);

    return sigSetWithSigMap;
}

async function removeSignalSet(context, campaignId) {
    await removeSignalSetIfExists(context, signalSetCid(campaignId));
}

async function getLastRecord(context, campaignId) {
    const campaignMsgsId = await knex('signal_sets').where('cid', signalSetCid(campaignId)).select('id').first();
    if (!campaignMsgsId) {
        return null;
    }

    const lastCampaignMessagesEntries = await signalSets.query(context, [{
        params: {},
        sigSetCid: signalSetCid(campaignId),
        docs: {
            signals: [ 'sent', 'opened', 'clicked_any' ],
            limit: 1,
            sort: [{ sigCid: 'timestamp', order: 'desc' }]
        }
    }]);

    const lastEntry = lastCampaignMessagesEntries[0].docs;

    if (lastEntry.length == 0) {
        return null;
    }

    return lastEntry[0];
}

async function getRegisteredLinkIds(context, campaignId) {
    const linkSignals = await knex('signals')
        .whereRaw(`signals.cid LIKE '${linkSigCid('%')}'`)
        .innerJoin('signal_sets', 'signal_sets.id', 'signals.set')
        .where('signal_sets.cid', signalSetCid(campaignId))
        .select('cid');

    return linkSignals.map(s => linkSigCidToLinkId(s.cid));
}

module.exports = {
    signalSetSchema,
    signalSetCid,
    signalSetCidToCampaignId,
    linkSigCid,
    linkSigCidToLinkId,
    createSignalSet,
    removeSignalSet,
    getLastRecord,
    getRegisteredLinkIds,
};
