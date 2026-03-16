#!/bin/bash
# Session Start Hook - Auto-onboarding for new Claude sessions
# This runs when a new Claude Code session starts in this repo

set -e

echo "=== Splose UI Prototype - Session Onboarding ==="
echo ""

# Check if deps are installed
if [ ! -d "node_modules" ]; then
  echo "[SETUP] Installing dependencies..."
  npm install --silent
fi

# Check if database exists
if [ ! -f "dev.db" ] && [ ! -f "prisma/dev.db" ]; then
  echo "[SETUP] Creating database..."
  if [ ! -f ".env" ]; then
    echo 'DATABASE_URL="file:./dev.db"' > .env
  fi
  npx prisma db push --skip-generate 2>/dev/null || true
fi

# Check Playwright
if ! npx playwright --version >/dev/null 2>&1; then
  echo "[SETUP] Installing Playwright browsers..."
  npx playwright install chromium 2>/dev/null || true
fi

# Display project status
echo ""
echo "[STATUS] Branch: $(git branch --show-current)"
echo "[STATUS] Last commit: $(git log --oneline -1)"
echo "[STATUS] Reference screenshots: $(find references/screenshots -name 'manifest.json' 2>/dev/null | wc -l) batches"
echo "[STATUS] Components: $(find components -name '*.tsx' -not -name '*.stories.*' 2>/dev/null | wc -l) files"
echo ""
echo "[READ] Key docs: CLAUDE.md, HANDOVER.md, REDESIGN_SPRINT.md"
echo "[READ] Screenshots: references/screenshots/batch-*/manifest.json"
echo ""
echo "=== Ready to develop ==="
