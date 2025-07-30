export interface TokenData {
  id: string;
  name: string;
  symbol: string;
  platform: 'pumpfun' | 'bonk';
  launchTime: Date;
  currentMcap: number;
  volume24h: number;
  priceUSD: number;
  holders: number;
  creator?: string;
  description?: string;
}

export interface QueryResult {
  query: string;
  answer: string;
  data: TokenData[];
  timestamp: Date;
  processingTime: number;
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