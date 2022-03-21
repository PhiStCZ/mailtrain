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
    userId: {
        type: SignalType.INTEGER,
        name: 'User ID',
        settings: {},
        indexed: true,
        weight_list: 3,
        weight_edit: 3
    },
};

async function ensure(context) {
    return await signalSets.ensure(
        context,
        {
            cid: 'users',
            name: 'Users',
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