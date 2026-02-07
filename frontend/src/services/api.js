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

    async healthCheck() {
        if (IS_GITHUB_PAGES) {
            return { status: 'healthy', mode: 'static' };
        }
        return this.get('/health');
    }
}

export default new APIClient();
