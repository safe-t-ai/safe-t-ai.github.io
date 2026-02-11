/**
 * Crash Prediction Bias Audit
 */

import api from './services/api.js';
import { DurhamMap } from './components/common/DurhamMap.js';
import { initChart, COLORS } from './services/chartConfig.js';
import { renderMetrics, renderInterpretation, initViewToggle } from './services/renderUtils.js';

export class CrashPredictionAudit {
    constructor() {
        this.data = {};
        this.charts = {};
        this.map = null;
        this.currentView = 'actual'; // 'actual' or 'predicted'
    }

    async initialize() {
        const [report, confusionMatrices, rocCurves, timeSeries, crashGeoData] = await Promise.all([
            api.getCrashReport(),
            api.getConfusionMatrices(),
            api.getRocCurves(),
            api.getCrashTimeSeries(),
            api.getCrashGeoData()
        ]);

        this.data = { report, confusionMatrices, rocCurves, timeSeries, crashGeoData };

        this.renderInterpretation();
        this.renderMetrics();
        this.renderMap();
        this.renderCharts();
        this.setupViewToggle();
    }

    renderInterpretation() {
        renderInterpretation('test2-interpretation', this.data.report.findings);
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
        const field = this.currentView === 'actual' ? 'actual_crashes' : 'ai_predicted_crashes';
        const label = this.currentView === 'actual' ? 'Actual Crashes (2023)' : 'AI Predicted Crashes (2023)';

        const breaks = [20, 40, 60, 80, 100, 150, 200, 250];

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

        this.map.addLegend({
            title: label,
            colorScale: [
                { color: '#ffffcc', label: `<${breaks[2]}` },
                { color: '#fed976', label: `${breaks[2]}-${breaks[5]}` },
                { color: '#fc4e2a', label: `${breaks[5]}-${breaks[7]}` },
                { color: '#b10026', label: `>${breaks[7]}` }
            ]
        });
    }

    renderCharts() {
        this.renderConfusionMatrix();
        this.renderTimeSeriesChart();
        this.renderRocCurves();
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
            title: {
                text: 'Model Performance by Quintile',
                left: 'center',
                textStyle: { fontSize: 14, fontWeight: 'normal' }
            },
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

        const option = {
            title: {
                text: 'Crashes Over Time',
                left: 'center',
                textStyle: { fontSize: 14, fontWeight: 'normal' }
            },
            tooltip: {
                trigger: 'axis',
                axisPointer: { type: 'cross' }
            },
            legend: {
                data: ['Q1 Actual', 'Q1 Predicted', 'Q5 Actual', 'Q5 Predicted'],
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
            series: [
                {
                    name: 'Q1 Actual',
                    type: 'line',
                    data: by_quintile['Q1 (Poorest)'].actual_crashes,
                    lineStyle: { color: COLORS.error, width: 3 },
                    itemStyle: { color: COLORS.error },
                    smooth: true
                },
                {
                    name: 'Q1 Predicted',
                    type: 'line',
                    data: by_quintile['Q1 (Poorest)'].ai_predicted_crashes,
                    lineStyle: { color: COLORS.error, type: 'dashed', width: 2 },
                    itemStyle: { color: COLORS.error },
                    smooth: true
                },
                {
                    name: 'Q5 Actual',
                    type: 'line',
                    data: by_quintile['Q5 (Richest)'].actual_crashes,
                    lineStyle: { color: COLORS.success, width: 3 },
                    itemStyle: { color: COLORS.success },
                    smooth: true
                },
                {
                    name: 'Q5 Predicted',
                    type: 'line',
                    data: by_quintile['Q5 (Richest)'].ai_predicted_crashes,
                    lineStyle: { color: COLORS.success, type: 'dashed', width: 2 },
                    itemStyle: { color: COLORS.success },
                    smooth: true
                }
            ]
        };

        this.charts.timeseries = initChart('chart-timeseries', option);
    }

    renderRocCurves() {
        const { by_quintile } = this.data.rocCurves;

        const quintiles = ['Q1 (Poorest)', 'Q2', 'Q3', 'Q4', 'Q5 (Richest)'];
        const colors = [COLORS.error, '#e8903e', '#9ca3af', '#3ab7a5', COLORS.success];

        const series = [];

        series.push({
            name: 'Random (AUC=0.5)',
            type: 'line',
            data: [[0, 0], [1, 1]],
            lineStyle: {
                color: '#c7c7cc',
                type: 'dashed',
                width: 2
            },
            symbol: 'none',
            silent: true,
            z: 1
        });

        quintiles.forEach((quintile, idx) => {
            if (by_quintile[quintile]) {
                const { fpr, tpr, auc } = by_quintile[quintile];
                const data = fpr.map((f, i) => [f, tpr[i]]);

                series.push({
                    name: `${quintile} (AUC=${auc.toFixed(3)})`,
                    type: 'line',
                    data: data,
                    smooth: true,
                    lineStyle: {
                        color: colors[idx],
                        width: 2
                    },
                    itemStyle: {
                        color: colors[idx]
                    },
                    symbol: 'none',
                    z: 10
                });
            }
        });

        const option = {
            title: {
                text: 'Classification Accuracy by Quintile',
                left: 'center',
                textStyle: { fontSize: 14, fontWeight: 'normal' }
            },
            tooltip: {
                trigger: 'axis',
                axisPointer: { type: 'cross' },
                formatter: (params) => {
                    let result = `FPR: ${params[0].data[0].toFixed(3)}<br/>`;
                    params.forEach(p => {
                        if (p.seriesName !== 'Random (AUC=0.5)') {
                            result += `${p.marker} ${p.seriesName}<br/>TPR: ${p.data[1].toFixed(3)}<br/>`;
                        }
                    });
                    return result;
                }
            },
            legend: {
                data: series.map(s => s.name),
                bottom: 10,
                type: 'scroll'
            },
            grid: {
                left: '3%',
                right: '5%',
                bottom: '20%',
                top: '15%',
                containLabel: true
            },
            xAxis: {
                type: 'value',
                name: 'False Positive Rate',
                nameLocation: 'middle',
                nameGap: 30,
                min: 0,
                max: 1
            },
            yAxis: {
                type: 'value',
                name: 'True Positive Rate',
                nameLocation: 'middle',
                nameGap: 40,
                min: 0,
                max: 1
            },
            series: series
        };

        this.charts.roc = initChart('chart-roc', option);
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
