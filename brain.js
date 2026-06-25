const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
require('dotenv').config();

// ============================================================
// ПОМОЩНИ ФУНКЦИИ (споделени между всички режими)
// ============================================================

const LLM_URL = process.env.LLM_BASE_URL || 'http://127.0.0.1:1234/v1';
const LLM_MODEL = process.env.LLM_MODEL || 'phi-4-mini-instruct';
const LLM_DEV_MODEL = process.env.LLM_DEV_MODEL || LLM_MODEL;

/**
 * Изпраща prompt към LM Studio и връща отговора.
 */
function askLMStudioSync(systemPrompt, userPrompt, model, temperature) {
  return new Promise((resolve, reject) => {
    const http = require('http');
    const url = new URL(LLM_URL);
    const payload = JSON.stringify({
      model: model || LLM_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: temperature || 0.2
    });

    const options = {
      hostname: url.hostname,
      port: url.port || 1234,
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const data = JSON.parse(body);
          if (data.error) {
            return reject(new Error('LM Studio грешка: ' + JSON.stringify(data.error)));
          }
          const reasoning = data.choices[0].message.reasoning_content || '';
          const content = data.choices[0].message.content || '';
          const finalText = content.trim() ? content : reasoning;
          if (!finalText) {
            return reject(new Error('LM Studio върна празен отговор.'));
          }
          resolve(finalText);
        } catch (e) {
          reject(new Error('Грешка при парсване на отговор: ' + e.message));
        }
      });
    });

    req.on('error', (e) => {
      reject(new Error('ГРЕШКА: LM Studio не работи на ' + LLM_URL + '. Провери дали е пуснато.'));
    });

    req.setTimeout(300000, () => {
      req.destroy();
      reject(new Error('Timeout: LM Studio не отговори в рамките на 5 минути.'));
    });

    req.write(payload);
    req.end();
  });
}

/**
 * Чете KANBAN.md и извлича задачи от дадена секция.
 */
function readKanban() {
  const kanbanPath = path.join(__dirname, 'docs', 'KANBAN.md');
  const content = fs.readFileSync(kanbanPath, 'utf8');

  const getSection = (section) => {
    // Търси секцията и взима съдържанието до следващата ## или край на файл
    const regex = new RegExp('## ' + section + '\\n([\\s\\S]*?)(?=\\n##|$)');
    const match = content.match(regex);
    if (!match) return [];
    return match[1]
      .split('\n')
      .filter(l => l.trim().startsWith('-'))
      .map(l => l.trim().replace(/^-\s*/, ''));
  };

  return {
    raw: content,
    todo: getSection('To Do'),
    doing: getSection('Doing'),
    done: getSection('Done')
  };
}

/**
 * Мести задача между секции в KANBAN.md
 */
function moveTask(task, from, to) {
  const kanbanPath = path.join(__dirname, 'docs', 'KANBAN.md');
  let content = fs.readFileSync(kanbanPath, 'utf8');

  // Премахни от source секцията (търси реда с тирето)
  const lines = content.split('\n');
  const newLines = [];
  let removed = false;
  for (const line of lines) {
    if (!removed && line.trim() === '- ' + task) {
      removed = true;
      continue;
    }
    newLines.push(line);
  }
  content = newLines.join('\n');

  // Добави в target секцията
  content = content.replace('## ' + to, '## ' + to + '\n- ' + task);

  fs.writeFileSync(kanbanPath, content);
}

/**
 * Записва в PROOF_LOG.md
 */
function logProof(stage, message) {
  const proofPath = path.join(__dirname, 'docs', 'PROOF_LOG.md');
  const today = new Date().toISOString().split('T')[0];
  const entry = '\n\n## [' + today + '] ' + stage + '\n' + message + '\n';
  fs.appendFileSync(proofPath, entry);
}

/**
 * Извлича code блокове от LM Studio отговор.
 * Връща масив от { file, code }.
 */
function parseCodeBlocks(answer) {
  const blocks = [];
  const codeBlockRegex = /```(?:js|javascript)?\s*\n([\s\S]*?)```/g;
  let match;

  while ((match = codeBlockRegex.exec(answer)) !== null) {
    const code = match[1].trim();
    // Търси // FILE: коментар в първия ред
    const fileMatch = code.match(/^\/\/\s*FILE:\s*(.+)/m);
    const filePath = fileMatch ? fileMatch[1].trim() : null;
    // Премахни FILE коментара от кода
    const cleanCode = fileMatch ? code.replace(/^\/\/\s*FILE:\s*.+\n?/m, '').trim() : code;
    blocks.push({ file: filePath, code: cleanCode });
  }

  return blocks;
}

/**
 * Git add, commit, push
 */
function gitCommitPush(message, files) {
  try {
    if (files) {
      execSync('git add ' + files, { cwd: __dirname });
    } else {
      execSync('git add -A', { cwd: __dirname });
    }
    execSync('git commit -m "' + message + '"', { cwd: __dirname });
    execSync('git push', { cwd: __dirname });
    console.log('✅ Git commit + push направен!');
  } catch (e) {
    console.log('⚠️ Git commit/push грешка:', e.message);
  }
}

// ============================================================
// ПАРСВАНЕ НА АРГУМЕНТИ
// ============================================================

const args = Object.fromEntries(
  process.argv.slice(2).map(a => a.split('=').map((v, i) => i === 0 ? v.replace('--', '') : v))
);
const mode = args.mode || 'vision';

// ============================================================
// MODE: PM – Проектен Мениджър
// ============================================================

async function runPM() {
  console.log('🎯 PM Mode стартиран...');

  const kanban = readKanban();
  if (kanban.todo.length === 0) {
    console.log('📋 Няма задачи в To Do');
    return { task: null };
  }

  const task = kanban.todo[0];
  console.log('PM: Взимам задача:', task);

  const systemPrompt =
    'Ти си CTO на софтуерна фабрика bg-ai. Днес е 2026. ' +
    'Давай точен технически план в 5 стъпки за Node.js проект. ' +
    'Форматирай всяка стъпка с номер и описание. ' +
    'Бъди конкретен – кажи точно кои файлове да се създадат/променят. ' +
    'Не обяснявай теория, давай actionable стъпки.';

  const userPrompt = 'Задача: "' + task + '". Дай точен технически план в 5 стъпки.';

  console.log('PM: Чакам LM Studio...');
  const plan = await askLMStudioSync(systemPrompt, userPrompt, LLM_MODEL, 0.2);

  // Запиши плана
  fs.writeFileSync(
    path.join(__dirname, 'docs', 'PLAN.md'),
    '# План за: ' + task + '\n\n' + plan
  );

  // Премести в Doing
  moveTask(task, 'To Do', 'Doing');

  console.log('PM: План записан в PLAN.md');
  gitCommitPush('pm: plan for ' + task, 'docs/PLAN.md docs/KANBAN.md');

  return { task };
}

// ============================================================
// MODE: DEV – Програмист (записва файлове)
// ============================================================

async function runDev() {
  console.log('💻 Dev Mode стартиран...');

  const planPath = path.join(__dirname, 'docs', 'PLAN.md');
  if (!fs.existsSync(planPath)) {
    console.log('ГРЕШКА: PLAN.md не съществува. Пусни първо --mode=pm');
    process.exit(1);
  }
  const plan = fs.readFileSync(planPath, 'utf8');

  // Зареди текущия src/index.js
  const targetFile = args.target || 'src/index.js';
  const targetPath = path.join(__dirname, targetFile);
  let existingCode = '';
  if (fs.existsSync(targetPath)) {
    existingCode = fs.readFileSync(targetPath, 'utf8');
  }

  // PATCH подход: карай модела да генерира САМО новия код
  const systemPrompt =
    'Ти си Senior Developer. Трябва да добавиш НОВ код към съществуващ Express.js файл.\n' +
    'ПРАВИЛА:\n' +
    '1. Напиши САМО новия код (endpoint, middleware и т.н.) - НЕ целия файл.\n' +
    '2. Кодът трябва да използва вече дефинираните променливи: app, express, fs, path.\n' +
    '3. Увий кода в ```js блок.\n' +
    '4. Никакви import/require - те вече съществуват.\n' +
    '5. Никакви обяснения - САМО код.\n' +
    '6. Никакъв app.listen или module.exports.';

  const userPrompt =
    'ПЛАН:\n' + plan + '\n\n' +
    'СЪЩЕСТВУВАЩИ ENDPOINTS в файла:\n' +
    'GET / -> { status: "ok" }\n' +
    'GET /health -> { uptime: process.uptime() }\n' +
    'POST /ai/echo -> { echo: req.body.message }\n' +
    'POST /ai/chat -> AI chat\n\n' +
    'Напиши САМО новия endpoint код. Нищо друго.';

  console.log('Dev: Чакам LM Studio...');
  const answer = await askLMStudioSync(systemPrompt, userPrompt, LLM_DEV_MODEL, 0.2);

  // Парсни code блокове
  const blocks = parseCodeBlocks(answer);

  let newCode = '';
  if (blocks.length > 0) {
    newCode = blocks[0].code;
  } else {
    // Опитай да извлечеш код директно (без ``` маркери)
    const lines = answer.split('\n').filter(l => 
      l.trim().startsWith('app.') || 
      l.trim().startsWith('router.') ||
      l.trim().startsWith('//') || 
      l.trim().startsWith('{') || 
      l.trim().startsWith('}') ||
      l.trim().startsWith('res.') ||
      l.trim().startsWith('const ') ||
      l.trim().startsWith('});') ||
      l.trim() === ''
    );
    newCode = lines.join('\n').trim();
  }

  // ПОЧИСТИ кода: премахни всичко, което вече съществува
  // 1. Премахни redeclarations и boilerplate
  newCode = newCode
    .split('\n')
    .filter(l => {
      const t = l.trim();
      // Премахни redeclarations
      if (t.startsWith('const app =')) return false;
      if (t.startsWith('const express')) return false;
      if (t.startsWith('const router')) return false;
      if (t.startsWith('const {')) return false;
      if (t.startsWith('module.exports')) return false;
      if (t.match(/^require\s*\(/)) return false;
      if (t.match(/^const .* = require/)) return false;
      // Премахни app.listen
      if (t.startsWith('app.listen(')) return false;
      // Премахни bodyParser (не е дефиниран)
      if (t.includes('bodyParser')) return false;
      return true;
    })
    .join('\n')
    .replace(/router\./g, 'app.')
    .trim();

  // 2. Премахни endpoint блокове, които ВЕЧЕ съществуват в текущия файл
  if (existingCode) {
    // Намери всички съществуващи route paths
    const existingRoutes = [];
    const routeRegex = /app\.(get|post|put|delete)\s*\(\s*['"]([^'"]+)['"]/g;
    let routeMatch;
    while ((routeMatch = routeRegex.exec(existingCode)) !== null) {
      existingRoutes.push(routeMatch[2]); // напр. '/', '/health', '/status'
    }

    // Премахни дупликатни endpoint блокове от новия код
    for (const route of existingRoutes) {
      // Премахни целия блок app.get('/route', ...) ... });
      const escapedRoute = route.replace(/\//g, '\\/');
      const blockRegex = new RegExp(
        '(?:\\/\\/[^\\n]*\\n)*\\s*app\\.(?:get|post|put|delete)\\s*\\(\\s*[\'"]' + escapedRoute + '[\'"][\\s\\S]*?\\}\\);',
        'g'
      );
      newCode = newCode.replace(blockRegex, '');
    }
    newCode = newCode.trim();
  }

  // 3. Премахни app.listen блокове (multi-line)
  newCode = newCode.replace(/app\.listen\s*\([^)]*\)\s*(?:;|\s*(?:=>|{)[\s\S]*?\}\)?;?)/g, '').trim();

  // Валидация: трябва да има поне един HTTP method или app.use
  const hasEndpoint = newCode.includes('.get(') || newCode.includes('.post(') || 
                      newCode.includes('.put(') || newCode.includes('.delete(') ||
                      newCode.includes('.use(');

  if (!newCode || !hasEndpoint) {
    console.log('⚠️ Dev: Не мога да извлека валиден endpoint код.');
    console.log('Суров отговор:', answer.substring(0, 500));
    fs.writeFileSync(path.join(__dirname, 'docs', 'DEV_RAW.md'),
      '# Dev суров отговор\n\n' + answer);
    return { success: false, error: 'Няма валиден код в отговора' };
  }

  console.log('Dev: Извлечен нов код:');
  console.log(newCode);

  // ВМЪКНИ новия код преди "if (require.main === module)"
  // или преди "module.exports"
  let updatedCode;
  if (existingCode.includes('if (require.main === module)')) {
    updatedCode = existingCode.replace(
      'if (require.main === module)',
      newCode + '\n\nif (require.main === module)'
    );
  } else if (existingCode.includes('module.exports')) {
    updatedCode = existingCode.replace(
      'module.exports',
      newCode + '\n\nmodule.exports'
    );
  } else {
    updatedCode = existingCode + '\n\n' + newCode;
  }

  // Backup
  if (fs.existsSync(targetPath)) {
    fs.copyFileSync(targetPath, targetPath + '.backup');
  }

  fs.writeFileSync(targetPath, updatedCode);
  console.log('Dev: Записан файл → ' + targetPath);

  // Пусни тестовете
  console.log('Dev: Пускам npm test...');
  try {
    const testResult = execSync('npm test', { cwd: __dirname, encoding: 'utf8', timeout: 30000 });
    console.log('✅ npm test PASSED!');
    console.log(testResult);

    // Изтрий backup
    if (fs.existsSync(targetPath + '.backup')) {
      fs.unlinkSync(targetPath + '.backup');
    }

    gitCommitPush('dev: implement ' + path.basename(targetPath), '-A');
    return { success: true, files: [targetPath], testOutput: testResult };
  } catch (e) {
    console.log('❌ npm test FAILED!');
    const errorOutput = (e.stdout || '') + (e.stderr || '') || e.message;
    console.log(errorOutput.substring(0, 500));

    // Възстанови от backup
    if (fs.existsSync(targetPath + '.backup')) {
      fs.copyFileSync(targetPath + '.backup', targetPath);
      fs.unlinkSync(targetPath + '.backup');
      console.log('🔄 Файлът е ВЪЗСТАНОВЕН от backup.');
    }

    fs.writeFileSync(path.join(__dirname, 'docs', 'DEV_ERROR.md'),
      '# Dev грешка\n\n## Тест провален\n```\n' + errorOutput.substring(0, 2000) + '\n```\n' +
      '\n## Генериран код\n```js\n' + newCode + '\n```\n');

    return { success: false, error: errorOutput, files: [targetPath] };
  }
}

// ============================================================
// MODE: QA – Тестер
// ============================================================

async function runQA() {
  console.log('🧪 QA Mode стартиран...');

  const kanban = readKanban();
  if (kanban.doing.length === 0) {
    console.log('📋 Няма задачи в Doing за тестване');
    return { passed: false, reason: 'no-tasks' };
  }

  const task = kanban.doing[0];
  console.log('QA: Тествам задача:', task);

  console.log('QA: Пускам npm test...');
  try {
    const testOutput = execSync('npm test', { cwd: __dirname, encoding: 'utf8', timeout: 30000 });
    console.log('✅ QA: Тестовете МИНАХА!');
    console.log(testOutput);

    // Премести в Done
    moveTask(task, 'Doing', 'Done');

    // Запиши в PROOF_LOG
    logProof('ЕТАП QA – ' + task,
      '- Задача: ' + task + '\n- Резултат: ✅ PASSED\n- npm test output:\n```\n' + testOutput.trim() + '\n```'
    );

    gitCommitPush('qa: passed ' + task, 'docs/');

    console.log('✅ QA PASSED – задачата е в Done!');
    return { passed: true, task: task, testOutput: testOutput };
  } catch (e) {
    const errorOutput = (e.stdout || '') + (e.stderr || '') || e.message;
    console.log('❌ QA FAILED!');
    console.log(errorOutput.substring(0, 500));

    fs.writeFileSync(path.join(__dirname, 'docs', 'QA_FAIL.md'),
      '# QA Провал\n\n## Задача: ' + task + '\n\n## Грешка:\n```\n' + errorOutput.substring(0, 2000) + '\n```\n'
    );

    console.log('❌ QA FAILED – виж docs/QA_FAIL.md');
    return { passed: false, task: task, error: errorOutput };
  }
}

// ============================================================
// MODE: CYCLE – Пълен цикъл PM → Dev → QA
// ============================================================

async function runCycle() {
  console.log('🔄 CYCLE Mode стартиран – PM → Dev → QA');
  console.log('═══════════════════════════════════════');

  // СТЪПКА 1: PM
  console.log('\n📋 СТЪПКА 1/3: PM планира задача...');
  const pmResult = await runPM();
  if (!pmResult.task) {
    console.log('🏁 Няма задачи. Цикълът приключи.');
    return;
  }

  const MAX_RETRIES = 3;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    console.log('\n💻 СТЪПКА 2/3: Dev имплементира (опит ' + attempt + '/' + MAX_RETRIES + ')...');

    const devResult = await runDev();

    if (devResult.success) {
      console.log('\n🧪 СТЪПКА 3/3: QA тества...');
      const qaResult = await runQA();

      if (qaResult.passed) {
        console.log('\n═══════════════════════════════════════');
        console.log('🎉 ЦИКЪЛ ЗАВЪРШЕН: "' + pmResult.task + '" е в Done!');
        console.log('═══════════════════════════════════════');

        logProof('ПЪЛЕН ЦИКЪЛ – ' + pmResult.task,
          '- Задача: ' + pmResult.task + '\n- Опити: ' + attempt + '\n- Резултат: ✅ ЗАВЪРШЕН'
        );
        return;
      }
    } else {
      console.log('⚠️ Dev не успя да генерира валиден код.');
    }

    if (attempt < MAX_RETRIES) {
      console.log('\n⚠️ Опит ' + attempt + ' провален. Опитвам отново...');
    }
  }

  console.log('\n═══════════════════════════════════════');
  console.log('❌ ЦИКЪЛ ПРОВАЛЕН след ' + MAX_RETRIES + ' опита: "' + pmResult.task + '"');
  console.log('Виж docs/QA_FAIL.md и docs/DEV_ERROR.md за детайли.');
  console.log('═══════════════════════════════════════');
}

// ============================================================
// MODE: CREATE – Създаване на нов продукт
// ============================================================

function createProduct(name, template) {
  const target = path.join(__dirname, '..', name);
  console.log('Creating ' + name + '...');
  fs.mkdirSync(target, { recursive: true });
  const templateName = template || 'site-basic';
  const templatePath = path.join(__dirname, 'templates', templateName);
  execSync('xcopy "' + templatePath + '" "' + target + '" /E /I /Y', { stdio: 'inherit' });

  // Генериране на vercel.json, ако не съществува в шаблона
  const targetVercelJsonPath = path.join(target, 'vercel.json');
  if (!fs.existsSync(targetVercelJsonPath)) {
    const vercelJson = {
      rewrites: [{ source: "/(.*)", destination: "/public/$1" }]
    };
    fs.writeFileSync(targetVercelJsonPath, JSON.stringify(vercelJson, null, 2));
  }

  // Добавяне на .vercel към .gitignore
  const gitignorePath = path.join(target, '.gitignore');
  if (fs.existsSync(gitignorePath)) {
    let gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
    if (!gitignoreContent.includes('.vercel')) {
      fs.appendFileSync(gitignorePath, '\n.vercel\n.vercel/\n');
    }
  } else {
    fs.writeFileSync(gitignorePath, 'node_modules/\n.env\n.vercel\n.vercel/\n');
  }

  const oldCwd = process.cwd();
  process.chdir(target);

  let testOutput = '';
  let vercelUrl = '';
  try {
    execSync('git init', { stdio: 'inherit' });
    execSync('git add .', { stdio: 'inherit' });
    try {
      execSync('git commit -m "feat: initial commit from factory"', { stdio: 'inherit' });
    } catch (e) { /* може да няма промени */ }

    execSync('npm install', { stdio: 'inherit' });
    testOutput = execSync('npm test', { encoding: 'utf8' });

    try {
      execSync('gh repo create ' + name + ' --public --source=. --remote=origin --push', { stdio: 'inherit' });
    } catch (e) {
      console.log('GitHub repo exists or gh not logged, trying to push to existing');
      try {
        execSync('git push -u origin master', { stdio: 'inherit' });
      } catch (pe) {
        console.log('Push to existing failed:', pe.message);
      }
    }

    console.log('Linking project to Vercel...');
    execSync('npx vercel link --yes', { stdio: 'inherit' });

    try {
      console.log('Connecting Vercel project to Git...');
      execSync('npx vercel git connect https://github.com/nfilipov89/' + name + ' --yes', { stdio: 'inherit' });
    } catch (ge) {
      console.log('Failed to connect Vercel project to Git:', ge.message);
    }

    console.log('Deploying to Vercel production...');
    const deployOut = execSync('npx vercel deploy --prod --yes', { encoding: 'utf8' });
    console.log(deployOut);

    const vercelUrlMatch = deployOut.match(/https:\/\/[a-zA-Z0-9-_]+\.vercel\.app/);
    vercelUrl = vercelUrlMatch ? vercelUrlMatch[0] : '';
  } finally {
    process.chdir(oldCwd);
  }

  // запиши в PRODUCTS.md
  const productsPath = path.join(__dirname, 'docs', 'PRODUCTS.md');
  const today = new Date().toISOString().split('T')[0];
  fs.appendFileSync(productsPath,
    '\n| ' + name + ' | ' + target + ' | https://github.com/nfilipov89/' + name + ' | ' + (vercelUrl || 'N/A') + ' | active | ' + today + ' |');
  console.log('DONE ' + name);
  return { testOutput: testOutput, vercelUrl: vercelUrl };
}

// ============================================================
// MODE: PROCESS-ORDERS
// ============================================================

function processOrders() {
  const ordersPath = path.join(__dirname, 'docs', 'ORDERS.md');
  if (!fs.existsSync(ordersPath)) {
    console.log('ORDERS.md does not exist');
    process.exit(1);
  }
  const ordersContent = fs.readFileSync(ordersPath, 'utf8');

  const nameMatch = ordersContent.match(/Име:\s*([a-zA-Z0-9-_]+)/);
  const templateMatch = ordersContent.match(/Темплейт:\s*([a-zA-Z0-9-_]+)/);
  const urlLineMatch = ordersContent.match(/ти получаваш линк\s+(https:[^\r\n]*)/);

  if (!nameMatch || !nameMatch[1]) {
    console.log('No pending orders.');
    process.exit(0);
  }

  const productName = nameMatch[1];
  const templateName = templateMatch ? templateMatch[1] : '';
  const currentUrl = urlLineMatch ? urlLineMatch[1].trim() : '';

  if (currentUrl && !currentUrl.includes('    ') && currentUrl !== 'https:.vercel.app') {
    console.log('Order for ' + productName + ' already processed (Vercel URL: ' + currentUrl + ').');
    process.exit(0);
  }

  console.log('Found order for product: ' + productName);
  try {
    const result = createProduct(productName, templateName);

    let updatedContent = ordersContent.replace(
      /ти получаваш линк\s+https:[^\r\n]*/,
      'ти получаваш линк ' + (result.vercelUrl || 'https://' + productName + '.vercel.app')
    );
    fs.writeFileSync(ordersPath, updatedContent, 'utf8');

    logProof('ЕТАП 1 – Създаден продукт ' + productName,
      '- Vercel URL: ' + result.vercelUrl + '\n- Резултат от npm test:\n```\n' + result.testOutput.trim() + '\n```'
    );

    execSync('git add docs/');
    execSync('git commit -m "auto: processed order ' + productName + '"');
    console.log('Successfully processed order for ' + productName);
  } catch (err) {
    console.error('Failed to process order for ' + productName + ':', err.message);
    process.exit(1);
  }
}

// ============================================================
// MODE: VISION – Чете визията (по подразбиране)
// ============================================================

async function runVision() {
  const visionPath = path.join(__dirname, 'docs', 'VISION.md');
  const vision = fs.readFileSync(visionPath, 'utf8');

  console.log('Изпращам към LM Studio...');
  const answer = await askLMStudioSync(
    'Ти си AI мозък на проект bg-ai. Отговаряй кратко и ясно.',
    'Прочети docs/VISION.md и ми кажи каква е първата задача:\n\n' + vision,
    LLM_MODEL,
    0.7
  );

  console.log('\n=== ОТГОВОР ОТ AI ===\n');
  console.log(answer);
}

// ============================================================
// МАРШРУТИЗАЦИЯ НА РЕЖИМИ
// ============================================================

async function run() {
  switch (mode) {
    case 'pm':
      await runPM();
      break;
    case 'dev':
      await runDev();
      break;
    case 'qa':
      await runQA();
      break;
    case 'cycle':
      await runCycle();
      break;
    case 'create':
      createProduct(args.name, args.template);
      break;
    case 'process-orders':
      processOrders();
      break;
    case 'vision':
    default:
      await runVision();
      break;
  }
}

run().catch(err => {
  console.error('❌ ГРЕШКА:', err.message);
  process.exit(1);
});
