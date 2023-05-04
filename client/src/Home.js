'use strict';

import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {withTranslation} from './lib/i18n';
import {requiresAuthenticatedUser} from './lib/page';
import {withComponentMixins} from "./lib/decorator-helpers";
import mailtrainConfig from 'mailtrainConfig';
import {fetchTokenAndEmbedBuiltinTemplate} from '../lib/embed';
import embedStyles from '../lib/embed.scss';

@withComponentMixins([
    withTranslation,
    requiresAuthenticatedUser
])
export default class List extends Component {
    constructor(props) {
        super(props);


        if (mailtrainConfig.globalPermissions.displayManageUsers) {
            this.auditEmbedId = _.uniqueId('auditEmbed');
        }
    }

    static propTypes = {
    }

    componentDidMount() {
        if (mailtrainConfig.globalPermissions.displayManageUsers) {
            fetchTokenAndEmbedBuiltinTemplate(this.auditEmbedId, 'audit');
        }
    }

    render() {
        const t = this.props.t;

        return (
            <div>
                <h2>{t('mailtrain2')}</h2>
                <div>{t('build') + ' 2021-05-25-0915'}</div>
                <p>{mailtrainConfig.shoutout}</p>

                {mailtrainConfig.globalPermissions.displayManageUsers &&
                    <div id={this.auditEmbedId} className={embedStyles.embedWindow}></div>}
            </div>
        );
    }
}