'use strict';

const { throwPermissionDenied } = require("../../ivis-core/server/models/shares");

const requestMap = new Map();
let requestId = 1;
function getRequestId() {
    requestId = (requestId & 0xFFFFFFF) + 1; // limit rounding errors
    return requestId;
}

async function sendToMailtrain(message) {
    try {
        return await new Promise((resolve, reject) => {
            const requestId = getRequestId();
            message = {
                ...message,
                requestId
            }
            requestMap.set(requestId, {
                resolve: msg => resolve(msg),
                reject: () => reject()
            });
            process.send(message);
        });
    } catch (e) {
        throwPermissionDenied();
    }
}

function handleResponse(msg) {
    const promise = requestMap.get(msg.requestId);
    if (!promise) return;

    if (msg.permissionDenied) {
        promise.reject();
    } else {
        promise.resolve(msg.data);
    }

    requestMap.delete(msg.requestId);
}

process.on('message', msg => {
    if (!msg) return;

    switch (msg.type) {
        case 'response':
            handleResponse(msg);
            break;
        default: return;
    }
});

module.exports = {
    sendToMailtrain
};
