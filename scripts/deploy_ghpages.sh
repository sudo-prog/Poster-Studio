#!/usr/bin/env bash
# Poster Studio — build + commit master + deploy GitHub Pages (gh-pages branch).
# Run ONLY after the full 1:1 rebuild + mobile verification is complete in the working tree.
set -euo pipefail

REPO=/home/thinkpad/Data/20_Projects/POSTER_STUDIO
WT=/tmp/poster-ghpages-wt
cd "$REPO"

echo "[1/4] build (BASE_PATH=/Poster-Studio/)..."
npm run build

echo "[2/4] commit master..."
git add -A
if git diff --cached --quiet; then
  echo "  nothing to commit on master"
else
  git commit -m "feat: full 1:1 functional rebuild — 61 shaders, transform/appearance/adjust panels, presets, undo/redo, zh/en toggle, export code; mobile 44px tap targets"
fi
git push origin master

echo "[3/4] deploy dist -> gh-pages (worktree)..."
rm -rf "$WT"
git worktree add --force "$WT" gh-pages
(
  cd "$WT"
  git rm -rf --quiet . >/dev/null 2>&1 || true
  cp -r "$REPO"/dist/* .
  touch .nojekyll
  git add -A
  git commit -m "deploy: Poster Studio GitHub Pages build ($(date -u +%Y-%m-%dT%H:%M:%SZ))"
)
git push origin gh-pages
git worktree remove --force "$WT"

echo "[4/4] DONE. Live: https://sudo-prog.github.io/Poster-Studio/"
