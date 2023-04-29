'use strict';

import em from '../../ivis-core/client/src/lib/extension-manager';
import { UntrustedContentRoot } from '../../ivis-core/client/src/lib/untrusted';
import './styles.scss';
import { EventLineChartTemplate, campaignActivityEventToString, listActivityEventToString } from './templates/EventLineChart';
import { NPieCharts } from './templates/NPieCharts';

em.on('client.installSandboxRoutes', (structure, t) => {
    const panelRoutes = {
        'mt-list-subscriptions': {
            render: props => <EventLineChartTemplate
                activityEventToString={listActivityEventToString}
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
                activityEventToString={campaignActivityEventToString}
                {...props}
            />
        },

        'mt-channel-campaigns': {
            render: props => <EventLineChartTemplate
                activityEventToString={campaignActivityEventToString}
                {...props}
            />
        },
    }

    for (const route of panelRoutes) {
        structure.children[route] = {
            panelRender: _ => <UntrustedContentRoot
                render={panelRoutes[route].render}
            />
        };
    }
});

require('../../ivis-core/client/src/root-sandbox');
