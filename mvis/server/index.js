'use strict';

require('./extensions-common');
const em = require('../ivis-core/server/lib/extension-manager');
const log = require('../ivis-core/server/lib/log');
const path = require('path');

const entityActivity = require('./models/entity-activity');
const campaigns = require('./models/campaigns');
const channels = require('./models/channels');
const lists = require('./models/lists');

const { addBuiltinTasks } = require('./models/builtin-tasks');
const { handleMessage, sendToMailtrain } = require('./lib/process-communication');
const { getAdminContext } = require('../ivis-core/server/lib/context-helpers');

const apiToken = process.env.API_TOKEN;

async function init() {
    process.on('message', async msg => await handleMessage(msg));

    em.set('app.clientDist', path.join(__dirname, '..', 'client', 'dist'));

    em.on('knex.migrate', async () => {
        const knex = require('../ivis-core/server/lib/knex');
        await knex.migrateExtension('mvis', './knex/migrations').latest();
    });

    em.on('app.installRoutes', app => {
        const entityInfo = require('./routes/rest/entity-info');
        app.use('/rest', entityInfo);
    });

    em.on('app.installAPIRoutes', app => {
        const embedApi = require('./routes/api/embed');
        app.use('/api', embedApi);

        const eventsApi = require('./routes/api/events');
        app.use('/api', eventsApi);
    });

    em.on('app.validateGlobalAccess', data => {
        const token = data.req.get('global-access-token') || req.query.global_access_token;
        data.accept = apiToken && (token === apiToken);
    });

    em.on('builtinTasks.add', async builtinTasks => {
        await addBuiltinTasks(builtinTasks);
    });

    em.on('services.start', async () => {
        // this is for setting up any global namespaces, users, signal sets, workspaces and panels
        // also for setting up activity log listener events

        await entityActivity.init();
        await lists.init();
        await campaigns.init();
        await channels.init();

        const dataByTypeId = await sendToMailtrain({
            type: 'synchronize'
        });
        const context = getAdminContext();
        await lists.synchronize(context, dataByTypeId.list);
        await campaigns.synchronize(context, dataByTypeId.campaign);
        await channels.synchronize(context, dataByTypeId.channel);
    });

    if (process.send) {
        em.on('app.ready', async () => {
            process.send({ type: 'mvis-ready' });
        });
    }

    log.heading = '(mvis)';

    require('../ivis-core/server/index');
}

init();

if (process.send) {
    process.send({
        type: 'mvis-started'
    });
}
