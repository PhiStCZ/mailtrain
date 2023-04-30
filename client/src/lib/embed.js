'use strict';

import axios from './axios';
import { embedBuiltinTemplate } from '../../../mvis/ivis-core/embedding/src/panel';

const prefix = '/rest/embed/';

export async function fetchTokenAndEmbedBuiltinTemplate(domElementId, tokenPath) {
    const res = await axios.get(prefix + tokenPath);
    const {
        token,
        ivisSandboxUrlBase,
        path,
        params,
    } = res.data;

    embedBuiltinTemplate(domElementId, ivisSandboxUrlBase, token, path, params);
}
