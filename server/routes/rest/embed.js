'use strict';

const config = require('../../lib/config');
const passport = require('../../lib/passport');
const shares = require('../../models/shares');
const axios = require('axios').default;

const router = require('../../lib/router-async').create();
const {castToInteger} = require('../../lib/helpers');

const mvisApiUrlBase = config.get('mvis.apiUrlBase');
const embedUrl = `${mvisApiUrlBase}/api/mt-embed/`;
const apiToken = require('../../lib/mvis').apiToken;


router.getAsync('/embed/list-subscriptions/:listId', passport.loggedIn, async (req, res) => {
    const listId = castToInteger(req.params.listId);
    await shares.enforceEntityPermission(req.context, 'list', listId, 'view');

    const mvisRes = await axios.get(`${embedUrl}list-subscriptions/${listId}`, {
        headers: { 'global-access-token': apiToken }
    });
    return res.json(mvisRes.data);
});


module.exports = router;
