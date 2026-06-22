const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

const args = Object.fromEntries(process.argv.slice(2).map(a=>a.split('=').map((v,i)=>i===0?v.replace('--',''):v)));
const mode = args.mode || 'vision';

if(mode==='create'){
  const name = args.name;
  const target = path.join(__dirname, '..', name);
  fs.mkdirSync(target, {recursive:true});
  execSync(`xcopy "${__dirname}\\template\\node-express" "${target}" /E /I /Y`);
  console.log(`CREATED ${target}`);
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

main().catch(console.error);
