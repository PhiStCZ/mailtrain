'use strict';

import React, { Component } from "react";
import PropTypes from "prop-types";
import { TimeContext, TimeRangeSelector, Legend, withPanelConfig } from "../../../ivis-core/client/src/ivis/ivis";
import { EventLineChart } from "../charts/EventLineChart";

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
        case 1: return `List created`;
        case 2: return `List updated`;
        case 3: return `List removed`;

        case 4: return `Created subscription`;
        case 5: return `Updated subscription`;
        case 6: return `Removed subscription`;
        case 7: return `Changed subscription status`;

        case 8: return `Field created`;
        case 9: return `Field updated`;
        case 10: return `Field removed`;

        case 11: return `Segment created`;
        case 12: return `Segment updated`;
        case 13: return `Segment removed`;

        case 11: return `Import created`;
        case 12: return `Import updated`;
        case 13: return `Import removed`;
        case 14: return `Changed import status`;

        default: '(unrecognized event)';
    }
};

export const campaignEventToString = evt => {
    switch (evt.data.activityType.value) {
        case 1: return `Campaign created`;
        case 2: return `Campaign updated`;
        case 3: return `Campaign removed`;
        case 4: return `Changed campaign status`;
        case 5: return `Campaign reset`;

        case 6: return `Test-sent an email`;

        case 7: return `Created trigger`;
        case 8: return `Updated trigger`;
        case 9: return `Removed trigger`;

        case 10: return `Added link`;

        default: '(unrecognized event)';
    }
};
