import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import queryRoutes from './routes/query';
import simpleRoutes from './routes/simple';

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api', queryRoutes);
app.use('/api', simpleRoutes);

// Basic route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Crypto Launchpad AI Agent API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      query: '/api/query (POST)'
    }
  });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

export default app;