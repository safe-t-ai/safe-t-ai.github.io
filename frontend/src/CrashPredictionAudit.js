/**
 * Crash Prediction Bias Audit
 */

import api from './services/api.js';
import { DurhamMap } from './components/common/DurhamMap.js';
import { initChart, createBarChartConfig, COLORS } from './services/chartConfig.js';
import { renderMetrics, renderInterpretation, initViewToggle, setChartMeta } from './services/renderUtils.js';

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
        this.renderBaselineContext();
        this.renderMetrics();
        this.renderMap();
        this.renderCharts();
        this.setupViewToggle();
    }

    renderBaselineContext() {
        const b = this.data.report.racial_baseline;
        if (!b) return;
        document.getElementById('test2-baseline').innerHTML = `
            <div class="baseline-callout" aria-label="Pre-AI baseline: racial disparity in crash risk">
                <div class="baseline-callout-header">
                    <h3 class="baseline-title">Before AI: Who bears crash risk</h3>
                    <span class="baseline-source">${b.source}</span>
                </div>
                <div class="baseline-stats">
                    <div class="baseline-stat">
                        <span class="baseline-number baseline-danger">${b.black_victim_pct.toFixed(0)}%</span>
                        <span class="baseline-label">of crash victims<br>are Black residents</span>
                    </div>
                    <span class="baseline-divider" aria-hidden="true">vs.</span>
                    <div class="baseline-stat">
                        <span class="baseline-number">${b.black_population_pct.toFixed(0)}%</span>
                        <span class="baseline-label">of Durham's<br>population</span>
                    </div>
                    <span class="baseline-divider" aria-hidden="true">→</span>
                    <div class="baseline-stat">
                        <span class="baseline-number baseline-danger">${b.rate_ratio_black_vs_white.toFixed(1)}×</span>
                        <span class="baseline-label">higher crash rate<br>than white residents</span>
                    </div>
                </div>
                <p class="baseline-context">This disparity exists before AI allocates any safety resources. SAFE-T measures whether AI compounds it — directing investment away from communities already at greatest risk.</p>
            </div>
        `;
    }

    renderMetrics() {
        const { summary } = this.data.report;
        const { by_quintile } = this.data.confusionMatrices;

        const q1_accuracy = by_quintile['Q1 (Poorest)']?.accuracy ?? 0;
        const q5_accuracy = by_quintile['Q5 (Richest)']?.accuracy ?? 0;
        const q1_error = this.data.report.error_by_quintile['Q1 (Poorest)']?.error_pct ?? 0;
        const q5_error = this.data.report.error_by_quintile['Q5 (Richest)']?.error_pct ?? 0;

        const q1_recall = by_quintile['Q1 (Poorest)']?.recall ?? 0;
        const q5_recall = by_quintile['Q5 (Richest)']?.recall ?? 0;

        renderMetrics('test2-metrics', [
            {
                title: 'Q1 Recall',
                value: (q1_recall * 100).toFixed(0) + '%',
                subtext: 'High-risk tracts AI correctly flags in poorest areas',
                sentiment: 'value-danger'
            },
            {
                title: 'Q5 Recall',
                value: (q5_recall * 100).toFixed(0) + '%',
                subtext: 'High-risk tracts AI correctly flags in wealthiest areas',
                sentiment: 'value-success'
            },
            {
                title: 'Recall Gap',
                value: ((q5_recall - q1_recall) * 100).toFixed(0) + ' pts',
                subtext: `AI misses ${(100 - q1_recall * 100).toFixed(0)}% of dangerous tracts in poor areas vs ${(100 - q5_recall * 100).toFixed(0)}% in wealthy`,
                sentiment: 'value-danger'
            },
            {
                title: `Total Crashes (${summary.years_analyzed.length}yr)`,
                value: summary.total_crashes_all_years.toLocaleString(),
                subtext: `Durham County ${summary.years_analyzed[0]}\u2013${summary.years_analyzed.at(-1)} (NCDOT)`,
                sentiment: 'value-info'
            }
        ]);
    }

    renderMap() {
        setChartMeta('map-crashes', {
            badge: 'real',
            label: 'Real Data',
            tooltip: 'NCDOT non-motorist crash locations (pedestrian/bicycle), geocoded to census tracts via spatial join.',
            description: 'Actual vs predicted crash counts by census tract. Toggle between views to compare.',
        });
        this.map = new DurhamMap('map-crashes').initialize();
        this.updateCrashLayer();

        this._onResize = () => {
            if (this.map && document.getElementById('map-crashes')?.offsetParent !== null) {
                this.map.invalidateSize();
            }
        };
        window.addEventListener('resize', this._onResize);
    }

    /** Compute shared color breaks from both actual and predicted values. */
    _computeSharedBreaks() {
        if (this._sharedBreaks) return this._sharedBreaks;
        const allValues = this.data.crashGeoData.features
            .flatMap(f => [f.properties.actual_crashes, f.properties.ai_predicted_crashes])
            .filter(v => v != null && v > 0)
            .sort((a, b) => a - b);
        const q = (arr, p) => arr[Math.min(Math.floor(arr.length * p), arr.length - 1)];
        this._sharedBreaks = [
            q(allValues, 0.125), q(allValues, 0.25), q(allValues, 0.375),
            q(allValues, 0.5), q(allValues, 0.625), q(allValues, 0.75),
            q(allValues, 0.875), Math.ceil(q(allValues, 1))
        ];
        return this._sharedBreaks;
    }

    updateCrashLayer() {
        const isActual = this.currentView === 'actual';
        const field = isActual ? 'actual_crashes' : 'ai_predicted_crashes';
        const testYear = this.data.report.summary.years_analyzed.at(-1);
        const label = isActual ? `Actual Crashes (${testYear})` : `AI Predicted Crashes (${testYear})`;

        // Shared scale so toggling views reveals over/underprediction by color shift
        const breaks = this._computeSharedBreaks();

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
                    { label: `Actual Crashes (${testYear})`, field: 'actual_crashes', format: v => v?.toLocaleString() },
                    { label: 'AI Predicted', field: 'ai_predicted_crashes', format: v => v?.toFixed(1) }
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
        setChartMeta('chart-confusion', {
            badge: 'real',
            label: 'Real Data',
            tooltip: 'Ridge regression trained on real NCDOT non-motorist crash data (883 records, 2019–2024; training on 2019–2023, evaluated on 2024). Census demographics as features.',
            description: 'Binary classification (above/below within-quintile median) evaluated per income group. Q3/Q4 show recall = 1.0 but precision of 0.60/0.36 — the model over-predicts danger in mid-income areas while missing 71% of dangerous tracts in Q1.',
        });
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
        setChartMeta('chart-timeseries', {
            badge: 'real',
            label: 'Real Data',
            tooltip: 'Non-motorist crash trends from NCDOT ArcGIS Feature Service, aggregated by census tract.',
            description: 'Actual vs predicted crashes over time. Shows persistent over/underprediction patterns by income level.',
        });
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
        setChartMeta('chart-error-quintile', {
            badge: 'real',
            label: 'Real Data',
            tooltip: 'Mean absolute error of Ridge regression predictions on real NCDOT non-motorist crash data, grouped by neighborhood income quintile.',
            description: 'Relative prediction error by income level. Compares mean absolute error as a percentage of actual crash count, per income quintile.',
        });
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
