# ReScrap — Goals & Roadmap

Status: Approved · Last updated: 2026-09-27

---

## 1. Sequencing principle

> Do not prematurely build advanced AI or large infrastructure before the core transaction workflow works.

Each phase must be demonstrably complete before the next begins. A phase is not "done" because code was written — it is done when its definition-of-done is satisfied and demonstrable.

---

## PHASE 0 — FOUNDATION

**Status: In progress**

### Goal
Establish a single coherent platform skeleton in which the domain model, lifecycle, and design language exist once and are shared by all consumers.

### Features
- Repository and monorepo structure
- Complete documentation set as source of truth
- Shared domain types and entity model
- Lot lifecycle state machine (single shared implementation)
- Pricing, matching, valuation engines (deterministic)
- ReScrap design system: tokens + shared components
- API foundation: auth (OTP/JWT), role-aware authorization, error envelope
- Repository/storage interface with in-memory implementation
- Collector App shell, Recycler Portal shell, Admin Console shell
- Demo service layer implementing the same interface as the real API client
- Unit test harness

### Dependencies
None.

### Definition of done
- [x] All 10 documentation files exist
- [ ] `packages/shared` typechecks and exports the full domain model
- [ ] Lot lifecycle state machine implemented with tests covering legal **and illegal** transitions
- [ ] API boots; auth and role authorization demonstrably enforced server-side
- [ ] All three interfaces render their shell with role-correct navigation
- [ ] Demo data clearly labelled throughout

### Risks
- Scope expansion into infrastructure. *Mitigation: no deployment config, no auth provider integration, no ML until the loop works.*

---

## PHASE 1 — COLLECTOR MVP

**Status: Not started**

### Goal
A collector can independently create, price, and submit a scrap lot — including with no network.

### Features
- Collector shell + bottom navigation
- Splash, Language, Mobile/OTP, Basic Profile
- Home with active-scrap state
- Add Scrap flow: photo capture → material identification → details (weight, condition) → review & estimated value → submit
- Manual material selection (always available; AI is assistive)
- Price Board with cached reference prices
- My Scrap
- Earnings
- Profile, language, safety content
- Offline local database
- Outbox sync engine with idempotency
- Sync status communication in collector language

### Dependencies
Phase 0.

### Definition of done
- [ ] A collector can complete lot creation end to end on a real Android device
- [ ] Lot creation succeeds with the device in airplane mode
- [ ] The queued lot syncs correctly when connectivity returns, with no duplicate
- [ ] Estimated value is visibly distinct from any future final amount
- [ ] All strings are externalized; hi/mr render without layout breakage
- [ ] Touch targets and outdoor contrast meet the collector design bar

### Risks
- Expo incompatibility with a required native capability. *Mitigation: capability audit before build-out.*
- Performance on entry-level hardware. *Mitigation: performance budget; no heavy libraries.*
- Usability with low literacy. *Mitigation: Phase 5 validation; audio is P1 but layout must not depend on it.*

---

## PHASE 2 — RECYCLER MVP

**Status: Not started**

### Goal
A recycler can discover relevant lots and submit a real offer.

### Features
- Recycler shell: sidebar + dashboard workspace
- Dashboard: new lots, pending offers, active deals, upcoming pickups, completed transactions, pending actions
- Available Lots board
- Search
- Filters: material, category, location, weight range, price range, status
- Lot detail: photos, material, weight, condition, collection area, estimated value
- Make Offer
- Business profile + authorization display
- Notifications

### Dependencies
Phase 1 (lots must exist to be offered).

### Definition of done
- [ ] A recycler can filter to a material and see a relevant lot
- [ ] A recycler can submit a valid offer
- [ ] The collector's device reflects the new offer after sync
- [ ] Only `VERIFIED` recyclers can submit offers
- [ ] Every dashboard metric maps to a real recycler decision
- [ ] No collector personal data is exposed beyond what the workflow requires

### Risks
- Recycler adoption requires real onboarded facilities. *Mitigation: demo directory now; onboarding is a Phase 5 dependency.*
- Dashboard metric bloat. *Mitigation: each metric must justify its existence.*

---

## PHASE 3 — SHARED TRANSACTION

**Status: Not started**

### Goal
Complete the loop: offer → accept → handover → payment → traceability, on **one shared Lot**.

This is the most important phase in the project.

### Features
- Offer acceptance (atomic: supersede others, transition lot, write traceability)
- Negotiation / counter-offers (P1)
- Pickup scheduling
- Handover execution by recycler (final weight, photos, location, timestamp)
- Handover verification by collector
- Weight reconciliation with tolerance check
- Payment record (cash default; digital optional)
- Earnings ledger update
- **Digital Lot Passport** (collector-facing persistent record)
- Full traceability chain view
- Transaction record
- Dispute flag (P1)

### Dependencies
Phase 2.

### Definition of done
- [ ] The critical E2E test passes: create → offer → accept → handover → payment → passport
- [ ] The end-to-end loop operates on ONE Lot, not parallel records
- [ ] Both the collector's and recycler's views of the same Lot are consistent
- [ ] Every state transition is present in the audit trail with actor, role and timestamp
- [ ] Payment is never shown as complete without a confirmation or a visible simulated indicator
- [ ] Lot Passport is retrievable by the collector after the transaction

### Risks
- The most complex phase; atomicity bugs would corrupt the shared model. *Mitigation: DB transactions, idempotency, integration tests.*
- Weight discrepancy disputes. *Mitigation: tolerance rules and hold-before-payment.*

---

## PHASE 4 — AI / ML INTELLIGENCE

**Status: Not started — blocked on data**

### Goal
Replace deterministic heuristics with trained models **behind the same interfaces**, using data the platform itself generated.

### Features
- Material classification from photo
- Valuation assistance
- Matching intelligence / learned ranking
- Transaction anomaly detection
- AI monitoring in Admin Console
- Model/dataset documentation: source, dataset size, quality, limitations, training approach, validation approach, confidence

### Dependencies
**Phase 3 complete**, plus a meaningful accumulated transaction dataset.

**Hard gate: this phase does not begin while the deterministic engines are still the only real path.** It improves them; it does not enable the product.

### Definition of done
- [ ] Every AI capability has a documented dataset, training approach, and validation approach
- [ ] Measured accuracy exists for any claim made, or the claim is not made
- [ ] Every prediction records method and confidence
- [ ] Deterministic fallbacks remain functional if a model is unavailable
- [ ] No AI output is auto-final anywhere in the transaction flow

### Risks
- No training data exists. *Mitigation: this is exactly why the phase is blocked.*
- Accuracy claims without evidence. *Mitigation: HON-03.*
- Over-trust in model output by collectors. *Mitigation: AI-03, AI-06, AI-07.*

---

## PHASE 5 — FIELD VALIDATION

**Status: Not started**

### Goal
Validate with real collectors and real recyclers that the product actually improves their situation.

### Activities
- Onboard real authorized recyclers with genuine verification
- Collector usability testing (low literacy, low-end devices, real network conditions)
- Recycler operational testing
- Safety content review by a qualified party
- Data quality assessment
- Workflow refinement based on observed behaviour
- Establish the evidence base for success metrics

### Dependencies
Phases 1–3 complete. Requires real recycler participation.

### Definition of done
- [ ] Real recyclers onboarded and genuinely verified
- [ ] Usability findings documented with real evidence
- [ ] Safety content reviewed and approved by a qualified party
- [ ] Success metrics established from field data, replacing `[DATA REQUIRED]`
- [ ] Priority refinements identified from observed failure modes

### Risks
- **Highest project risk: recycler participation may not materialize.** *Mitigation: begin outreach during Phase 2, not Phase 5.*
- Field data may contradict assumptions. *Mitigation: documented assumptions (A1–A8) are revisable; changelog records the change.*
- No safe collection site or partner for supervised testing. *Mitigation: identify early.*

---

## PHASE 6 — SCALE

**Status: Not started**

### Goal
Harden and extend a validated platform.

### Features
- Production deployment topology **[DATA REQUIRED]**
- PostgreSQL production store (replacing in-memory)
- S3-compatible object storage
- Real OTP/SMS provider **[DATA REQUIRED]**
- Digital payment gateway (optional; must never become a participation prerequisite)
- CI/CD pipeline
- Monitoring and alerting
- Advanced analytics
- Horizontal scaling of the API
- Additional integrations and geographic expansion

### Dependencies
Phases 0–5 complete and validated.

### Definition of done
- [ ] Production deployment documented and reproducible
- [ ] PostgreSQL is the system of record
- [ ] CI runs typecheck, lint, tests, and builds on every change
- [ ] Monitoring covers API health, sync failure rate, and transaction anomalies
- [ ] Load tested against realistic collector volume **[DATA REQUIRED]**

### Risks
- Premature infrastructure. *Mitigation: none of this work is authorized before Phase 5 completes.*

---

## Phase dependency graph

```
PHASE 0 Foundation
   ↓
PHASE 1 Collector MVP
   ↓
PHASE 2 Recycler MVP
   ↓
PHASE 3 Shared Transaction   ← MOST IMPORTANT
   ↓
PHASE 4 AI / ML              ← blocked on accumulated data
   ↓
PHASE 5 Field Validation     ← blocked on real recycler participation
   ↓
PHASE 6 Scale
```

Phases cannot be reordered. Each is a precondition for the next, not merely a preference.
