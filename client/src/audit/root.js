'use strict';

import React, { Component } from 'react';
import { fetchTokenAndEmbedBuiltinTemplate } from '../lib/embed';
import embedStyles from '../lib/embed.scss';
import { Title } from '../lib/page';

class Audit extends Component {

    constructor(props) {
        super(props);

        this.auditEmbedId = _.uniqueId('auditEmbed');
    }

    componentDidMount() {
        this.embedCtrl = fetchTokenAndEmbedBuiltinTemplate(this.auditEmbedId, 'audit');
    }

    componentWillUnmount() {
        this.embedCtrl.stop();
    }

    render() {
        return (
            <div>
                <Title>{'Entity Activity Audit'}</Title>
                <div id={this.auditEmbedId} className={embedStyles.embedWindow}></div>
            </div>
        );
    }
}

function getMenus(t) {
    return {
        'audit': {
            title: 'Entity Activity',
            link: '/audit',
            panelComponent: Audit,
        }
    };
}

export default {
    getMenus
}
