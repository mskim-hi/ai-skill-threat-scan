#!/usr/bin/env node
// 사용법:
//   node bin/scan.js <파일|디렉토리|https URL|->  [--json] [--fail-on <low|medium|high|critical>]
//   node bin/scan.js --sample <benign|risky|poisoned>
// 디렉토리는 텍스트 확장자 파일을 각각 따로 검사한다 (파일 간 관계는 보지 않는다).
const fs = require('fs');
const path = require('path');
const { analyze, toRaw } = require('../src/engine');
const samples = require('../src/samples');

const SCAN_EXT = new Set(['.md', '.markdown', '.txt', '.json', '.yaml', '.yml', '.toml', '.js', '.mjs', '.cjs', '.ts', '.py', '.sh', '.bash', '.zsh', '.ps1']);
const SKIP_DIRS = new Set(['.git', 'node_modules', '.venv', 'venv', '__pycache__', 'dist', 'build']);
const MAX_BYTES = 1024 * 1024;
const RANK = { low: 0, medium: 1, high: 2, critical: 3 };

function usage(code) {
  console.error('usage: scan <file|dir|url|-> [--json] [--fail-on low|medium|high|critical]');
  console.error('       scan --sample benign|risky|poisoned');
  process.exit(code);
}

function parseArgs(argv) {
  const opts = { json: false, failOn: null, sample: null, target: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--json') opts.json = true;
    else if (a === '--fail-on') opts.failOn = (argv[++i] || '').toLowerCase();
    else if (a === '--sample') opts.sample = argv[++i];
    else if (a === '-h' || a === '--help') usage(0);
    else if (!opts.target) opts.target = a;
    else usage(2);
  }
  if (opts.failOn && !(opts.failOn in RANK)) usage(2);
  if (!opts.target && !opts.sample) usage(2);
  return opts;
}

function walk(dir, out) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (!SKIP_DIRS.has(ent.name)) walk(p, out);
    } else if (ent.isFile() && SCAN_EXT.has(path.extname(ent.name).toLowerCase())) {
      if (fs.statSync(p).size <= MAX_BYTES) out.push(p);
    }
  }
  return out;
}

async function collect(opts) {
  if (opts.sample) {
    const s = samples.find((x) => x.id === opts.sample);
    if (!s) usage(2);
    return [{ source: `sample:${s.id}`, text: s.text }];
  }
  const t = opts.target;
  if (t === '-') return [{ source: 'stdin', text: fs.readFileSync(0, 'utf8') }];
  if (/^https?:\/\//i.test(t)) {
    const url = toRaw(t);
    if (!url.startsWith('https://')) throw new Error('https URL만 지원합니다');
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
    const text = await res.text();
    if (text.length > MAX_BYTES) throw new Error('1MB를 넘는 파일은 지원하지 않습니다');
    return [{ source: url, text }];
  }
  const st = fs.statSync(t);
  const files = st.isDirectory() ? walk(t, []) : [t];
  return files.map((f) => ({ source: f, text: fs.readFileSync(f, 'utf8') }));
}

const COLOR = { critical: 31, high: 33, medium: 36, low: 32 };
const tty = process.stdout.isTTY;
const paint = (s, level) => (tty ? `\x1b[${COLOR[level]}m${s}\x1b[0m` : s);

function printText(source, r) {
  console.log(`\n${source}`);
  console.log(`  score ${r.score}/100  ${paint(r.severity, r.severity.toLowerCase())}  ` +
    `(rules ${r.breakdown.ruleScore} + diversity ${r.breakdown.diversityBonus})`);
  const active = r.families.filter((f) => f.active).map((f) => f.id);
  console.log(`  families: ${active.length ? active.join(', ') : '-'}`);
  for (const f of r.findings) {
    console.log(`  ${paint(f.level.toUpperCase().padEnd(8), f.level)} ${f.ruleId} [${f.family}] ${f.name} +${f.points}`);
    for (const e of f.evidence) console.log(`           L${e.line}: ${e.match}`);
  }
}

(async () => {
  const opts = parseArgs(process.argv.slice(2));
  let inputs;
  try {
    inputs = await collect(opts);
  } catch (e) {
    console.error(`error: ${e.message}`);
    process.exit(2);
  }

  const results = inputs.map((x) => ({ source: x.source, ...analyze(x.text) }));
  if (opts.json) console.log(JSON.stringify(results.length === 1 ? results[0] : results, null, 2));
  else {
    results.forEach((r) => printText(r.source, r));
    if (results.length > 1) {
      const worst = results.reduce((a, b) => (b.score > a.score ? b : a));
      console.log(`\n${results.length} files, max score ${worst.score} (${worst.source})`);
    }
  }

  if (opts.failOn) {
    const fail = results.some((r) => RANK[r.severity.toLowerCase()] >= RANK[opts.failOn]);
    process.exit(fail ? 1 : 0);
  }
})();
