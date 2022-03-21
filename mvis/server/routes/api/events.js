'use strict';

const config = require('../../../ivis-core/server/lib/config');
const moment = require('moment');
const knex = require('../../../ivis-core/server/lib/knex');
const router = require('../../../ivis-core/server/lib/router-async').create();
const log = require('../../../ivis-core/server/lib/log');
const signalSets = require('../../../ivis-core/server/models/signal-sets');
const { getLastId } = require('../../../ivis-core/server/models/signal-storage');
const { SignalType } = require('../../../ivis-core/shared/signals');

const entityActivity = require('./entity-activity');
const blacklist = require('./blacklist');
const share = require('./share');


// the types need to have `ensure()`, `ingest(record)`, and `schema` entries
const types = {
    blacklist,
    share,
    // entityActivity,
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
            // becuase of simple functionality, this is not done with templates
            signals: { timestamp: moment(dataEntry.timestamp) }
        };


        for (const fieldId in dataEntry.data) {
            if (fieldId == 'typeId' || fieldId == 'timestamp') {
                throw new Error(`Invalid data field "${fieldId}"`);
            }
            if (!(fieldId in types[type].schema)) {
                throw new Error(`Unknown data field "${fieldId}"`);
            }

            let value = dataEntry.data[fieldId];

            if (types[type].schema[fieldId].type === SignalType.DATE_TIME) {
                value = moment(value);
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

module.exports = router;
