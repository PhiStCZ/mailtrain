'use strict';

const { SignalType } = require('../../ivis-core/shared/signals');

const timestampSignal = {
    type: SignalType.DATE_TIME,
    name: 'Timestamp',
    settings: {},
    indexed: true,
    weight_list: 0,
    weight_edit: 0
};


const entityActivitySchema = {
    timestamp: timestampSignal,
    actor: {
        type: SignalType.INTEGER,
        name: 'Activity Actor',
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
};

const ENTITY_ACTIVITY_SCHEMA_MAX = 2;


const staticEntityActivitySchema = {
    ...entityActivitySchema,
    entityId: {
        type: SignalType.INTEGER,
        name: 'Entity ID',
        settings: {},
        indexed: true,
        weight_list: 3,
        weight_edit: 3
    }
};

const STATIC_ENTITY_ACTIVITY_SCHEMA_MAX = ENTITY_ACTIVITY_SCHEMA_MAX + 1;

module.exports.entityActivitySchema = entityActivitySchema;
module.exports.ENTITY_ACTIVITY_SCHEMA_MAX = ENTITY_ACTIVITY_SCHEMA_MAX;
module.exports.staticEntityActivitySchema = staticEntityActivitySchema;
module.exports.STATIC_ENTITY_ACTIVITY_SCHEMA_MAX = STATIC_ENTITY_ACTIVITY_SCHEMA_MAX;
