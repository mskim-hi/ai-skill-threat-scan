// 서비스 통합 위협 taxonomy v0.1 (T1~T10).
// 논문 원문 label과의 연결은 data/paper_attack_mapping.json 에 따로 둔다.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else (root.SkillScan = root.SkillScan || {}).taxonomy = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const FAMILIES = [
    {
      id: 'T1',
      name: 'Instruction & Semantic Manipulation',
      ko: '지시문/의미 조작',
      examples: 'direct/indirect prompt injection, tool poisoning, hidden instruction, PoT backdoor',
      sources: ['ASB', 'MCPSecBench'],
    },
    {
      id: 'T2',
      name: 'Identity & Supply-chain Deception',
      ko: '신원 위장/공급망 기만',
      examples: 'tool shadowing, tool/server name squatting, rug pull, 원격 설치/변조',
      sources: ['MCPSecBench', 'MalTool'],
    },
    {
      id: 'T3',
      name: 'Credential & Data Exfiltration',
      ko: '자격증명/데이터 유출',
      examples: 'credential harvesting, API-key abuse, local/remote exfiltration',
      sources: ['MalTool', 'MCPSecBench'],
    },
    {
      id: 'T4',
      name: 'Privilege & Access-control Abuse',
      ko: '권한/접근통제 남용',
      examples: '과도한 권한, confused deputy, approval bypass, isolation failure',
      sources: ['service-extension'],
    },
    {
      id: 'T5',
      name: 'Code / File-system Execution',
      ko: '코드 실행/파일시스템 조작',
      examples: 'shell command, 원격 코드 다운로드, 파일 삭제, sandbox escape',
      sources: ['MalTool', 'MCPSecBench'],
    },
    {
      id: 'T6',
      name: 'Transport & Session Integrity',
      ko: '전송/세션 무결성',
      examples: 'MITM, rebinding, weak TLS, session 문제',
      sources: ['MCPSecBench'],
    },
    {
      id: 'T7',
      name: 'Availability & Resource Abuse',
      ko: '가용성/자원 남용',
      examples: 'CPU/GPU hijacking, response-time amplification, resource exhaustion',
      sources: ['MalTool'],
    },
    {
      id: 'T8',
      name: 'Persistent State & Data Integrity',
      ko: '영속 상태/데이터 무결성',
      examples: 'memory poisoning, DB manipulation/deletion, schema/configuration drift',
      sources: ['ASB', 'MalTool', 'MCPSecBench'],
    },
    {
      id: 'T9',
      name: 'Agent Control-flow Hijacking',
      ko: '에이전트 제어 흐름 탈취',
      examples: 'confused tool use, chaining/plan deviation, slash command overlap',
      sources: ['ASB', 'MCPSecBench'],
    },
    {
      id: 'T10',
      name: 'Observability & Governance Gaps',
      ko: '관측성/거버넌스 공백',
      examples: 'logging suppression, audit/review 우회, 안전장치 부재',
      sources: ['service-extension'],
    },
  ];

  return { VERSION: '0.1', FAMILIES };
});
