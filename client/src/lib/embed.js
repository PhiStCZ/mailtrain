'use strict';

import axios from './axios';
import { embedBuiltinTemplate } from '../../../mvis/ivis-core/embedding/src/panel';

const prefix = '/rest/embed/';

export function fetchTokenAndEmbedBuiltinTemplate(domElementId, tokenPath) {
    const embedPromise = axios.get(prefix + tokenPath)
    .then(res => {
        const {
            token,
            ivisSandboxUrlBase,
            path,
            params,
        } = res.data;
    
        return embedBuiltinTemplate(domElementId, ivisSandboxUrlBase, token, path, params);
    });

    return {
        stop: () => embedPromise.then(ctl => ctl.stop())
    }
}
