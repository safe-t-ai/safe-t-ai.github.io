/**
 * Type declarations for SAFE-T frontend
 * Pipeline JSON data shapes + shared UI types
 */

// Leaflet global (loaded via CDN)
declare const L: typeof import('leaflet');

// ---------------------------------------------------------------------------
// Shared / reusable shapes
// ---------------------------------------------------------------------------

interface Provenance {
    data_type: string;
    real?: string[];
    simulated?: string[];
    calibration?: Record<string, unknown>;
    parameters?: Record<string, unknown>;
}

interface EquityGap {
    best_group: string;
    worst_group: string;
    best_group_mean: number;
    worst_group_mean: number;
    gap: number;
    gap_pct: number;
    statistically_significant: boolean;
    p_value: number;
}

interface GeoJSONFeature<P = Record<string, unknown>> {
    id: string;
    type: 'Feature';
    properties: P;
    geometry: {
        type: string;
        coordinates: number[][][] | number[][][][];
    };
}

interface GeoJSONFeatureCollection<P = Record<string, unknown>> {
    type: 'FeatureCollection';
    features: GeoJSONFeature<P>[];
}

// ---------------------------------------------------------------------------
// Test 1 — Volume Estimation
// ---------------------------------------------------------------------------

interface VolumeMetrics {
    mae: number;
    mape: number;
    rmse: number;
    mean_error: number;
    mean_pct_error: number;
    bias: number;
    r_squared: number;
}

interface QuintileAccuracy {
    quintile: number;
    label: string;
    count: number;
    median_income: number;
    mae: number;
    mape: number;
    bias: number;
    mean_error_pct: number;
}

interface RaceCategory {
    category: string;
    count: number;
    mean_minority_pct: number;
    mae: number;
    mape: number;
    bias: number;
    mean_error_pct: number;
}

interface ScatterDataPoint {
    true_volume: number;
    predicted_volume: number;
    counter_id: string;
    income_quintile: number;
    minority_category: string;
    median_income: number;
    pct_minority: number;
}

interface VolumeReport {
    overall_accuracy: {
        metrics: VolumeMetrics;
        total_counters: number;
        total_true_volume: number;
        total_predicted_volume: number;
    };
    by_income: {
        by_quintile: QuintileAccuracy[];
        equity_gap: EquityGap;
    };
    by_race: {
        by_category: RaceCategory[];
        equity_gap: EquityGap;
    };
    scatter_data: ScatterDataPoint[];
    interpretation: string[];
}

interface ChoroplethProperties {
    tract_id: string;
    error_pct: number;
    error: number;
    true_volume: number;
    predicted_volume: number;
    median_income: number;
    pct_minority: number;
    total_population: number;
    income_quintile: number;
    minority_category: string;
}

type ChoroplethData = GeoJSONFeatureCollection<ChoroplethProperties>;

interface CounterLocation {
    counter_id: string;
    tract_id: number;
    lat: number;
    lon: number;
    daily_volume: number;
    median_income: number;
    pct_minority: number;
    type: string;
}

// ---------------------------------------------------------------------------
// Test 2 — Crash Prediction
// ---------------------------------------------------------------------------

interface CrashQuintileStats {
    actual_crashes: number;
    ai_predicted_crashes: number;
    mae: number;
    error_pct: number;
}

interface CrashReport {
    _provenance: Provenance;
    summary: {
        total_crashes_all_years: number;
        crashes_2023_actual: number;
        crashes_2023_predicted: number;
        years_analyzed: number[];
        tracts_analyzed: number;
        data_source: string;
    };
    error_by_quintile: Record<string, CrashQuintileStats>;
    findings: string[];
}

interface ConfusionMatrixMetrics {
    confusion_matrix: number[][];
    precision: number;
    recall: number;
    f1_score: number;
    accuracy: number;
    count?: number;
}

interface ConfusionMatrices {
    overall: ConfusionMatrixMetrics;
    by_quintile: Record<string, ConfusionMatrixMetrics>;
}

interface CrashTimeSeries {
    years: number[];
    by_quintile: Record<string, {
        actual_crashes: number[];
        ai_predicted_crashes: number[];
    }>;
    overall: {
        actual_crashes: number[];
        ai_predicted_crashes: number[];
    };
}

interface CrashGeoProperties {
    tract_id: string;
    actual_crashes: number;
    ai_predicted_crashes: number;
    prediction_error: number;
    prediction_error_pct: number;
    median_income: number;
    income_quintile: string;
}

type CrashGeoData = GeoJSONFeatureCollection<CrashGeoProperties>;

// ---------------------------------------------------------------------------
// Test 3 — Infrastructure
// ---------------------------------------------------------------------------

interface InfrastructureReport {
    summary: {
        total_budget: number;
        ai_projects: number;
        need_based_projects: number;
        budget_allocated_ai: number;
        budget_allocated_need: number;
    };
    danger_scores: {
        tract_id: string;
        danger_score: number;
        annual_crashes: number;
        median_income: number;
        population: number;
    }[];
}

interface DangerScoreProperties {
    tract_id: string;
    danger_score: number;
    annual_crashes: number;
    median_income_y: number;
    median_income_x: number;
    population: number;
    total_population: number;
    income_quintile: string;
    pct_minority: number;
    [key: string]: unknown;
}

type DangerScores = GeoJSONFeatureCollection<DangerScoreProperties>;

interface AllocationByQuintile {
    by_quintile: Record<string, number>;
    per_capita: Record<string, number>;
    disparate_impact_ratio: number;
    gini_coefficient: number;
}

interface BudgetAllocation {
    ai_allocation: AllocationByQuintile;
    need_based_allocation: AllocationByQuintile;
    comparison: {
        equity_gap: number;
        gini_improvement: number;
    };
}

interface RecommendationProperties {
    tract_id: string;
    project_type: string;
    cost: number;
    safety_impact: number;
    ai_priority: number;
    danger_score: number;
    median_income_y: number;
    population: number;
    [key: string]: unknown;
}

interface Recommendations {
    ai_recommendations: GeoJSONFeatureCollection<RecommendationProperties>;
    need_based_recommendations: GeoJSONFeatureCollection<RecommendationProperties>;
}

// ---------------------------------------------------------------------------
// Test 4 — Suppressed Demand
// ---------------------------------------------------------------------------

interface DemandReport {
    _provenance: Provenance;
    summary: {
        total_potential_demand: number;
        total_actual_demand: number;
        total_suppressed_demand: number;
        suppression_rate: number;
        tracts_analyzed: number;
        high_suppression_tracts: number;
        naive_ai_correlation: number;
        sophisticated_ai_correlation: number;
    };
    high_suppression_threshold: number;
    by_quintile: Record<string, {
        potential_demand: number;
        actual_demand: number;
        suppressed_demand: number;
        suppression_pct: number;
        infrastructure_score: number;
    }>;
    findings: string[];
}

interface DemandFunnelStage {
    stage1_potential: number;
    stage2_destinations: number;
    stage3_would_use_if_safe: number;
    stage4_actually_use: number;
    total_suppression_pct: number;
}

type DemandFunnel = Record<string, DemandFunnelStage>;

interface ScorecardMetrics {
    correlation_with_potential: number;
    rmse: number;
    bias_q1: number;
    bias_q5: number;
    detection_rate_high_suppression: number;
}

interface DetectionScorecard {
    naive_ai: ScorecardMetrics;
    sophisticated_ai: ScorecardMetrics;
    human_expert_baseline: ScorecardMetrics;
}

interface DemandGeoProperties {
    tract_id: string;
    potential_demand: number;
    actual_demand: number;
    suppressed_demand: number;
    suppression_pct: number;
    infrastructure_score: number;
    income_quintile: string;
}

type DemandGeoData = GeoJSONFeatureCollection<DemandGeoProperties>;

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

interface PipelineMetadata {
    generated_at: string;
    data_hash: string;
    github_run_url: string;
    git_sha: string;
    sources: {
        real: string[];
        calibrated: string[];
        simulated: string[];
    };
}

// ---------------------------------------------------------------------------
// Shared UI types
// ---------------------------------------------------------------------------

interface MetricCard {
    title: string;
    value: string;
    subtext: string;
    sentiment: string;
}

interface PopupField {
    label: string;
    field: string;
    format?: (value: number) => string;
}

interface ColorScaleEntry {
    max?: number;
    color: string;
    label: string;
}

interface ChoroplethLayerOptions {
    valueField?: string;
    colors?: string[] | null;
    breaks?: number[] | null;
    fillOpacity?: number;
    popupFields?: PopupField[] | null;
}

interface LegendOptions {
    position?: string;
    title?: string;
    colorScale?: ColorScaleEntry[];
    footer?: string | null;
}

interface MarkerOptions {
    icon?: import('leaflet').DivIcon | import('leaflet').Icon | null;
    popupContent?: (point: { lat: number; lon: number; [key: string]: unknown }) => string;
}

interface DurhamMapOptions {
    center?: [number, number];
    zoom?: number;
}

interface BarChartOptions {
    xField?: string;
    yField?: string;
    yAxisLabel?: string;
    color?: string | string[];
    formatter?: ((params: any) => string) | null;
}

interface ScatterChartOptions {
    xField?: string;
    yField?: string;
    xAxisLabel?: string;
    yAxisLabel?: string;
    colorField?: string | null;
    colors?: string[];
    colorLabels?: Record<string, string>;
    formatter?: ((params: any) => string) | null;
}
