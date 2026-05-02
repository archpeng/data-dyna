# 中国独立咖啡厅 SaaS 核心数据飞轮与最简技术栈分析

状态：SSOT 分析稿 v0.1  
日期：2026-05-02  
关联文档：

- `docs/exp/restaurant-intent-layer-thesis.md`
- `docs/roadmap/mvp-menu-growth-copilot-roadmap.md`
- `docs/roadmap/conversation-continuity-and-assistant-runtime.md`
- `docs/analyse/restaurant-saas-scaling-law-and-sales-data.md`
- `docs/analyse/independent-cafe-focused-scaling-law-feasibility.md`

## 0. 核心结论

对于一个聚焦“中国独立咖啡厅”的 SaaS，技术栈不应该围绕“大数据平台”或“全能 AI Agent”来设计，而应该围绕一个最小、可验证、可复制的数据飞轮来设计：

```text
POS 交易事实
+ 微信小程序用户意图
+ 商户动作
+ 结果复盘
+ guardrail 检查
+ 商户采纳
= 可销售、可复用、可验证的经营证据
```

最核心的数据资产仍然是六元组：

```text
restaurant_segment
+ problem_type
+ action_type
+ measured_outcome
+ guardrail_result
+ merchant_adoption
```

技术上的核心原则：

> 不要一开始自研完整 PostHog，也不要把核心经营证据完全放进 PostHog。应该自建极简业务事件层，把 PostHog 当作可替换的产品分析 sink。

推荐架构一句话：

```text
自建业务事件层 + 自有 Evidence Store + PostHog 做产品分析 + LLM 做解释/编排/对话，不做事实源。
```

---

# 1. 产品埋点是否继续使用 PostHog？

## 1.1 建议继续使用，但要限定位置

PostHog 值得继续使用，尤其适合：

```text
产品使用分析
页面路径
漏斗
留存
feature flag
A/B test
session replay
用户分群
商户使用行为分析
```

在当前独立咖啡厅 SaaS 中，PostHog 最适合分析 `merchant_adoption`：

```text
daily_report_opened
evidence_viewed
action_card_viewed
action_card_accepted
action_card_rejected
action_card_applied
action_card_reverted
effect_review_viewed
followup_question_asked
team_member_invited
```

它能回答：

```text
老板有没有打开日报？
有没有看证据？
建议卡片有没有被点？
哪个功能没人用？
哪个 onboarding 步骤流失？
哪个版本 action card 更容易被采纳？
```

这些是通用产品分析工具的强项。

## 1.2 不建议只用 PostHog 承担核心业务数据

PostHog 不应该成为 `data-dyna` 的核心业务数据仓库。

原因是 `data-dyna` 最核心的问题不是：

```text
用户有没有点击某个按钮？
```

而是：

```text
写字楼独立咖啡厅中，
早咖客单价低的问题，
使用咖啡+轻食组合推荐后，
14 天内客单价提升多少，
等待和退款有没有恶化，
老板是否持续采纳？
```

这类问题需要严肃关联：

```text
订单
商品
菜单版本
会员
优惠券
推荐
动作
实验
退款
复购
商户采纳
```

这些应该进入自有业务库和 Evidence Store，而不是只存在 PostHog 的 event properties 里。

## 1.3 不建议完全自研通用埋点平台

在 vibe coding 时代，自研一个简单事件接口很容易，但运营一套可靠 analytics 平台不简单。

完全自研会很快遇到：

```text
事件 schema 管理
前后端 SDK
离线缓存
重试去重
匿名用户合并
漏斗计算
留存计算
路径分析
权限
看板
导出
feature flag
A/B test
session replay
数据质量监控
```

这些不是 `data-dyna` 的核心壁垒。

真正壁垒是：

```text
独立咖啡厅经营证据库
```

所以不要重造 PostHog，应该重造的是属于餐饮经营的 evidence layer。

---

# 2. 最推荐的埋点架构

## 2.1 总体结构

```text
POS / 微信小程序 / SaaS 后台 / Assistant
  ↓
统一 trackEvent() / Event SDK
  ↓
Event Contract 校验
  ↓
Event Ingestion API
  ↓
Business Event Store
  ├── Evidence Store
  ├── Metrics Views
  └── PostHog Sink
```

关键边界：

```text
Event Contract 是入口；
Business Event Store 是原始事实；
Evidence Store 是核心资产；
PostHog 是产品分析工具；
LLM 是解释和编排层。
```

## 2.2 不允许的模式

不建议：

```text
前端各处直接 posthog.capture()
后端各处散落 JSON 事件
事件名没有枚举
属性没有 schema
业务指标靠 PostHog 临时拼
没有 action_id / problem_id / store_id
没有事件版本
没有数据质量检查
```

这种模式短期快，长期会导致：

```text
AI coder 不知道事件含义
事件字段漂移
指标口径不一致
无法复盘动作结果
无法沉淀 playbook
无法形成销售证据
```

## 2.3 推荐的模式

推荐：

```text
所有事件只能通过 trackEvent()
事件名集中定义
属性类型集中定义
业务事件和产品事件分层
所有 problem 有 problem_id
所有 action 有 action_id
所有 effect 有 effect_id
PostHog 只是 sink，不是领域模型
```

这更适合 vibe coding，因为 AI coder 可以在清晰边界内修改，不会随意破坏数据口径。

---

# 3. 事件分层：产品事件和业务事件必须分开

## 3.1 产品事件：主要给 PostHog

产品事件描述“商户如何使用 SaaS”。

示例：

```text
daily_report_opened
evidence_viewed
action_card_viewed
action_card_accepted
action_card_rejected
action_card_applied
action_card_reverted
effect_review_viewed
followup_question_asked
team_member_invited
```

主要用途：

```text
商户采纳度
功能使用
留存
试用转化
客户成功介入
onboarding 优化
销售转化分析
```

这些事件可以进入：

```text
Business Event Store
+ PostHog
```

## 3.2 业务事件：必须进入自有业务库

业务事件描述“咖啡厅经营发生了什么”。

示例：

```text
order_created
payment_success
refund_completed
item_impression
item_click
add_to_cart
checkout_start
recommendation_exposed
recommendation_clicked
coupon_used
menu_ranking_changed
action_applied
experiment_assigned
```

主要用途：

```text
菜单漏斗
复购计算
加购计算
动作效果复盘
guardrail 检查
六元组 evidence
playbook 形成
```

这些事件不能只放 PostHog，必须进入自有业务库。

---

# 4. 围绕六元组的最小事件设计

## 4.1 restaurant_segment

`restaurant_segment` 不是一个普通点击事件，而是商户/门店画像。

事件：

```text
merchant_onboarded
store_profile_updated
segment_inferred
segment_confirmed
```

核心属性：

```json
{
  "merchant_id": "m_001",
  "store_id": "s_001",
  "segment": "independent_cafe_office_breakfast_lightmeal",
  "city": "杭州",
  "business_area_type": "office",
  "avg_order_value_band": "25_45",
  "daily_order_volume_band": "100_300",
  "mini_program_order_ratio_band": "high",
  "peak_periods": ["breakfast", "afternoon"],
  "confirmed_by": "merchant"
}
```

来源：

```text
POS 自动计算
小程序行为
公开 POI / 天气 / 商圈
商户 onboarding
销售/CS 人工确认
```

## 4.2 problem_type

事件：

```text
problem_detected
problem_confirmed
problem_dismissed
```

核心属性：

```json
{
  "problem_id": "p_001",
  "merchant_id": "m_001",
  "store_id": "s_001",
  "problem_type": "coffee_dessert_addon_low",
  "detection_source": "metric_rule",
  "metric": "addon_rate_dessert",
  "baseline_value": 0.082,
  "benchmark_value": 0.145,
  "confidence": "medium"
}
```

独立咖啡厅优先问题：

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

## 4.3 action_type

事件：

```text
action_card_created
action_card_viewed
action_card_accepted
action_card_rejected
action_applied
action_reverted
```

核心属性：

```json
{
  "action_id": "act_001",
  "problem_id": "p_001",
  "action_type": "coffee_dessert_bundle",
  "merchant_id": "m_001",
  "store_id": "s_001",
  "target_metric": "addon_rate_dessert",
  "guardrail_metrics": ["refund_rate", "avg_wait_time", "AOV"],
  "requires_confirmation": true
}
```

独立咖啡厅优先动作：

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

## 4.4 measured_outcome

这不是简单埋点，而是动作后的计算结果。

事件 / 表：

```text
action_effect_measured
```

核心属性：

```json
{
  "effect_id": "eff_001",
  "action_id": "act_001",
  "primary_metric": "addon_rate_dessert",
  "baseline_window": "2026-05-01/2026-05-14",
  "measurement_window": "2026-05-15/2026-05-28",
  "before_value": 0.082,
  "after_value": 0.127,
  "delta": 0.045,
  "sample_size": 420,
  "confidence": "medium"
}
```

优先 outcome：

```text
7/14/30 天复购率变化
新客二购率变化
甜点/烘焙/轻食加购率变化
客单价变化
早咖订单占比变化
下午茶客单价变化
新品首购率变化
新品复购率变化
渠道转化率变化
```

## 4.5 guardrail_result

事件 / 表：

```text
guardrail_measured
```

核心属性：

```json
{
  "action_id": "act_001",
  "guardrails": [
    {
      "metric": "refund_rate",
      "before": 0.012,
      "after": 0.011,
      "status": "ok"
    },
    {
      "metric": "avg_wait_time",
      "before": 6.8,
      "after": 7.1,
      "status": "watch"
    }
  ]
}
```

优先 guardrail：

```text
refund_rate
cancel_rate
bad_review_rate
avg_wait_time_optional
discount_cost
AOV_drop
signature_item_sales_drop
inventory_waste_optional
gross_margin_optional
customer_complaint_optional
```

## 4.6 merchant_adoption

事件：

```text
daily_report_opened
evidence_viewed
action_card_viewed
action_card_accepted
action_card_rejected
action_card_applied
effect_review_viewed
followup_question_asked
```

核心属性：

```json
{
  "merchant_id": "m_001",
  "store_id": "s_001",
  "user_id": "u_001",
  "role": "owner",
  "action_id": "act_001",
  "problem_id": "p_001",
  "adoption_stage": "accepted"
}
```

adoption 分层：

```text
saw: 看到了
understood: 看懂了
trusted: 看了依据并认可
accepted: 接受建议
applied: 应用动作
reviewed: 看了复盘
repeated: 再次使用同类动作
paid: 付费、续费、升级或扩店
```

---

# 5. 最简技术栈建议

## 5.1 第一阶段不要上复杂大数据栈

MVP 阶段不要一开始引入：

```text
Kafka
Flink
Spark
复杂 Lakehouse
多套 OLAP
重型特征平台
复杂 Agent 编排框架
多向量数据库
```

这些会让系统变重，而且不直接增加独立咖啡厅早期客户价值。

第一阶段目标不是支撑亿级事件，而是：

```text
稳定采集事件
统一口径
产生第一批 action -> outcome 证据
让销售可以拿证据成交
让客户可以看见复盘
```

## 5.2 推荐 MVP 技术栈

### 前端 / 小程序

```text
微信小程序：用户点餐、行为采集、推荐/券/菜单干预
SaaS Web 后台：老板日报、建议卡片、复盘、配置
统一 trackEvent SDK：小程序和 Web 共用事件契约
```

### 后端

建议用一个清晰单体后端，而不是微服务：

```text
Backend Monolith
  - Auth / Merchant / Store
  - Event Ingestion
  - Order / Menu / Member Sync
  - Metrics Service
  - Recommendation Service
  - Assistant Runtime
  - Action Executor
  - Evidence Service
```

单体优点：

```text
边界少
调试简单
AI coder 更容易理解
避免分布式复杂性
早期交付更快
```

### 数据库

第一阶段推荐：

```text
PostgreSQL
```

用途：

```text
业务实体表
事件表
订单/菜单/会员表
action 表
evidence 表
metric snapshot 表
JSONB 存原始事件 properties
物化视图/定时任务计算指标
```

为什么先用 PostgreSQL：

```text
足够简单
事务可靠
查询能力强
AI coder 熟悉
可以同时承载 OLTP 和中小规模分析
避免过早拆分
```

当事件量显著增长后，再引入：

```text
ClickHouse / BigQuery / Doris 等 OLAP
```

不要一开始就上。

### 队列 / 异步任务

第一阶段可以使用：

```text
数据库任务表 + cron/worker
```

或者轻量队列：

```text
BullMQ / Redis Queue / 云厂商队列
```

用途：

```text
异步写 PostHog
定时计算日报
定时计算 action effect
同步公开天气/节假日/POI 数据
发送会员提醒草稿
```

不建议第一阶段直接上 Kafka。

### 产品分析

```text
PostHog
```

用途：

```text
产品漏斗
日报打开
建议卡片点击
商户留存
feature flag
session replay
```

但必须通过内部 adapter 写入，不允许业务代码直接依赖 PostHog。

### AI / LLM

```text
LLM Provider Adapter
Prompt Templates
Context Builder
Tool/Action Whitelist
Response Schema Validation
```

不要一开始构建复杂 multi-agent 系统。

## 5.3 最小数据表建议

### raw_events

保存所有标准事件。

```text
event_id
event_name
event_version
merchant_id
store_id
user_id_optional
anonymous_id_optional
session_id_optional
entity_type
entity_id
properties_json
source: pos | mini_program | web_admin | assistant | system
occurred_at
received_at
```

### stores / store_profiles

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

### problems

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

### actions

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
```

### action_effects

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

### guardrail_results

```text
guardrail_result_id
action_id
guardrails_json
status: ok | watch | bad | insufficient_data
created_at
```

### evidence_records

这是核心资产表。

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
```

### assistant_conversations / assistant_messages

```text
conversation_id
merchant_id
store_id
user_id
active_problem_id_optional
active_action_id_optional
created_at

message_id
conversation_id
role
content
context_refs_json
created_at
```

---

# 6. 核心数据飞轮如何运行

## 6.1 每日最小闭环

```text
1. 小程序/POS 采集行为和订单
2. 后端定时计算门店指标
3. 系统识别 1–3 个 problem_type
4. 生成 action_card 草稿
5. AI 用人话解释问题和建议
6. 老板查看证据并决定是否采纳
7. 商户应用动作或生成草稿
8. 系统绑定 action_id 追踪后续结果
9. 7/14/30 天后生成 effect review
10. 形成 evidence_record
```

## 6.2 证据如何转化为销售资产

每条 evidence_record 都可以进入：

```text
playbook 库
销售案例库
benchmark 样本
客户成功复盘
续费材料
ROI calculator
```

示例：

```text
独立咖啡厅 / 写字楼 / 早咖强
problem: 早咖客单价低
action: 咖啡+轻食组合推荐
outcome: 早咖客单价 +3.8 元，轻食加购率 +6.2pp
guardrail: 等待无明显上升，退款无变化
adoption: 老板采纳并连续使用 14 天
```

这就是飞轮的基本颗粒。

---

# 7. AI 在这里的作用

## 7.1 AI 不是事实源

AI 不应该负责直接判断：

```text
这个动作一定有效
这个原因一定正确
这个菜单一定要改
这个用户一定要发券
```

事实来源应该是：

```text
POS
微信小程序
业务数据库
指标计算
动作日志
复盘结果
```

AI 的输出必须基于 Context Builder 提供的事实和允许动作。

## 7.2 AI 的第一作用：解释层

AI 最重要的短期价值是把复杂指标解释成人话。

例如把：

```text
addon_rate_dessert 从 8.2% 低于同类中位 14.5%，
下午茶时段曝光点击正常，但点击后加购低。
```

解释成：

```text
你的甜点不是没人看，而是用户点开后没有下单。问题可能不在曝光，而在组合方式、价格心理或图片/描述。建议先试 14 天“咖啡+甜点组合”，不要直接大幅打折。
```

这对独立咖啡厅老板非常重要。

## 7.3 AI 的第二作用：对话连续性

AI 要记住：

```text
这家店是社区型还是写字楼型
老板不想打价格战
招牌品不能随便降价
当前目标是提升 14 天复购
上次动作是什么
上次复盘结果如何
```

所以 Assistant Runtime 要围绕：

```text
session continuity
store continuity
goal continuity
action continuity
review continuity
```

AI 不是一次性问答，而是经营陪跑。

## 7.4 AI 的第三作用：建议生成和 action card 编排

AI 可以把指标诊断转成结构化建议卡。

但必须受限于 action_type 白名单。

例如允许生成：

```text
coffee_dessert_bundle
repeat_purchase_reminder
new_product_trial_coupon
low_peak_limited_coupon
```

不允许生成：

```text
偷偷改价
无确认自动发券
识别谁愿意多付钱并涨价
跨店个人数据营销
```

AI 生成建议后，应输出结构化 action card，而不是只输出长文本。

## 7.5 AI 的第四作用：销售和客户成功 Copilot

AI 不只服务商户，也服务 SaaS 自己。

它可以帮助销售/CS 回答：

```text
这个客户像哪类成功客户？
他最可能被哪个案例打动？
试用 7 天是否进入价值闭环？
为什么他没有采纳建议？
他是否有流失风险？
是否适合做案例？
是否适合推多店？
```

这部分可以基于：

```text
merchant_adoption
evidence_records
CRM notes
product usage
```

## 7.6 AI 的第五作用：数据质量和运营异常解释

AI 可以辅助发现：

```text
某个门店数据突然缺失
事件口径异常
小程序曝光事件没有上报
POS 订单和小程序支付对不上
某个 action 没有绑定 outcome
某个 guardrail 数据不足
```

但最终校验仍应由规则和任务系统执行。

---

# 8. AI 不应该做什么

AI 不应该：

```text
替代指标计算
替代数据库事实
无证据做因果判断
无确认修改菜单/价格/优惠
跨店使用个人数据做营销
输出不可追踪的建议
直接写入核心配置而无 action_id
```

每个 AI 建议必须满足：

```text
有 problem_id
有 action_type
有 evidence refs
有 target metric
有 guardrail metrics
有 confirmation rule
有 rollback policy
```

---

# 9. 分阶段构建路线

## 9.1 Phase 0：事件契约和最小数据层

目标：让事件可控。

产物：

```text
统一 Events 枚举
trackEvent SDK
Event Ingestion API
raw_events 表
PostHog adapter
基础 store_profile
```

不要做复杂 AI。

## 9.2 Phase 1：咖啡厅核心指标和日报

目标：能看见问题。

产物：

```text
复购指标
加购/组合指标
时段指标
新品指标
渠道指标
每日经营日报
problem_detected
```

AI 作用：解释日报。

## 9.3 Phase 2：建议卡片和动作日志

目标：能干预。

产物：

```text
action_card
actions 表
action_applied / rejected / reverted
menu / coupon / recommendation draft
confirmation first
```

AI 作用：把指标转成商户能理解的建议卡。

## 9.4 Phase 3：效果复盘和 guardrail

目标：能验证。

产物：

```text
action_effects
guardrail_results
effect_review
confidence level
evidence_records
```

AI 作用：解释效果和不确定性。

## 9.5 Phase 4：playbook 和销售资产

目标：能复制。

产物：

```text
playbook library
same-segment benchmark
sales case generator
ROI calculator
CS risk dashboard
```

AI 作用：帮助销售和客户成功匹配案例、生成复盘、识别扩店和流失机会。

---

# 10. 最小可行架构图

```text
[POS]
  -> order/payment/refund/member/menu sync

[微信小程序]
  -> item_impression/item_click/add_to_cart/checkout/recommendation/coupon

[SaaS Web]
  -> daily_report/action_card/effect_review/adoption events

           ↓ trackEvent / sync

[Event Ingestion API]
  -> validate Event Contract
  -> write raw_events
  -> async send product events to PostHog

           ↓

[PostgreSQL]
  - raw_events
  - stores / store_profiles
  - orders / menus / members
  - problems
  - actions
  - action_effects
  - guardrail_results
  - evidence_records
  - assistant_conversations

           ↓ scheduled jobs

[Metrics Service]
  -> daily metrics
  -> problem detection
  -> action effect measurement
  -> guardrail measurement

           ↓

[Assistant Runtime]
  -> Context Builder
  -> LLM explanation
  -> structured action_card
  -> conversation continuity

           ↓

[Merchant UI]
  -> daily report
  -> evidence
  -> action card
  -> apply/reject/review
```

---

# 11. 最终建议

## 11.1 技术栈原则

```text
少组件
强契约
自有核心数据
外接通用工具
AI 受控使用
先复盘再自动化
```

## 11.2 PostHog 的定位

继续使用 PostHog，但只作为：

```text
产品分析 / 漏斗 / 留存 / session replay / feature flag
```

不要把它作为：

```text
核心业务数据仓库
核心 evidence store
餐饮经营事实源
```

## 11.3 自建内容的最小范围

必须自建：

```text
Event Contract
trackEvent SDK
raw_events
business entities
problems
actions
action_effects
guardrail_results
evidence_records
Assistant Context Builder
```

暂时不要自建：

```text
完整 analytics 平台
复杂 OLAP 平台
重型实时流计算
多 Agent 自动运营系统
```

## 11.4 AI 的定位

AI 的最佳定位是：

```text
解释复杂指标
维持对话连续性
把问题转成结构化 action card
帮助老板理解证据和不确定性
帮助销售/CS 复用 evidence
```

AI 不是：

```text
事实源
指标计算器
无边界自动运营者
黑盒决策者
```

## 11.5 最终一句话

> 对聚焦中国独立咖啡厅的 SaaS 来说，最简洁且可扩展的体系不是“大数据 + 大模型”，而是“事件契约 + 自有 evidence store + PostHog 产品分析 + 受控 AI Copilot”。先把每一次经营动作变成可复盘证据，再让这些证据变成 playbook、benchmark、销售案例和客户成功系统。
