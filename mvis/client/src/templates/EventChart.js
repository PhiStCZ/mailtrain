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

@withPanelConfig
export class EventChartTemplate extends Component {

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

        for (const setConf of config.signalSets) {
            if (setConf.type) {
                setConf.eventToString = this.props.eventToStringByType[setConf.type];
            }
        }

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
                    tooltipExtraProps={{
                        width: 450,
                    }}
                />
            </TimeContext>
        );
    }
}

export const globalListEventToString = evt => listEventToString(evt) + `(id ${evt.data.entityId})`;
export const globalCampaignEventToString = evt => campaignEventToString(evt) + `(id ${evt.data.entityId})`;
