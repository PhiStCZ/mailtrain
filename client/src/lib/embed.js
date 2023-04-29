'use strict';

import axios from './axios';
import { embedBuiltinTemplate } from '../../../mvis/ivis-core/embedding/src/panel';

const prefix = 'rest/embed/';

export function fetchTokenAndEmbedBuiltinTemplate(domElementId, tokenPath) {
    const {
        token,
        ivisSandboxUrlBase,
        path,
        params,
    } = axios.get(prefix + tokenPath);

    embedBuiltinTemplate(domElementId, ivisSandboxUrlBase, token, path, params);
}
