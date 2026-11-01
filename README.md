# AI Skill Threat Scan

외부 AI Agent Skill(`SKILL.md`), MCP tool 정의, tool 소스 코드를 **설치하거나 연결하기 전에** 점검하는 정적 위협 스캐너의 연구용 MVP입니다.

프롬프트 인젝션만 보는 것이 아니라, 관련연구 3편(ASB, MCPSecBench, MalTool)의 위협 분류를 10개 family로 통합하고, 입력 artifact에서 발견한 위험 신호를 **점수, 위협 family, 근거 줄, 논문 출처**와 함께 보여줍니다.

> **현재 상태:** 정적 regex 휴리스틱 16개로 동작하는 데모입니다. 탐지 성능(Precision/Recall)은 아직 평가하지 않았고, 점수는 악성 확률이 아니라 설명 가능한 heuristic indicator입니다. `Low`도 안전 인증이 아닙니다.

## 빠른 시작

별도 설치나 빌드가 필요 없습니다. (CLI와 테스트는 Node.js 18 이상)

### 웹

`index.html`을 브라우저로 바로 열거나, 로컬 서버를 띄웁니다.

```bash
python3 -m http.server 8080
```

`http://localhost:8080`에서 예제 버튼을 누르거나, 내용을 붙여넣거나, 파일을 끌어다 놓거나, GitHub 파일 URL을 불러옵니다.

### CLI

```bash
node bin/scan.js path/to/SKILL.md
```

```bash
node bin/scan.js ./some-skill-repo --fail-on high
```

```bash
node bin/scan.js https://github.com/owner/repo/blob/main/SKILL.md --json
```

```bash
node bin/scan.js --sample risky
```

- 디렉토리를 주면 텍스트 확장자 파일(.md, .json, .yaml, .js, .ts, .py, .sh 등)을 **각각 따로** 검사합니다. 파일 간 관계는 보지 않습니다.
- `--fail-on <low|medium|high|critical>`: 해당 등급 이상이 하나라도 나오면 exit code 1 (CI용).
- `--json`: 웹의 JSON 내보내기와 같은 형식으로 출력합니다.

### 테스트

```bash
npm test
```

규칙별 양성 예시, 오탐 방지용 음성 예시, 데모 샘플 순위, taxonomy와 논문 매핑의 정합성을 검사합니다.

## 동작 방식

```
입력 (텍스트 / 파일 / URL)
  -> 16개 정적 규칙 매칭 (src/rules.js)
  -> 규칙별 근거 줄 추출, family 집계 (src/engine.js)
  -> 점수 = 규칙 가중치 합 + 반복 보너스(규칙당 최대 6) + family 다양성 보너스(최대 14), 상한 100
  -> Severity: Critical >= 75, High >= 50, Medium >= 25, 그 외 Low
```

| Family | 규칙 |
|---|---|
| T1 Instruction & Semantic Manipulation | R01 Instruction override / hidden directive, R02 Prompt / schema poisoning |
| T2 Identity & Supply-chain Deception | R03 Untrusted remote install, R04 Shadowing / impersonation |
| T3 Credential & Data Exfiltration | R05 Credential or secret access, R06 Outbound exfiltration |
| T4 Privilege & Access-control Abuse | R07 Broad / elevated permission |
| T5 Code / File-system Execution | R08 Shell or code execution, R09 Destructive file operation |
| T6 Transport & Session Integrity | R10 Weak transport / TLS |
| T7 Availability & Resource Abuse | R11 Resource exhaustion / delay |
| T8 Persistent State & Data Integrity | R12 Data poisoning / destructive DB, R13 Configuration drift |
| T9 Agent Control-flow Hijacking | R14 Chained tool invocation |
| T10 Observability & Governance Gaps | R15 Logging suppression, R16 Model-only safety assumption |

각 규칙은 `provenance` 필드에 근거 논문 label을 갖고 있고, 전체 매핑은 [`data/paper_attack_mapping.json`](data/paper_attack_mapping.json)에 있습니다. 관련연구 정리와 설계 규칙은 [`docs/research_taxonomy.md`](docs/research_taxonomy.md)를 보세요.

## 디렉토리 구조

```
index.html                     웹 UI 진입점
web/app.js, web/style.css      웹 UI
src/taxonomy.js                T1~T10 family 정의
src/rules.js                   정적 휴리스틱 규칙 16개
src/engine.js                  analyze(), 점수 계산, URL 변환 (브라우저/Node 공용)
src/samples.js                 시연용 합성 샘플 3종
bin/scan.js                    CLI
data/paper_attack_mapping.json 논문 label -> family 매핑 (34개 label)
docs/research_taxonomy.md      관련연구 비교와 taxonomy 설계 규칙
tests/engine.test.js           회귀 테스트
```

## 한계

- 단일 파일 단위 정적 패턴 매칭입니다. AST, data flow, 파일 간 관계 분석이 없습니다.
- 위험 패턴을 **설명만 하는** 보안 문서에서도 신호가 뜰 수 있습니다(오탐).
- LLM 기반 의미 분석(설명과 실제 코드의 불일치 판단), sandbox 동적 실행, 버전 diff 기반 rug pull 감지는 아직 없습니다.
- 웹의 URL 불러오기는 브라우저 `fetch()`라 CORS, 인증, 네트워크 상황에 따라 실패할 수 있습니다. 실패하면 내용을 직접 붙여넣으세요.
- 샘플 3종은 시연용 합성 텍스트이며 평가셋이 아닙니다.

## 로드맵

- **P0** 논문 원문 대조로 label 검증, multi-label 정책 명문화
- **P1** benign/malicious 평가셋 구축 (hard negative 포함, dev/test 분리)
- **P2** 엔진 고도화: Static(parser, AST) -> Semantic(LLM judge) -> Dynamic(sandbox, dummy secret)
- **P3** 저장소 단위 스캔, supply-chain version diff, 결과 리포트
- **P4** family별 Precision/Recall/F1, FPR, latency, ablation(regex vs +LLM vs +sandbox)

## 참고 문헌

1. Zhang et al., *Agent Security Bench (ASB): Formalizing and Benchmarking Attacks and Defenses in LLM-based Agents*, ICLR 2025. https://openreview.net/forum?id=V4y0CpX4hK
2. Yang et al., *MCPSecBench: A Systematic Security Benchmark and Playground for Testing Model Context Protocols*, arXiv:2508.13220. https://arxiv.org/abs/2508.13220
3. Hu et al., *MalTool: Malicious Tool Attacks on LLM Agents*, arXiv:2602.12194. https://arxiv.org/abs/2602.12194
4. *MCP-38* (보조 참조), arXiv:2603.18063. https://arxiv.org/abs/2603.18063
