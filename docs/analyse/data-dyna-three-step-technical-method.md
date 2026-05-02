# data-dyna 三步技术方法分析：店型识别、数据关联、经营建议

状态：分析文档 v0.1  
日期：2026-05-02  
Owner：`data-dyna` product / architecture / data  
范围：聚焦 `data-dyna` 如何把“数据”变成“可信的经营效果证明”的前三个关键步骤。  
关联文档：

- `docs/data-dyna-core-service-purpose.md`
- `docs/roadmap/control-plane-data-core-integration-roadmap.md`
- `docs/roadmap/independent-cafe-data-first-mvp-roadmap.md`
- `docs/analyse/restaurant-saas-scaling-law-and-sales-data.md`
- `docs/analyse/stack/independent-cafe-data-flywheel-minimal-stack.md`

---

## 0. 核心结论

`data-dyna` 的目标不是证明“系统比老板更聪明”，而是证明：

> 系统能更稳定地识别店型、发现问题、记录动作、验证效果、检查副作用，并把同类门店的成功经验拿来辅助老板决策。

三步技术路线：

```text
第一步：识别这是什么类型的店
  -> 菜单结构 + 订单结构 + 时段分布 + 地段/POI + RFM + 商户确认 + LLM 辅助解释

第二步：把关联数据整合成证据链
  -> Event Contract + 统一 ID + raw_events + business projections + 时间窗口 + 关系表 + evidence_records

第三步：从证据链生成经营建议
  -> problem_type + Action Registry + 同类 evidence 排序 + 商户约束 + guardrail + 老板确认 + before/after 复盘
```

最重要的边界：

```text
LLM 不是事实源。
LLM 不直接拍板店型。
LLM 不直接决定经营动作。
LLM 只做语义理解、解释、文案和候选建议包装。
核心判断必须可追溯到结构化数据、规则、历史 evidence 和商户确认。
```

---

## 1. 第一步：如何识别“这是什么类型的店”

### 1.1 不能只靠大模型

不能让大模型单独判断店型。

原因：

```text
大模型容易根据菜单文案过度推断；
无法知道真实销售结构；
无法知道真实时段客流；
无法知道老板经营约束；
输出不可稳定复核；
同一菜单在不同地段可能代表完全不同的经营模式。
```

例子：

```text
菜单里有咖啡、甜点、三明治、意面。
LLM 可能判断为“综合西式轻餐咖啡馆”。
但真实订单可能显示 80% 销售来自早咖，轻食只是弱加购品。
```

因此，LLM 只能辅助解释，不能作为主事实源。

---

### 1.2 店型识别的推荐方法

店型识别应使用多信号综合判断：

```text
菜单结构
+ 订单结构
+ 时段分布
+ 地段/POI
+ 会员/RFM 结构
+ 商户/销售确认
+ LLM 辅助语义归类
= 可解释 restaurant_segment
```

最终输出必须包含：

```text
segment label
confidence
evidence_refs
人工确认状态
最近更新时间
```

---

### 1.3 信号一：菜单结构

菜单回答：

> 这家店想卖什么？

可提取字段：

```text
咖啡 SKU 数
茶饮 SKU 数
甜点 SKU 数
烘焙 SKU 数
轻食 SKU 数
套餐数量
加料数量
招牌品数量
新品数量
价格带
是否有早餐组合
是否有下午茶组合
是否有推荐位
是否有券/活动商品
```

典型判断：

| 菜单信号 | 可能店型 |
|---|---|
| 咖啡 SKU 多，价格 18–35 元，甜点少量 | 独立咖啡厅 |
| 咖啡 + 贝果 + 三明治 + 沙拉 | 咖啡 + 轻食型 |
| 咖啡 + 蛋糕 + 可颂 + 甜点 | 咖啡 + 烘焙/甜点型 |
| 特调、手冲、SOE、Dirty 文案明显 | 精品/打卡型咖啡倾向 |

局限：

```text
菜单只能说明“想卖什么”，不能说明“真实靠什么赚钱”。
```

---

### 1.4 信号二：订单结构

订单回答：

> 这家店真实卖出了什么？

可提取字段：

```text
品类销售占比
咖啡订单占比
轻食订单占比
甜点订单占比
套餐订单占比
单品 vs 组合购买比例
客单价区间
退款率
取消率
堂食 / 外带 / 外卖 / 小程序 / POS 占比
```

典型判断：

```text
菜单里有很多甜点，但甜点销售占比低
  -> 不是强甜点店，而是“甜点加购潜力店”

咖啡订单多，但咖啡+轻食组合少
  -> 早咖强，轻食加购弱

小程序菜单浏览高，但支付少
  -> 行为漏斗问题，不一定是品类问题
```

订单结构优先级高于菜单结构。

---

### 1.5 信号三：时段分布

时段回答：

> 这家店什么时候赚钱？

可提取字段：

```text
早咖订单占比
午间订单占比
下午茶订单占比
晚间订单占比
工作日 vs 周末结构
高峰持续时间
低峰空档
时段客单价
时段加购率
```

典型判断：

| 时段信号 | 可能 segment |
|---|---|
| 7:30–10:00 订单集中，客单价中低，复购强 | 写字楼早咖型 |
| 14:00–17:00 浏览/点击高，甜点/特调相关 | 下午茶/打卡型 |
| 周末订单显著高于工作日 | 街区/商场/打卡型倾向 |
| 午间轻食订单占比高 | 咖啡 + 轻食午餐型 |

时段分布决定后续 action 是否应按早餐、午间、下午茶或低峰设计。

---

### 1.6 信号四：地段 / POI / 商圈

地段回答：

> 这家店服务什么场景？

可提取字段：

```text
写字楼密度
社区密度
学校密度
商场/街区/景区/医院/交通枢纽 POI
周边竞品数量
商圈客流类型
外卖半径可选
```

典型判断：

| 地段 | 常见机会 |
|---|---|
| 写字楼 | 早咖效率、午间轻食、工作日复购、企业团购 |
| 社区 | 老客复购、家庭消费、低频稳定需求 |
| 街区/打卡 | 周末客流、特调曝光、甜点搭配、社交传播 |
| 学校 | 价格敏感、下午/晚间峰值、社交饮品 |
| 商场 | 周末/节假日波动、打卡和套餐机会 |

地段不能单独决定店型，但能解释订单和时段数据。

---

### 1.7 信号五：会员 / RFM 结构

RFM 回答：

> 这家店的会员经营状态如何？

当前决策：

```text
MVP 第一版不重新计算 RFM。
先使用 Datamesh 的 report.crm.member_labels 作为会员画像 / RFM 标签事实源。
```

可用字段：

```text
memberStrId
brandId
rfm_tag.rfm_tag_30d
rfm_tag.rfm_tag_90d
rfm_tag.rfm_tag_180d
metrics.latest_pay_time
metrics_90d.pay_cnt_90d
metrics_90d.pay_amount_90d
metrics_90d.avg_pay_amount_90d
```

典型标签：

```text
champion
loyal
new
high_risk
high_value_lost
```

RFM 不直接判断品类店型，但判断会员经营阶段：

```text
new 用户多但无法转 loyal
  -> 新客二购问题

champion / loyal 迁移到 high_risk
  -> 核心用户流失风险

高价值用户 pay_amount_90d 下降
  -> 核心用户价值侵蚀
```

---

### 1.8 信号六：商户 / 销售 / CS 确认

人工确认回答：

> 数据看不到的经营约束是什么？

必须采集：

```text
老板是否愿意打折
招牌品是否禁止降价
后厨是否有人手瓶颈
是否不想做低价套餐
是否强调精品品牌调性
是否主攻复购而不是拉新
是否有供应链限制
是否有近期施工/竞品/活动异常
```

这些约束直接影响建议是否可执行。

没有商户确认，系统容易给出“数据上合理，但老板不会接受”的动作。

---

### 1.9 LLM 在店型识别中的正确角色

LLM 可以参与：

```text
菜单名称语义分类
商品描述解析
店铺简介解析
老板备注总结
销售拜访记录总结
用户评价关键词提取
生成可读 segment 解释
```

LLM 不应该：

```text
单独决定 restaurant_segment
覆盖订单事实
覆盖商户确认
无证据给高置信标签
```

正确输出形式：

```json
{
  "restaurant_segment": "independent_cafe_office_breakfast_lightmeal",
  "category": "independent_cafe",
  "business_area_type": "office",
  "peak_periods": ["breakfast"],
  "product_mix": ["coffee", "lightmeal"],
  "avg_order_value_band": "25_45",
  "mini_program_order_ratio_band": "high",
  "confidence": "medium",
  "evidence_refs": [
    "menu_profile_snapshot_001",
    "order_profile_snapshot_001",
    "poi_profile_snapshot_001",
    "rfm_snapshot_001",
    "merchant_confirmation_001"
  ],
  "llm_explanation": "菜单中咖啡和轻食占比较高，早咖时段订单集中，周边写字楼 POI 密度高。"
}
```

---

### 1.10 店型识别 MVP 实现建议

MVP 先做规则和快照，不做复杂模型：

```text
store_profile_snapshots
menu_profile_snapshots
order_profile_snapshots
time_period_profile_snapshots
poi_profile_snapshots
member_rfm_snapshots
merchant_confirmations
restaurant_segments
```

推荐流程：

```text
1. 同步菜单、订单、RFM、门店基础信息。
2. worker 定时生成各类 profile snapshot。
3. 规则引擎生成候选 segment。
4. LLM 只负责菜单/文本解释和 segment reason 文案。
5. mobile-hq 让商户/CS 确认或修正。
6. segment 带 confidence 和 evidence_refs 进入后续 problem detection。
```

---

## 2. 第二步：如何将关联数据整合在一起并形成关系

### 2.1 不能靠临时 SQL 拼接

如果每次临时拼：

```text
小程序事件
POS 订单
mobile-hq 操作
RFM 标签
商品表
优惠券表
```

会很快失控：

```text
ID 对不上
时间窗口不一致
退款口径不一致
会员 ID 和 open_id 对不上
动作和效果无法关联
事件重复或漏报
无法解释结论来源
```

`data-dyna` 必须有自己的数据整合层。

---

### 2.2 推荐技术结构

四层结构：

```text
raw_events
  -> normalized facts
  -> business projections
  -> evidence links / evidence_records
```

含义：

| 层 | 作用 |
|---|---|
| `raw_events` | 原始事件进入统一入口，可追溯、可重放 |
| `normalized facts` | 统一身份、订单、商品、会员、动作等基础事实 |
| `business projections` | 面向业务分析的投影表和快照 |
| `evidence links / records` | problem、action、effect、guardrail、adoption 的证据链 |

---

### 2.3 Event Contract

所有来源必须通过统一事件契约。

来源：

```text
mini_program
pos
mobile_hq
hq_bff
hq_orchestrator
order_service
product_service
pay_service
report_service
datamesh_rfm
system_worker
```

基础 envelope：

```text
event_id
event_name
event_version
source
producer
brand_id
store_id
member_id
employee_id
anonymous_id
session_id
cart_id
order_no
problem_id
action_id
occurred_at
properties_json
```

核心要求：

```text
有 event_version，支持演进；
有 source/producer，支持追溯；
有 idempotency_key，支持去重；
有 identity/correlation，支持关系连接；
invalid event 不能静默丢失，必须记录 validation_error。
```

---

### 2.4 统一 ID 体系

数据关联的核心不是 AI，而是 ID。

核心 ID：

```text
brand_id / merchant_id
store_id
member_id / memberStrId
open_id / anonymous_id
session_id
cart_id
order_no
item_id / sku_no / su_no
coupon_id
recommendation_id
problem_id
action_id
effect_id
evidence_id
```

典型链路一：用户行为到订单事实

```text
session_id
  -> cart_id
  -> order_no
  -> orders/order_items/payments/refunds
  -> member_id/memberStrId
  -> member_rfm_snapshots
```

典型链路二：动作到效果

```text
action_id
  -> action_card_applied
  -> menu_config_changed / coupon_created / recommendation_rule_changed
  -> affected_entities
  -> baseline_window / measurement_window
  -> action_effects
  -> guardrail_results
  -> evidence_record
```

典型链路三：问题到建议

```text
metric_snapshot_id
  -> problem_id
  -> problem_evidence_refs
  -> candidate_action_types
  -> action_id
```

---

### 2.5 业务投影表

raw_events 不直接支撑日常分析，需要投影。

MVP 投影：

```text
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
coupons
recommendations
channels
merchant_actions
merchant_adoption_events
metric_snapshots
problems
actions
action_state_events
action_effects
guardrail_results
evidence_records
```

投影原则：

```text
订单最终事实以后端订单/支付/退款为准；
小程序 payment_success 只用于 session attribution；
RFM 以 report.crm.member_labels 快照为准；
mobile-hq 事件用于 merchant_adoption 和 action lifecycle；
PostHog/Aegis 不能作为核心事实源。
```

---

### 2.6 时间窗口

经营效果必须通过时间窗口关联。

例如：

```text
action_id = act_001
applied_at = 2026-05-10
```

生成：

```text
baseline_window = 2026-04-26 ~ 2026-05-09
measurement_window = 2026-05-10 ~ 2026-05-23
```

比较：

```text
动作前目标指标
动作后目标指标
动作前 guardrail
动作后 guardrail
动作前 RFM 标签/消费指标
动作后 RFM 标签/消费指标
```

没有时间窗口，就不能谈效果复盘。

---

### 2.7 关系表 / 证据链

MVP 阶段优先 PostgreSQL 关系表，不急着引入图数据库。

推荐关系表：

```text
problem_evidence_refs
problem_metric_links
action_problem_links
action_affected_entities
action_metric_links
action_guardrail_links
action_adoption_links
effect_evidence_refs
evidence_record_links
```

示例关系：

```text
problem_id -> metric_snapshot_id
problem_id -> menu_funnel_snapshot_id
problem_id -> rfm_snapshot_id
action_id -> problem_id
action_id -> affected_item_id
action_id -> target_metric
action_id -> guardrail_metric
effect_id -> action_id
evidence_id -> action_id
```

这让系统可以解释：

```text
为什么识别这个问题？
为什么建议这个动作？
这个动作影响了什么？
效果复盘依据是什么？
```

后期如果关系复杂，再考虑图数据库或知识图谱。

---

### 2.8 技术手段总结

本服务整合数据的技术手段：

```text
1. Event Contract：统一事件口径。
2. raw_events：保留原始事实。
3. Idempotency：防重复。
4. Identity Resolution：统一会员、门店、订单、session。
5. PostgreSQL：保存核心事实、投影、快照和证据。
6. Worker / Task：定时同步订单、RFM、指标、效果。
7. Materialized Views / Snapshots：保存可复查指标快照。
8. Link Tables：保存 problem/action/effect/evidence 关系。
9. Before/After Windows：建立动作复盘时间窗口。
10. Evidence Records：沉淀最终经营证据。
```

核心不是“把所有数据倒进一个湖”，而是：

> 把每个问题、动作、结果、副作用、采纳记录通过 ID 和时间窗口串起来。

---

## 3. 第三步：从数据生成可验证经营实验

本步骤已从“推荐一个具体动作”重构为：

> 基于同类门店 benchmark 发现 opportunity gap，让 LLM 在事实、约束和历史 evidence 上生成可验证经营假设，再通过老板确认、小范围实验、guardrail 和 before/after 复盘沉淀 trajectory evidence。

旧路径不再作为主线：

```text
problem_type -> Action Registry -> Action Ranking -> action_card
```

原因：

```text
具体 action_type 会无限膨胀；
商业行为不是工具排序问题；
人工规则越写越多会阻塞 scaling law；
LLM 如果只在动作库里排序，无法充分利用多店数据和上下文推理能力。
```

新主线：

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

更短：

```text
同行对比 -> 机会缺口 -> 经营假设 -> 小实验 -> 复盘证据 -> 下一轮更准
```

### 3.1 哲学原则

本步骤遵循 The Bitter Lesson 的方向：

```text
少写具体商业规则；
多构建通用表示；
让模型利用更多同类门店数据、benchmark、上下文和历史 evidence 生成假设；
用真实 outcome、guardrail 和 merchant_adoption 反馈修正系统。
```

保留的规则应是稳定边界规则：

```text
数据口径
身份关联
权限确认
guardrail
禁止动作
复盘窗口
可回滚性
```

减少的规则是具体动作规则：

```text
不要把“甜点加购低 -> 推荐甜点套餐”这类人工经验无限扩写成动作库。
```

### 3.2 核心抽象

第三步的核心对象不是 `action_type`，而是完整经营实验 trajectory：

```text
business_state
opportunity_gap
intervention_hypothesis
experiment_plan
merchant_acceptance
applied_config
measured_outcome
guardrail_result
followup_decision
```

系统学习的不是“哪个工具排序最高”，而是：

```text
P(outcome, adoption, guardrail | business_state, opportunity_gap, intervention_plan)
```

通俗说：

> 对于这种状态的独立咖啡店，面对这种机会缺口，采用这种类型的低风险干预，大概率会发生什么，老板是否愿意接受，副作用是否可控。

### 3.3 LLM 的新角色

LLM 不再只是 action card 文案器，也不是无限自由的经营执行者。

正确角色：

```text
LLM = hypothesis generator + explanation engine
```

输入：

```text
store profile
peer benchmark
opportunity gaps
menu/order/time/RFM snapshots
similar trajectories
merchant constraints
guardrails
```

输出：

```text
intervention_hypothesis
structured_experiment_plan
merchant_explanation
risk_notes
measurement_plan
```

LLM 不允许：

```text
直接改菜单；
直接发券；
直接改价；
绕过老板确认；
绕过 guardrail；
无 evidence 下结论。
```

### 3.4 技术模块

第三步落地为以下模块：

```text
Benchmark Service
Opportunity Gap Service
LLM Hypothesis Generator
Intervention Plan Validator
Merchant Acceptance Loop
Evidence Learning Loop
```

其中：

| 模块 | 职责 |
|---|---|
| Benchmark Service | 计算同类门店分位数、peer median、peer gap |
| Opportunity Gap Service | 把同行差距整理成可干预机会缺口 |
| LLM Hypothesis Generator | 基于事实、约束和 evidence 生成经营假设和实验计划 |
| Intervention Plan Validator | deterministic 校验权限、风险、guardrail、可回滚性和样本量 |
| Merchant Acceptance Loop | 让老板接受、修改、拒绝，并记录原因 |
| Evidence Learning Loop | 记录 outcome / guardrail / adoption，反哺下一轮上下文 |

### 3.5 Scaling Law 飞轮

第三步进入 scaling law 的方式不是扩大动作库，而是扩大同类门店轨迹数据：

```text
更多独立咖啡店接入
  -> 更准的同类 benchmark
  -> 更容易发现 opportunity_gap
  -> LLM 基于 benchmark 和 evidence 生成更好的经营假设
  -> 老板更容易接受低风险、有依据的实验
  -> 更多实验被执行
  -> 更多 outcome / guardrail / adoption 结果沉淀
  -> 系统更懂什么假设在什么上下文下有效
  -> 下一轮建议更准、更可信、更容易被接受
```

最终目标：

> 第三步不是“系统推荐一个动作”，而是“系统基于同类门店数据发现机会缺口，并生成一个老板愿意接受、可以验证、可以复盘的经营实验”。

详细展开见：

- `docs/analyse/data-dyna-step3-scaling-law-intervention-hypothesis.md`

---

## 4. 三步落地为产品能力

### 4.1 店型识别产品能力

```text
Store Profile / Segment Service
Menu Profile Worker
Order Profile Worker
POI Profile Worker
RFM Snapshot Worker
Merchant Confirmation UI
LLM Explanation Adapter
```

输出：

```text
restaurant_segment
confidence
evidence_refs
merchant_confirmed_at
```

---

### 4.2 数据关联产品能力

```text
Event Ingestion Service
Identity Resolution Service
Business Projection Service
Metric Snapshot Service
Evidence Link Service
Effect Window Service
```

输出：

```text
problem -> action -> effect -> guardrail -> adoption -> evidence
```

---

### 4.3 经营实验生成产品能力

```text
Benchmark Service
Opportunity Gap Service
LLM Hypothesis Generator
Intervention Plan Validator
Merchant Acceptance Loop
Effect Review Service
Evidence Learning Loop
```

输出：

```text
opportunity_gap
intervention_hypothesis
structured_experiment_plan
merchant_explanation
risk_notes
guardrails
confirmation_required
rollback_policy
measurement_plan
trajectory_evidence
```

---

## 5. 最终判断

### 5.1 第一步：店型识别

正确方法不是：

```text
LLM 看菜单后拍脑袋分类。
```

而是：

```text
菜单结构 + 订单结构 + 时段分布 + 地段/POI + RFM + 商户确认 + LLM 辅助解释。
```

目标是生成：

```text
可解释、有置信度、有证据来源的 restaurant_segment。
```

---

### 5.2 第二步：数据关联

正确方法不是：

```text
把所有数据临时 SQL 拼成报表。
```

而是：

```text
Event Contract + 统一 ID + raw_events + business projections + 时间窗口 + 关系表 + evidence_records。
```

目标是生成：

```text
可追溯的经营证据链。
```

---

### 5.3 第三步：经营实验生成

正确方法不是：

```text
AI 直接告诉老板怎么经营。
```

也不是：

```text
problem_type -> 无限 action_type -> 无限排序。
```

而是：

```text
同行 benchmark -> opportunity_gap -> LLM 经营假设 -> 结构化实验计划 -> deterministic 安全校验 -> 老板确认 -> before/after 复盘 -> trajectory evidence。
```

目标不是替老板决策，而是：

```text
给老板一个基于同类对比、有证据、有风险提示、可小范围验证、可复盘的经营实验。
```

最终一句话：

> `data-dyna` 不应该证明“系统比老板聪明”，而应该证明“系统能基于同类门店数据发现机会缺口，并把经营假设变成可验证、可复用、可销售的证据”。
