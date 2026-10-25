/**
 * SAFE-T dashboard: tab orchestration. Test modules are lazy-loaded.
 */

import { resizeVisibleCharts } from './services/chartConfig.js';

/** @type {Record<string, { num: number, title: string, badge: 'real'|'modeled'|'simulated', badgeLabel: string, question: string, note: string }>} */
const PAGES = {
    test1: {
        num: 1,
        title: 'Foot traffic',
        badge: 'simulated',
        badgeLabel: 'Simulated',
        question: 'Do volume tools undercount walkers and cyclists in poorer tracts?',
        note: 'The undercount here is an assumed input, not a measurement. The page shows how the audit reads a vendor’s counts once a city shares them.',
    },
    test2: {
        num: 2,
        title: 'Crash history',
        badge: 'real',
        badgeLabel: 'Real data',
        question: 'Does ranking tracts by past crashes miss high-risk tracts in poorer neighborhoods?',
        note: 'NCDOT crash records and Census data. Each year is predicted only from the years before it, and every tract is judged against the same citywide cut.',
    },
    test3: {
        num: 3,
        title: 'Budget allocation',
        badge: 'modeled',
        badgeLabel: 'Partly simulated',
        question: 'Does a planning tool send safety money where crashes happen?',
        note: 'Need is measured: real crash rates per tract and OpenStreetMap infrastructure gaps. The planning tool is simulated, weighted toward higher-income tracts, to show what the audit catches.',
    },
    test4: {
        num: 4,
        title: 'Suppressed demand',
        badge: 'modeled',
        badgeLabel: 'Partly simulated',
        question: 'How many walking and cycling trips does missing infrastructure suppress?',
        note: 'Infrastructure gaps are real (OpenStreetMap). Potential demand and the detection models are simulated.',
    },
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
        document.querySelectorAll('#overview-content .hidden').forEach(el => el.classList.remove('hidden'));
        this.modules.overview.map?.invalidateSize();

        this.setupNavigation();
        const initial = location.hash.slice(1);
        if (PAGES[initial]) this.switchTest(initial, { focus: false });
    }

    setupNavigation() {
        const tabs = /** @type {HTMLElement[]} */ ([...document.querySelectorAll('.tab')]);
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

        tabs.forEach(tab => tab.addEventListener('click', () => this.switchTest(tab.dataset.test)));

        // WAI-ARIA tabs pattern: arrows, Home and End move between tabs while the tablist has focus
        tabsContainer.addEventListener('keydown', e => {
            const idx = tabs.findIndex(t => t.dataset.test === this.currentTest);
            const next = { ArrowRight: idx + 1, ArrowLeft: idx - 1, Home: 0, End: tabs.length - 1 }[e.key];
            if (next == null || !tabs[next]) return;
            e.preventDefault();
            this.switchTest(tabs[next].dataset.test);
        });

        // Escape hides an open badge tooltip until the pointer or focus leaves it (WCAG 1.4.13)
        document.addEventListener('keydown', e => {
            if (e.key !== 'Escape') return;
            document.querySelectorAll('.data-source-badge:hover, .data-source-badge:focus-visible')
                .forEach(b => b.classList.add('tooltip-dismissed'));
        });
        const reset = (/** @type {Event} */ e) => /** @type {HTMLElement} */ (e.target).closest?.('.data-source-badge')?.classList.remove('tooltip-dismissed');
        document.addEventListener('mouseout', reset);
        document.addEventListener('focusout', reset);

        window.addEventListener('navigate-test', (/** @type {CustomEvent} */ e) => this.switchTest(e.detail));
        window.addEventListener('hashchange', () => this.switchTest(location.hash.slice(1) || 'overview', { focus: false }));
    }

    /**
     * @param {string} testId
     * @param {{ focus?: boolean }} [opts]
     */
    async switchTest(testId, { focus = true } = {}) {
        if (testId === this.currentTest || !(testId === 'overview' || PAGES[testId])) return;
        this.currentTest = testId;

        document.querySelectorAll('.tab').forEach(tab => {
            const el = /** @type {HTMLElement} */ (tab);
            const isActive = el.dataset.test === testId;
            el.classList.toggle('active', isActive);
            el.setAttribute('aria-selected', String(isActive));
            el.tabIndex = isActive ? 0 : -1;
            if (isActive && focus && document.activeElement?.classList.contains('tab')) el.focus();
        });

        document.querySelectorAll('.test-content').forEach(content => {
            content.classList.toggle('active', content.id === `${testId}-content`);
        });

        history.replaceState(null, '', testId === 'overview' ? location.pathname : `#${testId}`);
        this.renderPageHead(testId);
        document.querySelector(`.tab[data-test="${testId}"]`)?.scrollIntoView({ block: 'nearest', inline: 'center' });
        if (window.scrollY > 200) window.scrollTo({ top: 0 });

        if (LOADERS[testId] && !this.modules[testId]) {
            const container = document.getElementById(`${testId}-content`);
            const skeleton = this.showSkeleton(container);
            const AuditClass = await LOADERS[testId]();
            this.modules[testId] = new AuditClass();
            await this.modules[testId].initialize();
            skeleton.remove();
        }

        // rAF fires after layout, so Leaflet measures the now-visible container
        requestAnimationFrame(() => {
            resizeVisibleCharts();
            this.modules[testId]?.map?.invalidateSize();
        });
    }

    /** @param {string} testId */
    renderPageHead(testId) {
        const el = document.getElementById('test-description');
        const p = PAGES[testId];
        if (!p) {
            el.innerHTML = '';
            return;
        }
        el.innerHTML = `
            <div class="page-head-inner">
                <p class="page-kicker">
                    <span>Test ${p.num} of 4 · ${p.title}</span>
                    <span class="data-source-badge ${p.badge}">${p.badgeLabel}</span>
                </p>
                <h2 class="page-question">${p.question}</h2>
                <p class="page-note">${p.note}</p>
            </div>
        `;
    }

    /** @param {HTMLElement} container */
    showSkeleton(container) {
        const el = document.createElement('div');
        el.className = 'skeleton-loading-overlay';
        el.setAttribute('aria-hidden', 'true');
        el.innerHTML = `
            <div class="skeleton-metrics">
                <div class="skeleton skeleton-metric"></div>
                <div class="skeleton skeleton-metric"></div>
                <div class="skeleton skeleton-metric"></div>
            </div>
            <div class="skeleton-overview-split">
                <div class="skeleton skeleton-overview-map"></div>
                <div class="skeleton skeleton-overview-right"></div>
            </div>
        `;
        container.prepend(el);
        return el;
    }
}

new App().initialize();
