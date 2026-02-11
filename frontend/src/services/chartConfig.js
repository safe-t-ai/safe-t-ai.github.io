/**
 * Apache ECharts configuration factory
 * Provides consistent styling across all visualizations
 */

import echarts from './echarts.js';

/* global setTimeout, clearTimeout */

// Single debounced resize handler for all charts
const activeCharts = new Set();
let resizeTimer;

window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
        activeCharts.forEach(chart => {
            if (!chart.isDisposed() && chart.getDom().offsetParent !== null) {
                chart.resize();
            }
        });
    }, 150);
});

export function initChart(elementId, config) {
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

export function resizeVisibleCharts() {
    activeCharts.forEach(chart => {
        if (!chart.isDisposed() && chart.getDom().offsetParent !== null) {
            chart.resize();
        }
    });
}

const isMobile = () => window.innerWidth <= 768;

const getResponsiveFontSize = (desktop, mobile) => {
    return isMobile() ? mobile : desktop;
};

const getResponsiveGrid = () => {
    return isMobile()
        ? { left: '5%', right: '5%', bottom: '10%', top: '15%', containLabel: true }
        : { left: '3%', right: '4%', bottom: '3%', containLabel: true };
};

export const COLORS = {
    primary: '#0891b2',
    secondary: '#6366f1',
    success: '#0f766e',
    warning: '#d97706',
    danger: '#c2410c',
    error: '#c2410c',
    quintiles: ['#c2410c', '#e8903e', '#9ca3af', '#3ab7a5', '#0891b2'],
    minority: ['#0891b2', '#6366f1', '#c2410c'],
    gradient: ['#0891b2', '#3ab7a5', '#e8903e', '#c2410c']
};

export function createBarChartConfig(data, options = {}) {
    const {
        xField = 'label',
        yField = 'value',
        title = '',
        yAxisLabel = '',
        color = COLORS.primary,
        formatter = null
    } = options;

    return {
        title: {
            text: title,
            left: 'center',
            textStyle: {
                fontSize: getResponsiveFontSize(16, 12),
                fontWeight: 'normal'
            }
        },
        tooltip: {
            trigger: 'axis',
            axisPointer: {
                type: 'shadow'
            },
            confine: true,
            formatter: formatter || ((params) => {
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
                color: typeof color === 'string' ? color : (params) => {
                    return color[params.dataIndex % color.length];
                }
            },
            label: {
                show: false
            }
        }]
    };
}

export function createScatterChartConfig(data, options = {}) {
    const {
        xField = 'x',
        yField = 'y',
        title = '',
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

        seriesData = Object.entries(groups).map(([key, values], idx) => ({
            name: key,
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
    const minVal = Math.min(...allX);
    const maxVal = Math.max(...allX);

    return {
        title: {
            text: title,
            left: 'center',
            textStyle: {
                fontSize: getResponsiveFontSize(16, 12),
                fontWeight: 'normal'
            }
        },
        tooltip: {
            trigger: 'item',
            confine: true,
            formatter: formatter || ((params) => {
                const item = params.data[2];
                return `Counter: ${item.counter_id}<br/>` +
                       `Actual: ${params.data[0]}<br/>` +
                       `Predicted: ${params.data[1]}`;
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
            nameTextStyle: {
                fontSize: 12
            },
            min: minVal * 0.9,
            max: maxVal * 1.1
        },
        yAxis: {
            type: 'value',
            name: yAxisLabel,
            nameTextStyle: {
                fontSize: 12
            },
            min: minVal * 0.9,
            max: maxVal * 1.1
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

export function createHistogramConfig(data, options = {}) {
    const {
        title = '',
        xAxisLabel = '',
        yAxisLabel = 'Count',
        color = COLORS.primary
    } = options;

    return {
        title: {
            text: title,
            left: 'center',
            textStyle: {
                fontSize: getResponsiveFontSize(16, 12),
                fontWeight: 'normal'
            }
        },
        tooltip: {
            trigger: 'axis',
            axisPointer: {
                type: 'shadow'
            },
            confine: true,
            formatter: (params) => {
                const item = params[0];
                return `${item.name}<br/>Count: ${item.value}`;
            }
        },
        grid: {
            left: isMobile() ? '8%' : '3%',
            right: isMobile() ? '5%' : '4%',
            bottom: isMobile() ? '15%' : '8%',
            top: isMobile() ? '15%' : '10%',
            containLabel: true
        },
        xAxis: {
            type: 'category',
            data: data.map(d => d.bin_label),
            name: xAxisLabel,
            nameTextStyle: {
                fontSize: getResponsiveFontSize(12, 10)
            },
            axisLabel: {
                fontSize: getResponsiveFontSize(10, 8),
                rotate: isMobile() ? 60 : 45
            }
        },
        yAxis: {
            type: 'value',
            name: yAxisLabel,
            nameTextStyle: {
                fontSize: 12
            }
        },
        series: [{
            type: 'bar',
            data: data.map(d => d.count),
            itemStyle: {
                color: color
            }
        }]
    };
}
