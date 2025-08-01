import OpenAI from 'openai';
import { TokenData } from '../types';

export class OpenAIService {
  private openai: OpenAI;

  constructor(apiKey: string) {
    this.openai = new OpenAI({
      apiKey: apiKey,
    });
  }

  async parseQuery(query: string): Promise<{
    platform: 'pumpfun' | 'bonk' | 'both' | 'defi' | 'general' | 'price' | 'news' | 'trending';
    metric: 'mcap' | 'volume' | 'count' | 'comparison' | 'price' | 'tvl' | 'apy' | 'sentiment' | 'news';
    threshold?: number;
    timeframe: number; // hours
    comparison?: boolean;
    cryptoSymbols?: string[];
    chain?: string;
    category?: string;
    includeNews?: boolean;
    includeSentiment?: boolean;
    includeTrending?: boolean;
  }> {
    const prompt = `
    Parse this comprehensive crypto query and extract the following information:
    Query: "${query}"
    
    ENHANCED QUERY PARSING - Determine the best data sources and metrics:
    
    Return a JSON object with:
    - platform: "pumpfun" | "bonk" | "both" | "defi" | "general" | "price" | "news" | "trending"
    - metric: "mcap" | "volume" | "count" | "comparison" | "price" | "tvl" | "apy" | "sentiment" | "news"
    - threshold: number (if mentioned, like 100000 for 100k, 19000 for 19k)
    - timeframe: number of hours (default 24 if not specified, 1 for "last hour")
    - comparison: true if comparing platforms/protocols
    - cryptoSymbols: array of crypto symbols if asking for prices
    - chain: specific blockchain if mentioned ("ethereum", "solana", "polygon", etc.)
    - category: DeFi category if relevant ("lending", "dex", "yield", etc.)
    - includeNews: true if asking for recent news/updates
    - includeSentiment: true if asking about market sentiment/social data
    - includeTrending: true if asking about trending/hot tokens
    
    PLATFORM DETECTION:
    - "price": Price queries, market data, "what is X trading at", "current price"
    - "pumpfun": pump.fun specific tokens, new launches, meme coins
    - "bonk": Bonk ecosystem, BONK-related tokens, Solana meme coins
    - "defi": DeFi protocols, TVL, yield farming, lending, "best APY", "DeFi TVL"
    - "general": Market overview, top cryptocurrencies, market cap rankings
    - "news": Crypto news, updates, recent developments
    - "trending": Trending coins, hot tokens, social buzz
    
    METRIC DETECTION:
    - "price": Current prices, price data
    - "mcap": Market cap queries, "tokens above X market cap"
    - "tvl": Total Value Locked, protocol TVL
    - "apy": Yield farming, "best rates", "highest APY"
    - "sentiment": Social sentiment, market mood, bullish/bearish
    - "news": Recent news, developments, updates
    - "volume": Trading volume, 24h volume
    - "count": "how many tokens", count queries
    
    EXAMPLES:
    "What's the SOL price?" -> {"platform": "price", "metric": "price", "cryptoSymbols": ["SOL"]}
    "Top DeFi protocols by TVL" -> {"platform": "defi", "metric": "tvl"}
    "Best yield farming opportunities on Solana" -> {"platform": "defi", "metric": "apy", "chain": "solana"}
    "Recent crypto news about Bitcoin" -> {"platform": "news", "metric": "news", "cryptoSymbols": ["BTC"]}
    "What's trending in crypto today?" -> {"platform": "trending", "metric": "sentiment", "includeTrending": true}
    "Bonk ecosystem tokens launched today" -> {"platform": "bonk", "metric": "count", "timeframe": 24}
    "Market sentiment for Ethereum" -> {"platform": "general", "metric": "sentiment", "cryptoSymbols": ["ETH"], "includeSentiment": true}
    "Top 10 cryptocurrencies by market cap" -> {"platform": "general", "metric": "mcap"}
    `;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 200,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      return JSON.parse(content);
    } catch (error) {
      console.error('Error parsing query with OpenAI:', error);
      // Enhanced fallback parsing
      const lowerQuery = query.toLowerCase();
      
      // Check for specific platform indicators
      const isDeFiQuery = lowerQuery.includes('defi') || lowerQuery.includes('tvl') || 
                         lowerQuery.includes('yield') || lowerQuery.includes('apy') ||
                         lowerQuery.includes('lending') || lowerQuery.includes('protocol');
      
      const isNewsQuery = lowerQuery.includes('news') || lowerQuery.includes('update') ||
                         lowerQuery.includes('announcement') || lowerQuery.includes('development');
      
      const isTrendingQuery = lowerQuery.includes('trending') || lowerQuery.includes('hot') ||
                             lowerQuery.includes('popular') || lowerQuery.includes('buzz');
      
      const isPriceQuery = lowerQuery.includes('price') || lowerQuery.includes('current') || 
                          lowerQuery.includes('worth') || lowerQuery.includes('trading') ||
                          lowerQuery.includes('cost') || lowerQuery.includes('value') ||
                          /what is (sol|btc|eth|bitcoin|ethereum|solana)/i.test(query);
      
      const isSentimentQuery = lowerQuery.includes('sentiment') || lowerQuery.includes('bullish') ||
                              lowerQuery.includes('bearish') || lowerQuery.includes('mood');
      
      // Extract crypto symbols
      const cryptoSymbols = [];
      if (/sol|solana/i.test(query)) cryptoSymbols.push('SOL');
      if (/btc|bitcoin/i.test(query)) cryptoSymbols.push('BTC');
      if (/eth|ethereum/i.test(query)) cryptoSymbols.push('ETH');
      if (/bonk/i.test(query)) cryptoSymbols.push('BONK');
      
      // Extract chain information
      let chain = undefined;
      if (lowerQuery.includes('solana')) chain = 'solana';
      if (lowerQuery.includes('ethereum')) chain = 'ethereum';
      if (lowerQuery.includes('polygon')) chain = 'polygon';
      
      // Determine platform and metric
      if (isPriceQuery) {
        return {
          platform: 'price',
          metric: 'price',
          timeframe: 1,
          cryptoSymbols: cryptoSymbols.length > 0 ? cryptoSymbols : ['SOL']
        };
      }
      
      if (isDeFiQuery) {
        const metric = lowerQuery.includes('apy') || lowerQuery.includes('yield') ? 'apy' :
                      lowerQuery.includes('tvl') ? 'tvl' : 'count';
        return {
          platform: 'defi',
          metric,
          timeframe: 24,
          chain,
          cryptoSymbols
        };
      }
      
      if (isNewsQuery) {
        return {
          platform: 'news',
          metric: 'news',
          timeframe: 24,
          cryptoSymbols,
          includeNews: true
        };
      }
      
      if (isTrendingQuery) {
        return {
          platform: 'trending',
          metric: 'sentiment',
          timeframe: 24,
          includeTrending: true
        };
      }
      
      if (isSentimentQuery) {
        return {
          platform: 'general',
          metric: 'sentiment',
          timeframe: 24,
          cryptoSymbols,
          includeSentiment: true
        };
      }
      
      // Default token platform detection
      const platform = lowerQuery.includes('pumpfun') ? 'pumpfun' : 
                      lowerQuery.includes('bonk') ? 'bonk' : 'both';
      
      const metric = lowerQuery.includes('mcap') || lowerQuery.includes('market cap') ? 'mcap' : 'count';
      const timeframe = lowerQuery.includes('hour') ? 1 : 24;
      
      return {
        platform,
        metric,
        timeframe,
        comparison: lowerQuery.includes('vs') || lowerQuery.includes('compare'),
        cryptoSymbols
      };
    }
  }

  async formatResponse(query: string, data: any[], processingTime: number, metadata?: any): Promise<string> {
    // INTELLIGENT DATA VALIDATION - Filter out stupid/invalid data
    const cleanedData = this.validateAndCleanData(data, query);
    
    if (cleanedData.length === 0 && data.length > 0) {
      // All data was invalid - provide intelligent alternative response
      return this.generateIntelligentFallbackResponse(query, data, processingTime, metadata);
    }
    
    // Use cleaned data for processing
    const processedData = cleanedData.length > 0 ? cleanedData : data;
    
    // Detect data type based on structure
    const isTokenData = processedData.length > 0 && processedData[0].hasOwnProperty('currentMcap');
    const isPriceData = processedData.length > 0 && processedData[0].hasOwnProperty('price') && processedData[0].hasOwnProperty('symbol');
    const isDeFiProtocolData = processedData.length > 0 && processedData[0].hasOwnProperty('tvl') && processedData[0].hasOwnProperty('name');
    const isYieldFarmData = processedData.length > 0 && processedData[0].hasOwnProperty('apy') && processedData[0].hasOwnProperty('project');
    const isNewsData = processedData.length > 0 && processedData[0].hasOwnProperty('title') && processedData[0].hasOwnProperty('url');
    const isTrendingData = processedData.length > 0 && processedData[0].hasOwnProperty('trendingRank');
    const isSentimentData = processedData.length > 0 && processedData[0].hasOwnProperty('sentimentScore');
    const isMarketData = processedData.length > 0 && processedData[0].hasOwnProperty('marketCap') && processedData[0].hasOwnProperty('rank');

    let dataDescription = '';
    let dataType = 'general';

    if (isPriceData) {
      dataType = 'prices';
      dataDescription = `Real-time Price Data:
${processedData.slice(0, 10).map(item => 
  `- ${item.name} (${item.symbol}): $${item.price?.toLocaleString() || 'N/A'} ${item.change24hPercent ? `(${item.change24hPercent > 0 ? '+' : ''}${item.change24hPercent.toFixed(2)}% 24h)` : ''}`
).join('\n')}`;
    } else if (isDeFiProtocolData) {
      dataType = 'DeFi protocols';
      dataDescription = `DeFi Protocol Data:
${processedData.slice(0, 8).map(protocol => 
  `- ${protocol.name}: $${(protocol.tvl / 1e9).toFixed(2)}B TVL, ${protocol.category || 'DeFi'}, Chains: ${protocol.chains?.join(', ') || 'Multiple'}`
).join('\n')}`;
    } else if (isYieldFarmData) {
      dataType = 'yield farming pools';
      dataDescription = `Top Yield Farming Opportunities:
${processedData.slice(0, 8).map(pool => 
  `- ${pool.project} ${pool.symbol}: ${pool.apy?.toFixed(2) || 'N/A'}% APY, $${(pool.tvlUsd / 1e6).toFixed(1)}M TVL, ${pool.chain}`
).join('\n')}`;
    } else if (isNewsData) {
      dataType = 'news articles';
      dataDescription = `Latest Crypto News:
${processedData.slice(0, 5).map(article => 
  `- ${article.title} (${article.source}, ${new Date(article.publishedAt).toLocaleDateString()})`
).join('\n')}`;
    } else if (isTrendingData) {
      dataType = 'trending cryptocurrencies';
      dataDescription = `Trending Crypto Assets:
${processedData.slice(0, 8).map(coin => 
  `- #${coin.trendingRank} ${coin.name} (${coin.symbol}): ${coin.percentChange24h ? `${coin.percentChange24h > 0 ? '+' : ''}${coin.percentChange24h.toFixed(2)}%` : 'N/A'} - ${coin.reason}`
).join('\n')}`;
    } else if (isSentimentData) {
      dataType = 'social sentiment data';
      dataDescription = `Market Sentiment Analysis:
${processedData.slice(0, 5).map(sentiment => 
  `- ${sentiment.coin}: ${sentiment.bullishPercent?.toFixed(1) || 'N/A'}% Bullish, ${sentiment.bearishPercent?.toFixed(1) || 'N/A'}% Bearish, ${sentiment.totalMentions || 0} mentions`
).join('\n')}`;
    } else if (isMarketData) {
      dataType = 'market data';
      dataDescription = `Cryptocurrency Market Data:
${processedData.slice(0, 10).map(coin => 
  `- #${coin.rank} ${coin.name} (${coin.symbol}): $${coin.price?.toLocaleString() || 'N/A'}, $${(coin.marketCap / 1e9).toFixed(2)}B mcap ${coin.percentChange24h ? `(${coin.percentChange24h > 0 ? '+' : ''}${coin.percentChange24h.toFixed(2)}%)` : ''}`
).join('\n')}`;
    } else if (isTokenData) {
      dataType = 'tokens';
      dataDescription = `Token Launch Data:
${processedData.slice(0, 5).map(token => 
  `- ${token.name} (${token.symbol}): $${token.currentMcap?.toLocaleString() || 'N/A'} mcap, launched ${new Date(token.launchTime).toLocaleString()}, ${token.platform} platform`
).join('\n')}`;
    } else {
      dataDescription = `Data: ${processedData.length} items found`;
    }

    const prompt = `
    Format a comprehensive, natural language response for this crypto query based on the provided data.
    
    Original Query: "${query}"
    Processing Time: ${processingTime}ms
    Data Type: ${dataType}
    Results Count: ${data.length}
    Data Sources: ${metadata?.sources?.join(', ') || 'Multiple APIs'}
    
    ${dataDescription}
    
    RESPONSE GUIDELINES:
    - Provide a direct, informative answer that addresses the user's specific question
    - Include key metrics, numbers, and insights from the data
    - If showing top results, mention the ranking/sorting criteria
    - For price data: Include current prices and 24h changes
    - For DeFi data: Highlight TVL, APY, and chain information
    - For trending data: Explain why items are trending
    - For news: Summarize key developments
    - If many results, provide a summary with top highlights
    - Keep response comprehensive but under 300 words
    - Use emojis sparingly for key data points (📈 📉 🚀 💰)
    - End with processing time and data freshness context
    `;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 400,
      });

      return response.choices[0]?.message?.content || 'Unable to format response';
    } catch (error) {
      console.error('Error formatting response with OpenAI:', error);
      
      // Enhanced fallback response based on data type
      if (isPriceData) {
        const priceList = data.slice(0, 5).map(p => `${p.symbol}: $${p.price?.toLocaleString() || 'N/A'}`).join(', ');
        return `Current prices: ${priceList}. Data processed in ${processingTime}ms from live market feeds.`;
      } else if (isDeFiProtocolData) {
        const protocolList = data.slice(0, 3).map(p => `${p.name} ($${(p.tvl / 1e9).toFixed(1)}B TVL)`).join(', ');
        return `Top DeFi protocols: ${protocolList}. Found ${data.length} protocols in ${processingTime}ms.`;
      } else if (isTokenData) {
        return `Found ${data.length} tokens matching your criteria. Top tokens include: ${data.slice(0, 3).map(t => `${t.name} ($${t.currentMcap?.toLocaleString() || 'N/A'} mcap)`).join(', ')}. Processing completed in ${processingTime}ms.`;
      } else {
        return `Found ${data.length} results matching your query. Processing completed in ${processingTime}ms from multiple data sources.`;
      }
    }
  }

  // INTELLIGENT DATA VALIDATION - Filters out stupid/invalid data
  private validateAndCleanData(data: any[], query: string): any[] {
    if (!data || data.length === 0) return [];

    return data.filter(item => {
      // Skip items with invalid prices (exactly 0 or null/undefined)
      if (item.hasOwnProperty('price') && (item.price === 0 || item.price === null || item.price === undefined)) {
        console.log(`🧹 Filtering out invalid price data: ${item.name || item.symbol || 'Unknown'} - Price: ${item.price}`);
        return false;
      }

      // Skip items with invalid market cap (exactly 0 or negative)
      if (item.hasOwnProperty('marketCap') && (item.marketCap <= 0)) {
        console.log(`🧹 Filtering out invalid market cap: ${item.name || item.symbol || 'Unknown'} - MarketCap: ${item.marketCap}`);
        return false;
      }

      // Skip items with invalid current market cap for tokens
      if (item.hasOwnProperty('currentMcap') && (item.currentMcap <= 0)) {
        console.log(`🧹 Filtering out invalid token mcap: ${item.name || item.symbol || 'Unknown'} - CurrentMcap: ${item.currentMcap}`);
        return false;
      }

      // Skip items with invalid TVL (exactly 0 or negative)
      if (item.hasOwnProperty('tvl') && (item.tvl <= 0)) {
        console.log(`🧹 Filtering out invalid TVL: ${item.name || 'Unknown'} - TVL: ${item.tvl}`);
        return false;
      }

      // Skip items with invalid APY (negative or unrealistically high)
      if (item.hasOwnProperty('apy') && (item.apy < 0 || item.apy > 1000000)) {
        console.log(`🧹 Filtering out invalid APY: ${item.project || 'Unknown'} - APY: ${item.apy}%`);
        return false;
      }

      // Skip items missing essential fields
      if (item.hasOwnProperty('name') && (!item.name || item.name.trim() === '')) {
        console.log(`🧹 Filtering out item with empty name`);
        return false;
      }

      // For trending data, ensure we have meaningful data
      if (item.hasOwnProperty('trendingRank') && !item.name) {
        console.log(`🧹 Filtering out trending item without name`);
        return false;
      }

      return true; // Item passes validation
    });
  }

  // INTELLIGENT FALLBACK RESPONSE - When all data is invalid
  private async generateIntelligentFallbackResponse(query: string, originalData: any[], processingTime: number, metadata?: any): Promise<string> {
    console.log(`🤖 Generating intelligent fallback response for query: "${query}"`);

    const prompt = `
    The user asked: "${query}"
    
    We attempted to fetch data but encountered issues with data quality (prices at $0, invalid values, etc.).
    Instead of showing bad data, provide an intelligent, helpful response that:
    
    1. Acknowledges the request professionally
    2. Explains the data limitation briefly (without being technical)
    3. Provides general knowledge/context about what they asked for
    4. Suggests alternative approaches or related information
    5. Maintains a helpful, knowledgeable tone
    
    EXAMPLES:
    
    Query: "What are trending cryptocurrencies today?"
    Response: "I'm currently experiencing some data sync issues with trending cryptocurrency prices. However, I can tell you that trending cryptocurrencies typically include established coins like Bitcoin (BTC), Ethereum (ETH), and Solana (SOL), along with emerging tokens that gain social media attention or see significant trading volume spikes. For the most accurate trending data, I recommend checking the current prices of major cryptocurrencies or asking about specific coins you're interested in."

    Query: "Show me Bitcoin price"  
    Response: "I'm having trouble accessing current Bitcoin price data at the moment. Bitcoin typically trades in a wide range and is known for its volatility. For the most up-to-date Bitcoin price, I can try fetching it again, or you might want to check a reliable crypto exchange like Coinbase or Binance."

    Make the response specific to their query, knowledgeable, and genuinely helpful.
    Keep it under 150 words and conversational.
    `;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.4,
        max_tokens: 200,
      });

      const aiResponse = response.choices[0]?.message?.content || '';
      return `${aiResponse}\n\nProcessing Time: ${processingTime}ms\nNote: Data validation filtered out invalid results for better user experience.`;
    } catch (error) {
      console.error('Error generating intelligent fallback:', error);
      
      // Static intelligent fallbacks based on query type
      const lowerQuery = query.toLowerCase();
      
      if (lowerQuery.includes('trending') || lowerQuery.includes('hot')) {
        return `I'm currently experiencing data sync issues with trending cryptocurrency information. Trending cryptos usually include major coins like Bitcoin, Ethereum, and Solana, plus emerging tokens gaining social media attention. For accurate trending data, try asking about specific cryptocurrency prices or check major exchanges directly. Processing time: ${processingTime}ms.`;
      }
      
      if (lowerQuery.includes('price') || lowerQuery.includes('trading')) {
        return `I encountered some issues accessing current price data. Cryptocurrency prices change rapidly throughout the day. For the most reliable pricing, I recommend trying your query again or checking established exchanges like Coinbase, Binance, or CoinGecko directly. Processing time: ${processingTime}ms.`;
      }
      
      return `I encountered some data quality issues while processing your request about "${query}". Rather than show potentially inaccurate information, I filtered it out. Please try rephrasing your question or ask about a specific cryptocurrency for better results. Processing time: ${processingTime}ms.`;
    }
  }
}