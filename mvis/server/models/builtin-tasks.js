'use strict';

const path = require('path');
const { BuiltinTaskNames } = require('../../shared/builtin-tasks');
const { TaskType, TaskSource } = require('../../ivis-core/shared/tasks');
const { ensureCodeAndParamsForBuiltinTask } = require('../../ivis-core/server/models/builtin-tasks');
const em = require('../../ivis-core/server/lib/extension-manager');


const mvisBuiltinTasks = [
    {
        name: BuiltinTaskNames.CAMPAIGN,
        description: 'Task used to process campaign-related statistics (message activity)',
        type: TaskType.PYTHON,
        source: TaskSource.BUILTIN,
        settings: {
            // builtin_reinitOnUpdate: true ?
        },
    },
    {
        name: BuiltinTaskNames.LIST,
        description: 'Task used to process list-related statistics (subscription counts)',
        type: TaskType.PYTHON,
        source: TaskSource.BUILTIN,
        settings: {},
    },
];


async function addBuiltinTasks(builtinTasks) {
    for (const builtinTask of mvisBuiltinTasks) {
        const taskDir = path.join(__dirname, '..', 'builtin-files', 'tasks', builtinTask.name);
        await ensureCodeAndParamsForBuiltinTask(builtinTask, taskDir);
    }

    builtinTasks.push(...mvisBuiltinTasks);
}

module.exports.addBuiltinTasks = addBuiltinTasks;
