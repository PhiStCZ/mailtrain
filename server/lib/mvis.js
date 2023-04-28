'use strict';

const fork = require('./fork').fork;
const log = require('./log');
const path = require('path');
const bluebird = require('bluebird');
const crypto = require('crypto');

const apiToken = process.env.MVIS_API_TOKEN || crypto.randomBytes(20).toString('hex').toLowerCase();

let mvisProcess;
let mvisReadyState = null;

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

    mvisReadyState = new Promise((resolve, reject) => {
        mvisProcess.on('message', msg => {
            setTimeout(() => reject('Mvis start message not received'), 300000); // reject after 5 minutes
            if (msg && msg.type === 'mvis-ready') {
                resolve();
            }
        });
    });

};

/** Returns from the function when Mvis is ready. */
async function mvisReady() {
    if (!mvisReadyState) {
        throw new Error('Mvis wasn\'t launched yet');
    }
    await mvisReadyState;
}

module.exports.apiToken = apiToken;
module.exports.spawn = bluebird.promisify(spawn);
module.exports.mvisReady = mvisReady;
