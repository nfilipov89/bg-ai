process.env.NODE_ENV = 'test';
const http = require('http');
const app = require('../src/index.js');

function makeRequest(port, path, options = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(`http://localhost:${port}${path}`, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ res, data }));
    });
    req.on('error', reject);
    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

const server = app.listen(0, async () => {
  const port = server.address().port;
  console.log(`Test server started on port ${port}`);

  try {
    // Test default endpoint
    let { res, data } = await makeRequest(port, '/');
    let parsed = JSON.parse(data);
    if (res.statusCode !== 200) throw new Error(`Expected 200, got ${res.statusCode}`);
    if (parsed.status !== 'ok') throw new Error(`Expected ok, got ${parsed.status}`);

    // Test health endpoint
    let healthResp = await makeRequest(port, '/health');
    let healthParsed = JSON.parse(healthResp.data);
    if (healthResp.res.statusCode !== 200) throw new Error(`Expected 200, got ${healthResp.res.statusCode}`);
    if (typeof healthParsed.uptime !== 'number') throw new Error('Expected uptime to be a number');

    // Test POST /ai/chat
    let chatResp = await makeRequest(port, '/ai/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ message: 'test' })
    });
    let chatParsed = JSON.parse(chatResp.data);
    if (chatResp.res.statusCode !== 200) throw new Error(`Expected 200, got ${chatResp.res.statusCode}`);
    if (!chatParsed.reply.includes('test')) throw new Error(`Expected reply to contain 'test', got '${chatParsed.reply}'`);

    console.log('Test PASSED!');
    server.close(() => process.exit(0));
  } catch (err) {
    console.error('Test FAILED:', err.message);
    server.close(() => process.exit(1));
  }
});
