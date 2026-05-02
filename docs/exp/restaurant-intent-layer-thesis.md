# Restaurant Intent Layer Thesis

Status: SSOT draft v0.1  
Date: 2026-05-02  
Owner: `data-dyna` product / architecture  
Scope: strategic thesis for餐饮 POS / 小程序点餐 SaaS的数据闭环与长期平台方向

## 0. Decision

`data-dyna` should not be positioned as a generic POS, BI, or “more user behavior data” product.

It should be positioned as a **restaurant intent layer**:

> A system that enters the restaurant transaction scene through POS / mini-program ordering, observes customer intent, transaction outcomes, store fulfillment state, and merchant actions, then turns them into measurable operating interventions.

The core strategic equation is:

```text
user behavior
+ outcome labels
+ store fulfillment context
+ merchant-controllable actions
+ closed-loop verification
= compounding restaurant operating intelligence
```

The important correction:

```text
More behavior data alone does not guarantee stronger capability.
More behavior data + labels + interventions + verification creates stronger capability.
```

## 1. Why POS / mini-program ordering is the right entry point

Restaurant POS / ordering SaaS is close to **transaction-time intent**:

| Platform type | Main intent captured | Weakness |
|---|---|---|
| Review / local-life platforms | discovery, comparison, traffic intent | less visibility into in-store fulfillment and merchant operating constraints |
| Content platforms | content-triggered demand | weak transaction and fulfillment truth |
| Payment-only systems | completed transaction | weak pre-transaction hesitation / abandonment truth |
| POS + mini-program ordering | menu browsing, cart, payment, fulfillment, repeat purchase | must earn merchant adoption and solve data governance early |

POS / mini-program ordering can observe both sides of the transaction:

```text
customer intent before purchase
  +
actual order outcome
  +
store ability to fulfill
```

That combination is the foundation for a restaurant operating system, not just a reporting tool.

## 2. The system must answer operating questions, not only collect events

The valuable questions are conditional and intervention-oriented:

```text
Under what time, location, weather, customer segment, menu structure, price,
image, recommendation order, discount, and kitchen pressure is a customer more
likely to order, reorder, add-on, abandon, complain, wait, refund, or churn?
```

A useful system must support this chain:

```text
observe condition
  -> explain outcome
  -> propose intervention
  -> execute or assist execution
  -> measure result
  -> learn
```

If `data-dyna` only records what users viewed or ordered, it remains analytics. If it can change menu ranking, recommendations, discounts, inventory visibility, employee prompts, and customer messaging, it becomes an operating layer.

## 3. Data layers

The product should treat restaurant data as six layers. Each layer has different value and governance rules.

| Layer | Examples | Primary value |
|---|---|---|
| Customer behavior | entry source, menu views, item dwell, detail opens, add-to-cart, remove-from-cart, checkout abandonment, coupon use | reveals pre-purchase intent and hesitation |
| Transaction outcomes | ordered items, AOV, payment success, refund, review, reorder, membership conversion | labels behavior and turns events into training/evaluation samples |
| Store operations | kitchen queue, KDS state, prep time, printer tasks, sold-out items, returns, modifications, employee actions | explains whether demand failed because of customer preference or store capacity |
| Space / time context | store, district, table, distance, weather, holiday, lunch/dinner peak, weekday/weekend | explains contextual demand variation |
| Content / product data | image, name, description, price, category, ranking, tags, prep time, gross margin, inventory | makes menu a tunable conversion surface |
| Cross-merchant aggregates | same-category benchmarks, district trends, price bands, product trends | enables benchmarking, index products, site selection, supply-chain insights |

## 4. Commercial opportunity map

Long-term opportunities are real, but they must be sequenced. The first product should create a single-merchant growth loop before cross-merchant monetization.

| Opportunity | Description | Earliest safe phase |
|---|---|---|
| Menu growth engine | ranking, add-ons, conversion analysis, A/B tests | MVP / early SaaS module |
| Merchant operating Copilot | daily diagnosis, natural-language questions, actionable recommendations | MVP / early SaaS module |
| Automatic execution | apply ranking, coupon, recommendation, sold-out, high-peak rules | after audit and rollback exist |
| Benchmarking / indexes | same-category and same-district comparisons | after enough merchants and aggregation safeguards |
| Site selection / franchise evaluation | expected order volume, price band, category gap, daypart structure | after data density by district/category |
| Menu design / new-product R&D | price sensitivity, naming, image, combo, product survival prediction | after menu-content and outcome linkage |
| Dynamic discounting | inventory, off-peak, churn, new-product promotion | only with clear non-discriminatory guardrails |
| Retail media / ads | supplier / brand / cross-store growth network | latest phase; requires explicit authorization and trust |
| Supply-chain optimization | demand forecast, replenishment, regional procurement, waste reduction | after inventory and sales truth are reliable |

## 5. Market validation signals

The direction is already validated by adjacent market leaders:

- Meituan / Dianping: local-life traffic + merchant + consumer behavior + ads/recommendation/fulfillment loop.
- Toast: restaurant data products such as benchmarking and customer-data tooling.
- Square: POS + payments + analytics + AI business Q&A.
- McDonald’s + Dynamic Yield: dynamic ordering interface based on time, weather, store traffic, popular items, and real-time conditions.
- DoorDash Ads: targeting and insights based on real food-ordering preference signals.

Implication:

```text
The market does not need another static POS.
The market rewards systems that convert transaction data into operating actions.
```

## 6. First wedge: single-merchant growth loop

The recommended first wedge is:

```text
mini-program ordering behavior analysis
+ menu conversion optimization
+ AI operating daily report
+ suggestion cards with measurable follow-up
```

The first buyer-facing promise should be plain:

```text
Tell me where I lost money today, why it happened, what to change tomorrow, and whether the change worked.
```

Avoid starting with:

- cross-merchant ads
- industry data resale
- full dynamic pricing
- generalized “AI restaurant brain” claims
- complex BI dashboards without actions

## 7. Operating flywheel

The intended flywheel:

```text
customer behavior
  -> intent recognition
  -> menu / recommendation / discount / fulfillment intervention
  -> order outcome
  -> store operating result
  -> experiment / attribution / learning
  -> better recommendation and operating advice
  -> stronger merchant dependency
  -> more data and action surfaces
```

The flywheel only works if the system owns or integrates with intervention surfaces:

| Surface | Example interventions |
|---|---|
| Menu | ranking, category order, item visibility, item copy/image tests |
| Recommendation | add-ons, bundles, substitutes, scenario recommendations |
| Discount | coupon draft, off-peak promotion, inventory clearance, reorder incentive |
| Fulfillment | hide complex dishes during pressure, wait-time warning, sold-out sync |
| Customer communication | delay apology, reorder reminder, subscription message, member care |
| Merchant workflow | daily report, employee prompt, action confirmation, rollback |

## 8. Role of LLM

LLM is not the source of truth for operating decisions. It should be the explanation and interaction layer over measurable signals.

Correct architecture:

```text
metrics / rules / models / experiments
  -> candidate insights and recommendations
  -> LLM explanation + conversation + plan formatting
  -> merchant confirmation or bounded auto-run
  -> action execution
  -> outcome measurement
```

LLM responsibilities:

- explain anomalies in merchant language
- summarize evidence and uncertainty
- generate recommendation cards
- maintain conversation continuity
- help users ask follow-up questions
- translate business intent into bounded actions

Non-responsibilities:

- unrestricted price discrimination
- unaudited auto-changes to merchant configuration
- inventing causes without metric evidence
- overriding compliance / consent boundaries

## 9. Privacy and data governance boundaries

Data products must be designed in three layers from day one:

| Layer | Use | Rule |
|---|---|---|
| Merchant-owned data | store analytics, member operations, menu optimization | used for that merchant’s own operations only |
| Anonymous aggregate data | benchmarking, indexes, trends | aggregated, de-identified, threshold-protected, not reversible to one person/store |
| Explicitly authorized cross-store data | joint membership, cross-store recommendations, ads | requires clear authorization, revocation, audit, and purpose limitation |

High-risk data includes precise location, movement trajectory, cross-store identity linkage, and inferred willingness-to-pay. These require strict necessity, explicit consent where applicable, and conservative product positioning.

Product rule:

```text
Dynamic discounts for inventory optimization, off-peak guidance, reorder care, and waste reduction are acceptable targets.
“Identify who can be charged more” is not an acceptable product target.
```

## 10. Non-goals for the initial product

The initial product should not attempt to become all of the following at once:

- a Meituan-style traffic platform
- a DoorDash-style ad network
- a full supply-chain ERP
- a generic BI platform
- a consumer super-app
- a black-box dynamic pricing engine

These may become future layers after the single-merchant closed loop is trusted and measurable.

## 11. SSOT links

This thesis anchors the roadmap documents:

- `docs/roadmap/mvp-menu-growth-copilot-roadmap.md`
- `docs/roadmap/conversation-continuity-and-assistant-runtime.md`

Any future `docs/plan/*` workset should preserve this ordering:

```text
single-merchant closed loop first
  -> automatic execution
  -> multi-merchant benchmarking
  -> cross-merchant / ads / supply-chain only after trust and governance
```

## 12. Open questions

| Question | Why it matters | Suggested next step |
|---|---|---|
| Which POS / mini-program stack is first target? | determines event SDK and action executor integration | choose one reference integration before implementation plan |
| Does the product own KDS / kitchen state? | affects fulfillment-pressure features | define minimum fulfillment fields even if manually approximated first |
| What merchant segment is first? | tea/coffee, fast casual, QSR, full-service differ in data shape | pick one segment for MVP metrics |
| What actions are safe for auto-apply? | determines confirmation and rollback requirements | start with draft/confirm; no silent auto-change in MVP |
| What consent model is available in mini-program? | determines member analytics and cross-store limits | draft privacy / consent requirements before cross-store features |
