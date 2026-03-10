import { getAuth, logout, clearAuth, startLogin, GATE_REPO, githubHeaders } from '/src/auth.js';

// ── Cached DOM refs ───────────────────────────────────────────
const saveBtnEl    = document.getElementById('save-btn');
const saveStatusEl = document.getElementById('save-status');
const authBannerEl = document.getElementById('auth-banner');
const progressWrap = document.getElementById('progress-wrap');
const trackerRoot  = document.getElementById('tracker-root');

// ── State ─────────────────────────────────────────────────────
let appState = null; // { data, sha, token, user }
let draftsDirty = false;
let lastSavedAt = null;
let saveTimeInterval = null;
let countdownInterval = null;
let trackerController = null;
let statusDropdownInstance = null;

// ── Data fetch / persist ──────────────────────────────────────
async function fetchAppData(token) {
    const res = await fetch(
        `https://api.github.com/repos/${GATE_REPO}/contents/application.json`,
        { headers: githubHeaders(token) }
    );
    if (res.status === 401) throw new Error('TOKEN_EXPIRED');
    if (res.status === 403 || res.status === 404) throw new Error('ACCESS_DENIED');
    if (!res.ok) throw new Error('DATA_FETCH_FAILED');
    const file = await res.json();
    const bytes = Uint8Array.from(atob(file.content.replace(/\n/g, '')), c => c.charCodeAt(0));
    return { data: JSON.parse(new TextDecoder().decode(bytes)), sha: file.sha };
}

function setSaveStatus(state) {
    saveStatusEl.dataset.state = state ?? '';
    saveStatusEl.textContent = { saving: 'Saving…', saved: 'Saved', error: 'Save failed' }[state] ?? '';
}

function markDirty() {
    draftsDirty = true;
    saveBtnEl.hidden = false;
    setSaveStatus(null);
}

function clearDirty() {
    draftsDirty = false;
    saveBtnEl.hidden = true;
}

function updateSaveTime() {
    if (draftsDirty) return;
    if (saveStatusEl.dataset.state === 'saving' || saveStatusEl.dataset.state === 'error') return;
    if (!lastSavedAt) { saveStatusEl.dataset.state = ''; saveStatusEl.textContent = ''; return; }
    const diff = Date.now() - lastSavedAt;
    const mins = Math.floor(diff / 60000);
    const hrs  = Math.floor(diff / 3600000);
    saveStatusEl.dataset.state = 'saved';
    saveStatusEl.textContent = mins < 1 ? 'Saved just now' : hrs < 1 ? `Saved ${mins}m ago` : `Saved ${hrs}h ago`;
}

function commitMsg(detail) {
    return `[tracker] ${detail} via ${appState?.user.login}`;
}

async function persistData(msg = commitMsg('update')) {
    if (!appState) return;
    setSaveStatus('saving');
    saveBtnEl.disabled = true;
    try {
        const json = JSON.stringify(appState.data, null, 2);
        const raw = new TextEncoder().encode(json);
        const binary = Array.from(raw, b => String.fromCharCode(b)).join('');
        const res = await fetch(
            `https://api.github.com/repos/${GATE_REPO}/contents/application.json`,
            {
                method: 'PUT',
                headers: { ...githubHeaders(appState.token), 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: msg, content: btoa(binary), sha: appState.sha }),
            }
        );
        if (!res.ok) {
            if (res.status === 401 || res.status === 403) authBannerEl.hidden = false;
            throw new Error('SAVE_FAILED');
        }
        appState.sha = (await res.json()).content.sha;
        lastSavedAt = Date.now();
        clearDirty();
        setSaveStatus(null);
        updateSaveTime();
    } catch {
        setSaveStatus('error');
    } finally {
        saveBtnEl.disabled = false;
    }
}

// ── Utility ───────────────────────────────────────────────────
const ESC_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;' };
function escHtml(str) {
    return str.replace(/[&<>]/g, c => ESC_MAP[c]);
}

// ── Dropdown helper ───────────────────────────────────────────
// Manages open/close, Escape, outside-click, aria-expanded, and arrow-key nav.
// optSelector: CSS selector for focusable options within the dropdown element.
function createDropdown(containerSelector, optSelector) {
    let active = null;
    let activeTrigger = null;
    const controller = new AbortController();
    const { signal } = controller;

    function close() {
        if (!active) return;
        active.hidden = true;
        activeTrigger?.setAttribute('aria-expanded', 'false');
        active = null;
        activeTrigger = null;
    }

    function open(dropdown, trigger) {
        close();
        dropdown.hidden = false;
        active = dropdown;
        activeTrigger = trigger ?? null;
        activeTrigger?.setAttribute('aria-expanded', 'true');
    }

    function toggle(dropdown, trigger) {
        const wasOpen = !dropdown.hidden;
        close();
        if (!wasOpen) open(dropdown, trigger);
    }

    document.addEventListener('keydown', e => {
        if (!active) return;
        if (e.key === 'Escape') { close(); return; }
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            const opts = [...active.querySelectorAll(optSelector)];
            const idx = opts.indexOf(active.querySelector(`${optSelector}:focus`));
            const next = e.key === 'ArrowDown'
                ? opts[Math.min(idx + 1, opts.length - 1)]
                : opts[Math.max(idx - 1, 0)];
            next?.focus();
        }
    }, { signal });

    document.addEventListener('click', e => {
        if (!e.target.closest(containerSelector)) close();
    }, { capture: true, signal });

    return { open, close, toggle, destroy: () => controller.abort() };
}

// ── Rendering ─────────────────────────────────────────────────
const STATUS_LABELS = {
    'done':        { label: 'Done',        cls: 'done' },
    'draft':       { label: 'Draft',       cls: 'draft' },
    'needs-info':  { label: 'Needs Info',  cls: 'needs-info' },
    'not-started': { label: 'Not Started', cls: 'not-started' },
    'action':      { label: 'Action',      cls: 'action' },
};
const STATUS_OPTS = ['done', 'draft', 'needs-info', 'not-started', 'action'];

function wordCount(text) {
    if (!text?.trim()) return 0;
    return text.trim().split(/\s+/).length;
}

function countDisplay(text, limit) {
    const isChars = limit?.includes('chars');
    if (isChars) {
        const n = text?.length ?? 0;
        const max = parseInt(limit);
        return `${n} / ${max} char${n === 1 ? '' : 's'}`;
    }
    const n = wordCount(text);
    if (!limit) return `${n} word${n === 1 ? '' : 's'}`;
    const max = parseInt(limit);
    return `${n} / ${max} word${n === 1 ? '' : 's'}`;
}

function isOverLimit(text, limit) {
    if (!limit) return false;
    if (limit.includes('chars')) return (text?.length ?? 0) > parseInt(limit);
    return wordCount(text) > parseInt(limit);
}

function ownerPill(owner, idx, type) {
    const members = appState?.data?.team_members ?? [];
    const opts = [
        `<button class="owner-opt${!owner ? ' current' : ''}" data-owner="" type="button" role="option" aria-selected="${!owner}">Unassigned</button>`,
        ...members.map(m =>
            `<button class="owner-opt${owner === m ? ' current' : ''}" data-owner="${escHtml(m)}" type="button" role="option" aria-selected="${owner === m}">${escHtml(m)}</button>`
        )
    ].join('');
    return `<div class="owner-wrap" data-idx="${idx}" data-type="${type}">
        <span class="owner-pill${owner ? ' assigned' : ''}" role="button" tabindex="0" aria-haspopup="listbox" aria-expanded="false">${owner ? escHtml(owner) : 'Unassigned'}</span>
        <div class="owner-dropdown" hidden role="listbox" aria-label="Assign owner">${opts}</div>
    </div>`;
}

function badge(status) {
    const s = STATUS_LABELS[status] ?? STATUS_LABELS['not-started'];
    return `<span class="status-badge ${s.cls}">${s.label}</span>`;
}

function editableBadge(si, qi, status) {
    const s = STATUS_LABELS[status] ?? STATUS_LABELS['not-started'];
    const opts = STATUS_OPTS.map(opt =>
        `<button class="status-opt${opt === status ? ' current' : ''}" data-status="${opt}" type="button" role="option" aria-selected="${opt === status}">${STATUS_LABELS[opt].label}</button>`
    ).join('');
    return `<div class="status-select" data-si="${si}" data-qi="${qi}">
        <span class="status-badge ${s.cls}" role="button" tabindex="0" aria-haspopup="listbox" aria-expanded="false">${s.label}</span>
        <div class="status-dropdown" hidden role="listbox" aria-label="Set status">${opts}</div>
    </div>`;
}

function sectionStatus(section) {
    const statuses = section.questions.map(q => q.status);
    if (statuses.every(s => s === 'done')) return 'done';
    if (statuses.some(s => s === 'action' || s === 'needs-info')) return 'needs-info';
    if (statuses.some(s => s === 'draft')) return 'draft';
    return 'not-started';
}

function updateProgress() {
    const all = appState.data.sections.flatMap(s => s.questions);
    const done = all.filter(q => q.status === 'done' || q.status === 'draft').length;
    const pct = Math.round((done / all.length) * 100);
    const fill = progressWrap.querySelector('.progress-bar-fill');
    if (fill) {
        fill.style.width = pct + '%';
        progressWrap.querySelector('.progress-bar-label').textContent =
            `${done} / ${all.length} questions addressed`;
    } else {
        progressWrap.innerHTML = `
            <div class="progress-bar-track"><div class="progress-bar-fill" style="width:${pct}%"></div></div>
            <span class="progress-bar-label">${done} / ${all.length} questions addressed</span>
        `;
    }
}

function updateSectionBadge(si) {
    const el = document.querySelector(`#tsec-${si} .tracker-section-right .status-badge`);
    if (!el) return;
    const s = STATUS_LABELS[sectionStatus(appState.data.sections[si])] ?? STATUS_LABELS['not-started'];
    el.className = `status-badge ${s.cls}`;
    el.textContent = s.label;
}

function renderTracker(sections) {
    // Tear down previous render's listeners and dropdown instance
    if (trackerController) trackerController.abort();
    if (statusDropdownInstance) statusDropdownInstance.destroy();
    trackerController = new AbortController();
    const { signal } = trackerController;
    const statusDropdown = createDropdown('.status-select', '.status-opt');
    statusDropdownInstance = statusDropdown;

    updateProgress();

    trackerRoot.innerHTML = sections.map((sec, si) => {
        const questions = sec.questions.map((q, qi) => {
            const reqBadge = q.required === false
                ? `<span class="optional-badge">Optional</span>`
                : `<span class="required-badge">Required</span>`;
            const limitBadge = q.limit ? `<span class="q-limit-label">Limit: ${escHtml(q.limit)}</span>` : '';
            const overLimit = isOverLimit(q.draft, q.limit);
            return `
            <div class="question-row">
                <span class="q-num">${escHtml(q.num ?? '')}</span>
                <div class="q-body">
                    <span class="q-prompt">${escHtml(q.prompt || q.name || '')}</span>
                    <div class="q-meta-line">${reqBadge}${limitBadge}</div>
                    ${q.note ? `<span class="q-note">${escHtml(q.note)}</span>` : ''}
                    <button class="q-draft-toggle" data-target="draft-${si}-${qi}" type="button">
                        <span class="toggle-label">${q.draft ? 'Hide draft' : 'Add draft'}</span>
                        <svg class="chevron-icon" width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true" focusable="false"><path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    </button>
                    <div class="q-draft-box ${q.draft ? 'open' : ''}" id="draft-${si}-${qi}">
                        <textarea class="q-draft-textarea" data-si="${si}" data-qi="${qi}" data-limit="${escHtml(q.limit || '')}" rows="5">${q.draft ? escHtml(q.draft) : ''}</textarea>
                        <button class="q-copy-btn" data-si="${si}" data-qi="${qi}" type="button">Copy</button>
                        <div class="draft-meta">
                            <span class="word-count${overLimit ? ' over-limit' : ''}" id="wc-${si}-${qi}">${countDisplay(q.draft, q.limit)}</span>
                        </div>
                    </div>
                </div>
                <div class="q-actions">${editableBadge(si, qi, q.status)}</div>
            </div>
        `;}).join('');

        return `
            <div class="tracker-section" id="tsec-${si}">
                <button class="tracker-section-header" type="button" aria-expanded="false">
                    <div class="tracker-section-left">
                        <span class="tracker-section-num">${escHtml(sec.num ?? '')}</span>
                        <span class="tracker-section-title">${escHtml(sec.title ?? '')}</span>
                    </div>
                    <div class="tracker-section-right">
                        ${badge(sectionStatus(sec))}
                        <span class="tracker-chevron"><svg class="chevron-icon" width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true" focusable="false"><path d="M3 5L7 9L11 5" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
                    </div>
                </button>
                <div class="tracker-section-body">${questions}</div>
            </div>
        `;
    }).join('');

    // ── Event delegation ──────────────────────────────────────
    trackerRoot.addEventListener('click', e => {
        const header = e.target.closest('.tracker-section-header');
        if (header) { toggleSection(header.closest('.tracker-section')); return; }

        const toggleBtn = e.target.closest('.q-draft-toggle');
        if (toggleBtn) {
            const box = document.getElementById(toggleBtn.dataset.target);
            const open = box.classList.toggle('open');
            const hasContent = !!box.querySelector('textarea').value;
            toggleBtn.querySelector('.toggle-label').textContent =
                open ? 'Hide draft' : (hasContent ? 'Show draft' : 'Add draft');
            return;
        }

        const copyBtn = e.target.closest('.q-copy-btn');
        if (copyBtn) {
            const ta = trackerRoot.querySelector(`.q-draft-textarea[data-si="${copyBtn.dataset.si}"][data-qi="${copyBtn.dataset.qi}"]`);
            if (!ta?.value) return;
            navigator.clipboard.writeText(ta.value).then(() => {
                copyBtn.textContent = 'Copied!';
                copyBtn.classList.add('copied');
                setTimeout(() => { copyBtn.textContent = 'Copy'; copyBtn.classList.remove('copied'); }, 2000);
            });
            return;
        }

        const badgeEl = e.target.closest('.status-select > .status-badge');
        if (badgeEl) {
            statusDropdown.toggle(badgeEl.closest('.status-select').querySelector('.status-dropdown'), badgeEl);
            return;
        }

        const opt = e.target.closest('.status-opt');
        if (opt) {
            const select = opt.closest('.status-select');
            const si = +select.dataset.si;
            const qi = +select.dataset.qi;
            const newStatus = opt.dataset.status;
            appState.data.sections[si].questions[qi].status = newStatus;
            statusDropdown.close();
            const s = STATUS_LABELS[newStatus] ?? STATUS_LABELS['not-started'];
            const b = select.querySelector('.status-badge');
            b.className = `status-badge ${s.cls}`;
            b.textContent = s.label;
            select.querySelectorAll('.status-opt').forEach(o => {
                o.classList.toggle('current', o.dataset.status === newStatus);
                o.setAttribute('aria-selected', o.dataset.status === newStatus);
            });
            updateSectionBadge(si);
            updateProgress();
            const q = appState.data.sections[si].questions[qi];
            persistData(commitMsg(`${q.num}: status → ${newStatus}`));
            return;
        }

        statusDropdown.close();
    }, { signal });

    trackerRoot.addEventListener('input', e => {
        const ta = e.target.closest('.q-draft-textarea');
        if (!ta) return;
        const si = +ta.dataset.si;
        const qi = +ta.dataset.qi;
        appState.data.sections[si].questions[qi].draft = ta.value || null;
        markDirty();
        const wcEl = document.getElementById(`wc-${si}-${qi}`);
        if (wcEl) {
            const limit = ta.dataset.limit || null;
            wcEl.textContent = countDisplay(ta.value, limit);
            wcEl.classList.toggle('over-limit', isOverLimit(ta.value, limit));
        }
    }, { signal });

    // Enter/Space to open status dropdown via keyboard
    trackerRoot.addEventListener('keydown', e => {
        if ((e.key === 'Enter' || e.key === ' ') && e.target.closest('.status-select > .status-badge')) {
            e.preventDefault();
            e.target.click();
        }
    }, { signal });
}

function toggleSection(sec, forceOpen) {
    const open = forceOpen !== undefined ? forceOpen : !sec.classList.contains('open');
    sec.classList.toggle('open', open);
    sec.querySelector('.tracker-section-header').setAttribute('aria-expanded', open);
}

const REQ_ICONS = {
    'action': `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true">
        <circle cx="8" cy="8" r="7"/>
        <line x1="8" y1="4.5" x2="8" y2="9"/>
        <circle cx="8" cy="11.5" r="0.85" fill="currentColor" stroke="none"/>
    </svg>`,
    'done': `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <circle cx="8" cy="8" r="7"/>
        <polyline points="4.5,8.5 7,11 11.5,5.5"/>
    </svg>`,
    'needs-info': `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true">
        <circle cx="8" cy="8" r="7"/>
        <line x1="8" y1="7.5" x2="8" y2="11.5"/>
        <circle cx="8" cy="5" r="0.85" fill="currentColor" stroke="none"/>
    </svg>`,
};

function reqIcon(status) {
    return `<span class="req-icon ${status}" aria-hidden="true">${REQ_ICONS[status] ?? REQ_ICONS['needs-info']}</span>`;
}

function renderList(el, items, type) {
    el.innerHTML = items.map((item, i) => `
        <li class="req-item ${item.status}">
            ${reqIcon(item.status)}
            <div class="req-body">
                <span class="req-text">${escHtml(item.text ?? '')}</span>
                ${item.note ? `<span class="req-note ${item.status === 'action' ? 'urgent' : ''}">${escHtml(item.note)}</span>` : ''}
                ${ownerPill(item.owner, i, type)}
            </div>
        </li>
    `).join('');
}

function renderRequirements(requirements, facts) {
    renderList(document.getElementById('req-list'), requirements, 'req');
    renderList(document.getElementById('facts-list'), facts, 'fact');
}

function setupOwnerDelegation(checklist) {
    const ownerDropdown = createDropdown('.owner-wrap', '.owner-opt');

    checklist.addEventListener('click', e => {
        const pill = e.target.closest('.owner-wrap > .owner-pill');
        if (pill) {
            const wrap = pill.closest('.owner-wrap');
            ownerDropdown.toggle(wrap.querySelector('.owner-dropdown'), pill);
            return;
        }

        const opt = e.target.closest('.owner-opt');
        if (opt) {
            const wrap = opt.closest('.owner-wrap');
            const idx = +wrap.dataset.idx;
            const type = wrap.dataset.type;
            const newOwner = opt.dataset.owner || null;
            if (type === 'req') appState.data.requirements[idx].owner = newOwner;
            else appState.data.facts[idx].owner = newOwner;
            const pill = wrap.querySelector('.owner-pill');
            pill.textContent = newOwner ?? 'Unassigned';
            pill.classList.toggle('assigned', !!newOwner);
            wrap.querySelectorAll('.owner-opt').forEach(o => {
                o.classList.toggle('current', (o.dataset.owner || null) === newOwner);
                o.setAttribute('aria-selected', (o.dataset.owner || null) === newOwner);
            });
            ownerDropdown.close();
            persistData(commitMsg(`${type} #${idx + 1}: owner → ${newOwner ?? 'unassigned'}`));
            return;
        }

        ownerDropdown.close();
    });
}

function renderCountdown() {
    const deadline = new Date('2026-04-03T23:59:00-07:00');
    const el = document.getElementById('countdown');
    function update() {
        const diff = deadline - Date.now();
        if (diff <= 0) { el.textContent = 'Deadline passed'; return; }
        const d = Math.floor(diff / 86400000);
        const h = Math.floor((diff % 86400000) / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        el.innerHTML = [['d', d], ['h', h], ['m', m]].map(([u, v]) =>
            `<div class="countdown-unit"><span class="countdown-value">${String(v).padStart(2,'0')}</span><span class="countdown-label">${u}</span></div>`
        ).join('');
    }
    update();
    clearInterval(countdownInterval);
    countdownInterval = setInterval(update, 60000);
}

function setupNav() {
    const tablist = document.getElementById('nav-tablist');
    const tabs = [...tablist.querySelectorAll('.nav-tab')];
    const panels = document.querySelectorAll('.tab-panel');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => {
                t.classList.remove('active');
                t.setAttribute('aria-selected', 'false');
                t.setAttribute('tabindex', '-1');
            });
            panels.forEach(p => p.classList.remove('active'));
            tab.classList.add('active');
            tab.setAttribute('aria-selected', 'true');
            tab.setAttribute('tabindex', '0');
            document.getElementById(`panel-${tab.dataset.panel}`).classList.add('active');
        });
    });

    tablist.addEventListener('keydown', e => {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        const idx = tabs.indexOf(document.activeElement);
        if (idx === -1) return;
        e.preventDefault();
        const next = e.key === 'ArrowRight'
            ? tabs[(idx + 1) % tabs.length]
            : tabs[(idx - 1 + tabs.length) % tabs.length];
        next.focus();
        next.click();
    });
}

function showTrackerSkeleton() {
    progressWrap.innerHTML = '<div class="skeleton skel-progress"></div>';
    trackerRoot.innerHTML = Array(5).fill('<div class="skeleton skel-section"></div>').join('');
}

function setupAppShell(user) {
    document.getElementById('login-wall').remove();
    document.getElementById('app').hidden = false;
    document.documentElement.removeAttribute('data-session');
    const avatar = document.getElementById('user-avatar');
    avatar.src = user.avatar_url;
    avatar.alt = user.login;
    document.getElementById('user-name').textContent = user.login;
    document.getElementById('logout-btn').addEventListener('click', logout);

    const avatarBtn = document.getElementById('avatar-btn');
    const avatarDropdown = document.getElementById('avatar-dropdown');
    avatarBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const open = !avatarDropdown.hidden;
        avatarDropdown.hidden = open;
        avatarBtn.setAttribute('aria-expanded', String(!open));
    });
    document.addEventListener('click', () => {
        avatarDropdown.hidden = true;
        avatarBtn.setAttribute('aria-expanded', 'false');
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            avatarDropdown.hidden = true;
            avatarBtn.setAttribute('aria-expanded', 'false');
        }
    });

    saveBtnEl.addEventListener('click', () => persistData(commitMsg('draft update')));
    renderCountdown();
    setupNav();
}

function renderAppData(data) {
    renderTracker(data.sections);
    renderRequirements(data.requirements, data.facts);
    setupOwnerDelegation(document.getElementById('panel-checklist'));
    clearInterval(saveTimeInterval);
    saveTimeInterval = setInterval(updateSaveTime, 30000);
}

async function restoreSession(auth) {
    setupAppShell(auth.user);
    showTrackerSkeleton();
    try {
        const { data, sha } = await fetchAppData(auth.token);
        appState = { data, sha, token: auth.token, user: auth.user };
        renderAppData(data);
    } catch (err) {
        if (err.message === 'TOKEN_EXPIRED') {
            logout();
        } else if (err.message === 'ACCESS_DENIED') {
            clearAuth();
            window.location.href = '/team/?error=org';
        } else {
            trackerRoot.innerHTML = '<p class="load-error">Failed to load data. Please refresh the page.</p>';
        }
    }
}

async function init() {
    document.getElementById('login-btn').addEventListener('click', startLogin);
    document.getElementById('banner-reauth-btn').addEventListener('click', startLogin);
    if (new URLSearchParams(location.search).get('error') === 'org') {
        const el = document.getElementById('login-error');
        el.innerHTML = 'Your account doesn\'t have access to the safe-t-ai organization. <a href="https://github.com/settings/connections/applications/Ov23li3dnFMUNHbu1SjZ" target="_blank" rel="noopener">Grant access in GitHub Settings</a>, then sign in again.';
        el.classList.add('visible');
    }
    const auth = getAuth();
    if (auth) await restoreSession(auth);
}

init();
