export interface TokenData {
  id: string;
  name: string;
  symbol: string;
  platform: 'pumpfun' | 'bonk' | 'defi' | 'general';
  launchTime: Date;
  currentMcap: number;
  volume24h: number;
  priceUSD: number;
  holders: number;
  creator?: string;
  description?: string;
  category?: string;
  rank?: number;
  percentChange24h?: number;
  totalSupply?: number;
}

export interface QueryResult {
  query: string;
  answer: string;
  data: any[]; // Can be TokenData[], DeFiProtocol[], CryptoMarketData[], etc.
  metadata?: {
    dataType: 'tokens' | 'protocols' | 'yields' | 'prices' | 'news' | 'trending' | 'sentiment';
    sources: string[];
    totalResults: number;
  };
  timestamp: Date;
  processingTime: number;
}

export interface EnhancedQueryContext {
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
}

export interface PumpFunToken {
  mint: string;
  name: string;
  symbol: string;
  description: string;
  image_uri: string;
  metadata_uri: string;
  twitter?: string;
  telegram?: string;
  bonding_curve: string;
  associated_bonding_curve: string;
  creator: string;
  created_timestamp: number;
  raydium_pool?: string;
  complete: boolean;
  virtual_sol_reserves: number;
  virtual_token_reserves: number;
  hidden: boolean;
  total_supply: number;
  website?: string;
  show_name: boolean;
  last_trade_timestamp: number;
  king_of_the_hill_timestamp?: number;
  market_cap: number;
  reply_count: number;
  last_reply: number;
  nsfw: boolean;
  market_id?: string;
  inverted?: boolean;
  usd_market_cap: number;
}