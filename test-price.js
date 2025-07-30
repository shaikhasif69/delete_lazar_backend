const axios = require('axios');

async function testPriceQuery() {
  try {
    console.log('Testing SOL price query...');
    
    const response = await axios.post('http://localhost:3001/api/query', {
      query: 'What is the current SOL price?'
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    console.log('Response:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('Error:', error.response ? error.response.data : error.message);
  }
}

testPriceQuery();