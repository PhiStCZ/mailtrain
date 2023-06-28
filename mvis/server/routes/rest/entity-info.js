'use strict';

const passport = require('../../../ivis-core/server/lib/passport');
const { sendToMailtrain } = require('../../lib/process-communication');
const router = require('../../../ivis-core/server/lib/router-async').create();

router.postAsync('/mt-entity-info', passport.loggedIn, async (req, res) => {
    const response = await sendToMailtrain({
        type: 'entity-info',
        mailtrainUserId: req.restrictedAccessParams.mailtrainUserId,
        data: req.body
    })

    return res.json(response);
});

module.exports = router;
