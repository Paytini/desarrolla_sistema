#!/usr/bin/env bash
# Arranca la APP con el env de load testing (process.env gana sobre .env de Next)
set -euo pipefail
cd "$(dirname "$0")/../.."
if [ ! -f load-testing/.env.app ]; then
  echo "Falta load-testing/.env.app — copia .env.app.example y ajusta" >&2
  exit 1
fi
set -a; source load-testing/.env.app; set +a
npm run build
exec npx next start -p "${PORT:-3005}"
