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
    
    Return a JSON object with:
    - platform: "pumpfun", "bonk", "both", or "price" (use "price" for price queries)
    - metric: "mcap", "volume", "count", "comparison", or "price"
    - threshold: number (if mentioned, like 100000 for 100k, 19000 for 19k)
    - timeframe: number of hours (default 24 if not specified, 1 for "last hour")
    - comparison: true if comparing platforms
    - cryptoSymbols: array of crypto symbols if asking for prices (e.g., ["SOL", "BTC", "ETH"])
    
    Examples:
    "How many tokens reached over $19,000 mcap on pumpfun?" 
    -> {"platform": "pumpfun", "metric": "mcap", "threshold": 19000, "timeframe": 24, "comparison": false}
    
    "What's the SOL price right now?" 
    -> {"platform": "price", "metric": "price", "timeframe": 1, "cryptoSymbols": ["SOL"]}
    
    "Show me BTC and ETH prices"
    -> {"platform": "price", "metric": "price", "timeframe": 1, "cryptoSymbols": ["BTC", "ETH"]}
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

  async formatResponse(query: string, data: TokenData[], processingTime: number): Promise<string> {
    const prompt = `
    Format a natural language response for this crypto query based on the data provided.
    
    Original Query: "${query}"
    Processing Time: ${processingTime}ms
    Data Count: ${data.length} tokens
    
    Token Data Summary:
    ${data.slice(0, 5).map(token => 
      `- ${token.name} (${token.symbol}): $${token.currentMcap.toLocaleString()} mcap, launched ${token.launchTime.toLocaleString()}`
    ).join('\n')}
    
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