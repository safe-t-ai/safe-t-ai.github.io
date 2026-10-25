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

        renderInterpretation('interpretation', report.interpretation, 'What the demo shows', {
            type: 'simulated',
            label: 'Simulated',
            tooltip: 'Counter locations, volumes and the undercount are all simulated. Roy et al. (2019) support the direction of the skew in Strava data; the size is assumed.'
        });
        this.renderMetrics();
        this.renderMap();
        this.renderCharts();
    }

    renderMetrics() {
        const { overall_accuracy, by_income } = this.data.report;
        const byQ = Object.fromEntries(by_income.by_quintile.map(q => [q.label, q]));
        const fmt = (/** @type {number} */ v) => `${v > 0 ? '+' : ''}${v.toFixed(0)}%`;

        renderMetrics('metrics', [
            {
                title: 'Count error, poorest fifth',
                value: fmt(byQ.Q1.mean_error_pct),
                subtext: `Mean over ${byQ.Q1.count} simulated counters`,
                sentiment: '',
            },
            {
                title: 'Count error, richest fifth',
                value: fmt(byQ.Q5.mean_error_pct),
                subtext: `Mean over ${byQ.Q5.count} simulated counters`,
            },
            {
                title: 'Simulated counters',
                value: String(overall_accuracy.total_counters),
                subtext: 'Placed across income fifths; replace with real counter sites',
            },
        ]);
    }

    renderMap() {
        setChartMeta('map', {
            badge: 'simulated',
            label: 'Simulated',
            tooltip: 'Simulated counter locations using illustrative bias parameters (not empirically measured), directionally informed by Roy et al. (2019) on demographic skew in Strava data. Real vendor counter data requires proprietary API access.',
            description: 'Simulated count error by tract. Orange is undercount, purple is overcount; dots are counter sites.',
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
            tooltip: 'Real Census demographics with simulated volume predictions. Bias parameters are illustrative, not empirically measured — direction informed by Roy et al. (2019) on demographic skew in Strava Metro data.',
            description: 'Mean signed error of the simulated tool by income fifth (Q1 poorest). Below zero is an undercount.',
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
            tooltip: 'Racial composition from US Census ACS. Volume predictions simulated with illustrative bias patterns; the equity concern for crowdsourced mobility data is discussed qualitatively in Williams & Behrendt (2025), direction informed by Roy et al. (2019).',
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
            yAxisLabel: 'Tool estimate',
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
            tooltip: 'Simulated prediction errors across all counter locations. Error model uses an illustrative undercount parameter, not an empirically measured figure — direction informed by Roy et al. (2019).',
            description: 'Each dot is one counter. Left of zero means the tool undercounted.',
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
