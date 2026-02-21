/**
 * API client for SAFE-T frontend
 * Fetches pre-generated static JSON from /data/
 */

class APIClient {
    /**
     * @param {string} endpoint
     * @returns {Promise<any>}
     */
    async get(endpoint) {
        // Append data branch git SHA so browsers fetch fresh JSON after each data refresh.
        const v = import.meta.env.VITE_DATA_HASH || 'dev'
        const response = await fetch(`/data/${endpoint}.json?v=${v}`);

        if (!response.ok) {
            throw new Error(`Failed to load ${endpoint}: ${response.statusText}`);
        }

        return response.json();
    }

    // Test 1 endpoints
    /** @returns {Promise<VolumeReport>} */
    getTest1Report() { return this.get('volume-report'); }
    /** @returns {Promise<ChoroplethData>} */
    getChoroplethData() { return this.get('choropleth-data'); }
    /** @returns {Promise<CounterLocation[]>} */
    getCounterLocations() { return this.get('counter-locations'); }

    // Test 2 endpoints
    /** @returns {Promise<CrashReport>} */
    getCrashReport() { return this.get('crash-report'); }
    /** @returns {Promise<ConfusionMatrices>} */
    getConfusionMatrices() { return this.get('confusion-matrices'); }
    /** @returns {Promise<CrashTimeSeries>} */
    getCrashTimeSeries() { return this.get('crash-time-series'); }
    /** @returns {Promise<CrashGeoData>} */
    getCrashGeoData() { return this.get('crash-geo-data'); }

    // Test 3 endpoints
    /** @returns {Promise<InfrastructureReport>} */
    getInfrastructureReport() { return this.get('infrastructure-report'); }
    /** @returns {Promise<DangerScores>} */
    getDangerScores() { return this.get('danger-scores'); }
    /** @returns {Promise<BudgetAllocation>} */
    getBudgetAllocation() { return this.get('budget-allocation'); }
    /** @returns {Promise<Recommendations>} */
    getRecommendations() { return this.get('recommendations'); }

    // Test 4 endpoints
    /** @returns {Promise<DemandReport>} */
    getDemandReport() { return this.get('demand-report'); }
    /** @returns {Promise<DemandFunnel>} */
    getDemandFunnel() { return this.get('demand-funnel'); }
    /** @returns {Promise<DetectionScorecard>} */
    getDetectionScorecard() { return this.get('detection-scorecard'); }
    /** @returns {Promise<DemandGeoData>} */
    getDemandGeoData() { return this.get('demand-geo-data'); }
}

export default new APIClient();
