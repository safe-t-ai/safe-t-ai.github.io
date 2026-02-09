/**
 * Test 2: Crash Prediction Bias Audit
 */

import * as echarts from 'echarts';
import api from './services/api.js';
import { DurhamMap } from './components/common/DurhamMap.js';
import { COLORS } from './services/chartConfig.js';

export class Test2 {
    constructor() {
        this.data = {};
        this.charts = {};
        this.map = null;
        this.currentView = 'actual'; // 'actual' or 'predicted'
    }

    async initialize() {
        try {
            console.log('Loading Test 2 data...');

            // Load crash prediction data
            const [report, confusionMatrices, rocCurves, timeSeries, crashGeoData] = await Promise.all([
                api.getCrashReport(),
                api.getConfusionMatrices(),
                api.getRocCurves(),
                api.getCrashTimeSeries(),
                api.getCrashGeoData()
            ]);

            this.data = {
                report,
                confusionMatrices,
                rocCurves,
                timeSeries,
                crashGeoData
            };

            console.log('Test 2 data loaded:', this.data);

            // Render components
            this.renderInterpretation();
            this.renderMetrics();
            this.renderMap();
            this.renderCharts();
            this.setupViewToggle();

        } catch (error) {
            console.error('Error loading Test 2:', error);
            document.getElementById('test2-content').innerHTML =
                '<div class="interpretation" style="background:#fee; border-color:#c00;"><h3>Error Loading Data</h3><p>' +
                error.message + '</p></div>';
        }
    }

    renderInterpretation() {
        const { findings } = this.data.report;
        const html = `
            <div class="interpretation">
                <h3>Key Findings</h3>
                <ul>
                    ${findings.map(f => `<li>${f}</li>`).join('')}
                </ul>
            </div>
        `;
        document.getElementById('test2-interpretation').innerHTML = html;
    }

    renderMetrics() {
        const { summary, error_by_quintile } = this.data.report;

        const q1_error = error_by_quintile['Q1 (Poorest)'];
        const q5_error = error_by_quintile['Q5 (Richest)'];

        const errorDisparity = ((q1_error.mae - q5_error.mae) / q5_error.mae) * 100;

        const metrics = [
            {
                title: 'Q1 Prediction Error',
                value: q1_error.mae.toFixed(1) + ' crashes',
                subtext: 'Mean Absolute Error (poorest quintile)',
                sentiment: 'value-danger'
            },
            {
                title: 'Q5 Prediction Error',
                value: q5_error.mae.toFixed(1) + ' crashes',
                subtext: 'Mean Absolute Error (richest quintile)',
                sentiment: 'value-success'
            },
            {
                title: 'Error Disparity',
                value: errorDisparity.toFixed(0) + '%',
                subtext: 'Higher error in low-income areas',
                sentiment: 'value-danger'
            },
            {
                title: 'Total Crashes (5yr)',
                value: summary.total_crashes_all_years.toLocaleString(),
                subtext: `Durham County 2019-2023 (NCDOT)`,
                sentiment: 'value-info'
            }
        ];

        const html = metrics.map(m => `
            <div class="metric-card">
                <h3>${m.title}</h3>
                <div class="value ${m.sentiment}">${m.value}</div>
                <div class="subtext">${m.subtext}</div>
            </div>
        `).join('');

        document.getElementById('test2-metrics').innerHTML = html;
    }

    renderMap() {
        this.map = new DurhamMap('map-crashes').initialize();

        // Add actual crashes layer (default view)
        this.updateCrashLayer();

        // Handle window resize
        window.addEventListener('resize', () => {
            if (this.map) this.map.invalidateSize();
        });
    }

    updateCrashLayer() {
        const field = this.currentView === 'actual' ? 'actual_crashes_5yr' : 'ai_predicted_crashes';
        const label = this.currentView === 'actual' ? 'Actual Crashes (5yr)' : 'AI Predicted Crashes';

        // Different breaks for actual vs predicted (AI severely underpredicts)
        const breaks = this.currentView === 'actual'
            ? [500, 1000, 1500, 2000, 2500, 3000, 4000, 5000]
            : [20, 40, 60, 80, 100, 150, 200, 250];

        // Clear existing layer
        if (this.map.choroplethLayer) {
            this.map.map.removeLayer(this.map.choroplethLayer);
        }

        // Add choropleth layer
        this.map.addChoroplethLayer(
            this.data.crashGeoData,
            field,
            {
                fillOpacity: 0.7,
                colors: ['#ffffcc', '#ffeda0', '#fed976', '#feb24c', '#fd8d3c', '#fc4e2a', '#e31a1c', '#b10026'],
                breaks: breaks
            }
        );

        // Add legend
        this.addCrashLegend(label, breaks);
    }

    addCrashLegend(title, breaks) {
        if (this.legend) {
            this.map.map.removeControl(this.legend);
        }

        const legend = L.control({ position: 'bottomright' });

        legend.onAdd = () => {
            const div = L.DomUtil.create('div', 'legend');
            div.innerHTML = `
                <h4>${title}</h4>
                <div style="margin-top: 0.5rem;">
                    <div class="legend-item">
                        <span class="legend-color" style="background: #b10026;"></span>
                        >${breaks[7]}
                    </div>
                    <div class="legend-item">
                        <span class="legend-color" style="background: #fc4e2a;"></span>
                        ${breaks[5]}-${breaks[7]}
                    </div>
                    <div class="legend-item">
                        <span class="legend-color" style="background: #fed976;"></span>
                        ${breaks[2]}-${breaks[5]}
                    </div>
                    <div class="legend-item">
                        <span class="legend-color" style="background: #ffffcc;"></span>
                        <${breaks[2]}
                    </div>
                </div>
            `;
            return div;
        };

        legend.addTo(this.map.map);
        this.legend = legend;
    }

    renderCharts() {
        this.renderConfusionMatrix();
        this.renderTimeSeriesChart();
        this.renderRocCurves();
    }

    renderConfusionMatrix() {
        const chart = echarts.init(document.getElementById('chart-confusion'));
        const { by_quintile } = this.data.confusionMatrices;

        // Prepare data for heatmap
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
                text: 'Model Performance by Income Quintile',
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
                height: '60%',
                top: '15%',
                left: '15%'
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

        chart.setOption(option);
        this.charts.confusion = chart;

        window.addEventListener('resize', () => chart.resize());
    }

    renderTimeSeriesChart() {
        const chart = echarts.init(document.getElementById('chart-timeseries'));
        const { years, by_quintile } = this.data.timeSeries;

        const option = {
            title: {
                text: 'Crashes Over Time by Quintile',
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

        chart.setOption(option);
        this.charts.timeseries = chart;

        window.addEventListener('resize', () => chart.resize());
    }

    renderRocCurves() {
        const chart = echarts.init(document.getElementById('chart-roc'));
        const { by_quintile, overall } = this.data.rocCurves;

        const quintiles = ['Q1 (Poorest)', 'Q2', 'Q3', 'Q4', 'Q5 (Richest)'];
        const colors = [COLORS.error, '#ff9800', '#ffc107', '#8bc34a', COLORS.success];

        const series = [];

        // Add diagonal reference line (random classifier)
        series.push({
            name: 'Random (AUC=0.5)',
            type: 'line',
            data: [[0, 0], [1, 1]],
            lineStyle: {
                color: '#999',
                type: 'dashed',
                width: 2
            },
            symbol: 'none',
            silent: true,
            z: 1
        });

        // Add ROC curve for each quintile
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
                text: 'ROC Curves by Income Quintile',
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
                left: '10%',
                right: '5%',
                bottom: '20%',
                top: '15%'
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

        chart.setOption(option);
        this.charts.roc = chart;

        window.addEventListener('resize', () => chart.resize());
    }

    setupViewToggle() {
        const radios = document.querySelectorAll('input[name="crash-view"]');
        radios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.currentView = e.target.value;
                this.updateCrashLayer();
            });
        });
    }

    cleanup() {
        Object.values(this.charts).forEach(chart => chart.dispose());
        this.charts = {};
        if (this.map) {
            this.map.cleanup();
            this.map = null;
        }
        if (this.legend) {
            this.legend = null;
        }
    }
}
