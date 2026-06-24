# План за: Добави middleware за logging на всеки request с метод и URL

1. Създайте файл `loggingMiddleware.js` в директорията `/middlewares`
   - Файл: `./middlewares/loggingMiddleware.js`

2. Въвежнете middleware, което записва метаданните за метод и URL на всяка request:
```javascript
const loggingMiddleware = (req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} Request to: ${req.url}`);
  next();
};

module.exports = loggingMiddleware;
```

3. Придобрийте middleware в вашия основен модул на Node.js (`app.js` или `server.js`)
```javascript
const express = require('express');
const app = express();
const loggingMiddleware = require('./middlewares/loggingMiddleware');

app.use(loggingMiddleware);
```

4. Утвърдете, че middleware е активно:
- Нека сте уверени, че middleware е добавено с `app.use(loggingMiddleware);` в вашия основен модул.

5. Запускте апликация на Node.js:
```bash
node app.js
```
С този план, всяка request ще бъде регистрирана с метаданните за метод и URL в консоли.