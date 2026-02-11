/**
 * SAFE-T: Safety Algorithm Fairness Evaluation for Transportation
 * Thin orchestrator — all test modules lazy-loaded
 */

const DESCRIPTIONS = {
    overview: '',
    test1: 'Evaluating AI tools for demographic bias in pedestrian and cyclist volume predictions',
    test2: 'Evaluating AI crash prediction models for enforcement bias',
    test3: 'Evaluating AI infrastructure recommendations for equitable resource allocation',
    test4: 'Evaluating AI capability to detect suppressed demand in underserved areas'
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
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.switchTest(e.currentTarget.dataset.test);
            });
        });

        window.addEventListener('navigate-test', (e) => {
            this.switchTest(e.detail);
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
        setTimeout(() => window.dispatchEvent(new Event('resize')), 50);
    }
}

const app = new App();
app.initialize();
