/**
 * Apache ECharts configuration factory
 * Provides consistent styling across all visualizations
 */

import echarts from './echarts.js';

// Single debounced resize handler for all charts
/** @type {Set<any>} */
const activeCharts = new Set();
/** @type {ReturnType<typeof setTimeout> | undefined} */
let resizeTimer;

function resizeVisibleCharts() {
    activeCharts.forEach(chart => {
        if (!chart.isDisposed() && chart.getDom().offsetParent !== null) {
            chart.resize();
        }
    });
}

window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resizeVisibleCharts, 150);
});

export { resizeVisibleCharts };

const FONT_FAMILY = '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif';

// Shared tooltip style matching design tokens
const TOOLTIP_STYLE = {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
    borderWidth: 0,
    borderRadius: 6,
    padding: [8, 12],
    textStyle: {
        color: 'rgba(255,255,255,0.85)',
        fontSize: 13,
        fontFamily: FONT_FAMILY
    },
    extraCssText: 'box-shadow: 0 4px 12px rgba(0,0,0,0.15);'
};

// Entrance animation defaults
const ANIMATION_DEFAULTS = {
    animationDuration: 600,
    animationEasing: 'cubicOut',
    animationDelay: (/** @type {number} */ idx) => idx * 80
};

/**
 * @param {string} elementId
 * @param {any} config
 * @returns {any}
 */
export function initChart(elementId, config) {
    // Global font family for all text rendered on canvas
    config.textStyle = { fontFamily: FONT_FAMILY, ...(config.textStyle || {}) };
    // Merge tooltip style and animation defaults
    config.tooltip = { ...TOOLTIP_STYLE, ...(config.tooltip || {}) };
    if (!config.animationDuration) {
        Object.assign(config, ANIMATION_DEFAULTS);
    }
    // Colorblind-accessible decal patterns on all series
    config.aria = { decal: { show: true }, ...(config.aria || {}) };

    const chart = echarts.init(document.getElementById(elementId));
    chart.setOption(config);
    activeCharts.add(chart);
    const originalDispose = chart.dispose.bind(chart);
    chart.dispose = () => {
        activeCharts.delete(chart);
        originalDispose();
    };
    return chart;
}

function isMobile() {
    return window.innerWidth <= 768;
}

/**
 * @param {number} desktop
 * @param {number} mobile
 * @returns {number}
 */
function getResponsiveFontSize(desktop, mobile) {
    return isMobile() ? mobile : desktop;
}

function getResponsiveGrid() {
    return isMobile()
        ? { left: '5%', right: '5%', bottom: '10%', top: '15%', containLabel: true }
        : { left: '3%', right: '4%', bottom: '3%', containLabel: true };
}

export const COLORS = {
    primary: '#0891b2',
    secondary: '#6366f1',
    success: '#0f766e',
    warning: '#d97706',
    error: '#c2410c',
    quintiles: ['#c2410c', '#e8903e', '#9ca3af', '#3ab7a5', '#0891b2'],
    minority: ['#0891b2', '#6366f1', '#c2410c'],
    gradient: ['#0891b2', '#3ab7a5', '#e8903e', '#c2410c']
};

/**
 * @param {Record<string, any>[]} data
 * @param {BarChartOptions} [options]
 * @returns {any}
 */
export function createBarChartConfig(data, options = {}) {
    const {
        xField = 'label',
        yField = 'value',
        yAxisLabel = '',
        color = COLORS.primary,
        formatter = null
    } = options;

    return {
        tooltip: {
            trigger: 'axis',
            axisPointer: {
                type: 'shadow'
            },
            confine: true,
            formatter: formatter || ((/** @type {any[]} */ params) => {
                const item = params[0];
                return `${item.name}<br/>${item.seriesName}: ${item.value.toFixed(1)}%`;
            })
        },
        grid: getResponsiveGrid(),
        xAxis: {
            type: 'category',
            data: data.map(d => d[xField]),
            axisLabel: {
                fontSize: getResponsiveFontSize(12, 10),
                rotate: isMobile() ? 15 : 0
            }
        },
        yAxis: {
            type: 'value',
            name: yAxisLabel,
            nameTextStyle: {
                fontSize: getResponsiveFontSize(12, 10)
            },
            axisLabel: {
                fontSize: getResponsiveFontSize(11, 9)
            }
        },
        series: [{
            name: yAxisLabel,
            type: 'bar',
            data: data.map(d => d[yField]),
            itemStyle: {
                color: typeof color === 'string'
                    ? color
                    : (params) => color[params.dataIndex % color.length],
                borderRadius: [3, 3, 0, 0]
            },
            animationDelay: (idx) => idx * 120
        }]
    };
}

/**
 * @param {Record<string, any>[]} data
 * @param {ScatterChartOptions} [options]
 * @returns {any}
 */
export function createScatterChartConfig(data, options = {}) {
    const {
        xField = 'x',
        yField = 'y',
        xAxisLabel = '',
        yAxisLabel = '',
        colorField = null,
        colors = COLORS.quintiles,
        formatter = null
    } = options;

    let seriesData = [];

    if (colorField) {
        const groups = {};
        data.forEach(item => {
            const key = item[colorField];
            if (!groups[key]) groups[key] = [];
            groups[key].push([item[xField], item[yField], item]);
        });

        const labelMap = options.colorLabels || {};
        seriesData = Object.entries(groups).map(([key, values], idx) => ({
            name: labelMap[key] || key,
            type: 'scatter',
            data: values,
            itemStyle: {
                color: colors[idx % colors.length]
            }
        }));
    } else {
        seriesData = [{
            type: 'scatter',
            data: data.map(d => [d[xField], d[yField], d]),
            itemStyle: {
                color: COLORS.primary
            }
        }];
    }

    const allX = data.map(d => d[xField]);
    const allY = data.map(d => d[yField]);
    const minVal = Math.floor(Math.min(...allX, ...allY) * 0.9);
    const maxVal = Math.ceil(Math.max(...allX, ...allY) * 1.1);

    return {
        tooltip: {
            trigger: 'item',
            confine: true,
            formatter: formatter || ((/** @type {any} */ params) => {
                const item = params.data[2];
                return `Counter: ${item.counter_id}<br/>` +
                       `Actual: ${Math.round(params.data[0])}<br/>` +
                       `Predicted: ${Math.round(params.data[1])}`;
            })
        },
        legend: colorField ? {
            data: seriesData.map(s => s.name),
            bottom: 0,
            orient: 'horizontal',
            textStyle: {
                fontSize: getResponsiveFontSize(11, 9)
            }
        } : {},
        grid: {
            left: isMobile() ? '8%' : '3%',
            right: isMobile() ? '5%' : '4%',
            bottom: colorField ? (isMobile() ? '20%' : '15%') : (isMobile() ? '10%' : '3%'),
            top: isMobile() ? '15%' : '10%',
            containLabel: true
        },
        xAxis: {
            type: 'value',
            name: xAxisLabel,
            nameLocation: 'middle',
            nameGap: 30,
            nameTextStyle: {
                fontSize: 12
            },
            min: minVal,
            max: maxVal
        },
        yAxis: {
            type: 'value',
            name: yAxisLabel,
            nameLocation: 'middle',
            nameGap: 40,
            nameTextStyle: {
                fontSize: 12
            },
            min: minVal,
            max: maxVal
        },
        series: [
            ...seriesData,
            {
                name: 'Perfect prediction (y=x)',
                type: 'line',
                data: [[minVal, minVal], [maxVal, maxVal]],
                lineStyle: {
                    color: '#c7c7cc',
                    width: 2,
                    type: 'dashed'
                },
                symbol: 'none',
                silent: true
            }
        ]
    };
}
