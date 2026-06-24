# BG-AI ROADMAP

## ✅ ЕТАП 0 – ОСНОВА (ГОТОВ)

- [x] Node.js + Express сървър
- [x] Endpoints: /, /health, /ai/echo, /ai/chat
- [x] .env + LM Studio връзка
- [x] tests/test.js + npm test
- [x] GitHub CI зелен
- [x] brain.js v0.1 – чете VISION.md и говори с LM Studio

Доказателство: PROOF_LOG.md #0

## ✅ ЕТАП 1 – АВТОНОМЕН PM (ГОТОВ)

- [x] brain.js --mode=pm чете KANBAN.md
- [x] вади първа To Do задача
- [x] генерира PLAN.md
- [x] мести задача в Doing
- [x] git commit + push автоматично

Доказателство: commit 76e5741

## ✅ ЕТАП 2 – Dev агент (ГОТОВ)

- [x] brain.js --mode=dev чете PLAN.md
- [x] праща към LM Studio с универсален prompt
- [x] парсва code блокове от отговора
- [x] записва файлове чрез // FILE: конвенция
- [x] пуска npm test автоматично
- [x] при PASS → git commit + push
- [x] при FAIL → записва в DEV_ERROR.md

## ✅ ЕТАП 3 – QA агент (ГОТОВ)

- [x] brain.js --mode=qa чете Doing от KANBAN
- [x] пуска npm test
- [x] при PASS → мести в Done + PROOF_LOG + git commit
- [x] при FAIL → записва в QA_FAIL.md

## ✅ ЕТАП 4 – Пълен цикъл (ГОТОВ)

- [x] brain.js --mode=cycle = PM → Dev → QA
- [x] retry логика (макс 3 опита при FAIL)
- [x] един command = To Do → Done

## ⏳ ЕТАП 5 – Мета-фабрика

- [ ] templates/factory/ шаблон
- [ ] фабрика произвежда нови фабрики
- [ ] всяка фабрика има свой brain.js + templates
