#!/usr/bin/env bash
set -euo pipefail
BASE_URL="${BASE_URL:-http://localhost:3000/api/v1}"
EMAIL="${SMOKE_EMAIL:-paciente.demo@corazonmigrante.test}"
PASSWORD="${SMOKE_PASSWORD:-Demo123456!}"

command -v curl >/dev/null || { echo "curl requerido"; exit 1; }
command -v jq >/dev/null || { echo "jq requerido"; exit 1; }

echo "[1/5] Health"
curl -fsS "$BASE_URL/health" | jq .

echo "[2/5] Login paciente"
TOKEN=$(curl -fsS -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" | jq -r '.data.accessToken')

test "$TOKEN" != "null" && test -n "$TOKEN"

echo "[3/5] /me"
curl -fsS "$BASE_URL/me" -H "Authorization: Bearer $TOKEN" | jq .data.email

echo "[4/5] Catálogo público"
curl -fsS "$BASE_URL/therapy/approaches" | jq '.data | length'
curl -fsS "$BASE_URL/therapy/products" | jq '.data | length'

echo "[5/5] CMS público"
curl -fsS "$BASE_URL/public/pages/inicio" | jq .data.slug

echo "Smoke OK"
