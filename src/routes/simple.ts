import express from 'express';
import { QueryResult, TokenData } from '../types';

const router = express.Router();

// Simple mock query endpoint for testing
router.post('/simple-query', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { query } = req.body;
    
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Query is required and must be a string' });
    }

    // Generate mock tokens
    const mockTokens: TokenData[] = [];
    const count = query.toLowerCase().includes('100') ? 23 : query.toLowerCase().includes('19') ? 15 : 8;
    
    for (let i = 0; i < count; i++) {
      const marketCap = query.toLowerCase().includes('19000') ? 
        19000 + Math.floor(Math.random() * 50000) : 
        query.toLowerCase().includes('100000') ? 
        100000 + Math.floor(Math.random() * 200000) :
        Math.floor(Math.random() * 500000) + 10000;
      
      mockTokens.push({
        id: `mock-token-${i + 1}`,
        name: `TestToken ${i + 1}`,
        symbol: `TEST${i + 1}`,
        platform: 'pumpfun',
        launchTime: new Date(Date.now() - Math.floor(Math.random() * 60 * 60 * 1000)), // Last hour
        currentMcap: marketCap,
        volume24h: Math.floor(Math.random() * 100000),
        priceUSD: marketCap / 1000000000,
        holders: Math.floor(Math.random() * 1000) + 10,
        creator: `creator-${i + 1}`,
        description: `Mock test token ${i + 1} for development testing`
      });
    }

    const processingTime = Date.now() - startTime;
    
    // Simple response formatting
    let answer = '';
    if (query.toLowerCase().includes('19000')) {
      answer = `Based on current data, ${count} tokens on pump.fun have reached over $19,000 market cap in the last hour.`;
    } else if (query.toLowerCase().includes('100000') || query.toLowerCase().includes('100k')) {
      answer = `I found ${count} tokens that reached over $100,000 market cap in the last hour on pump.fun.`;
    } else {
      answer = `Found ${count} tokens matching your query on pump.fun. These tokens were launched recently and show various market cap levels.`;
    }
    
    const result: QueryResult = {
      query,
      answer,
      data: mockTokens,
      timestamp: new Date(),
      processingTime
    };

    res.json(result);
  } catch (error) {
    console.error('Error processing simple query:', error);
    res.status(500).json({ 
      error: 'Failed to process query',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;