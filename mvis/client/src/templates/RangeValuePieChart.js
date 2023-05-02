'use strict';

import React, { Component } from "react";
import PropTypes from "prop-types";
import { LegendPosition, PredefTimeRangeSelector, StaticPieChart, TimeContext, TimeRangeSelector, TimeSeriesProvider, withPanelConfig } from "../../../ivis-core/client/src/ivis/ivis";
import { withComponentMixins } from "../../../ivis-core/client/src/lib/decorator-helpers";
import { DocsDataProvider } from "../charts/Providers";
import { Dropdown } from "../../../ivis-core/client/src/lib/form";
import { ActionLink } from "../../../ivis-core/client/src/lib/bootstrap-components";


@withPanelConfig
export default class RangeValuePieChart extends Component {
    constructor(props) {
        super(props);

        this.state = {};
    }

    static propTypes = {
        docToLabel: PropTypes.func.isRequired,
        height: PropTypes.number,
    }

    static defaultProps = {
        height: 400
    }

    render() {
        const config = this.getPanelConfig();
        const sigSetCid = config.sigSet;
        const tsSigCid = config.tsSig;

        const signalsByCid = {}
        const signals = {};
        for (const s of config.signals) {
            signals[s.signal] = ['value'];
            signalsByCid[s.signal] = s;
        }

        const selectedSignalCid = this.state.selectedSignalCid || config.signals[0].cid;

        return (
            <TimeContext>
                <PredefTimeRangeSelector ranges={[
                    { from: 'now-1w', to: 'now', aggregationInterval: moment.duration(0, 's'), refreshInterval: moment.duration(1, 'm') },
                    { from: 'now-1M', to: 'now', aggregationInterval: moment.duration(0, 's'), refreshInterval: moment.duration(1, 'm') },
                    { from: 'now-1y', to: 'now', aggregationInterval: moment.duration(0, 's'), refreshInterval: moment.duration(1, 'm') },
                ]}/>
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
                    renderFun={(data) => {
                        const selectedSignal = signalsByCid[selectedSignalCid];

                        const arcs = data[sigSetCid].main.map(doc => ({
                            label: this.props.docToLabel(doc),
                            value: doc[selectedSignal.cid]['value']
                        }));

                        return <StaticPieChart
                            config={{ arcs }}
                            height={this.props.height}
                            drawPercentageLabels={true}
                            drawValueLabels={true}
                        />;
                    }}
                />
                <DocsDataProvider
                    sigSetCid={sigSetCid}
                    sigCids={sigCids}
                    sort={[{
                        sigCid: tsSigCid,
                        order: 'desc'
                    }]}
                    limit={1}

                    renderFun={docs => {
                        if (this.props.customProcessData) {
                            docs = this.props.customProcessData(docs, pies);
                        }
                        return this.renderPieCharts(pies, docs)
                    }}
                    loadingRenderFun={null}
                />
            </TimeContext>
        );
    }
}
