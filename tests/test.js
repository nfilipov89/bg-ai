const http = require('http');
const server = require('../src/index.js');

const PORT = 3000;

function makeRequest(path) {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:${PORT}${path}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ res, data }));
    }).on('error', reject);
  });
}

server.listen(PORT, async () => {
  console.log(`Test server started on port ${PORT}`);

  try {
    // Test default endpoint
    let { res, data } = await makeRequest('/');
    console.log(`Received response for /: ${data}`);
    let parsed = JSON.parse(data);
    if (res.statusCode !== 200) throw new Error(`Expected status code 200, got ${res.statusCode}`);
    if (parsed.status !== 'ok') throw new Error(`Expected JSON status 'ok', got '${parsed.status}'`);

    // Test health endpoint
    let healthResp = await makeRequest('/health');
    console.log(`Received response for /health: ${healthResp.data}`);
    let healthParsed = JSON.parse(healthResp.data);
    if (healthResp.res.statusCode !== 200) throw new Error(`Expected status code 200 for /health, got ${healthResp.res.statusCode}`);
    if (typeof healthParsed.uptime !== 'number') throw new Error(`Expected JSON uptime to be a number, got '${typeof healthParsed.uptime}'`);

    console.log('Test PASSED!');
    server.close(() => process.exit(0));
  } catch (err) {
    console.error('Test FAILED:', err.message);
    server.close(() => process.exit(1));
  }
});
