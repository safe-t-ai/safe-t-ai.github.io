/**
 * SAFE-T: Safety Algorithm Fairness Evaluation for Transportation
 * Thin orchestrator — all test modules lazy-loaded
 */

import { resizeVisibleCharts } from './services/chartConfig.js';

const DESCRIPTIONS = {
    overview: '',
    test1: 'Does AI count pedestrians and cyclists equally across all neighborhoods?',
    test2: 'Does AI predict crashes as accurately in low-income areas as wealthy ones?',
    test3: 'When AI recommends where to spend safety budgets, who benefits?',
    test4: 'Can AI see demand that poor infrastructure has made invisible?'
};

// Literal paths required for Vite code splitting
const LOADERS = {
    test1: () => import('./VolumeEstimationAudit.js').then(m => m.VolumeEstimationAudit),
    test2: () => import('./CrashPredictionAudit.js').then(m => m.CrashPredictionAudit),
    test3: () => import('./InfrastructureAudit.js').then(m => m.InfrastructureAudit),
    test4: () => import('./SuppressedDemandAudit.js').then(m => m.SuppressedDemandAudit),
};

class App {
    constructor() {
        this.modules = {};
        this.currentTest = 'overview';
    }

    async initialize() {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('app').style.display = 'block';

        const { OverviewDashboard } = await import('./OverviewDashboard.js');
        this.modules.overview = new OverviewDashboard();
        await this.modules.overview.initialize();

        this.setupNavigation();
    }

    setupNavigation() {
        const tabs = [...document.querySelectorAll('.tab')];
        const tabIds = tabs.map(t => t.dataset.test);

        tabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.switchTest(e.currentTarget.dataset.test);
            });
        });

        window.addEventListener('navigate-test', (e) => {
            this.switchTest(e.detail);
        });

        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;

            const idx = tabIds.indexOf(this.currentTest);
            const next = e.key === 'ArrowRight'
                ? tabIds[idx + 1]
                : tabIds[idx - 1];
            if (next) this.switchTest(next);
        });
    }

    async switchTest(testId) {
        if (testId === this.currentTest) return;

        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.test === testId);
        });

        document.querySelectorAll('.test-content').forEach(content => {
            content.classList.toggle('active', content.id === `${testId}-content`);
        });

        document.getElementById('test-description').textContent = DESCRIPTIONS[testId];

        if (LOADERS[testId] && !this.modules[testId]) {
            const loading = document.getElementById('loading');
            loading.style.display = 'flex';
            const AuditClass = await LOADERS[testId]();
            this.modules[testId] = new AuditClass();
            await this.modules[testId].initialize();
            loading.style.display = 'none';
        }

        this.currentTest = testId;
        setTimeout(() => {
            resizeVisibleCharts();
            this.modules[testId]?.map?.invalidateSize();
        }, 50);
    }
}

const app = new App();
app.initialize();
