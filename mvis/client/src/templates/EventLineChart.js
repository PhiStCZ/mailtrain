'use strict';

import React, { Component } from "react";
import PropTypes from "prop-types";
import moment from "moment";
import { rgb } from "d3-color";
import { format as d3Format } from "d3-format";
import * as d3Shape from "d3-shape";
import * as d3Array from "d3-array";
import * as d3Selection from "d3-selection";
import { Icon } from "../../../ivis-core/client/src/lib/bootstrap-components";
import * as dateMath from "../../../ivis-core/client/src/lib/datemath";

import { IntervalAbsolute, LineChart, withPanelConfig, TimeContext, TimeRangeSelector, Legend, isSignalVisible } from "../../../ivis-core/client/src/ivis/ivis";
import { tooltipStyles } from "../../../ivis-core/client/src/ivis/Tooltip.scss";

const ACTIVITY_EVENT_SEL_CID = '_activity_events';

class EventLineChart extends Component {
    constructor(props) {
        super(props)

        this.boundGetExtraQueries = ::this.getExtraQueries;
        this.boundPrepareExtraData = ::this.prepareExtraData;
        this.boundCreateChart = ::this.createChart;
        this.boundGetGraphContent = ::this.getGraphContent;

        this.boundOnSelect = ::this.onSelect;
        this.boundOnDeselect = ::this.onDeselect;
    }

    static propTypes = {
        config: PropTypes.object.isRequired,
        height: PropTypes.number,
        margin: PropTypes.object,
        tooltipExtraProps: PropTypes.object,
    }

    static defaultProps = {
        margin: { left: 60, right: 5, top: 5, bottom: 20 },
        height: 500,
    }

    getExtraQueries(base, abs) {
        const config = this.props.config;

        const signalSets = {
            [config.activitySet]: {
                tsSigCid: [config.activityTs],
                signals: {
                    // we are searching docs, so no aggregations are needed
                    [config.activityType]: ['value'],
                    // [config.activityIssuedBy]: ['value'],
                },
                // substitutionOpts: {} no need for them
            }
        };

        const interval = new IntervalAbsolute(abs.from, abs.to, moment.duration(0, 's'));

        return [
            { type: 'timeSeries', args: [ signalSets, interval ] }
        ];
    }

    prepareExtraData(base, lineChartSignalSetsData, extraData) {
        const config = this.props.config;

        const stateUpdate = {
            activityEvents: extraData[0][config.activitySet].main
        };

        return stateUpdate;
    }

    // add createChart() to render the events as (for now) lines
    createChart(base, signalSetsData, baseState, abs, xScale, yScales, points) {

        // maybe also somehow update the linechart to display a line to the
        // "present time" or +infinity, and not the end of data
        // although that could be a job of the task (just place the last one always,
        // and it will get removed when it relaunches anyway...)

        const mergedActivityEvents = [];
        const mergeDistance = (abs.to - abs.from) * 0.025;
        for (const event of baseState.activityEvents) {
            if (mergedActivityEvents.length != 0 && event.ts - mergedActivityEvents.at(-1).ts <= mergeDistance) {
                mergedActivityEvents.events.push(event);
            } else {
                mergedActivityEvents.push({
                    ts: event.ts,
                    events: [event]
                });
            }
        }

        const activityLinePoints = [];
        for (const event of mergedActivityEvents) {
            const point = {
                ...event,
            };

            point.top = true;
            activityLinePoints.push({ ...point });
            point.top = false;
            activityLinePoints.push(point);
            // we need separated lines
            activityLinePoints.push(null);
        }

        // may turn configurable in the future
        const lineVisible = true;

        const topY = 0;
        const bottomY = this.props.height - this.props.margin.top - this.props.margin.bottom;

        const line = d3Shape.line()
            .defined(d => d !== null)
            .x(d => xScale(d.ts))
            .y(d => d.top ? topY : bottomY)
            .curve(d3Shape.curveLinear);

        // TODO: add line color variability / customizability
        const lineColor = rgb('#bb8833');
        const lineWidth = 3;

        this.linePathSelection
            .datum(activityLinePoints)
            .attr('visibility', lineVisible ? 'visible' : 'hidden')
            .attr('fill', 'none')
            .attr('stroke', lineColor.toString())
            .attr('stroke-linejoin', 'round')
            .attr('stroke-linecap', 'round')
            .attr('stroke-width', lineWidth)
            .attr('d', line);

        this.setState({ mergedActivityEvents });
    }

    getGraphContent(base, paths) {
        paths.push(
            <g key={'activity-event-lines'}>
                <path ref={node => this.linePathSelection = d3Selection.select(node)}/>
            </g>
        );

        return paths;
    }

    onSelect(base, selection, signalSetsData, baseState, abs, xScale, yScales, points, lineVisibility) {
        const activityEvents = this.state.mergedActivityEvents;
        let activitySelection = null;

        if (!activityEvents || activityEvents.length == 0) {
            selection[ACTIVITY_EVENT_SEL_CID] = activitySelection;
            return;
        }

        const x = d3Selection.mouse(base.base.containerNode)[0] - this.props.margin.left;
        const mouseTs = moment(xScale.invert(x));
        const closestIdx = d3Array.minIndex(activityEvents, evt => Math.abs(evt.ts - mouseTs));
        const closest = activityEvents[closestIdx];
        const maxSelectDistance = (abs.to - abs.from) * 0.025;
        if (Math.abs(closest.ts - mouseTs) <= maxSelectDistance) {
            activitySelection = {
                isEvent: true,
                ts: closest.ts,
                data: closest.events
            };
        }

        selection[ACTIVITY_EVENT_SEL_CID] = activitySelection;
    }

    onDeselect(base, selection, signalSetsData, baseState, abs, xScale, yScales, points, lineVisibility) {
        delete selection[ACTIVITY_EVENT_SEL_CID];
    }

    render() {
        const props = this.props;

        return (
            <LineChart
                config={props.config}

                height={props.height}
                margin={props.margin}

                tooltipContentComponent={TooltipContentWithEvents}
                tooltipExtraProps={props.tooltipExtraProps}

                getExtraQueries={this.boundGetExtraQueries}
                prepareExtraData={this.boundPrepareExtraData}
                createChart={this.boundCreateChart}
                getGraphContent={this.boundGetGraphContent}
                onSelect={this.boundOnSelect}
                onDeselect={this.boundOnDeselect}
            />
        );
    }
}

// for now the template code is identical to linechart template code

const sensorsStructure = [
    {
        labelAttr: 'label',
        colorAttr: 'color',
        selectionAttr: 'enabled'
    }
];

@withPanelConfig
export default class EventLineChartTemplate extends Component {
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

        return (
            <TimeContext>
                <TimeRangeSelector/>
                <Legend label="Sensors" configPath={['sensors']} withSelector structure={sensorsStructure} />
                <EventLineChart
                    config={{
                        signalSets,
                        activitySet: config.activitySet,
                        activityTs: config.activityTs,
                        activityType: config.activityType,
                        activityIssuedBy: config.activityIssuedBy,
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

const listActivityEventToString = evt => {
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

const campaignActivityEventToString = evt => {
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


// for now copied from linechart since the function is not exported
function defaultGetSignalValues(tooltipContent, sigSetConf, sigConf, sigSetCid, sigCid, signalData, isAgg) {
    const isAvg = signalData.avg !== null;
    const isMin = signalData.min !== null;
    const isMax = signalData.max !== null;

    const numberFormat = d3Format('.3f');
    const renderVal = attr => {
        const val = signalData[attr];
        if (val === null) {
            return '';
        } else {
            if (unit) {
                return `${numberFormat(signalData[attr])} ${unit}`;
            } else {
                return numberFormat(signalData[attr]);
            }
        }
    };

    const unit = sigConf.unit || '';

    if (isAgg) {
        if (isAvg || isMin || isMax) {
            return (
                <span>
                    {isAvg && <span className={tooltipStyles.signalVal}>Ø {renderVal('avg')}</span>}
                    {(isMin || isMax) &&
                    <span className={tooltipStyles.signalVal}><Icon icon="chevron-left"/>{renderVal('min')} <Icon icon="ellipsis-h"/> {renderVal('max')}<Icon icon="chevron-right"/></span>
                    }
                </span>
            );
        }
    } else {
        if (isAvg) {
            return <span className={tooltipStyles.signalVal}>{renderVal('avg')}</span>;
        }
    }
}

class TooltipContentWithEvents extends Component {
    constructor(props) {
        super(props);
    }

    static propTypes = {
        config: PropTypes.array.isRequired,
        signalSetsData: PropTypes.object,
        selection: PropTypes.object,
        getSignalValues: PropTypes.func,
        activityEventToString: PropTypes.func,
    }

    static defaultProps = {
        activityEventToString: evt => `activity ${evt.data.activityType.value}`,
        getSignalValues: defaultGetSignalValues
    }

    renderLineSignalRows() {
        if (!this.props.selection) {
            return null;
        }

        const rows = [];

        let ts;

        let sigSetIdx = 0;
        for (const sigSetConf of this.props.config) {
            const sel = this.props.selection[sigSetConf.cid];
            const isAgg = this.props.signalSetsData[sigSetConf.cid].isAggregated;

            if (sel) {
                ts = sel.ts;
                let sigIdx = 0;
                for (const sigConf of sigSetConf.signals) {
                    if (isSignalVisible(sigConf)) {
                        const sigVals = this.props.getSignalValues(this, sigSetConf, sigConf, sigSetConf.cid, sigConf.cid, sel.data[sigConf.cid], isAgg);

                        if (sigVals) {
                            rows.push(
                                <div key={`line ${sigSetIdx} ${sigIdx}`}>
                                    <span className={tooltipStyles.signalColor} style={{color: sigConf.color}}><Icon
                                        icon="minus"/></span>
                                    <span className={tooltipStyles.signalLabel}>{sigConf.label}:</span>
                                    {sigVals}
                                </div>
                            );
                        }
                    }

                    sigIdx += 1;
                }
            }

            sigSetIdx += 1;
        }

        rows.unshift(
            <div key='line' className={tooltipStyles.time}>{dateMath.format(ts)}</div>
        );

        return rows;
    }

    renderActivitySignalRows() {
        if (!this.props.selection) {
            return null;
        }

        const eventSel = this.props.selection[ACTIVITY_EVENT_SEL_CID];
        if (!eventSel || !eventSel.isEvent || eventSel.data.length == 0) {
            return null;
        }

        const result = eventSel.data.map((evt, idx) => (
            <div key={`event ${idx}`}>
                <span className={tooltipStyles.signalColor} style={{color: rgb('#bb8833')}}><Icon icon="minus"/></span>
                <span className={tooltipStyles.signalVal}>{this.props.activityEventToString(evt)}</span>
            </div>
        ));

        result.unshift(
            <div key={'event'} className={tooltipStyles.time}>
                Events around {dateMath.format(eventSel.ts)}
            </div>
        );

        return result;
    }

    render() {
        const rows = [];

        const lineRows = this.renderLineSignalRows();
        if (lineRows) {
            rows.push(lineRows);
        }

        const activityRows = this.renderActivitySignalRows();
        if (activityRows) {
            rows.push(activityRows);
        }

        if (rows.length === 0) return null;
        return (
            <div>
                {rows}
            </div>
        );
    }
}
