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
    platform: 'pumpfun' | 'bonk' | 'both' | 'price';
    metric: 'mcap' | 'volume' | 'count' | 'comparison' | 'price';
    threshold?: number;
    timeframe: number; // hours
    comparison?: boolean;
    cryptoSymbols?: string[];
  }> {
    const prompt = `
    Parse this crypto query and extract the following information:
    Query: "${query}"
    
    IMPORTANT: If the query asks about prices, current prices, price of any cryptocurrency (SOL, BTC, ETH, etc.), or "what is X trading at", ALWAYS use platform: "price"
    
    Return a JSON object with:
    - platform: "pumpfun", "bonk", "both", or "price" (use "price" for ANY price-related queries)
    - metric: "mcap", "volume", "count", "comparison", or "price"
    - threshold: number (if mentioned, like 100000 for 100k, 19000 for 19k)
    - timeframe: number of hours (default 24 if not specified, 1 for "last hour")
    - comparison: true if comparing platforms
    - cryptoSymbols: array of crypto symbols if asking for prices (e.g., ["SOL", "BTC", "ETH"])
    
    Price Query Keywords: "price", "current", "trading at", "worth", "value", "cost", "what is SOL", "BTC price", "ETH price"
    
    Examples:
    "How many tokens reached over $19,000 mcap on pumpfun?" 
    -> {"platform": "pumpfun", "metric": "mcap", "threshold": 19000, "timeframe": 24, "comparison": false}
    
    "What's the SOL price right now?" 
    -> {"platform": "price", "metric": "price", "timeframe": 1, "cryptoSymbols": ["SOL"]}
    
    "What is the current SOL price?"
    -> {"platform": "price", "metric": "price", "timeframe": 1, "cryptoSymbols": ["SOL"]}
    
    "Show me BTC and ETH prices"
    -> {"platform": "price", "metric": "price", "timeframe": 1, "cryptoSymbols": ["BTC", "ETH"]}
    
    "How much is Bitcoin worth?"
    -> {"platform": "price", "metric": "price", "timeframe": 1, "cryptoSymbols": ["BTC"]}
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
      // Fallback parsing
      return {
        platform: query.toLowerCase().includes('pumpfun') ? 'pumpfun' : query.toLowerCase().includes('bonk') ? 'bonk' : 'both',
        metric: query.toLowerCase().includes('mcap') || query.toLowerCase().includes('market cap') ? 'mcap' : 'count',
        timeframe: query.toLowerCase().includes('hour') ? 1 : 24,
        comparison: query.toLowerCase().includes('vs') || query.toLowerCase().includes('compare')
      };
    }
  }

  async formatResponse(query: string, data: any[], processingTime: number): Promise<string> {
    // Check if this is price data or token data
    const isTokenData = data.length > 0 && data[0].hasOwnProperty('currentMcap');
    const isPriceData = data.length > 0 && data[0].hasOwnProperty('price');

    let dataDescription = '';
    if (isPriceData) {
      dataDescription = `Price Data:
${data.map(item => 
  `- ${item.name} (${item.symbol}): $${item.price.toLocaleString()} (${item.change24hPercent > 0 ? '+' : ''}${item.change24hPercent.toFixed(2)}% 24h)`
).join('\n')}`;
    } else if (isTokenData) {
      dataDescription = `Token Data Summary:
${data.slice(0, 5).map(token => 
  `- ${token.name} (${token.symbol}): $${token.currentMcap.toLocaleString()} mcap, launched ${token.launchTime.toLocaleString()}`
).join('\n')}`;
    } else {
      dataDescription = `Data: ${data.length} items found`;
    }

    const prompt = `
    Format a natural language response for this crypto query based on the data provided.
    
    Original Query: "${query}"
    Processing Time: ${processingTime}ms
    Data Count: ${data.length} ${isPriceData ? 'prices' : 'tokens'}
    
    ${dataDescription}
    
    Provide a clear, concise answer that directly addresses the user's question. Include relevant numbers and context.
    If there are many results, summarize them. Keep the response under 200 words.
    `;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 300,
      });

      return response.choices[0]?.message?.content || 'Unable to format response';
    } catch (error) {
      console.error('Error formatting response with OpenAI:', error);
      return `Found ${data.length} tokens matching your query. Processing completed in ${processingTime}ms.`;
    }
  }
}