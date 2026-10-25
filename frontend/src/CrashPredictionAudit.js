/**
 * Test 2: Crash data audit (real NCDOT data)
 */

import api from './services/api.js';
import { DurhamMap } from './components/common/DurhamMap.js';
import { initChart, createBarChartConfig, COLORS } from './services/chartConfig.js';
import { renderMetrics, renderInterpretation, initViewToggle, setChartMeta } from './services/renderUtils.js';

const QUINTILES = ['Q1 (Poorest)', 'Q2', 'Q3', 'Q4', 'Q5 (Richest)'];
const SHORT = ['Q1', 'Q2', 'Q3', 'Q4', 'Q5'];
const RAMP = ['#fff7ec', '#fee8c8', '#fdd49e', '#fdbb84', '#fc8d59', '#e34a33', '#b30000'];

export class CrashPredictionAudit {
    constructor() {
        this.data = {};
        this.charts = {};
        this.map = null;
        /** @type {number[] | undefined} */
        this._countBreaks = undefined;
    }

    async initialize() {
        const [report, timeSeries, geo] = await Promise.all([
            api.getCrashReport(),
            api.getCrashTimeSeries(),
            api.getCrashGeoData(),
        ]);
        this.data = { report, timeSeries, geo };

        this.renderMetrics();
        this.renderMap();
        this.renderRateChart();
        this.renderDetectionChart();
        this.renderTimeSeries();
        this.setupCrossFiltering();
        renderInterpretation('test2-interpretation', report.findings, 'Findings', {
            type: 'real',
            label: 'Real data',
            tooltip: 'NCDOT non-motorist crash records geocoded to Census tracts. Each year from the backtest window is predicted only from earlier years.',
        });
    }

    renderMetrics() {
        const { report } = this.data;
        const rates = report.rate_per_1k_by_quintile;
        const d = report.detection_by_quintile;
        const q1 = d[QUINTILES[0]], q5 = d[QUINTILES[4]];
        const pct = x => `${Math.round(x * 100)}%`;

        renderMetrics('test2-metrics', [
            {
                title: 'Crash rate, poorest vs richest',
                value: `${report.rate_ratio_q1_q5.toFixed(1)}×`,
                subtext: `${rates[QUINTILES[0]].toFixed(2)} vs ${rates[QUINTILES[4]].toFixed(2)} per 1,000 residents a year`,
                sentiment: 'value-danger',
            },
            {
                title: 'Flagged in poorest fifth',
                value: `${q1.flagged} of ${q1.high_risk}`,
                subtext: `${pct(q1.recall)} of high-risk tract-years`,
            },
            {
                title: 'Flagged in richest fifth',
                value: `${q5.flagged} of ${q5.high_risk}`,
                subtext: `${pct(q5.recall)} of high-risk tract-years`,
            },
        ]);
    }

    renderMap() {
        const year = this.data.report.summary.backtest_years.at(-1);
        const span = this.data.report.summary.years_analyzed;
        setChartMeta('map-crashes', {
            badge: 'real',
            label: 'Real data',
            tooltip: 'NCDOT pedestrian and cyclist crash locations, joined to Census tracts.',
            description: `Switch between the long-run crash rate and the ${year} counts the crash-history model was tested on.`,
        });

        const views = {
            rate: { field: 'rate_per_1k', title: `Crashes per 1,000 residents a year (${span[0]}–${span.at(-1)})` },
            actual: { field: 'actual_crashes', title: `Crashes in ${year}` },
            predicted: { field: 'predicted_crashes', title: `Predicted for ${year} from earlier years` },
        };
        const fmt = v => (Number.isInteger(v) ? String(v) : v.toFixed(1));
        const breaksFor = field => {
            const vals = this.data.geo.features.map(f => f.properties[field]).filter(v => v > 0).sort((a, b) => a - b);
            const q = p => vals[Math.min(Math.floor(vals.length * p), vals.length - 1)];
            return [0, q(0.2), q(0.4), q(0.6), q(0.8), q(0.95), Infinity];
        };

        this.map = new DurhamMap('map-crashes').initialize();
        const show = key => {
            const v = views[key];
            const breaks = key === 'rate' ? breaksFor('rate_per_1k') : (this._countBreaks ??= breaksFor('actual_crashes'));
            if (this.map.choroplethLayer) this.map.map.removeLayer(this.map.choroplethLayer);
            if (this.map.legendControl) this.map.map.removeControl(this.map.legendControl);
            this.map.addChoroplethLayer(this.data.geo, v.field, {
                colors: RAMP,
                breaks,
                fillOpacity: 0.75,
                popupFields: [
                    { label: 'Income quintile', field: 'income_quintile' },
                    { label: 'Median income', field: 'median_income', format: x => `$${x?.toLocaleString()}` },
                    { label: 'Crashes / 1k / yr', field: 'rate_per_1k', format: x => x?.toFixed(2) },
                    { label: `Crashes ${year}`, field: 'actual_crashes' },
                    { label: `Predicted ${year}`, field: 'predicted_crashes', format: x => x?.toFixed(1) },
                ],
            });
            this.map.addLegend({
                title: v.title,
                colorScale: RAMP
                    .map((color, i) => ({
                        color,
                        empty: i > 0 && breaks[i] === breaks[i - 1],
                        label: i === 0 ? '0' : i === RAMP.length - 1 ? `> ${fmt(breaks[i - 1])}` : `${fmt(breaks[i - 1])}–${fmt(breaks[i])}`,
                    }))
                    .filter(e => !e.empty),
            });
        };
        show('rate');
        initViewToggle('toggle-crash-view', show);

        this._onResize = () => {
            if (document.getElementById('map-crashes')?.offsetParent !== null) this.map?.invalidateSize();
        };
        window.addEventListener('resize', this._onResize);
    }

    renderRateChart() {
        setChartMeta('chart-rate', {
            badge: 'real',
            label: 'Real data',
            tooltip: 'Total crashes divided by tract population, summed across each income quintile and averaged over all years.',
            description: 'Pedestrian and cyclist crashes per 1,000 residents a year. Q1 is the poorest fifth of tracts.',
        });
        const rates = this.data.report.rate_per_1k_by_quintile;
        const config = createBarChartConfig(
            QUINTILES.map((q, i) => ({ label: SHORT[i], value: Number(rates[q].toFixed(2)) })),
            {
                color: COLORS.quintiles,
                formatter: p => `<strong>${QUINTILES[p[0].dataIndex]}</strong><br/>${p[0].value.toFixed(2)} crashes per 1,000 residents a year`,
            },
        );
        config.series[0].label = { show: true, position: 'top', formatter: p => p.value.toFixed(2), fontSize: 12 };
        this.charts.rate = initChart('chart-rate', config);
    }

    renderDetectionChart() {
        const { report } = this.data;
        const years = report.summary.backtest_years;
        setChartMeta('chart-detection', {
            badge: 'real',
            label: 'Real data',
            tooltip: 'High-risk: a tract whose crash count that year is above the citywide 67th percentile. Flagged: its prediction from earlier years is above the 67th percentile of predictions. Whiskers are 95% Wilson intervals.',
            description: `Share of high-risk tract-years that crash history flagged, ${years[0]}–${years.at(-1)}. Whiskers show the 95% range; where ranges overlap, the difference could be chance.`,
        });
        const d = report.detection_by_quintile;
        const rows = QUINTILES.map(q => d[q]);

        const option = {
            tooltip: {
                trigger: 'axis',
                axisPointer: { type: 'shadow' },
                confine: true,
                formatter: p => {
                    const r = rows[p[0].dataIndex];
                    return `<strong>${QUINTILES[p[0].dataIndex]}</strong><br/>Flagged ${r.flagged} of ${r.high_risk} (${Math.round(r.recall * 100)}%)<br/>95% interval ${Math.round(r.ci_low * 100)}–${Math.round(r.ci_high * 100)}%`;
                },
            },
            grid: { left: '3%', right: '4%', top: 30, bottom: '3%', containLabel: true },
            xAxis: { type: 'category', data: SHORT },
            yAxis: { type: 'value', min: 0, max: 100, axisLabel: { formatter: '{value}%' } },
            series: [
                {
                    type: 'bar',
                    data: rows.map(r => Math.round(r.recall * 100)),
                    itemStyle: { color: p => COLORS.quintiles[p.dataIndex], borderRadius: [3, 3, 0, 0] },
                    label: { show: true, position: 'insideBottom', distance: 8, color: '#fff', fontWeight: 600, formatter: p => `${rows[p.dataIndex].flagged}/${rows[p.dataIndex].high_risk}` },
                    animationDelay: idx => idx * 100,
                },
                {
                    type: 'custom',
                    silent: true,
                    renderItem: (params, api) => {
                        const x = api.coord([api.value(0), 0])[0];
                        const lo = api.coord([0, api.value(1)])[1];
                        const hi = api.coord([0, api.value(2)])[1];
                        const style = { stroke: '#1a202c', lineWidth: 1.5 };
                        return {
                            type: 'group',
                            children: [
                                { type: 'line', shape: { x1: x, y1: lo, x2: x, y2: hi }, style },
                                { type: 'line', shape: { x1: x - 6, y1: lo, x2: x + 6, y2: lo }, style },
                                { type: 'line', shape: { x1: x - 6, y1: hi, x2: x + 6, y2: hi }, style },
                            ],
                        };
                    },
                    data: rows.map((r, i) => [i, r.ci_low * 100, r.ci_high * 100]),
                    z: 10,
                },
            ],
        };
        this.charts.detection = initChart('chart-detection', option);
    }

    renderTimeSeries() {
        setChartMeta('chart-timeseries', {
            badge: 'real',
            label: 'Real data',
            tooltip: 'Yearly crash totals per quintile. Dashed lines: each year predicted as the mean of all earlier years.',
            description: 'Crashes per year in the poorest and richest fifths, with the crash-history prediction dashed.',
        });
        const { years, by_quintile } = this.data.timeSeries;
        const pairs = [
            { key: QUINTILES[0], label: 'Q1', color: COLORS.quintiles[0] },
            { key: QUINTILES[4], label: 'Q5', color: COLORS.quintiles[4] },
        ];
        const series = pairs.flatMap(({ key, label, color }) => [
            { name: `${label} actual`, type: 'line', data: by_quintile[key].actual_crashes, lineStyle: { color, width: 3 }, itemStyle: { color } },
            { name: `${label} predicted`, type: 'line', data: by_quintile[key].predicted_crashes, lineStyle: { color, width: 2, type: 'dashed' }, itemStyle: { color }, connectNulls: false },
        ]);
        this.charts.timeseries = initChart('chart-timeseries', {
            tooltip: {
                trigger: 'axis',
                formatter: params => `<strong>${params[0].name}</strong><br/>` +
                    params.filter(p => p.value != null).map(p => `${p.marker} ${p.seriesName}: ${Math.round(p.value)}`).join('<br/>'),
            },
            legend: { top: 0 },
            grid: { left: '3%', right: '6%', top: 40, bottom: 8, containLabel: true },
            xAxis: { type: 'category', data: years, boundaryGap: false },
            yAxis: { type: 'value' },
            series,
        });
    }

    setupCrossFiltering() {
        for (const chart of [this.charts.rate, this.charts.detection]) {
            chart.on('mouseover', p => this.map.highlightByProperty('income_quintile', QUINTILES[p.dataIndex]));
            chart.on('mouseout', () => this.map.resetHighlight());
        }
    }

    cleanup() {
        if (this._onResize) window.removeEventListener('resize', this._onResize);
        Object.values(this.charts).forEach(c => c.dispose());
        this.charts = {};
        this.map?.cleanup();
        this.map = null;
    }
}
