.PHONY: help setup install install-backend install-frontend clean clean-all dev build deploy test data fetch-data fetch-data-api generate-data venv

.DEFAULT_GOAL := help

VENV := .venv
PYTHON := $(VENV)/bin/python3

##@ Help

help: ## Display this help
	@awk 'BEGIN {FS = ":.*##"; printf "\nUsage:\n  make \033[36m<target>\033[0m\n"} /^[a-zA-Z_-]+:.*?##/ { printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2 } /^##@/ { printf "\n\033[1m%s\033[0m\n", substr($$0, 5) } ' $(MAKEFILE_LIST)

##@ Setup

setup: install install-hooks data ## Complete setup (install dependencies, hooks, and generate data)

install: install-backend install-frontend ## Install all dependencies

venv: ## Create Python venv and install dependencies (requires uv)
	uv venv $(VENV)
	uv pip install -r backend/requirements.txt --python $(PYTHON)

install-backend: venv ## Install Python backend dependencies

install-frontend: ## Install Node.js frontend dependencies
	cd frontend && npm install

install-hooks: ## Install pre-commit hooks
	pre-commit install
	@echo "✓ Pre-commit hooks installed"

##@ Development

dev: ## Start frontend dev server (data served from frontend/public/data/)
	cd frontend && npm run dev

##@ Data

data: ## Pull all pre-built data from the data branch
	git fetch origin data
	mkdir -p backend/data/raw backend/data/simulated frontend/public/data
	git archive origin/data -- raw/ | tar -xf - --strip-components=1 -C backend/data/raw/
	git archive origin/data -- simulated/ | tar -xf - --strip-components=1 -C backend/data/simulated/
	git archive origin/data -- frontend/ | tar -xf - --strip-components=1 -C frontend/public/data/
	@echo "✓ Data restored from data branch"

fetch-data-api: ## Fetch raw data from external APIs (slow, needs API keys)
	$(PYTHON) scripts/fetch_durham_data.py
	$(PYTHON) scripts/fetch_ncdot_nonmotorist.py
	$(PYTHON) scripts/fetch_osm_infrastructure.py

generate-data: ## Run simulations and generate frontend JSON from local raw data
	$(PYTHON) scripts/simulate_ai_predictions.py
	$(PYTHON) scripts/simulate_crash_predictions.py
	$(PYTHON) scripts/simulate_infrastructure_recommendations.py
	$(PYTHON) scripts/analyze_suppressed_demand.py
	$(PYTHON) scripts/generate_static_data.py

##@ Build & Deploy

build: ## Build frontend for production
	cd frontend && npm run build

preview: build ## Preview production build locally
	cd frontend && npm run preview

deploy: build ## Deploy to GitHub Pages
	cd frontend && npm run deploy

##@ Testing & Quality

test: ## Run pytest test suite with coverage
	cd backend && ../$(PYTHON) -m pytest

test-quick: ## Run pytest without coverage
	cd backend && ../$(PYTHON) -m pytest -v --no-cov

lint: ## Run all linters
	cd frontend && npm run lint
	@echo "✓ ESLint passed"

lint-fix: ## Run linters with auto-fix
	cd frontend && npm run lint:fix
	@echo "✓ Auto-fixed lint issues"

hooks: ## Run pre-commit hooks manually
	pre-commit run --all-files

##@ Cleanup

clean: ## Remove build artifacts and caches
	rm -rf frontend/dist
	rm -rf frontend/.vite
	rm -rf frontend/node_modules/.vite
	find . -type d -name "__pycache__" -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete

clean-all: clean ## Remove all generated files including dependencies
	rm -rf $(VENV)
	rm -rf frontend/node_modules
	rm -rf backend/data/raw
	rm -rf backend/data/simulated
