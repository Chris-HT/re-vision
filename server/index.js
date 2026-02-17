import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';
import db from './db/index.js';
import authRoutes from './routes/auth.js';
import questionRoutes from './routes/questions.js';
import claudeRoutes from './routes/claude.js';
import progressRoutes from './routes/progress.js';
import gamificationRoutes from './routes/gamification.js';
import tokenRoutes from './routes/tokens.js';
import { authenticate } from './middleware/auth.js';
import errorHandler from './middleware/errorHandler.js';
import { evictStaleCache } from './dal/cache.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET must be set in .env — cannot start in production without it.');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3001;

// Restrict CORS to the Vite dev server — in production the client is served from the
// same origin so no CORS headers are needed for legitimate app traffic.
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173']
}));
app.use(express.json());

// Unauthenticated routes
app.get('/api/health', (req, res) => {
  let dbOk = false;
  try {
    db.prepare('SELECT 1').get();
    dbOk = true;
  } catch { /* DB not accessible */ }

  res.json({
    status: dbOk ? 'ok' : 'degraded',
    database: dbOk,
    claudeApiConfigured: !!process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== 'sk-ant-your-key-here'
  });
});
app.use('/api/auth', authRoutes);

// Auth wall — everything below requires valid JWT
app.use('/api', authenticate);
app.use('/api', questionRoutes);
app.use('/api', claudeRoutes);
app.use('/api', progressRoutes);
app.use('/api/gamification', gamificationRoutes);
app.use('/api/tokens', tokenRoutes);

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist')));

  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  });
}

app.use(errorHandler);

// Evict stale cache entries on startup (older than 30 days)
try {
  const evicted = evictStaleCache(30);
  if (evicted > 0) console.log(`Evicted ${evicted} stale cache entries`);
} catch { /* non-critical */ }

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('\n🧠 RE-VISION running at:');
  console.log(`   Local:   http://localhost:${PORT}`);

  const networkInterfaces = os.networkInterfaces();
  Object.values(networkInterfaces).forEach(interfaces => {
    interfaces.forEach(iface => {
      if (iface.family === 'IPv4' && !iface.internal) {
        console.log(`   Network: http://${iface.address}:${PORT}`);
      }
    });
  });
  console.log('');
});

// Graceful shutdown — close server and DB cleanly
function shutdown() {
  console.log('\nShutting down gracefully...');
  server.close(() => {
    try { db.close(); } catch { /* already closed */ }
    process.exit(0);
  });
  // Force exit after 5s if graceful shutdown stalls
  setTimeout(() => process.exit(1), 5000);
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
