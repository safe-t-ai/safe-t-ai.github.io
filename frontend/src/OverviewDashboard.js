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

        const rb = crashReport.racial_baseline;
        if (rb) {
            const popEl = document.getElementById('banner-black-population-pct');
            const victimEl = document.getElementById('banner-black-victim-pct');
            if (popEl) popEl.textContent = rb.black_population_pct.toFixed(0);
            if (victimEl) victimEl.textContent = rb.black_victim_pct.toFixed(0);
        }

        this.renderMethodology();
        this.renderMap();
        this.renderTestCards();
    }

    renderMap() {
        const VIEWS = {
            income: {
                label: 'Real',
                badge: 'real',
                tooltip: 'Median household income from the U.S. Census Bureau American Community Survey (ACS 5-year estimates).',
                description: 'Median household income across Durham census tracts. Income quintiles (Q1–Q5) are the stratification axis for all four audit tests.',
                title: 'Durham Income Distribution by Census Tract',
                getData: () => this.data.choroplethData,
                field: 'median_income',
                colors: ['#b45309', '#d97706', '#e2e8f0', '#0891b2', '#155e75'],
                getBreaks(vals) {
                    const q = p => vals[Math.floor(vals.length * p)];
                    return [q(0.2), q(0.4), q(0.6), q(0.8), Infinity];
                },
                getLegend(colors, breaks) {
                    const fmt = v => `$${Math.round(v / 1000)}k`;
                    return {
                        title: 'Median Household Income',
                        colorScale: [
                            { color: colors[0], label: `< ${fmt(breaks[0])}` },
                            { color: colors[1], label: `${fmt(breaks[0])} – ${fmt(breaks[1])}` },
                            { color: colors[2], label: `${fmt(breaks[1])} – ${fmt(breaks[2])}` },
                            { color: colors[3], label: `${fmt(breaks[2])} – ${fmt(breaks[3])}` },
                            { color: colors[4], label: `> ${fmt(breaks[3])}` },
                        ],
                    };
                },
                popupFields: [
                    { label: 'Median Income', field: 'median_income', format: v => `$${v?.toLocaleString()}` },
                    { label: 'Population', field: 'total_population', format: v => v?.toLocaleString() },
                    { label: 'Minority %', field: 'pct_minority', format: v => `${v?.toFixed(1)}%` },
                ],
            },
            tdi: {
                label: 'Real',
                badge: 'real',
                tooltip: 'NCDOT Transportation Disadvantage Index — 0–21 composite score. Each of 7 indicators (race, income, vehicle access, disability, elderly, youth, limited English proficiency) scored 1–3 based on how a block group compares to other Durham County block groups. Block group scores averaged to census tract. Source: NCDOT ArcGIS public service.',
                description: 'Composite score 0–21: higher = greater transportation disadvantage relative to other Durham tracts. Durham uses TDI for Bike Walk project prioritization.',
                title: 'Transportation Disadvantage Index (NCDOT)',
                getData: () => this.data.equityContext,
                field: 'tdi_score_county',
                colors: ['#fee5d9', '#fcbba1', '#fc9272', '#fb6a4a', '#ef3b2c', '#cb181d', '#99000d'],
                getBreaks(vals) {
                    const q = p => vals[Math.min(Math.floor(vals.length * p), vals.length - 1)];
                    return [q(0.14), q(0.28), q(0.42), q(0.57), q(0.71), q(0.85), Infinity];
                },
                getLegend(colors, breaks) {
                    const fmt = v => v >= 100 ? Math.round(v).toString() : v >= 10 ? v.toFixed(1) : v.toFixed(2);
                    return {
                        title: 'TDI Score (County)',
                        colorScale: [
                            { color: colors[0], label: `< ${fmt(breaks[1])}` },
                            { color: colors[2], label: `${fmt(breaks[1])} – ${fmt(breaks[3])}` },
                            { color: colors[4], label: `${fmt(breaks[3])} – ${fmt(breaks[5])}` },
                            { color: colors[6], label: `> ${fmt(breaks[5])}` },
                        ],
                    };
                },
                popupFields: [
                    { label: 'TDI Score', field: 'tdi_score_county', format: v => v?.toFixed(1) ?? '—' },
                    { label: 'Disability %', field: 'disability_pct', format: v => v != null ? `${v.toFixed(1)}%` : '—' },
                    { label: 'Zero-car households', field: 'pct_no_vehicle', format: v => v != null ? `${v.toFixed(1)}%` : '—' },
                    { label: 'Bus stops / 1k residents', field: 'stops_per_1k', format: v => v?.toFixed(1) ?? '—' },
                    { label: 'Median income', field: 'median_income', format: v => v != null ? `$${v.toLocaleString()}` : '—' },
                ],
            },
            no_vehicle: {
                label: 'Real',
                badge: 'real',
                tooltip: 'Percentage of households with no vehicle available. Source: U.S. Census ACS 5-year estimates, Table B08201.',
                description: 'Car-free households are most likely to walk and cycle — and least likely to appear in Strava or StreetLight data.',
                title: 'Zero-car Households (%)',
                getData: () => this.data.equityContext,
                field: 'pct_no_vehicle',
                colors: ['#f7fbff', '#deebf7', '#c6dbef', '#9ecae1', '#6baed6', '#3182bd', '#08519c'],
                getBreaks(vals) {
                    const q = p => vals[Math.min(Math.floor(vals.length * p), vals.length - 1)];
                    return [q(0.14), q(0.28), q(0.42), q(0.57), q(0.71), q(0.85), Infinity];
                },
                getLegend(colors, breaks) {
                    const fmt = v => v >= 100 ? Math.round(v).toString() : v >= 10 ? v.toFixed(1) : v.toFixed(2);
                    return {
                        title: 'Zero-car Households (%)',
                        colorScale: [
                            { color: colors[0], label: `< ${fmt(breaks[1])}` },
                            { color: colors[2], label: `${fmt(breaks[1])} – ${fmt(breaks[3])}` },
                            { color: colors[4], label: `${fmt(breaks[3])} – ${fmt(breaks[5])}` },
                            { color: colors[6], label: `> ${fmt(breaks[5])}` },
                        ],
                    };
                },
                popupFields: [
                    { label: 'TDI Score', field: 'tdi_score_county', format: v => v?.toFixed(1) ?? '—' },
                    { label: 'Zero-car households', field: 'pct_no_vehicle', format: v => v != null ? `${v.toFixed(1)}%` : '—' },
                    { label: 'Bus stops / 1k residents', field: 'stops_per_1k', format: v => v?.toFixed(1) ?? '—' },
                    { label: 'Median income', field: 'median_income', format: v => v != null ? `$${v.toLocaleString()}` : '—' },
                ],
            },
            bus_stops: {
                label: 'Real',
                badge: 'real',
                tooltip: 'GoDurham bus stops per 1,000 residents per census tract. Source: GoDurham GTFS static feed. Boardings not in public GTFS.',
                description: 'High density marks transit-dependent populations — exactly who crowdsourced mobility data systematically misses.',
                title: 'Bus Stop Density (per 1,000 residents)',
                getData: () => this.data.equityContext,
                field: 'stops_per_1k',
                colors: ['#f7fcf5', '#e5f5e0', '#c7e9c0', '#a1d99b', '#74c476', '#31a354', '#006d2c'],
                getBreaks(vals) {
                    const q = p => vals[Math.min(Math.floor(vals.length * p), vals.length - 1)];
                    return [q(0.14), q(0.28), q(0.42), q(0.57), q(0.71), q(0.85), Infinity];
                },
                getLegend(colors, breaks) {
                    const fmt = v => v >= 100 ? Math.round(v).toString() : v >= 10 ? v.toFixed(1) : v.toFixed(2);
                    return {
                        title: 'Bus Stops / 1,000 Residents',
                        colorScale: [
                            { color: colors[0], label: `< ${fmt(breaks[1])}` },
                            { color: colors[2], label: `${fmt(breaks[1])} – ${fmt(breaks[3])}` },
                            { color: colors[4], label: `${fmt(breaks[3])} – ${fmt(breaks[5])}` },
                            { color: colors[6], label: `> ${fmt(breaks[5])}` },
                        ],
                    };
                },
                popupFields: [
                    { label: 'TDI Score', field: 'tdi_score_county', format: v => v?.toFixed(1) ?? '—' },
                    { label: 'Zero-car households', field: 'pct_no_vehicle', format: v => v != null ? `${v.toFixed(1)}%` : '—' },
                    { label: 'Bus stops / 1k residents', field: 'stops_per_1k', format: v => v?.toFixed(1) ?? '—' },
                    { label: 'Median income', field: 'median_income', format: v => v != null ? `$${v.toLocaleString()}` : '—' },
                ],
            },
        };

        this.map = new DurhamMap('overview-map').initialize();

        const updateView = (viewKey) => {
            const v = VIEWS[viewKey];
            const data = v.getData();

            document.getElementById('overview-map-title').textContent = v.title;
            setChartMeta('overview-map', { badge: v.badge, label: v.label, tooltip: v.tooltip, description: v.description });

            const vals = data.features
                .map(f => f.properties[v.field])
                .filter(x => x != null && x > 0)
                .sort((a, b) => a - b);
            const breaks = v.getBreaks(vals);

            if (this.map.choroplethLayer) this.map.map.removeLayer(this.map.choroplethLayer);
            if (this.map.legendControl) this.map.map.removeControl(this.map.legendControl);

            this.map.addChoroplethLayer(data, v.field, { colors: v.colors, breaks, fillOpacity: 0.7, popupFields: v.popupFields });
            this.map.addLegend(v.getLegend(v.colors, breaks));
            this.map.fitBounds(data);
        };

        updateView('income');
        initViewToggle('toggle-overview-map', updateView);

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
                connector: 'if trained on undercounted data',
                badge: 'simulated', badgeLabel: 'Simulated',
            },
            {
                test: 'test2',
                num: 2,
                label: 'Crash Data',
                value: `${q1Recall.toFixed(0)}% → ${q5Recall.toFixed(0)}%`,
                finding: 'The crash data itself has structural patterns that make Q1 danger harder to detect — 38pp worse recall in the poorest tracts',
                connector: 'predictions trained on this data shape safety budgets',
                badge: 'real', badgeLabel: 'Real data',
            },
            {
                test: 'test3',
                num: 3,
                label: 'Infrastructure',
                value: `${needRatio}×`,
                finding: 'Q1 has far more per-capita need; AI allocates budgets nearly equally',
                connector: 'without infrastructure, people stay home',
                badge: 'modeled', badgeLabel: 'Modeled',
            },
            {
                test: 'test4',
                num: 4,
                label: 'Suppressed Demand',
                value: `${demandReport.summary.suppression_rate.toFixed(0)}%`,
                finding: 'No trips → no signal → "no demand" — the false reading that closes the loop',
                connector: null,
                badge: 'modeled', badgeLabel: 'Modeled',
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
                                    <span class="cascade-step-badge data-source-badge ${s.badge}">${s.badgeLabel}</span>
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

    cleanup() {
        if (this._onResize) {
            window.removeEventListener('resize', this._onResize);
            this._onResize = null;
        }
        if (this.map) {
            this.map.cleanup();
            this.map = null;
        }
    }
}
