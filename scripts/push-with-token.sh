#!/usr/bin/env bash
# ============================================================
# One-command push: run from repo root with your GitHub token
#
# Usage:
#   GH_TOKEN=ghp_xxxxx scripts/push-with-token.sh
#
# Or save the token to ~/.gh-token once:
#   echo "ghp_xxxxx" > ~/.gh-token
#   chmod 600 ~/.gh-token
#   scripts/push-with-token.sh
# ============================================================
set -euo pipefail

cd "$(dirname "$0")/.." || exit 1

# Get token from arg, env, or ~/.gh-token
TOKEN="${GH_TOKEN:-}"
if [ -z "$TOKEN" ] && [ -f "$HOME/.gh-token" ]; then
  TOKEN="$(cat "$HOME/.gh-token")"
fi

if [ -z "$TOKEN" ]; then
  echo "❌ No GitHub token. Set GH_TOKEN env var or save to ~/.gh-token"
  echo "   Create one at: https://github.com/settings/tokens (needs 'repo' scope)"
  exit 1
fi

# Configure git to use the token
REPO_URL="https://${TOKEN}@github.com/RohitDeore96/Smart-Stadiums-Tournament-Operations.git"
git remote set-url origin "$REPO_URL"

echo "▶ Pushing to GitHub..."
git push origin main
git push origin v0.4.0 --force-if-includes 2>/dev/null || git push origin v0.4.0 -f

# Reset URL to remove token (security)
git remote set-url origin "https://github.com/RohitDeore96/Smart-Stadiums-Tournament-Operations.git"

echo "✅ Pushed successfully"
echo ""
echo "Vercel will auto-deploy in ~30s."
echo "Live: https://smart-stadiums-tournament-operation-nine.vercel.app"
echo "Watch: https://vercel.com/dashboard"
