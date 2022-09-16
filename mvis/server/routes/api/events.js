'use strict';

const config = require('../../../ivis-core/server/lib/config');
const moment = require('moment');
const knex = require('../../../ivis-core/server/lib/knex');
const router = require('../../../ivis-core/server/lib/router-async').create();
const log = require('../../../ivis-core/server/lib/log');
const signalSets = require('../../../ivis-core/server/models/signal-sets');
const { getLastId } = require('../../../ivis-core/server/models/signal-storage');
const { SignalType } = require('../../../ivis-core/shared/signals');

// the entity activity types need to have `ensure()`, `ingest(record)`, and `schema` entries
const entityActivity = require('../../models/entity-activity');

router.postAsync('/events', async (req, res) => {
    const batch = req.body;
    const recordsAndLastIdsBySignalSet = new Map();

    for (const dataEntry of batch.data) {
        const type = dataEntry.typeId;
        const sigSet = await entityActivity[type].ensureAndGetSignalSet(req.context, dataEntry);

        let recordsAndLastId = recordsAndLastIdsBySignalSet.get(sigSet);
        if (!recordsAndLastId) {
            const lastId = (await getLastId(sigSet)) || 0;
            recordsAndLastId = {records: [], lastId: lastId + 1};
            recordsAndLastIdsBySignalSet.set(sigSet, recordsAndLastId);
        }

        const record = {
            id: (recordsAndLastId.lastId)++,
            // becuase of simple functionality, this is not done with templates
            signals: { timestamp: moment(dataEntry.timestamp) }
        };

        for (const fieldId in dataEntry.data) {
            if (fieldId == 'typeId' || fieldId == 'timestamp') {
                throw new Error(`Invalid data field "${fieldId}"`);
            }
            if (!(fieldId in entityActivity[type].schema)) {
                throw new Error(`Unknown data field "${fieldId}"`);
            }

            let value = dataEntry.data[fieldId];
            if (entityActivity[type].schema[fieldId].type === SignalType.DATE_TIME) {
                value = moment(value);
            }
            record.signals[fieldId] = value;
        }

        recordsAndLastId.records.push(record);
    }

    for (const [signalSet, recordsAndLastId] of recordsAndLastIdsBySignalSet) {
        await signalSets.insertRecords(req.context, signalSet, recordsAndLastId.records);
    }

    return res.json();
});


module.exports = router;
