/**
 * Tree-shaken ECharts bundle: only the components the tests use.
 */
import * as echarts from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { BarChart, LineChart, ScatterChart, CustomChart } from 'echarts/charts';
import { TooltipComponent, GridComponent, LegendComponent, AriaComponent } from 'echarts/components';

echarts.use([
    CanvasRenderer,
    BarChart,
    LineChart,
    ScatterChart,
    CustomChart,
    TooltipComponent,
    GridComponent,
    LegendComponent,
    AriaComponent,
]);

export default echarts;
