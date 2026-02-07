#!/bin/bash

# Durham Transportation Safety AI Audit Tool - Startup Script

set -e

echo "Durham Transportation Safety AI Audit Tool"
echo "=========================================="
echo

# Check if data exists
if [ ! -f "backend/data/raw/durham_census_tracts.geojson" ]; then
    echo "⚠️  Data not found. Generating data..."
    cd backend
    python ../scripts/fetch_durham_data.py
    python ../scripts/simulate_ai_predictions.py
    cd ..
    echo "✓ Data generated"
    echo
fi

# Check if frontend dependencies are installed
if [ ! -d "frontend/node_modules" ]; then
    echo "⚠️  Frontend dependencies not found. Installing..."
    cd frontend
    npm install
    cd ..
    echo "✓ Dependencies installed"
    echo
fi

echo "Starting application..."
echo
echo "Backend API: http://localhost:5000"
echo "Frontend: http://localhost:5173"
echo
echo "Press Ctrl+C to stop both servers"
echo

# Start backend in background
cd backend
python app.py &
BACKEND_PID=$!

# Wait for backend to start
sleep 3

# Start frontend
cd ../frontend
npm run dev

# Cleanup on exit
trap "kill $BACKEND_PID" EXIT
