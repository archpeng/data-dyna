# data-dyna 第三步重构：从动作推荐到 Scaling Law 经营实验

状态：分析文档 v0.1  
日期：2026-05-02  
Owner：`data-dyna` product / architecture / data  
范围：彻底重构 `data-dyna` 第三步——从“基于问题推荐动作”升级为“基于同类门店数据发现机会缺口，并生成可验证经营实验”。  
关联文档：

- `docs/analyse/data-dyna-three-step-technical-method.md`
- `docs/data-dyna-core-service-purpose.md`
- `docs/roadmap/control-plane-data-core-integration-roadmap.md`
- `docs/analyse/restaurant-saas-scaling-law-and-sales-data.md`
- `docs/analyse/stack/independent-cafe-data-flywheel-minimal-stack.md`

---

## 0. 核心结论

第三步不应该是：

```text
problem_type -> action_type -> action ranking -> action_card
```

这条路底层方向有价值，但路径过于具象，会导致：

```text
动作类型无限膨胀；
人工规则越来越多；
系统变成“餐饮工具库 + 排序器”；
商业行为被误解成工具选择问题；
scaling law 被人工规则和动作枚举卡住。
```

第三步应重构为：

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

最终定义：

> 第三步的核心不是“系统推荐一个动作”，而是“系统基于同类门店数据发现机会缺口，并生成一个老板愿意接受、可以验证、可以复盘的经营实验”。

---

## 1. 为什么原路径必须重构

### 1.1 原路径的价值

原路径是：

```text
problem_type -> Action Registry -> Action Ranking -> action_card
```

它有三个正确点：

```text
1. 建议必须结构化，不能只是 AI 文案。
2. 动作必须可追踪，必须有 action_id / target_metric / guardrail。
3. 动作必须被复盘，不能停留在“建议已生成”。
```

这些仍然保留。

---

### 1.2 原路径的问题

问题在于它太像“工具库排序”。

如果持续扩展，会变成：

```text
coffee_dessert_bundle
coffee_lightmeal_bundle
breakfast_combo_promotion
afternoon_tea_combo
new_customer_second_purchase_coupon
inactive_member_coupon
weather_based_recommendation
low_peak_limited_coupon
channel_specific_coupon
...
```

然后每个 problem 都要维护候选动作，每个动作都要维护规则，每个规则又要维护例外。

这会导致：

```text
人工规则膨胀；
动作枚举膨胀；
维护成本膨胀；
泛化能力下降；
LLM 被限制成“在动作库里挑选”；
系统无法真正利用多店数据形成 scaling law。
```

商业经营不是简单的“选择哪个工具”。

老板真正关心的是：

```text
我的店和同类店相比哪里不一样？
这个差距是不是机会？
这个建议为什么适合我？
风险是否可控？
我能不能先小范围试？
做完以后怎么判断是否继续？
```

因此，第三步应该从“动作排序”转成“经营实验生成”。

---

## 2. 哲学原理：The Bitter Lesson 在这里意味着什么

### 2.1 The Bitter Lesson 的核心启发

The Bitter Lesson 的核心不是“完全不要规则”，而是：

> 长期来看，依赖计算、搜索、学习和通用表示的方法，会超过大量人工编码的领域规则。

映射到 `data-dyna`：

```text
少写具体商业规则；
少维护无穷 action_type；
多构建通用经营状态表示；
多使用同类门店大样本 benchmark；
多让 LLM 基于结构化上下文生成假设；
多用真实 outcome / guardrail / adoption 反馈修正系统。
```

---

### 2.2 应该减少的规则

减少这类规则：

```text
如果甜点加购率低 -> 推荐甜点套餐；
如果早咖客单价低 -> 推荐早餐套餐；
如果新客未转化 -> 发二购券；
如果老客流失 -> 发召回券；
如果下午茶低峰 -> 发低峰券。
```

这些规则的问题：

```text
太具体；
例外很多；
难以跨店泛化；
容易和老板约束冲突；
不能充分利用 LLM 的上下文推理能力；
无法从新数据中自动扩展。
```

---

### 2.3 应该保留的规则

保留稳定边界规则：

```text
数据口径规则
身份关联规则
隐私和权限规则
老板确认规则
guardrail 规则
禁止动作规则
可回滚性规则
实验时间窗口规则
样本量和置信度规则
```

这些规则不是商业智慧，而是安全边界。

它们负责回答：

```text
能不能做？
有没有权限？
风险是否过高？
有没有足够数据？
是否必须老板确认？
如何复盘？
```

---

### 2.4 应该交给 LLM 和数据的部分

交给 LLM + evidence 的部分：

```text
机会缺口如何解释；
可能原因是什么；
有哪些低风险干预假设；
如何让老板理解；
如何根据老板偏好调整表达；
如何总结复盘；
如何从相似案例抽象经验。
```

原则：

```text
人工规则管边界；
数据提供事实；
LLM 生成假设；
真实世界 outcome 负责裁判。
```

---

## 3. 新核心抽象：从 Action Type 到 Intervention Trajectory

### 3.1 不再以 action_type 为学习中心

旧学习单位：

```text
action_type
```

新学习单位：

```text
trajectory
```

完整 trajectory：

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

这比单个 action_type 更接近真实商业。

---

### 3.2 business_state

`business_state` 是店当前的经营上下文。

包括：

```text
restaurant_segment
menu_profile
order_profile
time_period_profile
channel_profile
member_rfm_profile
merchant_constraints
recent_anomalies
```

示例：

```json
{
  "restaurant_segment": "independent_cafe_office_breakfast_lightmeal",
  "peak_periods": ["breakfast"],
  "product_mix": ["coffee", "lightmeal"],
  "aov_band": "25_45",
  "mini_program_order_ratio": "high",
  "rfm_profile": {
    "new_ratio": 0.31,
    "loyal_ratio": 0.18,
    "high_risk_ratio": 0.12
  }
}
```

---

### 3.3 opportunity_gap

`opportunity_gap` 是“和同类店相比，哪里明显落后或异常”。

它不是一句建议，而是一个可验证缺口。

示例：

```json
{
  "gap_id": "gap_001",
  "metric": "coffee_lightmeal_addon_rate",
  "store_value": 0.08,
  "peer_median": 0.15,
  "peer_p75": 0.22,
  "percentile": 20,
  "gap_level": "high",
  "context": {
    "time_period": "breakfast",
    "segment": "independent_cafe_office_breakfast_lightmeal"
  },
  "confidence": "medium"
}
```

这比直接说“做轻食套餐”更有价值，因为它先证明：

```text
你的早咖流量不弱，但轻食搭配显著低于同类。
```

---

### 3.4 intervention_hypothesis

`intervention_hypothesis` 是 LLM 基于事实和上下文生成的经营假设。

示例：

```text
早咖时段咖啡订单较强，但轻食搭配弱。若在早咖菜单首屏提高轻食组合曝光，并避免大额折扣，可能提升早咖客单价和轻食加购率，同时不明显增加退款或等待。
```

它不是命令，而是假设。

必须包含：

```text
为什么这个缺口值得干预；
可能原因是什么；
干预方向是什么；
预期改善什么；
可能风险是什么；
为什么适合先小范围验证。
```

---

### 3.5 experiment_plan

`experiment_plan` 是结构化经营实验。

示例：

```json
{
  "target_metric": "breakfast_aov",
  "secondary_metrics": ["coffee_lightmeal_addon_rate"],
  "target_audience": "breakfast_mini_program_users",
  "target_surface": "mini_program_menu",
  "levers": ["bundle_visibility", "menu_position"],
  "scope": {
    "time_period": "07:30-10:30",
    "items": ["coffee", "lightmeal"],
    "stores": ["store_001"]
  },
  "intensity": "low",
  "duration_days": 14,
  "guardrails": ["refund_rate", "cancel_rate", "discount_cost", "avg_wait_time"],
  "requires_confirmation": true,
  "rollback_supported": true,
  "measurement_plan": {
    "baseline_window_days": 14,
    "measurement_window_days": 14
  }
}
```

这不是无穷 action_type，而是少量通用字段组合出来的实验。

---

### 3.6 merchant_acceptance

老板是否接受，是第三步能不能进入验证的关键。

必须记录：

```text
viewed
accepted
modified
rejected
rejection_reason
accepted_reason
applied_at
reverted_at
followup_decision
```

系统必须学习：

```text
什么表达更容易被老板理解；
什么实验更容易被接受；
哪些风险会导致老板拒绝；
哪些老板偏好会影响下一轮建议。
```

---

### 3.7 measured_outcome / guardrail / followup

实验结束后，记录：

```text
目标指标是否改善；
副指标是否改善；
guardrail 是否恶化；
老板是否继续；
是否回滚；
是否愿意复用；
```

这才形成 evidence trajectory。

---

## 4. 更少、更泛用的干预语法

### 4.1 为什么需要 Intervention Grammar

商业行为不应该被建模为几百个 action_type。

更好的抽象是：

```text
经营干预 = 目标 + 人群 + 触点 + 杠杆 + 范围 + 强度 + 时间 + 风险边界 + 复盘计划
```

即：

```text
target_metric
target_audience
target_surface
lever
scope
intensity
duration
guardrails
rollback
measurement_plan
```

---

### 4.2 少量通用经营杠杆

#### 曝光杠杆

本质：改变用户先看到什么。

```text
菜单排序
首页推荐
商品卡位置
新品曝光
套餐入口
```

#### 组合杠杆

本质：改变购买篮子结构。

```text
咖啡 + 甜点
咖啡 + 轻食
早餐组合
下午茶组合
多人组合
```

#### 价格 / 激励杠杆

本质：改变购买经济动机。

```text
优惠券
满减
第二件优惠
会员专享
低峰限时优惠
```

#### 人群杠杆

本质：对不同人群做不同干预。

```text
新客
老客
高价值用户
沉默用户
高风险流失用户
早咖用户
下午茶用户
```

#### 时段杠杆

本质：把动作放到更合适的消费场景里。

```text
早咖
午间
下午茶
低峰
周末
节假日
雨天
```

#### 内容表达杠杆

本质：改变用户理解商品的方式。

```text
商品名
图片
描述
推荐文案
卖点
组合命名
```

#### 履约 / 复杂度杠杆

本质：降低下单和履约成本。

```text
快出套餐
隐藏复杂菜
减少规格选择
提前备货
减少等待
```

这些杠杆比具体 action_type 稳定得多。

---

## 5. 多店数据如何形成更直接的 Scaling Law

### 5.1 从单店指标到同类 benchmark

如果只有一家店，系统只能说：

```text
你比自己过去如何。
```

如果有很多独立咖啡店，系统可以说：

```text
你和同类店相比如何。
```

这会产生质变。

同类维度：

```text
独立咖啡店
同城 / 同商圈类型
相似客单价
相似日单量
相似菜单结构
相似小程序订单占比
相似 RFM 结构
```

输出：

```text
metric percentile
peer median
peer p75
peer gap
gap confidence
```

---

### 5.2 从“动作库”到“干预效果分布”

系统真正要学习的是：

```text
P(outcome, adoption, guardrail | business_state, opportunity_gap, intervention_plan)
```

通俗说：

> 对这种状态的店，面对这种机会缺口，采用这种低风险干预，大概率会发生什么。

这才是 scaling law。

不是：

```text
动作越来越多。
```

而是：

```text
同类状态样本越来越多；
实验结果越来越多；
系统对经营干预的先验越来越准；
老板越容易接受；
验证越来越快；
证据越来越强。
```

---

### 5.3 新飞轮

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
  -> 更多门店愿意接入
```

这比旧飞轮更直接。

旧飞轮：

```text
problem_type -> action_type -> ranking
```

新飞轮：

```text
peer benchmark -> opportunity_gap -> LLM hypothesis -> experiment -> evidence -> learned prior
```

---

## 6. 实现原则

### 6.1 LLM 是 hypothesis generator，不是 executor

LLM 负责：

```text
解释 opportunity_gap；
提出可能原因；
生成低风险经营假设；
生成结构化实验计划草稿；
生成老板可理解的话术；
总结复盘结果。
```

LLM 不负责：

```text
直接执行动作；
绕过权限；
跳过确认；
无 guardrail 执行；
伪造 evidence；
替代指标计算。
```

---

### 6.2 Deterministic validator 必须存在

LLM 输出后必须经过 deterministic validation。

校验：

```text
是否违反商户约束；
是否需要老板确认；
是否可回滚；
是否有 guardrail；
是否样本量足够；
是否涉及高风险动作；
是否触碰改价/发券/菜单配置权限；
是否有 measurement_plan；
是否引用真实 evidence_refs。
```

Validator 是安全闸门，不是推荐器。

---

### 6.3 老板确认是学习闭环的一部分

老板不是被动执行者。

老板反馈是重要数据：

```text
为什么接受；
为什么拒绝；
是否修改实验；
是否担心品牌调性；
是否担心后厨压力；
是否不想打折；
是否愿意继续。
```

这些会成为下一轮 hypothesis context。

---

### 6.4 低风险实验优先

第三步的默认产品姿态：

```text
先小范围验证；
先低强度；
先可回滚；
先不影响核心交易；
先不自动改价；
先不自动发券；
先明确复盘窗口。
```

越早期越要保守。

---

### 6.5 证据不足时必须承认不足

系统必须能输出：

```text
当前证据不足，不建议直接动作。
建议先观察或做小范围低风险实验。
```

不确定性本身是产品能力，不是缺陷。

---

## 7. 技术模块设计

### 7.1 Benchmark Service

职责：回答“这家店和同类店相比，哪里不同”。

输入：

```text
restaurant_segment
menu_profile
order_profile
time_period_profile
rfm_profile
```

输出：

```text
metric_percentiles
peer_median
peer_p75
peer_gap
confidence
```

---

### 7.2 Opportunity Gap Service

职责：把 benchmark 差距变成经营机会缺口。

输出示例：

```text
早咖流量强，但早咖客单价弱；
甜点点击不低，但加购弱；
新客多，但二购弱；
核心用户价值下降；
低峰曝光正常，但支付弱。
```

---

### 7.3 LLM Hypothesis Generator

职责：生成经营假设和实验计划草稿。

输入：

```text
store profile
opportunity gaps
peer benchmark
similar trajectories
merchant constraints
guardrails
```

输出：

```text
intervention_hypothesis
experiment_plan
merchant_explanation
risk_notes
measurement_plan
```

必须输出结构化 schema，不允许只输出自由文本。

---

### 7.4 Intervention Plan Validator

职责：确定性校验。

输出：

```text
accepted_for_merchant_review
needs_more_data
requires_human_review
blocked_by_policy
blocked_by_merchant_constraint
blocked_by_missing_guardrail
```

---

### 7.5 Merchant Acceptance Loop

职责：提高采纳率并记录反馈。

老板看到的不是：

```text
系统建议你做 X。
```

而是：

```text
我们发现你和同类店相比有一个机会缺口；
这里是证据；
这是一个低风险实验；
你可以接受、修改、拒绝；
拒绝原因会被系统记住。
```

---

### 7.6 Evidence Learning Loop

职责：把真实结果反哺系统。

记录：

```text
accepted_or_rejected
rejection_reason
applied_or_not
outcome
guardrail
continued_or_reverted
followup_decision
```

这些会影响下一轮：

```text
similar trajectory retrieval
LLM context
intervention prior
merchant preference
benchmark confidence
```

---

## 8. 关键数据结构草案

### 8.1 opportunity_gaps

```text
gap_id
merchant_id
store_id
restaurant_segment
metric
store_value
peer_median
peer_p75
percentile
gap_level
confidence
evidence_refs_json
created_at
```

### 8.2 intervention_hypotheses

```text
hypothesis_id
gap_id
merchant_id
store_id
hypothesis_text
reasoning_summary
llm_model
llm_context_refs_json
confidence
created_at
```

### 8.3 experiment_plans

```text
experiment_id
hypothesis_id
target_metric
secondary_metrics_json
target_audience
target_surface
levers_json
scope_json
intensity
duration_days
guardrails_json
requires_confirmation
rollback_supported
measurement_plan_json
validation_status
created_at
```

### 8.4 merchant_acceptance_events

```text
acceptance_event_id
experiment_id
merchant_id
store_id
employee_id
event_name: viewed | accepted | modified | rejected | applied | reverted | reviewed | continued
reason_optional
properties_json
occurred_at
```

### 8.5 intervention_trajectories

```text
trajectory_id
experiment_id
business_state_ref
gap_id
hypothesis_id
baseline_window
measurement_window
measured_outcome_json
guardrail_result_json
merchant_adoption_json
followup_decision
reusable_candidate
created_at
```

---

## 9. 最终目标

第三步的最终目标不是：

```text
生成更多建议；
生成更复杂动作库；
让 AI 替老板决策；
让系统显得比老板聪明。
```

而是：

```text
让系统能基于大量同类独立咖啡店数据，发现更可信的机会缺口；
让 LLM 基于事实和 evidence 生成低风险经营假设；
让老板愿意接受或修改这些实验；
让每次实验都有 outcome、guardrail 和 adoption 结果；
让结果反哺下一轮 benchmark、hypothesis 和 evidence prior；
让建议越来越准、越来越可信、越来越容易被接受。
```

最终一句话：

> 第三步是 `data-dyna` 进入 scaling law 的关键：不是把商业动作枚举成无限工具，而是把每家独立咖啡店的经营状态、机会缺口、实验假设、老板反馈和真实结果，沉淀成可学习的 evidence trajectory。
