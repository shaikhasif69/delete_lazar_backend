import express from 'express';
import { PumpFunService } from '../services/pumpfun';
import { BonkService } from '../services/bonk';
import { DeFiLlamaService } from '../services/defilamma';
import { MarketDataService } from '../services/marketData';
import { OpenAIService } from '../services/openai';
import { PriceDataService } from '../services/priceData';
import { QueryResult, EnhancedQueryContext } from '../types';

const router = express.Router();

router.post('/query', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { query } = req.body;
    
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Query is required and must be a string' });
    }

    // Initialize all services with environment variables or placeholders
    const pumpFunService = new PumpFunService(process.env.PUMP_FUN_API_KEY || 'PUMP_API_PLACEHOLDER');
    const bonkService = new BonkService(process.env.BONK_API_KEY || 'BONK_API_PLACEHOLDER');
    const defiLlamaService = new DeFiLlamaService();
    const marketDataService = new MarketDataService(
      process.env.COINMARKETCAP_API_KEY || 'CMC_API_PLACEHOLDER',
      process.env.COINGECKO_API_KEY || 'CG_API_PLACEHOLDER',
      process.env.NEWS_API_KEY || 'NEWS_API_PLACEHOLDER',
      process.env.LUNARCRUSH_API_KEY || 'SOCIAL_API_PLACEHOLDER'
    );
    const openAIService = new OpenAIService(process.env.OPENAI_API_KEY!);
    const priceDataService = new PriceDataService();

    // Parse the query using enhanced OpenAI parsing
    console.log(`🔍 Processing query: "${query}"`);
    const parsedQuery = await openAIService.parseQuery(query) as EnhancedQueryContext;
    console.log('📊 Parsed query context:', JSON.stringify(parsedQuery, null, 2));
    
    let data: any[] = [];
    let metadata = {
      dataType: 'general' as any,
      sources: [] as string[],
      totalResults: 0
    };
    
    // Enhanced query handling with multiple data sources
    switch (parsedQuery.platform) {
      case 'price':
        console.log('💰 Processing price query for:', parsedQuery.cryptoSymbols);
        if (parsedQuery.cryptoSymbols && parsedQuery.cryptoSymbols.length > 0) {
          data = await priceDataService.getPrices(parsedQuery.cryptoSymbols);
          metadata.dataType = 'prices';
          metadata.sources = ['CoinGecko', 'CoinCap'];
        }
        break;

      case 'pumpfun':
        console.log('🚀 Processing pump.fun query...');
        if (parsedQuery.metric === 'mcap' && parsedQuery.threshold) {
          data = await pumpFunService.getTokensAboveMarketCap(parsedQuery.threshold, parsedQuery.timeframe);
        } else {
          data = await pumpFunService.getRecentTokens(parsedQuery.timeframe);
        }
        metadata.dataType = 'tokens';
        metadata.sources = ['pump.fun'];
        break;

      case 'bonk':
        console.log('🐕 Processing Bonk ecosystem query...');
        if (parsedQuery.metric === 'mcap' && parsedQuery.threshold) {
          data = await bonkService.getBonkTokensAboveMarketCap(parsedQuery.threshold, parsedQuery.timeframe);
        } else {
          data = await bonkService.getRecentBonkTokens(parsedQuery.timeframe);
        }
        metadata.dataType = 'tokens';
        metadata.sources = ['Bonk Ecosystem', 'DexScreener', 'Jupiter'];
        break;

      case 'both':
        console.log('🔥 Processing combined pump.fun + Bonk query...');
        const [pumpTokens, bonkTokens] = await Promise.all([
          parsedQuery.metric === 'mcap' && parsedQuery.threshold 
            ? pumpFunService.getTokensAboveMarketCap(parsedQuery.threshold, parsedQuery.timeframe)
            : pumpFunService.getRecentTokens(parsedQuery.timeframe),
          parsedQuery.metric === 'mcap' && parsedQuery.threshold
            ? bonkService.getBonkTokensAboveMarketCap(parsedQuery.threshold, parsedQuery.timeframe)
            : bonkService.getRecentBonkTokens(parsedQuery.timeframe)
        ]);
        data = [...pumpTokens, ...bonkTokens].sort((a, b) => b.currentMcap - a.currentMcap);
        metadata.dataType = 'tokens';
        metadata.sources = ['pump.fun', 'Bonk Ecosystem'];
        break;

      case 'defi':
        console.log('🦙 Processing DeFi query...');
        if (parsedQuery.metric === 'tvl') {
          data = await defiLlamaService.getTopProtocolsByTVL(parsedQuery.chain, 20);
          metadata.dataType = 'protocols';
        } else if (parsedQuery.metric === 'apy') {
          data = await defiLlamaService.getTopYieldFarms(parsedQuery.chain, 20);
          metadata.dataType = 'yields';
        } else {
          data = await defiLlamaService.getProtocols();
          metadata.dataType = 'protocols';
        }
        metadata.sources = ['DeFiLlama'];
        break;

      case 'general':
        console.log('📈 Processing general market query...');
        if (parsedQuery.metric === 'sentiment' && parsedQuery.cryptoSymbols) {
          data = await marketDataService.getSocialSentiment(parsedQuery.cryptoSymbols);
          metadata.dataType = 'sentiment';
          metadata.sources = ['LunarCrush', 'Social APIs'];
        } else {
          data = await marketDataService.getTopCryptos(50);
          metadata.dataType = 'prices';
          metadata.sources = ['CoinMarketCap', 'CoinGecko'];
        }
        break;

      case 'news':
        console.log('📰 Processing crypto news query...');
        data = await marketDataService.getCryptoNews(20);
        metadata.dataType = 'news';
        metadata.sources = ['NewsAPI', 'Crypto News Feeds'];
        break;

      case 'trending':
        console.log('🔥 Processing trending crypto query...');
        data = await marketDataService.getTrendingCryptos();
        metadata.dataType = 'trending';
        metadata.sources = ['CoinGecko', 'DexScreener', 'Social Media'];
        break;

      default:
        console.log('🤖 Processing default query...');
        // Fallback to pump.fun data
        data = await pumpFunService.getRecentTokens(parsedQuery.timeframe);
        metadata.dataType = 'tokens';
        metadata.sources = ['pump.fun'];
        break;
    }

    // Add supplementary data if requested
    if (parsedQuery.includeNews && parsedQuery.platform !== 'news') {
      console.log('📰 Adding supplementary news data...');
      const newsData = await marketDataService.getCryptoNews(5);
      data = Array.isArray(data) ? [...data, ...newsData] : newsData;
      metadata.sources.push('News APIs');
    }

    if (parsedQuery.includeSentiment && parsedQuery.cryptoSymbols) {
      console.log('💭 Adding sentiment data...');
      const sentimentData = await marketDataService.getSocialSentiment(parsedQuery.cryptoSymbols);
      data = Array.isArray(data) ? [...data, ...sentimentData] : sentimentData;
      metadata.sources.push('Social Sentiment');
    }

    const processingTime = Date.now() - startTime;
    metadata.totalResults = Array.isArray(data) ? data.length : 0;
    
    console.log(`✅ Query processed successfully in ${processingTime}ms. Found ${metadata.totalResults} results from sources: ${metadata.sources.join(', ')}`);
    
    // Format response using enhanced OpenAI
    const answer = await openAIService.formatResponse(query, data, processingTime, metadata);
    
    const result: QueryResult = {
      query,
      answer,
      data,
      metadata,
      timestamp: new Date(),
      processingTime
    };

    res.json(result);
  } catch (error) {
    console.error('❌ Error processing query:', error);
    res.status(500).json({ 
      error: 'Failed to process query',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date(),
      processingTime: Date.now() - startTime
    });
  }
});

router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date(),
    services: {
      core: {
        openai: !!process.env.OPENAI_API_KEY,
        pumpfun: !!process.env.PUMP_FUN_API_KEY,
      },
      ecosystem: {
        bonk: !!process.env.BONK_API_KEY,
        defiLlama: true, // Public API
      },
      market: {
        coinMarketCap: !!process.env.COINMARKETCAP_API_KEY,
        coinGecko: !!process.env.COINGECKO_API_KEY,
        newsApi: !!process.env.NEWS_API_KEY,
        lunarCrush: !!process.env.LUNARCRUSH_API_KEY
      },
      fallbacks: {
        priceData: true, // Has multiple fallback sources
        mockData: true   // Always available for development
      }
    },
    capabilities: [
      'Token price queries (SOL, BTC, ETH, etc.)',
      'pump.fun token launches and analytics',
      'Bonk ecosystem token tracking',
      'DeFi protocol TVL and yield farming data',
      'Top cryptocurrency market data',
      'Crypto news and updates',
      'Trending cryptocurrency detection',
      'Social sentiment analysis',
      'Multi-source data aggregation'
    ],
    version: '2.0.0'
  });
});

export default router;