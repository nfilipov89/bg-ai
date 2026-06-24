# Dev грешка

## Тест провален
```

> bg-ai@1.0.0 test
> node tests/test.js

C:\Users\Dari\Desktop\bg-ai\src\index.js:11
    'ЗАДЪЛЖИТЕЛЕН ФОРМАТ:  PLAN: {"task":"...","steps":["..."]} CODE: // JavaScript код за Express ПРАВИЛА: 1) Никога не обяснявай, винаги пиши код. 2) За /health върни точно: app.get("/health",(req,res)=>res.json({uptime:process.uptime()})); 3) Не използвате fetch към външни API-та.
    ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

SyntaxError: Invalid or unexpected token
    at wrapSafe (node:internal/modules/cjs/loader:1762:18)
    at Module._compile (node:internal/modules/cjs/loader:1803:20)
    at Object..js (node:internal/modules/cjs/loader:1969:10)
    at Module.load (node:internal/modules/cjs/loader:1552:32)
    at Module._load (node:internal/modules/cjs/loader:1354:12)
    at wrapModuleLoad (node:internal/modules/cjs/loader:255:19)
    at Module.require (node:internal/modules/cjs/loader:1575:12)
    at require (node:internal/modules/helpers:191:16)
    at Object.<anonymous> (C:\Users\Dari\Desktop\bg-ai\tests\test.js:3:13)
    at Module._compile (node:internal/modules/cjs/loader:1829:14)

Node.js v25.9.0

```
