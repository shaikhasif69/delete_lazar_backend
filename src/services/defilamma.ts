import axios from 'axios';

export interface DeFiProtocol {
  id: string;
  name: string;
  address?: string;
  symbol: string;
  url: string;
  description: string;
  chain: string;
  logo: string;
  audits: number;
  audit_note?: string;
  gecko_id?: string;
  cmcId?: string;
  category: string;
  chains: string[];
  module: string;
  twitter?: string;
  forkedFrom?: string[];
  oracles?: string[];
  listedAt: number;
  methodology?: string;
  slug: string;
  tvl: number;
  chainTvls: { [chain: string]: number };
  change_1h?: number;
  change_1d?: number;
  change_7d?: number;
  tokenBreakdowns?: { [token: string]: number };
  mcap?: number;
}

export interface YieldFarmPool {
  chain: string;
  project: string;
  symbol: string;
  tvlUsd: number;
  apy: number;
  apyBase?: number;
  apyReward?: number;
  rewardTokens?: string[];
  pool: string;
  apyPct1D?: number;
  apyPct7D?: number;
  apyPct30D?: number;
  stablecoin: boolean;
  ilRisk: string;
  exposure: string;
  predictions?: {
    predictedClass: string;
    predictedProbability: number;
    binnedConfidence: number;
  };
  underlyingTokens?: string[];
  poolMeta?: string;
  mu?: number;
  sigma?: number;
  count?: number;
  outlier?: boolean;
  volume?: number;
}

export interface StablecoinData {
  id: number;
  name: string;
  address?: string;
  symbol: string;
  url?: string;
  description?: string;
  chain: string;
  logo?: string;
  gecko_id?: string;
  cmcId?: string;
  pegType: string;
  pegMechanism: string;
  circulating: { [chain: string]: number };
  totalCirculating: number;
  totalCirculatingUSD: number;
  totalUnreleased: number;
  totalUnreleasedUSD: number;
  circulatingPrevDay: { [chain: string]: number };
  circulatingPrevWeek: { [chain: string]: number };
  circulatingPrevMonth: { [chain: string]: number };
}

export class DeFiLlamaService {
  private baseUrl = 'https://api.llama.fi';
  private yieldsUrl = 'https://yields.llama.fi';
  private stablecoinUrl = 'https://stablecoins.llama.fi';

  async getProtocols(): Promise<DeFiProtocol[]> {
    try {
      console.log('🦙 Fetching DeFi protocols from DefiLlama...');
      
      const response = await axios.get(`${this.baseUrl}/protocols`, {
        timeout: 15000
      });

      if (response.data && Array.isArray(response.data)) {
        console.log(`🚀 SUCCESS! Fetched ${response.data.length} DeFi protocols!`);
        return response.data;
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('Error fetching DeFi protocols:', error);
      return this.generateMockProtocols();
    }
  }

  async getProtocolBySlug(slug: string): Promise<DeFiProtocol | null> {
    try {
      console.log(`🔍 Fetching protocol details for: ${slug}`);
      
      const response = await axios.get(`${this.baseUrl}/protocol/${slug}`, {
        timeout: 10000
      });

      return response.data;
    } catch (error) {
      console.error(`Error fetching protocol ${slug}:`, error);
      return null;
    }
  }

  async getTopProtocolsByTVL(chain?: string, limit: number = 50): Promise<DeFiProtocol[]> {
    const protocols = await this.getProtocols();
    
    let filteredProtocols = protocols;
    if (chain) {
      filteredProtocols = protocols.filter(p => 
        p.chains.includes(chain.charAt(0).toUpperCase() + chain.slice(1))
      );
    }
    
    return filteredProtocols
      .sort((a, b) => b.tvl - a.tvl)
      .slice(0, limit);
  }

  async getYieldFarms(chain?: string): Promise<YieldFarmPool[]> {
    try {
      console.log('🌾 Fetching yield farming pools from DefiLlama...');
      
      const response = await axios.get(`${this.yieldsUrl}/pools`, {
        timeout: 15000
      });

      if (response.data && response.data.data && Array.isArray(response.data.data)) {
        let pools = response.data.data;
        
        if (chain) {
          pools = pools.filter((pool: YieldFarmPool) => 
            pool.chain.toLowerCase() === chain.toLowerCase()
          );
        }
        
        console.log(`🚀 SUCCESS! Fetched ${pools.length} yield farming pools!`);
        return pools;
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('Error fetching yield farms:', error);
      return this.generateMockYieldFarms();
    }
  }

  async getTopYieldFarms(chain?: string, limit: number = 20): Promise<YieldFarmPool[]> {
    const pools = await this.getYieldFarms(chain);
    
    return pools
      .filter(pool => pool.apy > 0 && pool.tvlUsd > 10000) // Filter out suspicious pools
      .sort((a, b) => b.apy - a.apy)
      .slice(0, limit);
  }

  async getStablecoins(): Promise<StablecoinData[]> {
    try {
      console.log('💰 Fetching stablecoin data from DefiLlama...');
      
      const response = await axios.get(`${this.stablecoinUrl}/stablecoins`, {
        params: { includePrices: true },
        timeout: 10000
      });

      if (response.data && response.data.peggedAssets && Array.isArray(response.data.peggedAssets)) {
        console.log(`🚀 SUCCESS! Fetched ${response.data.peggedAssets.length} stablecoins!`);
        return response.data.peggedAssets;
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('Error fetching stablecoins:', error);
      return this.generateMockStablecoins();
    }
  }

  async getChainTVL(chain: string): Promise<number> {
    try {
      console.log(`📊 Fetching TVL for chain: ${chain}`);
      
      const response = await axios.get(`${this.baseUrl}/tvl/${chain}`, {
        timeout: 10000
      });

      return response.data || 0;
    } catch (error) {
      console.error(`Error fetching TVL for ${chain}:`, error);
      return 0;
    }
  }

  async getTotalTVL(): Promise<number> {
    try {
      console.log('🌐 Fetching total DeFi TVL...');
      
      const response = await axios.get(`${this.baseUrl}/tvl`, {
        timeout: 10000
      });

      return response.data || 0;
    } catch (error) {
      console.error('Error fetching total TVL:', error);
      return 0;
    }
  }

  private generateMockProtocols(): DeFiProtocol[] {
    console.log('🎭 Generating mock DeFi protocols as fallback...');
    
    const mockProtocols: DeFiProtocol[] = [
      {
        id: '1',
        name: 'Uniswap',
        symbol: 'UNI',
        url: 'https://uniswap.org',
        description: 'Decentralized exchange protocol',
        chain: 'Ethereum',
        logo: 'https://defillama.com/placeholder-logo.png',
        audits: 5,
        category: 'Dexes',
        chains: ['Ethereum', 'Arbitrum', 'Polygon'],
        module: 'uniswap',
        listedAt: 1600000000,
        slug: 'uniswap',
        tvl: 5000000000,
        chainTvls: { Ethereum: 3000000000, Arbitrum: 1500000000, Polygon: 500000000 },
        change_1d: 2.5,
        change_7d: -1.2
      },
      {
        id: '2',
        name: 'Aave',
        symbol: 'AAVE',
        url: 'https://aave.com',
        description: 'Decentralized lending protocol',
        chain: 'Ethereum',
        logo: 'https://defillama.com/placeholder-logo.png',
        audits: 8,
        category: 'Lending',
        chains: ['Ethereum', 'Polygon', 'Avalanche'],
        module: 'aave',
        listedAt: 1580000000,
        slug: 'aave',
        tvl: 8000000000,
        chainTvls: { Ethereum: 6000000000, Polygon: 1200000000, Avalanche: 800000000 },
        change_1d: 1.8,
        change_7d: 3.4
      }
    ];
    
    return mockProtocols;
  }

  private generateMockYieldFarms(): YieldFarmPool[] {
    console.log('🎭 Generating mock yield farms as fallback...');
    
    return [
      {
        chain: 'Ethereum',
        project: 'Uniswap V3',
        symbol: 'USDC-ETH',
        tvlUsd: 50000000,
        apy: 12.5,
        apyBase: 8.2,
        apyReward: 4.3,
        rewardTokens: ['UNI'],
        pool: '0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640',
        stablecoin: false,
        ilRisk: 'medium',
        exposure: 'multi'
      },
      {
        chain: 'Solana',
        project: 'Raydium',
        symbol: 'SOL-USDC',
        tvlUsd: 25000000,
        apy: 18.7,
        apyBase: 12.1,
        apyReward: 6.6,
        rewardTokens: ['RAY'],
        pool: 'raydium-sol-usdc',
        stablecoin: false,
        ilRisk: 'medium',
        exposure: 'multi'
      }
    ];
  }

  private generateMockStablecoins(): StablecoinData[] {
    console.log('🎭 Generating mock stablecoin data as fallback...');
    
    return [
      {
        id: 1,
        name: 'Tether',
        symbol: 'USDT',
        chain: 'Ethereum',
        pegType: 'fiat-backed',
        pegMechanism: 'centralized',
        circulating: { Ethereum: 50000000000 },
        totalCirculating: 50000000000,
        totalCirculatingUSD: 50000000000,
        totalUnreleased: 0,
        totalUnreleasedUSD: 0,
        circulatingPrevDay: { Ethereum: 49900000000 },
        circulatingPrevWeek: { Ethereum: 49500000000 },
        circulatingPrevMonth: { Ethereum: 48000000000 }
      }
    ];
  }

  // Helper method to format DeFi data for OpenAI
  formatProtocolsForAI(protocols: DeFiProtocol[]): string {
    return protocols.slice(0, 10).map(p => 
      `${p.name} (${p.symbol}): $${(p.tvl / 1e9).toFixed(2)}B TVL, ${p.category}, Chains: ${p.chains.join(', ')}`
    ).join('\n');
  }

  formatYieldFarmsForAI(pools: YieldFarmPool[]): string {
    return pools.slice(0, 10).map(p => 
      `${p.project} ${p.symbol}: ${p.apy.toFixed(2)}% APY, $${(p.tvlUsd / 1e6).toFixed(1)}M TVL, ${p.chain}`
    ).join('\n');
  }
}