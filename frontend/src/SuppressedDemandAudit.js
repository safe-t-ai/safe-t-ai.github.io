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

        renderInterpretation('test4-interpretation', report.findings, 'Findings', {
            type: 'modeled',
            label: 'Partly simulated',
            tooltip: 'Infrastructure scores are real (OpenStreetMap). Potential demand, suppression and both detectors are modeled from them.'
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
                title: 'Suppressed trips a day (modeled)',
                value: `≈${(Math.round(summary.total_suppressed_demand / 1000) * 1000).toLocaleString()}`,
                subtext: `${summary.suppression_rate.toFixed(0)}% of modeled potential demand`,
                sentiment: ''
            },
            {
                title: 'High-suppression tracts',
                value: summary.high_suppression_tracts.toString(),
                subtext: `Tracts with >${threshold}% suppression`,
                sentiment: ''
            },
            {
                title: 'Naive detector',
                value: summary.naive_ai_correlation.toFixed(2),
                subtext: 'Correlation with potential demand (r)',
                sentiment: ''
            },
            {
                title: 'Adjusted detector',
                value: summary.sophisticated_ai_correlation.toFixed(2),
                subtext: 'Correlation with potential demand (r)',
                sentiment: ''
            }
        ]);
    }

    renderMap() {
        setChartMeta('map-demand', {
            badge: 'modeled',
            label: 'Partly simulated',
            tooltip: 'Infrastructure quality scores derived from OpenStreetMap per-capita feature density per census tract. Demand suppression modeled from these real infrastructure conditions.',
            description: 'Modeled trips a day by tract. Suppressed is potential minus actual: the trips "no one walks there" arguments leave out.',
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
        const breaks = [q(1 / 7), q(2 / 7), q(3 / 7), q(4 / 7), q(5 / 7), q(6 / 7), Infinity];

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
            colorScale: colors.map((color, i) => ({
                color,
                label: i === 0 ? `≤ ${fmt(breaks[0])}` : i === colors.length - 1 ? `> ${fmt(breaks[i - 1])}` : `${fmt(breaks[i - 1])}–${fmt(breaks[i])}`,
            }))
        });
    }

    renderCharts() {
        this.renderSuppressionByQuintile();
        this.renderDetectionScorecard();
    }

    renderSuppressionByQuintile() {
        setChartMeta('chart-funnel', {
            badge: 'modeled',
            label: 'Partly simulated',
            tooltip: 'Suppression rate per income quintile. Infrastructure scores derived from OpenStreetMap feature density; suppression modeled from infrastructure quality.',
            description: 'Share of modeled potential trips suppressed, by income fifth.',
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
            label: 'Partly simulated',
            tooltip: 'Both detectors are modeled from OpenStreetMap infrastructure scores.',
            description: 'How well each detector recovers modeled potential demand, on three separate measures.',
        });
        const { naive_ai, sophisticated_ai } = this.data.scorecard;

        function scorecardData(d) {
            const correlation = d.correlation_with_potential * 100;
            const detection = d.detection_rate_high_suppression;
            const inverseBias = Math.max(0, 100 + d.bias_q1);
            return [correlation.toFixed(1), detection.toFixed(1), inverseBias.toFixed(1)];
        }

        const seriesEntries = [
            { name: 'Naive', data: naive_ai, color: '#c2410c' },
            { name: 'Adjusted', data: sophisticated_ai, color: '#0e7490' },
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
                data: ['Correlation × 100', 'High-suppression\ntracts found (%)', '100 − Q1\nundercount (%)'],
                axisLabel: { interval: 0, fontSize: 11 }
            },
            yAxis: {
                type: 'value',
                max: 100
            },
            series: seriesEntries.map(s => ({
                name: s.name,
                type: 'bar',
                data: scorecardData(s.data),
                itemStyle: { color: s.color, borderRadius: [3, 3, 0, 0] },
                label: { show: true, position: 'top', fontSize: 11, formatter: (/** @type {any} */ p) => Math.round(p.value) },
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
