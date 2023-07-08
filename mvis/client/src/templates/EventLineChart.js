'use strict';

import React, { Component } from "react";
import PropTypes from "prop-types";
import { TimeContext, TimeRangeSelector, Legend, withPanelConfig } from "../../../ivis-core/client/src/ivis/ivis";
import { EventLineChart } from "../charts/EventLineChart";
import { CampaignActivityType, EntityActivityType, ListActivityType } from "../../../../shared/activity-log";
import { CampaignStatus } from "../../../../shared/campaigns";

// for now the template code is identical to linechart template code

const sensorsStructure = [
    {
        labelAttr: 'label',
        colorAttr: 'color',
        selectionAttr: 'enabled'
    }
];

@withPanelConfig
export class EventLineChartTemplate extends Component {

    static propTypes = {
        eventToString: PropTypes.func,
        extraActivitySignals: PropTypes.array
    }

    render() {
        const config = this.getPanelConfig();

        // convert sensors from parameters to signalSets
        const signalSets = [];
        for (const sensor of config.sensors) {
            // this allows to have the same sigSet in more than one sensor
            let signalSet = signalSets.find(s => s.cid === sensor.sigSet);
            if (signalSet === undefined) {
                signalSet = {
                    cid: sensor.sigSet,
                    signals: [],
                    tsSigCid: sensor.tsSigCid
                }
                signalSets.push(signalSet);
            }
            signalSet.signals.push({
                    label: sensor.label,
                    color: sensor.color,
                    cid: sensor.signal,
                    enabled: sensor.enabled,
                }
            );
        }

        return ( // TODO: possibly add a way to switch visibility of event lines in legend
            <TimeContext>
                <TimeRangeSelector/>
                <Legend label="Stats" configPath={['sensors']} withSelector structure={sensorsStructure} />
                <EventLineChart
                    config={{
                        signalSets,
                        activitySet: config.activitySet,
                        activityTs: config.activityTs,
                        activityType: config.activityType,
                        activityActor: config.activityActor,
                    }}
                    tooltipEventToString={this.props.eventToString}
                    extraActivitySignals={this.props.extraActivitySignals}
                    height={500}
                    margin={{ left: 40, right: 5, top: 5, bottom: 20 }}
                    tooltipExtraProps={{
                        width: 450,
                    }}
                />
            </TimeContext>
        );
    }
}

export const listEventToString = evt => {
    switch (evt.data.activityType.value) {
        case EntityActivityType.CREATE: return `List was created`;
        case EntityActivityType.UPDATE: return `List was updated`;
        case EntityActivityType.REMOVE: return `List was removed`;

        case ListActivityType.CREATE_SUBSCRIPTION: return `Created a subscription`;
        case ListActivityType.UPDATE_SUBSCRIPTION: return `Updated a subscription`;
        case ListActivityType.REMOVE_SUBSCRIPTION: return `Removed a subscription`;
        case ListActivityType.SUBSCRIPTION_STATUS_CHANGE: return `Changed subscription status`;

        case ListActivityType.CREATE_FIELD: return `Created a field`;
        case ListActivityType.UPDATE_FIELD: return `Updated a field`;
        case ListActivityType.REMOVE_FIELD: return `Removed a field`;

        case ListActivityType.CREATE_SEGMENT: return `Created a segment`;
        case ListActivityType.UPDATE_SEGMENT: return `Updated a segment`;
        case ListActivityType.REMOVE_SEGMENT: return `Removed a segment`;

        case ListActivityType.CREATE_IMPORT: return `Created an import`;
        case ListActivityType.UPDATE_IMPORT: return `Updated an import`;
        case ListActivityType.REMOVE_IMPORT: return `Removed an import`;
        case ListActivityType.IMPORT_STATUS_CHANGE: return `Changed import status`;

        case ListActivityType.SEND_CAMPAIGN: return `A campaign was sent to subscribers`;

        case ListActivityType.SYNCHRONIZE: return `List data synchronized`;

        default: return `(unrecognized event: ${evt.data.activityType.value})`;
    }
};

export const campaignEventToString = evt => {
    switch (evt.data.activityType.value) {
        case EntityActivityType.CREATE: return `Campaign was created`;
        case EntityActivityType.UPDATE: return `Campaign was updated`;
        case EntityActivityType.REMOVE: return `Campaign was removed`;

        case CampaignActivityType.STATUS_CHANGE:
            switch (evt.data.status.value) {
                case CampaignStatus.ACTIVE: return `Campaign became active`;
                case CampaignStatus.FINISHED: return `Campaign finished sending`;
                case CampaignStatus.IDLE: return `Campaign became idle`;
                case CampaignStatus.INACTIVE: return `Campaign became inactive`;
                case CampaignStatus.PAUSED: return `Campaign paused`;
                case CampaignStatus.PAUSING: return `Campaign initiated pause`;
                case CampaignStatus.SCHEDULED: return `Changed was scheduled to send`;
                case CampaignStatus.SENDING: return `Campaign started sending`;
                default: return `Campaign status changed`;
            }
        case CampaignActivityType.RESET: return `Campaign was reset`;
        case CampaignActivityType.TEST_SEND: return `Campaign has test-sent an email`;

        case CampaignActivityType.CREATE_TRIGGER: return `Created trigger`;
        case CampaignActivityType.UPDATE_TRIGGER: return `Updated trigger`;
        case CampaignActivityType.REMOVE_TRIGGER: return `Removed trigger`;

        case CampaignActivityType.ADD_LINK: return `Registered a new link`;

        case CampaignActivityType.UPLOAD_FILES: return `Files were uploaded`;
        case CampaignActivityType.REMOVE_FILE: return `A file was removed`;
        case CampaignActivityType.UPLOAD_ATTACHMENTS: return `Attachments were uploaded`;
        case CampaignActivityType.REMOVE_ATTACHMENT: return `An attachment was removed`;


        default: return `(unrecognized event: ${evt.data.activityType.value})`;
    }
};
