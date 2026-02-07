/**
 * Durham Transportation Safety AI Audit - Main Application
 * Test 1: Volume Estimation Equity Audit
 */

import * as echarts from 'echarts';
import api from './services/api.js';
import { DurhamMap } from './components/common/DurhamMap.js';
import {
    createBarChartConfig,
    createScatterChartConfig,
    createHistogramConfig,
    COLORS
} from './services/chartConfig.js';

class App {
    constructor() {
        this.data = {};
        this.charts = {};
        this.map = null;
    }

    async initialize() {
        try {
            console.log('Loading data...');

            // Load all data in parallel
            const [report, choroplethData, counters] = await Promise.all([
                api.getTest1Report(),
                api.getChoroplethData(),
                api.getCounterLocations()
            ]);

            this.data = {
                report,
                choroplethData,
                counters
            };

            console.log('Data loaded:', this.data);

            // Hide loading, show app
            document.getElementById('loading').style.display = 'none';
            document.getElementById('app').style.display = 'block';

            // Render components
            this.renderInterpretation();
            this.renderMetrics();
            this.renderMap();
            this.renderCharts();

            console.log('App initialized successfully');
        } catch (error) {
            console.error('Failed to initialize app:', error);
            document.getElementById('loading').textContent =
                'Error loading data. Make sure the backend API is running on port 5000.';
        }
    }

    renderInterpretation() {
        const { interpretation } = this.data.report;

        if (!interpretation || interpretation.length === 0) {
            return;
        }

        const container = document.getElementById('interpretation');

        const html = `
            <div class="interpretation">
                <h3>Key Findings</h3>
                <ul>
                    ${interpretation.map(text => `<li>${text}</li>`).join('')}
                </ul>
            </div>
        `;

        container.innerHTML = html;
    }

    renderMetrics() {
        const { overall_accuracy } = this.data.report;

        const metrics = [
            {
                title: 'Mean Absolute Error',
                value: `${overall_accuracy.metrics.mae.toFixed(0)} trips/day`,
                subtext: `Across ${overall_accuracy.total_counters} locations`
            },
            {
                title: 'Mean Error',
                value: `${overall_accuracy.metrics.mean_pct_error.toFixed(1)}%`,
                subtext: overall_accuracy.metrics.mean_pct_error > 0
                    ? 'AI overcounts on average'
                    : 'AI undercounts on average'
            },
            {
                title: 'R² (Correlation)',
                value: overall_accuracy.metrics.r_squared.toFixed(3),
                subtext: overall_accuracy.metrics.r_squared > 0.7
                    ? 'Strong correlation'
                    : 'Weak correlation'
            },
            {
                title: 'Total Volume Bias',
                value: `${((overall_accuracy.total_predicted_volume - overall_accuracy.total_true_volume) / overall_accuracy.total_true_volume * 100).toFixed(1)}%`,
                subtext: `${overall_accuracy.total_predicted_volume.toLocaleString()} vs ${overall_accuracy.total_true_volume.toLocaleString()} actual`
            }
        ];

        const container = document.getElementById('metrics');

        const html = metrics.map(m => `
            <div class="metric-card">
                <h3>${m.title}</h3>
                <div class="value">${m.value}</div>
                <div class="subtext">${m.subtext}</div>
            </div>
        `).join('');

        container.innerHTML = html;
    }

    renderMap() {
        this.map = new DurhamMap('map').initialize();

        // Add choropleth layer
        this.map.addChoroplethLayer(this.data.choroplethData, {
            valueField: 'error_pct'
        });

        // Add counter markers
        this.map.addMarkers(this.data.counters, {
            popupContent: (point) => `
                <div style="font-size: 13px;">
                    <strong>${point.counter_id}</strong><br/>
                    <strong>Daily Volume:</strong> ${point.daily_volume}<br/>
                    <strong>Type:</strong> ${point.type}<br/>
                    <strong>Income:</strong> $${point.median_income?.toLocaleString() || 'N/A'}
                </div>
            `
        });

        // Add legend
        this.map.addLegend();

        // Fit to bounds
        this.map.fitBounds(this.data.choroplethData);
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

        const chart = echarts.init(document.getElementById('chart-income'));

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

        // Add reference line at 0
        config.series.push({
            name: 'No Bias',
            type: 'line',
            data: chartData.map(() => 0),
            lineStyle: {
                color: '#cbd5e0',
                width: 2,
                type: 'dashed'
            },
            symbol: 'none',
            silent: true
        });

        chart.setOption(config);
        this.charts.income = chart;

        window.addEventListener('resize', () => chart.resize());
    }

    renderRaceChart() {
        const { by_race } = this.data.report;

        const chartData = by_race.by_category.map(c => ({
            label: c.category,
            value: c.mean_error_pct
        }));

        const chart = echarts.init(document.getElementById('chart-race'));

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

        // Add reference line
        config.series.push({
            name: 'No Bias',
            type: 'line',
            data: chartData.map(() => 0),
            lineStyle: {
                color: '#cbd5e0',
                width: 2,
                type: 'dashed'
            },
            symbol: 'none',
            silent: true
        });

        chart.setOption(config);
        this.charts.race = chart;

        window.addEventListener('resize', () => chart.resize());
    }

    renderScatterChart() {
        const { scatter_data } = this.data.report;

        const chart = echarts.init(document.getElementById('chart-scatter'));

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

        chart.setOption(config);
        this.charts.scatter = chart;

        window.addEventListener('resize', () => chart.resize());
    }

    renderHistogramChart() {
        const { error_distribution } = this.data.report;

        const chart = echarts.init(document.getElementById('chart-histogram'));

        const config = createHistogramConfig(error_distribution, {
            xAxisLabel: 'Prediction Error (%)',
            color: COLORS.primary
        });

        chart.setOption(config);
        this.charts.histogram = chart;

        window.addEventListener('resize', () => chart.resize());
    }
}

// Initialize app when DOM is ready
const app = new App();
app.initialize();
