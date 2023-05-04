'use strict';

import React, { Component } from "react";
import PropTypes from "prop-types";
import { TimeContext, TimeRangeSelector, Legend, withPanelConfig } from "../../../ivis-core/client/src/ivis/ivis";
import { EventLineChart } from "../charts/EventLineChart";
import { CampaignActivityType, EntityActivityType, ListActivityType } from "../../../../shared/activity-log";

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
                        activityIssuedBy: config.activityIssuedBy,
                    }}
                    tooltipEventToString={this.props.eventToString}
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
        case EntityActivityType.CREATE: return `List created`;
        case EntityActivityType.UPDATE: return `List updated`;
        case EntityActivityType.REMOVE: return `List removed`;

        case ListActivityType.CREATE_SUBSCRIPTION: return `Created subscription`;
        case ListActivityType.UPDATE_SUBSCRIPTION: return `Updated subscription`;
        case ListActivityType.REMOVE_SUBSCRIPTION: return `Removed subscription`;
        case ListActivityType.SUBSCRIPTION_STATUS_CHANGE: return `Changed subscription status`;

        case ListActivityType.CREATE_FIELD: return `Field created`;
        case ListActivityType.UPDATE_FIELD: return `Field updated`;
        case ListActivityType.REMOVE_FIELD: return `Field removed`;

        case ListActivityType.CREATE_SEGMENT: return `Segment created`;
        case ListActivityType.UPDATE_SEGMENT: return `Segment updated`;
        case ListActivityType.REMOVE_SEGMENT: return `Segment removed`;

        case ListActivityType.CREATE_IMPORT: return `Import created`;
        case ListActivityType.UPDATE_IMPORT: return `Import updated`;
        case ListActivityType.REMOVE_IMPORT: return `Import removed`;
        case ListActivityType.IMPORT_STATUS_CHANGE: return `Changed import status`;

        case ListActivityType.SEND_CAMPAIGN: return `Campaign sent to subscribers`;

        case ListActivityType.SYNCHRONIZE: return `List data synchronized`;

        default: return `(unrecognized event: ${evt.data.activityType.value})`;
    }
};

export const campaignEventToString = evt => {
    switch (evt.data.activityType.value) {
        case EntityActivityType.CREATE: return `Campaign created`;
        case EntityActivityType.UPDATE: return `Campaign updated`;
        case EntityActivityType.REMOVE: return `Campaign removed`;

        case CampaignActivityType.STATUS_CHANGE: return `Changed campaign status`;
        case CampaignActivityType.RESET: return `Campaign reset`;

        case CampaignActivityType.TEST_SEND: return `Test-sent an email`;

        case CampaignActivityType.CREATE_TRIGGER: return `Created trigger`;
        case CampaignActivityType.UPDATE_TRIGGER: return `Updated trigger`;
        case CampaignActivityType.REMOVE_TRIGGER: return `Removed trigger`;

        case CampaignActivityType.ADD_LINK: return `Added link`;

        default: return `(unrecognized event: ${evt.data.activityType.value})`;
    }
};
