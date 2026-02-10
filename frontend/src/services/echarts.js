/**
 * Tree-shaken ECharts bundle — imports only the components used across tests.
 * Reduces bundle from ~800KB (full) to ~300KB.
 */
import * as echarts from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import {
    BarChart,
    LineChart,
    ScatterChart,
    HeatmapChart,
    SankeyChart,
    RadarChart,
    FunnelChart,
} from 'echarts/charts';
import {
    TitleComponent,
    TooltipComponent,
    GridComponent,
    LegendComponent,
    VisualMapComponent,
    VisualMapContinuousComponent,
} from 'echarts/components';

echarts.use([
    CanvasRenderer,
    BarChart,
    LineChart,
    ScatterChart,
    HeatmapChart,
    SankeyChart,
    RadarChart,
    FunnelChart,
    TitleComponent,
    TooltipComponent,
    GridComponent,
    LegendComponent,
    VisualMapComponent,
    VisualMapContinuousComponent,
]);

export default echarts;
