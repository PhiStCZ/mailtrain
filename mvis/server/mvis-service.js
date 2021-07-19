'use strict';

process.send({
    type: 'mvis-started'
});

require('./index.js');
