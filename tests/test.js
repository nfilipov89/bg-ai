const http = require('http');
const server = require('../src/index.js');

const PORT = 3000;

server.listen(PORT, () => {
  console.log(`Test server started on port ${PORT}`);

  http.get(`http://localhost:${PORT}`, (res) => {
    let data = '';

    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      try {
        console.log(`Received response: ${data}`);
        const parsed = JSON.parse(data);
        
        if (res.statusCode !== 200) {
          throw new Error(`Expected status code 200, got ${res.statusCode}`);
        }
        
        if (parsed.status !== 'ok') {
          throw new Error(`Expected JSON status 'ok', got '${parsed.status}'`);
        }

        console.log('Test PASSED!');
        server.close(() => {
          process.exit(0);
        });
      } catch (err) {
        console.error('Test FAILED:', err.message);
        server.close(() => {
          process.exit(1);
        });
      }
    });
  }).on('error', (err) => {
    console.error('Request error:', err.message);
    server.close(() => {
      process.exit(1);
    });
  });
});
