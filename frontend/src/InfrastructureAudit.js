/**
 * Infrastructure Recommendation Audit
 */

import api from './services/api.js';
import { DurhamMap } from './components/common/DurhamMap.js';
import { initChart, COLORS } from './services/chartConfig.js';
import { renderMetrics, renderInterpretation, initViewToggle } from './services/renderUtils.js';

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
        const { ai_allocation, need_based_allocation, comparison } = this.data.budgetAllocation;

        renderMetrics('test3-metrics', [
            {
                title: 'AI Disparate Impact',
                value: (ai_allocation.disparate_impact_ratio * 100).toFixed(1) + '%',
                subtext: 'Q1 vs Q5 per capita',
                sentiment: 'value-danger'
            },
            {
                title: 'Need-Based Impact',
                value: (need_based_allocation.disparate_impact_ratio * 100).toFixed(1) + '%',
                subtext: 'More equitable baseline',
                sentiment: 'value-success'
            },
            {
                title: 'AI Gini Coefficient',
                value: ai_allocation.gini_coefficient.toFixed(3),
                subtext: 'Budget inequality (0=equal)',
                sentiment: 'value-warning'
            },
            {
                title: 'Equity Gap',
                value: (comparison.equity_gap * 100).toFixed(1) + '%',
                subtext: 'AI vs need-based difference',
                sentiment: 'value-danger'
            }
        ]);
    }

    renderMap() {
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
            colorScale: [
                { color: '#f59e0b', label: 'Crosswalk' },
                { color: '#0d9488', label: 'Bike Lane' },
                { color: '#6366f1', label: 'Traffic Signal' },
                { color: '#ea580c', label: 'Speed Reduction' }
            ],
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
        const colors = {
            crosswalk: '#f59e0b',
            bike_lane: '#0d9488',
            traffic_signal: '#6366f1',
            speed_reduction: '#ea580c'
        };
        return colors[type] || '#636366';
    }

    renderCharts() {
        this.renderSankeyChart();
        this.renderRadarChart();
    }

    renderSankeyChart() {
        const { ai_allocation } = this.data.budgetAllocation;

        const nodes = [
            { name: 'Total Budget\n$5M' },
            { name: 'Q1 (Poorest)' },
            { name: 'Q2' },
            { name: 'Q3' },
            { name: 'Q4' },
            { name: 'Q5 (Richest)' }
        ];

        const links = Object.entries(ai_allocation.by_quintile).map(([quintile, amount]) => ({
            source: 'Total Budget\n$5M',
            target: quintile,
            value: amount
        }));

        const option = {
            title: {
                text: 'Budget Allocation by Income',
                left: 'center',
                textStyle: { fontSize: 14, fontWeight: 'normal' }
            },
            tooltip: {
                trigger: 'item',
                formatter: (params) => {
                    if (params.dataType === 'edge') {
                        return `${params.data.target}<br>$${params.value.toLocaleString()}`;
                    }
                }
            },
            series: [{
                type: 'sankey',
                layout: 'none',
                emphasis: { focus: 'adjacency' },
                data: nodes,
                links: links,
                lineStyle: {
                    color: 'gradient',
                    curveness: 0.5
                },
                label: {
                    fontSize: 12
                }
            }]
        };

        this.charts.sankey = initChart('chart-sankey', option);
    }

    renderRadarChart() {
        const { ai_allocation, need_based_allocation } = this.data.budgetAllocation;

        const normalize = (val, max) => (val / max) * 100;

        const option = {
            title: {
                text: 'Equity Comparison: AI vs Need-Based',
                left: 'center',
                textStyle: { fontSize: 14, fontWeight: 'normal' }
            },
            legend: {
                data: ['AI Allocation', 'Need-Based'],
                bottom: 10
            },
            radar: {
                indicator: [
                    { name: 'Equity\n(Lower=Better)', max: 100 },
                    { name: 'Q1 Budget\nPer Capita', max: 100 },
                    { name: 'Budget\nConcentration', max: 100 },
                    { name: 'Project\nCount', max: 100 }
                ],
                shape: 'polygon',
                splitNumber: 4
            },
            series: [{
                type: 'radar',
                data: [
                    {
                        value: [
                            100 - normalize(ai_allocation.disparate_impact_ratio, 1),
                            normalize(ai_allocation.per_capita['Q1 (Poorest)'], 50),
                            100 - normalize(ai_allocation.gini_coefficient, 1),
                            normalize(this.data.report.summary.ai_projects, 50)
                        ],
                        name: 'AI Allocation',
                        lineStyle: { color: COLORS.error },
                        areaStyle: { color: COLORS.error, opacity: 0.2 }
                    },
                    {
                        value: [
                            100 - normalize(need_based_allocation.disparate_impact_ratio, 1),
                            normalize(need_based_allocation.per_capita['Q1 (Poorest)'], 50),
                            100 - normalize(need_based_allocation.gini_coefficient, 1),
                            normalize(this.data.report.summary.need_based_projects, 50)
                        ],
                        name: 'Need-Based',
                        lineStyle: { color: COLORS.success },
                        areaStyle: { color: COLORS.success, opacity: 0.2 }
                    }
                ]
            }]
        };

        this.charts.radar = initChart('chart-radar', option);
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
