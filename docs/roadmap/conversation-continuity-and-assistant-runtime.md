# Conversation Continuity and Assistant Runtime

Status: SSOT draft v0.1  
Date: 2026-05-02  
Owner: `data-dyna` product / frontend / backend architecture  
Depends on: `docs/exp/restaurant-intent-layer-thesis.md`, `docs/roadmap/mvp-menu-growth-copilot-roadmap.md`  
Scope: MVP architecture for a continuous merchant Copilot embedded into POS / mini-program workflows

## 0. Product decision

Conversation continuity is a core MVP capability, not a UI add-on.

Reason:

```text
If the merchant must re-explain store context, current issue, prior actions, and business goals in every session, the Copilot will not become a daily operating tool.
```

The assistant must behave like a persistent operating partner:

```text
knows the store
knows the current operating goal
knows prior recommendations and actions
knows which actions worked or failed
can continue a diagnosis across days
```

## 1. MVP assistant shape

The fastest frontend shape should be a decoupled assistant widget/drawer:

```text
POS / mini-program frontend
  -> Assistant Widget / Drawer
  -> Assistant Runtime API
  -> Context Builder
  -> Metrics / Event Store
  -> Action Executor
  -> Audit / Experiment / Feedback
```

Frontend minimum:

| Surface | MVP behavior |
|---|---|
| entry | fixed `AI 经营助手` button or page-level assistant button |
| container | side drawer on desktop/POS; bottom sheet or full-screen panel on mobile |
| message UI | streaming or incremental response supported, but not required for first doc scope |
| cards | daily report, diagnosis, recommendation, action, effect review |
| quick prompts | “今天为什么下降？”, “哪个菜最影响转化？”, “昨天调整有没有用？” |
| action buttons | view evidence, apply draft, reject, rollback, ask follow-up |

The widget must not own business logic. It renders assistant messages, context, cards, and actions returned by the runtime.

## 2. Continuity layers

The assistant needs five continuity layers.

### 2.1 Session continuity

Purpose: understand follow-up references in the current conversation.

Example:

```text
User: 今天午餐为什么差了？
Assistant: ...支付放弃率上升，集中在 12:05–12:35...
User: 那明天怎么改？
```

The assistant must resolve `那` to the active diagnosis.

Required state:

```text
session_id
active_topic
last_diagnosis_id
last_action_card_ids
last_time_range
last_metric_focus
```

### 2.2 Store continuity

Purpose: avoid treating each conversation as a cold start.

Store memory examples:

```text
store_type: coffee / fast casual / tea / QSR / full-service
primary_daypart: lunch_peak / dinner / all_day
merchant_priority: revenue / margin / speed / retention / review_quality
signature_items
items_never_hide_without_confirmation
preferred_discount_style
fulfillment_constraints
```

Rule: store memory must be merchant-scoped and auditable.

### 2.3 Goal continuity

Purpose: maintain operating campaigns across days.

Example:

```text
current_goal: reduce lunch checkout abandonment
strategy: lower exposure of complex dishes during 12:00–12:40 and promote fast combo A
watch_metrics: payment_abandonment_rate, avg_wait_time, AOV, bad_review_rate
review_date: tomorrow after lunch
```

Goal state allows the next daily report to connect results to prior decisions.

### 2.4 Action continuity

Purpose: answer what was recommended, accepted, applied, ignored, reverted, and why.

Required action lifecycle:

```text
suggested
  -> drafted
  -> accepted | rejected
  -> applied
  -> measured
  -> kept | reverted | extended | retest_needed
```

Every action must keep:

```text
action_id
recommendation_id
actor
source_message_id
created_at
applied_at_optional
reverted_at_optional
status
rollback_ref_optional
evidence_refs
expected_metrics
guardrail_metrics
```

### 2.5 Review continuity

Purpose: learn store-specific operating patterns.

Examples:

```text
Past 4 lunch-peak complex-dish suppression actions reduced avg wait time by 11%, but AOV fell 3%.
Promoting combo A worked 3 times in weekday lunch.
The merchant prefers bundle optimization over full-reduction coupons.
Rainy-day hot drink promotion worked; fried snack promotion did not.
```

Review memory should be evidence-backed. Weak or small-sample conclusions must be labeled.

## 3. Runtime components

| Component | Responsibility | Non-responsibility |
|---|---|---|
| Assistant Widget | render messages, cards, actions, current page context | metric computation, action execution |
| Assistant Runtime API | session/message orchestration, response assembly | direct database analytics without Context Builder |
| Context Builder | gather merchant/store/page/metric/action context | inventing missing facts |
| Metrics Service | compute funnels, comparisons, guardrails | natural-language explanation |
| Recommendation Service | create structured candidate insights/actions | unaudited direct changes |
| LLM Orchestrator | explain, converse, summarize, translate intent into bounded actions | being the source of metric truth |
| Action Executor | apply confirmed changes and rollback | silent unbounded automation |
| Audit Log | immutable trace of suggestions/actions/results | business reasoning generation |
| Experiment / Effect Review | compare outcome after interventions | claiming causality without enough evidence |

## 4. API contract sketch

### 4.1 Create or resume session

```http
POST /assistant/sessions
```

Request:

```json
{
  "merchant_id": "m_...",
  "store_id": "s_...",
  "user_id": "u_...",
  "entry_surface": "pos_drawer",
  "page_context": {
    "route": "/pos/menu",
    "selected_item_id": null,
    "time_range": "today"
  }
}
```

Response:

```json
{
  "session_id": "asst_sess_...",
  "active_goal": {
    "goal_id": "goal_...",
    "title": "降低午高峰支付放弃率"
  },
  "suggested_prompts": [
    "今天为什么销售下降？",
    "哪个菜最影响转化？",
    "昨天调整有没有用？"
  ]
}
```

### 4.2 Send message

```http
POST /assistant/messages
```

Request:

```json
{
  "session_id": "asst_sess_...",
  "merchant_id": "m_...",
  "store_id": "s_...",
  "user_id": "u_...",
  "message": "今天午餐为什么差了？",
  "page_context": {
    "route": "/pos/dashboard",
    "time_range": "today_lunch"
  }
}
```

Response shape:

```json
{
  "message_id": "msg_...",
  "type": "assistant_response",
  "text": "今天午餐销售比上周同日下降 18%...",
  "evidence": [
    { "metric": "payment_abandonment_rate", "delta": "+4.2pp", "window": "12:05-12:35" },
    { "metric": "avg_wait_time", "delta": "+8min", "window": "12:05-12:35" }
  ],
  "cards": [
    {
      "card_type": "action_card",
      "action_id": "act_...",
      "title": "明天午高峰降低复杂菜曝光",
      "buttons": ["view_evidence", "apply_draft", "reject", "ask_follow_up"]
    }
  ],
  "suggested_prompts": ["哪些菜最拖慢？", "这个调整会不会影响客单价？"]
}
```

### 4.3 Apply action

```http
POST /assistant/actions/{action_id}/apply
```

Request:

```json
{
  "merchant_id": "m_...",
  "store_id": "s_...",
  "user_id": "u_...",
  "confirmation": true,
  "apply_mode": "draft_or_confirmed_apply"
}
```

Rule: MVP defaults to confirmation-first. Silent auto-apply is out of scope.

### 4.4 Reject or dismiss action

```http
POST /assistant/actions/{action_id}/reject
```

Request:

```json
{
  "reason": "老板不希望午高峰隐藏招牌菜",
  "free_text_optional": "招牌牛肉饭必须保留第一屏"
}
```

Reject reasons should update store preferences when stable and explicitly accepted.

### 4.5 Effect review

```http
GET /assistant/actions/{action_id}/effect-review
```

Response:

```json
{
  "action_id": "act_...",
  "status": "measured",
  "summary": "支付放弃率下降 2.8pp，平均等待下降 3 分钟，客单价无明显变化。建议继续试运行 3 天。",
  "metrics": [
    { "metric": "payment_abandonment_rate", "before": "11.2%", "after": "8.4%" },
    { "metric": "avg_wait_time", "before": "18m", "after": "15m" },
    { "metric": "AOV", "before": "38.6", "after": "38.1" }
  ],
  "confidence": "medium",
  "recommendation": "extend"
}
```

## 5. Context Builder contract

Every assistant response should be generated from bounded context, not broad database dumps.

Input context categories:

| Category | Examples |
|---|---|
| identity | merchant_id, store_id, user role |
| page | current route, selected item, selected report/time range |
| session | active topic, last diagnosis, last actions |
| store profile | category, daypart, merchant preferences, constraints |
| metrics | requested metric windows and comparisons |
| action history | recent suggestions, applications, rejections, reviews |
| permissions | allowed actions for current user |
| compliance | whether data can be used for this purpose |

Output to LLM should separate facts from assumptions:

```json
{
  "facts": ["today_lunch_sales_down_18_percent", "payment_abandonment_up_4_2pp"],
  "candidate_causes": ["wait_time_increase"],
  "unknowns": ["weather data unavailable", "kitchen queue source incomplete"],
  "allowed_actions": ["create_menu_ranking_draft", "create_coupon_draft"],
  "disallowed_actions": ["silent_auto_send_coupon", "cross_store_targeting"]
}
```

## 6. Memory model

| Memory type | Scope | Retention intent | Example |
|---|---|---|---|
| session memory | one conversation | follow-up resolution | active diagnosis and referenced items |
| store memory | one merchant/store | operating personalization | “do not hide signature item without confirmation” |
| goal memory | store + time-bounded campaign | continuity across days | “reduce lunch abandonment this week” |
| action memory | action lifecycle | audit and review | applied ranking change at 2026-05-02 11:30 |
| evidence memory | metric-backed pattern | future recommendation | combo A worked in weekday lunch 3 times |
| user preference | user/role | interaction style and approval policy | boss prefers concise daily summary |

Memory write rules:

- Do not store inferred preferences as permanent without evidence or user confirmation.
- Do not store cross-store personal identity linkage in MVP.
- Store action/effect evidence with metric references.
- Mark weak evidence as weak.
- Make memory inspectable and correctable by merchant/admin.

## 7. Frontend integration pattern

### 7.1 Decoupled widget

The widget should be portable across POS and mini-program admin pages.

Inputs from host page:

```ts
type AssistantPageContext = {
  route: string
  merchantId: string
  storeId: string
  userId: string
  selectedItemId?: string
  selectedOrderId?: string
  selectedTimeRange?: string
  permissions: string[]
}
```

Widget responsibilities:

- open/close assistant panel
- pass current page context to runtime
- render messages and cards
- dispatch action-button events
- display loading/error states

Host page responsibilities:

- provide authenticated merchant/store/user context
- provide current route/selection
- handle navigation triggered by assistant card when needed
- enforce frontend permissions visually, while backend remains authority

### 7.2 Minimal UI states

```text
closed
opening
ready_empty
ready_with_session
sending
streaming_or_loading
action_confirming
action_applied
action_failed
```

### 7.3 Card types

| Card type | Purpose |
|---|---|
| daily_summary | today’s operating report |
| metric_evidence | chart/table-backed evidence |
| item_diagnosis | item-level problem/opportunity |
| action_card | proposed intervention |
| effect_review | outcome after action |
| clarification | ask user to choose store/time/action |
| guardrail_warning | warn about risk such as wait/refund/review impact |

## 8. Action safety and audit

Every action must answer:

```text
Who triggered it?
What changed?
Why was it recommended?
What data supported it?
When was it applied?
Can it be rolled back?
What metrics will review it?
```

Minimum audit fields:

```text
audit_id
action_id
merchant_id
store_id
actor_user_id
actor_type: human | system
operation: draft | apply | reject | revert | measure
before_state_ref
after_state_ref
evidence_refs
created_at
```

MVP action policy:

| Action risk | Policy |
|---|---|
| read-only diagnosis | allowed without confirmation |
| draft generation | allowed with visible source |
| menu ranking apply | explicit confirmation required |
| coupon send | explicit confirmation required; draft first |
| hide item | explicit confirmation unless stock source is authoritative and merchant configured auto-hide |
| cross-store marketing | out of MVP |
| price increase | out of MVP unless manual merchant edit |

## 9. Continuity evaluation

The assistant should be tested with continuity probes, not only unit tests.

Required probes:

| Probe | Expected behavior |
|---|---|
| follow-up reference | user says “那明天怎么改？” and assistant resolves prior diagnosis |
| prior action review | user asks “昨天那个调整有没有用？” and assistant finds action/effect data |
| store preference | assistant remembers confirmed “不要隐藏招牌菜” constraint |
| weak data | assistant says evidence is insufficient instead of inventing certainty |
| page context | user asks “这个菜为什么差？” on item page and assistant uses selected item |
| permission | cashier user cannot apply merchant-level menu changes |
| rollback | applied action exposes rollback if supported |

## 10. Privacy / compliance boundary

MVP default:

```text
merchant-scoped assistant only
no cross-store personal targeting
no ad network
no inferred willingness-to-pay pricing
```

Assistant must not answer requests like:

```text
找出哪些用户愿意付更高价格，然后给他们涨价。
```

Acceptable alternatives:

```text
识别适合新品尝鲜券的人群。
识别库存临期商品的促销窗口。
识别午高峰应降低曝光的复杂菜。
识别最近可能流失的会员并生成关怀券草稿。
```

## 11. Future plan handoff

This document should feed future `docs/plan/*` worksets. First execution plan should not implement all runtime pieces. Suggested first implementation sequence:

1. define assistant context contract
2. define event / metric dependencies for daily report
3. implement read-only assistant widget shell
4. implement session continuity
5. implement daily report response
6. implement action cards as draft-only
7. implement action audit
8. implement effect review for one action type

Do not implement silent automation before confirmation, audit, and rollback exist.

## 12. Open questions

| Question | Impact | Suggested resolution |
|---|---|---|
| Which frontend framework is first target? | determines widget implementation | choose POS/admin reference app before code plan |
| Does mini-program customer side need assistant too? | customer assistant differs from merchant Copilot | keep MVP merchant-side only |
| Is streaming required? | affects API complexity | optional; do not block MVP on streaming |
| What auth/permission model exists? | action safety | define roles before action apply |
| Which data store owns conversation memory? | continuity and audit | choose after backend stack is known |
| How are merchant preferences confirmed? | prevents bad long-term memory | add explicit “remember this preference?” path |
