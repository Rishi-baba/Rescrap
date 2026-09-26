# ReScrap — Product Requirements Document

Status: Approved baseline · Owner: Project Owner
Last updated: 2026-09-27

---

## 1. Product overview

ReScrap is a digital platform that connects **informal e-waste collectors** with **authorized recyclers** through a single verifiable digital transaction.

ReScrap is not a doorstep scrap-pickup application. It is a **digital bridge between the informal collection economy and the formal recycling ecosystem**.

## 2. Problem

Informal e-waste collectors in India — the majority of the collection workforce — operate with severe structural disadvantages:

- **No price transparency.** Value of collected material is determined entirely by whoever the collector happens to sell to. No reference price exists.
- **No recycler access.** Collectors cannot identify, reach, or verify authorized recyclers. Verified formal recyclers are invisible to them.
- **No material intelligence.** Collectors often cannot identify what they are holding or what it is worth.
- **No formal channel.** Material collected informally frequently never re-enters a formal, traceable recycling stream.
- **No proof of transaction.** Handovers are undocumented. Collectors have no earnings history, no receipt, no evidence of fair dealing.
- **No bargaining position.** Without price reference or recycler choice, collectors accept whatever is offered.

The formal recycling ecosystem, meanwhile, has no structured channel to acquire this material, and no reliable data about informal flow.

## 3. Core insight

> The binding constraint is not logistics. It is **information and trust**.

If a collector can, with minimal literacy and no network:

1. identify what they have,
2. see an approximate fair value,
3. discover which verified recyclers will actually take it,
4. receive competing offers,
5. hand it over with proof,
6. get paid and keep a permanent record —

then the formal route becomes **easier, safer and more profitable** than the informal route. The channel formalizes itself.

The economic argument to the collector is the primary adoption mechanism. ReScrap must make the formal route visibly more valuable.

## 4. Target users

### 4.1 Collector (P0)

- Informal or semi-formal e-waste collector
- Operates in urban/peri-urban India
- Android smartphone, entry-level hardware
- Low to moderate literacy; may not read fluently
- Limited English; Hindi/Marathi primary
- Works outdoors, intermittent network coverage
- Handles material by hand — safety exposure is real

**Needs:** quick material identification, price sense, recycler access, guaranteed payment, proof of work, safety guidance.

### 4.2 Recycler (P0)

- Owner/operator of an authorized e-waste recycling facility
- Needs a reliable inbound supply of specific material categories
- Web/desktop user; information-dense workflows are appropriate
- Cares about material grade, quantity, location, logistics cost, margin

**Needs:** supply visibility, filtering, fast offer submission, deal management, pickup scheduling, handover verification, records for compliance.

### 4.3 Admin (P0)

- ReScrap platform operations staff
- Responsible for recycler verification, catalogue/price curation, exception handling, data quality
- Desktop user; requires auditability over visual delight

**Needs:** verification queue, transaction monitoring, dispute handling, price administration, analytics, audit trail.

## 5. User pain points

| Role | Pain | ReScrap response |
|---|---|---|
| Collector | Doesn't know the value | Price Board + Estimated Value |
| Collector | Can't identify material | Photo → AI classification with confirmation |
| Collector | No recycler access | Matched recycler list with plain-language reasons |
| Collector | Cannot read/operate complex UI | Low-literacy UX, minimal typing, audio, large targets |
| Collector | Works offline | Offline-first local database + sync queue |
| Collector | No proof of earnings | Digital Lot Passport + Earnings ledger |
| Collector | Handles hazardous material unsafely | Material-specific safety guidance |
| Recycler | No visibility of inbound supply | Available Lots board with filters |
| Recycler | Qualification takes time | Lot detail with material, weight, photos, location |
| Recycler | Deal management is ad hoc | Offers, negotiation, active deals, pickup schedule |
| Recycler | No compliance record | Transaction history + traceability export |
| Admin | Cannot verify recyclers | Verification queue with evidence review |
| Admin | No data quality oversight | Anomaly flags + data quality panels |

## 6. Product goals

- **G1.** Make the fair value of collected e-waste visible to the collector at the point of collection.
- **G2.** Put verified recyclers within reach of the collector's phone.
- **G3.** Replace verbal, undocumented handovers with verified, evidenced handovers.
- **G4.** Give the collector a permanent, portable record of every transaction.
- **G5.** Channel collected material into the formal recycling stream.
- **G6.** Generate structured, proprietary transaction data that improves matching, pricing and intelligence over time.
- **G7.** Reduce the physical safety exposure of informal collectors.

**All quantitative targets: [DATA REQUIRED]** — to be set after Phase 5 field validation. No numeric success metrics are asserted in this document.

## 7. Non-goals

ReScrap will **not**:

- Become a generic household doorstep scrap-pickup booking service.
- Become a generic e-commerce marketplace.
- Offer consumer-facing product sales.
- Offer unrelated financial products, credit, or insurance.
- Pursue social networking or gamification mechanics.
- Implement advanced AI in the absence of training data.
- Build large enterprise features unrelated to the informal→formal transition.
- Replace or bypass the formal regulatory/EPR framework.

Every proposed feature must answer: *does this improve the informal → formal e-waste transition?* If not, it does not enter the MVP.

## 8. Core value proposition

**For the collector:** *"I have scrap. I know roughly what it is worth. I can find a verified recycler. I can get an offer. I can hand it over safely. I get paid. I have proof."*

**For the recycler:** *"I can find relevant e-waste. I can see exactly what I am buying. I can offer fast. I manage collection. I verify handover. I keep records."*

**For the platform:** *"Every interaction produces structured, traceable data that makes the next transaction better."*

## 9. Feature inventory

Priority: **P0** = core MVP · **P1** = important after MVP · **P2** = future

### 9.1 Collector features

| # | Feature | Priority | Notes |
|---|---|---|---|
| C1 | Home / active scrap status | P0 | Single primary CTA: Add Scrap |
| C2 | Create Scrap Lot (draft → submit) | P0 | Offline-capable |
| C3 | Photo capture | P0 | Evidence + classification input |
| C4 | AI-assisted material identification | P0 | Confidence + collector confirmation/correction |
| C5 | Manual material selection | P0 | Always available; AI is assistive, never mandatory |
| C6 | Approximate weight entry | P0 | Large numeric input |
| C7 | Condition input | P0 | Feeds valuation |
| C8 | Source type | P1 | Household / IT / Commercial |
| C9 | Estimated Value | P0 | Clearly labelled as estimate |
| C10 | Price Board | P0 | Reference prices by material |
| C11 | Recycler Matches | P0 | Explainable reasons |
| C12 | Recycler detail | P0 | Verified status, accepted materials, distance |
| C13 | Offers list | P0 | |
| C14 | Accept / reject offer | P0 | |
| C15 | Negotiate | P1 | Counter-offer flow |
| C16 | Handover tracking | P0 | Status timeline |
| C17 | Verify Handover | P0 | Weight, photo, location, confirmation |
| C18 | Payment confirmation | P0 | Cash default; digital optional |
| C19 | Digital Lot Passport | P0 | Persistent per-lot record |
| C20 | My Scrap | P0 | |
| C21 | Earnings | P0 | Ledger of paid transactions |
| C22 | Notifications | P0 | Role-aware |
| C23 | Safety guidance | P0 | Material-specific |
| C24 | Profile (minimal) | P0 | Data-minimized |
| C25 | Language selection | P0 | Hindi / Marathi / English |
| C26 | Offline operation + sync | P0 | First-class |
| C27 | Handover dispute flag | P1 | |
| C28 | Audio/spoken price readout | P1 | |
| C29 | Material-specific audio safety briefing | P2 | |
| C30 | Multiple photo angles | P2 | |

### 9.2 Recycler features

| # | Feature | Priority | Notes |
|---|---|---|---|
| R1 | Dashboard (new lots, pending offers, active deals, upcoming pickups, pending actions) | P0 | Every metric drives a real decision |
| R2 | Available Lots board | P0 | |
| R3 | Search | P0 | |
| R4 | Filter: material, category, location, weight range, price range, status | P0 | |
| R5 | Sort | P1 | |
| R6 | Lot detail (photos, material, weight, location, estimate, collector area) | P0 | |
| R7 | Make Offer | P0 | |
| R8 | Negotiate / counter | P1 | |
| R9 | Accept / withdraw offer | P0 | |
| R10 | Active Deals | P0 | |
| R11 | Pickup scheduling | P0 | |
| R12 | Handover execution + confirmation | P0 | Final weight capture |
| R13 | Transaction history | P0 | |
| R14 | Recycling status update | P1 | |
| R15 | Business profile | P0 | |
| R16 | Authorization/verification display | P0 | Demo status; clearly marked |
| R17 | Notifications | P0 | |
| R18 | Saved searches / watchlist | P2 | |
| R19 | Bulk lot listing | P2 | |

### 9.3 Admin features

| # | Feature | Priority | Notes |
|---|---|---|---|
| A1 | Operational dashboard | P0 | |
| A2 | Recycler verification queue | P0 | Evidence review, approve/reject |
| A3 | Recycler management | P0 | |
| A4 | Collector management | P0 | |
| A5 | Material catalogue | P0 | |
| A6 | Price management | P0 | Reference price records |
| A7 | Transaction monitoring | P0 | |
| A8 | Traceability view | P0 | Full lifecycle per lot |
| A9 | Disputes | P1 | |
| A10 | Exceptions | P1 | Stuck/anomalous lots |
| A11 | Data quality panel | P1 | |
| A12 | Analytics | P1 | Only metrics supporting decisions |
| A13 | Safety content management | P1 | |
| A14 | Audit log viewer | P0 | |
| A15 | AI/ML monitoring | P2 | Post Phase 4 |

## 10. Core user journeys

### 10.1 Collector — primary journey (P0)

```
Add Scrap
  → Capture Photo
  → AI Material Identification (confirm or correct)
  → Scrap Details (weight, condition, source)
  → Review + Estimated Value
  → Recycler Matches
  → Recycler Offer(s)
  → Accept
  → Handover Tracking
  → Verify Handover
  → Payment Confirmation
  → Digital Lot Passport
```

### 10.2 Recycler — primary journey (P0)

```
Dashboard
  → Available Lots
  → Search / Filter
  → Lot Details
  → Make Offer
  → Negotiation (P1)
  → Offer Accepted
  → Schedule Pickup
  → Execute Handover
  → Confirm
  → Transaction record
```

### 10.3 Admin — primary journey (P0)

```
Dashboard
  → Recycler Verification
  → Material / Price Management
  → Transaction Monitoring
  → Dispute / Exception Handling (P1)
  → Analytics / Data Quality (P1)
```

## 11. Lot lifecycle

The **Lot is the single central business object** shared by all roles. A collector and a recycler never create separate copies of the same transaction.

```
DRAFT
  ↓
CREATED
  ↓
MATCHING
  ↓
OFFER_RECEIVED
  ↓
NEGOTIATION
  ↓
ACCEPTED
  ↓
HANDOVER_SCHEDULED
  ↓
HANDED_OVER
  ↓
RECEIVED
  ↓
PROCESSED
  ↓
CLOSED
```

Every transition is recorded with previous state, new state, actor, role, timestamp and evidence reference. History is append-only; it is never overwritten.

Terminal states: `CLOSED`. Exception path: `DISPUTED` (P1), `CANCELLED`.

**Definition — Lot:** a single identified batch of scrap created by one collector, offered to recyclers, and — if transacted — handed over, paid for, and traceable to end state. Collector-facing name: "Scrap ID" or "Batch ID". Example: `LOT-RS-00142`.

## 12. Transaction lifecycle

```
LOT CREATED
  → MATERIAL IDENTIFIED
  → WEIGHT CAPTURED
  → ESTIMATED VALUE COMPUTED
  → RECYCLER MATCHED
  → OFFER MADE
  → OFFER ACCEPTED
  → PICKUP SCHEDULED
  → HANDOVER EXECUTED (final weight)
  → RECYCLER CONFIRMED
  → PAYMENT RECORDED
  → RECYCLING STATUS UPDATED (P1)
```

## 13. Price discovery

Price information is dynamic reference data, not a static table.

A **Price Record** may include: material category, sub-category, location, date/time, buying price, quoted/selling price, unit, source recycler.

**Collector-facing pricing must always distinguish four distinct concepts:**

| Concept | Meaning | Certainty |
|---|---|---|
| **Reference Price** | Published platform price for this material | Informational |
| **Estimated Value** | Computed estimate for *this* lot | Estimate — may differ |
| **Recycler Offer** | A specific recycler's binding offer | Real, revocable |
| **Final Amount Received** | Amount actually paid at handover | Real, final |

**Hard rule:** an estimate must never be presented as a guaranteed or final price. The UI must make this distinction visible, not merely implied.

## 14. Recycler matching

Matching may consider: material compatibility, recycler authorization status, location/service area, offered rate, pickup availability, distance, quantity requirements, and historical transaction context.

**Matching must be explainable.** ReScrap must not surface an opaque "AI score". Instead, matched recyclers carry plain-language reasons:

- Verified
- Accepts this material
- Nearby
- Pickup available
- Offer price

The user must be able to answer "why am I seeing this recycler?".

## 15. Handover

Trust-critical. Captured evidence where applicable:

- Lot ID
- Material
- Declared weight vs **final weight**
- Timestamp
- GPS/location
- Photographs
- Recycler identity
- Handover reference
- Recycler confirmation
- Payment status
- Transaction status

Weight discrepancy beyond a configured tolerance flags for review rather than silently accepting.

## 16. Payment

- **Cash** — supported, and must never be blocked by lack of digital payment
- **Digital** — optional

Collector must see: quoted price, final price, payment method, payment status, transaction date, earnings history.

**Integrity rule:** a payment must never be recorded as complete without either a valid payment confirmation or an explicit, visible simulated-payment indicator. The system must not imply a real money movement occurred when it did not.

## 17. Earnings ledger

Collector-facing running total derived from completed transactions. Must distinguish: pending, offered, accepted, and paid amounts. No speculative earnings.

## 18. Traceability

Full lifecycle chain per lot:

```
Lot Created → Photo → Weight → GPS + Timestamp → Recycler Match
→ Offer → Handover → Recycler Confirmation → Payment → Recycling Status
```

Every completed transaction produces a structured, exportable traceability record. This is both the compliance artifact and the data flywheel input.

## 19. AI / ML features

| Capability | Priority | Confidence handling |
|---|---|---|
| Material classification (photo → material + confidence) | P0 | Collector confirms or corrects; never auto-final |
| Approximate valuation (material + weight + condition + location + history) | P0 | Labelled estimate; deterministic fallback |
| Recycler matching / ranking | P0 | Explainable reasons required |
| Transaction anomaly detection | P1 | Flags for human review only |

**Non-negotiable rules:**

- AI must never make a high-impact decision without confidence assessment and validation.
- Human confirmation must remain available wherever AI output is acted upon.
- Where training data does not exist, fall back to rule-based/deterministic methods and say so.
- Never fabricate model accuracy. Dataset size, quality, training approach, validation approach and limitations must be documented.
- [DATA REQUIRED] for any real accuracy claim.

## 20. Offline requirements (Collector, P0)

The collector must be able to, with **no network**: create a scrap draft, capture photos, enter weight, select material, view cached reference prices, save the transaction locally, and continue the essential workflow.

Conceptual flow:

```
Collector App → Local Database → Outbox / Sync Queue
   → Network Available → Backend API → Server Confirmation → Local State Updated
```

**Required UI states, in collector language:**

- Offline
- Saved on this phone
- Syncing
- Synced
- Sync failed

No technical networking jargon may leak into collector UX.

## 21. Localization

Collector UI must support **Hindi** and **Marathi** (and English where appropriate).

- No hardcoded strings inside components where this prevents localization
- Layouts must tolerate longer translated strings
- Simple language; short sentences
- Audio/spoken support for critical price and safety information (P1/P2)

## 22. Accessibility

- Minimum 44×44pt touch targets (collector: prefer 56dp for primary actions)
- High contrast, outdoor-readable in sunlight
- Do not encode meaning by colour alone — pair colour with icon/text
- Screen-reader labels on all interactive elements
- Full keyboard operability on web interfaces
- Respect reduced-motion preference

## 23. MVP scope (P0)

The MVP is defined by **one complete loop working end to end**, not by screen count:

```
Collector creates Lot → Material → Photo → Weight → Estimated Value → Submit
  → Recycler receives Lot → Views Lot → Makes Offer
  → Collector receives Offer → Accepts
  → Recycler confirms Handover
  → Collector sees Payment record + Digital Lot Passport
```

All of this operates on **ONE shared Lot**.

## 24. Future scope

- P1: negotiation/counter-offers, disputes, exceptions, data quality, analytics, recycling status, audio price readout, source type
- P2: saved searches, bulk listing, material-specific audio safety briefings, advanced AI monitoring, watchlists

## 25. Success metrics

**Numeric thresholds: [DATA REQUIRED]** — intentionally unset. No targets are asserted without field data.

Qualitative success criteria for MVP acceptance:

1. The end-to-end loop completes on one shared Lot without manual database intervention.
2. All three interfaces render role-correct views of the same Lot.
3. A collector can complete a lot creation with no network and sync later.
4. Every state transition is auditable.
5. No UI implies a real recycler partnership, real payment, or real AI accuracy that did not occur.

Proposed measurement candidates (to be confirmed in Phase 5): lot creation completion rate, offline sync success rate, time-to-first-offer, offer acceptance rate, collector-reported price fairness, repeat collector rate, formal channelization volume.

## 26. Data flywheel

```
TRANSACTIONS → BETTER DATASET → BETTER INTELLIGENCE → BETTER MATCHING
  → BETTER ECONOMICS → MORE FORMAL TRANSACTIONS → MORE TRANSACTIONS
```

The dataset is not a static database. It is a byproduct of real workflow and must be architected to improve.

## 27. Constraints and recorded assumptions

| # | Assumption | Rationale |
|---|---|---|
| A1 | PostgreSQL is the production store | §9 default |
| A2 | Phase 0–1 may run against a seeded in-memory repository behind a repository interface | Allows demonstrating the loop without infrastructure; swap is contained |
| A3 | All seed data is demo data, clearly labelled | §4 no-fabrication rule |
| A4 | Expo is acceptable for the Collector App | Required native capabilities (SQLite outbox, camera, location) are available; documented decision |
| A5 | "Collector's location" is captured at handover only, not continuously | §23 data minimization |
| A6 | Collector identification is a name + phone (OTP-verified); no government ID required for MVP | Avoids unnecessary PII collection |
| A7 | Negotiation is P1, not P0 | Keeps MVP loop complete and small |
| A8 | No real recycler data exists; recycler directory is demo data with demo verification status | §4 no-fabrication rule |
