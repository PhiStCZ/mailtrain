'use strict';

import React from 'react';
import em from '../../ivis-core/client/src/lib/extension-manager';
import { UntrustedContentRoot } from '../../ivis-core/client/src/lib/untrusted';
import './styles.scss';
import { EventLineChartTemplate, campaignEventToString, listEventToString } from './templates/EventLineChart';
import NPieCharts from './templates/NPieCharts';
import GroupedSegmentedBarChartTemplate from './templates/GroupedSegmentedBarChart';
import RangeValuePieChart from './templates/RangeValuePieChart';
import { EventChartTemplate } from './templates/EventChart';
import axios from '../../ivis-core/client/src/lib/axios';
import { getUrl } from '../../ivis-core/client/src/lib/urls';

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
                customProcessData={(docs, pies) => {
                    if (!docs || docs.length < 1) return docs;
                    // subtract opened from sent to get delivered
                    docs[0].sent -= docs[0].opened
                    return docs;
                }}
                {...props}
            />
        },

        'mt-campaign-messages': {
            render: props => <EventLineChartTemplate
                eventToString={campaignEventToString}
                {...props}
            />
        },

        'mt-channel-recent-campaigns': {
            render: props => <GroupedSegmentedBarChartTemplate
                docToLabel={doc => `${doc.label} (ID ${doc.campaignId})`}
                providerProcessData={async docs => {
                    const reqCampaigns = {
                        ids: docs.map(d => d.campaignId)
                    };
                    const targetUrl = getUrl('rest/mt-entity-info');
                    const res = await axios.post(targetUrl, { campaign: reqCampaigns });
                    const campaignData = res.data.campaign;
                    for (let i = 0; i < docs.length; i++) {
                        docs[i].label = (campaignData[i] && campaignData[i].name) || 'UNKNOWN';
                    }

                    return docs;
                }}
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

        'mt-channel-campaign-contributions': {
            render: props => <RangeValuePieChart
                docToLabel={doc => `campaign ${doc.data.campaignId.value}`}
                {...props}
            />
        },

        'mt-audit': {
            render: props => <EventChartTemplate
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
