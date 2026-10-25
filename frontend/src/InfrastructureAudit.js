/**
 * Infrastructure Recommendation Audit
 */

import api from './services/api.js';
import { DurhamMap } from './components/common/DurhamMap.js';
import { initChart, COLORS } from './services/chartConfig.js';
import { renderMetrics, renderInterpretation, initViewToggle, setChartMeta } from './services/renderUtils.js';

const PROJECT_COLORS = {
    crosswalk: '#f59e0b',
    bike_lane: '#0d9488',
    traffic_signal: '#6366f1',
    speed_reduction: '#db2777'
};

export class InfrastructureAudit {
    constructor() {
        this.data = {};
        this.charts = {};
        this.map = null;
        this.currentAllocation = 'ai'; // 'ai' or 'need'
    }

    async initialize() {
        const [report, dangerScores, budgetAllocation, recommendations] = await Promise.all([
            api.getInfrastructureReport(),
            api.getDangerScores(),
            api.getBudgetAllocation(),
            api.getRecommendations()
        ]);

        this.data = { report, dangerScores, budgetAllocation, recommendations };

        this.renderInterpretation();
        this.renderMetrics();
        this.renderMap();
        this.renderCharts();
        this.setupAllocationToggle();
    }

    renderInterpretation() {
        const { ai_allocation: ai, need_based_allocation: need } = this.data.budgetAllocation;
        const total = Object.values(ai.by_quintile).reduce((x, y) => x + y, 0);
        const share = (/** @type {number} */ v) => `${Math.round((v / total) * 100)}%`;
        renderInterpretation('test3-interpretation', [
            `Ranked by real crash rates, the poorest fifth of tracts would get ${share(need.by_quintile['Q1 (Poorest)'])} of the budget. The simulated income-weighted tool gives it ${share(ai.by_quintile['Q1 (Poorest)'])}.`,
            `Under that tool, the richest fifth gets $${ai.per_capita['Q5 (Richest)'].toFixed(0)} per resident and the poorest $${ai.per_capita['Q1 (Poorest)'].toFixed(0)}.`,
            'The size of the gap is set by the simulated weighting. With a real tool\u2019s project list, the same comparison measures it.',
        ], 'Findings', {
            type: 'modeled',
            label: 'Partly simulated',
            tooltip: 'Need side: real NCDOT crash rates and OpenStreetMap gaps. Tool side: simulated ranking that weights median income 0.6 and crash rate 0.4.',
        });
    }

    renderMetrics() {
        const { ai_allocation: ai, need_based_allocation: need } = this.data.budgetAllocation;
        const q1 = 'Q1 (Poorest)', q5 = 'Q5 (Richest)';
        const total = Object.values(ai.by_quintile).reduce((x, y) => x + y, 0);
        const pct = (/** @type {number} */ v) => `${Math.round((v / total) * 100)}%`;

        renderMetrics('test3-metrics', [
            {
                title: 'Poorest fifth, need-based',
                value: pct(need.by_quintile[q1]),
                subtext: `of a $${(total / 1e6).toFixed(0)}M budget when ranked by crash rate`,
                sentiment: '',
            },
            {
                title: 'Poorest fifth, simulated tool',
                value: pct(ai.by_quintile[q1]),
                subtext: `$${((need.by_quintile[q1] - ai.by_quintile[q1]) / 1e6).toFixed(1)}M short of need`,
                sentiment: '',
            },
            {
                title: 'Need-based $ per resident, poorest vs richest',
                value: `${(need.per_capita[q1] / need.per_capita[q5]).toFixed(0)}×`,
                subtext: 'Budget follows crash counts, so this exceeds the crash-rate gap',
            },
        ]);
    }

    renderMap() {
        setChartMeta('map-infrastructure', {
            badge: 'modeled',
            label: 'Partly simulated',
            tooltip: 'Shading: real NCDOT pedestrian and cyclist crashes per 1,000 residents a year. Markers: each project fills its tract\u2019s biggest OpenStreetMap infrastructure gap.',
            description: 'Shading shows crash rate; markers show funded projects. Toggle between the simulated tool and a crash-rate ranking.',
        });
        this.map = new DurhamMap('map-infrastructure').initialize();

        // Compute quantile breaks from actual danger score values
        const dangerVals = this.data.dangerScores.features
            .map(f => f.properties.danger_score)
            .filter(v => v != null && v > 0)
            .sort((a, b) => a - b);
        const dq = (p) => dangerVals[Math.min(Math.floor(dangerVals.length * p), dangerVals.length - 1)];
        const dangerBreaks = [dq(0.2), dq(0.4), dq(0.6), dq(0.8), dangerVals[dangerVals.length - 1]];

        this.map.addChoroplethLayer(
            this.data.dangerScores,
            'danger_score',
            {
                fillOpacity: 0.6,
                colors: ['#f1f5f9', '#cbd5e1', '#94a3b8', '#64748b', '#334155'],
                breaks: dangerBreaks,
                popupFields: [
                    { label: 'Median Income', field: 'median_income_y', format: v => `$${v?.toLocaleString()}` },
                    { label: 'Minority %', field: 'pct_minority', format: v => `${v?.toFixed(1)}%` },
                    { label: 'Crashes / 1k / yr', field: 'danger_score', format: v => v?.toFixed(2) },
                    { label: 'Annual Crashes', field: 'annual_crashes', format: v => v?.toLocaleString() }
                ]
            }
        );

        this.updateRecommendationsLayer();

        this.map.addLegend({
            title: 'Project Types',
            colorScale: Object.entries(PROJECT_COLORS).map(([type, color]) => ({
                color,
                label: type.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())
            })),
            footer: 'Shading: crashes per 1,000 residents a year, darker is higher. Marker size: project cost.'
        });

        this._onResize = () => {
            if (this.map && document.getElementById('map-infrastructure')?.offsetParent !== null) {
                this.map.invalidateSize();
            }
        };
        window.addEventListener('resize', this._onResize);
    }

    updateRecommendationsLayer() {
        const recs = this.currentAllocation === 'ai'
            ? this.data.recommendations.ai_recommendations
            : this.data.recommendations.need_based_recommendations;

        if (this.map.markers) {
            this.map.markers.forEach(m => this.map.map.removeLayer(m));
        }
        this.map.markers = [];

        recs.features.forEach(feature => {
            const props = feature.properties;
            const coords = feature.geometry.coordinates;
            const center = this.getPolygonCenter(coords);

            const marker = L.circleMarker([center[1], center[0]], {
                radius: Math.sqrt(props.cost / 10000),
                fillColor: this.getProjectColor(props.project_type),
                color: '#1c1c1e',
                weight: 1,
                opacity: 0.8,
                fillOpacity: 0.6
            }).addTo(this.map.map);

            marker.bindPopup(`
                <strong>${props.project_type.replace('_', ' ').toUpperCase()}</strong><br>
                Cost: $${props.cost.toLocaleString()}<br>
                Safety Impact: ${(props.safety_impact * 100).toFixed(0)}%<br>
                Median Income: $${props.median_income_y.toLocaleString()}
            `);

            this.map.markers.push(marker);
        });
    }

    getPolygonCenter(coords) {
        const ring = coords[0];
        let sumLat = 0, sumLon = 0;
        ring.forEach(([lon, lat]) => {
            sumLon += lon;
            sumLat += lat;
        });
        return [sumLon / ring.length, sumLat / ring.length];
    }

    getProjectColor(type) {
        return PROJECT_COLORS[type];
    }

    renderCharts() {
        this.renderAllocationChart();
        this.setupCrossFiltering();
    }

    setupCrossFiltering() {
        if (!this.charts.allocation || !this.map) return;
        const quintiles = ['Q1 (Poorest)', 'Q2', 'Q3', 'Q4', 'Q5 (Richest)'];

        this.charts.allocation.on('mouseover', (params) => {
            if (params.dataIndex != null && quintiles[params.dataIndex]) {
                this.map.highlightByProperty('income_quintile', quintiles[params.dataIndex]);
            }
        });
        this.charts.allocation.on('mouseout', () => this.map.resetHighlight());
    }

    renderAllocationChart() {
        setChartMeta('chart-allocation', {
            badge: 'modeled',
            label: 'Partly simulated',
            tooltip: 'The same budget allocated two ways: by the simulated income-weighted tool, and by real crash rate.',
            description: 'Dollars per income quintile. Hover a bar to highlight those tracts on the map.',
        });
        const { ai_allocation, need_based_allocation } = this.data.budgetAllocation;
        const quintiles = ['Q1 (Poorest)', 'Q2', 'Q3', 'Q4', 'Q5 (Richest)'];

        const allocationSeries = [
            { name: 'Simulated tool', allocation: ai_allocation, color: COLORS.error, delay: 0 },
            { name: 'By crash rate', allocation: need_based_allocation, color: COLORS.success, delay: 60 }
        ];

        const option = {
            tooltip: {
                trigger: 'axis',
                axisPointer: { type: 'shadow' },
                formatter: (params) =>
                    params.map(p =>
                        `${p.marker} ${p.seriesName}: $${Number(p.value).toLocaleString()}`
                    ).join('<br/>')
            },
            legend: {
                data: allocationSeries.map(s => s.name),
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
                data: quintiles,
                axisLabel: { fontSize: 11 }
            },
            yAxis: {
                type: 'value',
                name: 'Budget ($)',
                axisLabel: {
                    formatter: (v) => v >= 1e6 ? `$${v / 1e6}M` : `$${v / 1e3}k`
                }
            },
            series: allocationSeries.map(({ name, allocation, color, delay }) => ({
                name,
                type: 'bar',
                data: quintiles.map(q => allocation.by_quintile[q]),
                itemStyle: { color, borderRadius: [3, 3, 0, 0] },
                animationDelay: (idx) => idx * 120 + delay
            }))
        };

        this.charts.allocation = initChart('chart-allocation', option);
    }

    setupAllocationToggle() {
        initViewToggle('toggle-allocation-type', (value) => {
            this.currentAllocation = value;
            this.updateRecommendationsLayer();
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
