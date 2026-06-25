# План за: Добави middleware за logging на всеки request с метод и URL

1. Създайте файл `loggingMiddleware.js` в директорията `/middlewares`
   - Файл: `./middlewares/loggingMiddleware.js`

2. Въже middleware, който записва метаданните за метод и URL на request
```javascript
const loggingMiddleware = (req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
};
```
3. Привърнете middleware в вашия приложение Node.js
```javascript
// В файл: app.js или ваше основно приложение на Node.js
const loggingMiddleware = require('./middlewares/loggingMiddleware');
app.use(loggingMiddleware);
```
4. Определете директорията, къдя ще се състоят файловете за middleware (покажи единствено case)
```javascript
// В файл: app.js или ваше основно приложение на Node.js
const path = require('path');

app.use(express.static(path.join(__dirname, 'middlewares')));
```
5. Проверете работата си, изпращай request и осигурете, че middleware записва метаданните за метод и URL correctly
```javascript
// В файл: app.test.js или вашите тестове на Node.js
const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.send('Hello World!');
});


// Запускате тъкната в test case за проверка
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Приложението ми е слуша на порт ${PORT}`));
```
Следите тези стъпки и създайте middleware за логгирование request с метод и URL.