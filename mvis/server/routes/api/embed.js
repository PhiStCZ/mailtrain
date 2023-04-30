'use strict';

const passport = require('../../../ivis-core/server/lib/passport');
const users = require('../../../ivis-core/server/models/users');
const {castToInteger} = require('../../../ivis-core/server/lib/helpers');
const urls = require('../../../ivis-core/server/lib/urls');
const { ensureMailtrainUser } = require('../../models/users');
const { BuiltinTemplateIds } = require('../../../shared/builtin-templates');

const listActivity = require('../../models/list-activity');
const listSubscriptions = require('../../models/list-subscriptions');

const router = require('../../../ivis-core/server/lib/router-async').create();


router.getAsync('/mt-embed/list-subscriptions/:listId', passport.loggedIn, async (req, res) => {
    const renewableBySandbox = true;
    const builtinTemplateId = BuiltinTemplateIds.EVENT_LINECHART;
    const listId = castToInteger(req.params.listId);
    const userId = await ensureMailtrainUser(context);

    const params = {
        sensors: [
            {
                label: 'Subscribers',
                color: '#44dd44',
                sigSet: listSubscriptions.signalSetCid(listId),
                signal: 'subscribed',
                tsSigCid: 'timestamp',
                enabled: true,
            },
        ],
        activitySet: listActivity.signalSetCid(listId),
        activityTs: 'timestamp',
        activityType: 'activityType',
        activityIssuedBy: 'issuedBy',
    };

    const token = await users.getRestrictedAccessToken(req.context, 'builtin_template', { renewableBySandbox, builtinTemplateId, params }, userId);

    return res.json({
        token,
        ivisSandboxUrlBase: urls.getSandboxUrlBase(),
        path: 'mt-list-subscriptions',
        params,
    });
});


module.exports = router;
