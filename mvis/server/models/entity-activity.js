'use strict';

const config = require('../../ivis-core/server/lib/config');
const signalSets = require('../../ivis-core/server/models/signal-sets');
const { SignalType } = require('../../ivis-core/shared/signals');
const schemas = require('./schemas');

function _nameToSignalSetId(name) {
    return name.toLowerCase().replace(/ /g, '-');
}

async function _ensureAndGetSignalSet(self, dataEntry) {
    if (self._signalSet) {
        return self._signalSet;
    }
    const name = self._getSignalSetName(dataEntry);
    // possibly add self._getSignalSetDescription
    self._signalSet = await signalSets.ensure(
        context,
        {
            cid: _nameToSignalSetId(name),
            name,
            description: '',
            namespace: config.mailtrain.namespace,
        },
        self.schema
    );

    return self._signalSet;
}

async function _ensureAndGetNamedSignalSet(self, dataEntry) {
    const name = self._getSignalSetName(dataEntry);
    self._signalSets ??= {};

    let signalSet = self._signalSets[name];
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
        self.schema
    );

    self._signalSets[name] = signalSet;
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
    ensureAndGetSignalSet: async (dataEntry) => _ensureAndGetSignalSet(this, dataEntry),
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
            weight_list: schemas.GENERIC_ENTITY_SCHEMA_MAX,
            weight_edit: schemas.GENERIC_ENTITY_SCHEMA_MAX
        },
        triggerId: {
            type: SignalType.INTEGER,
            name: 'Campaign Trigger ID',
            settings: {},
            indexed: true,
            weight_list: schemas.GENERIC_ENTITY_SCHEMA_MAX,
            weight_edit: schemas.GENERIC_ENTITY_SCHEMA_MAX
        }
    },
    _getSignalSetName: (_) => 'Campaign',
    ensureAndGetSignalSet: async (dataEntry) => _ensureAndGetSignalSet(this, dataEntry),
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
        listId: {
            type: SignalType.INTEGER,
            name: 'List ID',
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
        linkId: {
            type: SignalType.INTEGER,
            name: 'Link ID',
            settings: {},
            indexed: true,
            weight_list: 3,
            weight_edit: 3
        },
    },
    _getSignalSetName: (dataEntry) => 'Campaign Tracker ' + dataEntry.data.campaign, // TODO: enforce not-null?
    ensureAndGetSignalSet: async (dataEntry) => _ensureAndGetNamedSignalSet(this, dataEntry),
    // ingest
};

const channel = {
    schema: schemas.genericEntitySchema,
    _getSignalSetName: (_) => 'Channel',
    ensureAndGetSignalSet: async (dataEntry) => _ensureAndGetSignalSet(this, dataEntry),
    // ingest
};

const form = {
    schema: schemas.genericEntitySchema,
    _getSignalSetName: (_) => 'Form',
    ensureAndGetSignalSet: async (dataEntry) => _ensureAndGetSignalSet(this, dataEntry),
    // ingest
};

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
        // TODO: this one might be included, but only for manual edits, and
        // then it shall be duplicated in tracker - uncomment when sure
        /*
        subscriptionId: {
            type: SignalType.INTEGER,
            name: 'Subscription ID',
            settings: {},
            indexed: true,
            weight_list: schemas.GENERIC_ENTITY_SCHEMA_MAX + 4,
            weight_edit: schemas.GENERIC_ENTITY_SCHEMA_MAX + 4
        },*/
    },
    _getSignalSetName: (_) => 'List',
    ensureAndGetSignalSet: async (dataEntry) => _ensureAndGetSignalSet(this, dataEntry),
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
        // mail hash
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
    _getSignalSetName: (dataEntry) => 'List Tracker ' + dataEntry.data.list, // TODO: enforce not-null?
    ensureAndGetSignalSet: async (dataEntry) => _ensureAndGetNamedSignalSet(this, dataEntry),
    // ingest
};

const namespace = {
    schema: schemas.genericEntitySchema,
    _getSignalSetName: (_) => 'Namespace',
    ensureAndGetSignalSet: async (dataEntry) => _ensureAndGetSignalSet(this, dataEntry),
    // ingest
};

const reportTemplate = {
    schema: schemas.genericEntitySchema,
    _getSignalSetName: (_) => 'Report Template',
    ensureAndGetSignalSet: async (dataEntry) => _ensureAndGetSignalSet(this, dataEntry),
    // ingest
};

const report = {
    schema: {
        ...schemas.genericEntitySchema,
        status: {
            type: SignalType.INTEGER,
            name: 'Trigger Status',
            settings: {},
            indexed: true,
            weight_list: schemas.GENERIC_ENTITY_SCHEMA_MAX,
            weight_edit: schemas.GENERIC_ENTITY_SCHEMA_MAX
        }
    },
    _getSignalSetName: (_) => 'Report',
    ensureAndGetSignalSet: async (dataEntry) => _ensureAndGetSignalSet(this, dataEntry),
    // ingest
};

const sendConfiguration = {
    schema: schemas.genericEntitySchema,
    _getSignalSetName: (_) => 'Send Configuration',
    ensureAndGetSignalSet: async (dataEntry) => _ensureAndGetSignalSet(this, dataEntry),
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
            type: SignalType.INTEGER,
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
    ensureAndGetSignalSet: async (dataEntry) => _ensureAndGetSignalSet(this, dataEntry),
    // ingest
};

const template = {
    schema: schemas.genericEntitySchema,
    _getSignalSetName: (_) => 'Template',
    ensureAndGetSignalSet: async (dataEntry) => _ensureAndGetSignalSet(this, dataEntry),
    // ingest

};

const mosaicoTemplate = {
    schema: schemas.genericEntitySchema,
    _getSignalSetName: (_) => 'Mosaico Template',
    ensureAndGetSignalSet: async (dataEntry) => _ensureAndGetSignalSet(this, dataEntry),
    // ingest
};

const user = {
    schema: schemas.genericEntitySchema,
    _getSignalSetName: (_) => 'User',
    ensureAndGetSignalSet: async (dataEntry) => _ensureAndGetSignalSet(this, dataEntry),
    // ingest
};

module.exports = {
    blacklist,
    campaign,
    campaign_tracker: campaignTracker,
    channel,
    form,
    list,
    list_tracker: listTracker,
    namespace,
    report_template: reportTemplate,
    report,
    send_configuration: sendConfiguration,
    share,
    template,
    mosaico_template: mosaicoTemplate,
    user
};