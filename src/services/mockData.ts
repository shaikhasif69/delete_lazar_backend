import { TokenData } from '../types';

export const generateMockTokens = (count: number = 10): TokenData[] => {
  const tokens: TokenData[] = [];
  const names = ['PumpCoin', 'MoonToken', 'RocketFuel', 'DiamondHands', 'GemFinder', 'AlphaCoin', 'BetaToken', 'GammaCoin'];
  const symbols = ['PUMP', 'MOON', 'ROCKET', 'DIAMOND', 'GEM', 'ALPHA', 'BETA', 'GAMMA'];
  
  for (let i = 0; i < count; i++) {
    const baseIndex = i % names.length;
    const marketCap = Math.floor(Math.random() * 500000) + 10000; // 10k to 510k
    const totalSupply = 1000000000; // 1B tokens
    
    tokens.push({
      id: `mock-token-${i + 1}`,
      name: `${names[baseIndex]} ${i + 1}`,
      symbol: `${symbols[baseIndex]}${i + 1}`,
      platform: 'pumpfun',
      launchTime: new Date(Date.now() - Math.floor(Math.random() * 24 * 60 * 60 * 1000)), // Last 24 hours
      currentMcap: marketCap,
      volume24h: Math.floor(Math.random() * 100000),
      priceUSD: marketCap / totalSupply,
      holders: Math.floor(Math.random() * 1000) + 10,
      creator: `creator-${i + 1}`,
      description: `A revolutionary new token launched on pump.fun with unique features and strong community support.`
    });
  }
  
  return tokens.sort((a, b) => b.launchTime.getTime() - a.launchTime.getTime());
};