# data-dyna 核心服务职能说明

状态：独立说明文档 v0.1  
日期：2026-05-02  
Owner：`data-dyna` product / architecture / data  
用途：用通俗但可执行的方式说明 `data-dyna` 这个核心数据服务到底负责什么、目标是什么、边界在哪里。  
关联 Roadmap：

- `docs/roadmap/control-plane-data-core-integration-roadmap.md`
- `docs/roadmap/independent-cafe-data-first-mvp-roadmap.md`
- `docs/analyse/restaurant-saas-scaling-law-and-sales-data.md`
- `docs/analyse/stack/independent-cafe-data-flywheel-minimal-stack.md`

---

## 1. 一句话定义

`data-dyna` 不是 POS，不是小程序，不是商户后台，也不是 AI 聊天机器人。

它的核心定义是：

> `data-dyna` 是餐饮 SaaS 的经营证据中枢。

更通俗地说：

> 它负责把小程序、POS、商户后台和后端事实服务里的经营数据串起来，判断一家店“哪里有问题、做了什么动作、有没有效果、有没有副作用、老板有没有真的采纳”。

再压缩成一句：

> `data-dyna` 的目标是把“数据”变成“可信的经营效果证明”。

---

## 2. 它为什么存在

餐饮 SaaS 系统里，数据天然分散：

```text
小程序：用户看了什么、点了什么、加购了什么、有没有支付
POS：现场卖了什么、谁收银、是否退款、是否取消
mobile-hq：老板有没有看日报、有没有接受建议、有没有改菜单/发券/配置
后端服务：订单、商品、会员、支付、退款、门店事实
```

这些数据如果各自孤立存在，只是：

```text
日志
埋点
报表
操作记录
```

它们还不能回答最重要的问题：

```text
这家店到底哪里有问题？
我们建议了什么动作？
老板有没有采纳？
做完以后有没有效果？
有没有副作用？
这个成功经验能不能复用到类似门店？
```

`data-dyna` 的存在价值，就是把这些零散信号变成一条完整经营证据链。

---

## 3. 核心职能

### 3.1 收集标准事件

`data-dyna` 接收来自三端和后端的标准事件：

```text
小程序用户行为
POS 交易现场
mobile-hq 商户动作和采纳
后端订单 / 商品 / 支付 / 退款 / 报表事实
```

但它不是简单“多收一点埋点”。

它必须通过统一 Event Contract 约束：

```text
事件名
事件版本
来源 source
商户 / 门店 / 员工 / 用户身份
session_id
order_no
action_id
problem_id
发生时间
业务属性
```

目的：防止事件名和字段漂移，保证后续指标、动作复盘和证据沉淀能对齐。

---

### 3.2 把事件变成业务事实

原始事件不能直接拿来做经营判断。

`data-dyna` 要把它们投影成业务可理解的数据：

```text
sessions
carts
orders
order_items
payments
refunds
items
menus
members
coupons
recommendations
channels
merchant_actions
merchant_adoption_events
```

例如：

```text
小程序 item_click + add_to_cart + checkout_start
  -> 菜单漏斗

POS / 后端 payment_success + refund_created
  -> 交易结果和 guardrail

mobile-hq action_card_accepted + action_card_applied
  -> 商户采纳和动作执行
```

这样系统才能从“发生过很多事件”升级为“知道经营过程发生了什么”。

---

### 3.3 计算核心经营指标

`data-dyna` 要把业务事实计算成独立咖啡厅可理解的指标。

首批重点不是全行业指标库，而是能支撑 7–14 天经营体检的指标：

```text
复购率
新客二购率
甜点加购率
烘焙加购率
轻食加购率
早咖订单占比
下午茶客单价
新品点击加购率
渠道转化率
退款率
取消率
优惠成本
```

目标不是做一个大而全 BI，而是回答：

```text
这家独立咖啡厅最近最值得优化的问题是什么？
```

---

### 3.4 识别标准问题

指标本身还不够，老板不会只想看一堆数字。

`data-dyna` 要把指标异常翻译成标准问题类型：

```text
repeat_purchase_low
new_customer_second_purchase_low
coffee_dessert_addon_low
coffee_lightmeal_addon_low
breakfast_conversion_low
afternoon_aov_low
new_product_conversion_low
channel_conversion_unclear
```

例如：

```text
用户看了很多甜点，但咖啡订单里很少加甜点
  -> coffee_dessert_addon_low

下午茶时段访问不少，但客单价偏低
  -> afternoon_aov_low
```

这样销售、产品、客户成功、AI sidecar 才能使用同一套问题语言。

---

### 3.5 把建议变成结构化动作

`data-dyna` 不应该只保存一段“建议文案”。

每个建议都必须变成可追踪的 action card：

```text
action_id
problem_id
action_type
target_metric
guardrail_metrics
requires_confirmation
rollback_supported
status
```

首批 action_type 示例：

```text
coffee_dessert_bundle
coffee_lightmeal_bundle
breakfast_combo_promotion
afternoon_tea_combo
new_product_trial_coupon
repeat_purchase_reminder
channel_specific_coupon
```

只有动作结构化，后面才能回答：

```text
这个动作有没有被老板接受？
有没有真的应用？
应用后有没有效果？
有没有副作用？
下次类似门店还能不能复用？
```

---

### 3.6 记录商户采纳

餐饮 SaaS 最关键的不只是“系统建议了什么”，而是：

```text
老板有没有看到？
有没有看懂？
有没有相信？
有没有接受？
有没有应用？
有没有看复盘？
有没有继续使用？
```

所以 `data-dyna` 必须记录 merchant_adoption。

典型事件：

```text
daily_report_opened
evidence_viewed
problem_confirmed
problem_dismissed
action_card_viewed
action_card_accepted
action_card_rejected
action_card_applied
action_card_reverted
effect_review_viewed
merchant_preference_confirmed
```

这些主要来自 `mobile-hq` 联邦项目族。

adoption 可以分层理解：

```text
saw：看到了
understood：看懂了
trusted：看了证据并认可
accepted：接受建议
applied：应用动作
reviewed：查看复盘
repeated：再次使用同类动作
paid：付费、续费、升级或扩店
```

没有商户采纳记录，系统就不知道建议是不是进入了真实经营流程。

---

### 3.7 复盘动作效果

`data-dyna` 必须证明动作有没有用。

最小方式不是复杂因果推断，而是可解释的 before / after：

```text
动作前 14 天 vs 动作后 14 天
上周同日 vs 本周同日
同一时段 before / after
```

每次复盘要记录：

```text
primary_metric
baseline_window
measurement_window
before_value
after_value
delta
sample_size
confidence
```

例如：

```text
动作：咖啡 + 甜点组合
目标：提升甜点加购率
动作前 14 天：8.2%
动作后 14 天：12.7%
变化：+4.5pp
样本量：420 单
置信度：medium
```

这一步把“建议”变成“可验证动作”。

---

### 3.8 检查副作用

主指标变好不代表动作就是好动作。

例如：

```text
加购率提升了，但等待时间是否变长？
客单价提升了，但退款率是否上升？
发券带来订单了，但优惠成本是否过高？
新品推荐变多了，但招牌品销量是否受损？
```

所以每个 action 都必须绑定 guardrail。

首批 guardrail：

```text
refund_rate
cancel_rate
AOV_drop
discount_cost
signature_item_sales_drop
avg_wait_time_optional
```

原则：

> 主指标提升但 guardrail 明显恶化，不能算高质量成功案例。

这一步让系统更可信，也更容易被老板接受。

---

### 3.9 沉淀 evidence_record

`data-dyna` 最核心的数据资产不是点击流，而是 evidence_record。

每条 evidence_record 聚合一个完整经营证据六元组：

```text
restaurant_segment
+ problem_type
+ action_type
+ measured_outcome
+ guardrail_result
+ merchant_adoption
```

通俗说就是：

```text
什么类型的店
遇到了什么问题
做了什么动作
结果怎么样
有没有副作用
老板有没有真的用
```

示例：

```text
restaurant_segment:
  写字楼独立咖啡厅 / 早咖强 / 咖啡+轻食

problem_type:
  coffee_lightmeal_addon_low

action_type:
  coffee_lightmeal_bundle

measured_outcome:
  14 天后轻食加购率 +5.8pp，早咖客单价 +3.2 元

guardrail_result:
  退款率无明显上升，取消率无明显上升，优惠成本可控

merchant_adoption:
  老板接受并持续应用 14 天，查看复盘后选择继续
```

这条记录未来可以成为：

```text
销售案例
客户成功 playbook
行业 benchmark
续费材料
AI 解释上下文
经营动作库
```

---

## 4. 三端职责边界

### 4.1 小程序负责用户行为

小程序主要告诉 `data-dyna`：

```text
用户从哪里来
看了哪些菜单
看了哪些商品
点了哪些商品
有没有加购
有没有进入结算
有没有支付成功
哪个推荐被曝光 / 点击
哪个券被曝光 / 领取 / 使用
哪个渠道带来了访问和转化
```

小程序回答的是：

> 用户想买什么？在哪里流失？什么推荐或优惠影响了他？

小程序不负责：

```text
判断订单最终状态
记录老板是否采纳建议
计算经营效果
```

---

### 4.2 POS 负责交易现场

POS 主要告诉 `data-dyna`：

```text
收银会话开始
员工登录 / 操作
订单创建
商品加入 / 删除
进入支付
支付成功 / 失败
退款
取消订单
使用优惠
开台 / 清台
履约状态可选
```

POS 回答的是：

> 门店现场真实发生了什么交易和操作？

POS 不负责：

```text
经营分析
建议生成
效果复盘
阻塞式数据上报
```

重要原则：

> `data-dyna` 上报失败不能影响 POS 收银、支付、退款、打印、清台。

---

### 4.3 mobile-hq 联邦项目族负责商户动作和采纳

`mobile-hq` 主要告诉 `data-dyna`：

```text
老板是否打开日报
是否查看指标卡
是否查看证据
是否确认 / 忽略问题
是否查看 action card
是否接受 / 拒绝建议
是否应用 / 回滚动作
是否查看效果复盘
是否修改菜单 / 商品 / 营业时间 / 支付 / 打印 / 渠道配置
```

`mobile-hq` 回答的是：

> 老板有没有真的把系统建议变成经营动作？

`mobile-hq` 不负责：

```text
消费者点击流
订单事实裁决
核心 evidence store
```

---

### 4.4 后端事实服务负责业务事实校正

后端订单、商品、支付、退款、报表服务主要提供：

```text
订单事实
商品事实
菜单事实
会员事实
支付事实
退款事实
门店事实
报表事实
```

它们回答的是：

> 最终业务事实是什么？

例如：

```text
前端说支付成功，只是行为信号；
后端订单 / 支付事实才是最终裁决。
```

---

## 5. 它不是什么

### 5.1 不是 POS

POS 继续负责收银、支付、退款、打印、桌台、员工现场操作。

`data-dyna` 不进入 POS 核心交易链路，不影响交易成功与否。

---

### 5.2 不是小程序

小程序继续负责点餐、菜单展示、商品详情、购物车、支付入口、优惠和推荐展示。

`data-dyna` 不负责渲染菜单，也不负责用户下单体验。

---

### 5.3 不是 mobile-hq

`mobile-hq` 继续负责商户后台 UI、经营配置、菜单管理、日报查看、动作应用。

`data-dyna` 不负责后台页面本身，只记录动作和采纳，并提供数据接口。

---

### 5.4 不是 PostHog

PostHog 适合做：

```text
页面访问
功能使用
产品漏斗
留存
feature flag
session replay
```

但 PostHog 不应该成为：

```text
订单事实源
经营指标事实源
动作效果事实源
证据库
```

`data-dyna` 可以把部分产品事件异步转发给 PostHog，但核心事实必须保存在自有数据层。

---

### 5.5 不是 AI

AI 可以未来用于：

```text
解释日报
生成建议文案
总结复盘
辅助销售 / 客户成功
回答老板追问
```

但 AI 不应该：

```text
替代指标计算
替代事实判断
无确认改菜单 / 改价 / 发券
无证据做因果判断
```

AI 应该读取 `data-dyna` 的 facts 和 evidence，而不是成为事实源。

---

## 6. 最小闭环

`data-dyna` 的最小闭环是：

```text
采集数据
  -> 计算指标
  -> 发现问题
  -> 生成动作
  -> 记录商户采纳
  -> 复盘动作效果
  -> 检查副作用
  -> 沉淀证据
```

更短：

```text
数据 -> 问题 -> 动作 -> 结果 -> 副作用 -> 采纳 -> 证据
```

一个完整例子：

```text
1. 小程序发现：很多用户看了甜点，但很少加购。
2. POS / 订单事实确认：咖啡订单里甜点搭配率偏低。
3. data-dyna 识别问题：coffee_dessert_addon_low。
4. 系统生成动作：coffee_dessert_bundle。
5. mobile-hq 记录：老板查看证据，接受建议，并应用组合套餐。
6. data-dyna 复盘：14 天后甜点加购率提升。
7. data-dyna 检查：退款率、取消率、客单价、优惠成本没有恶化。
8. data-dyna 生成 evidence_record：这类咖啡厅的这类动作有效，可作为复用案例。
```

---

## 7. 对不同角色的价值

### 7.1 对独立咖啡厅老板

老板可以知道：

```text
我的店属于哪类咖啡厅
最近哪里有经营问题
这个问题有什么证据
系统建议我做什么
这个建议是否安全
做完以后有没有效果
有没有副作用
我是否应该继续这个动作
```

老板买到的不是“一个报表”，而是：

> 有证据、有动作、有复盘的经营辅助系统。

---

### 7.2 对 SaaS 销售

销售可以不再只说：

```text
我们有 AI。
我们有数据分析。
我们有智能推荐。
```

而是可以说：

```text
我们服务过和你类似的独立咖啡厅。
它们常见问题是甜点加购低、早咖客单低、新品转化低。
我们用某些动作做过 14 天复盘，结果和副作用都有记录。
你可以先用 14 天看到第一轮经营证据。
```

这更容易降低客户不确定性。

---

### 7.3 对客户成功

客户成功可以知道：

```text
哪些客户还没接入成功
哪些客户没打开日报
哪些客户看了建议但没采纳
哪些客户应用了动作但没看复盘
哪些客户已经产生有效证据
哪些客户适合做案例
哪些客户有流失风险
```

这让客户成功从人工跟进变成证据驱动运营。

---

### 7.4 对产品团队

产品团队可以知道：

```text
哪些 problem_type 最常见
哪些 action_type 胜率最高
哪些动作副作用大
哪些功能老板真的使用
哪些能力值得产品化
哪些能力只是看起来高级但没有价值
```

这能帮助产品避免泛化膨胀，优先做可验证价值最高的能力。

---

### 7.5 对未来 AI sidecar

AI 可以读取：

```text
store summary
problem evidence
action history
effect review
guardrail result
merchant preferences
evidence records
```

然后负责：

```text
人话解释
日报总结
复盘总结
建议卡片文案
销售案例匹配
客户成功辅助
```

但 AI 只能放大 `data-dyna` 的证据，不能替代 `data-dyna` 的事实链路。

---

## 8. 最通俗的比喻

可以把 `data-dyna` 理解成餐厅经营里的“病历和疗效系统”。

```text
POS 像体温计和血压计：记录现场交易和操作。
小程序像用户行为监测：记录顾客看了什么、想买什么、在哪里放弃。
mobile-hq 像医生和病人的互动记录：记录老板是否看诊断、是否接受治疗方案、是否执行、是否复诊。
data-dyna 像病历和疗效系统：记录这家店是什么类型、诊断出什么问题、用了什么方案、疗效怎么样、有没有副作用、这个方案能不能推荐给类似门店。
```

所以它不是普通埋点系统，而是：

> 经营诊断 + 动作复盘 + 证据沉淀系统。

---

## 9. 成功标准

`data-dyna` 的成功，不是事件数量最多，也不是 AI 回答最像人。

它的成功标准是：

```text
1. 能稳定接收小程序、POS、mobile-hq 和后端事实事件；
2. 能把事件投影成业务事实；
3. 能计算独立咖啡厅核心指标；
4. 能识别标准 problem_type；
5. 能把建议变成 action_card；
6. 能记录老板是否采纳；
7. 能复盘 action 效果；
8. 能检查 guardrail 副作用；
9. 能生成完整 evidence_record；
10. 不依赖 AI 也能完成上述闭环。
```

最小可验证目标：

```text
至少完成一个独立咖啡厅的 14 天闭环：
小程序行为 + POS 订单事实 + mobile-hq 商户采纳 + before/after 效果 + guardrail + evidence_record。
```

---

## 10. 最终定义

`data-dyna` 的核心职能是：

> 把小程序的用户行为、POS 的交易现场、mobile-hq 的商户动作、后端的订单商品事实汇总起来，形成可计算、可复盘、可复用的经营证据。

它的核心目标是：

> 让餐饮 SaaS 不只是提供工具或 AI 建议，而是能证明：我帮什么类型的店，发现了什么问题，做了什么动作，产生了什么效果，有没有副作用，老板是否真的采纳。

最终一句话：

> `data-dyna` 要把餐饮经营里的每一次“建议”和“动作”，变成可验证、可复用、可销售的经营证据。
