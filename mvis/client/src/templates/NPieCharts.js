'use strict';

import React, { Component } from "react";
import PropTypes from "prop-types";
import { LegendPosition, StaticPieChart, withPanelConfig } from "../../../ivis-core/client/src/ivis/ivis";
import { withComponentMixins } from "../../../ivis-core/client/src/lib/decorator-helpers";
import { DocsDataProvider } from "../charts/Providers";

@withPanelConfig
export default class NPieCharts extends Component {
    constructor(props) {
        super(props);
    }

    static propTypes = {
        height: PropTypes.number,
        customProcessData: PropTypes.func,
    }

    static defaultProps = {
        height: 300
    }

    processDataForPie(pieConfig, doc) {
        return pieConfig.segments.map(s => ({
            label: s.label,
            color: s.color,
            value: (doc && doc[s.signal]) ? doc[s.signal] : 0
        })); // possibly filter segments with 0 value
    }

    getTotalValue(pieConfig, doc) {
        if (!doc) return 0;
        let total = 0;
        for (const s of pieConfig.segments) {
            total += doc[s.signal] || 0;
        }
        return total;
    }

    renderPieCharts(piesConfig, docs) {
        const widthPercent = Math.floor(100 / piesConfig.length) + '%';

        const doc = docs[0];
        return (
            <div>
                {piesConfig.map((pie, idx) =>
                    <span key={idx} style={{display: 'inline-block', width: widthPercent}}>
                        <StaticPieChart
                            config={{arcs: this.processDataForPie(pie, doc)}}
                            height={this.props.height}
                            legendPosition={LegendPosition.BOTTOM}
                            drawPercentageLabels={true}
                            drawValueLabels={true}
                            centerMessage={'Total: ' + this.getTotalValue(pie, doc)}
                        />
                    </span>
                )}
            </div>
        );
    }

    render() {
        const config = this.getPanelConfig();
        const sigSetCid = config.sigSet;
        const tsSigCid = config.tsSig;
        const pies = config.pies;

        const sigCids = config.extraSignals.map(s => s.sig);
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

                renderFun={docs => {
                    if (this.props.customProcessData) {
                        docs = this.props.customProcessData(docs, pies);
                    }
                    return this.renderPieCharts(pies, docs)
                }}
                loadingRenderFun={null}
            />
        );
    }
}
