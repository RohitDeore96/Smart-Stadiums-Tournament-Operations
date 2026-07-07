# ==============================================================
# StadiumOps AI — Makefile
# --------------------------------------------------------------
# Common dev commands. Run `make help` to see all targets.
# ==============================================================

.DEFAULT_GOAL := help
.PHONY: help install dev dev-api dev-web build test test-cov lint typecheck format clean git-init git-status

# Colors (only when stdout is a TTY)
ifeq ($(shell test -t 1 && echo true), true)
  BOLD := \033[1m
  CYAN := \033[36m
  GREEN := \033[32m
  YELLOW := \033[33m
  RESET := \033[0m
else
  BOLD := ""
  CYAN := ""
  GREEN := ""
  YELLOW := ""
  RESET := ""
endif

help: ## Show this help
	@echo ""
	@echo "$(BOLD)StadiumOps AI$(RESET) — make targets"
	@echo ""
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / { printf "  $(CYAN)%-18s$(RESET) %s\n", $$1, $$2 }' $(MAKEFILE_LIST)
	@echo ""

install: ## Install all workspace dependencies (pnpm)
	@command -v pnpm >/dev/null 2>&1 || { echo "$(YELLOW)Installing pnpm…$(RESET)"; npm install -g pnpm@9; }
	pnpm install

dev: ## Run API + Web in parallel (requires tmux or two terminals)
	@echo "$(YELLOW)Tip: open two terminals and run 'make dev-api' and 'make dev-web' separately.$(RESET)"
	@echo ""
	@make dev-api &
	@make dev-web
	@wait

dev-api: ## Start backend dev server (Fastify on :8080)
	pnpm dev:api

dev-web: ## Start frontend dev server (Vite on :5173)
	pnpm dev:web

build: ## Build all workspaces
	pnpm build

test: ## Run all tests
	pnpm test

test-cov: ## Run tests with coverage report
	pnpm test:coverage

lint: ## Lint all workspaces (eslint)
	pnpm lint

typecheck: ## Typecheck all workspaces (tsc --noEmit)
	pnpm typecheck

format: ## Format all files (prettier)
	pnpm format

format-check: ## Check formatting without writing
	pnpm format:check

clean: ## Remove all build artifacts and node_modules
	@echo "$(YELLOW)Removing build artifacts…$(RESET)"
	rm -rf apps/api/dist apps/web/dist packages/shared/dist
	rm -rf apps/api/coverage apps/web/coverage
	rm -rf apps/api/node_modules apps/web/node_modules packages/shared/node_modules node_modules
	rm -rf pnpm-lock.yaml
	@echo "$(GREEN)Done. Run 'make install' to start fresh.$(RESET)"

git-init: ## Initialize git repo with initial commit (for fresh setup)
	@if [ ! -d .git ]; then \
		echo "$(YELLOW)Initializing git…$(RESET)"; \
		git init -b main; \
		git add .; \
		git commit -m "feat: phase 1 — architecture, data models, Dockerfile, CI/CD"; \
		echo "$(GREEN)Done. Now add your remote:$(RESET)"; \
		echo "  git remote add origin https://github.com/RohitDeore96/Smart-Stadiums-Tournament-Operations.git"; \
		echo "  git push -u origin main"; \
	else \
		echo "$(YELLOW)Git already initialized. Use 'make git-status' to check state.$(RESET)"; \
	fi

git-status: ## Show git status
	@git status -sb

setup-cloud: ## Show the cloud setup checklist (gcloud + firebase)
	@echo "$(BOLD)Cloud setup checklist:$(RESET)"
	@echo "  1. $(CYAN)gcloud init$(RESET)                              — sign in + pick project"
	@echo "  2. $(CYAN)gcloud auth login$(RESET)                       — auth for local CLI"
	@echo "  3. $(CYAN)gcloud services enable run.googleapis.com \\$(RESET)"
	@echo "       artifactregistry.googleapis.com \\$(RESET)"
	@echo "       secretmanager.googleapis.com \\$(RESET)"
	@echo "       cloudbuild.googleapis.com$(RESET)            — enable APIs"
	@echo "  4. Create service account + download JSON key (see README)"
	@echo "  5. $(CYAN)firebase login$(RESET)                          — Firebase CLI auth"
	@echo "  6. $(CYAN)firebase login:ci$(RESET)                       — get CI token"
	@echo "  7. Add GitHub Secrets (see README §'GitHub Repository Secrets')"
