/**
 * API client for Durham Transportation Safety Audit backend
 * Automatically uses static files when deployed to gh-pages
 */

const IS_GITHUB_PAGES = window.location.hostname.includes('github.io');
const API_BASE = IS_GITHUB_PAGES ? '/data' : '/api';

class APIClient {
    async get(endpoint) {
        const url = IS_GITHUB_PAGES
            ? `${API_BASE}${endpoint}.json`
            : `${API_BASE}${endpoint}`;

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`API error: ${response.statusText}`);
        }

        return response.json();
    }

    // Test 1 endpoints
    async getTest1Report() {
        return this.get(IS_GITHUB_PAGES ? '/report' : '/test1/report');
    }

    async getCensusTracts() {
        return this.get(IS_GITHUB_PAGES ? '/census-tracts' : '/test1/census-tracts');
    }

    async getChoroplethData() {
        return this.get(IS_GITHUB_PAGES ? '/choropleth-data' : '/test1/choropleth-data');
    }

    async getCounterLocations() {
        return this.get(IS_GITHUB_PAGES ? '/counter-locations' : '/test1/counter-locations');
    }

    async getAccuracyByIncome() {
        return this.get(IS_GITHUB_PAGES ? '/accuracy-by-income' : '/test1/accuracy-by-income');
    }

    async getAccuracyByRace() {
        return this.get(IS_GITHUB_PAGES ? '/accuracy-by-race' : '/test1/accuracy-by-race');
    }

    async getScatterData() {
        return this.get(IS_GITHUB_PAGES ? '/scatter-data' : '/test1/scatter-data');
    }

    async getErrorDistribution() {
        return this.get(IS_GITHUB_PAGES ? '/error-distribution' : '/test1/error-distribution');
    }

    // Test 2 endpoints
    async getCrashReport() {
        return this.get(IS_GITHUB_PAGES ? '/crash-report' : '/test2/report');
    }

    async getConfusionMatrices() {
        return this.get(IS_GITHUB_PAGES ? '/confusion-matrices' : '/test2/confusion-matrices');
    }

    async getRocCurves() {
        return this.get(IS_GITHUB_PAGES ? '/roc-curves' : '/test2/roc-curves');
    }

    async getCrashTimeSeries() {
        return this.get(IS_GITHUB_PAGES ? '/crash-time-series' : '/test2/crash-time-series');
    }

    async getCrashGeoData() {
        return this.get(IS_GITHUB_PAGES ? '/crash-geo-data' : '/test2/crash-geo-data');
    }

    // Test 3 endpoints
    async getInfrastructureReport() {
        return this.get(IS_GITHUB_PAGES ? '/infrastructure-report' : '/test3/report');
    }

    async getDangerScores() {
        return this.get(IS_GITHUB_PAGES ? '/danger-scores' : '/test3/danger-scores');
    }

    async getBudgetAllocation() {
        return this.get(IS_GITHUB_PAGES ? '/budget-allocation' : '/test3/budget-allocation');
    }

    async getRecommendations() {
        return this.get(IS_GITHUB_PAGES ? '/recommendations' : '/test3/recommendations');
    }

    // Test 4 endpoints
    async getDemandReport() {
        return this.get(IS_GITHUB_PAGES ? '/demand-report' : '/test4/report');
    }

    async getDemandFunnel() {
        return this.get(IS_GITHUB_PAGES ? '/demand-funnel' : '/test4/funnel');
    }

    async getCorrelationMatrix() {
        return this.get(IS_GITHUB_PAGES ? '/correlation-matrix' : '/test4/correlation-matrix');
    }

    async getDetectionScorecard() {
        return this.get(IS_GITHUB_PAGES ? '/detection-scorecard' : '/test4/scorecard');
    }

    async getNetworkFlow() {
        return this.get(IS_GITHUB_PAGES ? '/network-flow' : '/test4/network-flow');
    }

    async getDemandGeoData() {
        return this.get(IS_GITHUB_PAGES ? '/demand-geo-data' : '/test4/demand-geo-data');
    }

    async healthCheck() {
        if (IS_GITHUB_PAGES) {
            return { status: 'healthy', mode: 'static' };
        }
        return this.get('/health');
    }
}

export default new APIClient();
