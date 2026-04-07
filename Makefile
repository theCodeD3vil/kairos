.PHONY: help doctor install typecheck build lint format clean \
	shared-build frontend-build extension-build desktop-build \
	desktop-release-build desktop-release-check desktop-release-artifacts desktop-release-checksums \
	extension-release-package extension-release-publish \
	desktop-frontend desktop-dev dev dev-down setup

DEV_DIR := .dev
FRONTEND_PID := $(DEV_DIR)/frontend.pid
WAILS_PID := $(DEV_DIR)/wails.pid
ROOT_DIR := $(CURDIR)
KAIROS_VERSION ?= $(shell cat VERSION)

help: ## Show available commands
	@echo "Kairos developer automation"
	@echo ""
	@awk 'BEGIN {FS = ":.*## "; printf "Usage: make <target>\n\nTargets:\n"} /^[a-zA-Z0-9_.-]+:.*## / {printf "  %-18s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

setup: ## Run repo bootstrap (use OS-specific scripts on fresh machines)
	@echo "For fresh machine provisioning, prefer:"
	@echo "  macOS:  ./scripts/setup-macos.sh"
	@echo "  Ubuntu: ./scripts/setup-ubuntu.sh"
	@echo ""
	./scripts/bootstrap.sh

doctor: ## Check required tools and print versions
	@missing=0; \
	for tool in go node pnpm; do \
		if command -v $$tool >/dev/null 2>&1; then \
			case "$$tool" in \
				pnpm) version_cmd='pnpm -v' ;; \
				go) version_cmd='go version' ;; \
				node) version_cmd='node -v' ;; \
			esac; \
			printf "[ok] %s: %s\n" "$$tool" "$$($$version_cmd 2>/dev/null)"; \
		else \
			echo "[missing] $$tool (required)"; \
			missing=1; \
		fi; \
	done; \
	if command -v wails >/dev/null 2>&1; then \
		printf "[ok] wails (optional): %s\n" "$$(wails version | head -n 1)"; \
	elif [ -x "$$HOME/go/bin/wails" ]; then \
		printf "[ok] wails (optional): %s\n" "$$($$HOME/go/bin/wails version | head -n 1)"; \
	else \
		echo "[missing] wails (optional)"; \
		echo "          install with: go install github.com/wailsapp/wails/v2/cmd/wails@latest"; \
	fi; \
	if [ $$missing -ne 0 ]; then \
		echo ""; \
		echo "One or more required tools are missing."; \
		exit 1; \
	fi

install: ## Install workspace dependencies
	pnpm install
	cd apps/desktop && go mod tidy

typecheck: ## Run workspace type checks
	pnpm typecheck

shared-build: ## Build @kairos/shared
	pnpm --filter @kairos/shared build

frontend-build: ## Build desktop frontend
	pnpm --filter @kairos/desktop-frontend build

extension-build: ## Build VS Code extension bundle
	pnpm --filter kairos-vscode build

extension-release-package: ## Build and package VS Code extension .vsix
	pnpm --filter kairos-vscode package:vsix

extension-release-publish: ## Publish VS Code extension to Marketplace using VSCE_PAT
	pnpm --filter kairos-vscode publish:marketplace

desktop-build: ## Build Go desktop scaffold
	cd apps/desktop && go mod tidy && go build ./...

desktop-release-build: ## Build the packaged desktop app with Wails
	@if command -v wails >/dev/null 2>&1; then \
		cd apps/desktop && KAIROS_DATABASE_PATH="$(ROOT_DIR)/apps/desktop/build/kairos-build.sqlite3" KAIROS_LOCAL_SERVER_PORT=0 wails build; \
	elif [ -x "$$HOME/go/bin/wails" ]; then \
		cd apps/desktop && KAIROS_DATABASE_PATH="$(ROOT_DIR)/apps/desktop/build/kairos-build.sqlite3" KAIROS_LOCAL_SERVER_PORT=0 "$$HOME/go/bin/wails" build; \
	else \
		echo "wails CLI is not installed."; \
		echo "Install with: go install github.com/wailsapp/wails/v2/cmd/wails@latest"; \
		exit 1; \
	fi

desktop-release-artifacts: desktop-release-build ## Collect desktop release artifacts into dist/release/desktop/<version>/<platform>
	@platform="$$(uname -s | tr '[:upper:]' '[:lower:]')"; \
	output_dir="$(ROOT_DIR)/dist/release/desktop/$(KAIROS_VERSION)/$$platform"; \
	./scripts/release/collect-desktop-artifacts.sh "$(KAIROS_VERSION)" "$$platform" "$$output_dir"

desktop-release-checksums: ## Recompute checksums for existing desktop release artifacts
	@platform="$$(uname -s | tr '[:upper:]' '[:lower:]')"; \
	output_dir="$(ROOT_DIR)/dist/release/desktop/$(KAIROS_VERSION)/$$platform"; \
	./scripts/release/write-checksums.sh "$$output_dir" "$$output_dir/SHA256SUMS-$$platform.txt"

desktop-release-check: ## Verify desktop release inputs before packaging
	pnpm --filter @kairos/desktop-frontend typecheck
	pnpm --filter @kairos/desktop-frontend build
	cd apps/desktop && go test ./...

build: shared-build frontend-build extension-build desktop-build ## Build scaffold components

lint: ## Run lint scripts (currently placeholder lint output)
	pnpm lint

format: ## Format repository with Prettier
	pnpm format

clean: ## Remove repo-local generated artifacts
	@rm -rf \
		apps/desktop/frontend/dist \
		apps/vscode-extension/dist \
		packages/shared/dist \
		apps/desktop/build
	@find . -name '*.tsbuildinfo' -type f -delete

desktop-frontend: ## Start desktop frontend dev server
	pnpm dev:desktop

desktop-dev: ## Run Wails desktop dev mode (if installed)
	@if command -v wails >/dev/null 2>&1; then \
		cd apps/desktop && wails dev; \
	elif [ -x "$$HOME/go/bin/wails" ]; then \
		cd apps/desktop && "$$HOME/go/bin/wails" dev; \
	else \
		echo "wails CLI is not installed."; \
		echo "Install with: go install github.com/wailsapp/wails/v2/cmd/wails@latest"; \
	fi

dev: ## Start scaffold dev environment in background (wails if available, else frontend)
	@mkdir -p $(DEV_DIR)
	@if command -v wails >/dev/null 2>&1; then \
		if [ -f $(WAILS_PID) ] && kill -0 $$(cat $(WAILS_PID)) >/dev/null 2>&1; then \
			echo "Wails dev is already running (pid=$$(cat $(WAILS_PID)))."; \
		else \
			cd apps/desktop && nohup wails dev > "$(ROOT_DIR)/$(DEV_DIR)/wails.log" 2>&1 & echo $$! > "$(ROOT_DIR)/$(WAILS_PID)"; \
			echo "Started Wails dev (pid=$$(cat $(WAILS_PID))). Log: $(DEV_DIR)/wails.log"; \
		fi; \
	elif [ -x "$$HOME/go/bin/wails" ]; then \
		if [ -f $(WAILS_PID) ] && kill -0 $$(cat $(WAILS_PID)) >/dev/null 2>&1; then \
			echo "Wails dev is already running (pid=$$(cat $(WAILS_PID)))."; \
		else \
			cd apps/desktop && nohup "$$HOME/go/bin/wails" dev > "$(ROOT_DIR)/$(DEV_DIR)/wails.log" 2>&1 & echo $$! > "$(ROOT_DIR)/$(WAILS_PID)"; \
			echo "Started Wails dev (pid=$$(cat $(WAILS_PID))). Log: $(DEV_DIR)/wails.log"; \
		fi; \
	else \
		if [ -f $(FRONTEND_PID) ] && kill -0 $$(cat $(FRONTEND_PID)) >/dev/null 2>&1; then \
			echo "Desktop frontend dev server is already running (pid=$$(cat $(FRONTEND_PID)))."; \
		else \
			nohup pnpm dev:desktop > $(DEV_DIR)/frontend.log 2>&1 & echo $$! > $(FRONTEND_PID); \
			echo "Started desktop frontend dev server (pid=$$(cat $(FRONTEND_PID))). Log: $(DEV_DIR)/frontend.log"; \
		fi; \
		echo "Wails CLI not found. Install with: go install github.com/wailsapp/wails/v2/cmd/wails@latest"; \
	fi

dev-down: ## Stop background scaffold dev environment started by make dev
	@stopped=0; \
	if [ -f $(WAILS_PID) ]; then \
		pid=$$(cat $(WAILS_PID)); \
		if kill -0 $$pid >/dev/null 2>&1; then \
			kill $$pid >/dev/null 2>&1 || true; \
			echo "Stopped Wails dev (pid=$$pid)."; \
			stopped=1; \
		fi; \
		rm -f $(WAILS_PID); \
	fi; \
	if [ -f $(FRONTEND_PID) ]; then \
		pid=$$(cat $(FRONTEND_PID)); \
		if kill -0 $$pid >/dev/null 2>&1; then \
			kill $$pid >/dev/null 2>&1 || true; \
			echo "Stopped desktop frontend dev server (pid=$$pid)."; \
			stopped=1; \
		fi; \
		rm -f $(FRONTEND_PID); \
	fi; \
	if [ $$stopped -eq 0 ]; then \
		echo "No managed dev processes were running."; \
	fi
