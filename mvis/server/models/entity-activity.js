'use strict';

const config = require('../../ivis-core/server/lib/config');
const signalSets = require('../../ivis-core/server/models/signal-sets');
const { SignalType } = require('../../ivis-core/shared/signals');
const schemas = require('./schemas');

const blacklist = {
    // name?
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
    }
    // ensure, ingest
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
    ensure: async function(context) {
        return await signalSets.ensure(
            context,
            {
                cid: 'campaign',
                name: 'Campaign',
                description: '',
                namespace: config.mailtrain.namespace,
            },
            this.schema
        );
    },
    ingest: async function (record) {
        // let id = getLastId(...);
        return {
            // id: TODO
        };
    }
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
    }
    // ensure, ingest
};

const channel = {
    schema: schemas.genericEntitySchema,
    ensure: async function(context) {
        return await signalSets.ensure(
            context,
            {
                cid: 'channel',
                name: 'Channel',
                description: '',
                namespace: config.mailtrain.namespace,
            },
            this.schema
        );
    },
    ingest: async function (record) {
        // let id = getLastId(...);
        return {
            // id: TODO
        };
    }
};

const form = {
    schema: schemas.genericEntitySchema,
    ensure: async function(context) {
        return await signalSets.ensure(
            context,
            {
                cid: 'form',
                name: 'Form',
                description: '',
                namespace: config.mailtrain.namespace,
            },
            this.schema
        );
    },
    ingest: async function (record) {
        // let id = getLastId(...);
        return {
            // id: TODO
        };
    }
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
    }
    // ensure, ingest
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
    }
    // ensure, ingest
};

const namespace = {
    schema: schemas.genericEntitySchema,
    ensure: async function(context) {
        return await signalSets.ensure(
            context,
            {
                cid: 'namespace',
                name: 'Namespace',
                description: '',
                namespace: config.mailtrain.namespace,
            },
            this.schema
        );
    },
    ingest: async function (record) {
        // let id = getLastId(...);
        return {
            // id: TODO
        };
    }
};

const reportTemplate = {
    schema: schemas.genericEntitySchema,
    ensure: async function(context) {
        return await signalSets.ensure(
            context,
            {
                cid: 'report-template',
                name: 'Report Template',
                description: '',
                namespace: config.mailtrain.namespace,
            },
            this.schema
        );
    },
    ingest: async function (record) {
        // let id = getLastId(...);
        return {
            // id: TODO
        };
    }
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
    ensure: async function(context) {
        return await signalSets.ensure(
            context,
            {
                cid: 'namespace',
                name: 'Namespace',
                description: '',
                namespace: config.mailtrain.namespace,
            },
            this.schema
        );
    },
    ingest: async function (record) {
        // let id = getLastId(...);
        return {
            // id: TODO
        };
    }
};

const sendConfiguration = {
    schema: schemas.genericEntitySchema,
    ensure: async function(context) {
        return await signalSets.ensure(
            context,
            {
                cid: 'send-configuration',
                name: 'Send Configuration',
                description: '',
                namespace: config.mailtrain.namespace,
            },
            this.schema
        );
    },
    ingest: async function (record) {
        // let id = getLastId(...);
        return {
            // id: TODO
        };
    }
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
    ensure: async function(context) {
        return await signalSets.ensure(
            context,
            {
                cid: 'share',
                name: 'Share',
                description: '',
                namespace: config.mailtrain.namespace,
            },
            this.schema
        );
    },
    ingest: async function (record) {
        // let id = getLastId(...);
        return {
            // id: TODO
        };
    }
};

const template = {
    schema: schemas.genericEntitySchema,
    ensure: async function(context) {
        return await signalSets.ensure(
            context,
            {
                cid: 'template',
                name: 'Template',
                description: '',
                namespace: config.mailtrain.namespace,
            },
            this.schema
        );
    },
    ingest: async function (record) {
        // let id = getLastId(...);
        return {
            // id: TODO
        };
    }
};

const mosaicoTemplate = {
    schema: schemas.genericEntitySchema,
    ensure: async function(context) {
        return await signalSets.ensure(
            context,
            {
                cid: 'mosaicoTemplate',
                name: 'mosaicoTemplate',
                description: '',
                namespace: config.mailtrain.namespace,
            },
            this.schema
        );
    },
    ingest: async function (record) {
        // let id = getLastId(...);
        return {
            // id: TODO
        };
    }
};

const user = {
    schema: schemas.genericEntitySchema,
    ensure: async function(context) {
        return await signalSets.ensure(
            context,
            {
                cid: 'user',
                name: 'User',
                description: '',
                namespace: config.mailtrain.namespace,
            },
            this.schema
        );
    },
    ingest: async function (record) {
        // let id = getLastId(...);
        return {
            // id: TODO
        };
    }
};

module.exports = {
    blacklist,
    campaign,
    campaignTracker,
    channel,
    form,
    list,
    listTracker,
    namespace,
    reportTemplate,
    report,
    sendConfiguration,
    share,
    template,
    mosaicoTemplate,
    user
};