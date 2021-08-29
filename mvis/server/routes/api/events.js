'use strict';

const config = require('../../../ivis-core/server/lib/config');
const moment = require('moment');
const knex = require('../../../ivis-core/server/lib/knex');
const router = require('../../../ivis-core/server/lib/router-async').create();
const log = require('../../../ivis-core/server/lib/log');
const signalSets = require('../../../ivis-core/server/models/signal-sets');
const { getLastId } = require('../../../ivis-core/server/models/signal-storage');
const { SignalType } = require('../../../ivis-core/shared/signals');

/*
const timestampSchema = {
    timestamp: {
        type: SignalType.DATE_TIME,
        name: 'Timestamp',
        settings: {},
        indexed: true,
        weight_list: 0,
        weight_edit: 0
    }
};

const entitySchema = {
    id: {
            type: SignalType.INTEGER,
            name: 'ID',
            settings: {},
            indexed: true,
            weight_list: 1,
            weight_edit: 1
    },
    activityType: {
        type: SignalType.INTEGER,
        name: 'ActivityType',
        settings: {},
        indexed: true,
        weight_list: 2,
        weight_edit: 2,
    },
};

// the schema could then look like this:
{
    ...timestampSchema,
    ...entitySchema,
    // anything else
}

*/

const schemas = {
    campaign_tracker: {
        type: {
            type: SignalType.INTEGER,
            name: 'Type',
            settings: {},
            indexed: true,
            weight_list: 0,
            weight_edit: 0
        },
        timestamp: {
            type: SignalType.DATE_TIME,
            name: 'Timestamp',
            settings: {},
            indexed: true,
            weight_list: 1,
            weight_edit: 1
        },
        campaign: {
            type: SignalType.INTEGER,
            name: 'Campaign ID',
            settings: {},
            indexed: true,
            weight_list: 2,
            weight_edit: 2
        },
        list: {
            type: SignalType.INTEGER,
            name: 'List ID',
            settings: {},
            indexed: true,
            weight_list: 3,
            weight_edit: 3
        },
        subscription: {
            type: SignalType.INTEGER,
            name: 'Subscription ID',
            settings: {},
            indexed: true,
            weight_list: 4,
            weight_edit: 4
        },
    },
    blacklist: {
        timestamp: {
            type: SignalType.DATE_TIME,
            name: 'Timestamp',
            settings: {},
            indexed: true,
            weight_list: 1,
            weight_edit: 1
        },
        type: {
            type: SignalType.INTEGER,
            name: 'Type',
            settings: {},
            indexed: true,
            weight_list: 0,
            weight_edit: 0
        },
        email: {
            type: SignalType.TEXT,
            name: 'Email address',
            settings: {},
            indexed: true,
            weight_list: 2,
            weight_edit: 2
        },
    },
    channel: {
        timestamp: {
            type: SignalType.DATE_TIME,
            name: 'Timestamp',
            settings: {},
            indexed: true,
            weight_list: 0,
            weight_edit: 0
        },
        entity: {
            type: SignalType.INTEGER,
            name: 'Channel ID',
            settings: {},
            indexed: true,
            weight_list: 1,
            weight_edit: 1
        },
        type: { // activityType ?
            type: SignalType.INTEGER,
            name: 'Activity Type',
            settings: {},
            indexed: true,
            weight_list: 2,
            weight_edit: 2,
        },
    },
    list: {
        timestamp: {
            type: SignalType.DATE_TIME,
            name: 'Timestamp',
            settings: {},
            indexed: true,
            weight_list: 0,
            weight_edit: 0
        },
        entity: {
            type: SignalType.INTEGER,
            name: 'List ID',
            settings: {},
            indexed: true,
            weight_list: 1,
            weight_edit: 1
        },
        type: {
            type: SignalType.INTEGER,
            name: 'Activity Type',
            settings: {},
            indexed: true,
            weight_list: 2,
            weight_edit: 2,
        },
        importId:{
            type: SignalType.INTEGER,
            name: 'Import ID',
            settings: {},
            indexed: true,
            weight_list: 3,
            weight_edit: 3,
        },
        importStatus:{
            type: SignalType.INTEGER,
            name: 'Import Status',
            settings: {},
            indexed: true,
            weight_list: 4,
            weight_edit: 4,
        },
        segmentId:{
            type: SignalType.INTEGER,
            name: 'Segment ID',
            settings: {},
            indexed: true,
            weight_list: 5,
            weight_edit: 5,
        },
        fieldId:{
            type: SignalType.INTEGER,
            name: 'Field ID',
            settings: {},
            indexed: true,
            weight_list: 6,
            weight_edit: 6,
        },
    },
    campaign: {
        timestamp: {
            type: SignalType.DATE_TIME,
            name: 'Timestamp',
            settings: {},
            indexed: true,
            weight_list: 0,
            weight_edit: 0
        },
        entity: {
            type: SignalType.INTEGER,
            name: 'Campaign ID',
            settings: {},
            indexed: true,
            weight_list: 1,
            weight_edit: 1
        },
        type: {
            type: SignalType.INTEGER,
            name: 'Activity Type',
            settings: {},
            indexed: true,
            weight_list: 2,
            weight_edit: 2,
        },
        status: {
            type: SignalType.INTEGER,
            name: 'Campaign Status',
            settings: {},
            indexed: true,
            weight_list: 2,
            weight_edit: 2,
        },
        list: {
            type: SignalType.INTEGER,
            name: 'List ID',
            settings: {},
            indexed: true,
            weight_list: 3,
            weight_edit: 3,
        },
        subscription: {
            type: SignalType.INTEGER,
            name: 'Subscription ID',
            settings: {},
            indexed: true,
            weight_list: 4,
            weight_edit: 4,
        },
    },
}

async function ensureCampaignTracker(context) {
    return await signalSets.ensure(
        context,
        {
            cid: 'campaignTracker',
            name: 'Campaign Tracker',
            description: '',
            namespace: config.mailtrain.namespace,
        },
        schemas.campaign_tracker
    );
}

async function ingestCampaignTrackerRecord(record) {
    // let id = getLastId(...);
    return {
        // id: TODO
    };
}

async function ensureBlacklist(context) {
    return await signalSets.ensure(
        context,
        {
            cid: 'blacklist',
            name: 'Blacklist',
            description: '',
            namespace: config.mailtrain.namespace,
        },
        schemas.blacklist
    );
}

async function ingestBlacklistRecord(record) {
    // ??
    return {
        //id: TODO
    };
}

async function ensureChannel(context) {
    return await signalSets.ensure(
        context,
        {
            cid: 'channel',
            name: 'Channel',
            description: '',
            namespace: config.mailtrain.namespace,
        },
        schemas.channel
    );
}

async function ensureList(context) {
    return await signalSets.ensure(
        context,
        {
            cid: 'list',
            name: 'List',
            description: '',
            namespace: config.mailtrain.namespace,
        },
        schemas.list
    );
}

async function ensureCampaign(context) {
    return await signalSets.ensure(
        context,
        {
            cid: 'campaign',
            name: 'Campaign',
            description: '',
            namespace: config.mailtrain.namespace,
        },
        schemas.campaign
    );
}

const types = {
    campaign_tracker: {
        ensure: ensureCampaignTracker,
        ingest: ingestCampaignTrackerRecord
    },
    blacklist: {
        ensure: ensureBlacklist,
        ingest: ingestBlacklistRecord
    },
    channel: {
        ensure: ensureChannel,
    },
    list: {
        ensure: ensureList,
    },
    campaign: {
        ensure: ensureCampaign,
    }
}

router.postAsync('/events', async (req, res) => {
    const batch = req.body;

    const recordsByType = {};
    const signalSetWithSignalMapByType = {};
    const lastIdsByType = {};

    for (const type in types) {
        recordsByType[type] = [];
        let sigSet = await types[type].ensure(req.context);
        signalSetWithSignalMapByType[type] = sigSet;
        lastIdsByType[type] = (await getLastId(sigSet)) || 0;
    }
    
    for (const dataEntry of batch.data) {
        const type = dataEntry.typeId;
        const record = {
            id: ++(lastIdsByType[type]),
            // isn't it better to use the template instead ?
            signals: { timestamp: moment(dataEntry.timestamp) }
        };


        for (const fieldId in dataEntry.data) {
            if (fieldId == 'typeId' || fieldId == 'timestamp') {
                throw new Error(`Invalid data field "${fieldId}"`);
            }
            if (!(fieldId in schemas[type])) {
                throw new Error(`Unknown data field "${fieldId}"`);
            }

            let value = dataEntry.data[fieldId];

            if (schemas[type][fieldId].type === SignalType.DATE_TIME) {
                value = moment(value); // parse date from string?
            }

            record.signals[fieldId] = value;
        }

        recordsByType[type].push(record);
    }
    
    for (const type in types) {
        if (recordsByType[type].length > 0) {
            await signalSets.insertRecords(
                req.context,
                signalSetWithSignalMapByType[type],
                recordsByType[type]
            );
        }
    }

    return res.json();
});

router.getAsync('/test', async (req,res) => {
    console.log('hello,get, context: ' + req.context);
    res.send('hello');
});

module.exports = router;
