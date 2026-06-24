# План за: - Добави GET /status endpoint, който връща JSON с версия и uptime

1. Създайте файл "server.js" (ново) за основната конфигурация на Node.js сервера.
   - Включете модулите 'express' и 'os'.
   - Инициализирайте модула 'express' с нова инстанция 'app'.

2. Променете или добавете следния код в "server.js":
```javascript
const express = require('express');
const app = express();
const os = require('os');

let versionInfo = {
  version: '1.0.0', // Изменя по необходима версия на вашия софтуер
  uptime: null
};

app.get('/status', (req, res) => {
  const now = new Date();

  versionInfo.uptime = os.uptime() / 1000; // Преобразувате в секунди

  res.json(versionInfo);
});
```

3. Създайте файл "server.js" за логиката на старт и запазване.
```javascript
// Въже 'app' от предходното изследване
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
 console.log(`Серверата е активирана на порт ${PORT}.`);
});
```

4. Създайте файл "index.js" за запазване и управление на процеса.
```javascript
// Въже 'express' от предходното изследване
require('dotenv').config();
const app = require('./server');

module.exports = app;
```

5. Изменете или създайте файл "package.json":
- Добавете ключове за модули, зависимости и скрипти (если не са имали).
- Създайте скрипт 'start' с следния код: `"start": "node index.js"`.
```json
{
  "name": "bg-ai-project",
  "version": "1.0.0",
  "description": "",
  "main": "server.js",
  "scripts": {
    "start": "node index.js"
  },
  "dependencies": {
    "express": "^4.17.3",
    "dotenv": "^10.0.0"
  }
}
```

Следите за тези стъпки, а след това можете да запустите проекта с `npm start` и достойате /status на localhost:3000/status.