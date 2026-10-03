#!/usr/bin/env bash
set -euo pipefail

deploy_root=/opt/rehabmind-v2
source_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)
if [[ "$source_root" != "$deploy_root/source" ]]; then
  echo 'Run this script from /opt/rehabmind-v2/source.' >&2
  exit 1
fi

main() {
  cd "$source_root"
  git pull --ff-only origin main
  npm ci --include=dev --no-audit --no-fund
  VITE_BASE_PATH=/RehabMind/ VITE_API_BASE_URL=/RehabMind npm run build
  mkdir -p "$deploy_root/web" "$deploy_root/api" "$deploy_root/knowledge"
  rsync -a --delete --exclude='/design-preview/' --exclude='/style-demo.html' build/web/ "$deploy_root/web/"
  # Cached copies of the original documents may still request the old image
  # URLs. Hard links preserve those URLs without storing duplicate image data.
  ln -f "$deploy_root/web/postop/guides/acl/acl.webp" "$deploy_root/web/postop/guides/acl-meniscus/acl.webp"
  ln -f "$deploy_root/web/postop/guides/meniscus/01-right-knee-meniscus-top-view.webp" "$deploy_root/web/postop/guides/acl-meniscus/01-right-knee-meniscus-top-view.webp"
  ln -f "$deploy_root/web/postop/guides/meniscus/02-meniscus-vascular-zones-and-injury.webp" "$deploy_root/web/postop/guides/acl-meniscus/02-meniscus-vascular-zones-and-injury.webp"
  rsync -a --delete api/ "$deploy_root/api/"
  cp build/knowledge/runtime.json "$deploy_root/knowledge/runtime.json"
  sudo -n systemctl restart rehabmind-v2
  curl --fail --silent --show-error --retry 5 --retry-connrefused --retry-delay 1 http://127.0.0.1:8787/api/health
  printf '\nDeployed commit: '
  git rev-parse --short HEAD
}

main "$@"
