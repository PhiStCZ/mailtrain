'use strict';

const fork = require('./fork').fork;
const log = require('./log');
const path = require('path');
const bluebird = require('bluebird');
const crypto = require('crypto');

const apiToken = process.env.MVIS_API_TOKEN || crypto.randomBytes(20).toString('hex').toLowerCase();

let mvisProcess;

function spawn(callback) {
    log.verbose('Mvis', 'Spawning mvis process');

    const wDir = path.join(__dirname, '..', '..', 'mvis', 'server');
    
    mvisProcess = fork(path.join(wDir, 'index.js'), [], {
        cwd: wDir,
        env: {
            NODE_ENV: process.env.NODE_ENV,
            API_TOKEN: apiToken
        }
    });

    mvisProcess.on('message', msg => {
        if (msg && msg.type === 'mvis-started') {
            log.info('Mvis', 'Mvis process started');
            return callback();
        }
    });
};

module.exports.apiToken = apiToken;
module.exports.spawn = bluebird.promisify(spawn);
