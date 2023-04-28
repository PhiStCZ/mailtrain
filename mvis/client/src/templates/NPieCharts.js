'use strict';

import React, { Component } from "react";
import PropTypes from "prop-types";
import { withPanelConfig, TimeContext, TimeRangeSelector, Legend, StaticPieChart } from "../../../ivis-core/client/src/ivis/ivis";
import { EventLineChart } from "../charts/EventLineChart";
import { DocsDataProvider } from "../charts/Providers";

@withComponentMixins([
    // withTranslation,
    withPanelConfig,
])
export class NPieCharts extends Component {
    constructor(props) {
        super(props);
    }

    static propTypes = {
        height: PropTypes.number,
    }

    static defaultProps = {
        height: 500
    }

    processDataForPie(pieConfig, doc) {
        return pieConfig.segments.map(s => ({
            label: s.label,
            color: s.color,
            value: doc[s.signal]
        })); // possibly filter segments with 0 value
    }

    renderPieCharts(piesConfig, docs) {
        const widthPercent = Math.floor(100 / piesConfig.length) + '%';

        if (docs.length < 1) {
            return null; // TODO: add no data placeholder instead of null
        }
        const doc = docs[0];
        return (
            <div>
                {piesConfig.map((pie, idx) => {
                    <span key={idx} style={{width: widthPercent}}>
                        <StaticPieChart
                            config={{arcs: this.processDataForPie(pie, doc)}}
                            height={this.props.height}
                        />
                    </span>
                })}
            </div>
        );
    }

    render() {
        const config = this.getPanelConfig();
        const sigSetCid = config.sigSet;
        const tsSigCid = config.tsSig;
        const pies = config.pies;

        const sigCids = extraSignals.map(s => s.sig);
        for (const pie of pies) {
            for (const segment of pie.segments) {
                sigCids.push(segment.signal);
            }
        }

        return (
            <DocsDataProvider
                sigSetCid={sigSetCid}
                sigCids={sigCids}
                sort={[{
                    sigCid: tsSigCid,
                    order: 'desc'
                }]}
                limit={1}

                renderFun={(docs) => this.renderPieCharts(docs)}
                loadingRenderFun={null}
            />
        );
    }
}
