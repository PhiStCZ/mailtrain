'use strict';

import React, {Component} from "react";
import * as d3Axis from "d3-axis";
import * as d3Scale from "d3-scale";
import * as d3Selection from "d3-selection";
import * as d3Array from "d3-array";
import {event as d3Event, select} from "d3-selection";
import PropTypes from "prop-types";
import {withErrorHandling} from "../../../ivis-core/client/src/lib/error-handling";
import {withComponentMixins} from "../../../ivis-core/client/src/lib/decorator-helpers";
import {withTranslation} from "../../../ivis-core/client/src/lib/i18n";
import {PropType_d3Color_Required} from "../../../ivis-core/client/src/lib/CustomPropTypes";
import {Tooltip} from "../../../ivis-core/client/src/ivis/Tooltip";
import {extentWithMargin} from "../../../ivis-core/client/src/ivis/common";
import styles from "../../../ivis-core/client/src/ivis/CorrelationCharts.scss";

import { Icon } from "../../../ivis-core/client/src/lib/bootstrap-components";
import tooltipStyles from "../../../ivis-core/client/src/ivis/Tooltip.scss";

class TooltipContent extends Component {
    constructor(props) {
        super(props);
    }

    static propTypes = {
        config: PropTypes.object.isRequired,
        selection: PropTypes.object,
    };

    render() {
        // TODO: possibly limit the max amount of displayed segments
        const segment = this.props.selection;
        if (segment) {
            const content = [
                <div key={'heading'} className={tooltipStyles.signalLabel}>
                    {segment.group.label} - {segment.bar.label}{segment.bar.tooltipDisplayTotal && (': total ' + segment.bar.segments.at(-1).topValue)}
                </div>
            ];

            // segments are stored bottom-up, but tooltip displays top-to-bottom
            for (let i = segment.bar.segments.length - 1; i >= 0; i--) {
                const s = segment.bar.segments[i];
                content.push(
                    <div key={s.label}>
                        <span className={tooltipStyles.signalColor} style={{color: s.color}}><Icon icon="minus"/></span>
                        <span style={s === segment ? { fontWeight: 'bold'} : {}}>{s.label}: {s.value}</span>
                    </div>
                );
            }

            return <div>{content}</div>;

        } else {
            return null;
        }
    }
}

@withComponentMixins([
    withTranslation,
    withErrorHandling,
])
export class GroupedSegmentedBarChart extends Component {
    constructor(props) {
        super(props);

        this.state = {
            width: 0,
        };

        this.resizeListener = () => this.createChart(true);
        this.plotRectId = _.uniqueId('plotRect');
        this.bottomAxisId = _.uniqueId('bottomAxis');

        this.preprocessBarData(props.config.barGroups);
    }

    static propTypes = {
        config: PropTypes.shape({
            barGroups: PropTypes.arrayOf(PropTypes.shape({
                label: PropTypes.string.isRequired,
                bars: PropTypes.arrayOf(PropTypes.shape({
                    label: PropTypes.string.isRequired,
                    accumulateValues: PropTypes.bool,
                    tooltipDisplayTotal: PropTypes.bool,
                    segments: PropTypes.arrayOf(PropTypes.shape({
                        label: PropTypes.string.isRequired,
                        color: PropType_d3Color_Required(),
                        value: PropTypes.number.isRequired
                    })).isRequired
                })).isRequired
            })).isRequired
        }).isRequired,
        height: PropTypes.number.isRequired,
        margin: PropTypes.object,
        withTooltip: PropTypes.bool,
        minValue: PropTypes.number,
    }

    static defaultProps = {
        margin: {left: 40, right: 5, top: 5, bottom: 20},
        withTooltip: true,
        minValue: 0,
    }

    preprocessBarData(barGroups) {
        const minValue = this.props.minValue;
        this.allSegments = [];
        for (const group of barGroups) {
            for (const bar of group.bars) {
                let lastValue = minValue;
                for (const seg of bar.segments) {
                    seg.key = `${group.label} ${bar.label} ${seg.label}`;
                    seg.bar = bar;
                    seg.group = group;
                    seg.topValue = bar.accumulateValues ? seg.value + lastValue : seg.value;
                    seg.bottomValue = lastValue;
                    lastValue = seg.topValue;

                    this.allSegments.push(seg);
                }
            }
        }
    }

    drawAllBarSegments(segmentsData, barsSelection, xScale, yScale) {
        const self = this;
        const bars = barsSelection
            .selectAll('rect')
            .data(segmentsData, d => d.key);
        const groupWidth = xScale.bandwidth();

        const segmentX = seg => xScale(seg.group.label) + (groupWidth / seg.group.bars.length) * seg.group.bars.indexOf(seg.bar);
        const segmentWidth = seg => groupWidth / seg.group.bars.length;
        const segmentY = seg => yScale(seg.topValue);
        const segmentHeight = seg => yScale(seg.bottomValue) - yScale(seg.topValue);

        const selectSegment = function (seg = null) {
            if (seg !== self.state.selection) {
                self.highlightSelection
                    .selectAll('rect')
                    .remove();

                if (seg !== null) {
                    self.highlightSelection
                        .append('rect')
                        .attr('x', segmentX(seg))
                        .attr('width', segmentWidth(seg))
                        .attr('y', segmentY(seg))
                        .attr('height', segmentHeight(seg))
                        .attr('fill', 'none')
                        .attr('stroke', 'black')
                        .attr('stroke-width', '2px');
                }
            }

            const containerPos = d3Selection.mouse(self.containerNode);
            const mousePosition = {x: containerPos[0], y: containerPos[1]};

            self.setState({
                selection: seg,
                mousePosition
            });
        };

        const deselectSegment = function () {
            self.highlightSelection
                .selectAll('rect')
                .remove();

            self.setState({
                selection: null,
                mousePosition: null
            });
        }

        bars.enter()
            .append('rect')
            .attr('x', segmentX)
            .attr('width', segmentWidth)
            .attr('y', segmentY)
            .attr('height', segmentHeight)
            .attr('fill', (d, i) => d.color)
            .on('mouseover', selectSegment)
            .on('mousemove', selectSegment)
            .on('mouseout', deselectSegment)
            .exit()
            .remove();
    }

    componentDidMount() {
        window.addEventListener('resize', this.resizeListener);
        this.createChart(false);
    }

    componentDidUpdate(prevProps, prevState) {
        const forceRefresh = this.prevContainerNode !== this.containerNode
            || !Object.is(prevProps.config, this.props.config);

        this.createChart(forceRefresh);
        this.prevContainerNode = this.containerNode;
    }

    componentWillUnmount() {
        window.removeEventListener('resize', this.resizeListener);
    }

    createChart(forceRefresh) {
        const width = this.containerNode.getClientRects()[0].width;

        if (this.state.width !== width) {
            this.setState({width});
        }

        const widthChanged = width !== this.renderedWidth;
        if (!forceRefresh && !widthChanged) {
            return;
        }
        this.renderedWidth = width;

        if (this.props.config.barGroups.length === 0) {
            this.statusMsgSelection.text(this.props.t('No data.'));
            this.barsSelection.selectAll('rect').remove();
            this.xAxisSelection.selectAll('.tick').remove();
            this.zoom = null;
            return;
        } else {
            this.statusMsgSelection.text('');
        }

        const xSize = width - this.props.margin.left - this.props.margin.right;
        const xExtent = this.props.config.barGroups.map(b => b.label);
        const xScale = d3Scale.scaleBand()
            .domain(xExtent)
            .range([0, xSize])
            .padding(0.3);
        const xAxis = d3Axis.axisBottom(xScale)
            //.tickFormat(this.props.getLabel)
            .tickSizeOuter(0);
        this.xAxisSelection.call(xAxis);
    
        // Checking overflowing labels
        const texts = this.xAxisSelection.selectAll('.tick text');
        texts.nodes().forEach((e, i) => {
            if (e.getBBox().width > xScale.bandwidth()) {
                e.textContent = '...';
            }
        });

        const ySize = this.props.height - this.props.margin.top - this.props.margin.bottom;
        let yExtent = extentWithMargin(d3Array.extent(this.allSegments, s => s.topValue), 0.1);
        if (this.props.minValue !== undefined)
            yExtent[0] = this.props.minValue;
        if (this.props.maxValue !== undefined)
            yExtent[1] = this.props.maxValue;
        const yScale = d3Scale.scaleLinear()
            .domain(yExtent)
            .range([ySize, 0]);
        const yAxis = d3Axis.axisLeft(yScale)
            .tickSizeOuter(0);
        this.yAxisSelection
            .call(yAxis);

        this.drawAllBarSegments(this.allSegments, this.barsSelection, xScale, yScale);
    }

    render() {
        return (
            <div className={styles.touchActionNone}>
                <svg id="cnt" ref={node => this.containerNode = node} height={this.props.height} width={"100%"}>
                    <defs>
                        <clipPath id={this.plotRectId}>
                            <rect x="0" y="0"
                                  width={this.state.width - this.props.margin.left - this.props.margin.right}
                                  height={this.props.height - this.props.margin.top - this.props.margin.bottom}/>
                        </clipPath>
                        <clipPath id={this.bottomAxisId}>
                            <rect x={-6} y={0}
                                  width={this.state.width - this.props.margin.left - this.props.margin.right + 6}
                                  height={this.props.margin.bottom} /* same reason for 6 as in HeatmapChart */ />
                        </clipPath>
                    </defs>
                    <g transform={`translate(${this.props.margin.left}, ${this.props.margin.top})`}
                       clipPath={`url(#${this.plotRectId})`}>
                        <g ref={node => this.barsSelection = select(node)}/>
                        <g ref={node => this.highlightSelection = select(node)}/>
                    </g>
                    <g ref={node => this.xAxisSelection = select(node)}
                       transform={`translate(${this.props.margin.left}, ${this.props.height - this.props.margin.bottom})`}
                       clipPath={`url(#${this.bottomAxisId})`}/>
                    <g ref={node => this.yAxisSelection = select(node)}
                       transform={`translate(${this.props.margin.left}, ${this.props.margin.top})`}/>
                    <text ref={node => this.statusMsgSelection = select(node)} textAnchor="middle" x="50%" y="50%"
                          fontFamily="'Open Sans','Helvetica Neue',Helvetica,Arial,sans-serif" fontSize="14px"/>
                    {this.props.withTooltip &&
                    <Tooltip
                        config={this.props.config}
                        signalSetsData={this.props.config}
                        containerHeight={this.props.height}
                        containerWidth={this.state.width}
                        mousePosition={this.state.mousePosition}
                        selection={this.state.selection}
                        contentRender={props => <TooltipContent {...props}/>}
                        width={250}
                    />
                    }
                </svg>
            </div>
        );
    }
}
