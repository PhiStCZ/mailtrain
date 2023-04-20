'use strict';

const { SignalType } = require('../../ivis-core/shared/signals');


const signalSetSchema = {
    timestamp: {
        type: SignalType.DATE_TIME,
        name: 'Timestamp',
        settings: {},
        indexed: true,
        weight_list: 0,
        weight_edit: 0
    },
    subscribed: {
        type: SignalType.INTEGER,
        name: 'Subscribed',
        settings: {},
        indexed: false,
        weight_list: 1,
        weight_edit: 1
    },
    unsubscribed: {
        type: SignalType.INTEGER,
        name: 'Unsubscribed',
        settings: {},
        indexed: false,
        weight_list: 2,
        weight_edit: 2
    },
    bounced: {
        type: SignalType.INTEGER,
        name: 'Bounced',
        settings: {},
        indexed: false,
        weight_list: 3,
        weight_edit: 3
    },
    complained: {
        type: SignalType.INTEGER,
        name: 'Complained',
        settings: {},
        indexed: false,
        weight_list: 4,
        weight_edit: 4
    },
};

function signalSetCid(listId) {
    return `list_subscriptions_${listId}`;
}


module.exports = {
    signalSetSchema,
    signalSetCid,
};
