'use strict';

const config = require('../../ivis-core/server/lib/config');
const signalSets = require('../../ivis-core/server/models/signal-sets');
const { SignalType } = require('../../ivis-core/shared/signals');
const schemas = require('./schemas');

function _nameToSignalSetId(name) {
    return name.toLowerCase().replace(/ /g, '-');
}

async function _ensureAndGetSignalSet(instance, context, dataEntry) {
    if (instance._signalSet) {
        return instance._signalSet;
    }
    const name = instance._getSignalSetName(dataEntry);
    // possibly add self._getSignalSetDescription
    instance._signalSet = await signalSets.ensure(
        context,
        {
            cid: _nameToSignalSetId(name),
            name,
            description: '',
            namespace: config.mailtrain.namespace,
        },
        instance.schema
    );

    return instance._signalSet;
}

async function _ensureAndGetNamedSignalSet(instance, context, dataEntry) {
    if (!instance._signalSets) {
        instance._signalSets = {};
    }

    const name = instance._getSignalSetName(dataEntry);
    let signalSet = instance._signalSets[name];
    if (signalSet) {
        return signalSet;
    }

    signalSet = await signalSets.ensure(
        context,
        {
            cid: _nameToSignalSetId(name),
            name,
            description: '',
            namespace: config.mailtrain.namespace,
        },
        instance.schema
    );

    instance._signalSets[name] = signalSet;
    return signalSet;
}

const blacklist = {
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
    _getSignalSetName: (_) => 'Blacklist',
    ensureAndGetSignalSet: function (context, dataEntry) { return _ensureAndGetSignalSet(this, context, dataEntry); },
    ingest: async function (record) {
        // let id = getLastId(...);
        return {
            // id: TODO
        };
    }
};

const campaign = {
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
        }
    },
    _getSignalSetName: (_) => 'Campaign',
    ensureAndGetSignalSet: function (context, dataEntry) { return _ensureAndGetSignalSet(this, context, dataEntry); },
    // ingest
};

const campaignTracker = { // per campaign
    schema: {
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
        listId: {
            type: SignalType.INTEGER,
            name: 'List ID',
            settings: {},
            indexed: true,
            weight_list: 2,
            weight_edit: 2
        },
        subscriptionId: {
            type: SignalType.INTEGER,
            name: 'Subscription ID',
            settings: {},
            indexed: true,
            weight_list: 3,
            weight_edit: 3
        },
        linkId: {
            type: SignalType.INTEGER,
            name: 'Link ID',
            settings: {},
            indexed: true,
            weight_list: 4,
            weight_edit: 4
        },
        triggerId: {
            type: SignalType.INTEGER,
            name: 'Trigger ID',
            settings: {},
            indexed: true,
            weight_list: 5,
            weight_edit: 5
        }
    },
    _getSignalSetName: (dataEntry) => 'Campaign Tracker ' + dataEntry.campaignId, // TODO: enforce not-null?
    ensureAndGetSignalSet: function (context, dataEntry) { return _ensureAndGetNamedSignalSet(this, context, dataEntry); },
    // ingest
};

const channel = {
    schema: schemas.genericEntitySchema,
    _getSignalSetName: (_) => 'Channel',
    ensureAndGetSignalSet: function (context, dataEntry) { return _ensureAndGetSignalSet(this, context, dataEntry); },
    // ingest
};

const form = {
    schema: schemas.genericEntitySchema,
    _getSignalSetName: (_) => 'Form',
    ensureAndGetSignalSet: function (context, dataEntry) { return _ensureAndGetSignalSet(this, context, dataEntry); },
    // ingest
};

const link = {
    schema: {
        ...schemas.genericEntitySchema,
        campaignId: {
            type: SignalType.INTEGER,
            name: 'Campaign ID',
            settings: {},
            indexed: true,
            weight_list: schemas.GENERIC_ENTITY_SCHEMA_MAX + 1,
            weight_edit: schemas.GENERIC_ENTITY_SCHEMA_MAX + 1
        },
        url: {
            type: SignalType.TEXT,
            name: 'Link URL',
            settings: {},
            indexed: true,
            weight_list: schemas.GENERIC_ENTITY_SCHEMA_MAX + 2,
            weight_edit: schemas.GENERIC_ENTITY_SCHEMA_MAX + 2
        },
    },
    _getSignalSetName: (_) => 'Link',
    ensureAndGetSignalSet: function (context, dataEntry) { return _ensureAndGetSignalSet(this, context, dataEntry); },
    // ingest
}

/*

activities:
  CUD,
  fields ( CUD ),
  imports ( CUD, statusChange ),
  subs ( CUD, statusChange ) <- might be in a separate listTracker sigset

fields:
  (listId, activityType, issuedBy)
  fieldId
  importId
  importStatus
  subId
  subStatus

*/

const list = { // global
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
            name: 'Import ID',
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
        // TODO: this one might be included, but only for manual edits, and
        // then it shall be duplicated in tracker - uncomment when sure
        /*
        subscriptionId: {
            type: SignalType.INTEGER,
            name: 'Subscription ID',
            settings: {},
            indexed: true,
            weight_list: schemas.GENERIC_ENTITY_SCHEMA_MAX + 5,
            weight_edit: schemas.GENERIC_ENTITY_SCHEMA_MAX + 5
        },*/
    },
    _getSignalSetName: (_) => 'List',
    ensureAndGetSignalSet: function (context, dataEntry) { return _ensureAndGetSignalSet(this, context, dataEntry); },
    // ingest
};

const listTracker = { // tracks only subscriptions // per list
    schema: {
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
        subscriptionId: {
            type: SignalType.INTEGER,
            name: 'Subscription ID',
            settings: {},
            indexed: true,
            weight_list: 2,
            weight_edit: 2
        },
        // TODO: add mail hash
        subscriptionStatus: {
            type: SignalType.INTEGER,
            name: 'Subscription Status',
            settings: {},
            indexed: true,
            weight_list: 3,
            weight_edit: 3
        },
        previousSubscriptionStatus: {
            type: SignalType.INTEGER,
            name: 'Previous Subscription Status',
            settings: {},
            indexed: true,
            weight_list: 4,
            weight_edit: 4
        },
    },
    _getSignalSetName: (dataEntry) => 'List Tracker ' + dataEntry.listId, // TODO: enforce not-null?
    ensureAndGetSignalSet: function (context, dataEntry) { return _ensureAndGetNamedSignalSet(this, context, dataEntry); },
    // ingest
};

const namespace = {
    schema: schemas.genericEntitySchema,
    _getSignalSetName: (_) => 'Namespace',
    ensureAndGetSignalSet: function (context, dataEntry) { return _ensureAndGetSignalSet(this, context, dataEntry); },
    // ingest
};

const reportTemplate = {
    schema: schemas.genericEntitySchema,
    _getSignalSetName: (_) => 'Report Template',
    ensureAndGetSignalSet: function (context, dataEntry) { return _ensureAndGetSignalSet(this, context, dataEntry); },
    // ingest
};

const report = {
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
    _getSignalSetName: (_) => 'Report',
    ensureAndGetSignalSet: function (context, dataEntry) { return _ensureAndGetSignalSet(this, context, dataEntry); },
    // ingest
};

const settings = {
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
    _getSignalSetName: (_) => 'Settings',
    ensureAndGetSignalSet: function (context, dataEntry) { return _ensureAndGetSignalSet(this, context, dataEntry); },
    // ingest
}

const sendConfiguration = {
    schema: schemas.genericEntitySchema,
    _getSignalSetName: (_) => 'Send Configuration',
    ensureAndGetSignalSet: function (context, dataEntry) { return _ensureAndGetSignalSet(this, context, dataEntry); },
    // ingest
};

const share = {
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
    _getSignalSetName: (_) => 'Share',
    ensureAndGetSignalSet: function (context, dataEntry) { return _ensureAndGetSignalSet(this, context, dataEntry); },
    // ingest
};

const template = {
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
    _getSignalSetName: (_) => 'Template',
    ensureAndGetSignalSet: function (context, dataEntry) { return _ensureAndGetSignalSet(this, context, dataEntry); },
    // ingest
};

const mosaicoTemplate = {
    schema: schemas.genericEntitySchema,
    _getSignalSetName: (_) => 'Mosaico Template',
    ensureAndGetSignalSet: function (context, dataEntry) { return _ensureAndGetSignalSet(this, context, dataEntry); },
    // ingest
};

const user = {
    schema: schemas.genericEntitySchema,
    _getSignalSetName: (_) => 'User',
    ensureAndGetSignalSet: function (context, dataEntry) { return _ensureAndGetSignalSet(this, context, dataEntry); },
    // ingest
};

module.exports = {
    blacklist,
    campaign,
    campaign_tracker: campaignTracker,
    channel,
    form,
    link,
    list,
    list_tracker: listTracker,
    namespace,
    report_template: reportTemplate,
    report,
    settings,
    send_configuration: sendConfiguration,
    share,
    template,
    mosaico_template: mosaicoTemplate,
    user
};
