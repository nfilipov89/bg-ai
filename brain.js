const fs = require('fs');
require('dotenv').config();

// PM MODE
if (process.argv.includes('--mode=pm')) {
  const kanban = fs.readFileSync('docs/KANBAN.md', 'utf8');
  const todoMatch = kanban.match(/## To Do\n([\s\S]*?)\n##/);
  const firstTask = todoMatch? todoMatch[1].split('\n').find(l => l.trim().startsWith('-')) : null;

  if (!firstTask) {
    console.log('Няма задачи в To Do');
    process.exit(0);
  }

  const task = firstTask.replace('-', '').trim();
  console.log('PM: Взимам задача:', task);

  const https = require('https');
  const data = JSON.stringify({
    model: 'deepseek-chat',
    messages: [{role:'user', content: `Ти си CTO. Задача: "${task}". Дай точен технически план в 5 стъпки за Node.js проект. Всяка стъпка на нов ред с номер.`}],
    temperature: 0.2
  });

  const options = {
    hostname: 'api.deepseek.com',
    path: '/v1/chat/completions',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + process.env.DEEPSEEK_API_KEY,
      'Content-Length': Buffer.byteLength(data)
    }
  };

  const req = https.request(options, (res) => {
    let body = '';
    res.on('data', (chunk) => body += chunk);
    res.on('end', () => {
      try {
        const response = JSON.parse(body);
        if (response.error) {
          console.log('ГРЕШКА: DeepSeek API не работи. Провери баланса или ключа.');
          process.exit(1);
        }
        const planText = response.choices?.[0]?.message?.content || '';
        if (!planText) {
          console.log('ГРЕШКА: Празен отговор от DeepSeek.');
          process.exit(1);
        }
        fs.writeFileSync('docs/PLAN.md', `# План за: ${task}\n\n${planText}`);
        
        // Премести в Doing
        const updated = kanban.replace(firstTask, '').replace('## Doing', `## Doing\n- ${task}`);
        fs.writeFileSync('docs/KANBAN.md', updated);
        console.log('PM: План записан в PLAN.md');
        process.exit(0);
      } catch (e) {
        console.error('Failed to parse DeepSeek response:', e.message);
        console.error('Response body:', body);
        process.exit(1);
      }
    });
  });
  req.on('error', (e) => {
    console.error('ГРЕШКА: Мрежов проблем с DeepSeek API:', e.message);
    process.exit(1);
  });
  req.write(data);
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
      model: 'deepseek-r1-0528-qwen3-8b',
      messages: [
        { role: 'system', content: 'Ти си AI мозък на проект bg-ai. Отговаряй кратко и ясно.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7
    })
  });
  const data = await res.json();
  return data.choices[0].message.content;
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

if (mode === 'vision' || (!['create', 'process-orders', 'pm'].includes(mode))) {
  main().catch(console.error);
}
