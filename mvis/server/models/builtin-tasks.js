'use strict';

const path = require('path');
const { BuiltinTaskNames } = require('../../shared/builtin-tasks');
const { TaskType, TaskSource } = require('../../ivis-core/shared/tasks');
const { ensureCodeAndParamsForBuiltinTask } = require('../../ivis-core/server/models/builtin-tasks');
const em = require('../../ivis-core/server/lib/extension-manager');

const campaignMessagesTask = {
    name: BuiltinTaskNames.CAMPAIGN_MESSAGES,
    description: 'Task used to aggregate and accumulate campaign message statistics',
    type: TaskType.PYTHON,
    source: TaskSource.BUILTIN,
    settings: {},
};

const mvisBuiltinTasks = [
    // TODO: add other builtin tasks
    campaignMessagesTask,
];

async function load() {
    for (const builtinTask of mvisBuiltinTasks) {
        const taskDir = path.join(__dirname, '..', 'builtin-files', 'tasks', builtinTask.name);
        await ensureCodeAndParamsForBuiltinTask(builtinTask, taskDir);
    }

    em.on('builtinTasks.add', builtinTasks => {
        for (const builtinTask of mvisBuiltinTasks) {
            builtinTasks.push(builtinTask);
        }
    });
}

module.exports.load = load;
