/**
 * Overview Dashboard — aggregated summary across all equity tests
 */

import api from './services/api.js';
import { DurhamMap } from './components/common/DurhamMap.js';
import { renderInterpretation } from './services/renderUtils.js';

export class OverviewDashboard {
    constructor() {
        this.data = {};
        this.map = null;
    }

    async initialize() {
        const [volumeReport, crashReport, budgetAllocation, demandReport, choroplethData] = await Promise.all([
            api.getTest1Report(),
            api.getCrashReport(),
            api.getBudgetAllocation(),
            api.getDemandReport(),
            api.getChoroplethData()
        ]);

        this.data = { volumeReport, crashReport, budgetAllocation, demandReport, choroplethData };

        const tractCountEl = document.getElementById('tract-count');
        if (tractCountEl) tractCountEl.textContent = String(choroplethData.features.length);

        this.renderMethodology();
        this.renderMap();
        this.renderTestCards();
        this.renderFindings();
    }

    renderMap() {
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
        container.insertBefore(key, container.firstChild);
    }

    renderTestCards() {
        const { volumeReport, crashReport, budgetAllocation, demandReport } = this.data;

        const q1Error = crashReport.error_by_quintile['Q1 (Poorest)'];
        const q5Error = crashReport.error_by_quintile['Q5 (Richest)'];

        const hero = {
            test: 'test1',
            label: 'Volume Estimation',
            value: `${Math.abs(volumeReport.by_income.equity_gap.gap).toFixed(1)}pp`,
            finding: 'Accuracy gap between highest and lowest income quintiles'
        };

        const secondary = [
            {
                test: 'test2',
                label: 'Crash Prediction',
                value: `${q1Error.error_pct.toFixed(0)}% vs ${q5Error.error_pct.toFixed(0)}%`,
                finding: 'Q1 vs Q5 prediction error rate'
            },
            {
                test: 'test3',
                label: 'Infrastructure',
                value: `${(budgetAllocation.ai_allocation.disparate_impact_ratio * 100).toFixed(1)}%`,
                finding: 'Disparate impact ratio in AI budget allocation'
            },
            {
                test: 'test4',
                label: 'Suppressed Demand',
                value: `${demandReport.summary.suppression_rate.toFixed(0)}%`,
                finding: 'Potential demand suppressed by poor infrastructure'
            }
        ];

        const container = document.getElementById('overview-cards');
        container.innerHTML = `
            <button class="stat-hero" data-test="${hero.test}">
                <div class="stat-label">${hero.label}</div>
                <div class="stat-value">${hero.value}</div>
                <div class="stat-desc">${hero.finding}</div>
            </button>
            <div class="stat-row">
                ${secondary.map(s => `
                    <button class="stat-secondary" data-test="${s.test}">
                        <div class="stat-label">${s.label}</div>
                        <div class="stat-value">${s.value}</div>
                        <div class="stat-desc">${s.finding}</div>
                    </button>
                `).join('')}
            </div>
        `;

        container.addEventListener('click', (e) => {
            const btn = /** @type {HTMLElement} */ (e.target).closest('[data-test]');
            if (!btn) return;
            window.dispatchEvent(new CustomEvent('navigate-test', { detail: /** @type {HTMLElement} */ (btn).dataset.test }));
        });
    }

    renderFindings() {
        renderInterpretation('overview-findings', [
            'The same low-income tracts that volume tools undercount also receive the least safety funding — undercounting leads directly to underinvestment',
            'Crash models perform worst where volume data is least accurate, compounding one test\'s bias into the next test\'s safety outcomes',
            'Most cycling and walking demand in low-income areas goes unrecorded, so AI tools trained on observed data reinforce the pattern across all four tests'
        ], 'Cross-Cutting Findings');
    }
}
