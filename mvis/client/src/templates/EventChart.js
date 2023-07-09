'use strict';

import React, { Component } from "react";
import PropTypes from "prop-types";
import { TimeContext, TimeRangeSelector, Legend, withPanelConfig, panelConfigMixin } from "../../../ivis-core/client/src/ivis/ivis";
import { CampaignActivityType, EntityActivityType, ListActivityType } from "../../../../shared/activity-log";
import { Dropdown, Form, withForm } from "../../../ivis-core/client/src/lib/form";
import { EventChart } from "../charts/EventChart";
import { campaignEventToString, listEventToString } from "./EventLineChart";
import { withComponentMixins } from "../../../ivis-core/client/src/lib/decorator-helpers";

const sensorsStructure = [
    {
        labelAttr: 'label',
        colorAttr: 'color',
        selectionAttr: 'enabled'
    }
];

export const globalListEventToString = evt => listEventToString(evt) + ` (id ${evt.data.entityId.value})`;
export const globalCampaignEventToString = evt => campaignEventToString(evt) + ` (id ${evt.data.entityId.value})`;

@withComponentMixins([
    panelConfigMixin,
    withForm,
])
export class EventChartTemplate extends Component {

    constructor(props) {
        for (const setSpec of props.panel.params.signalSets) {
            setSpec.signals = []; // so that TimeBasedChartBase doesn't panic during compareConfigs
            if (setSpec.type) {
                setSpec.eventToString = props.eventToStringByType[setSpec.type];
            }
        }

        super(props);

        this.initForm({});
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

    componentDidMount() {
        this.populateFormValues({
            filterType: 'none',
            filterEntity: 'none',
            filterUser: 'none',
        });
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
        const types = [{ key: 'none', label: 'None' }].concat(config.signalSets.map(s => ({ key: s.type, label: s.label })));
        const entitiesByType = {};
        for (const s of config.signalSets) {
            entitiesByType[s.type] = [{ key: 'none', label: 'None' }].concat(s.entities.map(e => ({key: e.id, label: e.label})));
        }

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
                    <Dropdown id="filterType" label="Filter entity type:" format="wide" options={types}/>
                    <Dropdown id="filterEntity" label="Filter entity:" format="wide" options={entitiesByType[filteredType]} disabled={filteredType == 'none'}/>
                    <Dropdown id="filterUser" label="Filter user:" format="wide" options={entitiesByType['user']}/>
                </Form>
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
