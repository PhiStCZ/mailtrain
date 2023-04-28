'use strict';

const em = require('../ivis-core/server/lib/extension-manager');
const path = require('path');
const { BuiltinTemplateIds } = require('../shared/builtin-templates');

em.set('config.extraDirs', [ path.join(__dirname, 'config') ]);
em.set('builder.exec', path.join(__dirname, 'builder.js'));
em.set('task-handler.exec', path.join(__dirname, 'task-handler.js'));
em.set('indexer.elasticsearch.exec', path.join(__dirname, 'indexer-elasticsearch.js'));
em.set('app.title', 'Mailtrain IVIS');

em.set('models.namespaces.extraKeys', ['mt_campaign']);
em.set('models.signalSets.extraKeys', ['mt_dataset_type']);

em.on('builtinTemplates.add', builtinTemplates => {
    builtinTemplates[BuiltinTemplateIds.EVENT_LINECHART] = {
        name: 'Event Line Chart',
        params: [
            {
                "id": "sensors",
                "label": "Sensors",
                "type": "fieldset",
                "cardinality": "1..n",
                "children": [
                    {
                        "id": "label",
                        "label": "Label",
                        "type": "string"
                    },
                    {
                        "id": "color",
                        "label": "Color",
                        "type": "color"
                    },
                    {
                        "id": "sigSet",
                        "label": "Signal Set",
                        "type": "signalSet"
                    },
                    {
                        "id": "signal",
                        "label": "Signal",
                        "type": "signal",
                        "signalSetRef": "sigSet"
                    },
                    {
                        "id": "tsSigCid",
                        "label": "Time Signal",
                        "type": "signal",
                        "signalSetRef": "sigSet"
                    },
                    {
                        "id": "enabled",
                        "label": "Enabled",
                        "type": "boolean",
                        "default": true
                    }
                ]
            },
            {
                "id": "activitySet",
                "label": "Activity Signal Set CID",
                "type": "signalSet"
            },
            {
                "id": "activityTs",
                "label": "Activity Timestamp",
                "type": "signal",
                "signalSetRef": "activitySet"
            },
            {
                "id": "activityType",
                "label": "Activity Type",
                "type": "signal",
                "signalSetRef": "activitySet"
            },
            {
                "id": "activityIssuedBy",
                "label": "Time Issued-by",
                "type": "signal",
                "signalSetRef": "activitySet"
            }
        ]
    };

    builtinTemplates[BuiltinTemplateIds.GROUP_SEG_BARCHART] = {
        name: 'Grouped Segmented Bar Chart',
        params: [
            {
                "id": "groupsLimit",
                "label": "Maximum amount of bar groups",
                "type": "number"
            },
            {
                "id": "sigSet",
                "label": "Signal Set CID",
                "type": "signalSet"
            },
            {
                "id": "tsSig",
                "label": "Timestamp signal",
                "type": "signal",
                "signalSetRef": "sigSet"
            },
            {
                "id": "bars",
                "label": "Bars",
                "type": "fieldset",
                "cardinality": "1..n",
                "children": [
                    {
                        "id": "label",
                        "label": "Bar Label",
                        "type": "string"
                    },
                    {
                        "id": "tooltipAccumulateValues",
                        "label": "Whether tooltip should show accumulated values",
                        "type": "boolean"
                    },
                    {
                        "id": "segments",
                        "label": "Bar Segments",
                        "type": "fieldset",
                        "cardinality": "1..n",
                        "children": [
                            {
                                "id": "label",
                                "label": "Segment Label",
                                "type": "string"
                            },
                            {
                                "id": "color",
                                "label": "Color",
                                "type": "color"
                            },
                            {
                                "id": "signal",
                                "label": "Signal",
                                "type": "signal",
                                "signalSetRef": "sigSet"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "extraSignals",
                "label": "Extra Signals",
                "type": "fieldset",
                "cardinality": "n",
                "children": [
                    {
                        "id": "sig",
                        "label": "Signal",
                        "type": "signal",
                        "signalSetRef": "sigSet"
                    }
                ]
            }
        ]
    };

    builtinTemplates[BuiltinTemplateIds.N_PIECHARTS] = {
        name: 'N Pie Charts (next to each other)',
        params: [
            {
                "id": "sigSet",
                "label": "Signal Set CID",
                "type": "signalSet"
            },
            {
                "id": "tsSig",
                "label": "Timestamp signal",
                "type": "signal",
                "signalSetRef": "sigSet"
            },
            {
                "id": "pies",
                "label": "Pies",
                "type": "fieldset",
                "cardinality": "1..n",
                "children": [
                    {
                        "id": "label",
                        "label": "Pie Label",
                        "type": "string"
                    },
                    {
                        "id": "segments",
                        "label": "Bar Segments",
                        "type": "fieldset",
                        "cardinality": "1..n",
                        "children": [
                            {
                                "id": "label",
                                "label": "Segment Label",
                                "type": "string"
                            },
                            {
                                "id": "color",
                                "label": "Color",
                                "type": "color"
                            },
                            {
                                "id": "signal",
                                "label": "Signal",
                                "type": "signal",
                                "signalSetRef": "sigSet"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "extraSignals",
                "label": "Extra Signals",
                "type": "fieldset",
                "cardinality": "n",
                "children": [
                    {
                        "id": "sig",
                        "label": "Signal",
                        "type": "signal",
                        "signalSetRef": "sigSet"
                    }
                ]
            }
        ]
    };
});
