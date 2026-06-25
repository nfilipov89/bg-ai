# Dev грешка

## Тест провален
```

> bg-ai@1.0.0 test
> node tests/test.js

◇ injected env (0) from .env // tip: ⌘ custom filepath { path: '/custom/path/.env' }
C:\Users\Dari\Desktop\bg-ai\src\index.js:124
app.get('/version', versionController.getVersion);
                    ^

ReferenceError: versionController is not defined
    at Object.<anonymous> (C:\Users\Dari\Desktop\bg-ai\src\index.js:124:21)
    at Module._compile (node:internal/modules/cjs/loader:1829:14)
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

## Генериран код
```js
app.get('/version', versionController.getVersion);
```
