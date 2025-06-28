# Makefile for Flocus Project

.PHONY: start-backend start-frontend test-backend test-frontend test start backup-db install-backend install-frontend install

# Default target
all: help

help:
	@echo "Available commands:"
	@echo "  make start-backend   - Starts the backend server (FastAPI/Uvicorn)"
	@echo "  make start-frontend  - Starts the frontend development server (React)"
	@echo "  make start           - Starts both backend and frontend (sequentially)"
	@echo "  make test-backend    - Runs backend tests (pytest)"
	@echo "  make test-frontend   - Runs frontend tests (npm test)"
	@echo "  make test            - Runs all tests (backend and frontend)"
	@echo "  make install-backend - Installs backend dependencies (uv sync)"
	@echo "  make install-frontend - Installs frontend dependencies (npm install)"
	@echo "  make install         - Installs all dependencies"
	@echo "  make backup-db       - Runs the database backup script"

# Backend commands
start-backend:
	@echo "Starting backend server..."
	@cd backend && uv run uvicorn app.main:app --reload --app-dir .

test-backend:
	@echo "Running backend tests..."
	@cd backend && PYTHONPATH=$(PWD) uv run pytest

install-backend:
	@echo "Installing backend dependencies..."
	@cd backend && uv sync

# Frontend commands
start-frontend:
	@echo "Starting frontend development server..."
	@cd frontend && npm start

test-frontend:
	@echo "Running frontend tests..."
	@cd frontend && npm test -- --watchAll=false
	@# Added --watchAll=false to prevent hanging in CI or non-interactive environments

install-frontend:
	@echo "Installing frontend dependencies..."
	@cd frontend && npm install

# Database backup command
backup-db:
	@echo "Running database backup script..."
	@cd backend && PYTHONPATH=$$(pwd) uv run python scripts/backup_database.py

# Combined commands
start: start-backend start-frontend
	@echo "To run both backend and frontend concurrently, you might want to use separate terminals or a tool like 'concurrently'."

test: test-backend test-frontend

install: install-backend install-frontend
