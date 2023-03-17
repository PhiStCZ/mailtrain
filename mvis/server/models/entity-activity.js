'use strict';

const config = require('../../ivis-core/server/lib/config');
const contextHelpers = require('../../ivis-core/server/lib/context-helpers');
const signalSets = require('../../ivis-core/server/models/signal-sets');
const { SignalType } = require('../../ivis-core/shared/signals');
const { LogTypeId } = require('../../../shared/activity-log');
const schemas = require('./schemas');
const activityLog = require('../lib/activity-log');

/**
 * All signal sets not bound to any entity instance.
 * At runtime it also contains cached signal sets.
 */
const staticSignalSets = {
    [LogTypeId.BLACKLIST]: {
        schema: {
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
                name: 'Activity Type',
                settings: {},
                indexed: true,
                weight_list: 2,
                weight_edit: 2
            },
            email: {
                type: SignalType.TEXT,
                name: 'Email address',
                settings: {},
                indexed: true,
                weight_list: 3,
                weight_edit: 3
            },
        },
        name: 'Blacklist',
        
        ingest: async function (record) {
            // let id = getLastId(...);
            return {
                // id: TODO
            };
        }
    },
    [LogTypeId.CAMPAIGN]: {
        schema: {
            ...schemas.genericEntitySchema,
            status: {
                type: SignalType.INTEGER,
                name: 'Campaign Status',
                settings: {},
                indexed: true,
                weight_list: schemas.GENERIC_ENTITY_SCHEMA_MAX + 1,
                weight_edit: schemas.GENERIC_ENTITY_SCHEMA_MAX + 1
            },
            triggerId: {
                type: SignalType.INTEGER,
                name: 'Campaign Trigger ID',
                settings: {},
                indexed: true,
                weight_list: schemas.GENERIC_ENTITY_SCHEMA_MAX + 2,
                weight_edit: schemas.GENERIC_ENTITY_SCHEMA_MAX + 2
            },
            listId: {
                type: SignalType.INTEGER,
                name: 'List ID',
                settings: {},
                indexed: true,
                weight_list: schemas.GENERIC_ENTITY_SCHEMA_MAX + 3,
                weight_edit: schemas.GENERIC_ENTITY_SCHEMA_MAX + 3
            },
            subscriptionId: {
                type: SignalType.INTEGER,
                name: 'Subscription ID',
                settings: {},
                indexed: true,
                weight_list: schemas.GENERIC_ENTITY_SCHEMA_MAX + 4,
                weight_edit: schemas.GENERIC_ENTITY_SCHEMA_MAX + 4
            },
            linkId: {
                type: SignalType.INTEGER,
                name: 'Link ID',
                settings: {},
                indexed: true,
                weight_list: schemas.GENERIC_ENTITY_SCHEMA_MAX + 5,
                weight_edit: schemas.GENERIC_ENTITY_SCHEMA_MAX + 5
            },
            url: {
                type: SignalType.TEXT,
                name: 'Link URL',
                settings: {},
                indexed: true,
                weight_list: schemas.GENERIC_ENTITY_SCHEMA_MAX + 6,
                weight_edit: schemas.GENERIC_ENTITY_SCHEMA_MAX + 6
            },
        },
        name: 'Campaign',
        // ingest
    },
    [LogTypeId.CHANNEL]: {
        schema: schemas.genericEntitySchema,
        name: 'Channel',
        
        // ingest
    },
    [LogTypeId.FORM]: {
        schema: schemas.genericEntitySchema,
        name: 'Form',
        // ingest
    },
    [LogTypeId.LIST]: {
        schema: {
            ...schemas.genericEntitySchema,
            fieldId: {
                type: SignalType.INTEGER,
                name: 'Field ID',
                settings: {},
                indexed: true,
                weight_list: schemas.GENERIC_ENTITY_SCHEMA_MAX + 1,
                weight_edit: schemas.GENERIC_ENTITY_SCHEMA_MAX + 1
            },
            importId: {
                type: SignalType.INTEGER,
                name: 'Import ID',
                settings: {},
                indexed: true,
                weight_list: schemas.GENERIC_ENTITY_SCHEMA_MAX + 2,
                weight_edit: schemas.GENERIC_ENTITY_SCHEMA_MAX + 2
            },
            importStatus: {
                type: SignalType.INTEGER,
                name: 'Import Status',
                settings: {},
                indexed: true,
                weight_list: schemas.GENERIC_ENTITY_SCHEMA_MAX + 3,
                weight_edit: schemas.GENERIC_ENTITY_SCHEMA_MAX + 3
            },
            segmentId: {
                type: SignalType.INTEGER,
                name: 'Segment ID',
                settings: {},
                indexed: true,
                weight_list: schemas.GENERIC_ENTITY_SCHEMA_MAX + 4,
                weight_edit: schemas.GENERIC_ENTITY_SCHEMA_MAX + 4
            },
            subscriptionId: {
                type: SignalType.INTEGER,
                name: 'Subscription ID',
                settings: {},
                indexed: true,
                weight_list: schemas.GENERIC_ENTITY_SCHEMA_MAX + 5,
                weight_edit: schemas.GENERIC_ENTITY_SCHEMA_MAX + 5
            }
        },
        name: 'List',
        // ingest
    },
    [LogTypeId.NAMESPACE]: {
        schema: schemas.genericEntitySchema,
        name: 'Namespace',
        
        // ingest
    },
    [LogTypeId.REPORT_TEMPLATE]: {
        schema: schemas.genericEntitySchema,
        name: 'Report Template',
        
        // ingest
    },
    [LogTypeId.REPORT]: {
        schema: {
            ...schemas.genericEntitySchema,
            status: {
                type: SignalType.INTEGER,
                name: 'Report Status',
                settings: {},
                indexed: true,
                weight_list: schemas.GENERIC_ENTITY_SCHEMA_MAX + 1,
                weight_edit: schemas.GENERIC_ENTITY_SCHEMA_MAX + 1
            }
        },
        name: 'Report',
        
        // ingest
    },
    [LogTypeId.SETTINGS]: {
        schema: {
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
            }
        },
        name: 'Settings',
        
        // ingest
    },
    [LogTypeId.SEND_CONFIGURATION]: {
        schema: schemas.genericEntitySchema,
        name: 'Send Configuration',
        
        // ingest
    },
    [LogTypeId.SHARE]: {
        schema: {
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
            entityTypeId: {
                type: SignalType.TEXT,
                name: 'Entity Type ID',
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
            },
            userId: {
                type: SignalType.INTEGER,
                name: 'User ID',
                settings: {},
                indexed: true,
                weight_list: 4,
                weight_edit: 4
            },
            role: {
                type: SignalType.TEXT,
                name: 'Assigned Role',
                settings: {},
                indexed: true,
                weight_list: 5,
                weight_edit: 5
            },
        },
        name: 'Share',
        
        // ingest
    },
    [LogTypeId.TEMPLATE]: {
        schema: {
            ...schemas.genericEntitySchema,
            listId: {
                type: SignalType.INTEGER,
                name: 'List ID',
                settings: {},
                indexed: true,
                weight_list: schemas.GENERIC_ENTITY_SCHEMA_MAX + 1,
                weight_edit: schemas.GENERIC_ENTITY_SCHEMA_MAX + 1
            },
            subscriptionId: {
                type: SignalType.INTEGER,
                name: 'Subscription ID',
                settings: {},
                indexed: true,
                weight_list: schemas.GENERIC_ENTITY_SCHEMA_MAX + 2,
                weight_edit: schemas.GENERIC_ENTITY_SCHEMA_MAX + 2
            }
        },
        name: 'Template',
        
        // ingest
    },
    [LogTypeId.MOSAICO_TEMPLATE]: {
        schema: schemas.genericEntitySchema,
        name: 'Mosaico Template',
        
        // ingest
    },
    [LogTypeId.USER]: {
        schema: schemas.genericEntitySchema,
        name: 'User',
        
        // ingest
    },
};

async function getCachedStaticSignalSet(context, eventTypeId) {
    const cached = staticSignalSets[eventTypeId].cached
    if (cached) {
        return cached;
    }

    const signalSetConfig = staticSignalSets[eventTypeId];
    const name = signalSetConfig.name;

    const sigSet = await signalSets.ensure(
        context,
        {
            cid: eventTypeId,
            name,
            description: '',
            namespace: config.mailtrain.namespace,
            // A different kind can be used to avoid having to insert timestamp everytime
        },
        signalSetConfig.schema
    );

    staticSignalSets[eventTypeId].cached = sigSet;
    return sigSet;
}

async function init() {
    for (const typeId in staticSignalSets) {
        await getCachedStaticSignalSet(contextHelpers.getAdminContext(), typeId);

        activityLog.on(typeId, async (context, records) => {
            const sigSetEntry = staticSignalSets[typeId];
            await activityLog.transformAndStoreEvents(context, records, sigSetEntry.cached, sigSetEntry.schema);
        });
    }
}

module.exports.getCachedStaticSignalSet = getCachedStaticSignalSet;
module.exports.init = init;
