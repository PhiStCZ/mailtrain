'use strict';

import React, { Component } from "react";
import { GroupedSegmentedBarChart } from "../charts/GroupedSegmentedBarChart";
import { DocsDataProvider } from "../charts/Providers";
import { withTranslation } from "../../../ivis-core/client/src/lib/i18n";
import { withComponentMixins } from "../../../ivis-core/client/src/lib/decorator-helpers";
import { withPanelConfig } from "../../../ivis-core/client/src/ivis/PanelConfig";

@withPanelConfig
export default class GroupedSegmentedBarChartTemplate extends Component {
    docToLabel = (doc) => `campaign ${doc.id}`;

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

        const processData = (docs) => {
            const barGroups = [];
            for (const doc of docs) {
                barGroups.push({
                    label: doc[groupBySignal],
                    bars: bars.map(b => ({
                        label: this.docToLabel(doc),
                        tooltipAccumulateValues: b.tooltipAccumulateValues,
                        tooltipDisplayTotal: true,
                        segments: b.segments.map(s => ({
                            label: s.label,
                            color: s.color,
                            value: doc[s.signal]
                        }))
                    }))
                });
            }

            if (this.props.customProcessData) {
                barGroups = this.props.customProcessData(docs, barGroups);
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
                />}
                loadingRenderFun={null}
            />
        );
    }
}
