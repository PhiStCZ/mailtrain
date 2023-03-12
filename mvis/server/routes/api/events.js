'use strict';

const activityLog = require('../../lib/activity-log');
const router = require('../../../ivis-core/server/lib/router-async').create();

router.postAsync('/events', async (req, res) => {
    await activityLog.processEvents(req.context, req.body);
    return res.json();
});

module.exports = router;
