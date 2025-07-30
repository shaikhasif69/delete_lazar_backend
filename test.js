const axios = require('axios');

// Simple test of the pump.fun API
async function testPumpFunAPI() {
  try {
    const response = await axios.get('https://frontend-api.pump.fun/coins', {
      params: {
        offset: 0,
        limit: 10,
        sort: 'created_timestamp',
        order: 'DESC',
        includeNsfw: false
      },
      headers: {
        'Authorization': `Bearer ${process.env.PUMP_FUN_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ pump.fun API test successful');
    console.log(`Found ${response.data.length} tokens`);
    if (response.data.length > 0) {
      const token = response.data[0];
      console.log(`Latest token: ${token.name} (${token.symbol}) - $${token.usd_market_cap}`);
    }
  } catch (error) {
    console.error('❌ pump.fun API test failed:', error.message);
  }
}

// Load env vars
require('dotenv').config();

testPumpFunAPI();