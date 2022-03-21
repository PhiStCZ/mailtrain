'use strict';

const config = require('../../../ivis-core/server/lib/config');
const signalSets = require('../../../ivis-core/server/models/signal-sets');
const { SignalType } = require('../../../ivis-core/shared/signals');

const schema = {
    timestamp: {
        type: SignalType.DATE_TIME,
        name: 'Timestamp',
        settings: {},
        indexed: true,
        weight_list: 0,
        weight_edit: 0
    },
    activityType: {
        type: SignalType.INTEGER,
        name: 'Activity Type',
        settings: {},
        indexed: true,
        weight_list: 1,
        weight_edit: 1
    },
    campaignId: {
        type: SignalType.INTEGER,
        name: 'Campaign ID',
        settings: {},
        indexed: true,
        weight_list: 2,
        weight_edit: 2
    },
    listId: {
        type: SignalType.INTEGER,
        name: 'List ID',
        settings: {},
        indexed: true,
        weight_list: 3,
        weight_edit: 3,
    },
    subscriptionId: {
        type: SignalType.INTEGER,
        name: 'Subscription ID',
        settings: {},
        indexed: true,
        weight_list: 4,
        weight_edit: 4
    },
}

async function ensure(context) {
    return await signalSets.ensure(
        context,
        {
            cid: 'campaignTracker',
            name: 'Campaign Tracker',
            description: '',
            namespace: config.mailtrain.namespace,
        },
        schema
    );
}

async function ingest(record) {
    // let id = getLastId(...);
    return {
        // id: TODO
    };
}

module.exports = {
    schema,
    ensure,
    ingest,
};