/**
 * API client for SAFE-T frontend
 * Fetches pre-generated static JSON from /data/
 */

class APIClient {
    async get(endpoint) {
        const response = await fetch(`/data/${endpoint}.json`);

        if (!response.ok) {
            throw new Error(`Failed to load ${endpoint}: ${response.statusText}`);
        }

        return response.json();
    }

    // Test 1 endpoints
    getTest1Report() { return this.get('volume-report'); }
    getChoroplethData() { return this.get('choropleth-data'); }
    getCounterLocations() { return this.get('counter-locations'); }

    // Test 2 endpoints
    getCrashReport() { return this.get('crash-report'); }
    getConfusionMatrices() { return this.get('confusion-matrices'); }
    getRocCurves() { return this.get('roc-curves'); }
    getCrashTimeSeries() { return this.get('crash-time-series'); }
    getCrashGeoData() { return this.get('crash-geo-data'); }

    // Test 3 endpoints
    getInfrastructureReport() { return this.get('infrastructure-report'); }
    getDangerScores() { return this.get('danger-scores'); }
    getBudgetAllocation() { return this.get('budget-allocation'); }
    getRecommendations() { return this.get('recommendations'); }

    // Test 4 endpoints
    getDemandReport() { return this.get('demand-report'); }
    getDemandFunnel() { return this.get('demand-funnel'); }
    getDetectionScorecard() { return this.get('detection-scorecard'); }
    getDemandGeoData() { return this.get('demand-geo-data'); }
}

export default new APIClient();
