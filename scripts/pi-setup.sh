#!/bin/bash
# RE-VISION: One-time Raspberry Pi setup script
# Run this on a fresh Pi with: bash scripts/pi-setup.sh
set -e

echo "=== RE-VISION Pi Setup ==="
echo ""

# 1. Install Node.js 20 LTS
if ! command -v node &> /dev/null; then
  echo "Installing Node.js 20 LTS..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
else
  echo "Node.js already installed: $(node --version)"
fi

# 2. Install PM2 globally
if ! command -v pm2 &> /dev/null; then
  echo "Installing PM2..."
  sudo npm install -g pm2
else
  echo "PM2 already installed: $(pm2 --version)"
fi

# 3. Install build tools (needed for better-sqlite3 native addon)
echo "Installing build tools for native modules..."
sudo apt-get install -y build-essential python3

# 4. Clone repo (if not already cloned)
APP_DIR="$HOME/revision"
if [ ! -d "$APP_DIR" ]; then
  echo "Cloning RE-VISION repository..."
  echo "Enter your GitHub repo URL (e.g. https://github.com/username/re-vision.git):"
  read -r REPO_URL
  git clone "$REPO_URL" "$APP_DIR"
else
  echo "Repository already exists at $APP_DIR"
fi

cd "$APP_DIR"

# 5. Install dependencies
echo "Installing dependencies..."
npm run install-all

# 6. Build client
echo "Building client..."
mkdir -p logs
npm run build

# 7. Set up .env file
if [ ! -f .env ]; then
  echo ""
  echo "Enter your Anthropic API key (or press Enter to skip):"
  read -r API_KEY
  if [ -n "$API_KEY" ]; then
    echo "ANTHROPIC_API_KEY=$API_KEY" > .env
  else
    cp .env.example .env 2>/dev/null || echo "ANTHROPIC_API_KEY=sk-ant-your-key-here" > .env
    echo "Created .env with placeholder key - edit it later with your real key"
  fi
fi

# 8. Run migration
echo "Running JSON → SQLite migration..."
node server/db/migrate-json.js

# 9. Start with PM2
echo "Starting RE-VISION with PM2..."
pm2 start ecosystem.config.cjs
pm2 save

# 10. Set up PM2 to start on boot
echo "Setting up auto-start on boot..."
pm2 startup | tail -1 | bash 2>/dev/null || echo "Run the pm2 startup command shown above manually if it failed"

echo ""
echo "=== Setup complete! ==="
echo "RE-VISION is running at:"
echo "  Local:   http://localhost:3001"
NETWORK_IP=$(hostname -I | awk '{print $1}')
echo "  Network: http://$NETWORK_IP:3001"
echo ""
echo "Next steps:"
echo "  1. Install Tailscale for remote access: curl -fsSL https://tailscale.com/install.sh | sh"
echo "  2. Run: sudo tailscale up"
echo "  3. Access from anywhere via your Tailscale hostname"
