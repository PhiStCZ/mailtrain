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
    const dataByTypeId = req.body.data;
    /*
    schema = {
        list: [...{ id, subscribers }],

        campaign: [...{ id, channel }],

        channel: [...{ id, campaignIds: [...ids] }],

        // campaign may have more stuff, but for now let's not synchronize
        // what might not be salvagable anyway (because there will be
        // inconsistencies for a lot of stuff)
        // later we may send stuff like links & message stats
    }
    */

    await lists.synchronize(context, dataByTypeId.list);
    await campaigns.synchronize(context, dataByTypeId.campaign);
    await channels.synchronize(context, dataByTypeId.channel);
});

module.exports = router;
