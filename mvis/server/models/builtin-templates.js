'use strict';

const path = require('path');
const fs = require('fs-extra-promise');
const em = require('../../ivis-core/server/lib/extension-manager');
const { BuiltinTemplateIds } = require('../../shared/builtin-templates');
const { BUILTIN_TEMPLATE_JSX_FILE_NAME, BUILTIN_TEMPLATE_SCSS_FILE_NAME, BUILTIN_TEMPLATE_PARAMS_FILE_NAME } = require('../../ivis-core/shared/templates');

const mvisBuiltinTemplates = {
    [BuiltinTemplateIds.LINECHART]: {
        name: 'Campaign Messages'
    }
};

async function ensureCodeAndParamsForBuiltinTemplate(builtinTemplate, builtinTemplateId) {
    // TODO: also add possible scss and i guess some optional traits
    const templateDir = path.join(__dirname, '..', 'builtin-files', 'tempaltes', builtinTemplateId);

    const jsxPath = path.join(templateDir, BUILTIN_TEMPLATE_JSX_FILE_NAME);
    const hasJsx = await fs.existsAsync(jsxPath);
    if (hasJsx) {
        const jsx = await fs.readFileAsync(jsxPath, 'utf-8');
        builtinTemplate.jsx = jsx;
    } else {
        builtinTemplate.jsx = '';
    }

    const scssPath = path.join(templateDir, BUILTIN_TEMPLATE_SCSS_FILE_NAME);
    const hasScss = await fs.existsAsync(scssPath);
    if (hasScss) {
        const scss = await fs.readFileAsync(scssPath, 'utf-8');
        builtinTemplate.stylesScss = scss;
    } else {
        builtinTemplate.scss = '';
    }
    
    const paramsPath = path.join(templateDir, BUILTIN_TEMPLATE_PARAMS_FILE_NAME);
    const hasParams = await fs.existsAsync(paramsPath);
    if (hasParams) {
        const params = JSON.parse(await fs.readFileAsync(paramsPath, 'utf-8'));
        builtinTemplate.params = params;
    } else {
        builtinTemplate.params = [];
    }
}

async function load() {
    for (const builtinTemplateId in mvisBuiltinTemplates) {
        const template = mvisBuiltinTemplates[builtinTemplateId];
        await ensureCodeAndParamsForBuiltinTemplate(template, builtinTemplateId);
    }

    em.on('builtinTemplates.add', builtinTemplates => {
        builtinTemplates[BuiltinTemplateIds.LINECHART] = campaignMessagesTemplate;

        for (const builtinTemplateId in mvisBuiltinTemplates) {
            const template = mvisBuiltinTemplates[builtinTemplateId];
            builtinTemplates[builtinTemplateId] = template;
        }
    });
}


module.exports.load = load;
