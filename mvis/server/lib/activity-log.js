'use strict';

const moment = require('moment');
const log = require('../../ivis-core/server/lib/log')
const signalSets = require('../../ivis-core/server/models/signal-sets');
const { getLastId } = require('../../ivis-core/server/models/signal-storage');
const { SignalType } = require('../../ivis-core/shared/signals');

const listenersMap = new Map();

function formatRecordId(recordId) {
    // supports 10^10 entries (enough for all 32-bit int values)
    return recordId.toString().padStart(10, '0');
}

/**
 * Group events by a given field and return a Map from the field values to the grouped bucket arrays.
 * @param events
 * @param fieldName
 * @param deleteField whether to delete the field used to group the events from the bucket entries
 */
function groupEventsByField(events, fieldName, deleteField = true) {
    const buckets = new Map();
    for (const evt of events) {
        const fieldValue = evt[fieldName];
        const bucketEvent = { ...evt };
        if (deleteField) {
            delete bucketEvent[fieldName];
        }

        const bucket = buckets.get(fieldValue);
        if (!bucket) {
            buckets.set(fieldValue, [bucketEvent]);
        } else {
            bucket.push(bucketEvent);
        }
    }
    return buckets;
}

/**
 * Transform events according to the given signal set, and store them in it.
 * @param context
 * @param events events of the same type, without their typeId field (as transformed by processEvents)
 * @param signalSet
 * @param signalSetSchema
 * @returns transformed records
 */
async function transformAndStoreEvents(context, events, signalSet, signalSetSchema) {
    const records = [];
    let nextId = 1;
    const previousId = await getLastId(signalSet);
    if (previousId) {
        nextId = parseInt(previousId) + 1;
    }

    for (const evt of events) {
        const record = {
            id: formatRecordId(nextId++),
            signals: {},
        };

        for (const fieldId in evt) {
            if (!(fieldId in signalSetSchema)) {
                throw new Error(`Unknown data field "${fieldId}"`);
            }

            let value = evt[fieldId];
            if (signalSetSchema[fieldId].type == SignalType.DATE_TIME) {
                value = moment(value);
            }
            record.signals[fieldId] = value;
        }

        records.push(record);
    }

    await signalSets.insertRecords(context, signalSet, records);
    return records;
}

/**
 * Register a new listener which will be called if events with the
 * given eventTypeId are encountered.
 */
async function on(eventTypeId, action) {
    const listener = listenersMap.get(eventTypeId);
    if (listener) {
        listener.push(action);
    } else {
        listenersMap.set(eventTypeId, [action]);
    }
}

let eventQueue = [];
let processingEvents = false;

/**
 * Process incoming events from Mailtrain. Because of some possible event order
 * dependencies, but mainly because of possible conflicting ids, it needs to
 * be synchronized.
 */
async function processEvents(context, events) {
    eventQueue.push(...events);
    if (processingEvents) {
        return;
    }

    processingEvents = true;

    while (eventQueue.length > 0) {
        const currentEvents = eventQueue;
        eventQueue = [];

        const eventsByTypeId = groupEventsByField(currentEvents, 'typeId', true);

        for (const [typeId, typedEvents] of eventsByTypeId.entries()) {
            const listeners = listenersMap.get(typeId);
            if (listeners) {
                for (const action of listeners) {
                    await action(context, typedEvents);
                }
            } else {
                log.error('Activity-log', `Unregistered event type id '${typeId}'`);
            }
        }
    }

    processingEvents = false;
}

module.exports.formatRecordId = formatRecordId;
module.exports.groupEventsByField = groupEventsByField;
module.exports.transformAndStoreEvents = transformAndStoreEvents;
module.exports.on = on;
module.exports.processEvents = processEvents;
