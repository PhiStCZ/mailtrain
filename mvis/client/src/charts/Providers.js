'use strict';

import { Component } from "react";
import {
    withAsyncErrorHandler,
    withErrorHandling
} from "../../../ivis-core/client/src/lib/error-handling";
import PropTypes
    from "prop-types";

import { DataAccessSession } from "../../../ivis-core/client/src/ivis/DataAccess";
import { withComponentMixins } from "../../../ivis-core/client/src/lib/decorator-helpers";

export class DocsDataProvider extends Component {
    constructor(props) {
        super(props);

        this.dataAccessSession = new DataAccessSession();
        this.state = {
            signalSetsData: null
        }
    }

    static propTypes = {
        sigSetCid: PropTypes.string.isRequired,
        sigCids: PropTypes.arrayOf(PropTypes.string.isRequired).isRequired,
        filter: PropTypes.object,
        sort: PropTypes.array,
        limit: PropTypes.number,

        renderFun: PropTypes.func.isRequired,
        loadingRenderFun: PropTypes.func
    }

    componentDidMount() {
        this.fetchData();
    }

    @withAsyncErrorHandler
    async fetchData() {
        try {
            const signalSetsData = await this.dataAccessSession.getLatestDocs(
                this.props.sigSetCid,
                this.props.sigCids,
                this.props.filter,
                this.props.sort,
                this.props.limit
            );

            if (signalSetsData) {
                this.setState({
                    signalSetsData
                });
            }
        } catch (err) {
            throw err;
        }
    }

    render() {
        if (this.state.signalSetsData) {
            return this.props.renderFun(this.state.signalSetsData)
        } else if (this.props.loadingRenderFun) {
            return this.props.loadingRenderFun();
        } else {
            return null;
        }
    }
}
