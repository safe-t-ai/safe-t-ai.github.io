/**
 * Suppressed Demand Analysis
 */

import api from './services/api.js';
import { DurhamMap } from './components/common/DurhamMap.js';
import { initChart, COLORS } from './services/chartConfig.js';
import { renderMetrics, renderInterpretation, initViewToggle } from './services/renderUtils.js';

export class SuppressedDemandAudit {
    constructor() {
        this.data = {};
        this.charts = {};
        this.map = null;
        this.currentView = 'suppressed'; // 'potential', 'actual', or 'suppressed'
    }

    async initialize() {
        const [report, funnel, scorecard, demandGeoData] = await Promise.all([
            api.getDemandReport(),
            api.getDemandFunnel(),
            api.getDetectionScorecard(),
            api.getDemandGeoData()
        ]);

        this.data = { report, funnel, scorecard, demandGeoData };

        this.renderInterpretation();
        this.renderMetrics();
        this.renderMap();
        this.renderCharts();
        this.setupViewToggle();
    }

    renderInterpretation() {
        renderInterpretation('test4-interpretation', this.data.report.findings);
    }

    renderMetrics() {
        const { summary } = this.data.report;

        renderMetrics('test4-metrics', [
            {
                title: 'Suppressed Demand',
                value: summary.total_suppressed_demand.toLocaleString() + ' trips/day',
                subtext: `${summary.suppression_rate.toFixed(1)}% of potential lost`,
                sentiment: 'value-danger'
            },
            {
                title: 'High-Suppression Areas',
                value: summary.high_suppression_tracts.toString(),
                subtext: 'Tracts with >70% suppression',
                sentiment: 'value-warning'
            },
            {
                title: 'Naive AI Correlation',
                value: summary.naive_ai_correlation.toFixed(2),
                subtext: 'With potential demand (Pearson r)',
                sentiment: 'value-danger'
            },
            {
                title: 'Sophisticated AI Correlation',
                value: summary.sophisticated_ai_correlation.toFixed(2),
                subtext: 'With potential demand (Pearson r)',
                sentiment: 'value-warning'
            }
        ]);
    }

    renderMap() {
        this.map = new DurhamMap('map-demand').initialize();

        this.updateDemandLayer();

        this._onResize = () => {
            if (this.map && document.getElementById('map-demand')?.offsetParent !== null) {
                this.map.invalidateSize();
            }
        };
        window.addEventListener('resize', this._onResize);
    }

    updateDemandLayer() {
        const fieldMap = {
            'potential': 'potential_demand',
            'actual': 'actual_demand',
            'suppressed': 'suppressed_demand'
        };

        const titleMap = {
            'potential': 'Potential Demand',
            'actual': 'Actual Demand',
            'suppressed': 'Suppressed Demand'
        };

        const field = fieldMap[this.currentView];
        const title = titleMap[this.currentView];

        if (this.map.choroplethLayer) {
            this.map.map.removeLayer(this.map.choroplethLayer);
        }

        const colors = this.currentView === 'suppressed'
            ? ['#fee5d9', '#fcbba1', '#fc9272', '#fb6a4a', '#ef3b2c', '#cb181d', '#99000d']
            : ['#f7fbff', '#deebf7', '#c6dbef', '#9ecae1', '#6baed6', '#3182bd', '#08519c'];

        this.map.addChoroplethLayer(
            this.data.demandGeoData,
            field,
            {
                fillOpacity: 0.7,
                colors: colors,
                breaks: this.currentView === 'suppressed'
                    ? [20, 40, 60, 80, 100, 150, 200]
                    : [200, 300, 400, 500, 600, 700, 800],
                popupFields: [
                    { label: 'Income Quintile', field: 'income_quintile' },
                    { label: 'Potential Demand', field: 'potential_demand', format: v => `${v?.toFixed(0)} trips/day` },
                    { label: 'Actual Demand', field: 'actual_demand', format: v => `${v?.toFixed(0)} trips/day` },
                    { label: 'Suppressed Demand', field: 'suppressed_demand', format: v => `${v?.toFixed(0)} trips/day` }
                ]
            }
        );

        const items = this.currentView === 'suppressed'
            ? [
                { color: '#fee5d9', label: '<20' },
                { color: '#fcbba1', label: '20-60' },
                { color: '#fb6a4a', label: '60-150' },
                { color: '#99000d', label: '>150 trips/day' }
            ]
            : [
                { color: '#f7fbff', label: '<200' },
                { color: '#deebf7', label: '200-400' },
                { color: '#6baed6', label: '400-600' },
                { color: '#08519c', label: '>600 trips/day' }
            ];

        this.map.addLegend({ title, colorScale: items });
    }

    renderCharts() {
        this.renderFunnelChart();
        this.renderDetectionScorecard();
    }

    renderFunnelChart() {
        const { 'Q1 (Poorest)': q1, 'Q5 (Richest)': q5 } = this.data.funnel;

        const funnelFormatter = (params) => `${params.name}: ${Math.round(params.value)}%`;

        const funnelSeries = (name, data, position, color, labelPos) => ({
            name,
            type: 'funnel',
            left: position,
            width: '22%',
            label: {
                position: labelPos,
                formatter: funnelFormatter,
                fontSize: 11
            },
            labelLine: { show: true },
            itemStyle: { color, borderColor: '#fff', borderWidth: 1 },
            emphasis: { label: { fontSize: 13 } },
            data
        });

        const stages = [
            { key: 'stage1_potential', name: 'Potential' },
            { key: 'stage2_destinations', name: 'Destinations' },
            { key: 'stage3_would_use_if_safe', name: 'Would Use' },
            { key: 'stage4_actually_use', name: 'Actually Use' }
        ];

        const option = {
            title: {
                text: 'Demand Suppression: Q1 vs Q5',
                left: 'center',
                textStyle: { fontSize: 14, fontWeight: 'normal' }
            },
            tooltip: {
                trigger: 'item',
                formatter: (params) => `${params.seriesName}<br/>${params.name}: ${Math.round(params.value)}%`
            },
            legend: {
                data: ['Q1 (Poorest)', 'Q5 (Richest)'],
                bottom: 10
            },
            series: [
                funnelSeries('Q1 (Poorest)',
                    stages.map(s => ({ value: q1[s.key], name: s.name })),
                    '25%', COLORS.error, 'left'),
                funnelSeries('Q5 (Richest)',
                    stages.map(s => ({ value: q5[s.key], name: s.name })),
                    '53%', COLORS.success, 'right')
            ]
        };

        this.charts.funnel = initChart('chart-funnel', option);
    }

    renderDetectionScorecard() {
        const { naive_ai, sophisticated_ai, human_expert_baseline } = this.data.scorecard;

        function scorecardData(d) {
            const correlation = d.correlation_with_potential * 100;
            const detection = d.detection_rate_high_suppression;
            const inverseBias = Math.max(0, 100 + d.bias_q1);
            const overall = (correlation + detection + inverseBias) / 3;
            return [correlation.toFixed(1), detection.toFixed(1), inverseBias.toFixed(1), overall.toFixed(1)];
        }

        const seriesEntries = [
            { name: 'Naive AI (Strava-style)', data: naive_ai, color: '#c2410c' },
            { name: 'Sophisticated AI', data: sophisticated_ai, color: '#d97706' },
            { name: 'Human Expert', data: human_expert_baseline, color: COLORS.success },
        ];

        const option = {
            title: {
                text: 'AI Detection Capability',
                left: 'center',
                textStyle: { fontSize: 14, fontWeight: 'normal' }
            },
            tooltip: {
                trigger: 'axis',
                axisPointer: { type: 'shadow' }
            },
            legend: {
                data: seriesEntries.map(s => s.name),
                bottom: 10
            },
            grid: {
                left: '15%',
                right: '4%',
                bottom: '20%',
                containLabel: true
            },
            xAxis: {
                type: 'category',
                data: [
                    'Correlation\nwith Potential',
                    'Detection Rate\n(High Suppression)',
                    'Inverse Bias\n(Q1)',
                    'Overall\nScore'
                ],
                axisLabel: { interval: 0, fontSize: 11 }
            },
            yAxis: {
                type: 'value',
                name: 'Score (0-100)',
                max: 100
            },
            series: seriesEntries.map(s => ({
                name: s.name,
                type: 'bar',
                data: scorecardData(s.data),
                itemStyle: { color: s.color }
            }))
        };

        this.charts.scorecard = initChart('chart-scorecard', option);
    }

    setupViewToggle() {
        initViewToggle('toggle-demand-view', (value) => {
            this.currentView = value;
            this.updateDemandLayer();
        });
    }

    cleanup() {
        if (this._onResize) {
            window.removeEventListener('resize', this._onResize);
            this._onResize = null;
        }
        Object.values(this.charts).forEach(chart => chart.dispose());
        this.charts = {};
        if (this.map) {
            this.map.cleanup();
            this.map = null;
        }
    }
}
