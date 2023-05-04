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

import { IntervalAbsolute, RenderStatus, TimeBasedChartBase, XAxisType, isSignalVisible as isVisible } from "../../../ivis-core/client/src/ivis/ivis";
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
        signalSetsData: PropTypes.object,
        selection: PropTypes.object,
    }

    static defaultProps = {
        getSignalValues: defaultGetSignalValues,
        eventToString: evt => `activity ${evt.data.activityType.value}`,
    }

    renderRows() {
        if (!this.props.selection) {
            return null;
        }

        const rows = [
            <div key={'header'} className={tooltipStyles.time}>
                Selected nearby events:
            </div>
        ];

        for (const sigSetConf of this.props.config) {
            const sigSetSel = this.props.selection[sigSetConf.cid];

            if (!sigSetSel) {
                continue;
            }

            rows.push(
                <div key={sigSetConf.cid} className={tooltipStyles.signalLabel}>
                    Events of {sigSetConf.label}
                </div>
            );

            rows.push(...sigSetSel.data.map((evt, idx) => (
                <div key={`${sigSetConf.cid}-${idx}`}>
                    <span className={tooltipStyles.signalColor} style={{color: sigSetConf.color}}><Icon icon="minus"/></span>
                    <span className={tooltipStyles.signalVal}>{sigSetConf.eventToString(evt)} ({dateMath.format(evt.ts)})</span>
                </div>
            )));
        }

        rows.unshift(
            <div key='line' className={tooltipStyles.time}>{dateMath.format(ts)}</div>
        );

        return <div>{rows}</div>;
    }
}


export class EventChart extends Component {
    constructor(props) {
        super(props)

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
        lineWidth: PropTypes.number,
        horizontalLineColor: PropTypes.string,
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
            signalSetsData[setSpec.cid] = extraData[0][setSpec.cid].main;
        }

        return { signalSetsData };
    }

    getGraphContent(base) {
        const paths = [
            <g key={'aesthetic_horizontal'}>
                <path ref={node => this.aestheticHorizontalSelection = select(node)}/>
            </g>
        ];

        for (const setSpec of this.props.config) {
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
            const data = signalSetsData[setSpec.cid];
            noData &&= (data.length == 0);

            const mergedEvents = [];
            const mergeDistance = (abs.to - abs.from) * 0.025;
            for (const event of data) {
                if (mergedEvents.length != 0 && event.ts - mergedEvents.at(-1).ts <= mergeDistance) {
                    mergedEvents.at(-1).events.push(event);
                } else {
                    mergedEvents.push({ ts: event.ts, events: [event] });
                }
            }

            mergedEventsBySigSet[setSpec.cid] = mergedEvents;

            eventLinesBySigSet[setSpec] = [];
            for (const event of mergedEvents) {
                eventLinesBySigSet[setSpec].push({ ...event, top: true });
                eventLinesBySigSet[setSpec].push({ ...event, top: false });
                eventLinesBySigSet[setSpec].push(null); // this separates the lines
            }
        }

        this.setState({ mergedEventsBySigSet });

        let selection = null;
        let mousePosition = null;

        const selectPoints = () => {
            const containerPos = d3Selection.mouse(base.containerNode);
            const x = containerPos[0] - self.props.margin.left;
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
                if (Math.abs(closest.ts - mouseTs) <= maxSelectDistance) {
                    selection = selection || {};
                    selection[sigSetCid] = closest;
                }
            }

            if (!activityEvents || activityEvents.length == 0) {
                selection[ACTIVITY_EVENT_SEL_CID] = activitySelection;
                return;
            }

            base.setState({
                selection,
                mousePosition
            });
        }

        const deselectPoints = () => {
            if (base.cursorLineVisible) {
                base.cursorSelection.attr('visibility', 'hidden');
                base.cursorLineVisible = false;
            }

            if (noData) {
                return;
            }

            // ...

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
            .on('mouseenter', selectPoints)
            .on('mousemove', selectPoints)
            .on('mouseleave', deselectPoints)

        if (noData) {
            return RenderStatus.NO_DATA;
        }

        const innerHeight = this.props.height - this.props.margin.top - this.props.margin.bottom;
        const topY = innerHeight / 4;
        const bottomY = innerHeight * 3 / 4;
        const lineWidth = this.props.lineWidth;
        const line = d3Shape.line()
            .defined(d => d !== null)
            .x(d => xScale(d.ts))
            .y(d => d.top ? topY : bottomY)

        for (const setSpec of config.signalSets) {
            if (!eventLinesBySigSet[setSpec.cid] || !isVisible(setSpec)) {
                continue;
            }

            const lineColor = this.props.getLineColor(rgb(sigConf.color));
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

            const innerWidth = xScale.range()[1], lineSegments = 17;
            const segmentLength = innerWidth / lineSegments;
            const lineData = [];
            for (const i = 0; i < lineSegments; i += 2) {
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
                config={props.config}
                // // data={props.data}
                height={props.height}
                margin={props.margin}


                prepareData={this.boundPrepareData}
                getQueries={this.boundGetQueries}
                createChart={this.boundCreateChart}
                getGraphContent={this.boundGetGraphContent}

                // // getSvgDefs={props.getSvgDefs}
                // // compareConfigs={props.compareConfigs}

                withTooltip={true}
                withBrush={true} // can be true
                withZoom={true} // probs also true
                // zoomUpdateReloadInterval={props.zoomUpdateReloadInterval}
                // contentComponent={props.contentComponent}
                // contentRender={props.contentRender}
                // tooltipContentComponent={this.props.tooltipContentComponent}

                tooltipContentRender={props => <EventTooltipContent {...props} />}

                // tooltipExtraProps={this.props.tooltipExtraProps}
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
