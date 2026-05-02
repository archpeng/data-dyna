# 中国独立咖啡厅 Data-First MVP Roadmap

状态：Roadmap SSOT v0.2  
日期：2026-05-02  
Owner：`data-dyna` product / architecture / data  
范围：先把数据闭环做成 MVP；AI/Agent 作为后置 sidecar 或外部服务，不作为 MVP 核心依赖。  
代码落地补充：三端采集边界以 `docs/roadmap/control-plane-data-core-integration-roadmap.md` v0.2 为准：小程序负责用户行为，POS 负责交易现场，`mobile-hq` 联邦项目族负责商户动作和采纳。

关联文档：

- `docs/roadmap/control-plane-data-core-integration-roadmap.md`
- `docs/exp/restaurant-intent-layer-thesis.md`
- `docs/roadmap/mvp-menu-growth-copilot-roadmap.md`
- `docs/roadmap/conversation-continuity-and-assistant-runtime.md`
- `docs/analyse/restaurant-saas-scaling-law-and-sales-data.md`
- `docs/analyse/independent-cafe-focused-scaling-law-feasibility.md`
- `docs/analyse/stack/independent-cafe-data-flywheel-minimal-stack.md`

---

## 0. 核心决策

`data-dyna` 的 MVP 第一阶段不做“AI 自动运营餐厅”，而是做 **Data-First 独立咖啡厅经营证据系统**。

MVP 核心不是聊天框，不是 Agent，不是大模型，而是这条数据闭环：

```text
微信小程序用户行为和意图
  + POS 交易现场和订单事实
  + mobile-hq 联邦项目族商户动作和采纳
  + 结果复盘
  + guardrail 副作用检查
  = 可验证、可复用、可销售的经营证据
```

代码落地边界：

```text
mini-homepage-h5/apps/mini-order：菜单、商品、购物车、checkout、推荐/券/渠道行为。
pos-lite-cashier/apps/pos-lite：收银会话、订单/支付/退款/取消/优惠/员工操作现场信号。
mobile-hq host + mainline/menu/report remotes：日报、证据、问题确认/忽略、动作卡接受/拒绝/应用/回滚、菜单/经营配置变更。
hq-bff-service / g-hq-orchestrator / 后端事实服务：订单、商品、门店、支付、退款、报表事实同步。
data-dyna：Event Contract、raw_events、projections、metrics、problem/action/effect/guardrail/evidence。
```

核心数据资产是六元组：

```text
restaurant_segment
+ problem_type
+ action_type
+ measured_outcome
+ guardrail_result
+ merchant_adoption
```

MVP 必须让系统回答：

```text
这是一家什么类型的独立咖啡厅？
它遇到了什么经营问题？
系统/商户采取了什么动作？
动作之后指标有没有变好？
有没有副作用？
老板是否真的采纳并持续使用？
```

AI 的定位：

```text
AI 是 sidecar：解释、总结、对话、建议包装、销售/CS 辅助。
AI 不是事实源，不替代指标计算，不负责无确认自动改配置。
```

---

## 1. MVP 边界

### 1.1 MVP 要做什么

Data-First MVP 要完成：

```text
独立咖啡厅门店画像
POS 订单/商品/会员/退款同步
微信小程序行为埋点
统一 Event Contract
raw_events 事件存储
核心指标计算
problem_type 识别
action_type 结构化记录
merchant_adoption 采集
measured_outcome 复盘
guardrail_result 检查
evidence_records 证据沉淀
基础经营日报 / 体检报告
PostHog 产品使用分析 sink
```

### 1.2 MVP 不做什么

MVP 明确不做：

```text
全行业餐饮分析
复杂大数据平台
实时流计算平台
完整自研 PostHog 替代品
多 Agent 自动运营系统
AI 自动改菜单 / 改价 / 发券
跨商户个人数据营销
广告网络
选址系统
供应链预测
严格因果推断平台
```

### 1.3 AI 不进入 MVP 核心路径

MVP 核心路径必须在没有 AI 的情况下也能运行：

```text
采集 -> 指标 -> 问题 -> 动作 -> 结果 -> guardrail -> adoption -> evidence
```

AI 可以在后续通过接口读取这些数据，负责解释和交互，但不能成为数据闭环的必需组件。

---

## 2. 技术选型原则

### 2.1 总原则

```text
少组件
强契约
自有核心数据
外接通用工具
先批处理，后实时
先复盘，后自动化
先单体，后拆分
AI 后置，数据先行
```

### 2.2 避免过度工程化

MVP 不引入：

```text
Kafka
Flink
Spark
复杂 Lakehouse
多套 OLAP
重型特征平台
复杂 workflow engine
多 Agent 框架
```

这些组件会增加工程复杂度，但不会直接提高早期独立咖啡厅客户价值。

---

## 3. 推荐技术栈

### 3.1 前端

#### 微信小程序

职责：

```text
点餐
菜单曝光
商品点击
详情页浏览
加购
支付
推荐曝光/点击
优惠券曝光/领取/使用
会员沉淀
渠道来源追踪
```

它是用户意图和可干预动作的核心入口。

#### SaaS Web 后台

职责：

```text
门店画像确认
经营日报
问题列表
建议/动作卡片
动作确认/拒绝
效果复盘
商户偏好
数据质量提示
```

技术建议：

```text
TypeScript + React/Next.js
```

如果已有 POS/后台技术栈，应优先复用现有前端基础，避免为 MVP 单独引入复杂前端架构。

### 3.2 后端

默认推荐：

```text
TypeScript + Node.js + Fastify + Zod + Drizzle/Prisma
```

选择原因：

```text
TypeScript 便于前后端共享事件类型；
Fastify 简洁、性能足够、魔法少；
Zod 适合 Event Contract 校验；
Drizzle/Prisma 提供类型化数据库访问；
对 AI coder 友好，边界清晰。
```

如果团队已经熟悉 NestJS，也可以采用 NestJS，但必须避免过深抽象和过早微服务化。

部署形态：

```text
清晰单体后端 Monolith
```

内部模块化，但部署先保持一个服务。

### 3.3 数据库

MVP 默认：

```text
PostgreSQL
```

用途：

```text
业务实体
raw_events
orders / menus / members
problems
actions
action_effects
guardrail_results
evidence_records
assistant_context_refs_optional
metric_snapshots
```

PostgreSQL 足够支撑 MVP，因为：

```text
独立咖啡厅早期事件量可控；
JSONB 可保存原始事件 properties；
SQL 适合计算指标和复盘；
事务可靠；
团队和 AI coder 熟悉；
避免过早引入 OLAP 复杂度。
```

未来触发条件：

```text
当 raw_events / 行为事件达到 PostgreSQL 查询和存储瓶颈，
再引入 ClickHouse / Doris / BigQuery 作为 OLAP。
```

### 3.4 异步任务

MVP 默认：

```text
PostgreSQL task table / pg-boss
```

或在已有 Redis 基础上使用：

```text
BullMQ
```

用途：

```text
POS 数据同步
PostHog 异步转发
每日指标计算
问题检测
动作效果复盘
guardrail 检查
天气/节假日/POI 数据同步
```

不建议 MVP 直接上 Kafka。

### 3.5 产品分析

继续使用：

```text
PostHog
```

定位：

```text
产品使用分析 sink
```

负责：

```text
日报打开率
证据查看率
action card 点击率
建议采纳漏斗
onboarding 漏斗
session replay
feature flag
```

不负责：

```text
核心经营事实
订单指标
动作效果复盘
evidence_records
```

### 3.6 AI / Agent

MVP 不内置复杂 AI。

只预留：

```text
AI Context API
Evidence Query API
Action Card Read API
Report Data API
```

未来 AI 服务可以是：

```text
独立 AI sidecar service
外部 ai-conversation / assistant service
LLM provider adapter
销售/CS Copilot
```

核心要求：

```text
AI 只能读取事实和生成解释/建议草稿；
AI 输出必须落到白名单 action_type；
AI 不直接写核心经营配置；
AI 不替代 Metrics Service；
AI 不生成无 evidence_refs 的结论。
```

---

## 4. 服务体系构建

MVP 单体后端内部划分为以下模块。

### 4.1 Event Contract Module

职责：

```text
定义事件名
定义事件属性 schema
定义事件版本
定义 source
定义必填 ID
```

所有事件必须通过：

```text
trackEvent(eventName, properties)
```

禁止业务代码直接：

```text
posthog.capture(...)
```

### 4.2 Event Ingestion Service

职责：

```text
接收 POS / 小程序 / Web 后台 / system 事件
校验 Event Contract
补齐 merchant_id / store_id / user_id / session_id
写入 raw_events
异步转发产品事件到 PostHog
记录校验失败事件
```

### 4.3 POS Sync Service

职责：

```text
同步订单
同步支付
同步退款/取消
同步商品和分类
同步会员
同步套餐/优惠
同步门店基础信息
```

MVP 可以先支持一个 POS/小程序体系，不做多 POS 全兼容。

### 4.4 Mini Program Tracking Service

职责：

```text
菜单曝光
商品点击
详情页浏览
加购/删除
checkout_start
payment_success
recommendation_exposed/clicked
coupon_exposed/claimed/used
channel_link_opened
```

### 4.5 Store Profile / Segment Service

职责：

```text
生成 restaurant_segment
保存商户确认信息
保存门店偏好
保存二级咖啡厅画像
```

独立咖啡厅 segment 示例：

```text
独立咖啡厅 / 写字楼 / 早咖强 / 咖啡+轻食
独立咖啡厅 / 社区 / 老客强 / 咖啡+烘焙
独立咖啡厅 / 街区打卡 / 周末强 / 特调+甜点
```

### 4.6 Metrics Service

职责：

```text
计算复购率
计算加购率
计算客单价
计算新品转化
计算时段指标
计算渠道转化
计算退款/取消
计算基础 guardrail
```

MVP 优先指标：

```text
7/14/30 天复购率
新客二购率
甜点/烘焙/轻食加购率
早咖订单占比
下午茶客单价
新品点击加购率
渠道转化率
退款率
取消率
优惠成本
```

### 4.7 Problem Detection Service

职责：

```text
基于指标和规则生成 problem_id
标记 problem_type
记录检测依据
记录 confidence
允许商户确认或忽略
```

MVP 优先 problem_type：

```text
repeat_purchase_low
new_customer_second_purchase_low
coffee_dessert_addon_low
coffee_bakery_addon_low
coffee_lightmeal_addon_low
breakfast_conversion_low
afternoon_aov_low
low_peak_utilization_low
new_product_conversion_low
member_capture_low
channel_conversion_unclear
```

### 4.8 Action Registry / Action Service

职责：

```text
定义 action_type 白名单
生成 action_card
记录建议、查看、接受、拒绝、应用、回滚
绑定 target_metric 和 guardrail_metrics
```

MVP 优先 action_type：

```text
coffee_dessert_bundle
coffee_bakery_bundle
coffee_lightmeal_bundle
breakfast_combo_promotion
afternoon_tea_combo
new_product_trial_coupon
repeat_purchase_reminder
inactive_member_coupon
milk_upgrade_recommendation
extra_shot_recommendation
weather_based_recommendation
low_peak_limited_coupon
channel_specific_coupon
```

### 4.9 Effect Review Service

职责：

```text
根据 action_id 计算 before/after
生成 action_effects
标记 sample_size
标记 confidence
输出 effect review
```

MVP 对比方式：

```text
动作前 14 天 vs 动作后 14 天
上周同日 vs 本周同日
同一时段 before/after
有条件再做 A/B
```

### 4.10 Guardrail Service

职责：

```text
检查主指标提升是否带来副作用
生成 guardrail_results
```

MVP guardrail：

```text
退款率
取消率
客单价下降
优惠成本
招牌品销量下降
等待时间 optional
差评/投诉 optional
毛利 optional
```

### 4.11 Evidence Service

职责：

```text
聚合六元组
生成 evidence_record
标记是否可复用
为销售/CS/playbook/benchmark 提供数据
```

每条 evidence_record 必须包含：

```text
restaurant_segment
problem_type
action_type
measured_outcome_json
guardrail_result_json
merchant_adoption_json
confidence
sample_size
baseline_window
measurement_window
merchant_id
store_id
action_id
```

### 4.12 Reporting Service

职责：

```text
生成 14 天增长体检报告
生成每日/每周数据摘要
展示问题、动作、复盘和证据
```

MVP 报告先用确定性模板，不依赖 AI。

### 4.13 AI Context API（预留）

职责：

```text
向未来 AI sidecar 提供只读上下文
```

接口示例：

```text
GET /ai-context/stores/{store_id}/summary
GET /ai-context/problems/{problem_id}
GET /ai-context/actions/{action_id}
GET /ai-context/evidence/{evidence_id}
```

AI 通过这些 API 读取事实，不直接访问底层数据库。

---

## 5. 最小数据模型

### 5.1 raw_events

```text
event_id
event_name
event_version
merchant_id
store_id
user_id_optional
anonymous_id_optional
session_id_optional
entity_type_optional
entity_id_optional
properties_json
source: pos | mini_program | web_admin | system
occurred_at
received_at
validation_status
```

### 5.2 store_profiles

```text
merchant_id
store_id
city
business_area_type
cafe_sub_type
avg_order_value_band
daily_order_volume_band
mini_program_order_ratio_band
peak_periods
signature_items
not_discount_items
not_hide_items
brand_tone_preference
segment_confirmed_at
```

### 5.3 orders / order_items

```text
order_id
merchant_id
store_id
member_id_optional
source
status
payment_status
refund_status
total_amount
discount_amount
paid_amount
order_time
completed_at_optional

order_item_id
order_id
item_id
category_id
quantity
unit_price
discount_amount
```

### 5.4 menus / items

```text
menu_id
menu_version_id
store_id
active_from
active_to_optional

item_id
store_id
category_id
name
item_type
price
is_signature
is_discount_allowed
is_active
```

### 5.5 members

```text
member_id
merchant_id
store_id_optional
first_order_at
last_order_at
order_count
total_paid_amount
```

### 5.6 problems

```text
problem_id
merchant_id
store_id
problem_type
source
metric
baseline_value
benchmark_value_optional
confidence
status: detected | confirmed | dismissed | resolved
created_at
```

### 5.7 actions

```text
action_id
problem_id
merchant_id
store_id
action_type
title
target_metric
guardrail_metrics_json
status: created | viewed | accepted | rejected | applied | reverted | measured
requires_confirmation
rollback_supported
created_by
created_at
applied_at_optional
rejected_reason_optional
```

### 5.8 action_effects

```text
effect_id
action_id
primary_metric
baseline_window
measurement_window
before_value
after_value
delta
sample_size
confidence
created_at
```

### 5.9 guardrail_results

```text
guardrail_result_id
action_id
guardrails_json
status: ok | watch | bad | insufficient_data
created_at
```

### 5.10 evidence_records

```text
evidence_id
restaurant_segment
problem_type
action_type
measured_outcome_json
guardrail_result_json
merchant_adoption_json
confidence
sample_size
baseline_window
measurement_window
merchant_id
store_id
action_id
created_at
reusable_candidate
```

---

## 6. Roadmap 推进步骤

## Phase 0：数据契约和项目骨架

目标：统一事件口径，建立 AI-coder-friendly 的最小工程边界。

产物：

```text
Event Contract 文档
Events 枚举
Zod schema
trackEvent SDK 设计
PostgreSQL schema 初稿
后端单体模块边界
PostHog adapter 边界
```

完成标准：

```text
每个事件都有 name/version/source/required fields；
前端/小程序不直接调用 PostHog；
所有事件都能进入 raw_events；
所有核心实体有 ID 规范。
```

## Phase 1：POS + 小程序数据进入系统

目标：拿到交易事实和用户意图。

产物：

```text
POS order/menu/member sync
mini program behavior tracking
raw_events ingestion
orders/order_items/items/members 基础表
store_profiles 基础表
```

完成标准：

```text
能重建单店一天订单；
能重建小程序菜单漏斗；
能关联 session -> cart -> order；
能区分 POS/source/mini_program/web_admin 事件。
```

## Phase 2：独立咖啡厅核心指标

目标：能看见问题。

产物：

```text
复购指标
加购/组合指标
时段经营指标
新品指标
渠道指标
退款/取消/优惠成本 guardrail
metric_snapshots
基础经营日报
```

完成标准：

```text
能展示 7/14/30 天复购；
能展示甜点/烘焙/轻食加购率；
能展示早咖/下午茶/周末表现；
能展示新品转化；
能展示渠道转化；
能展示基础 guardrail。
```

## Phase 3：问题识别和商户确认

目标：把指标异常变成标准 problem_type。

产物：

```text
problem detection rules
problems 表
problem_confirmed / dismissed 事件
problem 列表 UI
```

完成标准：

```text
系统能生成 problem_id；
每个 problem 有 problem_type、指标依据、confidence；
商户能确认/忽略问题；
确认/忽略会写入 merchant_adoption。
```

## Phase 4：动作卡片和采纳数据

目标：把建议变成结构化动作，而不是散文建议。

产物：

```text
action_type 白名单
action_card
actions 表
action_card_viewed/accepted/rejected/applied/reverted 事件
rejection_reason
```

完成标准：

```text
每个 action 有 action_id；
每个 action 绑定 problem_id；
每个 action 绑定 target_metric 和 guardrail_metrics；
每个 action 有确认状态；
每个 action 能被后续复盘。
```

## Phase 5：效果复盘和 guardrail

目标：证明动作是否有用，并检查副作用。

产物：

```text
action_effects
guardrail_results
effect_review UI
confidence level
sample_size 标记
```

完成标准：

```text
能对一个 action 计算 before/after；
能标记样本量和证据强弱；
能展示主指标变化；
能展示退款/取消/客单/优惠成本等 guardrail；
数据不足时明确提示 insufficient_data。
```

## Phase 6：Evidence Store 和销售/CS 资产

目标：让每次有效动作沉淀成可复用证据。

产物：

```text
evidence_records
playbook_candidate 标记
14 天增长体检报告
销售案例导出
CS 客户健康视图
```

完成标准：

```text
每条 evidence_record 包含完整六元组；
能按 restaurant_segment/problem_type/action_type 查询证据；
能筛选高 confidence、高 adoption 的案例；
能输出客户可读的体检/复盘报告。
```

## Phase 7：AI sidecar 接口预留

目标：为未来 AI 服务提供只读事实接口，但不让 AI 成为核心依赖。

产物：

```text
AI Context API
report data API
evidence query API
action card read API
permission boundary
```

完成标准：

```text
AI 服务可读取 summary/problem/action/evidence；
AI 无权直接改菜单、发券、改价；
AI 输出若要写入系统，必须转成 action_card 草稿并由人确认；
核心数据闭环不依赖 AI 服务可用性。
```

---

## 7. 最终 MVP 能力目标

MVP 完成后，`data-dyna` 应具备以下能力。

### 7.1 对商户

独立咖啡厅老板可以看到：

```text
我的店属于哪类咖啡厅；
最近 7/14/30 天复购是否健康；
甜点/烘焙/轻食加购是否偏低；
早咖、下午茶、周末哪个时段有机会；
新品/特调是否只是被看、没有被买；
哪个渠道带来访问但没有转化；
系统建议我做什么动作；
动作之后有没有效果；
有没有伤害退款、取消、优惠成本、客单价；
我是否要继续这个动作。
```

### 7.2 对 SaaS 公司

团队可以看到：

```text
哪些独立咖啡厅 segment 最适合销售；
哪些 problem_type 最常见；
哪些 action_type 胜率最高；
哪些动作副作用最大；
哪些商户采纳率最高；
哪些客户可能续费/扩店；
哪些证据可以进入销售案例；
哪些 playbook 值得产品化。
```

### 7.3 对未来 AI 服务

未来 AI 可以读取：

```text
store summary
problem evidence
action history
effect review
guardrail result
merchant preferences
evidence records
```

然后提供：

```text
人话解释
连续追问
日报总结
建议卡片文案
复盘总结
销售/CS 辅助
```

但 AI 不影响 MVP 数据闭环独立运行。

---

## 8. MVP 验收标准

MVP 不是功能堆满，而是能完成一个完整经营证据闭环。

最低验收：

```text
1. 至少接入 1 个 POS/订单来源；
2. 至少接入 1 个微信小程序行为来源；
3. 至少支持 1 个独立咖啡厅 segment；
4. 至少支持 5 个 problem_type；
5. 至少支持 5 个 action_type；
6. 至少能对 1 个 action 做 before/after 复盘；
7. 至少有 3 个 guardrail 指标；
8. 至少记录 saw/accepted/applied/reviewed 四级 merchant_adoption；
9. 至少生成 1 条完整 evidence_record；
10. 不依赖 AI 也能生成经营体检和效果复盘。
```

推荐 MVP 首批 problem_type：

```text
repeat_purchase_low
coffee_dessert_addon_low
breakfast_conversion_low
afternoon_aov_low
new_product_conversion_low
```

推荐 MVP 首批 action_type：

```text
coffee_dessert_bundle
coffee_lightmeal_bundle
breakfast_combo_promotion
afternoon_tea_combo
new_product_trial_coupon
```

推荐 MVP 首批 guardrail：

```text
refund_rate
cancel_rate
AOV_drop / discount_cost
```

---

## 9. 关键风险和控制

| 风险 | 表现 | 控制 |
|---|---|---|
| 过早 AI 化 | 先做聊天框，缺少事实 | 数据闭环先行，AI 只读 facts |
| 事件口径漂移 | 同一事件多种字段 | Event Contract + schema 校验 |
| PostHog 变事实源 | 核心指标靠 PostHog 拼 | raw_events + evidence_records 自有 |
| 样本量不足 | 小店波动大 | 14/30 天窗口 + confidence level |
| 动作不可复盘 | 建议没有 action_id | 所有建议必须 action_card 化 |
| guardrail 缺失 | 主指标好但副作用未知 | 每个 action 至少绑定 3 个 guardrail |
| 商户不采纳 | 看了但不敢用 | confirmation-first + rejection_reason |
| 交付过重 | 每家店定制 | 先聚焦独立咖啡厅二级 segment |
| 技术过重 | 上 Kafka/Flink/多服务 | PostgreSQL + 单体 + worker 起步 |

---

## 10. 后续扩展边界

### 10.1 何时引入 OLAP

触发条件：

```text
PostgreSQL raw_events 查询明显变慢；
事件量超过单库分析能力；
需要跨大量门店复杂聚合；
需要准实时大屏或高频实验分析。
```

候选：

```text
ClickHouse
Doris
BigQuery
```

### 10.2 何时引入 AI sidecar

触发条件：

```text
已有稳定 metrics/problem/action/evidence；
商户需要更自然解释；
销售/CS 需要自动匹配案例；
日报模板表达不足；
用户开始大量追问。
```

AI 第一批能力：

```text
日报人话解释
复盘总结
建议卡片文案
商户偏好记忆
销售案例匹配
```

### 10.3 何时引入自动执行

触发条件：

```text
某些 action_type 已有高 confidence evidence；
guardrail 长期安全；
商户多次重复采纳；
rollback 成熟；
权限和审计完善。
```

即使进入自动执行，也应从：

```text
自动生成草稿
```

开始，而不是直接自动改经营配置。

---

## 11. 最终判断

`data-dyna` 的第一个真正 MVP 应该是：

> 中国独立咖啡厅 Data-First 经营证据系统。

它的最终 MVP 能力不是“AI 会聊天”，而是：

```text
稳定采集 POS 和小程序数据；
标准化独立咖啡厅 segment/problem/action；
计算核心经营指标；
记录商户动作和采纳；
复盘动作结果和副作用；
沉淀 evidence_record；
输出可读的 14 天增长体检和效果复盘；
为未来 AI sidecar 提供事实接口。
```

一句话：

> 先把“数据 -> 问题 -> 动作 -> 结果 -> 副作用 -> 采纳 -> 证据”跑通，再让 AI 来解释和放大这个闭环。
