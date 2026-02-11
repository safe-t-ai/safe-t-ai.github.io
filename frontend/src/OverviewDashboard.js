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

        this.renderMap();
        this.renderTestCards();
        this.renderFindings();
    }

    renderMap() {
        this.map = new DurhamMap('overview-map').initialize();

        this.map.addChoroplethLayer(this.data.choroplethData, {
            valueField: 'median_income',
            colors: ['#b45309', '#d97706', '#e2e8f0', '#0891b2', '#155e75'],
            breaks: [48000, 65000, 80000, 93000, Infinity],
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
                { color: '#b45309', label: '< $48k' },
                { color: '#d97706', label: '$48k – $65k' },
                { color: '#e2e8f0', label: '$65k – $80k' },
                { color: '#0891b2', label: '$80k – $93k' },
                { color: '#155e75', label: '> $93k' }
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

    renderTestCards() {
        const { volumeReport, crashReport, budgetAllocation, demandReport } = this.data;

        const q1Error = crashReport.error_by_quintile['Q1 (Poorest)'];
        const q5Error = crashReport.error_by_quintile['Q5 (Richest)'];

        const cards = [
            {
                test: 'test1',
                label: 'Volume Estimation',
                value: `${Math.abs(volumeReport.by_income.equity_gap.gap).toFixed(1)}pp`,
                finding: 'Accuracy gap between highest and lowest income quintiles'
            },
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

        document.getElementById('overview-cards').innerHTML = cards.map(c => `
            <button class="overview-card" data-test="${c.test}">
                <div class="card-label">${c.label}</div>
                <div class="card-value">${c.value}</div>
                <div class="card-finding">${c.finding}</div>
            </button>
        `).join('');

        document.getElementById('overview-cards').addEventListener('click', (e) => {
            const card = e.target.closest('.overview-card');
            if (!card) return;
            window.dispatchEvent(new CustomEvent('navigate-test', { detail: card.dataset.test }));
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
