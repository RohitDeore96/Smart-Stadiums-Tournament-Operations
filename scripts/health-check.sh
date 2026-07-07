#!/usr/bin/env bash
# ==============================================================
# StadiumOps AI — Local dev health check
# --------------------------------------------------------------
# Verifies API + Web are running. Used by Makefile / CI smoke tests.
# ==============================================================

set -euo pipefail

API_URL="${API_URL:-http://localhost:8080}"
WEB_URL="${WEB_URL:-http://localhost:5173}"

green() { printf "\033[32m%s\033[0m\n" "$1"; }
red()   { printf "\033[31m%s\033[0m\n" "$1"; }
yellow(){ printf "\033[33m%s\033[0m\n" "$1"; }

fail=0

# --- API health ---
echo "Checking API at $API_URL/api/v1/health…"
api_resp=$(curl -sS -m 3 -o /dev/null -w "%{http_code}" "$API_URL/api/v1/health" 2>/dev/null || echo "000")
if [ "$api_resp" = "200" ]; then
  green "  ✓ API healthy (200)"
else
  red "  ✗ API check failed (HTTP $api_resp)"
  fail=1
fi

# --- Web health ---
echo "Checking Web at $WEB_URL…"
web_resp=$(curl -sS -m 3 -o /dev/null -w "%{http_code}" "$WEB_URL" 2>/dev/null || echo "000")
if [ "$web_resp" = "200" ]; then
  green "  ✓ Web healthy (200)"
else
  red "  ✗ Web check failed (HTTP $web_resp)"
  fail=1
fi

echo ""
if [ "$fail" = "0" ]; then
  green "✅ All services healthy"
  exit 0
else
  red "❌ Some services failed — see above"
  exit 1
fi
