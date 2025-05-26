// Test script for the /ask endpoint
const axios = require('axios');

const API_URL = 'http://localhost:3000/ask';

async function testAskEndpoint() {
  try {
    console.log('Testing /ask endpoint...');
    
    const response = await axios.post(API_URL, {
      question: 'What information is available in the documents?'
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('\nResponse:');
    console.log('Answer:', response.data.answer);
    console.log('Source:', response.data.source);
    
  } catch (error) {
    if (error.response) {
      console.error('Error response:', error.response.data);
    } else if (error.request) {
      console.error('No response received. Is the server running?');
    } else {
      console.error('Error:', error.message);
    }
  }
}

// Run the test
testAskEndpoint(); 