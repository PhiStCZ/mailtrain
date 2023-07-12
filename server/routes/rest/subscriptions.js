'use strict';

const passport = require('../../lib/passport');
const subscriptions = require('../../models/subscriptions');
const { SubscriptionSource } = require('../../../shared/lists');
const activityLog = require('../../lib/activity-log');

const router = require('../../lib/router-async').create();
const {castToInteger} = require('../../lib/helpers');
const { ListActivityType, LogTypeId } = require('../../../shared/activity-log');


router.postAsync('/subscriptions-table/:listId/:segmentId?', passport.loggedIn, async (req, res) => {
    return res.json(await subscriptions.listDTAjax(req.context, castToInteger(req.params.listId), req.params.segmentId ? castToInteger(req.params.segmentId) : null, req.body));
});

router.postAsync('/subscriptions-test-user-table/:listCid', passport.loggedIn, async (req, res) => {
    return res.json(await subscriptions.listTestUsersDTAjax(req.context, req.params.listCid, req.body));
});

router.getAsync('/subscriptions/:listId/:subscriptionId', passport.loggedIn, async (req, res) => {
    const entity = await subscriptions.getById(req.context, castToInteger(req.params.listId), castToInteger(req.params.subscriptionId));
    entity.hash = await subscriptions.hashByList(castToInteger(req.params.listId), entity);
    return res.json(entity);
});

router.postAsync('/subscriptions/:listId', passport.loggedIn, passport.csrfProtection, async (req, res) => {
    const listId = castToInteger(req.params.listId);
    const subscriptionId = await subscriptions.create(req.context, listId, req.body, SubscriptionSource.ADMIN_FORM, {});
    await activityLog.logEntityActivity(req.context, LogTypeId.LIST, ListActivityType.CREATE_SUBSCRIPTION, listId, {subscriptionId});
    return res.json(subscriptionId);
});

router.putAsync('/subscriptions/:listId/:subscriptionId', passport.loggedIn, passport.csrfProtection, async (req, res) => {
    const entity = req.body;
    const listId = castToInteger(req.params.listId);
    entity.id = castToInteger(req.params.subscriptionId);

    await subscriptions.updateWithConsistencyCheck(req.context, listId, entity, SubscriptionSource.ADMIN_FORM);
    await activityLog.logEntityActivity(req.context, LogTypeId.LIST, ListActivityType.UPDATE_SUBSCRIPTION, listId, {subscriptionId: entity.id});
    return res.json();
});

router.deleteAsync('/subscriptions/:listId/:subscriptionId', passport.loggedIn, passport.csrfProtection, async (req, res) => {
    const [listId, subscriptionId] = [castToInteger(req.params.listId), castToInteger(req.params.subscriptionId)];
    await subscriptions.remove(req.context, listId, subscriptionId);
    await activityLog.logEntityActivity(req.context, LogTypeId.LIST, ListActivityType.REMOVE_SUBSCRIPTION, listId, {subscriptionId});
    return res.json();
});

router.postAsync('/subscriptions-validate/:listId', passport.loggedIn, async (req, res) => {
    return res.json(await subscriptions.serverValidate(req.context, castToInteger(req.params.listId), req.body));
});

router.postAsync('/subscriptions-unsubscribe/:listId/:subscriptionId', passport.loggedIn, passport.csrfProtection, async (req, res) => {
    const [listId, subscriptionId] = [castToInteger(req.params.listId), castToInteger(req.params.subscriptionId)];
    await subscriptions.unsubscribeByIdAndGet(req.context, listId, subscriptionId);
    await activityLog.logEntityActivity(req.context, LogTypeId.LIST, ListActivityType.REMOVE_SUBSCRIPTION, listId, {subscriptionId});
    return res.json();
});


module.exports = router;