# MVP Menu Growth Copilot Roadmap

Status: SSOT draft v0.1  
Date: 2026-05-02  
Owner: `data-dyna` product / execution planning  
Depends on: `docs/exp/restaurant-intent-layer-thesis.md`  
Scope: MVP roadmap for single-merchant menu growth, operating diagnosis, and measurable action loop

## 0. Product decision

The MVP is **not** an industry data platform, ad network, site-selection system, or full restaurant automation agent.

The MVP is:

> A single-merchant menu growth Copilot that observes mini-program ordering behavior, labels outcomes with transaction and fulfillment data, explains business changes, recommends bounded actions, and measures whether the actions worked.

First buyer-facing promise:

```text
每天告诉老板：哪里少赚钱了，为什么，明天改哪里，改完有没有效果。
```

## 1. MVP success criteria

The MVP is successful when one merchant can use it daily to complete this loop:

```text
open daily report
  -> understand one meaningful issue
  -> inspect evidence
  -> accept or reject one recommendation
  -> apply or create an action draft
  -> see outcome in the next report
```

Minimum measurable improvements should target one or more of:

| Metric | Why it matters |
|---|---|
| menu item impression-to-click rate | validates menu ranking / content relevance |
| click-to-add-to-cart rate | validates item attractiveness and detail-page content |
| cart-to-payment rate | validates price, discount, wait-time, and checkout friction |
| add-on rate | validates recommendation quality |
| AOV | merchant-visible revenue impact |
| payment abandonment rate | high-signal conversion loss |
| average wait time | fulfillment constraint |
| refund / bad-review rate | experience and over-optimization guardrail |
| repeat purchase interval | retention signal |

## 2. Non-goals

Do not put these into MVP execution scope:

- cross-merchant advertising
- cross-store user retargeting
- site selection
- supplier / brand media network
- full dynamic pricing
- unaudited autonomous menu modification
- full BI dashboard parity
- generic LLM chat without merchant context
- data resale or industry index products

These belong after the single-merchant loop has evidence.

## 3. Capability roadmap

### P0 — Data contract and observability foundation

Goal: make ordering behavior, transaction outcomes, fulfillment state, and recommendation/action provenance observable.

Required outputs:

| Output | Description |
|---|---|
| event taxonomy | stable event names and required fields |
| metric definitions | funnel, fulfillment, retention, and recommendation metrics |
| menu versioning | ability to connect outcomes to menu/ranking/content versions |
| action provenance | every recommendation/action has ID, source, timestamp, actor |
| privacy boundaries | merchant-only, aggregate, and authorized cross-store data separation |

Minimum events:

```text
menu_view
item_impression
item_click
item_detail_view
add_to_cart
remove_from_cart
cart_view
checkout_start
payment_success
payment_failed
order_cancelled
refund_requested
refund_completed
review_created
member_identified
recommendation_exposed
recommendation_clicked
coupon_exposed
coupon_used
assistant_suggestion_created
assistant_action_drafted
assistant_action_applied
assistant_action_rejected
assistant_action_reverted
experiment_assigned
experiment_exposure
```

Minimum dimensions:

```text
merchant_id
store_id
user_id_or_anonymous_id
session_id
order_id
item_id
category_id
menu_version_id
ranking_version_id
price_version_id
coupon_id
recommendation_id
action_id
experiment_id
variant_id
source_channel
page_route
table_id_optional
time_bucket
weather_optional
fulfillment_pressure_optional
```

P0 done when:

- events can reconstruct a menu funnel for a store/day
- orders can be joined to viewed/clicked/carted items when available
- actions and experiments can be tied to later outcomes
- no cross-merchant personal data use is required

### P1 — Menu conversion analytics

Goal: identify where menu revenue is leaking.

Features:

| Feature | Required answer |
|---|---|
| menu funnel | where users drop: impression, click, cart, checkout, payment |
| item diagnosis | high exposure/low click, high click/low cart, high cart/low pay |
| opportunity finder | low exposure/high conversion items |
| add-on candidate finder | items often bought together or near full-reduction thresholds |
| time-window comparison | lunch vs dinner, weekday vs weekend, today vs comparable day |
| fulfillment-aware warning | do not recommend over-exposing items with high prep pressure |

P1 done when a merchant can answer:

```text
Which 3 items most reduced revenue today, and at which funnel step did they fail?
```

### P2 — AI operating daily report

Goal: turn metrics into merchant-readable diagnosis.

Report structure:

```text
1. headline: what changed
2. main driver: why it likely changed
3. evidence: metrics and comparison baseline
4. affected items / time windows
5. recommendation cards
6. risk / uncertainty
7. follow-up question suggestions
```

Example target output:

```text
今天午餐销售比上周同日下降 18%。主要原因不是客流下降，而是支付页放弃率上升。
放弃集中在 12:05–12:35，期间平均等待时间从 11 分钟升至 19 分钟。
建议明天午高峰降低 3 个复杂菜曝光，并把快出套餐 A 放到首页第二位。
```

P2 done when:

- daily report cites metric evidence, not generic AI advice
- each recommendation has an explicit expected metric target
- uncertainty is visible when data is insufficient
- the user can ask follow-up questions in context

### P3 — Suggestion cards and bounded execution

Goal: move from advice to controlled action.

First action types:

| Action type | MVP behavior | Safety rule |
|---|---|---|
| menu ranking adjustment | create draft ranking or apply with confirmation | must show before/after and rollback |
| add-on recommendation | create candidate recommendation rule | must track recommendation_id |
| coupon draft | generate coupon config draft | no silent send to users |
| high-peak visibility rule | suggest lowering complex items during defined window | must include time window and affected items |
| sold-out / low-stock visibility | hide or deprioritize when stock status indicates shortage | requires source of stock truth or manual confirmation |
| daily report sharing | generate boss-readable summary | no external send without confirmation |

P3 done when:

- every recommendation becomes a structured `action_card`
- merchant can accept, reject, apply, revert, or ask for evidence
- every applied action is logged with actor and rollback path

### P4 — Experiment and effect review

Goal: verify whether actions caused useful outcomes.

MVP experiment modes:

| Mode | Use |
|---|---|
| before/after comparison | simplest baseline for small stores |
| time-window holdout | lunch window vs comparable lunch window |
| menu variant split | if traffic supports A/B |
| manual action review | when sample size is too small for statistical claims |

Effect review must report:

```text
action applied
comparison baseline
metric movement
guardrail movement
sample size / confidence warning
recommendation: keep, rollback, extend, or retest
```

Guardrails:

- AOV should not rise by pushing users into worse experience
- wait time and bad reviews must be monitored
- refund increase can invalidate a conversion gain
- small samples must be labeled as weak evidence

P4 done when a merchant can ask:

```text
昨天那个菜单调整有没有用？
```

and receive a metric-backed answer.

### P5 — Semi-automatic operating loop

Goal: repeat safe actions with bounded automation.

Candidate semi-auto actions:

- reorder menu during known lunch peak if prior tests repeatedly worked
- promote fast-prep items during kitchen pressure
- suggest but not auto-send churn coupons
- auto-generate daily report
- auto-draft weekly menu optimization plan

P5 done when:

- the system can reuse proven playbooks
- the merchant can configure approval level
- automation has audit, rollback, and disable controls

## 4. Data model sketch

### Core entities

| Entity | Required purpose |
|---|---|
| Merchant | owns stores and data boundary |
| Store | unit of operations and reporting |
| User / Anonymous visitor | session and member analysis; must respect consent |
| Session | behavior sequence before transaction |
| Menu | versioned menu structure |
| Item | product/content/price/fulfillment attributes |
| Order | transaction outcome label |
| Fulfillment state | prep/queue/wait/sold-out pressure |
| Recommendation | system-generated exposure candidate |
| Action | merchant/system intervention |
| Experiment | variant assignment and measurement boundary |
| Conversation | Copilot continuity and decision trace |

### Action card contract

```json
{
  "action_id": "act_...",
  "merchant_id": "m_...",
  "store_id": "s_...",
  "type": "menu_ranking_adjustment",
  "title": "明天午高峰提升快出套餐 A",
  "evidence": [
    { "metric": "payment_abandonment_rate", "delta": "+4.2pp", "window": "12:05-12:35" },
    { "metric": "avg_wait_time", "delta": "+8min", "window": "12:05-12:35" }
  ],
  "expected_effect": [
    { "metric": "payment_abandonment_rate", "target_delta": "-2pp to -4pp" }
  ],
  "guardrails": ["avg_wait_time", "bad_review_rate", "refund_rate"],
  "requires_confirmation": true,
  "rollback_supported": true
}
```

## 5. Implementation slices for future `docs/plan/*`

This roadmap is not itself a parser-compatible plan/workset. Future plan creation should preserve these slices:

| Slice | Purpose | Primary artifact |
|---|---|---|
| Slice 0 | establish SSOT | this doc + thesis + assistant runtime doc |
| Slice 1 | event taxonomy | `docs/roadmap/event-taxonomy-and-data-contract.md` |
| Slice 2 | metrics and labels | `docs/roadmap/metrics-and-labels-contract.md` |
| Slice 3 | Copilot interaction contract | `docs/roadmap/copilot-interaction-contract.md` |
| Slice 4 | action executor contract | `docs/roadmap/action-executor-contract.md` |
| Slice 5 | validation / experiment contract | `docs/roadmap/experiment-and-effect-review-contract.md` |

## 6. Verification gates

Before implementation starts, require these checks:

- [ ] every MVP feature maps to one of P0–P5
- [ ] every metric has numerator, denominator, time window, and owner
- [ ] every recommendation has evidence and expected outcome
- [ ] every action has actor, confirmation rule, audit log, and rollback rule
- [ ] every experiment has exposure ID or documented fallback
- [ ] every use of cross-store data states consent / aggregation boundary
- [ ] no MVP task depends on ad network, site selection, or supply-chain features

## 7. Risks and mitigations

| Risk | Failure mode | Mitigation |
|---|---|---|
| data without intervention | product becomes passive BI | require every insight to map to an action or explicit non-action |
| LLM hallucination | wrong causal explanation | require metric evidence and uncertainty wording |
| over-optimization | conversion rises but wait/refund/reviews worsen | guardrail metrics in every action review |
| sparse data | small merchants lack sample size | use qualitative warnings and before/after cautiously |
| merchant distrust | silent system changes feel dangerous | confirmation-first, audit, rollback |
| privacy breach | cross-merchant misuse | merchant-only default; aggregate/authorized layers only |
| plan sprawl | future work jumps to ads/indexes too early | keep MVP non-goals visible in docs/plan |

## 8. Next document dependencies

Create these only when moving from SSOT into execution planning:

1. `event-taxonomy-and-data-contract.md`
2. `metrics-and-labels-contract.md`
3. `copilot-interaction-contract.md`
4. `action-executor-contract.md`
5. `experiment-and-effect-review-contract.md`

Do not create implementation tickets before at least event taxonomy and metrics contract are defined.
