# uCode1 Core Runtime — Makefile
# Targets for development, testing, and running all services
# Uses uCore (unified uServer + uConnect backend) in Python

.PHONY: help install test build run-cli run-ucore run-snackbar run-gridui run-all clean

help:
	@echo "uCode1 Core Runtime — Development Targets"
	@echo ""
	@echo "  install        Install Python dependencies"
	@echo "  test           Run all tests (uCore + uCode1)"
	@echo "  build          Build uCore package (editable install)"
	@echo "  run-cli        Start uCode1 REPL"
	@echo "  run-ucore      Start uCore daemon (snackbar + hivemind + API)"
	@echo "  run-snackbar   Alias for run-ucore"
	@echo "  run-gridui     Start gridui Vue dev server"
	@echo "  run-all        Start all services"
	@echo "  clean          Clean build artifacts"

install:
	pip install -e ../..
	cd ../../backend && pip install -e .

test:
	python -m pytest tests/ -v
	python -m pytest ../../backend/tests/ -v

build:
	cd ../../backend && pip install -e .

run-cli:
	python -m ucode1.cli --repl

run-ucore:
	cd ../../backend && python -m app --port 8484

run-snackbar: run-ucore
run-gridui:
	cd ../uConnect/gridui && npm run dev

run-all:
	@echo "Starting all services..."
	@echo "  [1/3] uCore daemon..."
	@cd ../../backend && python -m app --port 8484 &
	@sleep 2
	@echo "  [2/3] uCore daemon (snackbar mode)..."
	@cd ../../backend && python -m app --port 8485 &
	@sleep 2
	@echo "  [3/3] gridui Vue dev server..."
	@cd ../uConnect/gridui && npm run dev &
	@echo "All services started!"

clean:
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name .pytest_cache -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name *.egg-info -exec rm -rf {} + 2>/dev/null || true
	cd ../../backend && find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
