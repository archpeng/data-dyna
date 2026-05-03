# data-dyna 生产化 Roadmap

状态：Roadmap SSOT v0.1  
日期：2026-05-03  
Owner：`data-dyna` product / architecture / runtime  
范围：在已完成 `data-dyna-production-runtime-foundation` 之后，规划从“本地可运行后端基础”走向“可承载真实商户/真实数据/真实 Agent 的生产系统”的六个后续阶段。  
当前基线：`data-dyna-production-runtime-foundation` 已 `PACK_COMPLETE`，最新推送提交 `7f89d5d fix: use public npm registry in lockfile`，GitHub Actions `DB Migration Gate` 已通过。

关联文档：

- `docs/current-architecture-and-vibecoding-review.md`
- `docs/runtime-foundation-decision.md`
- `docs/local-postgres.md`
- `docs/plan/README.md`
- `docs/plan/data-dyna-production-runtime-foundation_STATUS.md`
- `docs/roadmap/control-plane-data-core-integration-roadmap.md`
- `docs/roadmap/independent-cafe-data-first-mvp-roadmap.md`

---

## 0. 当前项目基线

当前已经完成的是 **最小生产运行时基础**，不是完整生产系统。

已具备：

```text
Deterministic Data Core
  + PostgreSQL migrations and DB gate
  + Fastify runtime skeleton
  + /events and /events/batch HTTP adapters
  + PostgreSQL raw-event repository
  + contract-only worker seams
  + local/runtime integration tests
  + GitHub Actions DB Migration Gate
```

已验证：

```bash
npm run db:test:up
npm run test:db:migrations
npm run test:app:repository
npm run test:runtime
npm run test:app:workers
npm run check:boundaries
npm run check:schema-migrations
npm run typecheck
npm test
npm run check:plan
git diff --check
```

当前仍未具备：

```text
production deployment
auth / tenancy
mature observability
durable worker queue
external producer integration
full Agent runtime / Pi provider integration
```

通俗解释：

```text
地基、承重墙、水电管线、样板间和验收表已经完成；
正式装修、门禁、监控、物业、真实租户入住和 AI 员工值班还未完成。
```

---

## 1. Roadmap 总览

后续生产化不要一次性做成“大而全平台”。按以下六个阶段推进，每个阶段独立成 pack / slice，必须有明确验证和 residual。

| 阶段 | 名称 | 目标 | 依赖 | 完成后能力 |
|---|---|---|---|---|
| P1 | Production Deployment Foundation | 让服务能在真实环境被部署、启动、回滚 | 当前 runtime foundation | 有可重复部署路径和基础环境配置 |
| P2 | Auth / Tenancy Foundation | 让 API 和数据具备商户/门店隔离边界 | P1 或本地等价环境 | 接入真实商户前的安全门槛 |
| P3 | Observability Foundation | 让运行状态、错误、性能、DB gate 可观测 | P1 | 上线后能发现、定位、回滚问题 |
| P4 | External Producer Integration | 让 POS / 小程序 / mobile-hq 等真实 producer 接入 `/events` | P2 + P3 | 有真实经营事件进入 Data Core |
| P5 | Durable Worker Queue Foundation | 让 projection / snapshot / benchmark / evidence 后台任务可执行、可恢复 | P3 + P4 | 从 raw events 到衍生事实的后台流水线 |
| P6 | Agent Runtime Integration | 让 Agent 作为受控 sidecar 在线生成假设和实验草稿 | P2 + P3 + P5 | AI 能在线辅助，但不能越权改事实或直接执行业务变更 |

推荐顺序：

```text
P1 deployment
  -> P2 auth/tenancy
  -> P3 observability
  -> P4 external producers
  -> P5 durable workers
  -> P6 Agent runtime
```

原因：

1. 没有部署就没有稳定运行环境。
2. 没有 auth/tenancy 不应接真实商户。
3. 没有 observability 不应扩大真实流量。
4. 没有真实 producer，后续 worker 和 Agent 只会处理 fixture。
5. 没有 durable worker，衍生事实无法稳定刷新。
6. Agent runtime 应最后接入，避免 AI 先于事实/权限/观测体系上线。

---

## 2. P1：Production Deployment Foundation

### 2.1 目标

把当前本地 Fastify runtime 从“开发机可运行”推进到“目标环境可重复部署、可启动、可健康检查、可回滚”。

最小目标不是大规模云原生平台，而是一个清晰、可审计的部署基线。

### 2.2 范围

必须交付：

1. 生产部署目标说明：容器、VM、PaaS 或内部环境，必须二选一或明确单一目标。
2. Runtime 启动入口：`src/app/server.ts` 的生产启动方式、端口、host、env 约定。
3. 环境变量 contract：列出必需变量、默认值、禁止提交的 secret、测试/生产差异。
4. 数据库连接策略：生产 `DATABASE_URL` 或等价配置 seam，不复用 local test credential。
5. 健康检查：至少保留 `/healthz`，并决定是否加入 DB readiness check。
6. 部署步骤：build / install / migrate / start / rollback 的最小 runbook。
7. CI/CD 或手工发布门禁：明确上线前必须跑哪些命令。

建议交付文件：

```text
docs/deployment/production-runtime-foundation.md
.env.example
Dockerfile 或部署平台配置
package.json scripts
src/app/config/production-runtime-config.ts 或现有 config 扩展
```

### 2.3 非目标

本阶段不做：

- 多区域高可用；
- 自动扩缩容；
- 成熟蓝绿/金丝雀；
- 全量 observability；
- auth / tenancy；
- Agent runtime；
- external producer instrumentation。

### 2.4 验证

最小验证：

```bash
npm ci
npm run check:boundaries
npm run check:schema-migrations
npm run test:db:migrations
npm run test:runtime
npm run typecheck
npm test
```

如果引入 container：

```bash
docker build ...
docker run ...
curl /healthz
```

完成判定：

```text
一个新环境可以按文档从空白状态启动 data-dyna runtime；
失败时有明确 rollback / stop / log collection 步骤；
没有生产 secret 被写入仓库。
```

---

## 3. P2：Auth / Tenancy Foundation

### 3.1 目标

让 `data-dyna` 在接真实商户前具备最小访问控制和租户隔离边界。

核心问题：

```text
谁可以调用 /events？
这个事件属于哪个 merchant / store？
不同 merchant / store 的数据如何避免串读、串写、串分析？
```

### 3.2 范围

必须交付：

1. API 身份模型：service token、producer token、merchant token 或内部 gateway identity 的选择。
2. Tenant identity contract：`merchant_id`、`store_id`、`producer_id`、`source`、`environment` 的来源和校验规则。
3. `/events` auth boundary：未授权请求拒绝；授权请求只能写入允许的 merchant/store 范围。
4. 数据库约束策略：raw events 和后续 projection 表如何保留 tenant key。
5. 审计字段：谁写入、何时写入、来源系统、幂等键、request correlation。
6. 测试：跨 tenant 写入/读取/幂等冲突不能互相污染。

建议交付文件：

```text
docs/security/auth-tenancy-foundation.md
src/app/auth/**
src/app/http/events-route.ts
tests/app-auth-tenancy-*.spec.ts
migrations/xxxx_tenant_keys_or_constraints.sql  # 仅当 schema 需要演进
```

### 3.3 非目标

本阶段不做：

- 完整 IAM；
- OAuth / SSO，除非部署环境强制；
- 细粒度 RBAC 管理后台；
- 商户自助权限配置；
- Agent 权限系统。

### 3.4 验证

最小验证：

```bash
npm run test:runtime
npm run test:db:migrations
npm run check:boundaries
npm run typecheck
npm test
```

必须新增负向测试：

```text
missing credential -> rejected
invalid credential -> rejected
merchant A token cannot write merchant B event
tenant id missing or malformed -> rejected or persisted as invalid event according to contract
idempotency key collision across tenant boundary does not corrupt data
```

完成判定：

```text
真实 producer 接入前，Data Dyna 已经能识别调用方和 tenant；
不同商户/门店不会因为 HTTP adapter、repository 或 DB constraint 混到一起。
```

---

## 4. P3：Observability Foundation

### 4.1 目标

让生产 runtime 的健康、错误、延迟、DB migration、event ingestion、worker 和未来 Agent 行为可观测。

核心问题：

```text
系统坏了时，怎么知道？
慢了时，怎么定位？
丢事件时，怎么发现？
worker 卡住时，怎么恢复？
Agent 出错时，怎么审计？
```

### 4.2 范围

必须交付：

1. Structured logging：request id、tenant id、source、route、status、duration、error code。
2. Metrics contract：至少包括 request count、error count、latency、event accepted/duplicate/invalid counts。
3. Trace / correlation plan：HTTP request -> raw event -> worker job -> evidence 的 correlation key。
4. Alert candidates：DB migration failure、5xx spike、invalid event spike、worker lag、Agent failure rate。
5. Runtime dashboard or query notes：即使暂不创建 dashboard，也要写清楚关键查询。
6. Redaction policy：日志不能泄露 token、secret、PII 或商户敏感明细。

建议交付文件：

```text
docs/observability/runtime-observability-foundation.md
src/app/observability/**
src/app/app.ts
src/app/http/events-route.ts
tests/app-observability-*.spec.ts
```

### 4.3 非目标

本阶段不做：

- 完整 incident management；
- 复杂 SLO 平台；
- 全链路 tracing 覆盖所有外部系统；
- 成熟容量规划；
- 自动 remediation。

### 4.4 验证

最小验证：

```bash
npm run test:runtime
npm run check:boundaries
npm run typecheck
npm test
```

必须证明：

```text
成功请求有结构化日志或 metric 记录；
失败请求有错误分类；
invalid event 不只返回 400，也能被统计；
日志不包含 secret/token 明文；
correlation id 可以从 HTTP request 追到 raw event。
```

完成判定：

```text
服务上线后，团队可以回答：现在是否健康、哪里报错、哪个 tenant/source 影响最大、是否正在丢事件。
```

---

## 5. P4：External Producer Integration

### 5.1 目标

把 `/events` 从“本地 integration test 可用”推进到“真实外部 producer 可以安全、非阻塞、可回放地接入”。

优先 producer：

```text
POS：交易现场、支付/退款/取消、员工操作、收银上下文。
小程序：菜单浏览、购物车、checkout、券/推荐/渠道行为。
mobile-hq：商户查看、确认、接受/拒绝/应用/回滚动作卡。
后端事实服务：订单、支付、退款、商品、门店等最终事实同步。
```

### 5.2 范围

必须交付：

1. Producer contract：每类 producer 负责哪些事件，不负责哪些事实。
2. Event mapping：外部字段 -> `DataDynaEvent` 字段的 source-to-target mapping。
3. Delivery semantics：非阻塞发送、超时、重试、批量、幂等键生成。
4. Backfill / replay plan：历史事件如何补、失败事件如何重放。
5. Producer-side failure policy：Data Dyna 不可用时不能阻塞 POS 收银/支付/退款。
6. Contract tests：fixture event 能通过 data-dyna ingestion contract。
7. Pilot scope：先选一个最小 producer path，不一次接全量系统。

建议交付文件：

```text
docs/integration/external-producer-contract.md
docs/integration/pos-event-mapping.md
docs/integration/miniapp-event-mapping.md
docs/integration/mobile-hq-event-mapping.md
producer-side SDK 或 adapter 代码  # 具体仓库需单独计划授权
```

### 5.3 非目标

本阶段不做：

- 把 PostHog / Aegis 当经营事实源；
- 全量外部仓库大迁移；
- 阻塞交易链路的同步上报；
- 未经 auth/tenancy 的真实数据接入；
- Agent 根据未验证 producer 数据自动行动。

### 5.4 验证

最小验证：

```bash
npm run test:contracts
npm run test:runtime
npm run test:db:migrations
npm run typecheck
npm test
```

必须证明：

```text
每个 producer 事件都有 idempotency key；
真实 producer fixture 可以写入 raw_events；
无效 producer payload 会进入 invalid_raw_events 或被明确拒绝；
producer 失败不会阻塞原业务主流程；
source / tenant / entity / correlation 字段足够支持后续 projection。
```

完成判定：

```text
至少一个真实 producer path 能安全写入 data-dyna /events；
事件进入 raw_events 后可以被现有 deterministic pipeline 消费或明确排队等待 worker。
```

---

## 6. P5：Durable Worker Queue Foundation

### 6.1 目标

把当前 `src/app/workers/**` 的 contract-only worker seams 推进到可执行、可恢复、可观测的后台任务基础。

核心 worker：

```text
projection-worker：raw_events -> business projections
snapshot-worker：projections -> independent cafe snapshots
benchmark-worker：snapshots -> peer benchmarks and opportunity gaps
evidence-worker：merchant adoption + before/after metrics -> evidence records
```

### 6.2 范围

必须交付：

1. Worker execution model：manual script、cron、DB-backed job table、queue broker 四选一或明确阶段性选择。
2. Job contract：job id、tenant/store scope、input watermark、status、attempt、error、started/completed timestamps。
3. Checkpoint / watermark：防止重复处理、漏处理、乱序处理。
4. Retry policy：哪些错误可重试、重试几次、间隔多少、何时进入 dead letter。
5. Idempotent writes：worker 重跑不会破坏 projections / snapshots / evidence。
6. Observability：worker count、lag、failure、dead letter、duration。
7. Tests：成功、重复执行、失败重试、dead letter、checkpoint 恢复。

建议交付文件：

```text
docs/workers/durable-worker-foundation.md
src/app/workers/**
src/app/repositories/*projection* 或 job repository
migrations/xxxx_worker_jobs.sql
migrations/xxxx_worker_checkpoints.sql
tests/app-workers-*.spec.ts
```

### 6.3 非目标

本阶段不做：

- 自动业务变更；
- Agent runtime execution；
- 商户 review side effect；
- 跨区域分布式任务调度；
- exactly-once 承诺，除非经过严格设计和测试。

### 6.4 验证

最小验证：

```bash
npm run test:db:migrations
npm run test:app:workers
npm run check:boundaries
npm run typecheck
npm test
```

必须新增 worker integration tests：

```text
worker can process a bounded batch
re-running the same job is idempotent
failed job records reason
retry count is bounded
dead-letter state is explicit
checkpoint prevents silent data loss
```

完成判定：

```text
raw event 到 projection/snapshot/benchmark/evidence 的后台刷新有可审计执行记录；
失败不会静默丢失；
重复执行不会污染事实。
```

---

## 7. P6：Agent Runtime Integration

### 7.1 目标

让当前 Agent sidecar 从本地 deterministic tests / adapter seam 走向受控 runtime：可以读取 Data Core 事实，生成假设和实验草稿，但不能越权成为事实源或直接执行业务变更。

核心原则：

```text
Data Core owns facts.
Agent owns hypotheses.
Validator owns safety.
Merchant owns decisions.
Evidence Store owns proof.
```

### 7.2 范围

必须交付：

1. Provider integration：真实 Pi provider / LLM adapter 的最小封装。
2. Agent run lifecycle：queued、running、drafted、validated、rejected、awaiting_merchant_review、failed。
3. Prompt/input contract：Agent 只能读取 `AgentContextBundle`，不能直接查 DB 任意表。
4. Tool allowlist enforcement：只允许安全 high-level tools，拒绝 mutation tools。
5. Validator gate：每个 draft 必须通过 deterministic validator 才能进入 merchant review。
6. Human review handoff：商户确认前不得执行业务变更。
7. Cost / latency / failure audit：记录 token、duration、provider error、fallback。
8. Tests：provider fake、bad draft、validator reject、merchant review handoff、no direct mutation。

建议交付文件：

```text
docs/agent/agent-runtime-integration.md
src/agent/**
src/app/workers/agent-worker.ts 或等价 runner
migrations/xxxx_agent_runtime_audit.sql  # 如现有 0005 不足
tests/agent-runtime-*.spec.ts
```

### 7.3 非目标

本阶段不做：

- Agent 自动改菜单、价格、库存、券、配置；
- Agent 写 Core fact tables；
- Agent 绕过 deterministic validator；
- Agent 绕过 merchant review；
- 用 LLM claim 替代 evidence record；
- 未观测、未限流、未审计的生产 Agent 调用。

### 7.4 验证

最小验证：

```bash
npm run test:agent
npm run test:review
npm run test:evidence
npm run check:boundaries
npm run typecheck
npm test
```

必须新增 runtime tests：

```text
Agent receives only bounded context bundle
Agent output becomes draft, not fact
invalid draft is rejected by validator
valid draft waits for merchant review
forbidden tool call is rejected
provider failure is auditable and does not mutate state
```

完成判定：

```text
Agent 可以在线辅助生成经营实验草稿；
所有草稿都有上下文、校验、审计和商户确认边界；
AI 仍然不是事实源，也不能直接执行业务变更。
```

---

## 8. 跨阶段架构规则

这些规则适用于 P1-P6 全部阶段。

### 8.1 事实边界

```text
PostgreSQL / Data Core tables 是事实源。
PostHog / Aegis / logs / traces 是观测或产品分析 sink，不是经营事实源。
LLM output 是 hypothesis / draft，不是事实。
Merchant confirmation 是行动进入生命周期的前置条件。
Evidence Store 只记录可验证效果，不接收 LLM 自称结论。
```

### 8.2 代码边界

```text
src/contracts / src/ingestion / src/projections / src/snapshots / src/benchmarks / src/evidence 是 deterministic Core。
src/app 是 HTTP / DB / runtime adapter。
src/agent 是 Agent sidecar 和 draft 生成边界。
生产依赖如 fastify、pg、queue、observability SDK 必须留在 app/adapter 或明确 runtime 层。
Core 不应 import Fastify、pg、queue client、provider SDK。
```

### 8.3 AI-coding 边界

```text
每个阶段先创建或更新 docs/plan pack，再执行代码。
每个阶段必须有 done_when / stop_boundary。
每个阶段不能把 deferred residual 写成 complete。
每个阶段完成后必须跑 npm run check:plan 和 git diff --check。
```

---

## 9. 总体验收线

当 P1-P6 全部完成后，项目应达到：

```text
真实 producer 可以安全上报事件；
生产 runtime 可以部署、启动、健康检查、回滚；
商户/门店数据有基本隔离；
系统运行状态和失败可观测；
后台 worker 可执行、可重试、可恢复；
Agent 可以受控生成实验草稿；
商户确认前不会发生业务变更；
Evidence Store 只记录可验证证据。
```

总体验收命令应至少包括：

```bash
npm ci
npm run check:plan
npm run check:boundaries
npm run check:schema-migrations
npm run test:db:migrations
npm run test:app:repository
npm run test:runtime
npm run test:app:workers
npm run test:agent
npm run test:review
npm run test:evidence
npm run typecheck
npm test
git diff --check
```

生产验收还需要非本地证据：

```text
deployment run proof
health/readiness proof
observability screenshot or query proof
producer pilot proof
worker retry/dead-letter proof
Agent run audit proof
```

---

## 10. 通俗版里程碑

| 阶段 | 通俗解释 | 完成后像什么 |
|---|---|---|
| P1 部署 | 把样板间搬到真实楼里 | 服务能在真实环境启动和回滚 |
| P2 权限/租户 | 装门禁和房卡 | 不同商户不会串门、串数据 |
| P3 观测 | 装仪表盘和报警器 | 坏了、慢了、丢数据能看见 |
| P4 外部接入 | 让供应商开始送货 | POS/小程序/HQ 真实事件能进来 |
| P5 后台任务 | 建仓库流水线和异常处理 | 数据能稳定加工成指标和证据 |
| P6 Agent | 让 AI 顾问受控上岗 | AI 能提建议，但不能越权行动 |

最终状态：

```text
data-dyna 从“本地可运行的数据核心 + 最小后端”
升级为“可接真实商户、真实数据、真实后台任务、受控 AI 辅助的生产系统”。
```
