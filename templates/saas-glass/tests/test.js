const app = require('../server');
const http = require('http');

let server;
const PORT = 3002; // Separate port for testing

function runTests() {
  server = app.listen(PORT, () => {
    console.log(`Test server running on port ${PORT}`);

    // Test 1: Get config API
    http.get(`http://127.0.0.1:${PORT}/api/config`, (res) => {
      if (res.statusCode !== 200) {
        console.error(`FAIL: Config API returned status ${res.statusCode}`);
        cleanup(1);
      }
      
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const config = JSON.parse(body);
          if (!config.publishableKey) {
            console.error('FAIL: Config API did not return publishableKey');
            cleanup(1);
          }
          console.log('SUCCESS: Config API validation passed');

          // Test 2: Create payment intent endpoint (POST)
          const postData = JSON.stringify({ amount: 29.00, planName: 'Growth Plan' });
          const options = {
            hostname: '127.0.0.1',
            port: PORT,
            path: '/create-payment-intent',
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(postData)
            }
          };

          const req = http.request(options, (resIntent) => {
            if (resIntent.statusCode !== 200) {
              console.error(`FAIL: Create Payment Intent API returned status ${resIntent.statusCode}`);
              cleanup(1);
            }

            let intentBody = '';
            resIntent.on('data', chunk => intentBody += chunk);
            resIntent.on('end', () => {
              try {
                const intent = JSON.parse(intentBody);
                if (!intent.clientSecret) {
                  console.error('FAIL: Payment Intent API did not return clientSecret');
                  cleanup(1);
                }
                console.log('SUCCESS: Payment Intent API validation passed');
                console.log('Test PASSED!');
                cleanup(0);
              } catch (e) {
                console.error('FAIL: Parsing payment intent JSON:', e.message);
                cleanup(1);
              }
            });
          });

          req.on('error', err => {
            console.error('FAIL: Create Payment Intent request error:', err.message);
            cleanup(1);
          });

          req.write(postData);
          req.end();
        } catch (e) {
          console.error('FAIL: Parsing config JSON:', e.message);
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
