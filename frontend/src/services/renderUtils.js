/**
 * Shared rendering utilities for metric cards and interpretation sections
 */

export function renderMetrics(elementId, metrics) {
    document.getElementById(elementId).innerHTML = metrics.map(m => `
        <div class="metric-card">
            <h3>${m.title}</h3>
            <div class="value ${m.sentiment}">${m.value}</div>
            <div class="subtext">${m.subtext}</div>
        </div>
    `).join('');
}

export function initViewToggle(containerId, onChange) {
    const container = document.getElementById(containerId);
    const options = container.querySelectorAll('.view-toggle-option');
    const indicator = container.querySelector('.view-toggle-indicator');

    function activate(option) {
        const current = container.querySelector('.view-toggle-option.active');
        if (current === option) return;
        options.forEach(o => o.classList.remove('active'));
        option.classList.add('active');
        indicator.style.width = `${option.offsetWidth}px`;
        indicator.style.transform = `translateX(${option.offsetLeft}px)`;
        onChange(option.dataset.value);
    }

    const active = container.querySelector('.view-toggle-option.active');
    indicator.style.width = `${active.offsetWidth}px`;
    indicator.style.transform = `translateX(${active.offsetLeft}px)`;

    options.forEach(option => {
        option.addEventListener('click', () => activate(option));
    });
}

export function renderInterpretation(elementId, findings, title = 'Key Findings') {
    if (!findings || findings.length === 0) return;

    document.getElementById(elementId).innerHTML = `
        <div class="interpretation">
            <h3>${title}</h3>
            <ul>
                ${findings.map(f => `<li>${f}</li>`).join('')}
            </ul>
        </div>
    `;
}
