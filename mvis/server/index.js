'use strict';

require('./extensions-common');
const em = require('../ivis-core/server/lib/extension-manager');
const log = require('../ivis-core/server/lib/log');
const path = require('path');

const entityActivity = require('./models/entity-activity');
const campaignTracker = require('./models/campaign-tracker');
const listTracker = require('./models/list-tracker');

const { addBuiltinTasks } = require('./models/builtin-tasks');
const { addBuiltinTemplates } = require('./models/builtin-templates');

const apiToken = process.env.API_TOKEN;

async function init() {
    em.set('app.clientDist', path.join(__dirname, '..', 'client', 'dist'));

    em.on('knex.migrate', async () => {
        const knex = require('../ivis-core/server/lib/knex');
        await knex.migrateExtension('mvis', './knex/migrations').latest();
    });

    em.on('app.installAPIRoutes', app => {
        const embedApi = require('./routes/api/embed');
        app.use('/api', embedApi);

        const eventsApi = require('./routes/api/events');
        app.use('/api', eventsApi);
    });

    em.on('app.validateGlobalAccess', data => {
        data.accept = apiToken && (data.token === apiToken);
    });

    em.on('builtinTasks.add', async builtinTasks => {
        await addBuiltinTasks(builtinTasks);
    });

    em.on('builtinTemplates.add', async builtinTasks => {
        await addBuiltinTemplates(builtinTasks);
    });

    em.on('services.start', async () => {
        // this is for setting up any global namespaces, users, signal sets, workspaces and panels

        await entityActivity.init();
        await campaignTracker.init();
        await listTracker.init();
    });

    log.heading = '(mvis)';

    require('../ivis-core/server/index');
}

init();

if (process.send) {
    process.send({
        type: 'mvis-started'
    });
}
