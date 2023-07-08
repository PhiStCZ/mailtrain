'use strict';

import React, { Component } from "react";
import PropTypes from "prop-types";
import moment from "moment";
import { IntervalSpec, PredefTimeRangeSelector, StaticPieChart, TimeContext, TimeSeriesProvider, withPanelConfig } from "../../../ivis-core/client/src/ivis/ivis";
import { ActionLink } from "../../../ivis-core/client/src/lib/bootstrap-components";


@withPanelConfig
export default class RangeValuePieChart extends Component {
    constructor(props) {
        super(props);

        this.state = {};
    }

    static propTypes = {
        processDataFun: PropTypes.func.isRequired,
        docToLabel: PropTypes.func.isRequired,
        height: PropTypes.number,
        arcWidth: PropTypes.number,
    }

    static defaultProps = {
        height: 400
    }

    render() {
        const config = this.getPanelConfig();
        const sigSetCid = config.sigSet;
        const tsSigCid = config.tsSig;

        const signalsByCid = {};
        const signals = {};
        for (const s of config.signals) {
            signals[s.signal] = ['value'];
            signalsByCid[s.signal] = s;
        }
        for (const s of config.extraSignals) {
            signals[s.sig] = ['value'];
        }

        const selectedSignalCid = this.state.selectedSignalCid || config.signals[0].signal;

        const timeRanges = [
            { from: 'now-1w', label: 'Last week' },
            { from: 'now-1M', label: 'Last month' },
            { from: 'now-1y', label: 'Last year' }
        ].map(e => ({
            ...e,
            to: 'now',
            aggregationInterval: moment.duration(0, 's'),
            refreshInterval: moment.duration(1, 'm')
        }));

        return (
            <TimeContext
                initialIntervalSpec={new IntervalSpec(
                    timeRanges[0].from,
                    timeRanges[0].to,
                    timeRanges[0].aggregationInterval,
                    timeRanges[0].refreshInterval
                )}
            >
                {/* TODO: perhaps organize this better */}
                <h4>Include campaigns within:</h4>
                <PredefTimeRangeSelector ranges={timeRanges}/>
                <h4>Statistic:</h4>
                <ul className="nav nav-pills">
                    {config.signals.map(s =>
                        <li key={s.signal} className="nav-item">
                            <ActionLink
                                className={(s.signal === selectedSignalCid ? 'nav-link active' : 'nav-link')}
                                onClickAsync={async () => this.setState({ selectedSignalCid: s.signal })}
                            >{s.label}</ActionLink>
                        </li>
                    )}
                </ul>
                <TimeSeriesProvider
                    signalSets={{
                        [sigSetCid]: { tsSigCid, signals }
                    }}
                    renderFun={data => {
                        const selectedSignal = signalsByCid[selectedSignalCid];

                        const arcs = data[sigSetCid].main.map(doc => ({
                            label: this.props.docToLabel(doc),
                            value: doc.data[selectedSignal.signal].value
                        }));

                        return <StaticPieChart
                            config={{ arcs }}
                            height={this.props.height}
                            arcWidth={this.props.arcWidth}
                            drawPercentageLabels={true}
                            drawValueLabels={true}
                        />;
                    }}
                    processDataFun={this.props.processDataFun}
                />
            </TimeContext>
        );
    }
}
