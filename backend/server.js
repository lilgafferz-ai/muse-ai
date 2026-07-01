require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const chromaClient = require('./memory/chromaClient');
const ollamaService = require('./services/ollamaService');
const toolRegistry = require('./services/toolRegistry');
const connectivityMonitor = require('./services/connectivityMonitor');
const aiProvider = require('./services/aiProvider');

// Fail DB operations fast (instead of buffering ~10s) when MongoDB is down,
// so the app degrades gracefully rather than hanging.
mongoose.set('bufferCommands', false);

const app = express();
const PORT = process.env.PORT || 3001;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/muse';

// CORS — allow local dev + deployed frontend URLs
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:4173',
  'https://muse-ai.vercel.app',
];
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
app.use(express.json({ limit: '1mb' }));

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    console.log(`${req.method} ${req.path} ${res.statusCode} ${Date.now() - start}ms`);
  });
  next();
});

// Routes
const chatRoutes = require('./routes/chat');
const memoryRoutes = require('./routes/memory');
const personalityRoutes = require('./routes/personality');
const syncRoutes = require('./routes/sync');
const projectsRoutes = require('./routes/projects');
const plannerRoutes = require('./routes/planner');
const ideasRoutes = require('./routes/ideas');
const knowledgeRoutes = require('./routes/knowledge');
const searchRoutes = require('./routes/search');
const analyticsRoutes = require('./routes/analytics');

app.use('/api/chat', chatRoutes);
app.use('/api/memory', memoryRoutes);
app.use('/api/personality', personalityRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/projects', projectsRoutes);
app.use('/api/planner', plannerRoutes);
app.use('/api/ideas', ideasRoutes);
app.use('/api/knowledge', knowledgeRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/analytics', analyticsRoutes);

// Status endpoint
app.get('/api/status', async (req, res) => {
  const aiInfo = aiProvider.getInfo();
  const aiHealthy = await aiProvider.healthCheck();
  const chromaStatus = chromaClient.ready;
  const connectivity = connectivityMonitor.getStatus();

  res.json({
    status: 'online',
    version: '1.0.0',
    name: 'NEXORA AI OS',
    services: {
      mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      ai: aiHealthy ? 'connected' : 'disconnected',
      chromadb: chromaStatus ? 'connected' : 'disconnected'
    },
    ai: aiInfo,
    agent: {
      tools: toolRegistry.getToolCount(true),
      toolsOnline: toolRegistry.getToolCount(false),
      mode: connectivity.isOnline ? 'online' : 'offline'
    },
    connectivity,
    system: {
      platform: process.platform,
      nodeVersion: process.version,
      memory: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1)} MB`
    }
  });
});

function startServer(mode, warning) {
  app.listen(PORT, () => {
    console.log('\n  ✦ Nexora AI Companion' + (mode !== 'Normal' ? ` (${mode})` : ''));
    console.log('  ' + '─'.repeat(mode !== 'Normal' ? 20 : 17));
    console.log(`  Server:  http://localhost:${PORT}`);
    console.log(`  Status:  http://localhost:${PORT}/api/status`);
    console.log(`  API:     http://localhost:${PORT}/api`);
    console.log(`  Chat:    POST /api/chat`);
    console.log(`  AI:      ${aiProvider.getInfo().provider}`);
    if (warning) console.log(`  Warning: ${warning}`);
    console.log();
  });
}

async function start() {
  let degraded = false;
  let warning = '';

  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,  // Fail fast if MongoDB is not running (5s vs default 30s)
      connectTimeoutMS: 5000
    });
    console.log('[MongoDB] Connected');
    await chromaClient.initialize();
  } catch (error) {
    degraded = true;
    warning = error.message;
  }

  try {
    await toolRegistry.initialize();
  } catch (error) {
    console.error('[Server] Tool init error:', error.message);
  }

  connectivityMonitor.start();
  startServer(degraded ? 'Degraded Mode' : 'Normal', warning);
}

start();
