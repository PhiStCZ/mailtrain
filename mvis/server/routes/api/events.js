'use strict';

const activityLog = require('../../lib/activity-log');
const router = require('../../../ivis-core/server/lib/router-async').create();

const lists = require('../../models/lists')
const campaigns = require('../../models/campaigns')
const channels = require('../../models/channels')

router.postAsync('/events', async (req, res) => {
    await activityLog.processEvents(req.context, req.body.data);
    return res.json();
});

router.postAsync('/synchronize', async (req, res) => {
    /*
    schema = {
        list: [...{ id, subscribers }],

        campaign: [...{ id, channel }],

        channel: [...{ id, campaignIds: [...ids] }],

        // campaign may have more data, but even with them many events
        // will be lost, so campaign synchronization probably won't be very
        // useful anyway
    }
    */
    const dataByTypeId = req.body;
    await lists.synchronize(req.context, dataByTypeId.list);
    await campaigns.synchronize(req.context, dataByTypeId.campaign);
    await channels.synchronize(req.context, dataByTypeId.channel);
    return res.json();

    
});

module.exports = router;
