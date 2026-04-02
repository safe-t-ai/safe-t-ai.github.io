/**
 * Suppressed Demand Analysis
 */

import api from './services/api.js';
import { DurhamMap } from './components/common/DurhamMap.js';
import { initChart, COLORS } from './services/chartConfig.js';
import { renderMetrics, renderInterpretation, initViewToggle, setChartMeta } from './services/renderUtils.js';

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

        renderInterpretation('test4-interpretation', report.findings, 'Key Findings', {
            type: 'modeled',
            label: 'Modeled',
            tooltip: 'Demand suppression modeled from real OpenStreetMap infrastructure conditions. AI detection evaluated against modeled suppression scores.'
        });
        this.renderMetrics();
        this.renderMap();
        this.renderCharts();
        this.setupViewToggle();
    }

    renderMetrics() {
        const { summary } = this.data.report;
        const threshold = this.data.report.high_suppression_threshold ?? 70;

        renderMetrics('test4-metrics', [
            {
                title: 'Daily Trips Suppressed',
                value: summary.total_suppressed_demand.toLocaleString() + ' trips/day',
                subtext: `${summary.suppression_rate.toFixed(1)}% of potential demand prevented by missing infrastructure`,
                sentiment: 'value-danger'
            },
            {
                title: 'High-Suppression Areas',
                value: summary.high_suppression_tracts.toString(),
                subtext: `Tracts with >${threshold}% suppression`,
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
        setChartMeta('map-demand', {
            badge: 'modeled',
            label: 'Modeled',
            tooltip: 'Infrastructure quality scores derived from OpenStreetMap per-capita feature density per census tract. Demand suppression modeled from these real infrastructure conditions.',
            description: 'Suppressed, potential, and actual cycling/walking demand across Durham. High suppression (red) indicates latent demand AI tools miss — the trips that "no one walks there" arguments dismiss.',
        });
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
        const views = {
            potential:  { field: 'potential_demand',  title: 'Potential Demand',  colors: ['#f7fbff', '#deebf7', '#c6dbef', '#9ecae1', '#6baed6', '#3182bd', '#08519c'] },
            actual:     { field: 'actual_demand',     title: 'Actual Demand',     colors: ['#f7fbff', '#deebf7', '#c6dbef', '#9ecae1', '#6baed6', '#3182bd', '#08519c'] },
            suppressed: { field: 'suppressed_demand', title: 'Suppressed Demand', colors: ['#fee5d9', '#fcbba1', '#fc9272', '#fb6a4a', '#ef3b2c', '#cb181d', '#99000d'] }
        };

        const { field, title, colors } = views[this.currentView];

        // Compute quantile breaks from actual feature values for this field
        const vals = this.data.demandGeoData.features
            .map(f => f.properties[field])
            .filter(v => v != null && v > 0)
            .sort((a, b) => a - b);
        const q = (p) => Math.round(vals[Math.min(Math.floor(vals.length * p), vals.length - 1)]);
        const breaks = [q(0.125), q(0.25), q(0.375), q(0.5), q(0.625), q(0.75), q(0.875)];

        if (this.map.choroplethLayer) {
            this.map.map.removeLayer(this.map.choroplethLayer);
        }

        this.map.addChoroplethLayer(
            this.data.demandGeoData,
            field,
            {
                fillOpacity: 0.7,
                colors,
                breaks,
                popupFields: [
                    { label: 'Income Quintile', field: 'income_quintile' },
                    { label: 'Potential Demand', field: 'potential_demand', format: v => `${v?.toFixed(0)} trips/day` },
                    { label: 'Actual Demand', field: 'actual_demand', format: v => `${v?.toFixed(0)} trips/day` },
                    { label: 'Suppressed Demand', field: 'suppressed_demand', format: v => `${v?.toFixed(0)} trips/day` }
                ]
            }
        );

        const fmt = v => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v);
        this.map.addLegend({
            title: `${title} (trips/day)`,
            colorScale: [
                { color: colors[0], label: `<${fmt(breaks[1])}` },
                { color: colors[2], label: `${fmt(breaks[1])}–${fmt(breaks[3])}` },
                { color: colors[4], label: `${fmt(breaks[3])}–${fmt(breaks[5])}` },
                { color: colors[6], label: `>${fmt(breaks[5])}` }
            ]
        });
    }

    renderCharts() {
        this.renderSuppressionByQuintile();
        this.renderDetectionScorecard();
    }

    renderSuppressionByQuintile() {
        setChartMeta('chart-funnel', {
            badge: 'modeled',
            label: 'Modeled',
            tooltip: 'Suppression rate per income quintile. Infrastructure scores derived from OpenStreetMap feature density; suppression modeled from infrastructure quality.',
            description: 'Demand suppression by income quintile. Q1 (poorest) areas have the highest suppression — AI tools see only a fraction of latent demand there.',
        });
        const byQuintile = this.data.report.by_quintile;
        const quintiles = ['Q1 (Poorest)', 'Q2', 'Q3', 'Q4', 'Q5 (Richest)'];
        const suppressionRates = quintiles.map(q => +byQuintile[q].suppression_pct.toFixed(1));

        const option = {
            tooltip: {
                trigger: 'axis',
                formatter: (params) => `${params[0].name}<br/>Suppression rate: <b>${params[0].value}%</b>`
            },
            xAxis: {
                type: 'category',
                data: quintiles.map(q => q.replace(' (Poorest)', '\n(Poorest)').replace(' (Richest)', '\n(Richest)'))
            },
            yAxis: {
                type: 'value',
                min: 0,
                max: 100,
                axisLabel: { formatter: '{value}%' }
            },
            series: [{
                type: 'bar',
                data: suppressionRates.map((v, i) => ({
                    value: v,
                    itemStyle: { color: COLORS.quintiles[i] }
                })),
                label: {
                    show: true,
                    position: 'top',
                    formatter: '{c}%'
                },
                barMaxWidth: 48
            }]
        };

        this.charts.funnel = initChart('chart-funnel', option);
    }

    renderDetectionScorecard() {
        setChartMeta('chart-scorecard', {
            badge: 'modeled',
            label: 'Modeled',
            tooltip: 'AI detection accuracy evaluated against infrastructure scores from OpenStreetMap. Three approaches: naive, sophisticated, and human expert baseline.',
            description: 'Three independent detection dimensions: correlation with latent demand, high-suppression area detection rate, and Q1 bias direction. Shown separately — collapsing them into a single score would obscure where each approach succeeds and fails.',
        });
        const { naive_ai, sophisticated_ai, human_expert_baseline } = this.data.scorecard;

        function scorecardData(d) {
            const correlation = d.correlation_with_potential * 100;
            const detection = d.detection_rate_high_suppression;
            const inverseBias = Math.max(0, 100 + d.bias_q1);
            return [correlation.toFixed(1), detection.toFixed(1), inverseBias.toFixed(1)];
        }

        const seriesEntries = [
            { name: 'Naive AI', data: naive_ai, color: '#c2410c' },
            { name: 'Sophisticated AI', data: sophisticated_ai, color: '#d97706' },
            { name: 'Human Expert', data: human_expert_baseline, color: COLORS.success },
        ];

        const option = {
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
                itemStyle: { color: s.color, borderRadius: [3, 3, 0, 0] },
                animationDelay: (idx) => idx * 120
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
