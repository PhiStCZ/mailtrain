'use strict';

const knex = require('../lib/knex');
const campaigns = require('./campaigns');
const lists = require('./lists');
const subscriptions = require('./subscriptions');
const contextHelpers = require('../lib/context-helpers');
const geoip = require('geoip-ultralight');
const uaParser = require('device');
const he = require('he');
const { getPublicUrl } = require('../lib/urls');
const tools = require('../lib/tools');
const shortid = require('../lib/shortid');
const {enforce} = require('../lib/helpers');
const { CampaignTrackerActivityType } = require('../../shared/activity-log');
const activityLog = require('../lib/activity-log');
const config = require('../lib/config');
const logRepeated = config.get('mvis.logRepeatedEvents');

const LinkId = {
    OPEN: -1,
    GENERAL_CLICK: 0
};

async function resolve(linkCid) {
    return await knex('links').where('cid', linkCid).select(['id', 'url']).first();
}

async function countLink(remoteIp, userAgent, campaignCid, listCid, subscriptionCid, linkId) {
    await knex.transaction(async tx => {
        const list = await lists.getByCidTx(tx, contextHelpers.getAdminContext(), listCid);
        const campaign = await campaigns.getTrackingSettingsByCidTx(tx, campaignCid);
        const subscription = await subscriptions.getByCidTx(tx, contextHelpers.getAdminContext(), list.id, subscriptionCid);

        const country = geoip.lookupCountry(remoteIp) || null;
        const device = uaParser(userAgent, {
            unknownUserAgentDeviceType: 'desktop',
            emptyUserAgentDeviceType: 'desktop'
        });
        const now = new Date();

        const _countLink = async (clickLinkId, incrementOnDup) => {
            try {
                const campaignLinksQry = knex('campaign_links')
                    .insert({
                        campaign: campaign.id,
                        list: list.id,
                        subscription: subscription.id,
                        link: clickLinkId,
                        ip: remoteIp,
                        device_type: device.type,
                        country
                    }).toSQL();

                const campaignLinksQryResult = await tx.raw(campaignLinksQry.sql + (incrementOnDup ? ' ON DUPLICATE KEY UPDATE `count`=`count`+1' : ''), campaignLinksQry.bindings);

                if (campaignLinksQryResult[0].affectedRows > 1) { // When using DUPLICATE KEY UPDATE, this means that the entry was already there
                    return false;
                }

                return true;

            } catch (err) {
                if (err.code === 'ER_DUP_ENTRY') {
                    return false;
                }

                throw err;
            }
        };


        // Update opened and click timestamps
        const latestUpdates = {};

        if (!campaign.click_tracking_disabled && linkId > LinkId.GENERAL_CLICK) {
            latestUpdates.latest_click = now;
        }

        if (!campaign.open_tracking_disabled) {
            latestUpdates.latest_open = now;
        }

        if (latestUpdates.latest_click || latestUpdates.latest_open) {
            await tx(subscriptions.getSubscriptionTableName(list.id)).update(latestUpdates).where('id', subscription.id);
        }

        // Update clicks
        if (linkId > LinkId.GENERAL_CLICK && !campaign.click_tracking_disabled) {
            await tx('links').increment('hits').where('id', linkId);
            const firstTimeClicked = await _countLink(linkId, true);
            if (firstTimeClicked) {
                await tx('links').increment('visits').where('id', linkId);

                if (await _countLink(LinkId.GENERAL_CLICK, false)) {
                    await tx('campaigns').increment('clicks').where('id', campaign.id);

                    // general click probably doesn't need to be repeatedly logged
                    await activityLog.logCampaignTrackerActivity(CampaignTrackerActivityType.CLICKED_ANY, campaign.id, list.id, subscription.id, {
                        ip: remoteIp,
                        country,
                        deviceType: device.type
                    });
                }
            }
            if (firstTimeClicked || logRepeated) {
                await activityLog.logCampaignTrackerActivity(CampaignTrackerActivityType.CLICKED, campaign.id, list.id, subscription.id, {
                    linkId,
                    ip: remoteIp,
                    country,
                    deviceType: device.type
                });
            }
        }


        // Update opens. We count a click as an open too.
        if (!campaign.open_tracking_disabled) {
            const firstTimeOpened = await _countLink(LinkId.OPEN, true);
            if (firstTimeOpened) {
                await tx('campaigns').increment('opened').where('id', campaign.id);
            }
            if (firstTimeOpened || logRepeated) {
                await activityLog.logCampaignTrackerActivity(CampaignTrackerActivityType.OPENED, campaign.id, list.id, subscription.id, {
                    ip: remoteIp,
                    country,
                    deviceType: device.type
                });
            }
        }
    });
}

async function addOrGet(campaignId, url) {
    const link = await knex('links').select(['id', 'cid']).where({
        campaign: campaignId,
        url
    }).first();

    if (!link) {
        let cid = shortid.generate();

        try {
            const ids = await knex('links').insert({
                campaign: campaignId,
                cid,
                url
            });
            const linkId = ids[0];

            await activityLog.logEntityActivity(LogTypeId.CAMPAIGN, CampaignActivityType.ADD_LINK, campaignId, { linkId, url });
            await activityLog.logCampaignTrackerActivity(CampaignTrackerActivityType.ADD_LINK, campaignId, null, null, { linkId });

            return {
                linkId,
                cid
            };
        } catch (err) {
            if (err.code !== 'ER_DUP_ENTRY') {
                throw err;
            }

            const link = await knex('links').select(['id', 'cid']).where({
                campaign: campaignId,
                url
            }).first();

            enforce(link);
            return link;
        }

    } else {
        return link;
    }
}

async function updateLinks(source, tagLanguage, mergeTags, campaign, campaignListsById, list, subscription) {
    if ((campaign.open_tracking_disabled && campaign.click_tracking_disabled) || !source || !source.trim()) {
        // tracking is disabled, do not modify the message
        return source;
    }

    // insert tracking image
    if (!campaign.open_tracking_disabled) {
        let inserted = false;
        const imgUrl = getPublicUrl(`/links/${campaign.cid}/${list.cid}/${subscription.cid}`);
        const img = '<img src="' + imgUrl + '" width="1" height="1" alt="mt">';
        source = source.replace(/<\/body\b/i, match => {
            inserted = true;
            return img + match;
        });
        if (!inserted) {
            source = source + img;
        }
    }

    if (!campaign.click_tracking_disabled) {
        const re = /(<a[^>]* href\s*=\s*["']\s*)(http[^"'>\s]+)/gi;

        const urlsToBeReplaced = new Set();

        source.replace(re, (match, prefix, encodedUrl) => {
            const url = he.decode(encodedUrl, {isAttributeValue: true});
            urlsToBeReplaced.add(url);
        });

        const urls = new Map(); // url -> {id, cid} (as returned by add)
        for (const url of urlsToBeReplaced) {
            // url might include variables, need to rewrite those just as we do with message content
            const expanedUrl = encodeURI(tools.formatCampaignTemplate(url, tagLanguage, mergeTags, false, campaign, campaignListsById, list, subscription));
            const link = await addOrGet(campaign.id, expanedUrl);
            urls.set(url, link);
        }

        source = source.replace(re, (match, prefix, encodedUrl) => {
            const url = he.decode(encodedUrl, {isAttributeValue: true});
            const link = urls.get(url);
            return prefix + (link ? getPublicUrl(`/links/${campaign.cid}/${list.cid}/${subscription.cid}/${link.cid}`) : url);
        });
    }

    return source;
}

module.exports.LinkId = LinkId;
module.exports.resolve = resolve;
module.exports.countLink = countLink;
module.exports.addOrGet = addOrGet;
module.exports.updateLinks = updateLinks;
