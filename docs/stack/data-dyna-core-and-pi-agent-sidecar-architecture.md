# data-dyna 技术架构共识：确定性 Data Core + Pi Agent 分析 Sidecar

状态：Stack / Architecture SSOT v0.1  
日期：2026-05-02  
Owner：`data-dyna` product / architecture / data / agent runtime  
范围：定义 `data-dyna` 当前阶段的整体技术架构、技术选型、Data Core 与 Analysis Agent 边界，以及为什么第三步应使用 Pi Agent 作为 agent 基座。  
关联文档：

- `docs/data-dyna-core-service-purpose.md`
- `docs/roadmap/control-plane-data-core-integration-roadmap.md`
- `docs/roadmap/independent-cafe-data-first-mvp-roadmap.md`
- `docs/analyse/data-dyna-three-step-technical-method.md`
- `docs/analyse/data-dyna-step3-scaling-law-intervention-hypothesis.md`
- `docs/analyse/stack/independent-cafe-data-flywheel-minimal-stack.md`

Pi 参考文档：

- `/home/peng/.local/lib/node-v24.14.1-linux-arm64/lib/node_modules/@mariozechner/pi-coding-agent/README.md`
- `/home/peng/.local/lib/node-v24.14.1-linux-arm64/lib/node_modules/@mariozechner/pi-coding-agent/docs/sdk.md`
- `/home/peng/.local/lib/node-v24.14.1-linux-arm64/lib/node_modules/@mariozechner/pi-coding-agent/docs/extensions.md`
- `/home/peng/.local/lib/node-v24.14.1-linux-arm64/lib/node_modules/@mariozechner/pi-coding-agent/docs/rpc.md`
- `/home/peng/.local/lib/node-v24.14.1-linux-arm64/lib/node_modules/@mariozechner/pi-coding-agent/docs/skills.md`
- `/home/peng/.local/lib/node-v24.14.1-linux-arm64/lib/node_modules/@mariozechner/pi-coding-agent/docs/prompt-templates.md`

---

## 0. 核心结论

`data-dyna` 的技术架构应分成两条明确主线：

```text
1. data-dyna-core：确定性事实系统
2. data-dyna-agent：基于 Pi Agent 的经营分析 sidecar
```

一句话：

> `data-dyna` 的核心架构是“确定性数据核心 + 可控 Pi Agent 分析 sidecar”：前者保证事实可信，后者把同类门店数据转化为可验证经营实验。

边界原则：

```text
Data Core owns facts.
Benchmark exposes gaps.
Pi Agent proposes hypotheses.
Validator enforces safety.
Merchant confirms action.
Evidence proves outcome.
```

中文解释：

```text
Data Core 负责什么是真的；
Benchmark 负责同类对比和机会缺口；
Pi Agent 负责基于上下文提出经营假设；
Validator 负责确定性安全校验；
老板负责确认、修改、拒绝；
Evidence Store 负责证明实验结果。
```

---

## 1. 总体架构

```text
[小程序 mini-order]
  -> 用户行为事件
  -> menu_view / item_click / add_to_cart / checkout / coupon / recommendation

[POS pos-lite-cashier]
  -> 交易现场事件
  -> order_created / payment_success / refund / cancel / coupon_used

[mobile-hq 联邦项目族]
  -> 商户动作和采纳
  -> report_opened / evidence_viewed / accepted / rejected / applied / reviewed

[Datamesh]
  -> report.crm.member_labels
  -> RFM 标签 / 会员画像 / 新客转化 / 核心用户流失

[后端事实服务]
  -> order / product / payment / refund / store / report facts

                    ↓

====================================================
                data-dyna-core
====================================================

[Event Ingestion API]
  -> raw_events

[Sync Workers]
  -> orders / members / RFM / products / menus / refunds

[Business Projection]
  -> sessions / carts / orders / order_items / members / member_rfm_snapshots

[Profile & Segment]
  -> store_profiles / restaurant_segments

[Metrics & Benchmark]
  -> metric_snapshots / peer_benchmarks / opportunity_gaps

[Effect & Guardrail]
  -> action_effects / guardrail_results

[Evidence Store]
  -> intervention_trajectories / evidence_records

                    ↓ context bundle

====================================================
              data-dyna-agent based on Pi Agent
====================================================

[Pi Agent Session Runtime]
  -> session / tools / model / compaction / events

[Context Builder]
  -> store state + benchmark + RFM + constraints + similar evidence

[LLM Hypothesis Generator]
  -> intervention_hypothesis

[Experiment Plan Generator]
  -> structured_experiment_plan

[Deterministic Validator]
  -> safety / permission / guardrail / rollback / sample size check

                    ↓

[mobile-hq Merchant Review]
  -> accept / modify / reject / apply / revert / review

                    ↓

[Outcome Measurement]
  -> before/after + guardrail + adoption

                    ↓

[Evidence Learning Loop]
  -> next benchmark / next hypothesis / next prior
```

---

## 2. 为什么必须拆成 Core 和 Agent

### 2.1 Data Core 必须确定性

`data-dyna-core` 负责：

```text
事件接收
订单事实同步
RFM 快照同步
会员画像
指标计算
同类 benchmark
机会缺口识别
before/after 复盘
guardrail 检查
evidence_record 沉淀
```

这些能力必须：

```text
可复查
可重复
可审计
可解释
不随 LLM 输出波动
不因 agent 失败而中断
```

因此 Data Core 不应 agent 化。

---

### 2.2 第三步可以且应该 Agent 化

第三步现在定义为：

```text
Peer Benchmark
  -> Opportunity Gap
  -> LLM-generated Intervention Hypothesis
  -> Structured Experiment Plan
  -> Deterministic Safety Validation
  -> Merchant Acceptance
  -> Measured Outcome
  -> Evidence Learning
```

其中：

```text
Peer Benchmark / Opportunity Gap 之前：确定性 Data Core。
Opportunity Gap 之后：可以进入 Pi Agent 分析 sidecar。
```

原因：

```text
从机会缺口到经营假设需要综合解释；
需要类比同类门店 trajectory；
需要结合老板偏好、商圈、时段、菜单、RFM；
需要生成低风险实验；
需要组织老板能理解的话术；
需要在多轮反馈中持续改写和解释。
```

这些是 LLM / Agent 的优势。

---

### 2.3 Agent 不能拥有 truth

Agent 的输出只能是：

```text
hypothesis
experiment_plan_draft
merchant_explanation
risk_notes
review_summary
```

Agent 不能：

```text
直接改菜单；
直接发券；
直接改价；
直接改变 POS / 小程序主流程；
直接写 orders / metrics / evidence facts；
绕过 deterministic validator；
绕过老板确认；
把自己输出当事实。
```

---

## 3. 技术选型总表

| 层 | 推荐技术 | 说明 |
|---|---|---|
| Event Contract | TypeScript + Zod | 前后端共享事件 schema，支持版本演进和校验 |
| Core API | NestJS + Fastify | 与现有 `hq-bff-service` 技术栈一致，团队迁移成本低 |
| Agent Runtime | Pi Agent SDK / RPC | 使用 Pi 作为 agent 基座，复用 session、tools、extensions、skills、compaction、model registry |
| Agent API | Fastify / NestJS wrapper | 包装 Pi Agent runtime，对 Core 暴露稳定内部 API |
| DB | PostgreSQL | MVP 主库，支持 JSONB、事务、快照、关系表 |
| ORM | Drizzle 优先，Prisma 可选 | Drizzle 更轻；Prisma 生态成熟 |
| Worker | pg-boss / PostgreSQL task table | MVP 避免 Kafka，足够支撑同步和计算 |
| Cache | Redis 可选 | 只在限流、短缓存、分布式锁需要时引入 |
| OLAP | 暂不引入；后续 ClickHouse | benchmark 变慢后再加，不作为 MVP 起点 |
| Vector | 暂不必需；后续 pgvector | 先用结构化 similar trajectory retrieval |
| LLM Client | Pi ModelRegistry + provider support | Pi 已支持多 provider / model / thinking level |
| Agent Output Validation | Zod | Pi Agent 输出必须结构化校验后才能入库 |
| Product Analytics | PostHog sink | 只做产品分析，不做事实源 |
| Observability | OpenTelemetry + SigNoz | 监控 API、worker、agent latency/cost/error |
| Deployment | Docker / Node processes | MVP 简单部署；后续再 K8s |

---

## 4. data-dyna-core 设计

### 4.1 职责

`data-dyna-core` 是事实中枢。

职责：

```text
Event Contract
Event Ingestion
Raw Event Store
Data Sync
Business Projection
Profile / Segment
Metrics
Peer Benchmark
Opportunity Gap
Effect Review
Guardrail
Evidence Store
```

---

### 4.2 模块划分

```text
modules/events
modules/ingestion
modules/rfm
modules/orders
modules/products
modules/projections
modules/profiles
modules/segments
modules/metrics
modules/benchmarks
modules/opportunity-gaps
modules/effects
modules/guardrails
modules/evidence
modules/agent-bridge
```

---

### 4.3 核心 API

```http
POST /events
POST /events/batch
GET /stores/{store_id}/profile
GET /stores/{store_id}/benchmarks
GET /stores/{store_id}/opportunity-gaps
GET /evidence/{evidence_id}
POST /agent-runs/request-hypothesis
POST /experiment-plans/{id}/validate
POST /merchant-acceptance-events
```

说明：

```text
Core 可以请求 Agent 生成 hypothesis，但 Agent 不直接访问核心事实表写入最终事实。
Core 负责把 Agent 结果保存为 draft / proposal / run log。
```

---

### 4.4 核心表

```text
raw_events
stores
store_profiles
restaurant_segments
members
member_profiles
member_rfm_snapshots
sessions
carts
orders
order_items
payments
refunds
items
menus
menu_versions
metric_snapshots
peer_groups
peer_benchmarks
opportunity_gaps
intervention_hypotheses
experiment_plans
experiment_validations
merchant_acceptance_events
action_effects
guardrail_results
intervention_trajectories
evidence_records
agent_runs
```

---

## 5. data-dyna-agent：为什么使用 Pi Agent 作为基座

### 5.1 选择结论

`data-dyna-agent` 应使用 Pi Agent 作为 agent 基座。

推荐形态：

```text
MVP：同 repo / 独立 app / Pi SDK embedding
真实商户建议阶段：独立 sidecar service
跨语言或强隔离场景：Pi RPC mode
```

不建议第一版直接自研 agent loop。

---

### 5.2 Pi Agent 能提供什么

Pi 是一个 minimal terminal coding harness，但其底层能力适合做本项目 agent sidecar 基座：

```text
AgentSession
AgentSessionRuntime
SessionManager
ModelRegistry
AuthStorage
SettingsManager
ResourceLoader
Extensions
Custom Tools
Skills
Prompt Templates
Compaction
RPC Mode
Event Streaming
Tool Lifecycle Hooks
Provider / Model abstraction
Thinking level control
```

这些能力正好对应第三步所需的 agent 基础设施。

---

### 5.3 使用 Pi SDK 的原因

Pi SDK 提供：

```text
createAgentSession()
createAgentSessionRuntime()
AgentSessionRuntime
SessionManager
ModelRegistry
AuthStorage
DefaultResourceLoader
defineTool()
customTools
extensions
skills
prompt templates
compaction
message queueing
agent events
```

这些使 `data-dyna-agent` 可以：

```text
嵌入式运行 agent；
绑定自定义工具；
控制模型和 thinking level；
持久化 session；
支持 fork / branch / compaction；
记录完整 agent_run；
在工具调用前后做安全拦截；
用 Zod / Typebox 校验工具输入输出；
在不同模型之间切换；
通过 events 记录 token/cost/latency。
```

---

### 5.4 使用 Pi RPC 的原因

Pi RPC mode 适合：

```text
非 Node.js 调用方；
需要进程隔离；
需要语言无关协议；
希望 agent sidecar 作为独立进程运行；
希望通过 JSONL 事件流观察 agent 执行过程。
```

RPC 支持：

```text
prompt
steer
follow_up
abort
new_session
get_state
get_messages
set_model
set_thinking_level
compact
get_session_stats
get_commands
extension_ui_request / response
```

MVP 如果 Core 和 Agent 都是 TypeScript，优先 SDK；如后续要隔离或多语言接入，再用 RPC。

---

## 6. 如何最大化使用 Pi Agent 特性

### 6.1 SessionManager：把经营分析变成可追溯 session

每次经营假设生成都应对应一个 Pi session 或 session branch。

推荐映射：

```text
store_id + opportunity_gap_id + agent_run_id -> pi session
```

用途：

```text
保存上下文；
保存 agent 推理过程；
保存 tool call / result；
支持复盘；
支持 fork 不同方案；
支持 audit；
支持后续重新生成。
```

Pi session tree 可以用于：

```text
同一个 opportunity_gap 下探索多个 hypothesis；
老板修改后 fork 新分支；
CS 人工介入后 fork 新分支；
复盘后回看当初生成建议的上下文。
```

---

### 6.2 Compaction：支持长期经营上下文

Pi 支持手动和自动 compaction。

在 `data-dyna-agent` 中用途：

```text
长期保存某门店经营对话和假设历史；
保留近期关键上下文；
压缩旧 session；
避免 prompt 超上下文；
保留完整 JSONL 历史用于审计。
```

自定义 compaction 要求：

```text
保留 restaurant_segment；
保留 opportunity_gap；
保留 accepted/rejected reasons；
保留 experiment outcome；
保留 merchant constraints；
保留 evidence refs；
压缩冗余讨论和重复解释。
```

可通过 Pi extension 的 `session_before_compact` 自定义摘要。

---

### 6.3 Extensions：把确定性边界嵌入 agent loop

Pi extensions 可以：

```text
注册 custom tools；
拦截 tool_call；
修改 tool_result；
注入 context；
自定义 compaction；
注册命令；
记录 agent events；
提供 UI confirm/select/input；
保存 extension state；
设置 status / widget；
```

`data-dyna-agent` 应实现 project-local extension：

```text
.pi/extensions/data-dyna-agent/index.ts
```

Extension 职责：

```text
注册少量高抽象工具；
禁止危险工具；
拦截任何执行型 tool；
在 before_agent_start 注入当前 run policy；
在 tool_call 校验参数；
在 tool_result 做 schema 校验和脱敏；
在 agent_end 保存 agent_run summary；
在 session_before_compact 生成领域摘要。
```

---

### 6.4 Custom Tools：少量高抽象工具，而不是无限商业动作工具

错误方向：

```text
create_coffee_coupon_tool
move_dessert_card_tool
create_breakfast_combo_tool
send_inactive_member_sms_tool
```

这些会把商业行为重新做成无限工具库。

正确方向：

```text
get_store_context(store_id)
get_peer_benchmark(store_id, metric_set)
get_opportunity_gaps(store_id)
get_similar_trajectories(gap_id)
get_merchant_constraints(store_id)
draft_experiment_plan(context)
validate_experiment_plan(plan)
submit_for_merchant_review(plan_id)
```

注意：

```text
submit_for_merchant_review 只提交审核，不执行菜单/券/价格变更。
真实执行由 mobile-hq 和确定性业务服务负责。
```

---

### 6.5 Skills：沉淀第三步分析方法

Pi skills 适合把稳定工作流压成可复用说明。

建议新增 project skill：

```text
.pi/skills/data-dyna-analysis-agent/SKILL.md
```

内容：

```text
何时触发第三步分析；
如何读取 context bundle；
如何识别 opportunity_gap；
如何生成 intervention_hypothesis；
如何输出 experiment_plan schema；
如何处理证据不足；
如何尊重 merchant constraints；
如何避免把建议说成确定结论。
```

Skills 用于引导 LLM 的方法论，不负责事实计算。

---

### 6.6 Prompt Templates：标准化 agent run 类型

建议新增 prompt templates：

```text
.pi/prompts/generate-experiment-plan.md
.pi/prompts/review-experiment-outcome.md
.pi/prompts/summarize-merchant-rejection.md
.pi/prompts/compare-similar-trajectories.md
```

用途：

```text
让不同 agent run 的 prompt 结构稳定；
减少系统提示散落；
便于评估；
便于人类 review。
```

---

### 6.7 Event Streaming：完整记录 agent 运行轨迹

Pi SDK / RPC 都支持事件流：

```text
agent_start
turn_start
message_update
tool_execution_start
tool_execution_end
turn_end
agent_end
extension_error
```

`data-dyna-agent` 应记录：

```text
model
thinking_level
token usage
cost
latency
tool calls
tool errors
validator result
final schema output
```

进入：

```text
agent_runs
agent_run_events
```

---

### 6.8 ModelRegistry / Thinking Level：区分生成和校验模型

Pi 支持多 provider / model registry / thinking level。

建议：

```text
hypothesis generation：高 reasoning 模型，thinking=medium/high
merchant explanation：低成本模型，thinking=off/low
review summary：中低成本模型
schema repair：低成本模型或 deterministic repair
```

不要把所有任务都交给同一个最高成本模型。

---

### 6.9 Fork / Branch：支持多方案探索

Pi session tree 可支持：

```text
同一 opportunity_gap 生成多个假设分支；
老板修改后 fork；
CS 改写后 fork；
复盘后回到原始分支分析为什么成功/失败。
```

这适合经营实验的多路径探索。

---

### 6.10 Extension UI / Confirm：开发期和运营期人工介入

Pi extension UI 支持：

```text
confirm
select
input
editor
notify
status
widget
```

开发期可用于：

```text
人工确认高风险 plan；
选择相似 trajectory；
输入 merchant constraint；
编辑 experiment_plan 草稿。
```

线上产品不一定使用 Pi TUI，但同一确认语义应映射到 `mobile-hq` merchant review。

---

## 7. data-dyna-agent 的安全边界

### 7.1 Agent tool policy

默认只开放 read / draft / validate / submit-review 工具。

禁止：

```text
直接写业务配置；
直接调用菜单变更接口；
直接调用发券接口；
直接调用改价接口；
直接写 evidence_records；
直接修改 orders / metrics / raw_events；
```

---

### 7.2 Output schema

Agent 输出必须符合 schema：

```text
intervention_hypothesis
experiment_plan
risk_notes
merchant_explanation
measurement_plan
evidence_refs
```

所有输出必须：

```text
Zod 校验；
引用真实 evidence_refs；
标注 confidence；
标注 uncertainty；
标注 requires_confirmation；
标注 rollback_supported；
```

---

### 7.3 Validator disposes

Validator 负责最终判定：

```text
accepted_for_merchant_review
needs_more_data
requires_human_review
blocked_by_policy
blocked_by_merchant_constraint
blocked_by_missing_guardrail
```

Agent 不能覆盖 validator。

---

## 8. 推荐 repo / package 结构

### 8.1 MVP 推荐结构

```text
data-dyna/
  apps/
    core-api/
      src/
        events/
        ingestion/
        projections/
        metrics/
        benchmark/
        opportunity-gap/
        effects/
        guardrails/
        evidence/
        agent-bridge/
    agent-api/
      src/
        pi-runtime/
        context-builder/
        hypothesis-generator/
        experiment-planner/
        validator-client/
        merchant-copy/
        agent-runs/
    worker/
      src/
        sync-orders/
        sync-rfm/
        build-projections/
        build-benchmarks/
        measure-effects/
  packages/
    event-contract/
    domain-schemas/
    db/
    pi-agent-tools/
    pi-agent-skills/
    llm-client/
    shared-types/
  .pi/
    extensions/
      data-dyna-agent/
        index.ts
    skills/
      data-dyna-analysis-agent/
        SKILL.md
    prompts/
      generate-experiment-plan.md
      review-experiment-outcome.md
  docs/
    roadmap/
    analyse/
    stack/
```

---

### 8.2 更简单 MVP 结构

如果初期不想拆 monorepo app：

```text
src/
  modules/
    events
    projections
    rfm
    benchmark
    opportunity-gap
    agent
    effects
    evidence
.pi/
  extensions/
  skills/
  prompts/
```

但逻辑边界必须保持：

```text
Core facts module 不引用 Agent hypothesis module 的非确定性输出作为事实。
Agent module 只能读取 context bundle 和写 draft/run log。
```

---

## 9. 最小 MVP 路线

### Phase 0：Data Core 骨架

```text
NestJS/Fastify
PostgreSQL
Zod Event Contract
raw_events
/events /events/batch
worker skeleton
```

---

### Phase 1：事实源接入

```text
小程序关键行为
POS/订单关键事实
mobile-hq adoption
Datamesh RFM 快照
```

---

### Phase 2：Profile + Benchmark

```text
store_profile
restaurant_segment
metric_snapshots
peer_benchmark
opportunity_gap
```

---

### Phase 3：Pi Agent Sidecar

```text
Pi SDK runtime
context bundle
custom tools
LLM hypothesis generation
structured experiment_plan
validator
agent_runs audit
custom compaction
```

---

### Phase 4：Merchant Acceptance

```text
mobile-hq 展示
accept / modify / reject
rejection_reason
applied / reverted
```

---

### Phase 5：Effect Review + Evidence

```text
before/after
guardrail
trajectory
evidence_record
```

---

## 10. 何时独立 sidecar 化

### MVP 早期

可以：

```text
同一个 repo
两个 app
同一个 PostgreSQL
SDK embedding
```

---

### 进入真实商户建议后

应拆成独立 sidecar：

```text
data-dyna-core
data-dyna-agent
```

原因：

```text
Agent 调用成本和延迟需要单独控制；
Agent prompt 和模型需要快速迭代；
Agent 输出需要单独审计；
Agent 失败不能影响 Data Core；
Agent 安全边界必须清晰；
未来可能替换不同 LLM / 多模型策略；
Pi extensions / skills / prompts 可独立热更新和版本化。
```

---

## 11. 不做什么

MVP 不做：

```text
Kafka / Flink / Spark
复杂 Lakehouse
一开始 ClickHouse
一开始向量数据库
重型 LangChain/LangGraph 编排
无限商业动作工具库
Agent 直接执行业务动作
Agent 直接写事实表
自研完整 agent runtime
重新计算第一版 RFM
```

理由：

```text
当前最关键是闭合 evidence loop；
不是堆组件；
也不是让 agent 拥有业务执行权。
```

---

## 12. 最终架构原则

```text
Data Core owns facts.
Pi Agent owns hypothesis generation.
Validator owns safety.
Merchant owns decision.
Evidence owns proof.
```

中文：

```text
事实归 Data Core；
假设归 Pi Agent；
安全归 Validator；
决策归老板；
证明归 Evidence Store。
```

最终一句话：

> `data-dyna` 应用一个确定性 Data Core 建立可信事实和同类 benchmark，再用 Pi Agent sidecar 最大化利用 session、tools、extensions、skills、prompts、compaction、model registry 和 event streaming，把 opportunity gap 转化为可验证、可审计、可复盘的经营实验。
