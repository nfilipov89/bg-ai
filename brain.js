const fs = require('fs');
require('dotenv').config();

// PM MODE
if (process.argv.includes('--mode=pm')) {
  const kanban = fs.readFileSync('docs/KANBAN.md', 'utf8');
  const todoMatch = kanban.match(/## To Do\n([\s\S]*?)\n##/);
  const firstTask = todoMatch ? todoMatch[1].split('\n').find(l => l.trim().startsWith('-')) : null;

  if (!firstTask) {
    console.log('Няма задачи в To Do');
    process.exit(0);
  }

  const task = firstTask.replace('-', '').trim();
  console.log('PM: Взимам задача:', task);

  let stripeDocs = '';
  if (fs.existsSync('docs/STRIPE_DOCS.md')) {
    stripeDocs = '\n\nКонтекст (документация за Stripe):\n' + fs.readFileSync('docs/STRIPE_DOCS.md', 'utf8');
  }

  const http = require('http');
  const data = JSON.stringify({
    model: process.env.LLM_MODEL,
    messages: [
      {role: 'system', content: 'Ти си CTO. Днес е 2026, ползвай само Stripe PaymentIntents API, charges API е deprecated от 2019.'},
      {role: 'user', content: `Задача: "${task}". Дай точен технически план в 5 стъпки за Node.js проект.${stripeDocs}`}
    ],
    temperature: 0.2
  });

  const options = {
    hostname: '127.0.0.1',
    port: 1234,
    path: '/v1/chat/completions',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data)
    }
  };

  const req = http.request(options, (res) => {
    let body = '';
    res.on('data', (chunk) => body += chunk);
    res.on('end', () => {
      try {
        const data = JSON.parse(body);
        if (data.error) {
          console.log('ГРЕШКА: Локалното API не работи. Провери дали LM Studio е пуснато.');
          process.exit(1);
        }
        const reasoning = data.choices[0].message.reasoning_content || '';
        const content = data.choices[0].message.content || '';
        const finalText = content.trim() ? content : reasoning;

        if (!finalText) {
          console.log('ГРЕШКА: Локалното API не работи. Провери дали LM Studio е пуснато.');
          process.exit(1);
        }
        fs.writeFileSync('docs/PLAN.md', `# План за: ${task}\n\n${finalText}`);
        
        // Премести в Doing
        const updated = kanban.replace(firstTask, '').replace('## Doing', `## Doing\n- ${task}`);
        fs.writeFileSync('docs/KANBAN.md', updated);
        console.log('PM: План записан в PLAN.md');
        process.exit(0);
      } catch (e) {
        console.log('ГРЕШКА: Локалното API не работи. Провери дали LM Studio е пуснато.');
        process.exit(1);
      }
    });
  });

  req.on('error', (e) => {
    console.log('ГРЕШКА: Локалното API не работи. Провери дали LM Studio е пуснато.');
    process.exit(1);
  });

  // Set timeout of 5 minutes
  req.setTimeout(300000, () => {
    req.destroy();
  });

  req.write(data);
  console.log('PM: Чакам LM Studio...');
  req.end();
}
const { execSync } = require('child_process');
const path = require('path');

const args = Object.fromEntries(process.argv.slice(2).map(a=>a.split('=').map((v,i)=>i===0?v.replace('--',''):v)));
const mode = args.mode || 'vision';

function createProduct(name, template) {
  const target = path.join(__dirname, '..', name);
  console.log(`Creating ${name}...`);
  fs.mkdirSync(target, {recursive:true});
  const templateName = template || 'site-basic';
  const templatePath = path.join(__dirname, 'templates', templateName);
  execSync(`xcopy "${templatePath}" "${target}" /E /I /Y`, { stdio: 'inherit' });
  
  // Определяне на главния файл (entrypoint) за vercel.json
  const packageJsonPath = path.join(target, 'package.json');
  let entryPoint = 'server.js';
  if (fs.existsSync(packageJsonPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      if (pkg.main) {
        entryPoint = pkg.main;
      }
    } catch (e) {
      console.error('Failed to parse package.json main field:', e.message);
    }
  }
  
  // Генериране на vercel.json, ако не съществува в шаблона
  const targetVercelJsonPath = path.join(target, 'vercel.json');
  if (!fs.existsSync(targetVercelJsonPath)) {
    const vercelJson = {
      rewrites: [
        {
          source: "/(.*)",
          destination: "/public/$1"
        }
      ]
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
    } catch(e) {
      // commit might fail if no changes or git not configured
    }

    execSync('npm install', { stdio: 'inherit' });
    testOutput = execSync('npm test', { encoding: 'utf8' });
    
    try { 
      execSync(`gh repo create ${name} --public --source=. --remote=origin --push`, { stdio: 'inherit' }); 
    } catch(e){ 
      console.log('GitHub repo exists or gh not logged, trying to push to existing');
      try {
        execSync('git push -u origin master', { stdio: 'inherit' });
      } catch(pe) {
        console.log('Push to existing failed:', pe.message);
      }
    }

    console.log('Linking project to Vercel...');
    execSync('npx vercel link --yes', { stdio: 'inherit' });

    try {
      console.log('Connecting Vercel project to Git...');
      execSync(`npx vercel git connect https://github.com/nfilipov89/${name} --yes`, { stdio: 'inherit' });
    } catch(ge) {
      console.log('Failed to connect Vercel project to Git (GitHub repo may not exist):', ge.message);
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
  fs.appendFileSync(productsPath, `\n| ${name} | ${target} | https://github.com/nfilipov89/${name} | ${vercelUrl || 'N/A'} | active | ${new Date().toISOString().split('T')[0]} |`);
  console.log(`DONE ${name}`);
  return { testOutput, vercelUrl };
}

if(mode==='create'){
  const name = args.name;
  const template = args.template;
  createProduct(name, template);
  process.exit(0);
}

if(mode==='process-orders'){
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
    console.log('No pending orders (name is empty).');
    process.exit(0);
  }

  const productName = nameMatch[1];
  const templateName = templateMatch ? templateMatch[1] : '';
  const currentUrl = urlLineMatch ? urlLineMatch[1].trim() : '';

  // Проверяваме дали поръчката е вече обработена:
  if (currentUrl && !currentUrl.includes('    ') && currentUrl !== 'https:.vercel.app') {
    console.log(`Order for ${productName} already processed (Vercel URL: ${currentUrl}).`);
    process.exit(0);
  }

  console.log(`Found order for product: ${productName}${templateName ? ` with template: ${templateName}` : ''}`);
  try {
    const { testOutput, vercelUrl } = createProduct(productName, templateName);
    
    // Обнови ORDERS.md с новия Vercel URL
    let updatedContent = ordersContent.replace(
      /ти получаваш линк\s+https:[^\r\n]*/,
      `ти получаваш линк ${vercelUrl || 'https://' + productName + '.vercel.app'}`
    );
    fs.writeFileSync(ordersPath, updatedContent, 'utf8');

    // Запиши в docs/PROOF_LOG.md
    const proofPath = path.join(__dirname, 'docs', 'PROOF_LOG.md');
    const today = new Date().toISOString().split('T')[0];
    const proofEntry = `\n\n## [${today}] ЕТАП 1 – Създаден продукт ${productName}\n- Vercel URL: ${vercelUrl}\n- Резултат от npm test:\n\`\`\`\n${testOutput.trim()}\n\`\`\`\n`;
    fs.appendFileSync(proofPath, proofEntry);

    // git add docs/ && git commit
    execSync('git add docs/');
    execSync(`git commit -m "auto: processed order ${productName}"`);
    console.log(`Successfully processed order for ${productName}`);
  } catch (err) {
    console.error(`Failed to process order for ${productName}:`, err.message);
    process.exit(1);
  }
  process.exit(0);
}

async function askLMStudio(prompt) {
  const res = await fetch('http://127.0.0.1:1234/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: process.env.LLM_MODEL || 'phi-4-mini-instruct',
      messages: [
        { role: 'system', content: 'Ти си AI мозък на проект bg-ai. Отговаряй кратко и ясно.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7
    })
  });
  const data = await res.json();
  const reasoning = data.choices[0].message.reasoning_content || '';
  const content = data.choices[0].message.content || '';
  return content.trim() ? content : reasoning;
}

async function main() {
  const visionPath = path.join(__dirname, 'docs', 'VISION.md');
  const vision = fs.readFileSync(visionPath, 'utf8');

  const prompt = `Прочети docs/VISION.md и ми кажи каква е първата задача:\n\n${vision}`;

  console.log('Изпращам към LM Studio...');
  const answer = await askLMStudio(prompt);

  console.log('\n=== ОТГОВОР ОТ DEEPSEEK ===\n');
  console.log(answer);
}

async function runDev() {
  const planPath = path.join(__dirname, 'docs', 'PLAN.md');
  if (!fs.existsSync(planPath)) {
    console.log('ГРЕШКА: PLAN.md не съществува.');
    process.exit(1);
  }
  const plan = fs.readFileSync(planPath, 'utf8');

  let stripeDocs = '';
  const stripeDocsPath = path.join(__dirname, 'docs', 'STRIPE_DOCS.md');
  if (fs.existsSync(stripeDocsPath)) {
    stripeDocs = '\n\nКонтекст (документация за Stripe):\n' + fs.readFileSync(stripeDocsPath, 'utf8');
  }

  const prompt = `Прочети плана от docs/PLAN.md и го имплементирай:\n\n${plan}${stripeDocs}`;

  console.log('Изпращам към LM Studio (Dev режим)...');
  
  const model = process.env.LLM_DEV_MODEL || 'phi-4-mini-instruct';
  
  const res = await fetch('http://127.0.0.1:1234/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: 'system', content: 'Ти си Senior Developer. Днес е 2026. Пиши модерен Node.js код с Stripe PaymentIntents API. Чети плана от PLAN.md и имплементирай точно стъпките.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.2
    })
  });
  
  const data = await res.json();
  const reasoning = data.choices?.[0]?.message?.reasoning_content || '';
  const content = data.choices?.[0]?.message?.content || '';
  const answer = content.trim() ? content : reasoning;

  console.log('\n=== ОТГОВОР ОТ DEV ===\n');
  console.log(answer);
}

if (mode === 'dev') {
  runDev().catch(console.error);
} else if (mode === 'vision' || (!['create', 'process-orders', 'pm'].includes(mode))) {
  main().catch(console.error);
}
