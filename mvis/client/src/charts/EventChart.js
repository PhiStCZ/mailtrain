'use strict';

import React, { Component } from "react";
import PropTypes from "prop-types";
import moment from "moment";
import {select} from "d3-selection";
import * as d3Shape from "d3-shape";
import * as d3Array from "d3-array";
import * as d3Selection from "d3-selection";
import { Icon } from "../../../ivis-core/client/src/lib/bootstrap-components";
import * as dateMath from "../../../ivis-core/client/src/lib/datemath";

import { ConfigDifference, IntervalAbsolute, RenderStatus, TimeBasedChartBase, XAxisType, isSignalVisible as isVisible } from "../../../ivis-core/client/src/ivis/ivis";
import tooltipStyles from "../../../ivis-core/client/src/ivis/Tooltip.scss";

const ACTIVITY_EVENT_SEL_CID = '_activity_events';

/*

- draw a horizontal (striped) line (just for the looks)
- vertical lines or points intersecting it (you may highlight the selected one)
- selection will just be the activity data

*/

class EventTooltipContent extends Component {
    constructor(props) {
        super(props);
    }

    static propTypes = {
        config: PropTypes.array.isRequired,
        signalSetsData: PropTypes.object.isRequired,
        selection: PropTypes.object,
    }

    render() {
        if (!this.props.selection) {
            return null;
        }

        const rows = [
            <div key={'header'} className={tooltipStyles.time}>
                Selected nearby events:
            </div>
        ];

        for (const setSpec of this.props.config) {
            const sigSetSel = this.props.selection[setSpec.cid];

            if (!sigSetSel || !isVisible(setSpec)) {
                continue;
            }

            rows.push(
                <div key={setSpec.cid} className={tooltipStyles.signalLabel}>
                    {setSpec.label} events
                </div>
            );

            const maxItemsPerType = 5;
            for (let i = 0; i < sigSetSel.events.length; i++) {
                const evt = sigSetSel.events[i];

                if (i == maxItemsPerType) {
                    rows.push(<div key={`${setSpec.cid}-${i}`}>
                        <span className={tooltipStyles.signalColor} style={{color: setSpec.color}}><Icon icon="minus"/></span>
                        <span className={tooltipStyles.signalVal}>(...{sigSetSel.events.length - maxItemsPerType} more)</span>
                    </div>);
                    break;
                }

                rows.push(
                    <div key={`${setSpec.cid}-${i}`}>
                        <span className={tooltipStyles.signalColor} style={{color: setSpec.color}}><Icon icon="minus"/></span>
                        <span className={tooltipStyles.signalVal}>{dateMath.format(evt.ts)} - {setSpec.eventToString(evt)}</span>
                    </div>
                );
            }
        }

        return <div>{rows}</div>;
    }
}


export class EventChart extends Component {
    constructor(props) {
        super(props);

        this.boundGetQueries = ::this.getQueries;
        this.boundPrepareData = ::this.prepareData;
        this.boundCreateChart = ::this.createChart;
        this.boundGetGraphContent = ::this.getGraphContent;

        this.eventLineSelection = {};
    }

    static propTypes = {
        config: PropTypes.object.isRequired,
        height: PropTypes.number,
        margin: PropTypes.object,
        tooltipExtraProps: PropTypes.object,
        lineWidth: PropTypes.number,
        horizontalLineColor: PropTypes.string,
        filterFun: PropTypes.func
    }

    static defaultProps = {
        height: 500,
        margin: { left: 60, right: 5, top: 5, bottom: 20 },
        lineWidth: 3,
        horizontalLineColor: '#ccddee',
    }

    getQueries(base, abs, config) {
        const signalSets = {};
        for (const setSpec of config.signalSets) {
            const signals = {
                [setSpec.activitySigCid]: ['value']
            };

            for (const sigSpec of setSpec.extraSignals) {
                signals[sigSpec.signal] = ['value'];
            }

            signalSets[setSpec.cid] = {
                tsSigCid: setSpec.tsSigCid,
                signals,
            };
        }

        const intv = new IntervalAbsolute(abs.from, abs.to, moment.duration(0, 's'));

        const queries = [
            { type: 'timeSeries', args: [ signalSets, intv ] }
        ];

        return queries;
    }

    prepareData(base, results) {
        const queryResults = results[0];

        const signalSetsData = {}; // events by signal set

        for (const setSpec of this.props.config.signalSets) {
            signalSetsData[setSpec.cid] = queryResults[setSpec.cid].main;
        }

        return { signalSetsData };
    }

    getGraphContent(base) {
        const paths = [
            <g key={'aesthetic_horizontal'}>
                <path ref={node => this.aestheticHorizontalSelection = select(node)}/>
            </g>
        ];

        for (const setSpec of this.props.config.signalSets) {
            if (!isVisible(setSpec)) continue;

            paths.push(
                <g key={`${setSpec.cid}`}>
                    <path ref={node => this.eventLineSelection[setSpec.cid] = select(node)}/>
                </g>
            );
        }

        return paths;
    }

    createChart(base, signalSetsData, baseState, abs, xScale) {
        const config = this.props.config;

        const eventLinesBySigSet = {};
        const mergedEventsBySigSet = {};

        let noData = true;
        for (const setSpec of config.signalSets) {
            if (!isVisible(setSpec)) continue;

            let data = signalSetsData[setSpec.cid];
            if (this.props.filterFun) {
                data = data.filter(this.props.filterFun);
            }
            noData &&= (data.length == 0);

            const mergedEvents = [];
            const mergeDistance = (abs.to - abs.from) * 0.01;
            for (const event of data) {
                if (mergedEvents.length != 0 && event.ts - mergedEvents.at(-1).ts <= mergeDistance) {
                    mergedEvents.at(-1).events.push(event);
                } else {
                    mergedEvents.push({ ts: event.ts, events: [event] });
                }
            }

            mergedEventsBySigSet[setSpec.cid] = mergedEvents;

            eventLinesBySigSet[setSpec.cid] = [];
            for (const event of mergedEvents) {
                eventLinesBySigSet[setSpec.cid].push({ ...event, top: true });
                eventLinesBySigSet[setSpec.cid].push({ ...event, top: false });
                eventLinesBySigSet[setSpec.cid].push(null); // this separates the lines
            }
        }

        this.setState({ mergedEventsBySigSet });

        let selection = null;
        let mousePosition = null;

        const selectEvents = () => {
            const containerPos = d3Selection.mouse(base.containerNode);
            const x = containerPos[0] - this.props.margin.left;
            const ts = moment(xScale.invert(x));

            base.cursorSelection
                .attr('x1', containerPos[0])
                .attr('x2', containerPos[0]);

            if (!base.cursorLineVisible) {
                base.cursorSelection.attr('visibility', 'visible');
                base.cursorLineVisible = true;
            }

            if (noData) {
                return;
            }

            selection = null;
            mousePosition = {x: containerPos[0], y: containerPos[1]};

            for (const sigSetCid in mergedEventsBySigSet) {
                const events = mergedEventsBySigSet[sigSetCid];

                const closestIdx = d3Array.minIndex(events, evt => Math.abs(evt.ts - ts));
                const closest = events[closestIdx];
                const maxSelectDistance = (abs.to - abs.from) * 0.025;
                if (Math.abs(closest.ts - ts) <= maxSelectDistance) {
                    selection = selection || {};
                    selection[sigSetCid] = closest;
                }
            }

            base.setState({
                selection,
                mousePosition
            });
        }

        const deselectEvents = () => {
            if (base.cursorLineVisible) {
                base.cursorSelection.attr('visibility', 'hidden');
                base.cursorLineVisible = false;
            }

            if (noData) {
                return;
            }

            if (selection || mousePosition) {
                selection = null;
                mousePosition = null;

                base.setState({
                    selection,
                    mousePosition
                });
            }
        }

        base.brushSelection
            .on('mouseenter', selectEvents)
            .on('mousemove', selectEvents)
            .on('mouseleave', deselectEvents)

        if (noData) {
            return RenderStatus.NO_DATA;
        }

        const innerHeight = this.props.height - this.props.margin.top - this.props.margin.bottom;
        const topY = innerHeight / 3;
        const bottomY = innerHeight * 2 / 3;
        const lineWidth = this.props.lineWidth;
        const line = d3Shape.line()
            .defined(d => d !== null)
            .x(d => xScale(d.ts))
            .y(d => d.top ? topY : bottomY)

        for (const setSpec of config.signalSets) {
            if (!eventLinesBySigSet[setSpec.cid] || !isVisible(setSpec)) {
                continue;
            }

            const lineColor = setSpec.color;
            this.eventLineSelection[setSpec.cid]
                .datum(eventLinesBySigSet[setSpec.cid])
                // .attr('visibility', lineVisible ? 'visible' : 'hidden')
                .attr('fill', 'none')
                .attr('stroke', lineColor.toString())
                .attr('stroke-linejoin', 'round')
                .attr('stroke-linecap', 'round')
                .attr('stroke-width', lineWidth)
                .attr('d', line);
        }

        {
            const line = d3Shape.line()
                .defined(d => d !== null)
                .x(d => d)
                .y(d => (topY + bottomY) / 2)

            const innerWidth = xScale.range()[1], lineSegments = 25;
            const segmentLength = innerWidth / lineSegments;
            const lineData = [];
            for (let i = 0; i < lineSegments; i += 2) {
                lineData.push(segmentLength * i);
                lineData.push(segmentLength * (i + 1));
                lineData.push(null);
            }
            this.aestheticHorizontalSelection
                .datum(lineData)
                .attr('fill', 'none')
                .attr('stroke', this.props.horizontalLineColor)
                .attr('stroke-linejoin', 'round')
                .attr('stroke-linecap', 'round')
                .attr('stroke-width', lineWidth)
                .attr('d', line);
        }

        return RenderStatus.SUCCESS;
    }

    render() {
        return (
            <TimeBasedChartBase
                config={this.props.config}
                // data={this.props.data}
                height={this.props.height}
                margin={this.props.margin}


                prepareData={this.boundPrepareData}
                getQueries={this.boundGetQueries}
                createChart={this.boundCreateChart}
                getGraphContent={this.boundGetGraphContent}

                // getSvgDefs={this.props.getSvgDefs}
                compareConfigs={(cf1, cf2) => {
                    if (cf1.signalSets.length != cf2.signalSets.length) {
                        return ConfigDifference.DATA;
                    }
                    let cfDiff = ConfigDifference.NONE;
                    for (let i = 0; i < cf1.signalSets.length; i++) {
                        const set1 = cf1.signalSets[i], set2 = cf2.signalSets[i];
                        if (set1.cid !== set2.cid ||
                            set1.tsSigCid !== set2.tsSigCid ||
                            set1.activitySigCid !== set2.activitySigCid ||
                            set1.extraSignals.length !== set2.extraSignals.length) {
                            return ConfigDifference.DATA;
                        }
                        for (let j = 0; j < set1.extraSignals.length; j++) {
                            if (set1.extraSignals[j].cid !== set2.extraSignals[j].cid) {
                                return ConfigDifference.DATA;
                            }
                        }
                        if (set1.color != set2.color || set1.label !== set2.label || set1.enabled !== set2.enabled) {
                            cfDiff = ConfigDifference.RENDER;
                        }
                    }
                    return cfDiff;
                }}

                withTooltip={true}
                withBrush={true} // can be true
                withZoom={true} // probs also true
                // zoomUpdateReloadInterval={this.props.zoomUpdateReloadInterval}
                // contentComponent={this.props.contentComponent}
                // contentRender={this.props.contentRender}
                // tooltipContentComponent={this.props.tooltipContentComponent}

                tooltipContentRender={props => <EventTooltipContent {...props} />}

                tooltipExtraProps={this.props.tooltipExtraProps}
                // getTooltipExtraState={this.props.getTooltipExtraState}
                // getSignalValuesForDefaultTooltip={this.props.getSignalValuesForDefaultTooltip}
                controlTimeIntervalChartWidth={true} // IDK, but its true in linechart
                // loadingOverlayColor={this.props.loadingOverlayColor}
                
                // displayLoadingTextWhenUpdating={this.props.displayLoadingTextWhenUpdating}
                // minimumIntervalMs={this.props.minimumIntervalMs}
                xAxisType={XAxisType.DATETIME}
            />
        );
    }
}
