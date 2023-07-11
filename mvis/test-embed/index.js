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

// FUNCTIONS:

// spawn mvis
// > setup mvis listeners - entity info

// log test data (TODO)
// > generate the data
// > use activityLog to send them to MVIS

// start own server
// > set up test embeds

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

        mvisProcess = fork(path.join(wDir, 'index.js'), [], {
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
 * Sets up the main server containing pages for showing embedded visualizations.
 */
function setUpTestEmbedServer() {
    async function renderEmbedData(req, res, embedPath, transformData = null) {
        const embedUrl = '/api/mt-embed/';

        const mvisRes = await mvisApi.get(embedUrl + embedPath, {
            headers: { 'mt-user-id': 1 }
        });
        let data = transformData ? await transformData(mvisRes.data) : mvisRes.data;

        res.render('panel', {
            ...data, // = token, ivisSandboxUrlBase, path, params
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

    router.getAsync('/list-subscriptions/:listId', passport.loggedIn, async (req, res) => {
        return await renderEmbedData(req, res, `list-subscriptions/${req.params.listId}`);
    });
    
    router.getAsync('/channel-recent-campaigns/:channelId', passport.loggedIn, async (req, res) => {
        return await renderEmbedData(req, res, `channel-recent-campaigns/${req.params.channelId}`);
    });
    
    router.getAsync('/channel-campaign-contributions/:channelId', passport.loggedIn, async (req, res) => {
        return await renderEmbedData(req, res, `channel-campaign-contributions/${req.params.channelId}`);
    });
    
    router.getAsync('/campaign-overview/:campaignId', passport.loggedIn, async (req, res) => {
        const campaignId = req.params.campaignId;
        return await renderEmbedData(req, res, `campaign-overview/${campaignId}`, async data => {
            const linksPie = data.params.pies.find(p => p.label === 'Link Clicks');
            if (!linksPie) return data;

            for (const linkArc of linksPie.segments) {
                linkArc.label = getLinkUrl(linkArc.linkId);
                delete linkArc.linkId;
            }

            return data;
        });
    });
    
    router.getAsync('/embed/campaign-messages/:campaignId', passport.loggedIn, async (req, res) => {
        const campaignId = castToInteger(req.params.campaignId);
        await shares.enforceEntityPermission(req.context, 'campaign', campaignId, 'view');
        return await renderEmbedData(req, res, `campaign-messages/${campaignId}`, async data => {
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
                for (const i = 1; i <= amountOfEachEntity; i++) {
                    entities.push({id: i, label: getEntityName(type, i)});
                }
        
                set.entities = entities.map(e => ({id: e.id, label: e[labelName]}));
            }
        });
    });

    app.use(router);


    const server = http.createServer(app);

    server.on('listening', () => {
        console.log('Express', `WWW server listening on HTTP port ${port}`);
    });


    server.listen(port, '0.0.0.0');
}

setUpMvis()
.then(setUpTestEmbedServer);
