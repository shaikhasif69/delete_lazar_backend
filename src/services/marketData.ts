import axios from 'axios';

export interface CryptoMarketData {
  id: string;
  name: string;
  symbol: string;
  slug: string;
  rank: number;
  price: number;
  volume24h: number;
  volumeChange24h: number;
  marketCap: number;
  marketCapChange24h: number;
  circulatingSupply: number;
  totalSupply: number;
  maxSupply?: number;
  percentChange1h: number;
  percentChange24h: number;
  percentChange7d: number;
  percentChange30d: number;
  lastUpdated: Date;
  tags: string[];
  category: string;
  logo?: string;
  dominance?: number;
  fullyDilutedMarketCap?: number;
}

export interface TrendingCrypto {
  id: string;
  name: string;
  symbol: string;
  price: number;
  percentChange24h: number;
  marketCap: number;
  volume24h: number;
  trendingRank: number;
  trendingScore: number;
  searchVolume?: number;
  socialMentions?: number;
  reason: string; // Why it's trending
}

export interface CryptoNews {
  id: string;
  title: string;
  summary: string;
  url: string;
  source: string;
  publishedAt: Date;
  relatedCoins: string[];
  sentiment: 'positive' | 'negative' | 'neutral';
  category: string;
  imageUrl?: string;
}

export interface SocialSentiment {
  coin: string;
  symbol: string;
  bullishPercent: number;
  bearishPercent: number;
  neutralPercent: number;
  totalMentions: number;
  sentimentScore: number; // -1 to 1
  twitterMentions: number;
  redditMentions: number;
  telegramMentions: number;
  newsArticles: number;
  influencerMentions: number;
  lastUpdated: Date;
}

export class MarketDataService {
  private coinMarketCapKey: string;
  private coinGeckoKey: string;
  private newsApiKey: string;
  private socialApiKey: string;
  
  private cmcBaseUrl = 'https://pro-api.coinmarketcap.com/v1';
  private geckoBaseUrl = 'https://api.coingecko.com/api/v3';
  private newsApiUrl = 'https://newsapi.org/v2';
  private dexScreenerUrl = 'https://api.dexscreener.com/latest';
  private lunarCrushUrl = 'https://api.lunarcrush.com/v2'; // For social data

  constructor(
    coinMarketCapKey: string = 'CMC_API_KEY_PLACEHOLDER',
    coinGeckoKey: string = 'CG_API_KEY_PLACEHOLDER',
    newsApiKey: string = 'NEWS_API_KEY_PLACEHOLDER',
    socialApiKey: string = 'LUNARCRUSH_API_KEY_PLACEHOLDER'
  ) {
    this.coinMarketCapKey = coinMarketCapKey;
    this.coinGeckoKey = coinGeckoKey;
    this.newsApiKey = newsApiKey;
    this.socialApiKey = socialApiKey;
  }

  async getTopCryptos(limit: number = 100): Promise<CryptoMarketData[]> {
    console.log('📈 Fetching top cryptocurrencies...');
    
    // Try CoinMarketCap first
    try {
      const response = await axios.get(`${this.cmcBaseUrl}/cryptocurrency/listings/latest`, {
        headers: {
          'X-CMC_PRO_API_KEY': this.coinMarketCapKey
        },
        params: {
          start: 1,
          limit,
          convert: 'USD',
          sort: 'market_cap',
          sort_dir: 'desc'
        },
        timeout: 15000
      });

      if (response.data && response.data.data) {
        console.log(`🚀 SUCCESS! Fetched ${response.data.data.length} cryptocurrencies from CMC!`);
        return response.data.data.map((coin: any) => this.formatCMCData(coin));
      }
    } catch (error) {
      console.log('CoinMarketCap API failed, trying CoinGecko...');
    }

    // Fallback to CoinGecko
    try {
      const response = await axios.get(`${this.geckoBaseUrl}/coins/markets`, {
        params: {
          vs_currency: 'usd',
          order: 'market_cap_desc',
          per_page: limit,
          page: 1,
          sparkline: false,
          price_change_percentage: '1h,24h,7d,30d'
        },
        headers: this.coinGeckoKey !== 'CG_API_KEY_PLACEHOLDER' ? {
          'x-cg-demo-api-key': this.coinGeckoKey
        } : {},
        timeout: 15000
      });

      if (response.data && Array.isArray(response.data)) {
        console.log(`🚀 SUCCESS! Fetched ${response.data.length} cryptocurrencies from CoinGecko!`);
        return response.data.map((coin: any) => this.formatGeckoData(coin));
      }
    } catch (error) {
      console.log('CoinGecko API also failed, using mock data...');
    }

    console.warn('⚠️ All market data APIs failed, using mock data');
    return this.generateMockMarketData(limit);
  }

  async getTrendingCryptos(): Promise<TrendingCrypto[]> {
    console.log('🔥 Fetching trending cryptocurrencies...');
    
    const trendingSources = [
      () => this.getTrendingFromCoinGecko(),
      () => this.getTrendingFromDexScreener(),
      () => this.getTrendingFromSocial()
    ];

    for (const source of trendingSources) {
      try {
        const trending = await source();
        if (trending.length > 0) {
          return trending;
        }
      } catch (error) {
        continue;
      }
    }

    return this.generateMockTrending();
  }

  private async getTrendingFromCoinGecko(): Promise<TrendingCrypto[]> {
    const response = await axios.get(`${this.geckoBaseUrl}/search/trending`, {
      timeout: 10000
    });

    if (response.data && response.data.coins) {
      const trendingCoins = response.data.coins.slice(0, 10);
      
      // Get coin IDs for price lookup
      const coinIds = trendingCoins.map((item: any) => item.item.id).join(',');
      
      try {
        // Fetch real prices for trending coins
        const pricesResponse = await axios.get(`${this.geckoBaseUrl}/simple/price`, {
          params: {
            ids: coinIds,
            vs_currencies: 'usd',
            include_24hr_change: 'true',
            include_market_cap: 'true'
          },
          headers: this.coinGeckoKey !== 'CG_API_KEY_PLACEHOLDER' ? {
            'x-cg-demo-api-key': this.coinGeckoKey
          } : {},
          timeout: 10000
        });

        return trendingCoins.map((item: any, index: number) => {
          const priceData = pricesResponse.data[item.item.id];
          return {
            id: item.item.id,
            name: item.item.name,
            symbol: item.item.symbol,
            price: priceData?.usd || 0,
            percentChange24h: priceData?.usd_24h_change || 0,
            marketCap: priceData?.usd_market_cap || 0,
            volume24h: 0,
            trendingRank: index + 1,
            trendingScore: 100 - (index * 10),
            reason: 'High search volume on CoinGecko'
          };
        });
      } catch (priceError) {
        console.log('Failed to fetch prices for trending coins, using names only');
        // Return trending coins without prices if price fetch fails
        return trendingCoins.map((item: any, index: number) => ({
          id: item.item.id,
          name: item.item.name,
          symbol: item.item.symbol,
          price: 0,
          percentChange24h: 0,
          marketCap: item.item.market_cap_rank || 0,
          volume24h: 0,
          trendingRank: index + 1,
          trendingScore: 100 - (index * 10),
          reason: 'High search volume on CoinGecko'
        }));
      }
    }
    return [];
  }

  private async getTrendingFromDexScreener(): Promise<TrendingCrypto[]> {
    const response = await axios.get(`${this.dexScreenerUrl}/dex/search`, {
      params: { q: 'trending solana' },
      timeout: 10000
    });

    if (response.data && response.data.pairs) {
      return response.data.pairs.slice(0, 10).map((pair: any, index: number) => ({
        id: pair.baseToken.address,
        name: pair.baseToken.name,
        symbol: pair.baseToken.symbol,
        price: parseFloat(pair.priceUsd) || 0,
        percentChange24h: pair.priceChange?.h24 || 0,
        marketCap: pair.fdv || 0,
        volume24h: pair.volume?.h24 || 0,
        trendingRank: index + 1,
        trendingScore: 90 - (index * 8),
        reason: 'High DEX trading volume'
      }));
    }
    return [];
  }

  private async getTrendingFromSocial(): Promise<TrendingCrypto[]> {
    try {
      const response = await axios.get(`${this.lunarCrushUrl}/assets`, {
        params: {
          key: this.socialApiKey,
          sort: 'social_score',
          limit: 10
        },
        timeout: 10000
      });

      if (response.data && response.data.data) {
        return response.data.data.map((asset: any, index: number) => ({
          id: asset.id,
          name: asset.name,
          symbol: asset.symbol,
          price: asset.price || 0,
          percentChange24h: asset.percent_change_24h || 0,
          marketCap: asset.market_cap || 0,
          volume24h: asset.volume_24h || 0,
          trendingRank: index + 1,
          trendingScore: asset.social_score || 0,
          socialMentions: asset.social_mentions || 0,
          reason: 'High social media activity'
        }));
      }
    } catch (error) {
      console.log('Social API failed:', error);
    }
    return [];
  }

  async getCryptoNews(limit: number = 20): Promise<CryptoNews[]> {
    console.log('📰 Fetching crypto news...');
    
    try {
      const response = await axios.get(`${this.newsApiUrl}/everything`, {
        params: {
          q: 'cryptocurrency OR bitcoin OR ethereum OR blockchain OR defi',
          sortBy: 'publishedAt',
          language: 'en',
          pageSize: limit,
          apiKey: this.newsApiKey
        },
        timeout: 10000
      });

      if (response.data && response.data.articles) {
        return response.data.articles.map((article: any) => ({
          id: article.url,
          title: article.title,
          summary: article.description || '',
          url: article.url,
          source: article.source.name,
          publishedAt: new Date(article.publishedAt),
          relatedCoins: this.extractCoinsFromText(article.title + ' ' + article.description),
          sentiment: this.analyzeSentiment(article.title + ' ' + article.description),
          category: 'general',
          imageUrl: article.urlToImage
        }));
      }
    } catch (error) {
      console.log('News API failed:', error);
    }

    return this.generateMockNews();
  }

  async getSocialSentiment(coins: string[]): Promise<SocialSentiment[]> {
    console.log('💭 Fetching social sentiment data...');
    
    try {
      const promises = coins.map(async (coin) => {
        const response = await axios.get(`${this.lunarCrushUrl}/assets`, {
          params: {
            key: this.socialApiKey,
            symbol: coin.toUpperCase()
          },
          timeout: 10000
        });

        if (response.data && response.data.data && response.data.data.length > 0) {
          const data = response.data.data[0];
          return {
            coin: data.name,
            symbol: data.symbol,
            bullishPercent: data.sentiment?.bullish || 33,
            bearishPercent: data.sentiment?.bearish || 33,
            neutralPercent: data.sentiment?.neutral || 34,
            totalMentions: data.social_mentions || 0,
            sentimentScore: (data.sentiment?.bullish - data.sentiment?.bearish) / 100 || 0,
            twitterMentions: data.twitter_mentions || 0,
            redditMentions: data.reddit_mentions || 0,
            telegramMentions: data.telegram_mentions || 0,
            newsArticles: data.news_articles || 0,
            influencerMentions: data.influencer_mentions || 0,
            lastUpdated: new Date()
          };
        }
        return null;
      });

      const results = await Promise.all(promises);
      return results.filter(Boolean) as SocialSentiment[];
    } catch (error) {
      console.log('Social sentiment API failed:', error);
      return this.generateMockSentiment(coins);
    }
  }

  private formatCMCData(coin: any): CryptoMarketData {
    const quote = coin.quote.USD;
    return {
      id: coin.id.toString(),
      name: coin.name,
      symbol: coin.symbol,
      slug: coin.slug,
      rank: coin.cmc_rank,
      price: quote.price,
      volume24h: quote.volume_24h,
      volumeChange24h: quote.volume_change_24h,
      marketCap: quote.market_cap,
      marketCapChange24h: quote.market_cap_change_24h,
      circulatingSupply: coin.circulating_supply,
      totalSupply: coin.total_supply,
      maxSupply: coin.max_supply,
      percentChange1h: quote.percent_change_1h,
      percentChange24h: quote.percent_change_24h,
      percentChange7d: quote.percent_change_7d,
      percentChange30d: quote.percent_change_30d,
      lastUpdated: new Date(quote.last_updated),
      tags: coin.tags || [],
      category: coin.category || 'cryptocurrency',
      dominance: quote.market_cap_dominance,
      fullyDilutedMarketCap: quote.fully_diluted_market_cap
    };
  }

  private formatGeckoData(coin: any): CryptoMarketData {
    return {
      id: coin.id,
      name: coin.name,
      symbol: coin.symbol.toUpperCase(),
      slug: coin.id,
      rank: coin.market_cap_rank || 0,
      price: coin.current_price,
      volume24h: coin.total_volume,
      volumeChange24h: 0,
      marketCap: coin.market_cap,
      marketCapChange24h: coin.market_cap_change_24h,
      circulatingSupply: coin.circulating_supply,
      totalSupply: coin.total_supply,
      maxSupply: coin.max_supply,
      percentChange1h: coin.price_change_percentage_1h_in_currency || 0,
      percentChange24h: coin.price_change_percentage_24h,
      percentChange7d: coin.price_change_percentage_7d_in_currency || 0,
      percentChange30d: coin.price_change_percentage_30d_in_currency || 0,
      lastUpdated: new Date(coin.last_updated),
      tags: [],
      category: 'cryptocurrency',
      logo: coin.image
    };
  }

  private extractCoinsFromText(text: string): string[] {
    const coinRegex = /\b(BTC|ETH|SOL|ADA|DOT|LINK|UNI|AAVE|SUSHI|COMP|MKR|SNX|YFI|CRV|BAL|BONK|PEPE|DOGE|SHIB)\b/gi;
    const matches = text.match(coinRegex);
    return matches ? [...new Set(matches.map(m => m.toUpperCase()))] : [];
  }

  private analyzeSentiment(text: string): 'positive' | 'negative' | 'neutral' {
    const positiveWords = ['surge', 'pump', 'bullish', 'rally', 'gains', 'up', 'rise', 'moon'];
    const negativeWords = ['crash', 'dump', 'bearish', 'fall', 'down', 'drop', 'plunge', 'decline'];
    
    const lowerText = text.toLowerCase();
    const positiveCount = positiveWords.filter(word => lowerText.includes(word)).length;
    const negativeCount = negativeWords.filter(word => lowerText.includes(word)).length;
    
    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  private generateMockMarketData(limit: number): CryptoMarketData[] {
    console.log('🎭 Generating mock market data as fallback...');
    
    const mockCoins = [
      { name: 'Bitcoin', symbol: 'BTC', price: 67234, rank: 1, marketCap: 1300000000000 },
      { name: 'Ethereum', symbol: 'ETH', price: 3567, rank: 2, marketCap: 430000000000 },
      { name: 'Solana', symbol: 'SOL', price: 178, rank: 5, marketCap: 80000000000 },
      { name: 'Bonk', symbol: 'BONK', price: 0.00002, rank: 65, marketCap: 1500000000 }
    ];

    return mockCoins.slice(0, limit).map(coin => ({
      id: coin.symbol.toLowerCase(),
      name: coin.name,
      symbol: coin.symbol,
      slug: coin.name.toLowerCase(),
      rank: coin.rank,
      price: coin.price,
      volume24h: coin.marketCap * 0.1,
      volumeChange24h: (Math.random() - 0.5) * 20,
      marketCap: coin.marketCap,
      marketCapChange24h: coin.marketCap * (Math.random() - 0.5) * 0.05,
      circulatingSupply: coin.marketCap / coin.price,
      totalSupply: coin.marketCap / coin.price * 1.1,
      percentChange1h: (Math.random() - 0.5) * 5,
      percentChange24h: (Math.random() - 0.5) * 15,
      percentChange7d: (Math.random() - 0.5) * 30,
      percentChange30d: (Math.random() - 0.5) * 60,
      lastUpdated: new Date(),
      tags: ['cryptocurrency'],
      category: 'cryptocurrency'
    }));
  }

  private generateMockTrending(): TrendingCrypto[] {
    return [
      {
        id: 'bonk',
        name: 'Bonk',
        symbol: 'BONK',
        price: 0.00002,
        percentChange24h: 25.6,
        marketCap: 1500000000,
        volume24h: 50000000,
        trendingRank: 1,
        trendingScore: 95,
        reason: 'Solana meme coin surge'
      }
    ];
  }

  private generateMockNews(): CryptoNews[] {
    return [
      {
        id: 'mock-news-1',
        title: 'Bitcoin Reaches New All-Time High Amid Institutional Adoption',
        summary: 'Major institutions continue to allocate funds to Bitcoin...',
        url: 'https://example.com/news/1',
        source: 'Crypto News',
        publishedAt: new Date(),
        relatedCoins: ['BTC'],
        sentiment: 'positive',
        category: 'market'
      }
    ];
  }

  private generateMockSentiment(coins: string[]): SocialSentiment[] {
    return coins.map(coin => ({
      coin: coin,
      symbol: coin.toUpperCase(),
      bullishPercent: 30 + Math.random() * 40,
      bearishPercent: 20 + Math.random() * 30,
      neutralPercent: 30 + Math.random() * 20,
      totalMentions: Math.floor(Math.random() * 10000),
      sentimentScore: (Math.random() - 0.5) * 2,
      twitterMentions: Math.floor(Math.random() * 5000),
      redditMentions: Math.floor(Math.random() * 2000),
      telegramMentions: Math.floor(Math.random() * 1000),
      newsArticles: Math.floor(Math.random() * 100),
      influencerMentions: Math.floor(Math.random() * 50),
      lastUpdated: new Date()
    }));
  }
}