import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import os from 'os'

// Use the machine's LAN IP instead of localhost to avoid port conflicts
// with other processes (e.g. VS Code) that may bind to 127.0.0.1:3001
function getServerHost() {
  const nets = os.networkInterfaces();
  for (const ifaces of Object.values(nets)) {
    for (const iface of ifaces) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    proxy: {
      '/api': `http://${getServerHost()}:3001`
    }
  }
})