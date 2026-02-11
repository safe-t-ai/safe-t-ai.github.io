/**
 * Volume Estimation Bias Audit (Test 1)
 */

import echarts from './services/echarts.js';
import api from './services/api.js';
import { DurhamMap } from './components/common/DurhamMap.js';
import {
    createBarChartConfig,
    createScatterChartConfig,
    createHistogramConfig,
    COLORS
} from './services/chartConfig.js';

export class VolumeEstimationAudit {
    constructor() {
        this.data = {};
        this.charts = {};
        this.map = null;
    }

    async initialize() {
        const [report, choroplethData, counters] = await Promise.all([
            api.getTest1Report(),
            api.getChoroplethData(),
            api.getCounterLocations()
        ]);

        this.data = { report, choroplethData, counters };

        this.renderInterpretation();
        this.renderMetrics();
        this.renderMap();
        this.renderCharts();
    }

    renderInterpretation() {
        const { interpretation } = this.data.report;
        if (!interpretation || interpretation.length === 0) return;

        document.getElementById('interpretation').innerHTML = `
            <div class="interpretation">
                <h3>Key Findings</h3>
                <ul>
                    ${interpretation.map(text => `<li>${text}</li>`).join('')}
                </ul>
            </div>
        `;
    }

    renderMetrics() {
        const { overall_accuracy } = this.data.report;
        const volumeBias = (overall_accuracy.total_predicted_volume - overall_accuracy.total_true_volume) / overall_accuracy.total_true_volume * 100;

        const metrics = [
            {
                title: 'Mean Absolute Error',
                value: `${overall_accuracy.metrics.mae.toFixed(0)} trips/day`,
                subtext: `Across ${overall_accuracy.total_counters} locations`,
                sentiment: 'value-warning'
            },
            {
                title: 'Mean Error',
                value: `${overall_accuracy.metrics.mean_pct_error.toFixed(1)}%`,
                subtext: overall_accuracy.metrics.mean_pct_error > 0
                    ? 'AI overcounts on average'
                    : 'AI undercounts on average',
                sentiment: Math.abs(overall_accuracy.metrics.mean_pct_error) > 10 ? 'value-danger' : 'value-warning'
            },
            {
                title: 'R\u00B2 (Correlation)',
                value: overall_accuracy.metrics.r_squared.toFixed(3),
                subtext: overall_accuracy.metrics.r_squared > 0.7
                    ? 'Strong correlation'
                    : 'Weak correlation',
                sentiment: overall_accuracy.metrics.r_squared > 0.7 ? 'value-success' : 'value-danger'
            },
            {
                title: 'Total Volume Bias',
                value: `${volumeBias.toFixed(1)}%`,
                subtext: `${overall_accuracy.total_predicted_volume.toLocaleString()} vs ${overall_accuracy.total_true_volume.toLocaleString()} actual`,
                sentiment: Math.abs(volumeBias) > 10 ? 'value-danger' : 'value-warning'
            }
        ];

        document.getElementById('metrics').innerHTML = metrics.map(m => `
            <div class="metric-card">
                <h3>${m.title}</h3>
                <div class="value ${m.sentiment}">${m.value}</div>
                <div class="subtext">${m.subtext}</div>
            </div>
        `).join('');
    }

    renderMap() {
        this.map = new DurhamMap('map').initialize();

        this.map.addChoroplethLayer(this.data.choroplethData, {
            valueField: 'error_pct'
        });

        const customIcon = L.divIcon({
            className: 'custom-marker',
            html: '<div style="background-color: #0891b2; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.4);"></div>',
            iconSize: [12, 12],
            iconAnchor: [6, 6]
        });

        this.map.addMarkers(this.data.counters, {
            icon: customIcon,
            popupContent: (point) => `
                <div style="font-size: 13px;">
                    <strong>${point.counter_id}</strong><br/>
                    <strong>Daily Volume:</strong> ${point.daily_volume}<br/>
                    <strong>Type:</strong> ${point.type}<br/>
                    <strong>Income:</strong> $${point.median_income?.toLocaleString() || 'N/A'}
                </div>
            `
        });

        this.map.addLegend();
        this.map.fitBounds(this.data.choroplethData);

        window.addEventListener('resize', () => {
            if (this.map) this.map.invalidateSize();
        });
    }

    renderCharts() {
        this.renderIncomeChart();
        this.renderRaceChart();
        this.renderScatterChart();
        this.renderHistogramChart();
    }

    renderIncomeChart() {
        const { by_income } = this.data.report;

        const chartData = by_income.by_quintile.map(q => ({
            label: `Q${q.quintile}\n$${(q.median_income / 1000).toFixed(0)}k`,
            value: q.mean_error_pct,
            quintile: q.quintile
        }));

        const config = createBarChartConfig(chartData, {
            yAxisLabel: 'Mean Prediction Error (%)',
            color: COLORS.quintiles,
            formatter: (params) => {
                const item = params[0];
                const quintile = by_income.by_quintile[item.dataIndex];
                return `
                    <strong>Quintile ${quintile.quintile}</strong><br/>
                    Median Income: $${quintile.median_income.toLocaleString()}<br/>
                    Mean Error: ${quintile.mean_error_pct.toFixed(1)}%<br/>
                    Count: ${quintile.count} locations
                `;
            }
        });

        this.charts.income = this.initChartWithZeroLine('chart-income', config, chartData.length);
    }

    renderRaceChart() {
        const { by_race } = this.data.report;

        const chartData = by_race.by_category.map(c => ({
            label: c.category,
            value: c.mean_error_pct
        }));

        const config = createBarChartConfig(chartData, {
            yAxisLabel: 'Mean Prediction Error (%)',
            color: COLORS.minority,
            formatter: (params) => {
                const item = params[0];
                const category = by_race.by_category[item.dataIndex];
                return `
                    <strong>${category.category}</strong><br/>
                    Mean Error: ${category.mean_error_pct.toFixed(1)}%<br/>
                    Count: ${category.count} locations
                `;
            }
        });

        this.charts.race = this.initChartWithZeroLine('chart-race', config, chartData.length);
    }

    renderScatterChart() {
        const { scatter_data } = this.data.report;

        const config = createScatterChartConfig(scatter_data, {
            xField: 'true_volume',
            yField: 'predicted_volume',
            xAxisLabel: 'Actual Daily Volume',
            yAxisLabel: 'AI Predicted Volume',
            colorField: 'income_quintile',
            colors: COLORS.quintiles,
            formatter: (params) => {
                const item = params.data[2];
                return `
                    <strong>${item.counter_id}</strong><br/>
                    Actual: ${item.true_volume}<br/>
                    Predicted: ${item.predicted_volume}<br/>
                    Income: $${item.median_income.toLocaleString()}<br/>
                    Minority %: ${item.pct_minority.toFixed(1)}%
                `;
            }
        });

        this.charts.scatter = this.initChart('chart-scatter', config);
    }

    renderHistogramChart() {
        const config = createHistogramConfig(this.data.report.error_distribution, {
            xAxisLabel: 'Prediction Error (%)',
            color: COLORS.primary
        });

        this.charts.histogram = this.initChart('chart-histogram', config);
    }

    initChart(elementId, config) {
        const chart = echarts.init(document.getElementById(elementId));
        chart.setOption(config);
        window.addEventListener('resize', () => chart.resize());
        return chart;
    }

    initChartWithZeroLine(elementId, config, dataLength) {
        config.series.push({
            name: 'No Bias',
            type: 'line',
            data: Array(dataLength).fill(0),
            lineStyle: { color: '#c7c7cc', width: 2, type: 'dashed' },
            symbol: 'none',
            silent: true
        });
        return this.initChart(elementId, config);
    }
}
