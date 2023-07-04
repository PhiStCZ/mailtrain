const crypto = require('crypto');
const config = require('./config');
const axios = require('axios').default;

const token = process.env.MVIS_API_TOKEN || crypto.randomBytes(20).toString('hex').toLowerCase();

const apiUrlBase = config.get('mvis.apiUrlBase');

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
