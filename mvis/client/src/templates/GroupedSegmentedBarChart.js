'use strict';

import React, { Component } from "react";
import { GroupedSegmentedBarChart } from "../charts/GroupedSegmentedBarChart";
import { DocsDataProvider } from "../providers/Providers";
import { withTranslation } from "../../../ivis-core/client/src/lib/i18n";
import { withComponentMixins } from "../../../ivis-core/client/src/lib/decorator-helpers";
import { withPanelConfig } from "../../../ivis-core/client/src/ivis/PanelConfig";

@withPanelConfig
export default class GroupedSegmentedBarChartTemplate extends Component {
    docToLabel = doc => doc.label;

    render() {
        const config = this.getPanelConfig();
        const groupsLimit = config.groupsLimit;
        const sigSetCid = config.sigSet;
        const tsSigCid = config.tsSig;
        const bars = config.bars;
        const extraSignals = config.extraSignals;

        const sigCids = extraSignals.map(s => s.sig);
        for (const bar of bars) {
            for (const segment of bar.segments) {
                sigCids.push(segment.signal);
            }
        }

        const processData = docs => {
            const toLabel = this.props.docToLabel || this.docToLabel;
            const barGroups = docs.map(doc => ({
                label: toLabel(doc),
                bars: bars.map(b => ({
                    label: b.label,
                    accumulateValues: b.accumulateValues,
                    tooltipDisplayTotal: true,
                    segments: b.segments.map(s => ({
                        label: s.label,
                        color: s.color,
                        value: doc[s.signal]
                    }))
                }))
            }));

            if (this.props.customProcessData) {
                return this.props.customProcessData(docs, barGroups);
            }
            return barGroups;
        }

        return (
            <DocsDataProvider
                sigSetCid={sigSetCid}
                sigCids={sigCids}
                sort={[{
                    sigCid: tsSigCid,
                    order: 'desc'
                }]}
                limit={groupsLimit}

                renderFun={(docs) => <GroupedSegmentedBarChart
                    config={{barGroups: processData(docs)}}
                    height={400}
                />}
                processDataFun={this.props.providerProcessData}
                loadingRenderFun={null}
            />
        );
    }
}
