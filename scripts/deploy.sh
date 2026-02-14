#!/bin/bash
# RE-VISION: Deploy latest changes from GitHub
# Run on the Pi after pushing changes: bash scripts/deploy.sh
set -e

APP_DIR="$HOME/revision"
cd "$APP_DIR"

echo "=== Deploying RE-VISION ==="

# Pull latest changes
echo "Pulling latest changes..."
git pull origin master

# Install any new dependencies
echo "Installing dependencies..."
npm run install-all

# Rebuild client
echo "Building client..."
npm run build

# Restart the server
echo "Restarting server..."
pm2 restart revision

echo ""
echo "=== Deployed! ==="
echo "$(git log --oneline -1)"
pm2 status revision
