import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';
import './db/index.js';
import questionRoutes from './routes/questions.js';
import claudeRoutes from './routes/claude.js';
import progressRoutes from './routes/progress.js';
import errorHandler from './middleware/errorHandler.js';

dotenv.config({ path: path.join(process.cwd(), '..', '.env') });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    claudeApiConfigured: !!process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== 'sk-ant-your-key-here'
  });
});

app.use('/api', questionRoutes);
app.use('/api', claudeRoutes);
app.use('/api', progressRoutes);

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist')));

  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  });
}

app.use(errorHandler);

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
