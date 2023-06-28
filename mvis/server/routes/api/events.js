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

module.exports = router;
