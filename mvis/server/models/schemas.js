'use strict';

const { SignalType } = require('../../ivis-core/shared/signals');

const genericEntitySchema = {
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
    activityType: {
        type: SignalType.INTEGER,
        name: 'Activity Type',
        settings: {},
        indexed: true,
        weight_list: 2,
        weight_edit: 2
    },
    entityId: {
        type: SignalType.INTEGER,
        name: 'Entity ID',
        settings: {},
        indexed: true,
        weight_list: 3,
        weight_edit: 3
    }
};

const GENERIC_ENTITY_SCHEMA_MAX = 3;

module.exports.genericEntitySchema = genericEntitySchema;
module.exports.GENERIC_ENTITY_SCHEMA_MAX = GENERIC_ENTITY_SCHEMA_MAX;
