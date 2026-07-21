import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import connectDB from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import analysisRoutes from './routes/analysisRoutes.js';

// Load environment variables
dotenv.config();

// Validate Environment Variables
if (!process.env.GEMINI_API_KEY) {
  console.warn(
    '\x1b[33m%s\x1b[0m', // Yellow warning color in console
    '⚠️  Warning: GEMINI_API_KEY is not configured in backend/.env. Repository scanning and chat functions will fail.'
  );
}
if (!process.env.GITHUB_TOKEN) {
  console.warn(
    '\x1b[33m%s\x1b[0m', // Yellow warning color in console
    '⚠️  Warning: GITHUB_TOKEN is not configured in backend/.env. GitHub API requests will be unauthenticated and rate-limited to 60 requests/hour.'
  );
}

// Connect to Database
connectDB();

const app = express();

// Security Headers
app.use(helmet());

// Cross-Origin Resource Sharing
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173', // Vite Frontend URL
    credentials: true, // Allow cookies to be sent
  })
);

// Body and Cookie Parsers
app.use(express.json());
app.use(cookieParser());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/analysis', analysisRoutes);

// Root Endpoint (Status check)
app.get('/', (req, res) => {
  res.json({ message: 'RepoScope API is running...' });
});

// 404 Route handler
app.use((req, res, next) => {
  res.status(404).json({ message: `Not Found - ${req.originalUrl}` });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode).json({
    message: err.message || 'Internal Server Error',
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
