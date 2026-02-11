/**
 * Suppressed Demand Analysis
 */

import echarts from './services/echarts.js';
import api from './services/api.js';
import { DurhamMap } from './components/common/DurhamMap.js';
import { COLORS } from './services/chartConfig.js';

export class SuppressedDemandAudit {
    constructor() {
        this.data = {};
        this.charts = {};
        this.map = null;
        this.currentView = 'suppressed'; // 'potential', 'actual', or 'suppressed'
    }

    async initialize() {
        const [report, funnel, correlationMatrix, scorecard, demandGeoData] = await Promise.all([
            api.getDemandReport(),
            api.getDemandFunnel(),
            api.getCorrelationMatrix(),
            api.getDetectionScorecard(),
            api.getDemandGeoData()
        ]);

        this.data = { report, funnel, correlationMatrix, scorecard, demandGeoData };

        this.renderInterpretation();
        this.renderMetrics();
        this.renderMap();
        this.renderCharts();
        this.setupViewToggle();
    }

    renderInterpretation() {
        const { findings } = this.data.report;
        const html = `
            <div class="interpretation">
                <h3>Key Findings</h3>
                <ul>
                    ${findings.map(f => `<li>${f}</li>`).join('')}
                </ul>
            </div>
        `;
        document.getElementById('test4-interpretation').innerHTML = html;
    }

    renderMetrics() {
        const { summary } = this.data.report;

        const metrics = [
            {
                title: 'Suppressed Demand',
                value: summary.total_suppressed_demand.toLocaleString() + ' trips/day',
                subtext: `${summary.suppression_rate.toFixed(1)}% of potential lost`,
                sentiment: 'value-danger'
            },
            {
                title: 'High-Suppression Areas',
                value: summary.high_suppression_tracts.toString(),
                subtext: 'Tracts with >70% suppression',
                sentiment: 'value-warning'
            },
            {
                title: 'Naive AI Accuracy',
                value: (summary.naive_ai_correlation * 100).toFixed(1) + '%',
                subtext: 'Fails to detect suppressed demand',
                sentiment: 'value-danger'
            },
            {
                title: 'Sophisticated AI',
                value: (summary.sophisticated_ai_correlation * 100).toFixed(1) + '%',
                subtext: 'Partial detection capability',
                sentiment: 'value-warning'
            }
        ];

        const html = metrics.map(m => `
            <div class="metric-card">
                <h3>${m.title}</h3>
                <div class="value ${m.sentiment}">${m.value}</div>
                <div class="subtext">${m.subtext}</div>
            </div>
        `).join('');

        document.getElementById('test4-metrics').innerHTML = html;
    }

    renderMap() {
        this.map = new DurhamMap('map-demand').initialize();

        this.updateDemandLayer();

        window.addEventListener('resize', () => {
            if (this.map) this.map.invalidateSize();
        });
    }

    updateDemandLayer() {
        const fieldMap = {
            'potential': 'potential_demand',
            'actual': 'actual_demand',
            'suppressed': 'suppressed_demand'
        };

        const titleMap = {
            'potential': 'Potential Demand',
            'actual': 'Actual Demand',
            'suppressed': 'Suppressed Demand'
        };

        const field = fieldMap[this.currentView];
        const title = titleMap[this.currentView];

        if (this.map.choroplethLayer) {
            this.map.map.removeLayer(this.map.choroplethLayer);
        }

        const colors = this.currentView === 'suppressed'
            ? ['#fee5d9', '#fcbba1', '#fc9272', '#fb6a4a', '#ef3b2c', '#cb181d', '#99000d']
            : ['#f7fbff', '#deebf7', '#c6dbef', '#9ecae1', '#6baed6', '#3182bd', '#08519c'];

        this.map.addChoroplethLayer(
            this.data.demandGeoData,
            field,
            {
                fillOpacity: 0.7,
                colors: colors,
                breaks: this.currentView === 'suppressed'
                    ? [20, 40, 60, 80, 100, 150, 200]
                    : [200, 300, 400, 500, 600, 700, 800],
                popupFields: [
                    { label: 'Income Quintile', field: 'income_quintile' },
                    { label: 'Potential Demand', field: 'potential_demand', format: v => `${v?.toFixed(0)} trips/day` },
                    { label: 'Actual Demand', field: 'actual_demand', format: v => `${v?.toFixed(0)} trips/day` },
                    { label: 'Suppressed Demand', field: 'suppressed_demand', format: v => `${v?.toFixed(0)} trips/day` }
                ]
            }
        );

        this.addDemandLegend(title);
    }

    addDemandLegend(title) {
        if (this.legend) {
            this.map.map.removeControl(this.legend);
        }

        const legend = L.control({ position: 'bottomright' });

        legend.onAdd = () => {
            const div = L.DomUtil.create('div', 'legend');
            if (this.currentView === 'suppressed') {
                div.innerHTML = `
                    <h4>${title}</h4>
                    <div style="margin-top: 0.5rem;">
                        <div class="legend-item">
                            <span class="legend-color" style="background: #99000d;"></span>
                            >150 trips/day
                        </div>
                        <div class="legend-item">
                            <span class="legend-color" style="background: #fb6a4a;"></span>
                            60-150
                        </div>
                        <div class="legend-item">
                            <span class="legend-color" style="background: #fcbba1;"></span>
                            20-60
                        </div>
                        <div class="legend-item">
                            <span class="legend-color" style="background: #fee5d9;"></span>
                            <20
                        </div>
                    </div>
                `;
            } else {
                div.innerHTML = `
                    <h4>${title}</h4>
                    <div style="margin-top: 0.5rem;">
                        <div class="legend-item">
                            <span class="legend-color" style="background: #08519c;"></span>
                            >600 trips/day
                        </div>
                        <div class="legend-item">
                            <span class="legend-color" style="background: #6baed6;"></span>
                            400-600
                        </div>
                        <div class="legend-item">
                            <span class="legend-color" style="background: #deebf7;"></span>
                            200-400
                        </div>
                        <div class="legend-item">
                            <span class="legend-color" style="background: #f7fbff;"></span>
                            <200
                        </div>
                    </div>
                `;
            }
            return div;
        };

        legend.addTo(this.map.map);
        this.legend = legend;
    }

    renderCharts() {
        this.renderFunnelChart();
        this.renderCorrelationMatrix();
        this.renderDetectionScorecard();
    }

    renderFunnelChart() {
        const chart = echarts.init(document.getElementById('chart-funnel'));
        const { 'Q1 (Poorest)': q1, 'Q5 (Richest)': q5 } = this.data.funnel;

        const option = {
            title: {
                text: 'Demand Suppression Pipeline',
                left: 'center',
                textStyle: { fontSize: 14, fontWeight: 'normal' }
            },
            tooltip: {
                trigger: 'item',
                formatter: '{b}: {c}%'
            },
            legend: {
                data: ['Q1 (Poorest)', 'Q5 (Richest)'],
                bottom: 10
            },
            series: [
                {
                    name: 'Q1 (Poorest)',
                    type: 'funnel',
                    left: '5%',
                    width: '40%',
                    label: {
                        formatter: '{b}: {c}%'
                    },
                    labelLine: {
                        show: true
                    },
                    itemStyle: {
                        borderColor: '#fff',
                        borderWidth: 1
                    },
                    emphasis: {
                        label: {
                            fontSize: 14
                        }
                    },
                    data: [
                        { value: q1.stage1_potential, name: 'Potential' },
                        { value: q1.stage2_destinations, name: 'Has Destinations' },
                        { value: q1.stage3_would_use_if_safe, name: 'Would Use If Safe' },
                        { value: q1.stage4_actually_use, name: 'Actually Use' }
                    ],
                    color: COLORS.error
                },
                {
                    name: 'Q5 (Richest)',
                    type: 'funnel',
                    left: '55%',
                    width: '40%',
                    label: {
                        formatter: '{b}: {c}%'
                    },
                    labelLine: {
                        show: true
                    },
                    itemStyle: {
                        borderColor: '#fff',
                        borderWidth: 1
                    },
                    emphasis: {
                        label: {
                            fontSize: 14
                        }
                    },
                    data: [
                        { value: q5.stage1_potential, name: 'Potential' },
                        { value: q5.stage2_destinations, name: 'Has Destinations' },
                        { value: q5.stage3_would_use_if_safe, name: 'Would Use If Safe' },
                        { value: q5.stage4_actually_use, name: 'Actually Use' }
                    ],
                    color: COLORS.success
                }
            ]
        };

        chart.setOption(option);
        this.charts.funnel = chart;

        window.addEventListener('resize', () => chart.resize());
    }

    renderCorrelationMatrix() {
        const chart = echarts.init(document.getElementById('chart-correlation'));
        const { variables, correlations } = this.data.correlationMatrix;

        const data = correlations.map(item => {
            const x = variables.indexOf(item.variable1);
            const y = variables.indexOf(item.variable2);
            return [x, y, item.correlation];
        });

        const displayNames = variables.map(v => {
            return v.replace('_', ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        });

        const option = {
            title: {
                text: 'Variable Correlation Matrix',
                left: 'center',
                textStyle: { fontSize: 14, fontWeight: 'normal' }
            },
            tooltip: {
                position: 'top',
                formatter: (params) => {
                    const var1 = displayNames[params.data[0]];
                    const var2 = displayNames[params.data[1]];
                    const corr = params.data[2];
                    return `${var1} ↔ ${var2}<br/>Correlation: ${corr.toFixed(3)}`;
                }
            },
            grid: {
                height: '65%',
                top: '15%',
                left: '20%'
            },
            xAxis: {
                type: 'category',
                data: displayNames,
                splitArea: { show: true },
                axisLabel: { interval: 0, rotate: 45, fontSize: 10 }
            },
            yAxis: {
                type: 'category',
                data: displayNames,
                splitArea: { show: true },
                axisLabel: { fontSize: 10 }
            },
            visualMap: {
                min: -1,
                max: 1,
                calculable: true,
                orient: 'horizontal',
                left: 'center',
                bottom: '5%',
                inRange: {
                    color: ['#313695', '#4575b4', '#74add1', '#abd9e9', '#e0f3f8', '#ffffbf', '#fee090', '#fdae61', '#f46d43', '#d73027', '#a50026']
                }
            },
            series: [{
                type: 'heatmap',
                data: data,
                label: {
                    show: true,
                    formatter: (params) => params.data[2].toFixed(2),
                    fontSize: 10
                },
                emphasis: {
                    itemStyle: {
                        shadowBlur: 10,
                        shadowColor: 'rgba(0, 0, 0, 0.5)'
                    }
                }
            }]
        };

        chart.setOption(option);
        this.charts.correlation = chart;

        window.addEventListener('resize', () => chart.resize());
    }

    renderDetectionScorecard() {
        const chart = echarts.init(document.getElementById('chart-scorecard'));
        const { naive_ai, sophisticated_ai, human_expert_baseline } = this.data.scorecard;

        function scorecardData(d) {
            const correlation = d.correlation_with_potential * 100;
            const detection = d.detection_rate_high_suppression;
            const inverseBias = Math.max(0, 100 + d.bias_q1);
            const overall = (correlation + detection + inverseBias) / 3;
            return [correlation.toFixed(1), detection.toFixed(1), inverseBias.toFixed(1), overall.toFixed(1)];
        }

        const seriesEntries = [
            { name: 'Naive AI (Strava-style)', data: naive_ai, color: '#c2410c' },
            { name: 'Sophisticated AI', data: sophisticated_ai, color: '#d97706' },
            { name: 'Human Expert', data: human_expert_baseline, color: COLORS.success },
        ];

        const option = {
            title: {
                text: 'AI Detection Capability Comparison',
                left: 'center',
                textStyle: { fontSize: 14, fontWeight: 'normal' }
            },
            tooltip: {
                trigger: 'axis',
                axisPointer: { type: 'shadow' }
            },
            legend: {
                data: seriesEntries.map(s => s.name),
                bottom: 10
            },
            grid: {
                left: '15%',
                right: '4%',
                bottom: '20%',
                containLabel: true
            },
            xAxis: {
                type: 'category',
                data: [
                    'Correlation\nwith Potential',
                    'Detection Rate\n(High Suppression)',
                    'Inverse Bias\n(Q1)',
                    'Overall\nScore'
                ],
                axisLabel: { interval: 0, fontSize: 11 }
            },
            yAxis: {
                type: 'value',
                name: 'Score (0-100)',
                max: 100
            },
            series: seriesEntries.map(s => ({
                name: s.name,
                type: 'bar',
                data: scorecardData(s.data),
                itemStyle: { color: s.color }
            }))
        };

        chart.setOption(option);
        this.charts.scorecard = chart;

        window.addEventListener('resize', () => chart.resize());
    }

    setupViewToggle() {
        const radios = document.querySelectorAll('input[name="demand-view"]');
        radios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.currentView = e.target.value;
                this.updateDemandLayer();
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
