#!/usr/bin/env bash
set -euo pipefail

cd /opt/apps/pappapod
echo "[pappapod] Building..."
npm run build
echo "[pappapod] Restarting service..."
systemctl --user restart pappapod
echo "[pappapod] Done. Service status:"
systemctl --user status pappapod --no-pager | head -5
