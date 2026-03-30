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
    speed_reduction: '#ea580c'
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
        const { findings, summary } = this.data.report;
        renderInterpretation('test3-interpretation', [
            ...findings,
            `AI allocates to ${summary.ai_projects} projects vs ${summary.need_based_projects} need-based projects`
        ]);
    }

    renderMetrics() {
        const { ai_allocation, need_based_allocation } = this.data.budgetAllocation;

        const q1AI = ai_allocation.by_quintile['Q1 (Poorest)'];
        const q1Need = need_based_allocation.by_quintile['Q1 (Poorest)'];
        const q1Gap = q1Need - q1AI;
        const needRatio = (need_based_allocation.per_capita['Q1 (Poorest)'] / need_based_allocation.per_capita['Q5 (Richest)']);

        renderMetrics('test3-metrics', [
            {
                title: 'Q1 Allocation Gap',
                value: `$${(q1Gap / 1e6).toFixed(1)}M`,
                subtext: `Q1 underallocated vs need-based per $5M safety cycle`,
                sentiment: 'value-danger'
            },
            {
                title: 'Need-Based Ratio',
                value: needRatio.toFixed(0) + 'x',
                subtext: `Q1 receives ${needRatio.toFixed(0)}x more per capita under danger-driven allocation`,
                sentiment: 'value-success'
            },
            {
                title: 'AI Gini Coefficient',
                value: ai_allocation.gini_coefficient.toFixed(3),
                subtext: 'Budget inequality across tracts (0=equal, 1=max)',
                sentiment: 'value-warning'
            },
            {
                title: 'AI Q1 Allocation',
                value: `$${(q1AI / 1000).toFixed(0)}k`,
                subtext: `vs $${(q1Need / 1000).toFixed(0)}k under need-based — AI ignores differential danger`,
                sentiment: 'value-danger'
            }
        ]);
    }

    renderMap() {
        setChartMeta('map-infrastructure', {
            badge: 'modeled',
            label: 'Modeled',
            tooltip: 'Safety need defined by danger scores — income-weighted crash risk per tract, calibrated to documented 2–5x higher pedestrian fatality rates in low-income areas (Vision Zero literature). Project types reflect real infrastructure gaps from OpenStreetMap per-capita feature density.',
            description: 'Safety project locations from AI vs need-based allocation. Shading shows danger scores (higher = more need); markers show projects. Toggle to compare.',
        });
        this.map = new DurhamMap('map-infrastructure').initialize();

        this.map.addChoroplethLayer(
            this.data.dangerScores,
            'danger_score',
            {
                fillOpacity: 0.3,
                colors: ['#fee5d9', '#fcae91', '#fb6a4a', '#de2d26', '#a50f15'],
                breaks: [15, 18, 21, 24, 30],
                popupFields: [
                    { label: 'Median Income', field: 'median_income_y', format: v => `$${v?.toLocaleString()}` },
                    { label: 'Minority %', field: 'pct_minority', format: v => `${v?.toFixed(1)}%` },
                    { label: 'Danger Score', field: 'danger_score', format: v => v?.toFixed(1) },
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
            footer: 'Marker size = project cost'
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
        this.renderEquityComparison();
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
            label: 'Modeled',
            tooltip: '$5M budget allocated across income quintiles. Project types reflect real infrastructure gaps from OpenStreetMap density data.',
            description: 'AI-driven vs need-based safety budget allocation per income quintile.',
        });
        const { ai_allocation, need_based_allocation } = this.data.budgetAllocation;
        const quintiles = ['Q1 (Poorest)', 'Q2', 'Q3', 'Q4', 'Q5 (Richest)'];

        const allocationSeries = [
            { name: 'AI Allocation', allocation: ai_allocation, color: COLORS.error, delay: 0 },
            { name: 'Need-Based', allocation: need_based_allocation, color: COLORS.success, delay: 60 }
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

    renderEquityComparison() {
        setChartMeta('chart-radar', {
            badge: 'modeled',
            label: 'Modeled',
            tooltip: 'Equity metrics comparing AI-driven vs need-based allocation. Infrastructure gaps derived from OpenStreetMap feature density per census tract.',
            description: 'Four normalized equity metrics (0-100) comparing AI-driven and need-based allocation strategies.',
        });
        const { ai_allocation, need_based_allocation } = this.data.budgetAllocation;
        const { summary } = this.data.report;

        const normalize = (val, max) => Math.min((val / max) * 100, 100);

        // Normalize disparate_impact_ratio against the max across both strategies,
        // so AI (0.97) vs need-based (15.4) renders honestly rather than both clamping to ~100.
        const maxDir = Math.max(
            ai_allocation.disparate_impact_ratio,
            need_based_allocation.disparate_impact_ratio
        );
        const maxQ1PerCap = Math.max(
            ai_allocation.per_capita['Q1 (Poorest)'],
            need_based_allocation.per_capita['Q1 (Poorest)']
        );

        const metrics = ['Equity', 'Q1 Per Capita', 'Budget Equality', 'Project Count'];

        const seriesEntries = [
            { name: 'AI Allocation', alloc: ai_allocation, projects: summary.ai_projects, color: COLORS.error },
            { name: 'Need-Based', alloc: need_based_allocation, projects: summary.need_based_projects, color: COLORS.success }
        ];

        const option = {
            tooltip: {
                trigger: 'axis',
                axisPointer: { type: 'shadow' },
                formatter: (params) => {
                    const labels = [
                        `Equity ratio (Q1/Q5 per capita)`,
                        `Q1 per-capita budget`,
                        `Budget equality (1 − Gini)`,
                        `Projects funded`
                    ];
                    return `<strong>${params[0].name}</strong><br/>` +
                        params.map((p, i) => `${p.marker} ${p.seriesName}: ${Number(p.value).toFixed(1)} — ${labels[i]}`).join('<br/>');
                }
            },
            legend: {
                data: seriesEntries.map(s => s.name),
                bottom: 10
            },
            grid: {
                left: '3%', right: '4%', bottom: '15%',
                containLabel: true
            },
            xAxis: {
                type: 'category',
                data: metrics,
                axisLabel: { fontSize: 11 }
            },
            yAxis: {
                type: 'value',
                name: 'Score (0-100)',
                max: 100
            },
            series: seriesEntries.map(({ name, alloc, projects, color }) => ({
                name,
                type: 'bar',
                data: [
                    normalize(alloc.disparate_impact_ratio, maxDir),
                    normalize(alloc.per_capita['Q1 (Poorest)'], maxQ1PerCap),
                    (1 - alloc.gini_coefficient) * 100,
                    normalize(projects, 50)
                ],
                itemStyle: { color, borderRadius: [3, 3, 0, 0] },
                animationDelay: (idx) => idx * 120
            }))
        };

        this.charts.equity = initChart('chart-radar', option);
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
