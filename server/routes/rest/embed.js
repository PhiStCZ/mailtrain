'use strict';

const passport = require('../../lib/passport');
const shares = require('../../models/shares');
const axios = require('axios').default;

const router = require('../../lib/router-async').create();
const {castToInteger} = require('../../lib/helpers');

const mvisApiUrlBase = config.get('mvis.apiUrlBase');
const embedUrl = `${mvisApiUrlBase}/api/mt-embed/`;


router.getAsync('/embed/list-subscriptions/:listId', passport.loggedIn, async (req, res) => {
    const listId = castToInteger(req.params.listId);
    await shares.enforceEntityPermission(req.context, 'list', listId, 'view');

    const mvisRes = await axios.get(`${embedUrl}list-subscriptions/${listId}`);
    return res.json(mvisRes);
});


module.exports = router;
