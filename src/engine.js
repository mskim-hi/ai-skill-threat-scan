// 스캔 엔진. 브라우저(<script>)와 Node(require) 양쪽에서 같은 코드를 쓴다.
// 점수는 규칙 가중치 합으로 만든 heuristic indicator이며, 악성 확률이 아니다.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./taxonomy'), require('./rules'));
  } else {
    const ns = (root.SkillScan = root.SkillScan || {});
    Object.assign(ns, factory(ns.taxonomy, ns.rules));
  }
})(typeof self !== 'undefined' ? self : this, function (taxonomy, rules) {
  const ENGINE_VERSION = '0.1.0';
  const MAX_REPEAT_BONUS = 6;
  const REPEAT_STEP = 2;
  const MAX_DIVERSITY_BONUS = 14;
  const DIVERSITY_STEP = 2;
  const MAX_EVIDENCE_PER_RULE = 5;

  const SEVERITY = [
    { label: 'Critical', min: 75 },
    { label: 'High', min: 50 },
    { label: 'Medium', min: 25 },
    { label: 'Low', min: 0 },
  ];

  function riskInfo(score) {
    return SEVERITY.find((s) => score >= s.min).label;
  }

  function lineIndex(text) {
    const starts = [0];
    for (let i = 0; i < text.length; i++) if (text[i] === '\n') starts.push(i + 1);
    return starts;
  }

  function lineOf(starts, offset) {
    let lo = 0;
    let hi = starts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (starts[mid] <= offset) lo = mid;
      else hi = mid - 1;
    }
    return lo;
  }

  function visible(s) {
    return s.replace(/[​-‏⁠-⁤﻿‪-‮]/g, (c) =>
      `<U+${c.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')}>`
    );
  }

  function clip(s, n) {
    return s.length > n ? s.slice(0, n - 1) + '…' : s;
  }

  function matchRule(rule, text, lines, starts) {
    const evidence = [];
    const seen = new Set();
    for (const p of rule.patterns) {
      const re = new RegExp(p.source, p.flags.includes('g') ? p.flags : p.flags + 'g');
      let m;
      while ((m = re.exec(text)) !== null) {
        if (m[0].length === 0) {
          re.lastIndex++;
          continue;
        }
        // 매치가 앞의 줄바꿈부터 시작하면 실제 내용이 있는 줄을 가리키도록 보정한다
        const lead = m[0].length - m[0].replace(/^\s+/, '').length;
        const ln = lineOf(starts, m.index + lead);
        const key = `${ln}:${m.index}`;
        if (seen.has(key)) continue;
        seen.add(key);
        evidence.push({
          line: ln + 1,
          text: clip(visible(lines[ln].trim()), 200),
          match: clip(visible(m[0].trim()), 120),
        });
      }
    }
    evidence.sort((a, b) => a.line - b.line);
    return evidence;
  }

  function analyze(text) {
    const src = String(text || '');
    const lines = src.split('\n');
    const starts = lineIndex(src);
    const findings = [];

    for (const rule of rules.RULES) {
      const evidence = matchRule(rule, src, lines, starts);
      if (evidence.length === 0) continue;
      const repeatBonus = Math.min(MAX_REPEAT_BONUS, (evidence.length - 1) * REPEAT_STEP);
      findings.push({
        ruleId: rule.id,
        family: rule.family,
        name: rule.name,
        level: rule.level,
        why: rule.why,
        fix: rule.fix,
        provenance: rule.provenance,
        points: rule.w + repeatBonus,
        hits: evidence.length,
        evidence: evidence.slice(0, MAX_EVIDENCE_PER_RULE),
      });
    }

    const activeFamilies = [...new Set(findings.map((f) => f.family))];
    const ruleScore = findings.reduce((sum, f) => sum + f.points, 0);
    const diversityBonus = Math.min(
      MAX_DIVERSITY_BONUS,
      Math.max(0, activeFamilies.length - 1) * DIVERSITY_STEP
    );
    const score = Math.min(100, ruleScore + diversityBonus);

    const order = { critical: 0, high: 1, medium: 2, low: 3 };
    findings.sort((a, b) => order[a.level] - order[b.level] || b.points - a.points);

    return {
      engine: ENGINE_VERSION,
      taxonomy: taxonomy.VERSION,
      score,
      severity: riskInfo(score),
      breakdown: { ruleScore, diversityBonus },
      families: taxonomy.FAMILIES.map((f) => ({
        id: f.id,
        name: f.name,
        ko: f.ko,
        active: activeFamilies.includes(f.id),
        hits: findings.filter((x) => x.family === f.id).reduce((n, x) => n + x.hits, 0),
      })),
      findings,
      stats: { lines: lines.length, chars: src.length, rules: rules.RULES.length },
    };
  }

  // GitHub blob URL을 raw URL로 바꾼다. 그 외 URL은 그대로 둔다.
  function toRaw(url) {
    const u = String(url || '').trim();
    const blob = u.match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/(.+)$/i);
    if (blob) return `https://raw.githubusercontent.com/${blob[1]}/${blob[2]}/${blob[3]}`;
    return u;
  }

  return { ENGINE_VERSION, analyze, riskInfo, toRaw, SEVERITY };
});
