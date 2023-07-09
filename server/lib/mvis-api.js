const crypto = require('crypto');
const axios = require('axios').default;

const apiUrlBase = require('./config').get('mvis.apiUrlBase');
const token = process.env.MVIS_API_TOKEN || crypto.randomBytes(20).toString('hex').toLowerCase();

async function get(path, config = {}) {
    config.headers = config.headers || {};
    config.headers['global-access-token'] = token;
    return await axios.get(apiUrlBase + path, config);
}

async function post(path, body, config = {}) {
    config.headers = config.headers || {};
    config.headers['global-access-token'] = token;
    return await axios.post(apiUrlBase + path, body, config);
}

module.exports  = {
    token,
    get,
    post,
};
