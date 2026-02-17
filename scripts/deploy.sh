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

# Ensure logs directory exists
mkdir -p logs

# Rebuild client
echo "Building client..."
npm run build

# Validate build output
if [ ! -f client/dist/index.html ]; then
  echo "ERROR: Build failed — client/dist/index.html not found"
  exit 1
fi

# Restart the server (start if not already registered with PM2)
echo "Restarting server..."
pm2 describe revision > /dev/null 2>&1 && pm2 restart revision || pm2 start ecosystem.config.cjs

echo ""
echo "=== Deployed! ==="
echo "$(git log --oneline -1)"
pm2 status revision
