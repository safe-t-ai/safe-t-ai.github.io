/**
 * Crash Prediction Bias Audit
 */

import api from './services/api.js';
import { DurhamMap } from './components/common/DurhamMap.js';
import { initChart, createBarChartConfig, COLORS } from './services/chartConfig.js';
import { renderMetrics, renderInterpretation, initViewToggle } from './services/renderUtils.js';

export class CrashPredictionAudit {
    constructor() {
        this.data = {};
        this.charts = {};
        this.map = null;
        this.currentView = 'actual'; // 'actual' or 'predicted'
    }

    async initialize() {
        const [report, confusionMatrices, timeSeries, crashGeoData] = await Promise.all([
            api.getCrashReport(),
            api.getConfusionMatrices(),
            api.getCrashTimeSeries(),
            api.getCrashGeoData()
        ]);

        this.data = { report, confusionMatrices, timeSeries, crashGeoData };

        renderInterpretation('test2-interpretation', report.findings);
        this.renderMetrics();
        this.renderMap();
        this.renderCharts();
        this.setupViewToggle();
    }

    renderMetrics() {
        const { summary, error_by_quintile } = this.data.report;

        const q1_error = error_by_quintile['Q1 (Poorest)'];
        const q5_error = error_by_quintile['Q5 (Richest)'];

        renderMetrics('test2-metrics', [
            {
                title: 'Q1 Prediction Error',
                value: q1_error.error_pct.toFixed(0) + '%',
                subtext: 'Relative error (poorest quintile)',
                sentiment: 'value-danger'
            },
            {
                title: 'Q5 Prediction Error',
                value: q5_error.error_pct.toFixed(0) + '%',
                subtext: 'Relative error (richest quintile)',
                sentiment: 'value-success'
            },
            {
                title: 'Error Ratio',
                value: (q1_error.error_pct / q5_error.error_pct).toFixed(1) + 'x',
                subtext: 'Q1 error rate relative to Q5',
                sentiment: 'value-danger'
            },
            {
                title: 'Total Crashes (5yr)',
                value: summary.total_crashes_all_years.toLocaleString(),
                subtext: `Durham County 2019-2023 (NCDOT)`,
                sentiment: 'value-info'
            }
        ]);
    }

    renderMap() {
        this.map = new DurhamMap('map-crashes').initialize();
        this.updateCrashLayer();

        this._onResize = () => {
            if (this.map && document.getElementById('map-crashes')?.offsetParent !== null) {
                this.map.invalidateSize();
            }
        };
        window.addEventListener('resize', this._onResize);
    }

    updateCrashLayer() {
        const isActual = this.currentView === 'actual';
        const field = isActual ? 'actual_crashes' : 'ai_predicted_crashes';
        const label = isActual ? 'Actual Crashes (2023)' : 'AI Predicted Crashes (2023)';

        // Compute breaks from data (quantile-based) so the scale adapts to any data range
        const values = this.data.crashGeoData.features
            .map(f => f.properties[field])
            .filter(v => v != null && v > 0)
            .sort((a, b) => a - b);
        const quantile = (arr, q) => arr[Math.min(Math.floor(arr.length * q), arr.length - 1)];
        const breaks = [
            quantile(values, 0.125), quantile(values, 0.25), quantile(values, 0.375),
            quantile(values, 0.5), quantile(values, 0.625), quantile(values, 0.75),
            quantile(values, 0.875), Math.ceil(quantile(values, 1))
        ];

        if (this.map.choroplethLayer) {
            this.map.map.removeLayer(this.map.choroplethLayer);
        }

        this.map.addChoroplethLayer(
            this.data.crashGeoData,
            field,
            {
                fillOpacity: 0.7,
                colors: ['#ffffcc', '#ffeda0', '#fed976', '#feb24c', '#fd8d3c', '#fc4e2a', '#e31a1c', '#b10026'],
                breaks: breaks,
                popupFields: [
                    { label: 'Median Income', field: 'median_income', format: v => `$${v?.toLocaleString()}` },
                    { label: 'Income Quintile', field: 'income_quintile' },
                    { label: 'Actual Crashes (2023)', field: 'actual_crashes', format: v => v?.toLocaleString() },
                    { label: 'AI Predicted', field: 'ai_predicted_crashes', format: v => v?.toFixed(0) }
                ]
            }
        );

        const fmt = v => Number.isInteger(v) ? v : v.toFixed(1);
        this.map.addLegend({
            title: label,
            colorScale: [
                { color: '#ffffcc', label: `<${fmt(breaks[2])}` },
                { color: '#fed976', label: `${fmt(breaks[2])}\u2013${fmt(breaks[5])}` },
                { color: '#fc4e2a', label: `${fmt(breaks[5])}\u2013${fmt(breaks[7])}` },
                { color: '#b10026', label: `>${fmt(breaks[7])}` }
            ]
        });
    }

    renderCharts() {
        this.renderConfusionMatrix();
        this.renderTimeSeriesChart();
        this.renderErrorByQuintile();
        this.setupCrossFiltering();
    }

    setupCrossFiltering() {
        if (!this.map) return;
        const quintiles = ['Q1 (Poorest)', 'Q2', 'Q3', 'Q4', 'Q5 (Richest)'];

        if (this.charts.confusion) {
            this.charts.confusion.on('mouseover', (params) => {
                const qIdx = params.data?.[0];
                if (qIdx != null && quintiles[qIdx]) {
                    this.map.highlightByProperty('income_quintile', quintiles[qIdx]);
                }
            });
            this.charts.confusion.on('mouseout', () => this.map.resetHighlight());
        }

        if (this.charts.errorQuintile) {
            this.charts.errorQuintile.on('mouseover', (params) => {
                if (params.dataIndex != null && quintiles[params.dataIndex]) {
                    this.map.highlightByProperty('income_quintile', quintiles[params.dataIndex]);
                }
            });
            this.charts.errorQuintile.on('mouseout', () => this.map.resetHighlight());
        }
    }

    renderConfusionMatrix() {
        const { by_quintile } = this.data.confusionMatrices;

        const quintiles = ['Q1 (Poorest)', 'Q2', 'Q3', 'Q4', 'Q5 (Richest)'];
        const metrics = ['Precision', 'Recall', 'F1 Score'];

        const data = [];
        quintiles.forEach((quintile, qIdx) => {
            if (by_quintile[quintile]) {
                const qData = by_quintile[quintile];
                data.push([qIdx, 0, qData.precision]);
                data.push([qIdx, 1, qData.recall]);
                data.push([qIdx, 2, qData.f1_score]);
            }
        });

        const option = {
            tooltip: {
                position: 'top',
                formatter: (params) => {
                    const quintile = quintiles[params.data[0]];
                    const metric = metrics[params.data[1]];
                    const value = params.data[2];
                    return `${quintile}<br/>${metric}: ${value.toFixed(3)}`;
                }
            },
            grid: {
                top: '15%',
                left: '3%',
                right: '3%',
                bottom: '15%',
                containLabel: true
            },
            xAxis: {
                type: 'category',
                data: quintiles,
                splitArea: { show: true },
                axisLabel: { interval: 0, rotate: 0, fontSize: 11 }
            },
            yAxis: {
                type: 'category',
                data: metrics,
                splitArea: { show: true }
            },
            visualMap: {
                min: 0,
                max: 1,
                calculable: true,
                orient: 'horizontal',
                left: 'center',
                bottom: '5%',
                inRange: {
                    color: ['#f7fbff', '#deebf7', '#c6dbef', '#9ecae1', '#6baed6', '#4292c6', '#2171b5', '#08519c']
                }
            },
            series: [{
                type: 'heatmap',
                data: data,
                label: {
                    show: true,
                    formatter: (params) => params.data[2].toFixed(2)
                },
                emphasis: {
                    itemStyle: {
                        shadowBlur: 10,
                        shadowColor: 'rgba(0, 0, 0, 0.5)'
                    }
                }
            }]
        };

        this.charts.confusion = initChart('chart-confusion', option);
    }

    renderTimeSeriesChart() {
        const { years, by_quintile } = this.data.timeSeries;

        const quintileSeries = [
            { key: 'Q1 (Poorest)', label: 'Q1', color: COLORS.error },
            { key: 'Q5 (Richest)', label: 'Q5', color: COLORS.success }
        ];

        const series = quintileSeries.flatMap(({ key, label, color }) => [
            {
                name: `${label} Actual`,
                type: 'line',
                data: by_quintile[key].actual_crashes,
                lineStyle: { color, width: 3 },
                itemStyle: { color },
                smooth: true
            },
            {
                name: `${label} Predicted`,
                type: 'line',
                data: by_quintile[key].ai_predicted_crashes,
                lineStyle: { color, type: 'dashed', width: 2 },
                itemStyle: { color },
                smooth: true
            }
        ]);

        const option = {
            tooltip: {
                trigger: 'axis',
                axisPointer: { type: 'cross' },
                formatter: (params) =>
                    `<strong>${params[0].name}</strong><br/>` +
                    params.map(p => `${p.marker} ${p.seriesName}: ${Math.round(p.value).toLocaleString()}`).join('<br/>')
            },
            legend: {
                data: series.map(s => s.name),
                bottom: 10
            },
            grid: {
                left: '3%',
                right: '4%',
                bottom: '15%',
                containLabel: true
            },
            xAxis: {
                type: 'category',
                data: years,
                boundaryGap: false
            },
            yAxis: {
                type: 'value',
                name: 'Total Crashes'
            },
            series
        };

        this.charts.timeseries = initChart('chart-timeseries', option);
    }

    renderErrorByQuintile() {
        const { error_by_quintile } = this.data.report;

        const quintiles = ['Q1 (Poorest)', 'Q2', 'Q3', 'Q4', 'Q5 (Richest)'];
        const chartData = quintiles.map(q => ({
            label: q,
            value: error_by_quintile[q].error_pct
        }));

        const config = createBarChartConfig(chartData, {
            yAxisLabel: 'Prediction Error (%)',
            color: COLORS.quintiles,
            formatter: (params) => {
                const item = params[0];
                const q = quintiles[item.dataIndex];
                const d = error_by_quintile[q];
                return `
                    <strong>${q}</strong><br/>
                    Error: ${d.error_pct.toFixed(1)}%<br/>
                    MAE: ${d.mae.toFixed(1)} crashes<br/>
                    Actual: ${d.actual_crashes.toFixed(1)}<br/>
                    Predicted: ${d.ai_predicted_crashes.toFixed(1)}
                `;
            }
        });

        this.charts.errorQuintile = initChart('chart-error-quintile', config);
    }

    setupViewToggle() {
        initViewToggle('toggle-crash-view', (value) => {
            this.currentView = value;
            this.updateCrashLayer();
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
