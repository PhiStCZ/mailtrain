'use strict';

import React from 'react';
import em from '../../ivis-core/client/src/lib/extension-manager';
import { UntrustedContentRoot } from '../../ivis-core/client/src/lib/untrusted';
import './styles.scss';
import { EventLineChartTemplate, campaignEventToString, listEventToString } from './templates/EventLineChart';
import NPieCharts from './templates/NPieCharts';
import GroupedSegmentedBarChartTemplate from './templates/GroupedSegmentedBarChart';

em.on('client.installSandboxRoutes', (structure, t) => {
    const panelRoutes = {
        'mt-list-subscriptions': {
            render: props => <EventLineChartTemplate
                eventToString={listEventToString}
                {...props}
            />
        },

        'mt-campaign-overview': {
            render: props => <NPieCharts
                {...props}
            />
        },

        'mt-campaign-messages': {
            render: props => <EventLineChartTemplate
                eventToString={campaignEventToString}
                {...props}
            />
        },

        'mt-channel-campaigns': {
            render: props => <GroupedSegmentedBarChartTemplate
                docToLabel={doc => `campaign ${doc.campaignId}`}
                customProcessData={(docs, barGroups) => {
                    for (const group of barGroups) {
                        for (const bar of group.bars) {
                            if (bar.label != 'Messages') continue;
                            // subtract opened from sent to get delivered
                            bar.segments[1].value -= bar.segments[0].value;
                        }
                    }
                    return barGroups;
                }}
                {...props}
            />
        },
    }

    for (const route in panelRoutes) {
        structure.children[route] = {
            panelRender: _ => <UntrustedContentRoot
                render={props => {
                    props.setPanelMenu = () => {}; // handle nonexistent setPanelMenu
                    return panelRoutes[route].render(props);
                }}
            />
        };
    }
});

require('../../ivis-core/client/src/root-sandbox');
