#!/usr/bin/env bash
set -euo pipefail

cd /opt/apps/podda
echo "[podda] Building..."
npm run build
echo "[podda] Restarting service..."
systemctl --user restart podda
echo "[podda] Done. Service status:"
systemctl --user status podda --no-pager | head -5
