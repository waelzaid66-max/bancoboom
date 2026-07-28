#!/usr/bin/env bash
# One-time GCP project bootstrap for BANCO API on Cloud Run.
# Usage: PROJECT_ID=my-proj REGION=europe-west1 bash deploy/gcp/scripts/bootstrap-project.sh
set -euo pipefail

PROJECT_ID="${PROJECT_ID:-}"
REGION="${REGION:-europe-west1}"
AR_REPO="${AR_REPO:-banco}"
CREATE_SERVICE_ACCOUNTS="${CREATE_SERVICE_ACCOUNTS:-false}"

if [[ -z "$PROJECT_ID" ]]; then
  echo "Set PROJECT_ID=your-gcp-project" >&2
  exit 1
fi

gcloud config set project "$PROJECT_ID"

echo "[bootstrap] enabling APIs..."
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  sqladmin.googleapis.com \
  iam.googleapis.com

echo "[bootstrap] Artifact Registry docker repo: $AR_REPO @ $REGION"
if ! gcloud artifacts repositories describe "$AR_REPO" --location="$REGION" >/dev/null 2>&1; then
  gcloud artifacts repositories create "$AR_REPO" \
    --repository-format=docker \
    --location="$REGION" \
    --description="BANCO API images"
fi

if [[ "$CREATE_SERVICE_ACCOUNTS" == "true" ]]; then
  CB_SA="banco-cloudbuild"
  RUN_SA="banco-api-run"
  gcloud iam service-accounts create "$CB_SA" --display-name="BANCO Cloud Build" 2>/dev/null || true
  gcloud iam service-accounts create "$RUN_SA" --display-name="BANCO Cloud Run runtime" 2>/dev/null || true
  echo "[bootstrap] Created/verified SAs: $CB_SA, $RUN_SA — bind roles per deploy/gcp/reports/05-SECURITY_AND_IAM.md"
fi

echo "[bootstrap] done. Next: secrets (SECRET_MANAGER_MAPPING.md), Cloud SQL, then cloudbuild.deploy.yaml"
