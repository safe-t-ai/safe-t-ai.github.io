/**
 * Overview: what is measured, what waits on vendor data, and the city map.
 */

import api from './services/api.js';
import { DurhamMap } from './components/common/DurhamMap.js';
import { setChartMeta, initViewToggle } from './services/renderUtils.js';

const Q1 = 'Q1 (Poorest)';
const Q5 = 'Q5 (Richest)';

const SEQ = {
    orange: ['#fff7ec', '#fdd49e', '#fc8d59', '#d7301f', '#7f0000'],
    red: ['#fee5d9', '#fcae91', '#fb6a4a', '#de2d26', '#a50f15'],
    blue: ['#eff3ff', '#bdd7e7', '#6baed6', '#3182bd', '#08519c'],
    green: ['#edf8e9', '#bae4b3', '#74c476', '#31a354', '#006d2c'],
};

const PROTOCOL = [
    {
        test: 'test1',
        title: 'Foot traffic',
        badge: 'simulated',
        badgeLabel: 'Simulated',
        question: 'Do Strava or StreetLight counts undercount walkers and cyclists in poorer tracts?',
        needs: 'Tract-level volume estimates from the vendor, checked against local counters.',
    },
    {
        test: 'test3',
        title: 'Budget allocation',
        badge: 'modeled',
        badgeLabel: 'Partly simulated',
        question: 'Does a planning tool send safety money where crashes happen?',
        needs: 'The tool’s project list. The need side already uses real crash rates.',
    },
    {
        test: 'test4',
        title: 'Suppressed demand',
        badge: 'modeled',
        badgeLabel: 'Partly simulated',
        question: 'How many trips would happen if the sidewalks and bike lanes existed?',
        needs: 'Counts before and after new infrastructure is built.',
    },
];

const quintileBreaks = vals => {
    const q = p => vals[Math.min(Math.floor(vals.length * p), vals.length - 1)];
    return [q(0.2), q(0.4), q(0.6), q(0.8), Infinity];
};

export class OverviewDashboard {
    constructor() {
        this.data = {};
        this.map = null;
    }

    async initialize() {
        const [crashReport, crashGeo, choroplethData, equityContext] = await Promise.all([
            api.getCrashReport(),
            api.getCrashGeoData(),
            api.getChoroplethData(),
            api.getEquityContext(),
        ]);
        this.data = { crashReport, crashGeo, choroplethData, equityContext };

        this.renderHero();
        this.renderCards();
        this.renderMap();
    }

    renderHero() {
        const r = this.data.crashReport;
        const years = r.summary.years_analyzed;
        const rates = r.rate_per_1k_by_quintile;
        const set = (id, text) => { document.getElementById(id).textContent = text; };

        set('hero-years', `${years[0]}–${years.at(-1)}`);
        set('hero-ratio', `${r.rate_ratio_q1_q5.toFixed(1)}×`);
        set('hero-black-victims', `${r.racial_baseline.black_victim_pct.toFixed(0)}%`);
        set('hero-black-pop', `${r.racial_baseline.black_population_pct.toFixed(0)}%`);
        set('hero-crashes', r.summary.total_crashes.toLocaleString());
        set('hero-tracts', String(r.summary.tracts_analyzed));
        this.renderHeroChart(rates);
    }

    /** @param {Record<string, number>} rates */
    renderHeroChart(rates) {
        const keys = Object.keys(rates);
        const W = 300, H = 140, base = 116, top = 18, gap = 12;
        const bw = (W - gap * (keys.length - 1)) / keys.length;
        const max = Math.max(...keys.map(k => rates[k]));
        const colors = ['#fb923c', '#fbbf24', '#cbd5e1', '#93c5fd', '#60a5fa'];
        const bars = keys.map((k, i) => {
            const h = ((base - top) * rates[k]) / max;
            const x = i * (bw + gap);
            return `
                <rect class="hero-bar" x="${x}" y="${base - h}" width="${bw}" height="${h}" rx="3" fill="${colors[i]}" style="animation-delay:${i * 50}ms"></rect>
                <text class="hero-bar-label" x="${x + bw / 2}" y="${base - h - 6}" text-anchor="middle">${rates[k].toFixed(2)}</text>
                <text class="hero-axis-label" x="${x + bw / 2}" y="${base + 16}" text-anchor="middle">Q${i + 1}</text>`;
        }).join('');
        const summary = keys.map((k, i) => `Q${i + 1} ${rates[k].toFixed(2)}`).join(', ');
        document.getElementById('hero-chart').insertAdjacentHTML('afterbegin',
            `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Crash rate per 1,000 residents by income fifth, poorest first: ${summary}">${bars}</svg>`);
    }

    renderCards() {
        const d = this.data.crashReport.detection_by_quintile;
        const container = document.getElementById('overview-cards');
        container.innerHTML = `
            <section class="finding-card" aria-labelledby="finding-title">
                <div class="card-kicker">
                    <span class="data-source-badge real">Real data</span>
                    <span>Test 2 · Crash history</span>
                </div>
                <h3 id="finding-title">Does ranking tracts by past crashes miss high-risk tracts in poor neighborhoods?</h3>
                <p class="finding-answer"><strong>Not detectably.</strong> Counting a tract as high-risk in a year when its crash count is above the citywide 67th percentile, crash history flagged ${d[Q1].flagged} of ${d[Q1].high_risk} such cases in the poorest fifth of tracts and ${d[Q5].flagged} of ${d[Q5].high_risk} in the richest. The richest fifth has few high-risk tract-years, so the comparison is loose.</p>
                <p class="finding-note">The disparity is in how many crashes happen, not in whether crash history notices them. Crash records can't show crashes that go unreported.</p>
                <button class="link-button" data-test="test2">See the analysis <span aria-hidden="true">→</span></button>
            </section>

            <section class="protocol" aria-labelledby="protocol-title">
                <div class="protocol-head">
                    <h3 id="protocol-title">Ready for vendor data</h3>
                </div>
                <p class="protocol-note">These tabs show what each audit would catch, using assumed inputs. They are not findings about Durham. Each one runs on a vendor tool's outputs once a city shares them.</p>
                <ul class="protocol-list">
                    ${PROTOCOL.map(p => `
                        <li>
                            <button class="protocol-item" data-test="${p.test}">
                                <span class="step-num" aria-hidden="true">${p.test.slice(-1)}</span>
                                <span class="protocol-body">
                                    <span class="protocol-title">${p.title} <span class="data-source-badge ${p.badge}">${p.badgeLabel}</span></span>
                                    <span class="protocol-question">${p.question}</span>
                                    <span class="protocol-needs">Needs: ${p.needs}</span>
                                </span>
                                <span class="protocol-arrow" aria-hidden="true">→</span>
                            </button>
                        </li>
                    `).join('')}
                </ul>
            </section>
        `;

        container.addEventListener('click', e => {
            const btn = /** @type {HTMLElement} */ (e.target).closest('[data-test]');
            if (btn) window.dispatchEvent(new CustomEvent('navigate-test', { detail: /** @type {HTMLElement} */ (btn).dataset.test }));
        });
    }

    renderMap() {
        const { choroplethData, equityContext, crashGeo } = this.data;
        const years = this.data.crashReport.summary.years_analyzed;
        const money = v => `$${Math.round(v / 1000)}k`;
        const num = v => (v >= 10 ? v.toFixed(0) : v.toFixed(1));
        const commonPopup = [
            { label: 'Median income', field: 'median_income', format: v => (v != null ? `$${v.toLocaleString()}` : '—') },
        ];

        const VIEWS = {
            income: {
                title: 'Median household income',
                tooltip: 'U.S. Census ACS 5-year estimates.',
                description: 'Income quintiles (Q1 poorest to Q5 richest) are how every test groups tracts.',
                data: choroplethData, field: 'median_income', colors: SEQ.blue, fmt: money,
                popup: [...commonPopup,
                    { label: 'Population', field: 'total_population', format: v => v?.toLocaleString() },
                    { label: 'Minority', field: 'pct_minority', format: v => `${v?.toFixed(0)}%` }],
            },
            crash_rate: {
                title: `Pedestrian and cyclist crashes per 1,000 residents a year (${years[0]}–${years.at(-1)})`,
                tooltip: 'NCDOT non-motorist crash records joined to Census tracts.',
                description: `The poorest fifth of tracts averages ${this.data.crashReport.rate_ratio_q1_q5.toFixed(1)}× the rate of the richest.`,
                data: crashGeo, field: 'rate_per_1k', colors: SEQ.red, fmt: v => v.toFixed(2),
                popup: [...commonPopup,
                    { label: 'Income quintile', field: 'income_quintile' },
                    { label: 'Crashes / 1k / yr', field: 'rate_per_1k', format: v => v?.toFixed(2) }],
            },
            tdi: {
                title: 'Transportation Disadvantage Index',
                tooltip: 'NCDOT composite, 0–21: seven indicators (race, income, vehicle access, disability, age, youth, limited English) each scored 1–3 against other Durham block groups, averaged to tract.',
                description: 'Durham uses this index to prioritize Bike Walk projects. Higher means more disadvantaged.',
                data: equityContext, field: 'tdi_score_county', colors: SEQ.orange, fmt: num,
                popup: [{ label: 'TDI score', field: 'tdi_score_county', format: v => v?.toFixed(1) ?? '—' },
                    { label: 'Disability', field: 'disability_pct', format: v => (v != null ? `${v.toFixed(1)}%` : '—') }, ...commonPopup],
            },
            no_vehicle: {
                title: 'Households with no car',
                tooltip: 'U.S. Census ACS 5-year estimates, table B08201.',
                description: 'Car-free households walk and ride transit most, and show up least in app-based mobility data.',
                data: equityContext, field: 'pct_no_vehicle', colors: SEQ.blue, fmt: v => `${v.toFixed(0)}%`,
                popup: [{ label: 'No-car households', field: 'pct_no_vehicle', format: v => (v != null ? `${v.toFixed(1)}%` : '—') }, ...commonPopup],
            },
            bus_stops: {
                title: 'Bus stops per 1,000 residents',
                tooltip: 'GoDurham GTFS static feed. Boardings are not in the public feed.',
                description: 'Dense stops mark transit-dependent areas.',
                data: equityContext, field: 'stops_per_1k', colors: SEQ.green, fmt: num,
                popup: [{ label: 'Stops / 1k residents', field: 'stops_per_1k', format: v => v?.toFixed(1) ?? '—' }, ...commonPopup],
            },
        };

        this.map = new DurhamMap('overview-map').initialize();

        const show = key => {
            const v = VIEWS[key];
            document.getElementById('overview-map-title').textContent = v.title;
            setChartMeta('overview-map', { badge: 'real', label: 'Real data', tooltip: v.tooltip, description: v.description });

            const vals = v.data.features.map(f => f.properties[v.field]).filter(x => x != null && x > 0).sort((a, b) => a - b);
            const breaks = quintileBreaks(vals);

            if (this.map.choroplethLayer) this.map.map.removeLayer(this.map.choroplethLayer);
            if (this.map.legendControl) this.map.map.removeControl(this.map.legendControl);
            this.map.addChoroplethLayer(v.data, v.field, { colors: v.colors, breaks, fillOpacity: 0.72, popupFields: v.popup });
            this.map.addLegend({
                title: v.title.replace(/ \(.*\)$/, ''),
                colorScale: v.colors.map((color, i) => ({
                    color,
                    label: i === 0 ? `< ${v.fmt(breaks[0])}` : i === 4 ? `> ${v.fmt(breaks[3])}` : `${v.fmt(breaks[i - 1])} – ${v.fmt(breaks[i])}`,
                })),
            });
        };

        show('income');
        initViewToggle('toggle-overview-map', show);

        this._onResize = () => {
            if (document.getElementById('overview-map')?.offsetParent !== null) this.map?.invalidateSize();
        };
        window.addEventListener('resize', this._onResize);
    }

    cleanup() {
        if (this._onResize) window.removeEventListener('resize', this._onResize);
        this.map?.cleanup();
        this.map = null;
    }
}
