'use strict';

const config = require('../../../ivis-core/server/lib/config');
const signalSets = require('../../../ivis-core/server/models/signal-sets');
const { SignalType } = require('../../../ivis-core/shared/signals');
const { EntityActivityType, ListActivityType } = require('../../../../shared/activity-log');

const schema = {
    
    timestamp: {
        type: SignalType.DATE_TIME,
        name: 'Timestamp',
        settings: {},
        indexed: true,
        weight_list: 0,
        weight_edit: 0
    },
    issuedBy: {
        type: SignalType.INTEGER,
        name: 'Issued by',
        settings: {},
        indexed: true,
        weight_list: 1,
        weight_edit: 1,
    },

    type: {
        type: SignalType.INTEGER,
        name: 'Action Type',
        settings: {},
        indexed: true,
        weight_list: 2,
        weight_edit: 2
    },
    
    // [
    listId: {
        type: SignalType.INTEGER,
        name: 'List Entity ID',
        settings: {},
        indexed: true,
        weight_list: 3,
        weight_edit: 3
    },
    // ] this might not be here if list indeces will be list-specific

    fieldId: {
        type: SignalType.INTEGER,
        name: 'Field Entity ID',
        settings: {},
        indexed: true,
        weight_list: 4,
        weight_edit: 4
    },
    segmentId: {
        type: SignalType.INTEGER,
        name: 'Segment Entity ID',
        settings: {},
        indexed: true,
        weight_list: 5,
        weight_edit: 5
    },
    importId: {
        type: SignalType.INTEGER,
        name: 'Import Entity ID',
        settings: {},
        indexed: true,
        weight_list: 6,
        weight_edit: 6
    },
    // couldn't this be all collapsed into something like targetId to save space?
    // we can't address multiple actions anyway, probably

    importStatus: {
        type: SignalType.INTEGER,
        name: 'Import Status',
        settings: {},
        indexed: true,
        weight_list: 7,
        weight_edit: 7
    },

    subscriptionId: {
        type: SignalType.INTEGER,
        name: 'Subscription Entity ID',
        settings: {},
        indexed: true,
        weight_list: 8,
        weight_edit: 8
    },
    subscriptionStatus: {
        type: SignalType.INTEGER,
        name: 'Subscription Status',
        settings: {},
        indexed: true,
        weight_list: 9,
        weight_edit: 9
    },

};

async function ensure(context) {
    return await signalSets.ensure(
        context,
        {
            cid: 'lists',
            name: 'Lists',
            description: '',
            namespace: config.mailtrain.namespace,
        },
        schema
    );
};

async function ingest(record) {
    // ??
    return {
        //id: TODO
    };
}

module.exports = {
    schema,
    ensure,
    ingest,
};