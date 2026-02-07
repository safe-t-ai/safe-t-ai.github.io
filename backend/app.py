"""
Durham Transportation Safety AI Audit Tool - Flask API Server
"""

from flask import Flask, jsonify
from flask_cors import CORS
from pathlib import Path

from config import FLASK_CONFIG
from api.routes_test1 import test1_bp

app = Flask(__name__)
CORS(app)

# Register blueprints
app.register_blueprint(test1_bp)

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'Durham Transportation Safety AI Audit',
        'version': '1.0.0'
    })

@app.route('/api/info', methods=['GET'])
def get_info():
    """Get information about available tests"""
    return jsonify({
        'tests': [
            {
                'id': 'test1',
                'name': 'Volume Estimation Equity Audit',
                'description': 'Evaluates AI volume estimation tools for demographic bias',
                'status': 'active',
                'endpoints': [
                    '/api/test1/census-tracts',
                    '/api/test1/counter-locations',
                    '/api/test1/report',
                    '/api/test1/choropleth-data',
                    '/api/test1/accuracy-by-income',
                    '/api/test1/accuracy-by-race',
                    '/api/test1/scatter-data',
                    '/api/test1/error-distribution',
                ]
            },
            {
                'id': 'test2',
                'name': 'Crash Prediction Bias Audit',
                'description': 'Coming soon',
                'status': 'planned'
            },
            {
                'id': 'test3',
                'name': 'Infrastructure Recommendation Audit',
                'description': 'Coming soon',
                'status': 'planned'
            },
            {
                'id': 'test4',
                'name': 'Suppressed Demand Analysis',
                'description': 'Coming soon',
                'status': 'planned'
            }
        ]
    })

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    print("Durham Transportation Safety AI Audit Tool")
    print("=" * 60)
    print("Starting Flask API server...")
    print(f"API will be available at: http://localhost:{FLASK_CONFIG['port']}")
    print()

    app.run(**FLASK_CONFIG)
