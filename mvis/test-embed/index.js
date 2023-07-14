'use strict';

const http = require('http');
const https = require('https');
const express = require('express');
const hbs = require('hbs');
const router = require('../ivis-core/server/lib/router-async').create();
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const fork = require('../../server/lib/fork').fork;
const mvisApi = require('../../server/lib/mvis-api');
const { LogTypeId, ListActivityType, CampaignActivityType, EntityActivityType, CampaignTrackerActivityType, ChannelActivityType } = require('../../shared/activity-log');
const { SubscriptionStatus } = require('../../shared/lists');
const { CampaignStatus } = require('../../shared/campaigns');
const activityLog = require('../../server/lib/activity-log');

// mockup
const amountOfEachEntity = 10;

function getEntityName(entityType, entityId) {
    return `${entityType} of ID ${entityId}`;
}

function getLinkUrl(linkId) {
    return `http://example.com/link_${linkId}`;
}

/**
 * Sets up MVIS server. Returns a promise resolving when MVIS is ready.
 */
function setUpMvis() {
    function handleEntityInfo(msg) {
        const entityReqs = msg.data;
        const result = {};
        if (entityReqs.campaign) {
            result.campaign = entityReqs.campaign.ids.map(id => ({
                id, name: getEntityName('campaign', id), cid: `campaign_${id}`
            }));
        }
        if (entityReqs.list) {
            result.list = entityReqs.list.ids.map(id => ({
                id, name: getEntityName('list', id)
            }));
        }
        if (entityReqs.link) {
            result.link = entityReqs.link.ids.map(id => ({
                id, url: getLinkUrl(id)
            }));
        }

        return result;
    }

    return new Promise(resolve => {
        const wDir = path.join(__dirname, '..', 'server');

        let mvisProcess = fork(path.join(wDir, 'index.js'), [], {
            cwd: wDir,
            env: {
                NODE_ENV: process.env.NODE_ENV,
                API_TOKEN: mvisApi.token
            }
        });
    
        mvisProcess.on('message', async msg => {
            if (!msg) return;
            if (msg.type === 'entity-info') {
                const response = handleEntityInfo(msg);
                mvisProcess.send({
                    type: 'response',
                    data: response,
                    requestId: msg.requestId,
                });
            } else if (msg.type === 'synchronize') {
                mvisProcess.send({
                    type: 'response',
                    data: null,
                    requestId: msg.requestId,
                });
            } else if (msg.type === 'mvis-ready') {
                resolve();
            }
        });
    });
}

/**
 * Logs some data into MVIS to test the logging and visualizations
 */
async function logTestData() {
    const second = 1000,
        minute = 60 * second,
        hour = 60 * minute,
        day = 24 * hour;


    function generateTimestamps(amount, startTs, endTs) {
        // generate <amount> of timestamps within given interval
        // return them in a random order

        if (amount < 0) throw new Error();
        const diffTs = endTs - startTs;
        const timestamps = [];
        for (let i = 0; i < amount; i++) {
            timestamps.push(startTs + Math.floor(Math.random() * diffTs));
        }

        return timestamps;
    }


    function randomListSubs(listInfo, timestamps) {
        const maxIdx = listInfo.subs.length;
        listInfo.subs = listInfo.subs.concat(timestamps.map((ts, idx) => ({ id: maxIdx + idx, subTime: ts })));
    }
    function randomListUnsubs(listInfo, timestamps) {
        let timestampI = 0;
        for (const sub of listInfo.subs.filter(s => !s.unsubTime)) {
            if (timestampI == timestamps.length) return;
            sub.unsubTime = timestamps[timestampI];
        }
    }
    function listInfoToEvents(listInfo) {
        const subs = listInfo.subs.map(sub => ({
            logType: LogTypeId.LIST_TRACKER,
            args: [ ListActivityType.CREATE_SUBSCRIPTION, listInfo.id, sub.id, {
                subscriptionStatus: SubscriptionStatus.SUBSCRIBED,
                timestamp: sub.subTime,
            }]
        }));
        const unsubs = listInfo.subs.filter(sub => sub.unsubTime).map(sub => ({
            logType: LogTypeId.LIST_TRACKER,
            args: [ ListActivityType.SUBSCRIPTION_STATUS_CHANGE, listInfo.id, sub.id, {
                previousSubscriptionStatus: SubscriptionStatus.SUBSCRIBED,
                timestamp: sub.unsubTime,
            }]
        }));

        return subs.concat(unsubs);
    }


    function launchCampaign(campaignInfo, startTs, endTs) {
        const sendingTs = startTs + minute;
        const sentTs = startTs + 3 * minute;

        const sentSubs = campaignInfo.listInfo.subs.filter(s => (s.subTime < startTs) && !s.unsubTime);

        const campaignId = campaignInfo.id;
        const listId = campaignInfo.listInfo.id;

        const {
            failedAmount, bouncedAmount,
            openedAmount, clickedAmount, unsubbedAmount, complainedAmount
        } = campaignInfo

        const events = [
            {
                logType: LogTypeId.CAMPAIGN,
                args: [ EntityActivityType.CREATE, campaignId, {
                    timestamp: startTs,
                    status: CampaignStatus.IDLE,
                    channelId: campaignInfo.channelId
                }]
            },
            {
                logType: LogTypeId.CAMPAIGN,
                args: [ CampaignActivityType.STATUS_CHANGE, campaignId, {
                    timestamp: startTs + 55 * second,
                    status: CampaignStatus.SCHEDULED
                }]
            },
            {
                logType: LogTypeId.LIST,
                args: [ ListActivityType.SEND_CAMPAIGN, listId, {
                    timestamp: startTs + 55 * second,
                    campaignId: campaignId
                }]
            },
            {
                logType: LogTypeId.CAMPAIGN,
                args: [ CampaignActivityType.STATUS_CHANGE, campaignId, {
                    timestamp: sendingTs,
                    status: CampaignStatus.SENDING
                }]
            },
            {
                logType: LogTypeId.CAMPAIGN,
                args: [ CampaignActivityType.STATUS_CHANGE, campaignId, {
                    timestamp: sentTs,
                    status: CampaignStatus.FINISHED
                }]
            },
        ];
        if (campaignInfo.channelId) {
            events.push({
                logType: LogTypeId.CHANNEL,
                args: [ ChannelActivityType.ADD_CAMPAIGN, campaignInfo.channelId, {
                    timestamp: startTs,
                    campaignId: campaignId
                }]
            });
        }
        for (const linkId of campaignInfo.linkIds) {
            events.push({
                logType: LogTypeId.CAMPAIGN_TRACKER,
                args: [ CampaignTrackerActivityType.ADD_LINK, campaignId, null, null, {
                    timestamp: sendingTs,
                    linkId,
                }]
            });
        }

        const sentTimestamps = generateTimestamps(sentSubs.length, sendingTs, sentTs);
        const notOpenedAmount = failedAmount + bouncedAmount;
        for (let i = 0; i < sentSubs.length; i++) {
            const eventType = i < failedAmount
                ? CampaignTrackerActivityType.FAILED
                : CampaignTrackerActivityType.SENT;
            const timestamp = sentTimestamps[i];
            const subId = sentSubs[i].id;

            events.push({
                logType: LogTypeId.CAMPAIGN_TRACKER,
                args: [ eventType, campaignId, listId, subId, {
                    timestamp: timestamp
                }]
            });

            if (i >= failedAmount && i < notOpenedAmount) {
                events.push({
                    logType: LogTypeId.CAMPAIGN_TRACKER,
                    args: [ CampaignTrackerActivityType.BOUNCED, campaignId, listId, subId, {
                        timestamp: timestamp
                    }]
                });
                sentSubs[i].unsubTime = timestamp;
            }
        }

        const openedTimestamps = generateTimestamps(openedAmount, sentTs, endTs);
        const actedAmount = unsubbedAmount + complainedAmount + clickedAmount;
        for (let i = notOpenedAmount; i < openedAmount + notOpenedAmount; i++) {
            const timestamp = openedTimestamps[i - notOpenedAmount];
            const subId = sentSubs[i].id;

            events.push({
                logType: LogTypeId.CAMPAIGN_TRACKER,
                args: [ CampaignTrackerActivityType.OPENED, campaignId, listId, subId, {
                    timestamp: timestamp
                }]
            });

            if (i < notOpenedAmount + actedAmount) {
                let type;
                if (i < notOpenedAmount + unsubbedAmount) {
                    type = CampaignTrackerActivityType.UNSUBSCRIBED;
                    sentSubs[i].unsubTime = timestamp;
                } else if (i < notOpenedAmount + unsubbedAmount + complainedAmount) {
                    type = CampaignTrackerActivityType.COMPLAINED;
                    sentSubs[i].unsubTime = timestamp;
                } else {
                    type = CampaignTrackerActivityType.CLICKED_ANY;
                    let linkId = campaignInfo.linkIds[Math.floor(Math.random() * campaignInfo.linkIds.length)];

                    events.push({
                        logType: LogTypeId.CAMPAIGN_TRACKER,
                        args: [ CampaignTrackerActivityType.CLICKED, campaignId, listId, subId, {
                            timestamp: timestamp + minute,
                            linkId
                        }]
                    });
                }

                events.push({
                    logType: LogTypeId.CAMPAIGN_TRACKER,
                    args: [ type, campaignId, listId, subId, {
                        timestamp: timestamp + minute
                    }]
                });
            }
        }

        return events;
    }


    const startTs = new Date(2023, 6, 1, 6).getTime();

    let allEvents = [];

    const list1Info = {
        id: 1,
        subs: [],
    }

    // day 1
    {
        allEvents.push({
            logType: LogTypeId.LIST,
            args: [ EntityActivityType.CREATE, list1Info.id, {
                timestamp: startTs,
            }]
        },
        {
            logType: LogTypeId.USER,
            args: [ EntityActivityType.UPDATE, 1, {
                timestamp: startTs + hour,
            }]
        },
        {
            logType: LogTypeId.SEND_CONFIGURATION,
            args: [ EntityActivityType.CREATE, 1, {
                timestamp: startTs + 2 * hour,
            }]
        },
        {
            logType: LogTypeId.USER,
            args: [ EntityActivityType.UPDATE, 1, {
                timestamp: startTs + 8 * hour,
            }]
        });

        randomListSubs(list1Info, generateTimestamps(150, startTs + 3 * hour, startTs + day + 3 * hour))
    }

    // day 2
    {
        const day2ts = startTs + day;
        const campaign1Info = { // total -30 subs
            id: 1,
            listInfo: list1Info,
            linkIds: [1, 2, 3],
            failedAmount: 6,
            bouncedAmount: 10,
            openedAmount: 105,
            clickedAmount: 75,
            unsubbedAmount: 17,
            complainedAmount: 3,
            // channelId: 1
        }

        allEvents.push({
                logType: LogTypeId.USER,
                args: [ EntityActivityType.CREATE, 2, {
                    timestamp: day2ts,
                }]
            },
            {
                logType: LogTypeId.USER,
                args: [ EntityActivityType.UPDATE, 2, {
                    timestamp: day2ts + hour,
                }]
            },
            {
                logType: LogTypeId.LIST,
                args: [ EntityActivityType.UPDATE, list1Info.id, {
                    timestamp: day2ts + 2 * hour,
                }]
            },
            {
                logType: LogTypeId.SEND_CONFIGURATION,
                args: [ EntityActivityType.UPDATE, 1, {
                    timestamp: day2ts + 4 * hour,
                }]
            },
            {
                logType: LogTypeId.CHANNEL,
                args: [ EntityActivityType.CREATE, 1, {
                    timestamp: day2ts + 5 * hour,
                }]
            },
            {
                logType: LogTypeId.CAMPAIGN,
                args: [ EntityActivityType.UPDATE, campaign1Info.id, {
                    timestamp: day2ts + 5 * hour + 5 * minute,
                    channelId: 1
                }]
            },
            {
                logType: LogTypeId.CHANNEL,
                args: [ ChannelActivityType.ADD_CAMPAIGN, 1, {
                    timestamp: day2ts + 5 * hour + 5 * minute,
                    campaignId: campaign1Info.id
                }]
            },
            {
                logType: LogTypeId.FORM,
                args: [ EntityActivityType.CREATE, 1, {
                    timestamp: day2ts + 7 * hour,
                }]
            },
            {
                logType: LogTypeId.LIST,
                args: [ EntityActivityType.UPDATE, list1Info.id, {
                    timestamp: day2ts + 8 * hour,
                }]
            },
        );

        allEvents = allEvents.concat(
            launchCampaign(campaign1Info, day2ts + 3 * hour, day2ts + 17 * hour)
        );
        randomListSubs(list1Info, generateTimestamps(40, day2ts + 3 * hour, day2ts + day + 3 * hour));
    }

    // day 3
    {
        const day3ts = startTs + 2 * day;
        const campaign2Info = { // 160 subs at the time of launch
            id: 2,
            listInfo: list1Info,
            linkIds: [4],
            failedAmount: 0,
            bouncedAmount: 4,
            openedAmount: 95,
            clickedAmount: 46,
            unsubbedAmount: 16,
            complainedAmount: 5, // -15 subs -> 145 subs
            channelId: 1
        }

        allEvents = allEvents.concat(
            launchCampaign(campaign2Info, day3ts + 3 * hour, day3ts + 17 * hour)
        );
        randomListSubs(list1Info, generateTimestamps(75, day3ts + 3 * hour, day3ts + day + 3 * hour));
    }

    // day 4
    {
        const day4ts = startTs + 3 * day;
        const campaign3Info = {
            id: 3,
            listInfo: list1Info,
            linkIds: [6, 7, 8, 9],
            failedAmount: 0,
            bouncedAmount: 4,
            openedAmount: 60,
            clickedAmount: 30,
            unsubbedAmount: 8,
            complainedAmount: 2,
            channelId: 1
        }

        allEvents = allEvents.concat(
            launchCampaign(campaign3Info, day4ts + 3 * hour, day4ts + 17 * hour)
        );
        randomListSubs(list1Info, generateTimestamps(100, day4ts + 3 * hour, day4ts + day + 3 * hour));
    }

    allEvents = allEvents.concat(listInfoToEvents(list1Info));

    allEvents.sort((e1, e2) => e1.args[e1.args.length - 1].timestamp - e2.args[e2.args.length - 1].timestamp);

    for (const event of allEvents) {
        let ts = event.args[event.args.length - 1].timestamp;
        ts = new Date(ts).toISOString();
        event.args[event.args.length - 1].timestamp = ts;

        if (event.logType === LogTypeId.LIST_TRACKER) {
            await activityLog.logListTrackerActivity(...event.args);
        } else if (event.logType === LogTypeId.CAMPAIGN_TRACKER) {
            await activityLog.logCampaignTrackerActivity(...event.args);
        } else {
            await activityLog.logEntityActivity(null, event.logType, ...event.args);
        }
    }

    console.log('Test data logged.');
}

/**
 * Sets up the main server containing pages for showing embedded visualizations.
 */
function setUpTestEmbedServer() {
    async function renderEmbedData(req, res, embedPath, transformData = null) {
        const embedUrl = '/api/mt-embed/';

        const mvisRes = await mvisApi.get(embedUrl + embedPath, {
            headers: { 'mt-user-id': 1 }
        });
        let {
            token,
            ivisSandboxUrlBase,
            path,
            params
        } = transformData ? await transformData(mvisRes.data) : mvisRes.data;

        res.render('panel', {
            token,
            ivisSandboxUrlBase,
            path,
            params,
            jsonParams: JSON.stringify(params),
        });
    }

    const port = 3000;

    const app = express();
    app.set('port', port);
    app.set('views', path.join(__dirname, 'views'));
    app.set('view engine', 'hbs');

    // const clientName = 'admin';
    // const agent = new https.Agent({
    //     ca: fs.readFileSync('../server/certs/ca-crt.pem'),
    //     key: fs.readFileSync('../server/certs/' + clientName + '-key.pem'),
    //     cert: fs.readFileSync('../server/certs/' + clientName + '-crt.pem')
    // });


    const embedDist = path.join(__dirname, '..', 'ivis-core', 'embedding', 'dist', 'ivis.js');
    app.use('/ivis.js', express.static(embedDist));

    router.getAsync('/favicon.ico', async (req, res) => {
        res.status(404).send('Not found');
    });

    /*
    router.getAsync('/:visualizationId', async (req, res) => {
        const mtUserId = Number.parseInt(req.params.mtUserId);
        const panelId = Number.parseInt(req.params.panelId);
    
        const url = `https://localhost:8445/api/mt-embedded-panel/${mtUserId}/${panelId}`;
        const resp = await axios.get(url, { httpsAgent: agent });
        const panelInfo = resp.data;
    
        res.render('panel', {
            token: panelInfo.token,
            panelId: panelId,
            ivisSandboxUrlBase: panelInfo.ivisSandboxUrlBase
        });
    });
    */

    router.getAsync('/list-subscriptions/:listId', async (req, res) => {
        await renderEmbedData(req, res, `list-subscriptions/${req.params.listId}`);
    });

    router.getAsync('/channel-recent-campaigns/:channelId', async (req, res) => {
        await renderEmbedData(req, res, `channel-recent-campaigns/${req.params.channelId}`);
    });

    router.getAsync('/channel-campaign-contributions/:channelId', async (req, res) => {
        await renderEmbedData(req, res, `channel-campaign-contributions/${req.params.channelId}`);
    });

    router.getAsync('/campaign-overview/:campaignId', async (req, res) => {
        const campaignId = req.params.campaignId;
        await renderEmbedData(req, res, `campaign-overview/${campaignId}`, async data => {
            const linksPie = data.params.pies.find(p => p.label === 'Link Clicks');
            if (!linksPie) return data;

            for (const linkArc of linksPie.segments) {
                linkArc.label = getLinkUrl(linkArc.linkId);
                delete linkArc.linkId;
            }

            return data;
        });
    });

    router.getAsync('/campaign-messages/:campaignId', async (req, res) => {
        const campaignId = req.params.campaignId;
        await renderEmbedData(req, res, `campaign-messages/${campaignId}`, async data => {
            for (const signal of data.params.sensors) {
                if (signal.linkId) {
                    signal.label = `Clicks of ${getLinkUrl(signal.linkId)}`;
                    delete signal.linkId;
                }
            }
            return data;
        });
    });

    router.getAsync('/audit', async (req, res) => {
        await renderEmbedData(req, res, 'audit', async data => {
            for (const set of data.params.signalSets) {
                const type = set.type;
                const entities = [];
                for (let i = 1; i <= amountOfEachEntity; i++) {
                    entities.push({id: i, label: getEntityName(type, i)});
                }
                set.entities = entities;
            }
            return data;
        });
    });

    app.use(router);


    const server = http.createServer(app);

    server.on('listening', () => {
        console.log('Express', `WWW server listening on HTTP port ${port}`);
    });


    server.listen(port, '0.0.0.0');
}

if (process.env.NODE_ENV !== 'production') {
    console.log('This test only functions with NODE_ENV set to \'production\'.');
    process.exit(1);
} else if (process.argv.length === 2) {
    // launch with no arguments
    console.log('Setting up read-only test-embed server');
    setUpMvis()
    .then(setUpTestEmbedServer);
} else if (process.argv.length === 3 && process.argv[2] === 'log') {
    // launch with no arguments
    console.log('Setting up test-embed server with test data logging');
    setUpMvis()
    .then(logTestData)
    .then(setUpTestEmbedServer);
} else {
    console.log('Unknown arguments.');
    console.log(
        'Launch with 0 args for a read-only test-embed, ' + 
        'or launch with a \'log\' argument for a test-embed ' +
        'with test-data logging (will modify database).'
    );
    process.exit(1);
}
