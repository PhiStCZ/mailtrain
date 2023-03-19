'use strict';

const config = require('../../ivis-core/server/lib/config');
const knex = require('../../ivis-core/server/lib/knex');
const panels = require('../../ivis-core/server/models/panels');
const { SignalType, SignalSource } = require('../../ivis-core/shared/signals');
const { removePanelByName, createSignalSetWithSignals } = require('../lib/helpers');
const { BuiltinTemplateIds } = require('../../shared/builtin-templates');
const signalSets = require('../../ivis-core/server/models/signal-sets');
const { SignalSetType } = require('../../ivis-core/shared/signal-sets');

const signalSetSchema = {
    // not included: test_sent, triggered
    timestamp: {
        type: SignalType.DATE_TIME,
        name: 'Timestamp',
        settings: {},
        indexed: true,
        weight_list: 0,
        weight_edit: 0,
        source: SignalSource.JOB
    },
    failed: {
        type: SignalType.INTEGER,
        name: 'Failed',
        settings: {},
        indexed: false,
        weight_list: 1,
        weight_edit: 1,
        source: SignalSource.JOB
    },
    sent: {
        type: SignalType.INTEGER,
        name: 'Sent',
        settings: {},
        indexed: false,
        weight_list: 2,
        weight_edit: 2,
        source: SignalSource.JOB
    },
    opened: {
        type: SignalType.INTEGER,
        name: 'Opened',
        settings: {},
        indexed: false,
        weight_list: 3,
        weight_edit: 3,
        source: SignalSource.JOB
    },
    bounced: {
        type: SignalType.INTEGER,
        name: 'Bounced',
        settings: {},
        indexed: false,
        weight_list: 4,
        weight_edit: 4,
        source: SignalSource.JOB
    },
    unsubscribed: {
        type: SignalType.INTEGER,
        name: 'Unsubscribed',
        settings: {},
        indexed: false,
        weight_list: 5,
        weight_edit: 5,
        source: SignalSource.JOB
    },
    complained: {
        type: SignalType.INTEGER,
        name: 'Complained',
        settings: {},
        indexed: false,
        weight_list: 6,
        weight_edit: 6,
        source: SignalSource.JOB
    },
    clicked_any: {
        type: SignalType.INTEGER,
        name: 'Clicked',
        settings: {},
        indexed: false,
        weight_list: 7,
        weight_edit: 7,
        source: SignalSource.JOB
    }
};

function signalSetCid(campaignId) {
    return `campaign_messages_${campaignId}`;
}

function signalSetName(campaignId) {
    return `Campaign ${campaignId} messages`;
}

async function createSignalSet(context, campaignId, creationTimestamp) {
    const sigSetWithSigMap = await createSignalSetWithSignals(context, {
        cid: signalSetCid(campaignId),
        name: signalSetName(campaignId),
        description: '',
        namespace: config.mailtrain.namespace,
        type: SignalSetType.COMPUTED,
        signals: signalSetSchema
    });

    const initRecord = {
        id: creationTimestamp,
        signals: {}
    };
    for (const signalCid of signalSetSchema) {
        if (signalCid == 'timestamp') {
            initRecord.signals[signalCid] = creationTimestamp;
        } else {
            initRecord.signals[signalCid] = 0;
        }
    }
    await signalSets.insertRecords(context, sigSetWithSigMap, [initRecord]);

    return sigSetWithSigMap;
}

async function removeSignalSet(context, campaignId) {
    await signalSets.removeByCid(context, signalSetCid(campaignId));
}

async function getLastRecord(context, campaignId) {
    const campaignMsgsId = await knex('signal_sets').where('cid', signalSetCid(campaignId)).select('id').first();
    if (!campaignMsgsId) {
        return null;
    }

    const campaignMsgsSigSet = await signalSets.getById(context, campaignMsgsId.id, false, true);

    const lastId = await signalSets.getLastId(context, campaignMsgsSigSet);
    if (!lastId) {
        return null;
    }

    return await signalSets.getRecord(context, campaignMsgsSigSet, lastId);
}

function panelName(campaignId) {
    return `Campaign ${campaignId} messages`;
}

const PanelColors = { // or rgb(r, g, b) ?
    failed: '#ff0000',
    sent: '#000000',
    opened: '#00ff00',
    bounced: '#ffff00',
    unsubscribed: '#ff00ff',
    complained: '#ff8800',
    clicked_any: '#8800ff',
    clicked: '#0088ff', // somehow dynamically assigned...?
}

async function createPanel(context, campaignId, campaignWorkspaceId) {
    const sigSetCid = signalSetCid(campaignId);
    const params = [];
    for (const sigCid in signalSetSchema) {
        if (sigCid != 'timestamp') {
            params.push({
                label: signalSetSchema[sigCid].name,
                color: PanelColors[sigCid],
                sigSet: sigSetCid,
                signal: sigCid,
                tsSigCid: 'timestamp',
            });
        }
    }

    await panels.create(context, campaignWorkspaceId, {
        name: panelName(campaignId),
        description: `Message activity for campaign ${campaignId}`,
        builtin_template: BuiltinTemplateIds.LINECHART,
        namespace: config.mailtrain.namespace,
        params,
    });
}

async function removePanel(context, campaignId) {
    await removePanelByName(context, panelName(campaignId));
}

module.exports = {
    signalSetSchema,
    signalSetCid,
    createSignalSet,
    removeSignalSet,
    getLastRecord,
    panelName,
    createPanel,
    removePanel,
};
