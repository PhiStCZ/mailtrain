'use strict';

const path = require('path');
const em = require('../../ivis-core/server/lib/extension-manager');
const { BuiltinTemplateIds } = require('../../shared/builtin-templates');
const { ensureCodeAndParamsForBuiltinTemplate } = require('../../ivis-core/server/models/builtin-templates');

const mvisBuiltinTemplates = {
    [BuiltinTemplateIds.LINECHART]: {
        name: 'Linechart'
    }
};

async function load() {
    for (const builtinTemplateId in mvisBuiltinTemplates) {
        const template = mvisBuiltinTemplates[builtinTemplateId];
        const templateDir = path.join(__dirname, '..', 'builtin-files', 'templates', builtinTemplateId);
        await ensureCodeAndParamsForBuiltinTemplate(template, templateDir);
    }

    em.on('builtinTemplates.add', builtinTemplates => {
        for (const builtinTemplateId in mvisBuiltinTemplates) {
            const template = mvisBuiltinTemplates[builtinTemplateId];
            builtinTemplates[builtinTemplateId] = template;
        }
    });
}


module.exports.load = load;
