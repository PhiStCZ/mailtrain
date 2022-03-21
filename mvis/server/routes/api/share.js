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

    userId: {
        type: SignalType.INTEGER,
        name: 'User ID',
        settings: {},
        indexed: true,
        weight_list: 2,
        weight_edit: 2
    },
    entityTypeId: {
        type: SignalType.STRING,
        name: 'Entity Type ID',
        settings: {},
        indexed: true,
        weight_list: 3,
        weight_edit: 3
    },
    entityId: {
        type: SignalType.INTEGER,
        name: 'Entity ID',
        settings: {},
        indexed: true,
        weight_list: 4,
        weight_edit: 4
    },
    role: {
        type: SignalType.STRING,
        name: 'Role',
        settings: {},
        indexed: true,
        weight_list: 5,
        weight_edit: 5
    },
}

async function ensure(context) {
    return await signalSets.ensure(
        context,
        {
            cid: 'shares',
            name: 'Shares',
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