'use strict';

const fork = require('./fork').fork;
const log = require('./log');
const path = require('path');
const bluebird = require('bluebird');

let mvisProcess;

function spawn(callback) {
    log.verbose('Mvis', 'Spawning mvis process');

    const wDir = path.join(__dirname, '..', '..', 'mvis', 'server');
    
    mvisProcess = fork(path.join(wDir, 'mvis-service.js'), [], {
        cwd: wDir,
        env: {NODE_ENV: 'development'}//{NODE_ENV: process.env.NODE_ENV}
    });

    // throw new Error('Not implemented');

    mvisProcess.on('message', msg => {
        if (msg && msg.type === 'mvis-started') {
            log.info('Mvis', 'Mvis process started');
            return callback();
        }
    })
};

module.exports.spawn = bluebird.promisify(spawn);
