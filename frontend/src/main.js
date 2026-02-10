/**
 * SAFE-T: Safety Algorithm Fairness Evaluation for Transportation
 * Multi-test platform with tab navigation
 */

import echarts from './services/echarts.js';
import api from './services/api.js';
import { DurhamMap } from './components/common/DurhamMap.js';
// Test 2-4 loaded on demand via dynamic import
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
        this.test2Instance = null;
        this.test3Instance = null;
        this.test4Instance = null;
        this.currentTest = 'test1';
    }

    async initialize() {
        try {
            console.log('Loading Test 1 data...');

            // Load Test 1 data
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

            console.log('Test 1 data loaded:', this.data);

            // Hide loading, show app
            document.getElementById('loading').style.display = 'none';
            document.getElementById('app').style.display = 'block';

            // Render Test 1 components
            this.renderInterpretation();
            this.renderMetrics();
            this.renderMap();
            this.renderCharts();

            // Setup tab navigation
            this.setupTabs();

            console.log('App initialized successfully');
        } catch (error) {
            console.error('Failed to initialize app:', error);
            document.getElementById('loading').textContent =
                'Error loading data. Run "make data" to generate static data files.';
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
                title: 'R² (Correlation)',
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

        const container = document.getElementById('metrics');

        const html = metrics.map(m => `
            <div class="metric-card">
                <h3>${m.title}</h3>
                <div class="value ${m.sentiment}">${m.value}</div>
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

        // Create custom icon (avoids Leaflet default icon issues)
        const customIcon = L.divIcon({
            className: 'custom-marker',
            html: '<div style="background-color: #3388ff; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.4);"></div>',
            iconSize: [12, 12],
            iconAnchor: [6, 6]
        });

        // Add counter markers
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

        // Add legend
        this.map.addLegend();

        // Fit to bounds
        this.map.fitBounds(this.data.choroplethData);

        // Handle window resize
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

    setupTabs() {
        const tabs = document.querySelectorAll('.tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', async (e) => {
                const testId = e.currentTarget.dataset.test;
                await this.switchTest(testId);
            });
        });
    }

    async switchTest(testId) {
        if (testId === this.currentTest) return;

        // Update tab active state
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.test === testId);
        });

        // Update content visibility
        document.querySelectorAll('.test-content').forEach(content => {
            content.classList.toggle('active', content.id === `${testId}-content`);
        });

        // Update description
        const descriptions = {
            test1: 'Evaluating AI tools for demographic bias in pedestrian and cyclist volume predictions',
            test2: 'Evaluating AI crash prediction models for enforcement bias',
            test3: 'Evaluating AI infrastructure recommendations for equitable resource allocation',
            test4: 'Evaluating AI capability to detect suppressed demand in underserved areas'
        };
        document.getElementById('test-description').textContent = descriptions[testId];

        // Load test-specific data
        if (testId === 'test2' && !this.test2Instance) {
            document.getElementById('loading').style.display = 'flex';
            const { Test2 } = await import('./test2.js');
            this.test2Instance = new Test2();
            await this.test2Instance.initialize();
            document.getElementById('loading').style.display = 'none';
        }

        if (testId === 'test3' && !this.test3Instance) {
            document.getElementById('loading').style.display = 'flex';
            const { Test3 } = await import('./test3.js');
            this.test3Instance = new Test3();
            await this.test3Instance.initialize();
            document.getElementById('loading').style.display = 'none';
        }

        if (testId === 'test4' && !this.test4Instance) {
            document.getElementById('loading').style.display = 'flex';
            const { Test4 } = await import('./test4.js');
            this.test4Instance = new Test4();
            await this.test4Instance.initialize();
            document.getElementById('loading').style.display = 'none';
        }

        this.currentTest = testId;
    }
}

// Initialize app when DOM is ready
const app = new App();
app.initialize();
