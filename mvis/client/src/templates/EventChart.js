'use strict';

import React, { Component } from "react";
import PropTypes from "prop-types";
import { TimeContext, TimeRangeSelector, Legend, withPanelConfig } from "../../../ivis-core/client/src/ivis/ivis";
import { EventLineChart } from "../charts/EventLineChart";
import { CampaignActivityType, EntityActivityType, ListActivityType } from "../../../../shared/activity-log";
import { EventChart } from "../charts/EventChart";
import { campaignEventToString, listEventToString } from "./EventLineChart";

const sensorsStructure = [
    {
        labelAttr: 'label',
        colorAttr: 'color',
        selectionAttr: 'enabled'
    }
];

export const globalListEventToString = evt => listEventToString(evt) + ` (id ${evt.data.entityId.value})`;
export const globalCampaignEventToString = evt => campaignEventToString(evt) + ` (id ${evt.data.entityId.value})`;

@withPanelConfig
export class EventChartTemplate extends Component {

    constructor(props) {
        for (const setSpec of props.panel.params.signalSets) {
            setSpec.signals = []; // so that TimeBasedChartBase doesn't panic during compareConfigs
            if (setSpec.type) {
                setSpec.eventToString = props.eventToStringByType[setSpec.type];
            }
        }

        super(props);
    }

    static propTypes = {
        eventToStringByType: PropTypes.object,
    }

    static defaultProps = {
        eventToStringByType: {
            'campaign': globalCampaignEventToString,
            'list': globalListEventToString,
        }
    }

    render() {
        /*
        signalSets: [
            cid, label, color,
            eventToString (OR type to be assigned with props),
            tsSigCid,
            activitySigCid
            extraSignals: [
                sigSet (obligatory, but actually the same as the upper one),
                signal,
            ]
        ]
        */
        const config = this.getPanelConfig();

        return (
            <TimeContext>
                <TimeRangeSelector/>
                <Legend label="Events" configPath={['signalSets']} withSelector structure={sensorsStructure} />
                <EventChart
                    config={{
                        signalSets: config.signalSets,
                    }}
                    height={500}
                    margin={{ left: 40, right: 5, top: 5, bottom: 20 }}
                    tooltipExtraProps={{ width: 500 }}
                />
            </TimeContext>
        );
    }
}
