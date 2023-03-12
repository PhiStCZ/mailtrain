'use strict';

const {TaskType, PYTHON_BUILTIN_CODE_FILE_NAME, PYTHON_BUILTIN_PARAMS_FILE_NAME} = require('../../ivis-core/shared/tasks');
const {ensureParamsAndCodeForBuiltinTask} = require('../../ivis-core/server/models/builtin-tasks');
const em = require('../../ivis-core/server/lib/extension-manager');

const campaignMessagesTask = {
    name: 'Campaign Messages',
    description: 'Task used to aggregate and accumulate campaign message statistics',
    type: TaskType.PYTHON,
    source: TaskSource.BUILTIN,
    settings: {
        params: [{
            "id": "campaignTracker",
            "type": "signalSet",
            "label": "Campaign Tracker",
            "help": "Campaign tracker to process",
            "includeSignals": true
        }],
    },
};

const mvisBuiltinTasks = [
    // TODO: add other builtin tasks
    campaignMessagesTask,
];

async function load() {
    for (const builtinTask of mvisBuiltinTasks) {
        const codeFile = path.join(__dirname, '..', 'builtin-files', 'tasks', builtinTask.name, PYTHON_BUILTIN_CODE_FILE_NAME);
        const paramsFile = path.join(__dirname, '..', 'builtin-files', 'tasks', builtinTask.name, PYTHON_BUILTIN_PARAMS_FILE_NAME);
        ensureParamsAndCodeForBuiltinTask(builtinTask, codeFile, paramsFile);
    }

    em.on('builtinTasks.add', builtinTasks => {
        for (const builtinTask of mvisBuiltinTasks) {
            builtinTasks.push(builtinTask);
        }
    });
}

module.exports.load = load;
