#!/usr/bin/env bash
# Renders the social images with Edge headless (Chrome headless hangs on
# some Windows setups). Usage: npm run images
set -euo pipefail
cd "$(dirname "$0")/.."
EDGE="${EDGE:-/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe}"
ROOT="$(pwd -W 2>/dev/null || pwd)"
render() {
  timeout 60 "$EDGE" --headless=new --disable-gpu --hide-scrollbars --window-size="$3" \
    --screenshot="$ROOT/$2" "file:///$ROOT/scripts/templates/$1" 2>/dev/null || true
  echo "rendered $2"
}
render card.html assets/social-preview.png 1280,640
render card.html docs/og.png 1200,630
