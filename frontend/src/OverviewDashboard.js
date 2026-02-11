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
            valueField: 'error_pct'
        });

        this.map.addLegend();
        this.map.fitBounds(this.data.choroplethData);

        window.addEventListener('resize', () => {
            if (this.map) this.map.invalidateSize();
        });
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
        const { volumeReport, crashReport, demandReport, budgetAllocation } = this.data;

        const gap = volumeReport.by_income.equity_gap;
        const aiDI = budgetAllocation.ai_allocation.disparate_impact_ratio;

        renderInterpretation('overview-findings', [
            `Volume estimation accuracy varies by ${Math.abs(gap.gap).toFixed(1)} percentage points between income quintiles (p=${gap.p_value.toFixed(4)})`,
            ...(crashReport.findings?.slice(0, 1) || []),
            `AI allocates ${(aiDI * 100).toFixed(1)}% as much per-capita to Q1 as Q5, failing the 80% disparate impact threshold`,
            ...(demandReport.findings?.slice(0, 2) || [])
        ], 'Key Findings Across Tests');
    }
}
