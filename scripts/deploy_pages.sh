#!/usr/bin/env bash
# Poster Studio — build + deploy dist/ to gh-pages ONLY (no master commit/push).
# Safe to call from a git post-commit hook: never commits to master, so no loop.
set -euo pipefail

REPO=/home/thinkpad/Data/20_Projects/POSTER_STUDIO
WT=/tmp/poster-ghpages-wt
cd "$REPO"

echo "[pages] build (BASE_PATH=/Poster-Studio/)..."
npm run build

rm -rf "$WT"
git worktree add --force "$WT" gh-pages
(
  cd "$WT"
  git rm -rf --quiet . >/dev/null 2>&1 || true
  cp -r "$REPO"/dist/* .
  touch .nojekyll
  git add -A
  if git diff --cached --quiet; then
    echo "[pages] gh-pages already current — nothing to deploy"
  else
    git commit -m "deploy: Poster Studio GitHub Pages build ($(date -u +%Y-%m-%dT%H:%M:%SZ))"
    git push origin gh-pages
    echo "[pages] DONE -> https://sudo-prog.github.io/Poster-Studio/"
  fi
)
git worktree remove --force "$WT"
