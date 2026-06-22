const fs = require('fs');
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
  execSync(`xcopy "${templatePath}" "${target}" /E /I /Y`);
  
  const oldCwd = process.cwd();
  process.chdir(target);
  
  let testOutput = '';
  try {
    execSync('git init');
    execSync('npm install');
    testOutput = execSync('npm test', { encoding: 'utf8' });
    try { 
      execSync(`gh repo create ${name} --public --source=. --remote=origin --push`); 
    } catch(e){ 
      console.log('GitHub repo exists or gh not logged'); 
    }
  } finally {
    process.chdir(oldCwd);
  }
  
  // запиши в PRODUCTS.md
  const productsPath = path.join(__dirname, 'docs', 'PRODUCTS.md');
  fs.appendFileSync(productsPath, `\n| ${name} | ${target} | https://github.com/nfilipov89/${name} | active | ${new Date().toISOString().split('T')[0]} |`);
  console.log(`DONE ${name}`);
  return testOutput;
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
  const lines = ordersContent.split(/\r?\n/);
  let orderIndex = -1;
  let productName = '';
  let templateName = '';
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].match(/-\s*\[\s*\]/)) {
      const match = lines[i].match(/-\s*\[\s*\]\s*Създай продукт\s+([a-zA-Z0-9-_]+)(?:\s+--template=([a-zA-Z0-9-_]+))?/);
      if (match) {
        productName = match[1];
        templateName = match[2] || '';
        orderIndex = i;
        break;
      }
    }
  }

  if (orderIndex === -1) {
    console.log('No pending orders found.');
    process.exit(0);
  }

  console.log(`Found order for product: ${productName}${templateName ? ` with template: ${templateName}` : ''}`);
  try {
    const testOutput = createProduct(productName, templateName);
    
    // Смени "- [ ]" на "- [x]" в ORDERS.md
    lines[orderIndex] = lines[orderIndex].replace(/-\s*\[\s*\]/, '- [x]');
    fs.writeFileSync(ordersPath, lines.join('\n'));

    // Запиши в docs/PROOF_LOG.md
    const proofPath = path.join(__dirname, 'docs', 'PROOF_LOG.md');
    const today = new Date().toISOString().split('T')[0];
    const proofEntry = `\n\n## [${today}] ЕТАП 1 – Създаден продукт ${productName}\n- Резултат от npm test:\n\`\`\`\n${testOutput.trim()}\n\`\`\`\n`;
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

if (mode === 'vision' || !['create', 'process-orders'].includes(mode)) {
  main().catch(console.error);
}
