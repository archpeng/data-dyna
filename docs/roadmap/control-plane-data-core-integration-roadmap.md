# data-dyna 数据采集闭环与 Data Core 落地 Roadmap

状态：Roadmap SSOT v0.3  
日期：2026-05-02  
Owner：`data-dyna` product / architecture / data integration  
范围：基于当前 `data-dyna` 文档仓库、POS、小程序、`mobile-hq` 联邦项目族、`hq-bff-service`、`g-hq-orchestrator` 的代码现实，重新定义数据采集闭环和可落地的 Data Core MVP。  
前置共识：数据闭环先行；AI/Agent 后置为只读 sidecar；PostHog/Aegis/SigNoz 只能做观测或产品分析 sink，不能成为经营事实源。

关联文档：

- `docs/roadmap/independent-cafe-data-first-mvp-roadmap.md`
- `docs/roadmap/mvp-menu-growth-copilot-roadmap.md`
- `docs/roadmap/conversation-continuity-and-assistant-runtime.md`
- `docs/analyse/restaurant-saas-scaling-law-and-sales-data.md`
- `docs/analyse/independent-cafe-focused-scaling-law-feasibility.md`
- `docs/analyse/stack/independent-cafe-data-flywheel-minimal-stack.md`
- `docs/exp/restaurant-intent-layer-thesis.md`

---

## 0. 本次代码审视结论

### 0.1 `data-dyna` 当前仓库现实

当前 `data-dyna` 仓库仍是文档/决策仓库：

```text
LICENSE
docs/analyse/**
docs/exp/**
docs/roadmap/**
```

尚不存在：

```text
package.json
src/**
数据库 schema
Event Contract 代码
Event Ingestion API
worker / task runner
```

因此本 Roadmap 的第一落地点不是“接更多埋点”，而是先创建 `data-dyna` 自己的最小 Data Core 工程骨架和事件契约；否则三端接入会继续散落在 Aegis、PostHog、业务日志和 GraphQL 调用里，无法形成可复盘经营证据。

### 0.2 POS 代码现实

已审视路径：

```text
/home/peng/dt-git/frontend/pos-lite-cashier/apps/pos-lite/package.json
/home/peng/dt-git/frontend/pos-lite-cashier/apps/pos-lite/src/shared/common/utils/track.ts
/home/peng/dt-git/frontend/pos-lite-cashier/apps/pos-lite/src/domain/app/hooks/useClickTracker.ts
/home/peng/dt-git/frontend/pos-lite-cashier/apps/pos-lite/src/shared/components/biz/Pay/PayModal/usePayModalScanHandlers.ts
/home/peng/dt-git/frontend/pos-lite-cashier/apps/pos-lite/src/env/index.*.env.ts
```

代码事实：

```text
pos-lite-cashier 是 React + Ionic + Capacitor + Vite POS 客户端。
依赖中已有 posthog-js、Aegis、OpenTelemetry、Couchbase Lite、MQTT、Novu。
当前已有 trackEvent(name, ext1)，但它只包 AegisTrace.reportEvent，不是业务 Event Contract。
PayModal 扫码/支付路径存在直接 AegisTrace.reportEvent。
window.$posthog 主要被用于 feature flag，不是业务事实源。
POS 代码里没有 data-dyna 事件 SDK，也没有统一 action_id/problem_id/order_no 关联契约。
```

结论：

```text
POS 可以快速成为“交易现场事件 producer”，但不能把现有 Aegis trackEvent 当作 data-dyna 入口。
POS 端只采集交易现场和员工操作的补充事实；订单最终事实仍应以后端订单/支付/退款事实为准。
POS 事件上报必须非阻塞收银、支付、退款、打印和清台。
```

### 0.3 小程序代码现实

已审视路径：

```text
/home/peng/dt-git/frontend/mini-homepage-h5/apps/mini-order/package.json
/home/peng/dt-git/frontend/mini-homepage-h5/apps/mini-order/src/app/providers/createAppServices.ts
/home/peng/dt-git/frontend/mini-homepage-h5/apps/mini-order/src/domain/shared/contracts/serviceCore.ts
/home/peng/dt-git/frontend/mini-homepage-h5/apps/mini-order/src/features/menu/domain/utils/menuOrderAegis.ts
/home/peng/dt-git/frontend/mini-homepage-h5/apps/mini-order/src/features/menu/stores/useMenuOrderStore.ts
/home/peng/dt-git/frontend/mini-homepage-h5/apps/mini-order/src/features/menu/views/PaySuccess/index.tsx
/home/peng/dt-git/frontend/mini-homepage-h5/apps/mini-order/src/features/launch/domain/hooks/useLaunchRouterManage.ts
```

代码事实：

```text
mini-homepage-h5/apps/mini-order 是 React + Vite mini-order app。
依赖中有 Aegis、React Query、Zustand、web-vitals；未见 posthog-js 依赖。
IAppServices 统一注入 aegis/graphql/navigation/runtime/storage/logger。
menuOrderAegis 已能围绕 menu-order 生成结构化 Aegis report：brandId、storeId、orderNo、submitMode、scanType、totalAmount、paymentMethods、lineCount、status、reason、traceId。
useMenuOrderStore 已有 lineItems、add/update/remove line、couponIds、paymentMethod 等购物车/订单草稿状态。
Launch router 已处理 menu/coupon/orderConfirm/store 等入口恢复和跳转。
当前没有 data-dyna 用户行为 SDK，也没有 item_impression/item_click/add_to_cart/checkout_start 等经营事件契约。
```

结论：

```text
小程序是用户行为和意图采集主入口。
现有 Aegis 结构化上报适合作为工程参考，但 data-dyna 需要独立 SDK：从菜单曝光、商品点击、加购、结算、支付、推荐/券/渠道串起 session -> cart -> order。
小程序不负责商户采纳，不负责交易最终事实裁决。
```

### 0.4 `mobile-hq` 联邦项目族代码现实

已审视路径：

```text
/home/peng/dt-git/rms/mobile-hq/package.json
/home/peng/dt-git/rms/mobile-hq/vite.config.ts
/home/peng/dt-git/rms/mobile-hq/src/init/index.ts
/home/peng/dt-git/rms/mobile-hq-mainline/package.json
/home/peng/dt-git/rms/mobile-hq-mainline/src/remoteEntry.ts
/home/peng/dt-git/rms/mobile-hq-menu/package.json
/home/peng/dt-git/rms/mobile-hq-menu/src/remoteEntry.tsx
```

代码事实：

```text
mobile-hq 是主项目/host，使用 @module-federation/vite。
mobile-hq host remotes：mainline、menu、user、setting、login、supply、auth、report。
mobile-hq host 初始化 PostHog，并把实例挂到 window.$posthog；identify 使用 employeeId，并带 userId/brandId 等属性。
mobile-hq-mainline 暴露 ./routerConfig，路由覆盖 Home、Device、BusinessHours、DiscountLabel、OrderNoRule、OrderMode、PosOrderSet、PaymentAccount、Kitchen、Printer、Ticket、TableArea、Takeout 等商户经营配置动作。
mobile-hq-menu 暴露 ./routerConfig，路由覆盖 Product、Category、Search、EditProduct、ProductSort、SaleTime、Modifier、PackFee、StatisticsLabel、Takeout product relation 等菜单/商品配置动作。
mainline/menu remote 依赖共享 React、Ionic、MobX、Apollo 等，部分页面通过 window.$posthog 读取 feature flag；未见统一 capture/adoption SDK。
```

结论：

```text
mobile-hq 联邦项目族应成为“商户动作和采纳”采集主入口。
采集点不能散落到每个 remote 直接 posthog.capture；应由 host 提供统一 dataDynaTrack bridge，remote 只调用同一契约。
mainline/menu 是首批 adoption/action 事件最有价值 remote：前者负责经营配置，后者负责菜单/商品动作。
report remote 虽本地未审视到 repo，但 host 已声明 remoteName=report；它应成为 daily_report/evidence/effect_review 的关键接入点。
```

### 0.5 后台 BFF / 编排代码现实

已审视路径：

```text
/home/peng/dt-git/bff/hq-bff-service/package.json
/home/peng/dt-git/bff/hq-bff-service/src/**
/home/peng/dt-git/rms/g-hq-orchestrator/go.mod
/home/peng/dt-git/rms/g-hq-orchestrator/internal/handler/report/report.go
/home/peng/dt-git/rms/g-hq-orchestrator/internal/handler/order/order.go
/home/peng/dt-git/rms/g-hq-orchestrator/internal/handler/pay/pay.go
```

代码事实：

```text
hq-bff-service 是 NestJS + Fastify + GraphQL + gRPC/REST datasource BFF，技术栈与 data-dyna 推荐后端方向兼容。
g-hq-orchestrator 是 Go/Kitex 风格编排服务，聚合 order/pay/report/product/store 等下游 RPC。
g-hq-orchestrator report handler 已覆盖 SalesTrend、DishSalesByStore、RevenueInsights、ReportExportFileLink、ChartConfig 等报表/洞察接口。
g-hq-orchestrator order/pay handler 已覆盖订单详情、退款、支付配置等后台事实和配置动作。
```

结论：

```text
hq-bff-service 适合做 mobile-hq -> data-dyna 的短期服务端转发/鉴权边界。
g-hq-orchestrator 适合提供经营报表、订单、支付、商品、门店事实的查询/同步源。
二者都不应承载 data-dyna 核心 Evidence Store；data-dyna 应独立保存 raw_events、metric_snapshots、actions、effects、guardrails、evidence_records。
```

### 0.6 Datamesh RFM 模型发现

已访问并验证：

```text
https://g-datamesh.eshine.cn/api/datamesh/v1/query-object?name=rfm
```

发现结果：

```text
Datamesh 中已有 10 个 active/enabled 的 RFM 相关 Query Object。
核心来源表为 report.crm.member_labels。
该表已经沉淀会员画像、RFM 标签和 90/180/30 天消费指标。
```

已确认的 RFM Query Object 示例：

| 名称 | ID | 用途 |
|---|---|---|
| `crm_客户分布明细` | `68bc41f5c4184201f731a87819360afb` | RFM 标签客户分布和会员明细 |
| `rfm预警_核心用户快速流失_汇总` | `b0b7d758701224ae17ef56c5de567f83` | 核心用户从 champion/loyal 迁移到 high_risk/high_value_lost 的品牌级预警 |
| `rfm预警_核心用户快速流失_明细` | `3c424b4a66d0bedbf938cb6ffe80ba54` / `f9a25a2cbc5fe3590ca18af9f42b06a3` | 核心用户快速流失会员明细 |
| `rfm预警_核心用户价值侵蚀_汇总` | `03183a176f29219c23b33076ee091fb1` | 核心用户消费金额下降预警 |
| `rfm预警_核心用户价值侵蚀_明细` | `1947b3d46e34850e3fdf319e063d6444` | 核心用户价值侵蚀会员明细 |
| `rfm预警_新客没有转换_汇总` | `4050e7e650e4d3eedac2a0554ea2f477` | 新客未转化品牌级预警 |
| `rfm预警_新客没有转换_明细` | `b3e432f719dad4cbd914c48702d698e2` | 新客未转化会员明细 |

已确认关键字段：

```text
memberStrId
brandId
phone
nickName
birthDate
headImg
rfm_tag.rfm_tag_30d
rfm_tag.rfm_tag_90d
rfm_tag.rfm_tag_180d
metrics.latest_pay_time
metrics_90d.pay_cnt_90d
metrics_90d.pay_amount_90d
metrics_90d.avg_pay_amount_90d
```

已确认标签示例：

```text
champion
loyal
new
high_risk
high_value_lost
```

决策：

```text
MVP 第一版不重新计算 RFM。
先把 report.crm.member_labels 作为会员画像 / RFM 标签事实源。
data-dyna 只做同步、快照、引用和效果复盘关联。
待 data-dyna 自有事件和订单事实闭环稳定后，再评估是否需要自建 RFM 计算或增量校正。
```

对 data-dyna 的影响：

```text
members projection 必须扩展为 member_profiles / member_rfm_snapshots。
Problem Detection 可直接消费 RFM 标签，用于 repeat_purchase_low、new_customer_second_purchase_low、high_value_member_churn_risk 等问题。
Action Registry 可复用 RFM 标签生成 repeat_purchase_reminder、inactive_member_coupon、new_customer_second_purchase_coupon 等动作。
Effect Review 必须记录 action 前后的 RFM 标签迁移，而不是只看订单金额。
```

---

## 1. 再定义：三端职责边界

### 1.1 一句话边界

```text
小程序负责用户行为；
POS 负责交易现场；
mobile-hq 联邦项目族负责商户动作和采纳；
data-dyna 负责把三类信号和后端事实汇成可复盘经营证据。
```

### 1.2 三端不是同一种“埋点”

| 采集面 | 负责 repo / 项目族 | 采集对象 | 不能负责 | data-dyna 用途 |
|---|---|---|---|---|
| 用户行为面 | `mini-homepage-h5/apps/mini-order` | 用户入口、菜单浏览、商品点击、加购、结算、推荐/券、渠道 | 不裁决订单最终状态；不记录商户是否采纳 | funnel、intent、recommendation/coupon attribution |
| 交易现场面 | `pos-lite-cashier/apps/pos-lite` + 订单/支付后端事实 | 收银会话、员工操作、订单创建、支付、退款、取消、优惠、桌台/履约 | 不做经营分析；不阻塞交易链路 | order/payment/refund truth、employee/store operation context、guardrail |
| 商户采纳面 | `mobile-hq` host + `mobile-hq-mainline` + `mobile-hq-menu` + `report` remote | 日报查看、证据查看、问题确认/忽略、动作卡接受/拒绝/应用/回滚、菜单/配置调整、复盘查看 | 不采集消费者点击流；不替代订单事实 | merchant_adoption、action lifecycle、trust/rejection reason |
| 服务端事实面 | `hq-bff-service` / `g-hq-orchestrator` / order/product/store/pay/report services | 订单、商品、菜单、门店、会员、支付、退款、报表事实 | 不做用户行为细粒度埋点 | projections、metric_snapshots、guardrails、baseline/outcome |
| Datamesh RFM 事实面 | `g-datamesh.eshine.cn` / `report.crm.member_labels` | 会员 RFM 标签、会员消费频次、消费金额、最近消费时间、RFM 预警 | MVP 不重新计算 RFM；不把 Datamesh 当 data-dyna evidence store | member_profiles、member_rfm_snapshots、会员问题识别、会员动作效果复盘 |

### 1.3 数据闭环的最小闭合路径

```text
mini_program behavior
  -> session/cart/order attribution
POS / order facts
  -> paid/refund/cancel/item facts
mobile-hq adoption/action
  -> problem/action/adoption state
server-side projections
  -> metrics/problem/effect/guardrail
Evidence Service
  -> evidence_record
```

核心闭环：

```text
采集 -> 指标 -> 问题 -> 动作 -> 结果 -> 副作用 -> 采纳 -> 证据
```

MVP 必须在没有 AI 的情况下完成该闭环。

---

## 2. Event Contract v0：统一事件骨架

### 2.1 基础事件 envelope

```json
{
  "event_id": "uuid",
  "event_name": "item_click",
  "event_version": 1,
  "source": "mini_program",
  "producer": "mini-homepage-h5/apps/mini-order",
  "occurred_at": "2026-05-02T12:00:00.000Z",
  "received_at": "2026-05-02T12:00:01.000Z",
  "idempotency_key": "mini_program:sess_001:item_click:20260502120000:item_001",
  "identity": {
    "tenant_id": "brand_001",
    "brand_id": "brand_001",
    "merchant_id": "brand_001",
    "store_id": "store_001",
    "employee_id": null,
    "member_id": null,
    "user_id": null,
    "anonymous_id": "anon_001",
    "session_id": "sess_001",
    "device_id": null,
    "open_id": null
  },
  "correlation": {
    "order_no": null,
    "cart_id": "cart_001",
    "problem_id": null,
    "action_id": null,
    "recommendation_id": null,
    "coupon_id": null,
    "channel_link_id": null,
    "trace_id": null
  },
  "entity": {
    "entity_type": "item",
    "entity_id": "item_001"
  },
  "properties": {
    "page_route": "/menu",
    "item_id": "item_001",
    "category_id": "coffee"
  }
}
```

### 2.2 身份口径

当前代码中常见的是：

```text
brandId
storeId
employeeId
userId
openId / gOpenId
orderNo
traceId
```

MVP 口径：

```text
tenant_id = brand_id
merchant_id = brand_id
store_id = storeId
employee_id = mobile-hq / POS 员工 ID
member_id = 会员 ID，若无则为空
anonymous_id = 小程序未登录用户或设备匿名 ID
session_id = data-dyna SDK 生成或复用现有 session
order_no = 订单关联主键
trace_id = 观测追踪 ID，仅辅助排查，不作为业务主键
```

后续如有真正商户主数据，再把 `brand_id -> merchant_id` 迁移为映射表；MVP 不等待这个问题阻塞闭环。

### 2.3 source enum

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
system
```

---

## 3. 三端首批事件定义

### 3.1 小程序：用户行为和意图

小程序首批只采集能支撑菜单漏斗、推荐/券 attribution、session -> order 归因的事件。

| event_name | 触发点 | 必填关联 | 主要属性 |
|---|---|---|---|
| `mini_session_started` | launch/init 后确定 brand/store/session | `brand_id`, `store_id`, `session_id` | `scene`, `entry_route`, `source_channel` |
| `channel_link_opened` | launch router 解析渠道/入口参数 | `session_id`, `channel_link_id` | `p`, `raw_query`, `campaign_id` |
| `menu_view` | 进入菜单页 | `session_id`, `store_id` | `menu_id`, `menu_version_id`, `eat_type` |
| `item_impression` | 商品进入可见区域 | `session_id`, `item_id` | `category_id`, `position`, `recommendation_id` |
| `item_click` | 点击商品/规格 | `session_id`, `item_id` | `category_id`, `position`, `price` |
| `item_detail_view` | 进入详情/规格选择 | `session_id`, `item_id` | `sku_no`, `modifier_count` |
| `add_to_cart` | `useMenuOrderStore.addOrUpdateLine` 后 | `session_id`, `cart_id`, `item_id` | `line_id`, `sku_no`, `quantity`, `price`, `recommendation_id` |
| `remove_from_cart` | `useMenuOrderStore.removeLine` 后 | `session_id`, `cart_id`, `item_id` | `line_id`, `quantity_before` |
| `cart_view` | 打开购物车/确认页 | `session_id`, `cart_id` | `line_count`, `total_amount`, `coupon_ids` |
| `checkout_start` | 提交确认前 | `session_id`, `cart_id` | `line_count`, `total_amount`, `payment_method` |
| `payment_success` | PaySuccess 成功态或后端支付确认 | `order_no`, `session_id` | `paid_amount`, `payment_method`, `coupon_ids` |
| `payment_failed` | 支付失败/取消 | `session_id` | `reason`, `order_no_optional` |
| `recommendation_exposed` | 推荐位曝光 | `recommendation_id`, `session_id` | `strategy`, `item_ids`, `action_id_optional` |
| `recommendation_clicked` | 推荐位点击 | `recommendation_id`, `session_id` | `item_id`, `position`, `action_id_optional` |
| `coupon_exposed` | 券展示 | `coupon_id`, `session_id` | `scene`, `action_id_optional` |
| `coupon_claimed` | 领券 | `coupon_id`, `session_id` | `campaign_id`, `action_id_optional` |
| `coupon_used` | 结算使用券 | `coupon_id`, `order_no` | `discount_amount`, `action_id_optional` |

小程序接入原则：

```text
只通过 dataDyna.trackEvent；不把 Aegis report 当业务事实。
所有推荐/券/渠道事件必须携带 recommendation_id / coupon_id / channel_link_id。
所有支付成功最终以服务端订单事实校正；前端 payment_success 用于补 session attribution。
失败不阻塞点餐、支付、页面跳转。
```

### 3.2 POS：交易现场和员工操作

POS 首批只采集能补充交易现场语境和员工动作的事件；订单、支付、退款最终事实以后端同步为准。

| event_name | 触发点 | 必填关联 | 主要属性 |
|---|---|---|---|
| `pos_session_started` | POS 启动/门店登录完成 | `store_id`, `employee_id`, `device_id` | `app_version`, `platform`, `pos_mode` |
| `cashier_login` | 员工登录/切换 | `store_id`, `employee_id` | `role`, `device_id` |
| `order_created` | POS 创建订单后 | `order_no`, `store_id`, `employee_id` | `table_no`, `eat_type`, `source` |
| `order_item_added` | POS 加商品 | `order_no`, `item_id` | `sku_no`, `quantity`, `price`, `employee_id` |
| `order_item_removed` | POS 删商品 | `order_no`, `item_id` | `reason_optional`, `employee_id` |
| `checkout_started` | POS 进入支付 | `order_no` | `amount`, `payment_methods` |
| `payment_success` | POS 支付成功/后端确认 | `order_no` | `paid_amount`, `payment_method`, `employee_id` |
| `payment_failed` | POS 支付失败 | `order_no` | `reason`, `payment_method` |
| `refund_created` | 发起退款 | `order_no` | `refund_amount`, `reason`, `employee_id` |
| `order_cancelled` | 取消订单 | `order_no` | `reason`, `employee_id` |
| `coupon_used` | POS 使用优惠/券 | `order_no`, `coupon_id_optional` | `discount_amount`, `campaign_id_optional` |
| `table_opened` | 开台/切桌 | `store_id`, `table_no` | `employee_id`, `order_no_optional` |
| `kitchen_status_changed` | 可选，若已有履约状态 | `order_no` | `status`, `station`, `duration_ms_optional` |

POS 接入原则：

```text
不能把 data-dyna 上报放进收银同步阻塞链路。
事件失败只本地缓存/丢弃/重试，不影响支付、退款、清台、打印。
优先在现有 track.ts 外新增 data-dyna adapter；不要把 AegisTrace.reportEvent 扩展成业务事件总线。
PayModal 现有 Aegis 上报只能作为定位现有支付节点的代码锚点。
```

### 3.3 mobile-hq 联邦项目族：商户动作和采纳

mobile-hq 首批事件必须覆盖“看见 -> 理解/信任 -> 接受 -> 应用 -> 复盘 -> 复用/付费”的 adoption ladder。

| event_name | 首批落点 | 必填关联 | 主要属性 |
|---|---|---|---|
| `daily_report_opened` | `report` remote / host route bridge | `brand_id`, `store_id`, `employee_id` | `report_date`, `report_type` |
| `metric_card_viewed` | report/insight 卡片 | `metric`, `store_id` | `window`, `problem_id_optional` |
| `evidence_viewed` | 证据详情 | `evidence_id`, `store_id` | `problem_id`, `action_id` |
| `problem_viewed` | 问题详情 | `problem_id` | `problem_type`, `metric` |
| `problem_confirmed` | 商户确认问题 | `problem_id`, `employee_id` | `reason_optional` |
| `problem_dismissed` | 商户忽略问题 | `problem_id`, `employee_id` | `dismiss_reason` |
| `action_card_viewed` | action card 曝光/打开 | `action_id`, `problem_id` | `action_type` |
| `action_card_accepted` | 接受建议 | `action_id`, `employee_id` | `expected_start_at`, `scope` |
| `action_card_rejected` | 拒绝建议 | `action_id`, `employee_id` | `rejected_reason` |
| `action_card_applied` | 通过后台应用动作 | `action_id`, `employee_id` | `target_config_type`, `config_ref`, `rollback_supported` |
| `action_card_reverted` | 回滚动作 | `action_id`, `employee_id` | `revert_reason`, `config_ref` |
| `effect_review_viewed` | 查看复盘 | `action_id`, `effect_id` | `confidence`, `guardrail_status` |
| `merchant_preference_confirmed` | 确认偏好/禁忌 | `store_id`, `employee_id` | `preference_key`, `preference_value` |
| `menu_config_changed` | `mobile-hq-menu` 商品/分类/排序/售卖时段 | `store_id`, `employee_id` | `config_type`, `entity_id`, `change_summary`, `action_id_optional` |
| `store_config_changed` | `mobile-hq-mainline` 营业时间/桌台/支付/打印/渠道 | `store_id`, `employee_id` | `config_type`, `entity_id`, `change_summary`, `action_id_optional` |

mobile-hq 接入原则：

```text
host 提供统一 bridge：window.dataDynaTrack 或共享 @dt/data-dyna-client。
remote 不直接依赖 PostHog；remote 不各自发散事件名。
所有 action 应尽量绑定 action_id；商户手动配置变更没有 action_id 时仍记录为 merchant_manual_action，并可后续补关联。
PostHog 继续接收 adoption/product events，但只由 data-dyna sink 异步转发。
```

---

## 4. Data Core 服务边界

`data-dyna` 推荐定位不变，但本次收敛为更可执行的服务边界：

```text
data-dyna = Event Contract + Event Ingestion + Projection + Metrics + Problem + Action + Effect + Guardrail + Evidence
```

不做：

```text
不替代 POS / 小程序 / mobile-hq。
不替代 hq-bff-service / g-hq-orchestrator。
不成为通用埋点平台或 PostHog 替代品。
不在 MVP 中做 Kafka/Flink/复杂 OLAP。
不让 AI 直接改菜单、发券、改价。
```

### 4.1 MVP 后端形态

推荐：

```text
TypeScript + NestJS + Fastify + Zod + PostgreSQL + pg-boss/task table
```

理由：

```text
hq-bff-service 已是 NestJS + Fastify，团队和工程生态兼容。
TS/Zod 便于把 Event Contract 变成前后端共享类型。
PostgreSQL 满足早期 raw_events、projections、metric_snapshots、evidence_records。
单体更适合早期闭环验证和 AI coder 维护。
```

### 4.2 必须先有的模块

```text
contracts/events      事件枚举、source enum、Zod schemas、版本策略
api/events            POST /events, POST /events/batch
storage/raw-events    raw_events 写入、幂等、校验失败表
identity              brand/store/employee/member/session 映射
sinks/posthog         产品/adoption 事件异步转发
workers/projection    raw_events + 后端 facts -> 业务投影
workers/metrics       metric_snapshots
workers/problem       problem detection rules
workers/effect        action_effects
workers/guardrail     guardrail_results
services/evidence     evidence_records
```

---

## 5. 数据模型 MVP

### 5.1 raw_events

```text
event_id
idempotency_key
event_name
event_version
source
producer
tenant_id
merchant_id
brand_id
store_id
employee_id_optional
member_id_optional
user_id_optional
anonymous_id_optional
session_id_optional
device_id_optional
open_id_optional
order_no_optional
cart_id_optional
problem_id_optional
action_id_optional
recommendation_id_optional
coupon_id_optional
channel_link_id_optional
entity_type_optional
entity_id_optional
properties_json
occurred_at
received_at
validation_status: valid | invalid
validation_error_optional
forwarded_to_posthog_at_optional
```

### 5.2 projections

```text
orders
order_items
payments
refunds
items
menus
menu_versions
members
member_profiles
member_rfm_snapshots
sessions
carts
coupons
recommendations
channels
merchant_actions
merchant_adoption_events
```

### 5.3 metrics / problems / actions / evidence

```text
metric_snapshots
problems
actions
action_state_events
action_effects
guardrail_results
evidence_records
```

每条 `evidence_record` 必须聚合：

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
reusable_candidate
```

---

## 6. 第一条可落地闭环：14 天菜单增长体检

### 6.1 目标

用最少事件证明 data-dyna 能把三端数据汇成一个经营证据闭环。

### 6.2 首批 problem/action

首批只做独立咖啡厅最贴近小程序 + POS + mobile-hq 的问题：

| problem_type | 需要小程序 | 需要 POS/订单事实 | 需要 mobile-hq | action_type |
|---|---|---|---|---|
| `coffee_dessert_addon_low` | 商品曝光/点击/加购 | 含咖啡/甜点订单明细 | 接受/应用组合动作 | `coffee_dessert_bundle` |
| `coffee_lightmeal_addon_low` | 商品曝光/点击/加购 | 含咖啡/轻食订单明细 | 接受/应用组合动作 | `coffee_lightmeal_bundle` |
| `breakfast_conversion_low` | 早咖菜单浏览/加购/checkout | 早间支付订单 | 营业/菜单/推荐配置动作 | `breakfast_combo_promotion` |
| `afternoon_aov_low` | 下午茶浏览/加购/券 | 下午时段订单/AOV | 套餐/券动作采纳 | `afternoon_tea_combo` |
| `new_product_conversion_low` | 新品曝光/点击/加购 | 新品订单/退款 | 试饮券/推荐动作采纳 | `new_product_trial_coupon` |
| `new_customer_second_purchase_low` | 新客二次访问/券触达可选 | `report.crm.member_labels` 中 `new` 标签和 90 天消费指标 + 订单事实 | 接受/应用二购提醒或券动作 | `new_customer_second_purchase_coupon` |
| `high_value_member_churn_risk` | 召回触达可选 | `champion`/`loyal` 向 `high_risk`/`high_value_lost` 迁移 | 接受/应用召回动作 | `inactive_member_coupon` / `repeat_purchase_reminder` |

### 6.3 首批 guardrail

```text
refund_rate
cancel_rate
AOV_drop
discount_cost
signature_item_sales_drop
avg_wait_time_optional
```

### 6.4 最小报告

14 天体检报告必须能回答：

```text
这家独立咖啡厅属于哪个 segment？
哪个菜单漏斗问题最明显？
对应订单事实是否支持这个判断？
系统给了哪个 action_card？
老板/店长是否看见、接受、应用？
应用后 before/after 指标如何？
退款、取消、客单价、优惠成本是否恶化？
这条记录能否成为 reusable evidence？
```

---

## 7. 集成路线

### Phase 0：Data Core 工程骨架和事件契约冻结

目标：先让 data-dyna 有自己的事实入口。

产物：

```text
package.json / src/** / tests/**
Event Contract v0 Zod schemas
POST /events
POST /events/batch
raw_events schema
validation failure table
source enum
identity/correlation envelope
PostHog sink interface but disabled-by-default
```

Done when：

```text
本仓库不再只是文档仓库；
三类 source 的 sample event 可以通过 Zod 校验；
invalid event 有错误原因；
raw_events 可按 brand_id/store_id/source/event_name 查询；
PostHog 不参与事实裁决。
```

### Phase 1：SDK / Bridge 设计，不接业务点

目标：先给三端提供同一调用方式。

产物：

```text
@dt/data-dyna-client 或复制式最小 SDK
trackEvent(eventName, payload)
trackBatch(events)
identity provider
non-blocking queue/retry policy
mobile-hq host bridge: window.dataDynaTrack
POS adapter wrapper
mini-order services.dataDyna
```

Done when：

```text
POS、小程序、mobile-hq 能在测试环境发送 ping/sample 事件；
客户端主流程不等待上报响应；
SDK 默认不直接调用 posthog.capture；
每端至少有 1 个单元测试或 mock proof。
```

### Phase 2：小程序行为最小接入

目标：拿到用户意图链路。

首批事件：

```text
mini_session_started
channel_link_opened
menu_view
item_click
add_to_cart
remove_from_cart
cart_view
checkout_start
payment_success
coupon_used
recommendation_clicked
```

Done when：

```text
能串起 session -> cart -> checkout -> order_no；
能按 item/category/recommendation/coupon/channel 归因；
小程序支付成功可被后端订单事实校正；
Aegis 仍仅做工程监控。
```

### Phase 3：POS / 订单事实最小接入

目标：拿到交易现场和最终订单事实。

首批事件/同步：

```text
pos_session_started
cashier_login
order_created
payment_success
refund_created
order_cancelled
coupon_used
orders/order_items/payments/refunds daily sync
```

Done when：

```text
能重建单店一天订单和退款；
能把小程序 order_no 与订单事实对齐；
能区分 POS 现场事件和后端订单事实；
上报失败不影响 POS 主流程。
```

### Phase 3.5：Datamesh RFM 事实源接入

目标：复用现有 RFM 模型结果，先获得会员画像和 RFM 标签，不在 MVP 第一版重算 RFM。

事实源：

```text
Datamesh API: https://g-datamesh.eshine.cn/api/datamesh/v1/query-object?name=rfm
核心表: report.crm.member_labels
```

首批同步对象：

```text
crm_客户分布明细
rfm预警_新客没有转换_汇总 / 明细
rfm预警_核心用户快速流失_汇总 / 明细
rfm预警_核心用户价值侵蚀_汇总 / 明细
```

首批字段：

```text
memberStrId
brandId
rfm_tag_30d
rfm_tag_90d
rfm_tag_180d
latest_pay_time
pay_cnt_90d
pay_amount_90d
avg_pay_amount_90d
```

产物：

```text
member_profiles
member_rfm_snapshots
rfm_query_object_registry
rfm_snapshot_synced event
```

Done when：

```text
data-dyna 能按 brand_id/member_id 查询最近一次 RFM 标签；
能按 week_end_date 保存 RFM 快照；
能识别 new 未转化、核心用户快速流失、核心用户价值侵蚀三类会员问题；
会员类 action effect 能比较动作前后的 RFM 标签和 90 天消费指标；
文档明确 MVP 不重算 RFM，只引用 report.crm.member_labels 作为事实源。
```

### Phase 4：mobile-hq adoption/action 最小接入

目标：拿到商户是否看见、相信、接受、应用、复盘。

首批落点：

```text
mobile-hq host init/bridge
report remote: daily_report_opened, metric_card_viewed, evidence_viewed, effect_review_viewed
mobile-hq-mainline: store_config_changed, action_card_applied for order/payment/printer/business-hour related actions
mobile-hq-menu: menu_config_changed, action_card_applied for product/category/sort/sale-time actions
```

首批事件：

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
menu_config_changed
store_config_changed
```

Done when：

```text
每个 action_card 有 action_id；
接受/拒绝/应用/回滚会写入 data-dyna；
菜单/配置手动变更即使没有 action_id 也能记录为 merchant_manual_action；
PostHog 只通过 data-dyna sink 接收 adoption 事件副本。
```

### Phase 5：投影、指标和问题识别

目标：事件变成指标和标准问题。

产物：

```text
sessions/carts/orders/items/coupons/recommendations projections
metric_snapshots
repeat/addon/time-period/new-product/channel metrics
problem detection rules
problem evidence refs
```

Done when：

```text
能生成单店 14 天菜单漏斗和交易指标；
至少生成 5 个 problem_type；
每个 problem 有 metric/baseline/evidence_refs/confidence；
问题可被商户确认/忽略。
```

### Phase 6：Action Registry + Effect + Guardrail

目标：动作可追踪、可复盘。

产物：

```text
action_type whitelist
actions
action_state_events
action_effects
guardrail_results
insufficient_data state
```

Done when：

```text
至少 5 个 action_type；
至少 1 个 action 完成 before/after；
至少 3 个 guardrail 可检查；
样本不足时明确标记 weak/insufficient；
主指标提升但 guardrail 恶化时不能进入 high-quality evidence。
```

### Phase 7：Evidence Store + 销售/CS 资产

目标：把一次闭环变成可复用证据。

产物：

```text
evidence_records
segment/problem/action/effect/adoption 查询
14 天体检报告导出
sales case view
CS health view
```

Done when：

```text
至少 1 条完整 evidence_record；
能按 restaurant_segment/problem_type/action_type 查询；
能筛选 high confidence + high adoption 案例；
能支持销售讲“同类咖啡厅相似问题相似动作的结果”。
```

### Phase 8：AI Sidecar Readiness

目标：让 AI 读取证据，但不污染事实链路。

产物：

```text
GET /ai-context/stores/{store_id}/summary
GET /ai-context/problems/{problem_id}
GET /ai-context/actions/{action_id}
GET /ai-context/evidence/{evidence_id}
```

Done when：

```text
AI 只能读 facts/evidence；
AI 输出必须转成 action_card 草稿；
AI 无权直接改菜单、改价、发券；
核心闭环不依赖 AI。
```

---

## 8. MVP 验收标准

最低验收不是“埋点数量”，而是完成一个 evidence loop：

```text
1. data-dyna 有可运行 Event Ingestion API 和 raw_events；
2. 小程序至少接入 6 个用户行为事件；
3. POS/订单事实至少接入 4 个交易事实；
4. mobile-hq 联邦项目族至少接入 6 个 adoption/action 事件；
5. raw_events 可按 brand_id/store_id/session_id/order_no/action_id 查询；
6. 能生成 sessions/carts/orders/order_items/items/coupons/recommendations 基础投影；
7. 能生成独立咖啡厅 14 天体检报告；
8. 能从 `report.crm.member_labels` 同步会员 RFM 标签快照，且不重新计算 MVP 第一版 RFM；
9. 至少支持 5 个 problem_type；
10. 至少支持 5 个 action_type；
11. 至少支持 3 个 guardrail；
12. 至少完成 1 个 action 的 before/after effect review；
13. 至少生成 1 条完整 evidence_record；
14. PostHog/Aegis 缺失不影响核心证据；
15. AI 缺失不影响闭环运行。
```

---

## 9. 风险和控制

| 风险 | 当前代码证据 | 控制 |
|---|---|---|
| data-dyna 只有文档，没有服务 | 当前仓库无 `package.json/src/schema` | Phase 0 先建 Event Ingestion 和 raw_events |
| 误把 Aegis/PostHog 当事实源 | POS/mini 已有 Aegis；mobile-hq host 有 PostHog | data-dyna 先写 raw_events，再异步 sink |
| mobile-hq remote 各自散乱 capture | host/remote 联邦，PostHog 挂 window | host bridge + 统一 Event Contract |
| 小程序只记录支付日志，缺少行为漏斗 | mini 当前 Aegis 更偏 menu-order 工程日志 | 接入 item/menu/cart/checkout/recommendation/coupon 事件 |
| POS 采集影响交易链路 | POS 支付/退款/打印链路复杂 | 非阻塞 queue；失败不影响交易 |
| 身份不统一 | 代码中 brandId/storeId/employeeId/userId/openId 混用 | MVP identity envelope；brand_id 先等同 merchant_id |
| action 无法复盘 | mobile-hq 配置页面很多，但无 action_id | action_card 先行；手动配置变更记录 manual_action |
| 订单事实和前端行为对不上 | session/cart/order_no 关联缺失 | 小程序 payment_success 补 order_no；服务端 facts 校正 |
| 样本量不足 | 独立咖啡厅单店波动大 | 14/30 天窗口 + sample_size/confidence |
| 过早 AI 化 | 老 roadmap 已多处讨论 assistant | AI sidecar 后置，只读 evidence |

---

## 10. 最终判断

`data-dyna` 的数据核心服务要变得实际、可落地，必须把“谁负责采集什么”固定下来：

```text
小程序 = 用户行为和意图入口；
POS = 交易现场和员工操作入口；
mobile-hq 联邦项目族 = 商户动作和采纳入口；
后台事实服务 = 订单、商品、支付、退款、报表事实来源；
data-dyna = 统一事件契约、事实投影、指标、问题、动作、效果、副作用、采纳和证据。
```

本轮代码审视后的关键变化是：

```text
mobile-hq 不再只是“RMS 后台待确认”；它已经有明确 host + remotes 架构，是商户 adoption/action 的首批主接入面。
POS 现有 trackEvent/Aegis 只能作为工程监控锚点，不能直接升级为经营事实源。
小程序现有 menu-order 结构化 Aegis 日志说明菜单/支付节点清晰，但仍缺用户行为 Event Contract。
data-dyna 必须先从文档仓库变成最小 Event Ingestion + Evidence Store 服务，否则闭环不可执行。
```

一句话：

> 先用 `data-dyna` 自有 Event Contract 把“小程序用户行为 + POS 交易现场 + mobile-hq 商户采纳 + 后端订单/商品事实”汇成 `raw_events` 和业务投影，再跑通“指标 -> 问题 -> 动作 -> 结果 -> 副作用 -> 采纳 -> 证据”；这比继续扩写 AI 设想更实际，也更能形成可销售、可复用的独立咖啡厅经营证据。
