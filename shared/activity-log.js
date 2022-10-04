'use strict';

const EntityActivityType = {
    CREATE: 1,
    UPDATE: 2,
    REMOVE: 3,
    MAX: 3
};

const CampaignActivityType = {
    STATUS_CHANGE: EntityActivityType.MAX + 1,
    TEST_SEND: EntityActivityType.MAX + 2,
    
    // right place?
    CREATE_TRIGGER: EntityActivityType.MAX + 3,
    UPDATE_TRIGGER: EntityActivityType.MAX + 4,
    REMOVE_TRIGGER: EntityActivityType.MAX + 5,
};

const CampaignTrackerActivityType = {
    SENT: 1,
    TEST_SENT: 2,
    BOUNCED: 3,
    UNSUBSCRIBED: 4,
    COMPLAINED: 5,
    OPENED: 6,
    CLICKED: 7,
    TRIGGERED: 8,
    FAILED: 9
};

const ListActivityType = {
    CREATE_SUBSCRIPTION: EntityActivityType.MAX + 1,
    UPDATE_SUBSCRIPTION: EntityActivityType.MAX + 2,
    REMOVE_SUBSCRIPTION: EntityActivityType.MAX + 3,
    SUBSCRIPTION_STATUS_CHANGE: EntityActivityType.MAX + 4,
    CREATE_FIELD: EntityActivityType.MAX + 5,
    UPDATE_FIELD: EntityActivityType.MAX + 6,
    REMOVE_FIELD: EntityActivityType.MAX + 7,
    CREATE_SEGMENT: EntityActivityType.MAX + 8,
    UPDATE_SEGMENT: EntityActivityType.MAX + 9,
    REMOVE_SEGMENT: EntityActivityType.MAX + 10,
    CREATE_IMPORT: EntityActivityType.MAX + 11,
    UPDATE_IMPORT: EntityActivityType.MAX + 12,
    REMOVE_IMPORT: EntityActivityType.MAX + 13,
    IMPORT_STATUS_CHANGE: EntityActivityType.MAX + 14,
};

const ReportActivityType = {
    STATUS_CHANGE: EntityActivityType.MAX + 1,
};

const UserActivityType = {
    RESET_ACCESS_TOKEN: EntityActivityType.MAX + 1,
    RESET_PASSWORD: EntityActivityType.MAX + 2
};

const BlacklistActivityType = {
    ADD: 1,
    REMOVE: 2
};

module.exports.EntityActivityType = EntityActivityType;
module.exports.BlacklistActivityType = BlacklistActivityType;
module.exports.CampaignActivityType = CampaignActivityType;
module.exports.ListActivityType = ListActivityType;
module.exports.CampaignTrackerActivityType = CampaignTrackerActivityType;
module.exports.ReportActivityType = ReportActivityType;
module.exports.UserActivityType = UserActivityType;