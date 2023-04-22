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
            ...schemas.staticEntityActivitySchema,
            status: {
                type: SignalType.INTEGER,
                name: 'Campaign Status',
                settings: {},
                indexed: true,
                weight_list: schemas.STATIC_ENTITY_ACTIVITY_SCHEMA_MAX + 1,
                weight_edit: schemas.STATIC_ENTITY_ACTIVITY_SCHEMA_MAX + 1
            },
            channelId: {
                type: SignalType.INTEGER,
                name: 'Channel ID',
                settings: {},
                indexed: true,
                weight_list: schemas.STATIC_ENTITY_ACTIVITY_SCHEMA_MAX + 2,
                weight_edit: schemas.STATIC_ENTITY_ACTIVITY_SCHEMA_MAX + 2
            },
            triggerId: {
                type: SignalType.INTEGER,
                name: 'Campaign Trigger ID',
                settings: {},
                indexed: true,
                weight_list: schemas.STATIC_ENTITY_ACTIVITY_SCHEMA_MAX + 3,
                weight_edit: schemas.STATIC_ENTITY_ACTIVITY_SCHEMA_MAX + 3
            },
            listId: {
                type: SignalType.INTEGER,
                name: 'List ID',
                settings: {},
                indexed: true,
                weight_list: schemas.STATIC_ENTITY_ACTIVITY_SCHEMA_MAX + 4,
                weight_edit: schemas.STATIC_ENTITY_ACTIVITY_SCHEMA_MAX + 4
            },
            subscriptionId: {
                type: SignalType.INTEGER,
                name: 'Subscription ID',
                settings: {},
                indexed: true,
                weight_list: schemas.STATIC_ENTITY_ACTIVITY_SCHEMA_MAX + 5,
                weight_edit: schemas.STATIC_ENTITY_ACTIVITY_SCHEMA_MAX + 5
            },
            linkId: {
                type: SignalType.INTEGER,
                name: 'Link ID',
                settings: {},
                indexed: true,
                weight_list: schemas.STATIC_ENTITY_ACTIVITY_SCHEMA_MAX + 6,
                weight_edit: schemas.STATIC_ENTITY_ACTIVITY_SCHEMA_MAX + 6
            },
            url: {
                type: SignalType.TEXT,
                name: 'Link URL',
                settings: {},
                indexed: true,
                weight_list: schemas.STATIC_ENTITY_ACTIVITY_SCHEMA_MAX + 7,
                weight_edit: schemas.STATIC_ENTITY_ACTIVITY_SCHEMA_MAX + 7
            },
        },
        name: 'Campaign',
    },
    [LogTypeId.CHANNEL]: {
        schema: {
            ...schemas.staticEntityActivitySchema,
            campaignId: {
                type: SignalType.INTEGER,
                name: 'Campaign ID',
                settings: {},
                indexed: true,
                weight_list: schemas.STATIC_ENTITY_ACTIVITY_SCHEMA_MAX + 1,
                weight_edit: schemas.STATIC_ENTITY_ACTIVITY_SCHEMA_MAX + 1
            },
        },
        name: 'Channel',
    },
    [LogTypeId.FORM]: {
        schema: schemas.staticEntityActivitySchema,
        name: 'Form',
        // ingest
    },
    [LogTypeId.LIST]: {
        schema: {
            ...schemas.staticEntityActivitySchema,
            fieldId: {
                type: SignalType.INTEGER,
                name: 'Field ID',
                settings: {},
                indexed: true,
                weight_list: schemas.STATIC_ENTITY_ACTIVITY_SCHEMA_MAX + 1,
                weight_edit: schemas.STATIC_ENTITY_ACTIVITY_SCHEMA_MAX + 1
            },
            importId: {
                type: SignalType.INTEGER,
                name: 'Import ID',
                settings: {},
                indexed: true,
                weight_list: schemas.STATIC_ENTITY_ACTIVITY_SCHEMA_MAX + 2,
                weight_edit: schemas.STATIC_ENTITY_ACTIVITY_SCHEMA_MAX + 2
            },
            importStatus: {
                type: SignalType.INTEGER,
                name: 'Import Status',
                settings: {},
                indexed: true,
                weight_list: schemas.STATIC_ENTITY_ACTIVITY_SCHEMA_MAX + 3,
                weight_edit: schemas.STATIC_ENTITY_ACTIVITY_SCHEMA_MAX + 3
            },
            segmentId: {
                type: SignalType.INTEGER,
                name: 'Segment ID',
                settings: {},
                indexed: true,
                weight_list: schemas.STATIC_ENTITY_ACTIVITY_SCHEMA_MAX + 4,
                weight_edit: schemas.STATIC_ENTITY_ACTIVITY_SCHEMA_MAX + 4
            },
            subscriptionId: {
                type: SignalType.INTEGER,
                name: 'Subscription ID',
                settings: {},
                indexed: true,
                weight_list: schemas.STATIC_ENTITY_ACTIVITY_SCHEMA_MAX + 5,
                weight_edit: schemas.STATIC_ENTITY_ACTIVITY_SCHEMA_MAX + 5
            },
            campaignId: {
                type: SignalType.INTEGER,
                name: 'Campaign ID',
                settings: {},
                indexed: true,
                weight_list: schemas.ENTITY_ACTIVITY_SCHEMA_MAX + 6,
                weight_edit: schemas.ENTITY_ACTIVITY_SCHEMA_MAX + 6
            }
        },
        name: 'List',
    },
    [LogTypeId.NAMESPACE]: {
        schema: schemas.staticEntityActivitySchema,
        name: 'Namespace',
    },
    [LogTypeId.REPORT_TEMPLATE]: {
        schema: schemas.staticEntityActivitySchema,
        name: 'Report Template',
    },
    [LogTypeId.REPORT]: {
        schema: {
            ...schemas.staticEntityActivitySchema,
            status: {
                type: SignalType.INTEGER,
                name: 'Report Status',
                settings: {},
                indexed: true,
                weight_list: schemas.STATIC_ENTITY_ACTIVITY_SCHEMA_MAX + 1,
                weight_edit: schemas.STATIC_ENTITY_ACTIVITY_SCHEMA_MAX + 1
            }
        },
        name: 'Report',
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
    },
    [LogTypeId.SEND_CONFIGURATION]: {
        schema: schemas.staticEntityActivitySchema,
        name: 'Send Configuration',
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
    },
    [LogTypeId.TEMPLATE]: {
        schema: {
            ...schemas.staticEntityActivitySchema,
            listId: {
                type: SignalType.INTEGER,
                name: 'List ID',
                settings: {},
                indexed: true,
                weight_list: schemas.STATIC_ENTITY_ACTIVITY_SCHEMA_MAX + 1,
                weight_edit: schemas.STATIC_ENTITY_ACTIVITY_SCHEMA_MAX + 1
            },
            subscriptionId: {
                type: SignalType.INTEGER,
                name: 'Subscription ID',
                settings: {},
                indexed: true,
                weight_list: schemas.STATIC_ENTITY_ACTIVITY_SCHEMA_MAX + 2,
                weight_edit: schemas.STATIC_ENTITY_ACTIVITY_SCHEMA_MAX + 2
            }
        },
        name: 'Template',
    },
    [LogTypeId.MOSAICO_TEMPLATE]: {
        schema: schemas.staticEntityActivitySchema,
        name: 'Mosaico Template',
    },
    [LogTypeId.USER]: {
        schema: schemas.staticEntityActivitySchema,
        name: 'User',
    },
};

async function ensureStaticSignalSet(context, eventTypeId) {
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
        await ensureStaticSignalSet(contextHelpers.getAdminContext(), typeId);

        activityLog.on(typeId, async (context, records) => {
            const sigSetEntry = staticSignalSets[typeId];
            await activityLog.transformAndStoreEvents(context, records, sigSetEntry.cached, sigSetEntry.schema);
        });
    }
}

module.exports.init = init;
