const app = require('../server');
const http = require('http');

let server;
const PORT = 3001; // Separate port for testing

function runTests() {
  server = app.listen(PORT, () => {
    console.log(`Test server running on port ${PORT}`);

    // Test 1: Get products API
    http.get(`http://127.0.0.1:${PORT}/api/products`, (res) => {
      if (res.statusCode !== 200) {
        console.error(`FAIL: Products API returned status ${res.statusCode}`);
        cleanup(1);
      }
      
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const products = JSON.parse(body);
          if (!Array.isArray(products) || products.length === 0) {
            console.error('FAIL: Products response is not a non-empty array');
            cleanup(1);
          }
          console.log('SUCCESS: Products API validation passed');

          // Test 2: Get config API
          http.get(`http://127.0.0.1:${PORT}/api/config`, (resConfig) => {
            if (resConfig.statusCode !== 200) {
              console.error(`FAIL: Config API returned status ${resConfig.statusCode}`);
              cleanup(1);
            }

            let configBody = '';
            resConfig.on('data', chunk => configBody += chunk);
            resConfig.on('end', () => {
              try {
                const config = JSON.parse(configBody);
                if (!config.publishableKey) {
                  console.error('FAIL: Config API did not return publishableKey');
                  cleanup(1);
                }
                console.log('SUCCESS: Config API validation passed');
                console.log('Test PASSED!');
                cleanup(0);
              } catch (e) {
                console.error('FAIL: Parsing config JSON:', e.message);
                cleanup(1);
              }
            });
          });
        } catch (e) {
          console.error('FAIL: Parsing products JSON:', e.message);
          cleanup(1);
        }
      });
    }).on('error', err => {
      console.error('FAIL: HTTP request error:', err.message);
      cleanup(1);
    });
  });
}

function cleanup(code) {
  if (server) {
    server.close(() => {
      console.log('Test server closed');
      process.exit(code);
    });
  } else {
    process.exit(code);
  }
}

runTests();
