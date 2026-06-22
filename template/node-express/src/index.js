require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();

const MANAGER_SYSTEM = 'Ти си Project Manager на проект bg-ai. ' +
    'Работна среда: Node.js + Express, файл src/index.js, сървър на порт 3000. ' +
    'ЗАДЪЛЖИТЕЛЕН ФОРМАТ: ' +
    '<think> разсъждения </think> ' +
    'PLAN: {"task":"...","steps":["..."]} ' +
    'CODE: // JavaScript код за Express ' +
    'ПРАВИЛА: 1) Никога не обяснявай, винаги пиши код. ' +
    '2) За /health върни точно: app.get("/health",(req,res)=>res.json({uptime:process.uptime()})); ' +
    '3) Не използвай fetch към външни API-та.';

const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/health', (req, res) => {
  res.json({ uptime: process.uptime() });
});

app.post('/ai/echo', (req, res) => {
  res.json({ echo: req.body.message });
});

app.post('/ai/chat', async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'message required' });

  const isTestMode = process.env.NODE_ENV === 'test' || (!process.env.GROQ_API_KEY && !process.env.LLM_BASE_URL);
  if (isTestMode) {
    return res.json({ reply: `Echo: ${message}`, mode: 'test' });
  }

  const baseUrl = process.env.LLM_BASE_URL || 'http://127.0.0.1:1234/v1';
  const model = process.env.LLM_MODEL || 'llama3-8b-8192';
  const apiKey = process.env.GROQ_API_KEY || 'dummy';

  try {
    const r = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: MANAGER_SYSTEM },
          { role: 'user', content: message }
        ]
      })
    });
    const data = await r.json();

    let fullReply = data.choices?.[0]?.message?.content || '';
    const reasoning = data.choices?.[0]?.message?.reasoning_content || '';
    
    // Parse <think>
    const thinkMatch = fullReply.match(/<think>([\s\S]*?)<\/think>/);
    const think = reasoning || (thinkMatch ? thinkMatch[1].trim() : '');
    
    // Parse cleanReply
    let cleanReply = fullReply.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
    
    // Parse PLAN
    const planMatch = cleanReply.match(/PLAN:\s*(\{[\s\S]*?\})/);
    let plan = null;
    try {
      plan = planMatch ? JSON.parse(planMatch[1]) : null;
    } catch(e) {
      // JSON parse fail
    }

    // Parse CODE
    const codeMatch = cleanReply.match(/CODE:\s*([\s\S]*)/);
    const code = codeMatch ? codeMatch[1].trim() : null;

    // Save full reply to logs
    const logDir = path.join(__dirname, '../logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    fs.writeFileSync(path.join(logDir, `reply-${timestamp}.log`), fullReply, 'utf-8');

    res.json({
      reply: cleanReply,
      think,
      plan,
      code,
      mode: 'local-manager',
      model
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log('Server is running on port ' + PORT);
  });
}

module.exports = app;