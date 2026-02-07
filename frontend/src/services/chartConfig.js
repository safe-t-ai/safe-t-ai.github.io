/**
 * Apache ECharts configuration factory
 * Provides consistent styling across all visualizations
 */

// Responsive helper
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
    primary: '#3182ce',
    secondary: '#805ad5',
    success: '#38a169',
    warning: '#d69e2e',
    danger: '#e53e3e',
    quintiles: ['#e53e3e', '#ed8936', '#ecc94b', '#48bb78', '#38a169'],
    minority: ['#38a169', '#ecc94b', '#e53e3e'],
    gradient: ['#38a169', '#ecc94b', '#ed8936', '#e53e3e']
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

export function createGroupedBarChartConfig(categories, series, options = {}) {
    const {
        title = '',
        yAxisLabel = '',
        colors = COLORS.quintiles,
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
            formatter: formatter
        },
        legend: {
            data: series.map(s => s.name),
            bottom: 0,
            orient: isMobile() ? 'horizontal' : 'horizontal',
            textStyle: {
                fontSize: getResponsiveFontSize(11, 9)
            }
        },
        grid: {
            left: isMobile() ? '8%' : '3%',
            right: isMobile() ? '5%' : '4%',
            bottom: isMobile() ? '20%' : '15%',
            top: isMobile() ? '15%' : '10%',
            containLabel: true
        },
        xAxis: {
            type: 'category',
            data: categories,
            axisLabel: {
                fontSize: getResponsiveFontSize(12, 10),
                rotate: isMobile() ? 15 : 0
            }
        },
        yAxis: {
            type: 'value',
            name: yAxisLabel,
            nameTextStyle: {
                fontSize: 12
            }
        },
        series: series.map((s, idx) => ({
            name: s.name,
            type: 'bar',
            data: s.data,
            itemStyle: {
                color: colors[idx % colors.length]
            }
        }))
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

    // Group by color field if provided
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

    // Calculate reference line (y=x)
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
            orient: isMobile() ? 'horizontal' : 'horizontal',
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
                    color: '#cbd5e0',
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
