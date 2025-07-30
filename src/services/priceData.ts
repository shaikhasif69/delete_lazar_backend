import axios from 'axios';

export interface CryptoPriceData {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  change24hPercent: number;
  marketCap?: number;
  volume24h?: number;
  lastUpdated: Date;
}

export class PriceDataService {
  private async fetchFromCoinGecko(symbols: string[]): Promise<CryptoPriceData[]> {
    try {
      console.log('🔍 Fetching real-time prices from CoinGecko...');
      
      // Map common symbols to CoinGecko IDs
      const symbolToId: { [key: string]: string } = {
        'SOL': 'solana',
        'BTC': 'bitcoin',
        'ETH': 'ethereum',
        'USDC': 'usd-coin',
        'USDT': 'tether',
        'BNB': 'binancecoin',
        'XRP': 'ripple',
        'ADA': 'cardano',
        'DOGE': 'dogecoin',
        'MATIC': 'matic-network'
      };

      const ids = symbols.map(s => symbolToId[s.toUpperCase()]).filter(Boolean);
      
      if (ids.length === 0) return [];

      const response = await axios.get('https://api.coingecko.com/api/v3/simple/price', {
        params: {
          ids: ids.join(','),
          vs_currencies: 'usd',
          include_24hr_change: 'true',
          include_market_cap: 'true',
          include_24hr_vol: 'true'
        },
        timeout: 10000
      });

      const results: CryptoPriceData[] = [];
      
      for (const [symbol, id] of Object.entries(symbolToId)) {
        if (response.data[id] && symbols.some(s => s.toUpperCase() === symbol)) {
          const data = response.data[id];
          results.push({
            symbol: symbol,
            name: this.getFullName(symbol),
            price: data.usd,
            change24h: data.usd_24h_change || 0,
            change24hPercent: data.usd_24h_change || 0,
            marketCap: data.usd_market_cap,
            volume24h: data.usd_24h_vol,
            lastUpdated: new Date()
          });
        }
      }

      return results;
    } catch (error) {
      console.log('CoinGecko API failed:', error instanceof Error ? error.message : 'Unknown error');
      return [];
    }
  }

  private async fetchFromCoinCap(symbols: string[]): Promise<CryptoPriceData[]> {
    try {
      console.log('🔍 Fetching real-time prices from CoinCap...');
      
      const response = await axios.get('https://api.coincap.io/v2/assets', {
        params: {
          limit: 50
        },
        timeout: 10000
      });

      const results: CryptoPriceData[] = [];
      
      if (response.data && response.data.data) {
        for (const asset of response.data.data) {
          if (symbols.some(s => s.toUpperCase() === asset.symbol.toUpperCase())) {
            results.push({
              symbol: asset.symbol.toUpperCase(),
              name: asset.name,
              price: parseFloat(asset.priceUsd),
              change24h: parseFloat(asset.changePercent24Hr) || 0,
              change24hPercent: parseFloat(asset.changePercent24Hr) || 0,
              marketCap: parseFloat(asset.marketCapUsd),
              volume24h: parseFloat(asset.volumeUsd24Hr),
              lastUpdated: new Date()
            });
          }
        }
      }

      return results;
    } catch (error) {
      console.log('CoinCap API failed:', error instanceof Error ? error.message : 'Unknown error');
      return [];
    }
  }

  private getFullName(symbol: string): string {
    const names: { [key: string]: string } = {
      'SOL': 'Solana',
      'BTC': 'Bitcoin',
      'ETH': 'Ethereum',
      'USDC': 'USD Coin',
      'USDT': 'Tether',
      'BNB': 'Binance Coin',
      'XRP': 'Ripple',
      'ADA': 'Cardano',
      'DOGE': 'Dogecoin',
      'MATIC': 'Polygon'
    };
    return names[symbol.toUpperCase()] || symbol;
  }

  async getPrices(symbols: string[]): Promise<CryptoPriceData[]> {
    console.log(`📊 Fetching prices for: ${symbols.join(', ')}`);
    
    // Try CoinGecko first (more reliable)
    let prices = await this.fetchFromCoinGecko(symbols);
    
    // If CoinGecko fails or doesn't have all symbols, try CoinCap
    if (prices.length === 0) {
      prices = await this.fetchFromCoinCap(symbols);
    }
    
    // If still no data, create mock data for development
    if (prices.length === 0) {
      console.warn('⚠️ All price APIs failed, using mock price data');
      return this.generateMockPrices(symbols);
    }
    
    return prices;
  }

  private generateMockPrices(symbols: string[]): CryptoPriceData[] {
    const mockPrices: { [key: string]: number } = {
      'SOL': 178.45,
      'BTC': 67234.56,
      'ETH': 3567.89,
      'USDC': 1.00,
      'USDT': 1.00,
      'BNB': 412.34,
      'XRP': 0.63,
      'ADA': 0.52,
      'DOGE': 0.085,
      'MATIC': 0.78
    };

    return symbols.map(symbol => ({
      symbol: symbol.toUpperCase(),
      name: this.getFullName(symbol),
      price: mockPrices[symbol.toUpperCase()] || Math.random() * 100,
      change24h: (Math.random() - 0.5) * 10,
      change24hPercent: (Math.random() - 0.5) * 10,
      marketCap: mockPrices[symbol.toUpperCase()] ? mockPrices[symbol.toUpperCase()] * 1000000000 : undefined,
      volume24h: Math.random() * 1000000000,
      lastUpdated: new Date()
    }));
  }

  async getCurrentSOLPrice(): Promise<number> {
    const prices = await this.getPrices(['SOL']);
    return prices.length > 0 ? prices[0].price : 178.45; // fallback price
  }
}