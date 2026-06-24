# План за: Добави GET /status endpoint, който връща JSON с версия и uptime

1. Създаване на файл под назив `server.js` (если не е съществуват)
   - Изберете модулите: `const express = require('express');`
   - Инициализирайте апстракцияally: `const app = express();`

2. Промените в `server.js`, за да включите middleware за timedate
   - Добавяте следващата строчка по-късно в кода:
     ```javascript
     const { createLogger } = require('@nestjs/common');
     const pinoHttp = require('pino-http);
     app.use(pinoHttp());
     ```

3. Създаване на файл под назив `statusController.js` в кореновия каталог.
   - Включете модулите: `const { getStatus } = require('./status.controller');`
   - Добавяте следващата строчка по-късно в кода:
     ```javascript
     app.get('/status', getStatus);
     ```

4. Създаване на файл под назив `status.controller.js` в кореновий каталог.
   - Включете модулите: `const { Status } = require('./status.resolver');`
   - Реализирайте методът `getStatus`:
     ```javascript
     module.exports.getStatus = (req, res) => {
       const responseObj = {
         version: '1.0',
         uptime: process.uptime(),
       };
       res.status(200).json(responseObj);
     };
     ```

5. Създаване на файл под назив `status.resolver.js` в кореновий каталог.
   - Включете модулите: `const { Status } = require('./status.resolver');`
   - Реализирайте класът `Status`:
     ```javascript
     class Status {
       get() {
         return { version: '1.0', uptime: process.uptime() };
       }
     }

     module.exports = { Status };
     ```

Следвайки тези стъпки, ще имате точен GET /status endpoint, който връща JSON с версия и uptime.