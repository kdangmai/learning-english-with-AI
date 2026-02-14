const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
const connectDB = require('./config/database');
const logger = require('./services/loggerService');

// Load .env from project root (parent of backend/)
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
// Also try loading from backend/ directory if exists
require('dotenv').config();

const app = express();

// Connect to database
connectDB();

// Middleware

// CORS MUST come first — before helmet and all other middleware
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:3000',
  'http://localhost:3001'
].filter(Boolean);

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, Postman, etc.)
    if (!origin) return callback(null, true);
    // Allow explicit origins
    if (allowedOrigins.some(allowed => origin.startsWith(allowed))) {
      return callback(null, true);
    }
    // Allow any Vercel or Render deployment
    if (origin.endsWith('.vercel.app') || origin.endsWith('.onrender.com')) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

app.use(cors(corsOptions));

// Explicit preflight handler for ALL routes
app.options('*', cors(corsOptions));

app.use(helmet());
app.use(compression({
  level: 6,
  threshold: 1024,
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  }
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/grammar', require('./routes/grammarRoutes'));
app.use('/api/vocabulary', require('./routes/vocabularyRoutes'));
app.use('/api/sentences', require('./routes/sentenceRoutes'));
app.use('/api/chatbot', require('./routes/chatbotRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/pronunciation', require('./routes/pronunciationRoutes'));
app.use('/api/roleplay', require('./routes/roleplayRoutes'));
app.use('/api/folders', require('./routes/folderRoutes')); // New: Folder Management

// Health check endpoints
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'backend' });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'API is running' });
});

// Error handling middleware
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err.stack);
  logger.error('system', `Unhandled error: ${err.message}`, { details: { stack: err.stack }, ip: req.ip });
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Server error',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

// Start server only if run directly (Vercel imports this file)
if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    logger.info('system', `Server started on port ${PORT}`);
  });
}

module.exports = app;
