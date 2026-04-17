#!/usr/bin/env bash
set -euo pipefail

SERVER="77.42.84.152"
REMOTE_DIR="/var/www/davidnavratil.com/analyses/hormuz"
SSH_USER="root"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "Deploying Hormuz to $SERVER..."
ssh "${SSH_USER}@${SERVER}" "mkdir -p ${REMOTE_DIR}"
rsync -avz --delete \
  --exclude='.git' \
  --exclude='.github' \
  --exclude='scripts/' \
  --exclude='*.md' \
  --exclude='.gitignore' \
  "$PROJECT_DIR/" "${SSH_USER}@${SERVER}:${REMOTE_DIR}/"

echo "Done. https://davidnavratil.com/analyses/hormuz/"
