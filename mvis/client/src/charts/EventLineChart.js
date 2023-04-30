'use strict';

import React, { Component } from "react";
import PropTypes from "prop-types";
import moment from "moment";
import { format as d3Format } from "d3-format";
import * as d3Shape from "d3-shape";
import * as d3Array from "d3-array";
import * as d3Selection from "d3-selection";
import { Icon } from "../../../ivis-core/client/src/lib/bootstrap-components";
import * as dateMath from "../../../ivis-core/client/src/lib/datemath";

import { IntervalAbsolute, LineChart, isSignalVisible } from "../../../ivis-core/client/src/ivis/ivis";
import tooltipStyles from "../../../ivis-core/client/src/ivis/Tooltip.scss";

const ACTIVITY_EVENT_SEL_CID = '_activity_events';

// simplified linechart signal values getter
function defaultGetSignalValues(tooltipContent, sigSetConf, sigConf, sigSetCid, sigCid, signalData, isAgg) {
    const isAvg = signalData.avg !== null;
    const isMin = signalData.min !== null;
    const isMax = signalData.max !== null;
    const unit = sigConf.unit || '';

    const numberFormat = d3Format('.3f');
    const renderVal = attr => {
        const val = signalData[attr];
        if (val === null) {
            return '';
        }
        return numberFormat(val + (unit ? ' ' + unit : ''));
    };

    if (isAgg && signalData.min != signalData.max) {
        return (
            <span>
                {isAvg && <span className={tooltipStyles.signalVal}>Ø {renderVal('avg')}</span>}
                {(isMin || isMax) &&
                <span className={tooltipStyles.signalVal}><Icon icon="chevron-left"/>{renderVal('min')} <Icon icon="ellipsis-h"/> {renderVal('max')}<Icon icon="chevron-right"/></span>
                }
            </span>
        );
    } else if (isAvg) {
        return <span className={tooltipStyles.signalVal}>{renderVal('avg')}</span>;
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
        eventColor: PropTypes.string.isRequired,
        getSignalValues: PropTypes.func,
        eventToString: PropTypes.func,
    }

    static defaultProps = {
        getSignalValues: defaultGetSignalValues,
        eventToString: evt => `activity ${evt.data.activityType.value}`,
    }

    renderLineSignalRows() {
        if (!this.props.selection) {
            return null;
        }

        const rows = [];
        let ts;
        let sigSetIdx = -1;
        for (const sigSetConf of this.props.config) {
            sigSetIdx++;
            const sel = this.props.selection[sigSetConf.cid];
            const isAgg = this.props.signalSetsData[sigSetConf.cid].isAggregated;

            if (!sel) {
                continue;
            }

            ts = sel.ts;
            let sigIdx = -1;
            for (const sigConf of sigSetConf.signals) {
                sigIdx++;
                if (!isSignalVisible(sigConf)) {
                    continue;
                }

                const sigVals = this.props.getSignalValues(this, sigSetConf, sigConf, sigSetConf.cid, sigConf.cid, sel.data[sigConf.cid], isAgg);
                if (!sigVals) {
                    continue;
                }

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
                <span className={tooltipStyles.signalColor} style={{color: this.props.eventColor}}><Icon icon="minus"/></span>
                <span className={tooltipStyles.signalVal}>{this.props.eventToString(evt)}</span>
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

        return rows.length !== 0 ? <div>{rows}</div> : null;
    }
}

export class EventLineChart extends Component {
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
        tooltipEventToString: PropTypes.func,
        eventColor: PropTypes.string,
    }

    static defaultProps = {
        margin: { left: 60, right: 5, top: 5, bottom: 20 },
        height: 500,
        eventColor: '#884444'
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
            }
        };

        const interval = new IntervalAbsolute(abs.from, abs.to, moment.duration(0, 's'));
        return [
            { type: 'timeSeries', args: [ signalSets, interval ] }
        ];
    }

    prepareExtraData(base, lineChartSignalSetsData, extraData) {
        const config = this.props.config;
        const activityEvents = extraData[0][config.activitySet].main;

        // TODO: update the linechartSignalSetsData to display a line to the
        // "present time" or +infinity, and not the end of signal set data

        const stateUpdate = {
            activityEvents,
        };

        return stateUpdate;
    }

    createChart(base, signalSetsData, baseState, abs, xScale, yScales, points) {

        const mergedActivityEvents = [];
        const mergeDistance = (abs.to - abs.from) * 0.025;
        for (const event of baseState.activityEvents) {
            if (mergedActivityEvents.length != 0 && event.ts - mergedActivityEvents.at(-1).ts <= mergeDistance) {
                mergedActivityEvents.events.push(event);
            } else {
                mergedActivityEvents.push({ ts: event.ts, events: [event] });
            }
        }
        this.setState({ mergedActivityEvents });

        const activityLinePoints = [];
        for (const event of mergedActivityEvents) {
            activityLinePoints.push({ ...event, top: true });
            activityLinePoints.push({ ...event, top: false });
            activityLinePoints.push(null); // this separates the lines
        }

        const topY = 0;
        const bottomY = this.props.height - this.props.margin.top - this.props.margin.bottom;
        const line = d3Shape.line()
            .defined(d => d !== null)
            .x(d => xScale(d.ts))
            .y(d => d.top ? topY : bottomY)
            .curve(d3Shape.curveLinear);

        // may turn configurable in the future
        const eventLinesVisible = true;
        const lineColor = this.props.eventColor;
        const lineWidth = 3;

        this.linePathSelection
            .datum(activityLinePoints)
            .attr('visibility', eventLinesVisible ? 'visible' : 'hidden')
            .attr('fill', 'none')
            .attr('stroke', lineColor.toString())
            .attr('stroke-linejoin', 'round')
            .attr('stroke-linecap', 'round')
            .attr('stroke-width', lineWidth)
            .attr('d', line);
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
        return selection;
    }

    onDeselect(base, selection, signalSetsData, baseState, abs, xScale, yScales, points, lineVisibility) {
        if (selection) {
            delete selection[ACTIVITY_EVENT_SEL_CID];
        }
    }

    render() {
        return (
            <LineChart
                config={this.props.config}

                height={this.props.height}
                margin={this.props.margin}

                tooltipContentRender={(props) => <TooltipContentWithEvents
                    eventToString={this.props.tooltipEventToString}
                    eventColor={this.props.eventColor}
                    {...props}
                />}
                tooltipExtraProps={this.props.tooltipExtraProps}

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
