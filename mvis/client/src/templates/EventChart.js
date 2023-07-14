'use strict';

import React, { Component } from "react";
import PropTypes from "prop-types";
import { TimeContext, TimeRangeSelector, Legend, withPanelConfig, panelConfigMixin } from "../../../ivis-core/client/src/ivis/ivis";
import { CampaignActivityType, EntityActivityType, ListActivityType, MosaicoTemplateActivityType, TemplateActivityType, UserActivityType } from "../../../../shared/activity-log";
import { Dropdown, Form, withForm } from "../../../ivis-core/client/src/lib/form";
import { EventChart } from "../charts/EventChart";
import { withComponentMixins } from "../../../ivis-core/client/src/lib/decorator-helpers";
import { ChannelActivityType } from "../../../../shared/activity-log";
import { CampaignStatus } from "../../../../shared/campaigns";


function getEntityLabel(sigSets, entityTypeId, entityId) {
    const set = sigSets.find(s => s.cid === entityTypeId);
    return set.entitiesMap[entityId];
}
function getEventValue(evt, key) {
    return evt.data[key].value;
}

function genericEventToString(evt, sigSets, setCid, eventToString) {
    const actorId = getEventValue(evt, 'actor');
    let userName;
    if (!actorId) {
        userName = 'Mailtrain system'
    } else {
        userName = getEntityLabel(sigSets, 'user', actorId);
        userName = userName ? `"${userName}"` : 'Unknown user';
    }

    const entityId = getEventValue(evt, 'entityId');
    let entityName = getEntityLabel(sigSets, setCid, entityId);
    entityName = entityName ? `"${entityName}"` : `unknown ${setCid}`;

    return `${userName} ${eventToString(evt, sigSets)} ${entityName} (ID ${entityId})`;
}

function entityEventToString(evt) {
    const activityTypeId = getEventValue(evt, 'activityType');
    switch (activityTypeId) {
        case EntityActivityType.CREATE: return `created`;
        case EntityActivityType.UPDATE: return `updated`;
        case EntityActivityType.REMOVE: return `removed`;
        default: return `did something (id ${activityTypeId}) in`;
    }
}
function listEventToString(evt, sigSets) {
    function getCampaignLabel(evt, sigSets) {
        let label = getEntityLabel(sigSets, 'campaign', getEventValue(evt, 'campaignId'));
        return label ? `"${label}"` : 'unknown campaign';
    }

    switch (getEventValue(evt, 'activityType')) {
        case ListActivityType.CREATE_SUBSCRIPTION: return `created a subscription in`;
        case ListActivityType.UPDATE_SUBSCRIPTION: return `updated a subscription in`;
        case ListActivityType.REMOVE_SUBSCRIPTION: return `removed a subscription in`;
        case ListActivityType.SUBSCRIPTION_STATUS_CHANGE: return `changed a subscription's status in`;

        case ListActivityType.CREATE_FIELD: return `created a field in`;
        case ListActivityType.UPDATE_FIELD: return `updated a field in`;
        case ListActivityType.REMOVE_FIELD: return `removed a field in`;

        case ListActivityType.CREATE_SEGMENT: return `created a segment in`;
        case ListActivityType.UPDATE_SEGMENT: return `updated a segment in`;
        case ListActivityType.REMOVE_SEGMENT: return `removed a segment in`;

        case ListActivityType.CREATE_IMPORT: return `created an import in`;
        case ListActivityType.UPDATE_IMPORT: return `updated an import in`;
        case ListActivityType.REMOVE_IMPORT: return `removed an import in`;
        case ListActivityType.IMPORT_STATUS_CHANGE: return `changed import status in`;

        case ListActivityType.SEND_CAMPAIGN: return `sent ${getCampaignLabel(evt, sigSets)} to subscribers of`;
        case ListActivityType.SYNCHRONIZE: return `synchronized data of`;
        default: return entityEventToString(evt);
    }
}
function campaignEventToString(evt) {
    switch (getEventValue(evt, 'activityType')) {
        case CampaignActivityType.RESET: return `reset`;
        case CampaignActivityType.STATUS_CHANGE:
            switch (getEventValue(evt, 'status')) {
                case CampaignStatus.ACTIVE: return `activated`;
                case CampaignStatus.FINISHED: return `finished sending`;
                case CampaignStatus.IDLE: return `deactivated`; // FIXME: better description needed
                case CampaignStatus.INACTIVE: return `deactivated`;
                case CampaignStatus.PAUSED: return `paused`;
                case CampaignStatus.PAUSING: return `initiated pause of`;
                case CampaignStatus.SCHEDULED: return `scheduled sending of`;
                case CampaignStatus.SENDING: return `started sending`;
                default: return `changed status of`;
            }
        case CampaignActivityType.TEST_SEND: return `test-sent`;

        case CampaignActivityType.CREATE_TRIGGER: return `created trigger in`;
        case CampaignActivityType.UPDATE_TRIGGER: return `updated trigger in`;
        case CampaignActivityType.REMOVE_TRIGGER: return `removed trigger in`;

        case CampaignActivityType.ADD_LINK: return `registered a new link in`;

        case CampaignActivityType.UPLOAD_FILES: return `uploaded files to`;
        case CampaignActivityType.REMOVE_FILE: return `removed a file from`;
        case CampaignActivityType.UPLOAD_ATTACHMENTS: return `uploaded attachments to`;
        case CampaignActivityType.REMOVE_ATTACHMENT: return `removed an attachment from`;

        default: return entityEventToString(evt);
    }
}
function channelEventToString(evt, sigSets) {
    function getCampaignLabel(evt, sigSets) {
        let label = getEntityLabel(sigSets, 'campaign', getEventValue(evt, 'campaignId'));
        return label ? `"${label}"` : 'unknown campaign';
    }

    switch (getEventValue(evt, 'activityType')) {
        case ChannelActivityType.ADD_CAMPAIGN: return `added ${getCampaignLabel(evt, sigSets)} to`;
        case ChannelActivityType.REMOVE_CAMPAIGN: return `removed ${getCampaignLabel(evt, sigSets)} from`;
        default: return entityEventToString(evt);
    }
}
function templateEventToString(evt) {
    switch (getEventValue(evt, 'activityType')) {
        case TemplateActivityType.TEST_SEND: return `test-sent`;
        case TemplateActivityType.UPLOAD_FILES: return `uploaded files to`;
        case TemplateActivityType.REMOVE_FILE: return `removed a file from`;
        default: return entityEventToString(evt);
    }
}
function mosaicoTemplateEventToString(evt) {
    switch (getEventValue(evt, 'activityType')) {
        case MosaicoTemplateActivityType.UPLOAD_FILES: return `uploaded files to`;
        case MosaicoTemplateActivityType.REMOVE_FILE: return `removed a file from`;
        case MosaicoTemplateActivityType.UPLOAD_BLOCKS: return `uploaded block thumbnails to`;
        case MosaicoTemplateActivityType.REMOVE_BLOCK: return `removed a block thumbnail from`;
        default: return entityEventToString(evt);
    }
}
function userEventToString(evt) {
    switch (getEventValue(evt, 'activityType')) {
        case UserActivityType.RESET_PASSWORD: return `reset the password of`;
        default: return entityEventToString(evt);
    }
}

@withComponentMixins([
    panelConfigMixin,
    withForm,
])
export class EventChartTemplate extends Component {

    constructor(props) {
        const config = props.panel.params;
        for (const setSpec of config.signalSets) {
            setSpec.signals = []; // so that TimeBasedChartBase doesn't panic during compareConfigs
            if (setSpec.type) {
                setSpec.eventToString = props.eventToStringByType[setSpec.type];
            }
        }

        super(props);

        /*
        signalSets: [
            cid, label, color,
            eventToString (OR type to be assigned with props),
            tsSigCid,
            activitySigCid
            extraSignals: [
                sigSet (obligatory, but actually the same as the one above),
                signal,
            ]
        ]
        */
        this.types = [{ key: 'none', label: 'None' }].concat(config.signalSets.map(s => ({ key: s.type, label: s.label })));
        this.entitiesByType = {};
        config.signalSetsMap = {};
        for (const s of config.signalSets) {
            this.entitiesByType[s.type] = [{ key: 'none', label: 'None' }].concat(s.entities.map(e => ({key: e.id, label: e.label})));
            config.signalSetsMap[s.type] = s;
            s.entitiesMap = {};
            for (const e of s.entities) {
                s.entitiesMap[e.id] = e.label;
            }
        }

        this.initForm({});
    }

    static propTypes = {
        eventToStringByType: PropTypes.object,
    }

    static defaultProps = {
        eventToStringByType: {
            campaign: function (evt, cfg) {
                return genericEventToString(evt, cfg, 'campaign', campaignEventToString)
            },
            channel: function (evt, cfg) {
                return genericEventToString(evt, cfg, 'channel', channelEventToString)
            },
            form: function (evt, cfg) {
                return genericEventToString(evt, cfg, 'form', entityEventToString)
            },
            list: function (evt, cfg) {
                return genericEventToString(evt, cfg, 'list', listEventToString)
            },
            namespace: function (evt, cfg) {
                return genericEventToString(evt, cfg, 'namespace', entityEventToString)
            },
            report_template: function (evt, cfg) {
                return genericEventToString(evt, cfg, 'report_template', entityEventToString)
            },
            report: function (evt, cfg) {
                return genericEventToString(evt, cfg, 'report', entityEventToString)
            },
            send_configuration: function (evt, cfg) {
                return genericEventToString(evt, cfg, 'send_configuration', entityEventToString)
            },
            template: function (evt, cfg) {
                return genericEventToString(evt, cfg, 'template', templateEventToString)
            },
            mosaico_template: function (evt, cfg) {
                return genericEventToString(evt, cfg, 'mosaico_template', mosaicoTemplateEventToString)
            },
            user: function (evt, cfg) {
                return genericEventToString(evt, cfg, 'user', userEventToString)
            },
        }
    }

    componentDidMount() {
        this.populateFormValues({
            filterType: 'none',
            filterEntity: 'none',
            filterUser: 'none',
        });
    }

    render() {
        const config = this.getPanelConfig();

        const filteredType = this.getFormValue('filterType');
        const filteredEntity = this.getFormValue('filterEntity');
        const filteredUser = this.getFormValue('filterUser');

        for (const s of config.signalSets) {
            s.enabled = filteredType == 'none' || filteredType == s.type;

            s.filter = {};
            if (filteredType == s.type && filteredEntity != 'none') {
                s.filter.entityId = filteredEntity;
            }

            if (filteredUser != 'none') {
                s.filter.actor = filteredUser;
            }
        }

        return (
            <TimeContext>
                <TimeRangeSelector/>
                <Form stateOwner={this} format="wide">
                    {/* TODO: style the dropdowns into one line */}
                    <Dropdown id="filterType" label="Filter entity type:" format="wide" options={this.types}/>
                    <Dropdown id="filterEntity" label="Filter entity:" format="wide" options={this.entitiesByType[filteredType]} disabled={filteredType == 'none'}/>
                    <Dropdown id="filterUser" label="Filter user:" format="wide" options={this.entitiesByType['user']}/>
                </Form>
                <EventChart
                    config={{
                        signalSets: config.signalSets,
                        signalSetsMap: config.signalSetsMap
                    }}
                    height={500}
                    margin={{ left: 40, right: 5, top: 5, bottom: 20 }}
                    tooltipExtraProps={{ width: 600 }}
                />
            </TimeContext>
        );
    }
}
