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

    em.on('builtinTemplates.add', async builtinTemplates => {
        await addBuiltinTemplates(builtinTemplates);
    });

    em.on('services.start', async () => {
        // this is for setting up any global namespaces, users, signal sets, workspaces and panels
        // also for setting up activity log listener events

        await entityActivity.init();
        await lists.init();
        await campaigns.init();
        await channels.init();
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
