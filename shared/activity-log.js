'use strict';

const LogTypeId = {
    BLACKLIST: 'blacklist',
    CAMPAIGN: 'campaign',
    CAMPAIGN_TRACKER: 'campaign_tracker',
    CHANNEL: 'channel',
    FORM: 'form',
    LIST: 'list',
    LIST_TRACKER: 'list_tracker',
    NAMESPACE: 'namespace',
    REPORT_TEMPLATE: 'report_template',
    REPORT: 'report',
    SETTINGS: 'settings',
    SEND_CONFIGURATION: 'send_configuration',
    SHARE: 'share',
    TEMPLATE: 'template',
    MOSAICO_TEMPLATE: 'mosaico_template',
    USER: 'user',
};

const EntityActivityType = {
    CREATE: 1,
    UPDATE: 2,
    REMOVE: 3,
    MAX: 3,
};

const BlacklistActivityType = {
    ADD: 1,
    REMOVE: 2,
};

const CampaignActivityType = {
    STATUS_CHANGE: EntityActivityType.MAX + 1,
    RESET: EntityActivityType.MAX + 2,
    TEST_SEND: EntityActivityType.MAX + 3,
    CREATE_TRIGGER: EntityActivityType.MAX + 4,
    UPDATE_TRIGGER: EntityActivityType.MAX + 5,
    REMOVE_TRIGGER: EntityActivityType.MAX + 6,
    ADD_LINK: EntityActivityType.MAX + 7,
    UPLOAD_ATTACHMENTS: EntityActivityType.MAX + 8,
    REMOVE_ATTACHMENT: EntityActivityType.MAX + 9,
    UPLOAD_FILES: EntityActivityType.MAX + 10,
    REMOVE_FILE: EntityActivityType.MAX + 11,
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
    FAILED: 9,
    CLICKED_ANY: 10,
    ADD_LINK: 11,
};

const ChannelActivityType = {
    ADD_CAMPAIGN: EntityActivityType.MAX + 1,
    REMOVE_CAMPAIGN: EntityActivityType.MAX + 2,
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
    SEND_CAMPAIGN: EntityActivityType.MAX + 15,
    SYNCHRONIZE: EntityActivityType.MAX + 16,
};

const ReportActivityType = {
    STATUS_CHANGE: EntityActivityType.MAX + 1,
    START: EntityActivityType.MAX + 2,
    STOP: EntityActivityType.MAX + 3,
};

const TemplateActivityType = {
    TEST_SEND: EntityActivityType.MAX + 1,
    UPLOAD_FILES: EntityActivityType.MAX + 2,
    REMOVE_FILE: EntityActivityType.MAX + 3,
};

const MosaicoTemplateActivityType = {
    UPLOAD_FILES: EntityActivityType.MAX + 1,
    REMOVE_FILE: EntityActivityType.MAX + 2,
    UPLOAD_BLOCKS: EntityActivityType.MAX + 3,
    REMOVE_BLOCK: EntityActivityType.MAX + 4,
};

const UserActivityType = {
    RESET_PASSWORD: EntityActivityType.MAX + 1,
};

module.exports.LogTypeId = LogTypeId;
module.exports.EntityActivityType = EntityActivityType;
module.exports.BlacklistActivityType = BlacklistActivityType;
module.exports.CampaignActivityType = CampaignActivityType;
module.exports.CampaignTrackerActivityType = CampaignTrackerActivityType;
module.exports.ChannelActivityType = ChannelActivityType;
module.exports.ListActivityType = ListActivityType;
module.exports.ReportActivityType = ReportActivityType;
module.exports.TemplateActivityType = TemplateActivityType;
module.exports.MosaicoTemplateActivityType = MosaicoTemplateActivityType;
module.exports.UserActivityType = UserActivityType;
