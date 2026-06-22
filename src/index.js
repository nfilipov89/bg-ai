const express = require('express');
const app = express();

const PORT = 3000;
const startTime = Date.now();

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ uptime: Math.floor((Date.now() - startTime) / 1000) });
});

app.get('/', (req, res) => {
  res.json({ status: 'ok' });
});

app.post('/ai/echo', (req, res) => {
  const text = req.body.text;
  res.json({ echo: text });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

module.exports = app;
