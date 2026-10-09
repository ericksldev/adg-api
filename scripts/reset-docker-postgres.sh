#!/usr/bin/env bash
# Removes only the Postgres data volume for this stack (all DBs in the cluster: SaaS + tenant_*).
# Keeps the node_modules volume so the API container does not reinstall node_modules.
# Run from the vrete-api directory: ./scripts/reset-docker-postgres.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${API_DIR}"

POSTGRES_VOLUME_NAME="${POSTGRES_DOCKER_VOLUME:-adg-api_pgdata}"

echo "Stopping containers..."
docker compose down

echo "Removing Postgres volume: ${POSTGRES_VOLUME_NAME} ..."
docker volume rm "${POSTGRES_VOLUME_NAME}" 2>/dev/null || {
  echo "Note: volume not found or still in use; if data persists, run: docker volume ls | grep ${POSTGRES_VOLUME_NAME}"
}

echo "Done. Start again: docker compose up -d"
echo "First API boot will sync schema and seed saas_owner from .env (if none exists). Login with SEED_SAAS_OWNER_EMAIL / SEED_SAAS_OWNER_PASSWORD."
