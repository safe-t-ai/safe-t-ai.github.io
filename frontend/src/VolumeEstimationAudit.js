/**
 * Volume Estimation Bias Audit (Test 1)
 */

import api from './services/api.js';
import { DurhamMap } from './components/common/DurhamMap.js';
import {
    initChart,
    createBarChartConfig,
    createScatterChartConfig,
    COLORS
} from './services/chartConfig.js';
import { renderMetrics, renderInterpretation, setChartMeta } from './services/renderUtils.js';

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

        renderInterpretation('interpretation', report.interpretation, 'Key Findings', {
            type: 'simulated',
            label: 'Simulated',
            tooltip: 'Counter locations, AI predictions, and all bias parameters are simulated from research literature. Bias parameters (20–30% undercount in low-income/minority areas) from Williams & Behrendt (2025). Real vendor data requires proprietary API access.'
        });
        this.renderMetrics();
        this.renderMap();
        this.renderCharts();
    }

    renderMetrics() {
        const { overall_accuracy } = this.data.report;
        const volumeBias = (overall_accuracy.total_predicted_volume - overall_accuracy.total_true_volume) / overall_accuracy.total_true_volume * 100;

        renderMetrics('metrics', [
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
                title: 'R\u00B2',
                value: overall_accuracy.metrics.r_squared.toFixed(2),
                subtext: overall_accuracy.metrics.r_squared > 0.7
                    ? 'Variance explained — strong model fit'
                    : 'Variance explained — moderate fit (simulated data)',
                sentiment: overall_accuracy.metrics.r_squared > 0.7 ? 'value-success' : 'value-warning'
            },
            {
                title: 'Total Volume Bias',
                value: `${volumeBias.toFixed(1)}%`,
                subtext: `${overall_accuracy.total_predicted_volume.toLocaleString()} vs ${overall_accuracy.total_true_volume.toLocaleString()} actual`,
                sentiment: Math.abs(volumeBias) > 10 ? 'value-danger' : 'value-warning'
            }
        ]);
    }

    renderMap() {
        setChartMeta('map', {
            badge: 'simulated',
            label: 'Simulated',
            tooltip: 'Simulated counter locations using bias patterns from Williams & Behrendt (2025): 20–30% undercount in low-income/minority areas. Real vendor counter data requires proprietary API access.',
            description: 'AI volume prediction error across Durham census tracts. Darker red indicates higher prediction errors, concentrated in low-income areas.',
        });
        this.map = new DurhamMap('map').initialize();

        this.map.addChoroplethLayer(this.data.choroplethData, {
            valueField: 'error_pct'
        });

        const customIcon = L.divIcon({
            className: 'custom-marker',
            html: '<div class="counter-marker"></div>',
            iconSize: [12, 12],
            iconAnchor: [6, 6]
        });

        this.map.addMarkers(this.data.counters, {
            icon: customIcon,
            popupContent: (point) => `
                <strong>${point.counter_id}</strong><br/>
                <strong>Daily Volume:</strong> ${point.daily_volume}<br/>
                <strong>Type:</strong> ${point.type}<br/>
                <strong>Income:</strong> $${point.median_income?.toLocaleString() || 'N/A'}
            `
        });

        this.map.addLegend();
        this.map.fitBounds(this.data.choroplethData);

        this._onResize = () => {
            if (this.map && document.getElementById('map')?.offsetParent !== null) {
                this.map.invalidateSize();
            }
        };
        window.addEventListener('resize', this._onResize);
    }

    renderCharts() {
        this.renderIncomeChart();
        this.renderRaceChart();
        this.renderScatterChart();
        this.renderErrorStripChart();
        this.setupCrossFiltering();
    }

    setupCrossFiltering() {
        if (!this.map) return;

        const quintileForIndex = [1, 2, 3, 4, 5];
        if (this.charts.income) {
            this.charts.income.on('mouseover', (params) => {
                if (params.dataIndex != null) {
                    this.map.highlightByProperty('income_quintile', quintileForIndex[params.dataIndex]);
                }
            });
            this.charts.income.on('mouseout', () => this.map.resetHighlight());
        }

        const categories = ['Low (<30%)', 'Medium (30-60%)', 'High (>60%)'];
        if (this.charts.race) {
            this.charts.race.on('mouseover', (params) => {
                if (params.dataIndex != null) {
                    this.map.highlightByProperty('minority_category', categories[params.dataIndex]);
                }
            });
            this.charts.race.on('mouseout', () => this.map.resetHighlight());
        }
    }

    renderIncomeChart() {
        setChartMeta('chart-income', {
            badge: 'simulated',
            label: 'Simulated',
            tooltip: 'Real Census demographics with simulated volume predictions. Bias parameters from Williams & Behrendt (2025): 20–30% undercount in low-income/minority areas documented for Strava Metro and StreetLight Data.',
            description: 'Prediction accuracy across income quintiles (Q1=poorest, Q5=richest). Shows mean absolute error in predicted vs actual pedestrian/cyclist counts.',
        });
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
        setChartMeta('chart-race', {
            badge: 'simulated',
            label: 'Simulated',
            tooltip: 'Racial composition from US Census ACS. Volume predictions simulated with bias patterns from Williams & Behrendt (2025): documented undercount in minority areas for crowdsourced mobility data.',
            description: 'Prediction errors grouped by census tract racial composition. Areas with higher minority percentages show systematically worse accuracy.',
        });
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
        setChartMeta('chart-scatter', {
            badge: 'simulated',
            label: 'Simulated',
            tooltip: 'Simulated counter data with demographic-correlated bias. Diagonal line represents perfect prediction; deviations indicate systematic error.',
            description: 'Predicted volumes vs actual counts. Perfect predictions follow the diagonal. Systematic deviations reveal where bias occurs.',
        });
        const { scatter_data } = this.data.report;

        const config = createScatterChartConfig(scatter_data, {
            xField: 'true_volume',
            yField: 'predicted_volume',
            xAxisLabel: 'Actual Daily Volume',
            yAxisLabel: 'AI Predicted Volume',
            colorField: 'income_quintile',
            colorLabels: { 1: 'Q1', 2: 'Q2', 3: 'Q3', 4: 'Q4', 5: 'Q5' },
            colors: COLORS.quintiles,
            formatter: (params) => {
                const item = params.data[2];
                return `
                    <strong>${item.counter_id}</strong><br/>
                    Actual: ${Math.round(item.true_volume)}<br/>
                    Predicted: ${Math.round(item.predicted_volume)}<br/>
                    Income: $${item.median_income.toLocaleString()}<br/>
                    Minority %: ${item.pct_minority.toFixed(1)}%
                `;
            }
        });

        this.charts.scatter = initChart('chart-scatter', config);
    }

    renderErrorStripChart() {
        setChartMeta('chart-histogram', {
            badge: 'simulated',
            label: 'Simulated',
            tooltip: 'Simulated prediction errors across all counter locations. Error model calibrated to the 20–30% undercount in low-income/minority areas documented in Williams & Behrendt (2025).',
            description: 'Each dot is one counter location. Dots left of zero indicate underprediction by the AI model.',
        });
        const { scatter_data } = this.data.report;
        const quintileLabels = { 1: 'Q1', 2: 'Q2', 3: 'Q3', 4: 'Q4', 5: 'Q5' };

        // Compute error % per counter and group by quintile
        const seriesData = Object.entries(
            scatter_data.reduce((groups, d) => {
                const key = d.income_quintile;
                if (!groups[key]) groups[key] = [];
                const errorPct = (d.predicted_volume - d.true_volume) / d.true_volume * 100;
                groups[key].push([errorPct, quintileLabels[key], d]);
                return groups;
            }, {})
        ).map(([key, values], idx) => ({
            name: quintileLabels[key],
            type: 'scatter',
            data: values,
            itemStyle: { color: COLORS.quintiles[idx % COLORS.quintiles.length] },
            symbolSize: 14
        }));

        const config = {
            tooltip: {
                trigger: 'item',
                confine: true,
                formatter: (params) => {
                    const d = params.data[2];
                    const errorPct = params.data[0];
                    return `
                        <strong>${d.counter_id}</strong><br/>
                        Error: ${errorPct.toFixed(1)}%<br/>
                        Actual: ${d.true_volume} / Predicted: ${d.predicted_volume}<br/>
                        Income: $${d.median_income.toLocaleString()}<br/>
                        Minority: ${d.pct_minority.toFixed(1)}%
                    `;
                }
            },
            legend: {
                data: Object.values(quintileLabels),
                bottom: 0
            },
            grid: {
                left: '3%', right: '4%', bottom: '15%', top: '10%',
                containLabel: true
            },
            xAxis: {
                type: 'value',
                name: 'Prediction Error (%)',
                nameLocation: 'middle',
                nameGap: 30,
                axisLabel: { formatter: '{value}%' }
            },
            yAxis: {
                type: 'category',
                data: Object.values(quintileLabels),
                axisTick: { show: false }
            },
            series: [
                ...seriesData,
                {
                    name: 'No Bias',
                    type: 'line',
                    data: Object.values(quintileLabels).map(q => [0, q]),
                    lineStyle: { color: '#c7c7cc', width: 2, type: 'dashed' },
                    symbol: 'none',
                    silent: true,
                    orientation: 'vertical'
                }
            ]
        };

        this.charts.errorStrip = initChart('chart-histogram', config);
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

    initChartWithZeroLine(elementId, config, dataLength) {
        config.series.push({
            name: 'No Bias',
            type: 'line',
            data: Array(dataLength).fill(0),
            lineStyle: { color: '#c7c7cc', width: 2, type: 'dashed' },
            symbol: 'none',
            silent: true
        });
        return initChart(elementId, config);
    }
}
