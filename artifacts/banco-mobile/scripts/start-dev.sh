#!/usr/bin/env bash
# Starts the Expo development server with the public configuration required by
# a physical Expo Go client. Keep this as a script (rather than a long package
# command) so missing config fails before Metro can emit a bad bundle.
set -euo pipefail

if [[ -z "${EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY:-}" ]]; then
  echo "EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY is required to start BANCO Mobile." >&2
  echo "Set it in Replit shared environment settings, then restart this workflow." >&2
  exit 1
fi

if [[ -z "${REPLIT_DEV_DOMAIN:-}" || -z "${REPLIT_EXPO_DEV_DOMAIN:-}" ]]; then
  echo "This Replit Expo workflow requires REPLIT_DEV_DOMAIN and REPLIT_EXPO_DEV_DOMAIN." >&2
  exit 1
fi

# Native Expo clients cannot call the web app's relative /api path. The API
# workflow is exposed on 8080, so make that endpoint explicit for development.
export EXPO_PUBLIC_API_BASE_URL="${EXPO_PUBLIC_API_BASE_URL:-https://${REPLIT_DEV_DOMAIN}:8080}"
export EXPO_PUBLIC_DOMAIN="${EXPO_PUBLIC_DOMAIN:-banco.today}"
export EXPO_PACKAGER_PROXY_URL="https://${REPLIT_EXPO_DEV_DOMAIN}"
export EXPO_PUBLIC_REPL_ID="${REPL_ID:-}"
export REACT_NATIVE_PACKAGER_HOSTNAME="${REPLIT_DEV_DOMAIN}"

# app.json carries owner/projectId (required for EAS builds). With those set,
# `expo start` in CI tries to authenticate against Expo's servers and dies with
# "Use the EXPO_TOKEN environment variable" — killing Metro and leaving Expo Go
# with the 500 error screen. Dev Metro must never phone home: run offline.
# (EAS builds set their own EXPO_TOKEN and don't go through this script.)
export EXPO_OFFLINE=1

# Restarts under CI=1 are non-interactive: if a previous Metro still holds the
# port, expo prompts "Use port X instead?" and exits. Free the port up front.
fuser -k "${PORT:-8081}/tcp" 2>/dev/null || true

echo "Starting BANCO Mobile with Clerk configuration and API port 8080."
exec pnpm exec expo start --localhost --clear --port "${PORT:-8081}"