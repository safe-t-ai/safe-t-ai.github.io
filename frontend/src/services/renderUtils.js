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
