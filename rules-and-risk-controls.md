# ReScrap — Rules & Risk Controls

Status: Approved · Last updated: 2026-09-27

---

## 1. Purpose

This document defines the **business rules** and **risk controls** that the implementation must enforce. Rules here are invariants, not suggestions. Code that cannot satisfy them is incorrect code.

---

## 2. Business rules

### 2.1 Lot rules

| ID | Rule |
|---|---|
| LOT-01 | A Lot is created by exactly one Collector. A Collector may create many Lots. |
| LOT-02 | A Lot belongs to exactly one lifecycle state at any time. |
| LOT-03 | Lot IDs are server-generated, sequential, human-readable (`LOT-RS-00001`). Never client-asserted. |
| LOT-04 | A Lot must have ≥1 LotItem before it can leave `DRAFT`. |
| LOT-05 | Each LotItem must reference a known Material and a weight > 0. |
| LOT-06 | Material identification is always subject to collector confirmation. An unconfirmed AI prediction cannot be persisted as the item's material. |
| LOT-07 | A Lot may be withdrawn by its owning Collector only while in `DRAFT` or `CREATED`. |
| LOT-08 | A Lot's material composition is immutable after `MATCHING`. Corrections after matching require admin action and generate an audit event. |
| LOT-09 | Lot state history is append-only. State is never silently overwritten. |

### 2.2 Pricing rules

| ID | Rule |
|---|---|
| PRICE-01 | A Price Record is reference data with an effective timestamp. It is not a binding quote. |
| PRICE-02 | Estimated Value is an **estimate**. It must never be presented as a guaranteed or final price. |
| PRICE-03 | The four price concepts — Reference Price, Estimated Value, Recycler Offer, Final Amount Received — must remain visually and semantically distinct in every collector-facing surface. |
| PRICE-04 | Estimated Value is computed server-side from reference price × weight × condition factor × location factor. It is never accepted from the client. |
| PRICE-05 | A Recycler Offer is a binding commitment by that recycler until withdrawn or superseded, and must state its validity window. |
| PRICE-06 | Final Amount Received is derived from the handover's reconciled final weight and the accepted offer rate. It is never independently client-supplied. |
| PRICE-07 | The collector must be able to see the difference between their estimate and the final amount whenever they differ. |
| PRICE-08 | All monetary values are stored as integer minor units. Floating-point currency arithmetic is prohibited. |

### 2.3 Recycler authorization rules

| ID | Rule |
|---|---|
| RECY-01 | Only recyclers with authorization status `VERIFIED` may submit offers. |
| RECY-02 | Only recyclers with status `VERIFIED` may appear as matches for collectors. |
| RECY-03 | Authorization status is set by Admin action only, and every change is audit-logged with actor, timestamp and reason. |
| RECY-04 | A `SUSPENDED` or `REJECTED` recycler's active deals are flagged for admin review. Existing traceability records are never deleted. |
| RECY-05 | Recycler authorization status must be displayed to the collector as a plain-language badge ("Verified"). |
| RECY-06 | **No real recycler authorization exists.** All seeded recyclers carry demo authorization status, clearly labelled. No UI may imply a real regulatory authorization. |

### 2.4 Offer rules

| ID | Rule |
|---|---|
| OFFER-01 | An offer references exactly one Lot and one Recycler. |
| OFFER-02 | Only a Recycler may create an offer on a lot. Only the lot's owning Collector may accept, reject, or counter it. |
| OFFER-03 | An offer may only be created while the Lot is in `MATCHING`, `OFFER_RECEIVED`, or `NEGOTIATION`. |
| OFFER-04 | Offer amount must be > 0 and within a configured sanity band relative to the estimated value. Outside the band, the offer requires an explicit justification. |
| OFFER-05 | Offers may be withdrawn by the Recycler or expired by the system. Expiry is recorded, not deleted. |
| OFFER-06 | Accepting an offer is atomic: it supersedes all other offers on the lot, transitions the lot, and writes a traceability event. Partial application is prohibited. |
| OFFER-07 | A Collector may hold at most one accepted offer per Lot. |
| OFFER-08 | Offer history is preserved. Superseded and rejected offers remain visible to both parties. |
| OFFER-09 | Negotiation (counters) is P1. The MVP accepts the first valid offer or rejects it. |

### 2.5 Transaction rules

| ID | Rule |
|---|---|
| TXN-01 | One Lot yields at most one completed Transaction. |
| TXN-02 | A Transaction is created only after both handover confirmation and a payment record exist. |
| TXN-03 | Transaction status is derived from its components, never set independently. |
| TXN-04 | The Collector and the Recycler see the same Transaction, from their own authorized projection of it. |
| TXN-05 | A Transaction, once created, is immutable. Corrections are recorded as adjustment events, never as edits. |

### 2.6 Handover rules

| ID | Rule |
|---|---|
| HAND-01 | A handover may only be scheduled against a Lot with an accepted offer. |
| HAND-02 | Both parties confirm: the Recycler executes, the Collector verifies. Neither alone completes the handover. |
| HAND-03 | Final weight is captured at handover and is authoritative for valuation. Declared weight is retained for comparison. |
| HAND-04 | If `|final − declared| / declared` exceeds the configured tolerance, the lot is flagged for review and payment is held pending confirmation. |
| HAND-05 | Handover evidence — timestamp, location, photographs, both identities — is captured and retained. |
| HAND-05a | Handover evidence is immutable once recorded. |
| HAND-06 | A handover cannot be completed more than once per lot. |
| HAND-07 | Location is captured at handover only. Continuous background location tracking is prohibited by data-minimization policy. |

### 2.7 Payment rules

| ID | Rule |
|---|---|
| PAY-01 | `CASH` is a first-class method and must never be blocked or deprioritized by lack of digital payment capability. |
| PAY-02 | A payment record requires a linked accepted offer and a completed handover. |
| PAY-03 | Payment amount is computed from the accepted offer rate × reconciled final weight. Never accepted from the client. |
| PAY-04 | A payment must not be represented as complete without either a valid confirmation reference or an explicit, visible simulated indicator. |
| PAY-05 | Payment state transitions: `PENDING → CONFIRMED`, `PENDING → DISPUTED`, `PENDING → CANCELLED`. Terminal states are immutable. |
| PAY-06 | All payment actions are audit-logged. |
| PAY-07 | No real money movement occurs in the MVP. All payment completion is explicitly simulated and labelled. |

### 2.8 Earnings rules

| ID | Rule |
|---|---|
| EARN-01 | Collector earnings count only payments in `CONFIRMED` state. |
| EARN-02 | Pending, offered and accepted amounts are shown separately and never counted as earned. |
| EARN-03 | Earnings are derived, never stored as a mutable running total on the collector record. |

---

## 3. Fraud and abuse controls

| ID | Control | Addresses |
|---|---|---|
| FRD-01 | Server-side authorization on every endpoint. Client role checks are UX only. | Privilege escalation |
| FRD-02 | Client-supplied prices, weights, payment amounts and lot ownership are never trusted. | Price/weight fraud |
| FRD-03 | Idempotency keys on all lot-creating operations, enforced by a unique DB constraint. | Duplicate transactions from sync replay |
| FRD-04 | Lot state machine enforced centrally; illegal transitions rejected at the shared layer. | Lifecycle tampering |
| FRD-05 | Recycler offers restricted to `VERIFIED` recyclers; unverified recyclers cannot participate. | Unauthorized buying |
| FRD-06 | Counterparty cannot set final price or final weight. | Bilateral fraud |
| FRD-07 | Rate limiting on OTP request/verify. | SMS abuse, brute force |
| FRD-08 | Append-only audit events for all administrative and financial actions. | Repudiation, insider misuse |
| FRD-09 | Collector personal data minimized; no government ID required for MVP; no continuous location. | Privacy harm to a vulnerable population |
| FRD-10 | Recycler Portal receives only the collector data the handover workflow requires. | Privacy leakage |
| FRD-11 | Price sanity bands on offers; out-of-band offers require justification and are flagged. | Collusion, extreme pricing |
| FRD-12 | Weight discrepancy tolerance triggers review before payment release. | Weight manipulation |
| FRD-13 | Anomaly detection flags unusual material/weight/location/price combinations for human review. | Systematic abuse patterns |
| FRD-14 | Parameterized SQL only. | Injection |
| FRD-15 | Untrusted content rendered as text, never as raw HTML. | Stored XSS |
| FRD-16 | No secrets in source or committed config; environment-based configuration only. | Credential exposure |
| FRD-17 | AI confidence thresholds gate AI-assisted output; below threshold, deterministic fallback and human confirmation. | Blind automated decisions |
| FRD-18 | Demo/simulated data is flagged in the data model (`demo: true`) and surfaced in UI. | Passing off demo as real |

---

## 4. AI confidence and validation controls

| ID | Control |
|---|---|
| AI-01 | Every AI prediction records `method` (`model` \| `rule`) and `confidence`. |
| AI-02 | A prediction with no recorded confidence must not be displayed. |
| AI-03 | Material classification is advisory. Collector confirmation or correction is required before the material is persisted on the lot item. |
| AI-04 | Valuation output is always labelled an estimate and is recomputable from its inputs. |
| AI-05 | Matching output must carry at least one plain-language reason. An unexplained score must not be rendered. |
| AI-06 | Anomaly detection flags only. It never auto-rejects, auto-cancels, or auto-adjusts a transaction. |
| AI-07 | Human review is always available for any AI-influenced outcome. |
| AI-08 | Where training data is insufficient, rule-based methods are used and the method is labelled. |
| AI-09 | Model accuracy must never be asserted without measured evidence. **[DATA REQUIRED]** |
| AI-10 | Any model version change is recorded so historical predictions remain interpretable. |

---

## 5. Data validation controls

| ID | Control |
|---|---|
| VAL-01 | Zod validation at every boundary: HTTP, sync outbox, AI input, file metadata. |
| VAL-02 | Weight: finite, > 0, within a sane upper bound for the material. |
| VAL-03 | Monetary amounts: integer minor units, > 0, within configured bounds. |
| VAL-04 | All timestamps stored in UTC; rendered in the user's locale. |
| VAL-05 | Image uploads: type allowlist, size cap, re-encoding, metadata stripped. |
| VAL-06 | Coordinates: numeric, within valid bounds, rounded to an appropriate precision (≈11 m) — precision beyond operational need is prohibited. |
| VAL-07 | Text fields length-capped; no unbounded free text in collector flows. |
| VAL-08 | Unknown or unrecognized material must be representable rather than forced into a wrong category. |

---

## 6. Safety controls

| ID | Control |
|---|---|
| SAFE-01 | Safety content is attached to materials, not delivered as generic documentation. |
| SAFE-02 | Safety guidance is available **before** the material is handled, at the point of selection. |
| SAFE-03 | Content is simple, pictorial, short-sentence, and available in the user's language. |
| SAFE-04 | Materials with hazardous handling requirements (batteries, CRT displays, cables, toner, refrigerants) are flagged in the catalogue and surface a warning at selection. |
| SAFE-05 | No ReScrap screen or workflow ever instructs a collector to perform acid extraction, burn cables, or break CRT displays. |
| SAFE-06 | Audio safety briefings are P2; the text/pictorial form is the MVP requirement. |

Core guidance content (illustrative, subject to safety review): do not burn cables; do not perform acid extraction; handle batteries carefully and avoid terminal contact; do not break CRT displays unnecessarily; wash hands after handling; do not cut sealed cylindrical cells.

---

## 7. Location and privacy controls

| ID | Control |
|---|---|
| PRIV-01 | Location captured at handover only. No background or continuous tracking. |
| PRIV-02 | Coordinate precision capped at operational necessity. |
| PRIV-03 | Collector profile holds a name and OTP-verified phone. No government ID, no address, no financial details for MVP. |
| PRIV-04 | Recycler sees collector **area**, not a persistent precise location, until a handover is scheduled. |
| PRIV-05 | Role-based access enforced server-side on every resource. |
| PRIV-06 | Personal data excluded from analytics payloads. |
| PRIV-07 | Sensitive values never written to logs. |
| PRIV-08 | Right to deletion handled as a documented process, subject to traceability retention obligations. **[DATA REQUIRED]** — retention policy to be finalized with legal input. |
| PRIV-09 | All seed/demo data is fictional and labelled. No real personal data is ever used. |

---

## 8. Audit requirements

| ID | Requirement |
|---|---|
| AUD-01 | Every lot state transition is recorded: previous state, new state, actor, role, timestamp, reason, evidence reference. |
| AUD-02 | Every administrative action is recorded: actor, action, target, before/after, timestamp, reason. |
| AUD-03 | Every payment action is recorded. |
| AUD-04 | Every recycler verification decision is recorded, including rejections. |
| AUD-05 | Audit events are append-only. No update, no delete. |
| AUD-06 | Audit events are queryable by admin in the Admin Console. |
| AUD-07 | Anomaly flags, dispute openings and state overrides are audit events. |

---

## 9. Risk register

| # | Risk | Severity | Control | Residual |
|---|---|---|---|---|
| R1 | Collector cannot operate the app (literacy, device cost) | Critical | Low-literacy UX, audio, minimal typing, low-end device performance budget | Validate in Phase 5 |
| R2 | Network unreliable in the field | Critical | Offline-first local DB + idempotent outbox | Validate in Phase 5 |
| R3 | Formal route not more profitable than informal | Critical | Price transparency, competing offers, prompt payment | **[DATA REQUIRED]** — field validation required |
| R4 | No real recyclers onboarded | High | Demo recycler directory; verified onboarding is a Phase 5 activity | Blocks field validation |
| R5 | AI without data | High | Deterministic fallbacks, confidence labelling, no accuracy claims | Resolved by design |
| R6 | Weight/price manipulation | High | Server authority on both, tolerance checks, anomaly flags | Monitor |
| R7 | Unsafe handling exposure | High | Material-attached safety content, no hazardous instructions | Requires safety review |
| R8 | Privacy harm to a vulnerable population | High | Data minimization, no ID, no continuous location | Ongoing |
| R9 | Scope creep into generic marketplace | Medium | Non-goals in `prd.md` §7; feature admission test | Ongoing |
| R10 | Documentation drift from code | Medium | Changelog + project-summary maintained per phase | Process control |
| R11 | Duplicate transactions via sync replay | Medium | Idempotency keys + unique constraint | Mitigated by design |
| R12 | Physical safety of handover | High | Both-party confirmation, evidence capture, location, dispute flag | Process + tech controls |
| R13 | Unverified recyclers entering the market | High | Authorization gate on offer creation | Mitigated by design |

---

## 10. Honesty controls

These are hard product rules, not preferences.

| ID | Rule |
|---|---|
| HON-01 | No claim of real recycler partnership or regulatory authorization. All recycler data is demo data. |
| HON-02 | No claim that a real payment occurred. All MVP payment completion is explicitly simulated and labelled. |
| HON-03 | No claim of AI accuracy without measured evidence. |
| HON-04 | No environmental impact figures without a documented calculation basis. |
| HON-05 | No fabricated testimonials, statistics, or field-study results. |
| HON-06 | Demo indicators are visible to the user wherever demo data is displayed. |
| HON-07 | Where evidence is required but unavailable, use `[DATA REQUIRED]` or `[VALIDATION REQUIRED]`. |
