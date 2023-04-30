'use strict';

const users = require('../../ivis-core/server/models/users');
const interoperableErrors = require('../../ivis-core/shared/interoperable-errors');
const { MAILTRAIN_USERNAME } = require('../../shared/users');
const crypto = require('crypto');


async function ensureMailtrainUser(context) {
    let id;

    try {
        const user = await users.getByUsername(context, MAILTRAIN_USERNAME);
        id = user.id;
    } catch (e) {
        if (!e instanceof interoperableErrors.PermissionDeniedError) {
            throw e;
        }

        id = await users.create(context, {
            username: MAILTRAIN_USERNAME,
            name: 'Mailtrain User',
            email: 'mailtrain@example.org',
            password: crypto.randomBytes(20).toString('hex').toLowerCase(),
            role: 'mailtrainUser',
            namespace: 1,
        });
    }

    return id;
}

module.exports = {
    ensureMailtrainUser
}
