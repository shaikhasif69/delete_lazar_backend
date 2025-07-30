import express from 'express';
import { PumpFunService } from '../services/pumpfun';
import { OpenAIService } from '../services/openai';
import { QueryResult } from '../types';

const router = express.Router();

router.post('/query', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { query } = req.body;
    
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Query is required and must be a string' });
    }

    const pumpFunService = new PumpFunService(process.env.PUMP_FUN_API_KEY!);
    const openAIService = new OpenAIService(process.env.OPENAI_API_KEY!);

    // Parse the query using OpenAI
    const parsedQuery = await openAIService.parseQuery(query);
    
    let data: any[] = [];
    
    // Handle different query types
    if (parsedQuery.platform === 'pumpfun' || parsedQuery.platform === 'both') {
      if (parsedQuery.metric === 'mcap' && parsedQuery.threshold) {
        data = await pumpFunService.getTokensAboveMarketCap(parsedQuery.threshold, parsedQuery.timeframe);
      } else {
        data = await pumpFunService.getRecentTokens(parsedQuery.timeframe);
      }
    }

    const processingTime = Date.now() - startTime;
    
    // Format response using OpenAI
    const answer = await openAIService.formatResponse(query, data, processingTime);
    
    const result: QueryResult = {
      query,
      answer,
      data,
      timestamp: new Date(),
      processingTime
    };

    res.json(result);
  } catch (error) {
    console.error('Error processing query:', error);
    res.status(500).json({ 
      error: 'Failed to process query',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date(),
    services: {
      pumpfun: !!process.env.PUMP_FUN_API_KEY,
      openai: !!process.env.OPENAI_API_KEY
    }
  });
});

export default router;