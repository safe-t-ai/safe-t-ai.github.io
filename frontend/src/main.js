/**
 * SAFE-T: Safety Algorithm Fairness Evaluation for Transportation
 * Thin orchestrator — all test modules lazy-loaded
 */

import { resizeVisibleCharts } from './services/chartConfig.js';

const DESCRIPTIONS = {
    overview: '',
    test1: 'Simulating tools like Strava Metro and StreetLight: do they count people equally across neighborhoods?',
    test2: 'Training a crash model on real NCDOT data: does it predict danger equally across income levels?',
    test3: 'Simulating AI-weighted budget allocation: who gets safety infrastructure, and who doesn\u2019t?',
    test4: 'When poor infrastructure suppresses usage, can AI tools detect the hidden demand?'
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
            const isTarget = el.id === `${testId}-content`;
            el.classList.toggle('active', isTarget);
            // Re-trigger fade-in animation
            if (isTarget) {
                el.style.animation = 'none';
                el.offsetHeight; // force reflow
                el.style.animation = '';
            }
        });

        const descEl = document.getElementById('test-description');
        const desc = DESCRIPTIONS[testId];
        if (desc) {
            const testNum = testId.replace('test', '');
            descEl.innerHTML = `<div class="test-subtitle-inner"><span>${desc}</span><span class="test-position">${testNum} / 4</span></div>`;
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
        setTimeout(() => {
            resizeVisibleCharts();
            this.modules[testId]?.map?.invalidateSize();
        }, 50);
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
