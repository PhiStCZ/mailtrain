'use strict';

require('./index.js');

process.send({
    type: 'mvis-started'
});
