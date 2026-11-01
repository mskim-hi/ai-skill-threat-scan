(function () {
  const { analyze, toRaw, ENGINE_VERSION, samples, taxonomy, rules } = window.SkillScan;
  const $ = (id) => document.getElementById(id);
  const MAX_FETCH_BYTES = 1024 * 1024;
  let last = null;

  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function highlight(line, match) {
    const i = line.indexOf(match);
    if (i < 0 || !match) return esc(line);
    return esc(line.slice(0, i)) + '<mark>' + esc(match) + '</mark>' + esc(line.slice(i + match.length));
  }

  function setStatus(msg) {
    $('status').textContent = msg || '';
  }

  function render(r) {
    $('result').hidden = false;
    $('score').textContent = r.score;
    const sev = $('severity');
    sev.textContent = r.severity;
    sev.className = 'badge ' + r.severity;
    $('breakdown').textContent =
      `규칙 ${r.breakdown.ruleScore}점 + family 다양성 ${r.breakdown.diversityBonus}점 | ` +
      `${r.findings.length}개 규칙 탐지, ${r.stats.lines}줄`;

    $('families').innerHTML = r.families
      .map(
        (f) =>
          `<li class="${f.active ? 'on' : ''}" title="${esc(f.name)}"><b>${f.id}</b>${esc(f.ko)}` +
          `${f.active ? `<em>${f.hits}</em>` : ''}</li>`
      )
      .join('');

    if (r.findings.length === 0) {
      $('findings').innerHTML = '<p class="empty">탐지된 규칙이 없습니다. 정적 규칙이 놓친 위험이 있을 수 있습니다.</p>';
      return;
    }

    $('findings').innerHTML = r.findings
      .map(
        (f) => `
        <article class="finding">
          <header>
            <span class="lv lv-${f.level}">${f.level}</span>
            <strong>${f.ruleId} ${esc(f.name)}</strong>
            <span class="pts">${f.family} | +${f.points}</span>
          </header>
          <p>${esc(f.why)}</p>
          <p class="fix">조치: ${esc(f.fix)}</p>
          <div class="tags">${f.provenance.map((p) => `<span>${esc(p)}</span>`).join('')}</div>
          <ul class="ev">
            ${f.evidence
              .map((e) => `<li><span class="ln">L${e.line}</span>${highlight(e.text, e.match)}</li>`)
              .join('')}
            ${f.hits > f.evidence.length ? `<li class="muted">외 ${f.hits - f.evidence.length}건</li>` : ''}
          </ul>
        </article>`
      )
      .join('');
  }

  function scan() {
    const text = $('src').value;
    if (!text.trim()) {
      setStatus('검사할 내용을 입력하세요');
      return;
    }
    const t0 = performance.now();
    last = analyze(text);
    render(last);
    setStatus(`${(performance.now() - t0).toFixed(1)}ms`);
  }

  async function fetchUrl() {
    const raw = toRaw($('url').value);
    if (!/^https:\/\//i.test(raw)) {
      setStatus('https URL만 불러올 수 있습니다');
      return;
    }
    setStatus('불러오는 중...');
    try {
      const res = await fetch(raw, { redirect: 'follow' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      if (text.length > MAX_FETCH_BYTES) throw new Error('1MB를 넘는 파일은 지원하지 않습니다');
      $('src').value = text;
      setStatus('불러왔습니다');
      scan();
    } catch (e) {
      setStatus(`불러오기 실패 (${e.message}). CORS나 인증 문제일 수 있으니 내용을 직접 붙여넣으세요`);
    }
  }

  function loadFile(file) {
    if (!file) return;
    if (file.size > MAX_FETCH_BYTES) {
      setStatus('1MB를 넘는 파일은 지원하지 않습니다');
      return;
    }
    file.text().then((text) => {
      $('src').value = text;
      setStatus(file.name);
      scan();
    });
  }

  function exportJson() {
    if (!last) return;
    const blob = new Blob([JSON.stringify({ scannedAt: new Date().toISOString(), ...last }, null, 2)], {
      type: 'application/json',
    });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'skill-scan-result.json';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  for (const s of samples) {
    const b = document.createElement('button');
    b.className = 'ghost';
    b.textContent = s.label;
    b.title = s.kind;
    b.onclick = () => {
      $('src').value = s.text;
      setStatus(`${s.label} (합성 샘플)`);
      scan();
    };
    $('samples').appendChild(b);
  }

  $('scan').onclick = scan;
  $('fetch').onclick = fetchUrl;
  $('url').addEventListener('keydown', (e) => e.key === 'Enter' && fetchUrl());
  $('src').addEventListener('keydown', (e) => (e.metaKey || e.ctrlKey) && e.key === 'Enter' && scan());
  $('clear').onclick = () => {
    $('src').value = '';
    $('url').value = '';
    $('result').hidden = true;
    last = null;
    setStatus('');
  };
  $('export').onclick = exportJson;
  $('file').onchange = (e) => loadFile(e.target.files[0]);

  const ta = $('src');
  ta.addEventListener('dragover', (e) => {
    e.preventDefault();
    ta.classList.add('drag');
  });
  ta.addEventListener('dragleave', () => ta.classList.remove('drag'));
  ta.addEventListener('drop', (e) => {
    e.preventDefault();
    ta.classList.remove('drag');
    loadFile(e.dataTransfer.files[0]);
  });

  $('foot').textContent =
    `engine ${ENGINE_VERSION} | taxonomy v${taxonomy.VERSION} | 정적 규칙 ${rules.RULES.length}개 | ` +
    '입력 내용은 브라우저 밖으로 전송되지 않습니다 (URL 불러오기 제외)';
})();
