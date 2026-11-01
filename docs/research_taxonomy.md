# 관련연구와 통합 위협 taxonomy v0.1

> 이 문서는 설계 reference다. 각 논문의 label 문구와 개수는 원문 PDF 대조(P0)가 끝나지 않았으며, 검증 완료된 표준 분류체계라고 주장하지 않는다.
> 기계가 읽는 버전은 [`data/paper_attack_mapping.json`](../data/paper_attack_mapping.json) 이다.

## 1. 핵심 관련연구 3편

| 연구 | 주된 층위 | 분류 기준 | 서비스 분석 방향 |
|---|---|---|---|
| **ASB** (ICLR 2025) | Agent instruction/context | 악성 지시가 주입되거나 기억되는 지점 | 텍스트/지시문 semantic scan |
| **MCPSecBench** (arXiv:2508.13220) | MCP/tool 연결 구조 | Client / Protocol / Server / Host 공격면 | 설정, 도구 정의, 권한, 프로토콜 검사 |
| **MalTool** (arXiv:2602.12194) | Tool implementation/behavior | Confidentiality / Integrity / Availability 침해 행위 | 정적 코드 + 동적 behavior 검사 |

- ASB: Direct Prompt Injection, Indirect Prompt Injection, Memory Poisoning, Plan-of-Thought Backdoor, Mixed Attack (5)
- MCPSecBench: ATT-1 ~ ATT-17 (17)
- MalTool: CIA 기준 malicious behavior 12개 (12)
- 보조 참조: MCP-38 (arXiv:2603.18063). 누락 여부 cross-check 용도로만 쓴다.

세 연구는 상호 배타적이지 않다. 하나의 악성 tool description에 indirect prompt injection이 있고, 그것이 secret 접근과 외부 전송을 유도할 수 있다. 그래서 하나의 source label이 여러 family에 매핑될 수 있다(multi-label).

## 2. 통합 family (T1~T10)

| ID | Family | 주요 예시 | 근거 |
|---|---|---|---|
| T1 | Instruction & Semantic Manipulation | prompt injection, tool poisoning, hidden instruction | ASB, MCPSecBench |
| T2 | Identity & Supply-chain Deception | tool shadowing, name squatting, rug pull, 원격 설치 | MCPSecBench, MalTool |
| T3 | Credential & Data Exfiltration | credential harvesting, API-key abuse, exfiltration | MalTool, MCPSecBench |
| T4 | Privilege & Access-control Abuse | 과도한 권한, confused deputy, approval bypass | 서비스 확장 |
| T5 | Code / File-system Execution | shell 실행, 원격 코드, 파일 삭제, sandbox escape | MalTool, MCPSecBench |
| T6 | Transport & Session Integrity | MITM, rebinding, weak TLS | MCPSecBench |
| T7 | Availability & Resource Abuse | CPU/GPU hijacking, response-time amplification | MalTool |
| T8 | Persistent State & Data Integrity | memory poisoning, DB 조작/삭제, configuration drift | ASB, MalTool, MCPSecBench |
| T9 | Agent Control-flow Hijacking | confused tool use, chaining, slash command overlap | ASB, MCPSecBench |
| T10 | Observability & Governance Gaps | logging suppression, 검토 우회, 안전장치 부재 | 서비스 확장 |

## 3. 설계 규칙

1. 원 논문 label과 family의 연결은 `paper -> source label -> family` 매핑으로 따로 보존한다.
2. "목표 탐지 범위(reference universe)"와 "실제 탐지 가능 범위"를 섞지 않는다.
   - 매핑의 `heuristic_rules`는 관련 신호를 잡는 정적 규칙이 있다는 뜻일 뿐이다.
   - `implemented`는 평가셋으로 검증된 detector가 있을 때만 `true`로 바꾼다. 현재는 모두 `false`다.
3. T4, T10은 논문 label의 단순 합집합에서 직접 나오지 않은 서비스 측 확장이다. 매핑 파일에 `service_extensions`로 구분해 둔다.
4. 현재 34개 source label 중 32개에 관련 정적 규칙이 있고, MCPSecBench ATT-14(Vulnerable Client), ATT-17(Vulnerable Server)은 관련 규칙이 없다. 이 숫자는 coverage(탐지율)가 아니다.

## 4. 남은 결정 사항

- family 경계 사례와 multi-label 정책의 명문화
- source label을 얼마나 세분화해서 보존할지
- T4/T10 확장의 학술적 타당성
- coverage 정의: `정답 라벨이 있는 평가셋에서 실제 탐지된 유형 수 / 평가 대상 유형 수`
