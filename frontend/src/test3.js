/**
 * Test 3: Infrastructure Recommendation Audit
 */

import echarts from './services/echarts.js';
import api from './services/api.js';
import { DurhamMap } from './components/common/DurhamMap.js';
import { COLORS } from './services/chartConfig.js';

export class Test3 {
    constructor() {
        this.data = {};
        this.charts = {};
        this.map = null;
        this.currentAllocation = 'ai'; // 'ai' or 'need'
    }

    async initialize() {
        try {
            console.log('Loading Test 3 data...');

            // Load infrastructure data
            const [report, dangerScores, budgetAllocation, recommendations] = await Promise.all([
                api.getInfrastructureReport(),
                api.getDangerScores(),
                api.getBudgetAllocation(),
                api.getRecommendations()
            ]);

            this.data = {
                report,
                dangerScores,
                budgetAllocation,
                recommendations
            };

            console.log('Test 3 data loaded:', this.data);

            // Render components
            this.renderInterpretation();
            this.renderMetrics();
            this.renderMap();
            this.renderCharts();
            this.setupAllocationToggle();

        } catch (error) {
            console.error('Error loading Test 3:', error);
            document.getElementById('test3-content').innerHTML =
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
                    <li>AI allocates to ${this.data.report.summary.ai_projects} projects vs ${this.data.report.summary.need_based_projects} need-based projects</li>
                </ul>
            </div>
        `;
        document.getElementById('test3-interpretation').innerHTML = html;
    }

    renderMetrics() {
        const { ai_allocation, need_based_allocation, comparison } = this.data.budgetAllocation;

        const metrics = [
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
        ];

        const html = metrics.map(m => `
            <div class="metric-card">
                <h3>${m.title}</h3>
                <div class="value ${m.sentiment}">${m.value}</div>
                <div class="subtext">${m.subtext}</div>
            </div>
        `).join('');

        document.getElementById('test3-metrics').innerHTML = html;
    }

    renderMap() {
        this.map = new DurhamMap('map-infrastructure').initialize();

        // Add danger scores layer
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

        // Add recommendations layer
        this.updateRecommendationsLayer();

        // Add project type legend
        this.addProjectLegend();

        // Handle window resize
        window.addEventListener('resize', () => {
            if (this.map) this.map.invalidateSize();
        });
    }

    addProjectLegend() {
        const legend = L.control({ position: 'bottomright' });

        legend.onAdd = () => {
            const div = L.DomUtil.create('div', 'legend');
            div.innerHTML = `
                <h4>Project Types</h4>
                <div class="legend-item">
                    <span class="legend-color" style="background: #ffd700;"></span>
                    Crosswalk
                </div>
                <div class="legend-item">
                    <span class="legend-color" style="background: #4CAF50;"></span>
                    Bike Lane
                </div>
                <div class="legend-item">
                    <span class="legend-color" style="background: #2196F3;"></span>
                    Traffic Signal
                </div>
                <div class="legend-item">
                    <span class="legend-color" style="background: #FF9800;"></span>
                    Speed Reduction
                </div>
                <div style="margin-top: 0.5rem; padding-top: 0.5rem; border-top: 1px solid #ddd;">
                    <small>Marker size = project cost</small>
                </div>
            `;
            return div;
        };

        legend.addTo(this.map.map);
        this.legend = legend;
    }

    updateRecommendationsLayer() {
        const recs = this.currentAllocation === 'ai'
            ? this.data.recommendations.ai_recommendations
            : this.data.recommendations.need_based_recommendations;

        // Clear existing markers
        if (this.map.markers) {
            this.map.markers.forEach(m => this.map.map.removeLayer(m));
        }
        this.map.markers = [];

        // Add markers for recommendations
        recs.features.forEach(feature => {
            const props = feature.properties;
            const coords = feature.geometry.coordinates;
            const center = this.getPolygonCenter(coords);

            const marker = L.circleMarker([center[1], center[0]], {
                radius: Math.sqrt(props.cost / 10000),
                fillColor: this.getProjectColor(props.project_type),
                color: '#000',
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
        // Simple centroid calculation
        const ring = coords[0]; // First ring (outer boundary)
        let sumLat = 0, sumLon = 0;
        ring.forEach(([lon, lat]) => {
            sumLon += lon;
            sumLat += lat;
        });
        return [sumLon / ring.length, sumLat / ring.length];
    }

    getProjectColor(type) {
        const colors = {
            crosswalk: '#ffd700',
            bike_lane: '#4CAF50',
            traffic_signal: '#2196F3',
            speed_reduction: '#FF9800'
        };
        return colors[type] || '#666';
    }

    renderCharts() {
        this.renderSankeyChart();
        this.renderRadarChart();
    }

    renderSankeyChart() {
        const chart = echarts.init(document.getElementById('chart-sankey'));
        const { ai_allocation } = this.data.budgetAllocation;

        // Create Sankey data
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
                text: 'Budget Flow by Income Quintile (AI Allocation)',
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

        chart.setOption(option);
        this.charts.sankey = chart;

        window.addEventListener('resize', () => chart.resize());
    }

    renderRadarChart() {
        const chart = echarts.init(document.getElementById('chart-radar'));
        const { ai_allocation, need_based_allocation } = this.data.budgetAllocation;

        // Normalize metrics for radar (0-100 scale)
        const normalize = (val, max) => (val / max) * 100;

        const option = {
            title: {
                text: 'Equity Metrics Comparison',
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

        chart.setOption(option);
        this.charts.radar = chart;

        window.addEventListener('resize', () => chart.resize());
    }

    setupAllocationToggle() {
        const radios = document.querySelectorAll('input[name="allocation-type"]');
        radios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.currentAllocation = e.target.value;
                this.updateRecommendationsLayer();
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
    }
}
