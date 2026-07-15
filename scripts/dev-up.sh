#!/usr/bin/env bash
# ==============================================================
# StadiumOps AI — Dev environment bootstrap
# --------------------------------------------------------------
# Run once on a fresh checkout. Verifies prerequisites and installs deps.
# ==============================================================

set -euo pipefail

green() { printf "\033[32m%s\033[0m\n" "$1"; }
yellow(){ printf "\033[33m%s\033[0m\n" "$1"; }
red()   { printf "\033[31m%s\033[0m\n" "$1"; }

echo "🚀 Bootstrapping StadiumOps AI dev environment…"
echo ""

# --- Node ---
if ! command -v node >/dev/null 2>&1; then
  red "✗ Node.js not found. Install Node 20.11+ via nvm: https://nodejs.org/"
  exit 1
fi
node_version=$(node -v | sed 's/v//')
node_major=$(echo "$node_version" | cut -d. -f1)
if [ "$node_major" -lt 20 ]; then
  red "✗ Node 20+ required, found $node_version"
  exit 1
fi
green "✓ Node $node_version"

# --- pnpm ---
if ! command -v pnpm >/dev/null 2>&1; then
  yellow "→ Installing pnpm@10…"
  npm install -g pnpm@10
fi
pnpm_version=$(pnpm -v)
green "✓ pnpm $pnpm_version"

# --- gcloud (optional, for deploy) ---
if command -v gcloud >/dev/null 2>&1; then
  green "✓ gcloud CLI available"
else
  yellow "  gcloud CLI not found (optional — required only for deploy)"
fi

# --- firebase (optional, for deploy) ---
if command -v firebase >/dev/null 2>&1; then
  green "✓ Firebase CLI available"
else
  yellow "  Firebase CLI not found (optional — required only for deploy)"
fi

# --- Docker (optional, for container build) ---
if command -v docker >/dev/null 2>&1; then
  green "✓ Docker available"
else
  yellow "  Docker not found (optional — required only for container build)"
fi

echo ""
echo "📦 Installing workspace dependencies…"
pnpm install

echo ""
if [ ! -f .env ]; then
  yellow "→ Copying .env.example → .env (fill in your keys!)"
  cp .env.example .env
fi

echo ""
green "✅ Bootstrap complete!"
echo ""
echo "Next steps:"
echo "  1. Edit .env and fill in FIREBASE_* and GEMINI_API_KEY"
echo "  2. Run: pnpm dev:api   (in one terminal)"
echo "  3. Run: pnpm dev:web   (in another terminal)"
echo "  4. Open: http://localhost:5173"
echo ""
echo "Cloud setup (see README §'Beginner's Guide' for details):"
echo "  make setup-cloud"
