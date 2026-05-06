# data-dyna

面向独立咖啡店的确定性 Data Core 与 Evidence Service 基础项目。

`data-dyna` 是餐饮 SaaS 的经营证据中枢：把 producer 事件、POS 事实、商户动作、benchmark gap、Agent 草稿、商户 review 决策和效果复盘，串成可复现、可审计的经营证据链。

## 当前定位

```text
Data Core owns facts.
Agent owns hypotheses.
Validator owns safety.
Merchant owns decisions.
Evidence Store owns proof.
```

`data-dyna` 不是 POS、小程序、mobile-hq UI、PostHog 替代品，也不是可自主执行业务变更的 Agent。它接收标准化事实，产出可审计的经营证据。

## 业务闭环

```text
Event Contract
  -> Ingestion / raw event audit
  -> Business projections
  -> Independent café snapshots and metrics
  -> Peer benchmarks and opportunity gaps
  -> Agent context / draft hypothesis
  -> Deterministic validator
  -> Merchant review / adoption lifecycle
  -> Evidence store / effect and guardrail review
```

核心证据问题：

```text
什么类型的咖啡店，发现了什么问题，尝试了什么动作，
主指标如何变化，guardrail 是否恶化，商户是否真的采纳？
```

## 目录结构

| 路径 | 职责 |
|---|---|
| `src/contracts/` | 统一事件合同与 Zod schema。 |
| `src/ingestion/` | 事件校验、raw-event persistence contract、invalid-event audit、可选 PostHog mirror boundary。 |
| `src/projections/` | 确定性重建 sessions、carts、orders、payments、refunds、menus、members、merchant actions。 |
| `src/snapshots/` | 独立咖啡店 profile、segment candidate、metric definition、metric snapshot。 |
| `src/benchmarks/` | aggregate-only peer benchmark 与 directional opportunity gap。 |
| `src/agent/` | Agent context、read-only prepared attempt、安全 tool policy、draft artifact、确定性 validator。 |
| `src/merchant-review/` | 商户 review、accept/reject/modify、application lifecycle、preference confirmation contract。 |
| `src/evidence/` | before/after effect、guardrail result、intervention trajectory、evidence record。 |
| `src/app/` | Fastify app adapter、auth boundary、runtime config、PostgreSQL repository、producer delivery、observability、local/test worker。 |
| `migrations/` | raw event、projection、snapshot、benchmark、Agent run、review、evidence、tenancy、worker job 的 PostgreSQL schema。 |
| `tests/` | contract、core、runtime、Agent、review、evidence、producer、worker 的 slice-level 测试。 |
| `docs/plan/` | repo-local machine-readable active plan control plane。 |

## 运行环境与依赖

- Node.js `>=24`
- TypeScript ESM
- Fastify：HTTP adapter
- `pg` / node-postgres：PostgreSQL adapter code
- Zod：runtime schema 与 TypeScript inference
- Docker Compose：本地 PostgreSQL 测试基座

安装依赖：

```bash
npm install
```

启动本地 PostgreSQL 测试库并执行 migration：

```bash
npm run db:test:up
npm run db:migrate:test
```

本地启动应用：

```bash
npm run app:dev
```

## 常用命令

| 命令 | 用途 |
|---|---|
| `npm test` | 完整本地回归链路。 |
| `npm run test:contracts` | Event contract 与 producer mapping contract 检查。 |
| `npm run test:core` | Ingestion、projections、snapshots、benchmarks。 |
| `npm run test:agent` | Agent context、prepared attempt、runtime-contract、validator gate。 |
| `npm run test:review` | Merchant review lifecycle。 |
| `npm run test:evidence` | Evidence store 与 guardrail verdict。 |
| `npm run test:runtime` | PostgreSQL-backed runtime route/repository integration path。 |
| `npm run test:app:workers` | Durable local/test worker repository 与 executor 检查。 |
| `npm run check:boundaries` | Core / Agent / Evidence 平面的 import boundary guardrail。 |
| `npm run check:schema-migrations` | Schema/migration safety smoke check。 |
| `npm run check:plan` | repo-local `docs/plan` parser truth 检查。 |
| `npm run typecheck` | TypeScript type check。 |

文档-only 修改的最小验证：

```bash
git diff --check
```

## 当前计划控制面

当前 machine-readable 计划入口：

```text
docs/plan/README.md
```

创建本 README 时的 active pack：

```text
data-dyna-agent-runtime-integration
```

当前 active slice：

```text
DD-P6-S3 — single Agent harness and LLM-owned turn loop
```

继续实现前，以 `docs/plan/README.md`、active `*_STATUS.md`、active `*_WORKSET.md` 为 source of truth。不要恢复已完成 pack，除非后续 replan 明确重新打开。

## 架构规则

1. Core 模块保持 deterministic：不要把 HTTP framework、DB client、queue client、runtime config、provider credential 或 production I/O 放进 Core。
2. POS/payment/refund 事实是交易结果权威源；小程序 checkout 事件只是 attribution signal，不是最终支付事实。
3. PostHog 只是异步产品分析镜像，不是经营事实源。
4. Peer benchmark 必须 aggregate-only，不能暴露 peer store 或 customer identity。
5. Agent 输出在 deterministic validation 与 merchant-review gate 接受下一状态前，始终是 `agent_draft_not_core_truth`。
6. Agent tools 不能 mutate orders、metrics、benchmarks、evidence facts、menus、prices、coupons、customer messages、worker state 或 Core facts。
7. LLM claim 不能写入 evidence fact。
8. Merchant review 是人类决策边界；提交 review 不等于商户批准，也不等于业务执行。
9. 没有 deployment、auth/tenancy、observability、worker reliability、provider-runtime、external-producer proof 前，不能声称 production ready。

## Human-critical surfaces

以下路径是高风险修改面，变更前需要聚焦 review：

```text
migrations/**
src/agent/agent-tools.ts
src/agent/experiment-validator.ts
src/agent/prepared-attempt.ts
src/merchant-review/**
src/evidence/**
src/app/auth/**
src/app/workers/**
```

## Source-of-truth 文档

| 文档 | 使用场景 |
|---|---|
| `docs/current-architecture-and-vibecoding-review.md` | 需要当前架构与 AI-coder 边界总览。 |
| `docs/data-dyna-core-service-purpose.md` | 需要业务语义下的 product/service purpose。 |
| `docs/runtime-foundation-decision.md` | 需要 Fastify、PostgreSQL、worker seam 的 runtime decision。 |
| `docs/agent/agent-runtime-boundary-contract.md` | 需要 P6 Agent runtime boundary-manager contract。 |
| `docs/workers/durable-worker-foundation.md` | 需要已接受的 durable worker execution model。 |
| `docs/workers/p6-agent-runtime-handoff.md` | 需要 P5-to-P6 Agent read-only handoff contract。 |
| `docs/human-critical-review-policy.md` | 需要高风险 state、evidence、mutation-adjacent surfaces 的 review policy。 |
| `docs/plan/README.md` | 需要当前 repo-local active plan state。 |

## 本地数据库生命周期

```bash
npm run db:test:up
npm run test:db:migrations
npm run test:app:repository
npm run test:runtime
npm run db:test:down
```

重置本地 PostgreSQL 测试数据：

```bash
npm run db:test:reset
npm run test:db:migrations
```

## 生产状态

本仓库已经完成 local/test runtime、auth/tenancy、observability、POS producer delivery、durable worker jobs 的基础，并已开始 Agent runtime integration。它仍不是完整生产系统；后续必须用已接受的工作证明 production deployment、cloud secret handling、成熟 observability/SLO、provider operations、scheduler reliability 与真实 external-producer rollout 后，才能声明生产就绪。
