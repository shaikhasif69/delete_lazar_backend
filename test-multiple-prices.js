const axios = require('axios');

async function testMultiplePriceQueries() {
  const queries = [
    'What is the current SOL price?',
    'Show me BTC price',
    'What is ETH trading at?',
    'How much is Bitcoin worth?',  
    'Current Ethereum price'
  ];

  for (const query of queries) {
    try {
      console.log(`\n🔍 Testing: "${query}"`);
      
      const response = await axios.post('http://168.231.102.148:3001/api/query', {
        query: query
      }, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      console.log('✅ Response Answer:', response.data.answer);
      console.log('📊 Data Count:', response.data.data.length);
      if (response.data.data.length > 0 && response.data.data[0].price) {
        console.log('💰 Price Data Found:', response.data.data[0].symbol, '$' + response.data.data[0].price);
      }
    } catch (error) {
      console.error('❌ Error:', error.response ? error.response.data : error.message);
    }
  }
}

testMultiplePriceQueries();