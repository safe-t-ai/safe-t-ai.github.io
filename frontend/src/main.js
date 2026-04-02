/**
 * SAFE-T: Safety Algorithm Fairness Evaluation for Transportation
 * Thin orchestrator — all test modules lazy-loaded
 */

import { resizeVisibleCharts } from './services/chartConfig.js';

const DESCRIPTIONS = {
    overview: '',
    test1: 'Audit methodology for AI volume estimation: do these tools count pedestrians and cyclists equitably across income levels?',
    test2: 'Training a crash prediction model on real NCDOT data: does AI model error vary by neighborhood income?',
    test3: 'When AI allocates safety budgets, does it account for where danger is actually highest?',
    test4: 'When poor infrastructure suppresses usage, can AI tools detect the hidden demand?'
};

const SO_WHAT = {
    test1: 'Crowdsourced tools like Strava underrepresent low-income areas — seeding a data gap that compounds through every downstream decision.',
    test2: 'Trained on reported crashes alone, AI predicts danger far less accurately in low-income tracts — missing 71% of high-risk areas vs 33% in wealthy ones.',
    test3: 'When safety budgets follow AI predictions, the allocation gap follows the prediction gap — money goes where data is dense, not where need is highest.',
    test4: 'Without infrastructure, people don\u2019t walk or bike. No trips means no signal. The absence of demand looks like confirmation that nothing should be built.'
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
        const { OverviewDashboard } = await import('./OverviewDashboard.js');
        this.modules.overview = new OverviewDashboard();
        await this.modules.overview.initialize();

        document.getElementById('overview-skeleton')?.remove();
        document.querySelector('#overview-content .overview-banner')?.classList.remove('hidden');
        document.querySelector('#overview-content .content-split')?.classList.remove('hidden');

        this.setupNavigation();
    }

    setupNavigation() {
        const tabs = /** @type {HTMLElement[]} */ ([...document.querySelectorAll('.tab')]);
        const tabIds = tabs.map(t => t.dataset.test);

        // Gradient fade for scrollable tabs
        const tabsContainer = /** @type {HTMLElement} */ (document.querySelector('.tabs'));
        const tabsBarInner = /** @type {HTMLElement} */ (document.querySelector('.tabs-bar-inner'));
        const checkOverflow = () => {
            const hasOverflow = tabsContainer.scrollWidth > tabsContainer.clientWidth;
            const atEnd = tabsContainer.scrollLeft + tabsContainer.clientWidth >= tabsContainer.scrollWidth - 4;
            tabsBarInner.classList.toggle('has-overflow', hasOverflow && !atEnd);
        };
        tabsContainer.addEventListener('scroll', checkOverflow, { passive: true });
        window.addEventListener('resize', checkOverflow);
        checkOverflow();

        tabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.switchTest(/** @type {HTMLElement} */ (e.currentTarget).dataset.test);
            });
        });

        window.addEventListener('navigate-test', (/** @type {CustomEvent} */ e) => {
            this.switchTest(e.detail);
        });

        document.addEventListener('keydown', (e) => {
            const target = /** @type {HTMLElement} */ (e.target);
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
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
            const el = /** @type {HTMLElement} */ (tab);
            const isActive = el.dataset.test === testId;
            el.classList.toggle('active', isActive);
            el.setAttribute('aria-selected', String(isActive));
        });

        document.querySelectorAll('.test-content').forEach(content => {
            const el = /** @type {HTMLElement} */ (content);
            el.classList.toggle('active', el.id === `${testId}-content`);
        });

        const descEl = document.getElementById('test-description');
        const desc = DESCRIPTIONS[testId];
        if (desc) {
            const testNum = testId.replace('test', '');
            const soWhat = SO_WHAT[testId];
            descEl.innerHTML = `<div class="test-subtitle-inner"><span>${desc}</span><span class="test-position">${testNum} / 4</span></div>${soWhat ? `<p class="test-so-what">${soWhat}</p>` : ''}`;
        } else {
            descEl.textContent = '';
        }

        if (LOADERS[testId] && !this.modules[testId]) {
            const container = document.getElementById(`${testId}-content`);
            const skeleton = this.showSkeleton(container);
            const AuditClass = await LOADERS[testId]();
            this.modules[testId] = new AuditClass();
            await this.modules[testId].initialize();
            skeleton.remove();
        }

        // Scroll active tab into view
        const activeTab = document.querySelector(`.tab[data-test="${testId}"]`);
        activeTab?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });

        this.currentTest = testId;
        // Wait for layout to settle before resizing — rAF fires after paint,
        // preventing gray Leaflet tiles from a premature invalidateSize call.
        requestAnimationFrame(() => {
            resizeVisibleCharts();
            this.modules[testId]?.map?.invalidateSize();
        });
    }

    showSkeleton(container) {
        const el = document.createElement('div');
        el.className = 'skeleton-loading-overlay';
        el.innerHTML = `
            <div class="skeleton-metrics">
                <div class="skeleton skeleton-metric"></div>
                <div class="skeleton skeleton-metric"></div>
                <div class="skeleton skeleton-metric"></div>
            </div>
            <div class="skeleton skeleton-map"></div>
            <div class="skeleton-group">
                <div class="skeleton skeleton-chart"></div>
                <div class="skeleton skeleton-chart"></div>
            </div>
        `;
        container.prepend(el);
        return el;
    }
}

const app = new App();
app.initialize();
