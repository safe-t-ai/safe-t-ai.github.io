/**
 * Overview Dashboard — aggregated summary across all equity tests
 */

import api from './services/api.js';
import { DurhamMap } from './components/common/DurhamMap.js';
import { setChartMeta, initViewToggle } from './services/renderUtils.js';

export class OverviewDashboard {
    constructor() {
        this.data = {};
        this.map = null;
        this.equityMap = null;
        this.currentEquityView = 'tdi';
    }

    async initialize() {
        const [volumeReport, crashReport, confusionMatrices, budgetAllocation, demandReport, choroplethData, equityContext] = await Promise.all([
            api.getTest1Report(),
            api.getCrashReport(),
            api.getConfusionMatrices(),
            api.getBudgetAllocation(),
            api.getDemandReport(),
            api.getChoroplethData(),
            api.getEquityContext(),
        ]);

        this.data = { volumeReport, crashReport, confusionMatrices, budgetAllocation, demandReport, choroplethData, equityContext };

        const tractCountEl = document.getElementById('tract-count');
        if (tractCountEl) tractCountEl.textContent = String(choroplethData.features.length);

        this.renderMethodology();
        this.renderMap();
        this.renderTestCards();
        this.renderEquityContext();
    }

    renderMap() {
        setChartMeta('overview-map', {
            badge: 'real',
            label: 'Real',
            tooltip: 'Median household income from the U.S. Census Bureau American Community Survey (ACS 5-year estimates).',
            description: 'Median household income across Durham census tracts. The equity tests that follow measure how AI transportation tools treat these areas differently.',
        });
        this.map = new DurhamMap('overview-map').initialize();

        const incomes = this.data.choroplethData.features
            .map(f => f.properties.median_income)
            .filter(v => v != null)
            .sort((a, b) => a - b);
        const quantile = (arr, q) => arr[Math.floor(arr.length * q)];
        const breaks = [0.2, 0.4, 0.6, 0.8].map(q => quantile(incomes, q));
        const fmt = v => `$${Math.round(v / 1000)}k`;

        this.map.addChoroplethLayer(this.data.choroplethData, {
            valueField: 'median_income',
            colors: ['#b45309', '#d97706', '#e2e8f0', '#0891b2', '#155e75'],
            breaks: [...breaks, Infinity],
            fillOpacity: 0.7,
            popupFields: [
                { label: 'Median Income', field: 'median_income', format: v => `$${v?.toLocaleString()}` },
                { label: 'Population', field: 'total_population', format: v => v?.toLocaleString() },
                { label: 'Minority %', field: 'pct_minority', format: v => `${v?.toFixed(1)}%` }
            ]
        });

        this.map.addLegend({
            title: 'Median Household Income',
            colorScale: [
                { color: '#b45309', label: `< ${fmt(breaks[0])}` },
                { color: '#d97706', label: `${fmt(breaks[0])} – ${fmt(breaks[1])}` },
                { color: '#e2e8f0', label: `${fmt(breaks[1])} – ${fmt(breaks[2])}` },
                { color: '#0891b2', label: `${fmt(breaks[2])} – ${fmt(breaks[3])}` },
                { color: '#155e75', label: `> ${fmt(breaks[3])}` }
            ]
        });

        this.map.fitBounds(this.data.choroplethData);

        this._onResize = () => {
            if (this.map && document.getElementById('overview-map')?.offsetParent !== null) {
                this.map.invalidateSize();
            }
        };
        window.addEventListener('resize', this._onResize);
    }

    renderMethodology() {
        const container = document.querySelector('.overview-right');
        const key = document.createElement('div');
        key.className = 'methodology-key';
        key.innerHTML = `
            <h3>Data Sources &amp; Vocabulary</h3>
            <div class="methodology-legend">
                <div class="methodology-item">
                    <span class="methodology-dot real"></span>
                    <span><strong>Real</strong> <span class="methodology-desc">— Census, NCDOT, and OpenStreetMap inputs</span></span>
                </div>
                <div class="methodology-item">
                    <span class="methodology-dot modeled"></span>
                    <span><strong>Modeled</strong> <span class="methodology-desc">— parametric models grounded in real infrastructure data</span></span>
                </div>
                <div class="methodology-item">
                    <span class="methodology-dot simulated"></span>
                    <span><strong>Simulated</strong> <span class="methodology-desc">— synthetic outputs replacing proprietary vendor data</span></span>
                </div>
            </div>
            <p class="methodology-vocab"><strong>Q1</strong> = lowest-income 20% of tracts; <strong>Q5</strong> = highest-income 20%. Each quintile contains the same number of census tracts.</p>
        `;
        container.appendChild(key);
    }

    renderTestCards() {
        const { volumeReport, crashReport, confusionMatrices, budgetAllocation, demandReport } = this.data;

        const q1Recall = (confusionMatrices.by_quintile['Q1 (Poorest)']?.recall ?? 0) * 100;
        const q5Recall = (confusionMatrices.by_quintile['Q5 (Richest)']?.recall ?? 0) * 100;

        const needQ1PerCap = budgetAllocation.need_based_allocation.per_capita['Q1 (Poorest)'];
        const needQ5PerCap = budgetAllocation.need_based_allocation.per_capita['Q5 (Richest)'];
        const needRatio = Math.round(needQ1PerCap / needQ5PerCap);

        const steps = [
            {
                test: 'test1',
                num: 1,
                label: 'Volume Estimation',
                value: `${Math.abs(volumeReport.by_income.equity_gap.gap).toFixed(1)}pp`,
                finding: 'AI undercounts pedestrians in low-income areas — the data gap that starts the chain',
                connector: 'trained on undercounted data',
                real: false,
            },
            {
                test: 'test2',
                num: 2,
                label: 'Crash Prediction',
                value: `${q1Recall.toFixed(0)}% → ${q5Recall.toFixed(0)}%`,
                finding: 'Q1 vs Q5 recall — AI misses danger in poor areas far more than wealthy areas',
                connector: 'safety budget follows the model',
                real: true,
            },
            {
                test: 'test3',
                num: 3,
                label: 'Infrastructure',
                value: `${needRatio}×`,
                finding: 'Q1 has far more per-capita need; AI allocates budgets nearly equally',
                connector: 'without infrastructure, people stay home',
                real: false,
            },
            {
                test: 'test4',
                num: 4,
                label: 'Suppressed Demand',
                value: `${demandReport.summary.suppression_rate.toFixed(0)}%`,
                finding: 'No trips → no signal → "no demand" — the false reading that closes the loop',
                connector: null,
                real: false,
            },
        ];

        const container = document.getElementById('overview-cards');
        container.innerHTML = `
            <div class="cascade-header">
                <div class="cascade-title">The compound effect</div>
            </div>
            <div class="cascade-steps">
                ${steps.map(s => `
                    <button class="cascade-step" data-test="${s.test}">
                        <div class="cascade-step-inner">
                            <div class="step-num">${s.num}</div>
                            <div class="cascade-step-body">
                                <div class="cascade-step-top">
                                    <span class="cascade-step-label">${s.label}</span>
                                    ${s.real ? '<span class="cascade-step-real">Real data</span>' : ''}
                                </div>
                                <div class="cascade-step-value">${s.value}</div>
                                <div class="cascade-step-finding">${s.finding}</div>
                            </div>
                        </div>
                    </button>
                    ${s.connector ? `<div class="cascade-connector">${s.connector}</div>` : ''}
                `).join('')}
            </div>
        `;

        container.addEventListener('click', (e) => {
            const btn = /** @type {HTMLElement} */ (e.target).closest('[data-test]');
            if (!btn) return;
            window.dispatchEvent(new CustomEvent('navigate-test', { detail: /** @type {HTMLElement} */ (btn).dataset.test }));
        });
    }

    renderEquityContext() {
        const VIEWS = {
            tdi: {
                field: 'tdi_score_county',
                title: 'Transportation Disadvantage Index (NCDOT)',
                tooltip: 'NCDOT Transportation Disadvantage Index — composite score combining income, minority status, disability, limited English proficiency, and zero-car households. Block group scores averaged to census tract. Source: NCDOT ArcGIS public service.',
                description: 'Higher score = greater transportation disadvantage relative to Durham County peers. Durham uses this for Bike Walk project prioritization.',
                colors: ['#fee5d9', '#fcbba1', '#fc9272', '#fb6a4a', '#ef3b2c', '#cb181d', '#99000d'],
                desc: '<strong>Transportation Disadvantage Index</strong><p>NCDOT composite score combining income, minority status, disability, limited English proficiency, and zero-car households. Higher = more disadvantaged. Durham uses this for Bike Walk project prioritization.</p>',
            },
            no_vehicle: {
                field: 'pct_no_vehicle',
                title: 'Zero-car Households (%)',
                tooltip: 'Percentage of households with no vehicle available. Source: U.S. Census ACS 5-year estimates, Table B08201.',
                description: 'Car-free households are most likely to walk and cycle for daily trips — and least likely to appear in Strava or StreetLight data.',
                colors: ['#f7fbff', '#deebf7', '#c6dbef', '#9ecae1', '#6baed6', '#3182bd', '#08519c'],
                desc: '<strong>Zero-car households</strong><p>Percentage of households with no vehicle available. Car-free residents are most likely to walk and cycle — and least likely to appear in Strava or StreetLight data. Source: Census ACS B08201.</p>',
            },
            bus_stops: {
                field: 'stops_per_1k',
                title: 'Bus Stop Density (per 1,000 residents)',
                tooltip: 'GoDurham bus stops per 1,000 residents per census tract. Source: GoDurham GTFS static feed. Boardings not in public GTFS.',
                description: 'High density marks transit-dependent populations — exactly the communities crowdsourced mobility data systematically misses.',
                colors: ['#f7fcf5', '#e5f5e0', '#c7e9c0', '#a1d99b', '#74c476', '#31a354', '#006d2c'],
                desc: '<strong>Bus stop density</strong><p>GoDurham stops per 1,000 residents. High density marks transit-dependent populations — exactly who crowdsourced mobility data misses. Source: GoDurham GTFS.</p>',
            },
        };

        const section = document.querySelector('.equity-context-section');
        section.classList.remove('hidden');

        this.equityMap = new DurhamMap('equity-context-map').initialize();

        const updateView = (viewKey) => {
            this.currentEquityView = viewKey;
            const v = VIEWS[viewKey];

            document.getElementById('equity-map-title').textContent = v.title;
            document.getElementById('equity-map-desc').textContent = v.description;

            const container = document.getElementById('equity-context-map').closest('.map-container');
            const badgeEl = container.querySelector('.data-source-badge');
            if (badgeEl) badgeEl.innerHTML = `Real<span class="tooltip">${v.tooltip}</span>`;

            document.getElementById('equity-var-desc').innerHTML = `<div class="equity-var-card">${v.desc}</div>`;

            const vals = this.data.equityContext.features
                .map(f => f.properties[v.field])
                .filter(x => x != null && x > 0)
                .sort((a, b) => a - b);
            const q = (p) => vals[Math.min(Math.floor(vals.length * p), vals.length - 1)];
            const breaks = [q(0.14), q(0.28), q(0.42), q(0.57), q(0.71), q(0.85), Infinity];

            if (this.equityMap.choroplethLayer) {
                this.equityMap.map.removeLayer(this.equityMap.choroplethLayer);
            }
            if (this.equityMap.legendControl) {
                this.equityMap.map.removeControl(this.equityMap.legendControl);
            }

            this.equityMap.addChoroplethLayer(this.data.equityContext, v.field, {
                colors: v.colors,
                breaks,
                fillOpacity: 0.7,
                popupFields: [
                    { label: 'TDI Score', field: 'tdi_score_county', format: val => val?.toFixed(1) ?? '—' },
                    { label: 'Zero-car households', field: 'pct_no_vehicle', format: val => val != null ? `${val.toFixed(1)}%` : '—' },
                    { label: 'Bus stops / 1k residents', field: 'stops_per_1k', format: val => val?.toFixed(1) ?? '—' },
                    { label: 'Median income', field: 'median_income', format: val => val != null ? `$${val.toLocaleString()}` : '—' },
                ],
            });

            const fmt = (v) => v >= 100 ? Math.round(v).toString() : v >= 10 ? v.toFixed(1) : v.toFixed(2);
            this.equityMap.addLegend({
                title: v.title,
                colorScale: [
                    { color: v.colors[0], label: `< ${fmt(breaks[1])}` },
                    { color: v.colors[2], label: `${fmt(breaks[1])} – ${fmt(breaks[3])}` },
                    { color: v.colors[4], label: `${fmt(breaks[3])} – ${fmt(breaks[5])}` },
                    { color: v.colors[6], label: `> ${fmt(breaks[5])}` },
                ],
            });

            this.equityMap.fitBounds(this.data.equityContext);
        };

        updateView('tdi');
        initViewToggle('toggle-equity-view', updateView);

        this._onEquityResize = () => {
            if (this.equityMap && document.getElementById('equity-context-map')?.offsetParent !== null) {
                this.equityMap.invalidateSize();
            }
        };
        window.addEventListener('resize', this._onEquityResize);
    }

    cleanup() {
        if (this._onResize) {
            window.removeEventListener('resize', this._onResize);
            this._onResize = null;
        }
        if (this._onEquityResize) {
            window.removeEventListener('resize', this._onEquityResize);
            this._onEquityResize = null;
        }
        if (this.map) {
            this.map.cleanup();
            this.map = null;
        }
        if (this.equityMap) {
            this.equityMap.cleanup();
            this.equityMap = null;
        }
    }

}
