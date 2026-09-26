# ReScrap — Project Summary

**What is ReScrap right now?**

Status: Phase 0 — Foundation · Last updated: 2026-09-27

---

## 1. Product

ReScrap is a digital platform connecting **informal e-waste collectors** with **authorized recyclers** through a single verifiable digital transaction.

It is **not** a doorstep scrap-pickup app. It is a **digital bridge between the informal collection economy and the formal recycling ecosystem**.

The binding constraint is not logistics — it is information and trust. If a collector can identify their material, see a fair value, reach a verified recycler, receive competing offers, hand over with proof, and get paid, then the formal route becomes more valuable than the informal one, and the channel formalizes itself.

**Core loop:**

```
INFORMAL COLLECTION → DIGITAL LOT → MATERIAL INTELLIGENCE
→ PRICE TRANSPARENCY → AUTHORIZED RECYCLER MATCHING → OFFER
→ VERIFIED HANDOVER → PAYMENT → TRACEABILITY → FORMAL RECYCLING
```

## 2. Current architecture

```
                    ReScrap Platform
                           │
      ┌────────────────────┼────────────────────┐
      ▼                    ▼                    ▼
 Collector App        Recycler Portal     Admin Console
  Android/mobile            Web                Web
      │                    │                    │
      └────────────────────┼────────────────────┘
                           ▼
                SHARED BACKEND / API
                           │
      ┌────────────────────┼────────────────────┐
      ▼                    ▼                    ▼
     DATA                AI / ML              SERVICES
      │                    │                    │
      ├─ Users             ├─ Classification    ├─ Pricing
      ├─ Collectors        ├─ Valuation         ├─ Matching
      ├─ Recyclers         ├─ Matching          ├─ Offers
      ├─ Materials         └─ Anomaly           ├─ Handover
      ├─ Lots                                  ├─ Payments
      ├─ Prices                                ├─ Notifications
      └─ Transactions                          └─ Traceability
```

**FINAL:** one platform, one shared backend, one shared data model, one Lot/Transaction lifecycle, three role-specific interfaces. The **Lot** is the single central business object — Collector, Recycler and Admin are role-specific views of the same record, never separate copies.

## 3. Current implementation status

### Completed

- Complete documentation set (10 files) as source of truth
- Finalized architecture, product scope, business rules, risk controls, roadmap, workflows, security boundaries, UX decisions, screen requirements
- Repository aligned to `github.com/Rishi-baba/Rescrap`, `main` branch
- Monorepo structure established (pnpm workspaces, strict TypeScript base config)
- `packages/shared`: shared domain model, lot lifecycle state machine, engines, i18n (en/hi/mr), Zod boundary schemas
- `packages/shared`: in-memory demo service implementing the same `ReScrapService` interface the real API client will implement
- `packages/shared`: 77 passing tests, including the critical end-to-end loop on one shared Lot, idempotency/duplicate prevention, authorization boundaries, trust controls, weight-discrepancy hold, earnings ledger, and admin audit
- `pnpm run verify` (typecheck → test → build) passes for all existing packages

### In progress

- Phase 0 completion: `packages/design-system`, `apps/api`, `apps/collector`, `apps/recycler-web`, `apps/admin-web` are **not yet created**

### Not started

- `packages/design-system` (tokens + shared components)
- `apps/api` — Fastify + Zod, OTP/JWT auth, server-side role authorization, repository-backed routes
- `apps/collector` — React Native + Expo shell and the screen sequence 01–21
- `apps/recycler-web` — Recycler Portal
- `apps/admin-web` — Admin Console
- Phase 1 (Collector MVP): photo capture, material identification, weight, estimate, offline database, outbox sync
- Phase 2 (Recycler MVP): search/filter, offer submission
- Phase 3 (Shared transaction UI): acceptance, handover, payment, Lot Passport, traceability surfaces
- Phase 4 (AI/ML) — blocked on accumulated transaction data
- Phase 5 (Field validation) — blocked on real recycler participation
- Phase 6 (Scale) — deployment topology undecided

### Mocked / simulated — all of it

| Area | Status |
|---|---|
| All recyclers | **Demo data.** No real recycler exists or is authorized. |
| Authorization status | **Demo.** No regulatory authorization is claimed. |
| Payments | **Simulated.** No real money movement occurs. |
| Pricing | **Demo reference prices.** Not real market data. |
| Material classification | **Deterministic rule-based fallback**, not a trained model. Labelled as such. |
| Valuation | **Deterministic formula**, not a learned model. Labelled as an estimate. |
| OTP delivery | **Console/logged**, no SMS provider integrated. |
| Object storage | **Local**, no S3 provider integrated. |
| Collector statistics, volumes, environmental impact | **None asserted.** No fabricated metrics anywhere. |

### Known limitations

- The API, design system and all three applications do not exist yet; only `packages/shared` is implemented
- PostgreSQL schema and migrations not written; in-memory store only
- No CI/CD
- No deployment configuration (deliberately deferred to Phase 6)
- Admin MFA policy undefined — **[DATA REQUIRED]**, must close before production
- Data retention policy undefined — **[DATA REQUIRED]**, needs legal input
- Audio/voice support not implemented (P1/P2)
- No real recyclers onboarded

## 4. Current tech stack

| Layer | Technology |
|---|---|
| Language | TypeScript across all four applications |
| Monorepo | pnpm workspaces |
| Collector App | React Native + Expo (Android-first), `expo-sqlite`, `expo-camera`, `expo-location` |
| Recycler Portal | React + TypeScript + Vite + Tailwind CSS |
| Admin Console | React + TypeScript + Vite + Tailwind CSS |
| Shared domain | `packages/shared` — types, lifecycle, engines, i18n (en/hi/mr) |
| Design system | `packages/design-system` — tokens + shared components |
| API | Node 22 + Fastify + Zod |
| Auth | OTP → JWT (access + rotating refresh), server-side role authorization |
| Data store | Repository interface; in-memory implementation now, PostgreSQL at Phase 6 |
| Tests | Vitest |

## 5. Important decisions

| # | Decision | Rationale |
|---|---|---|
| D-01 | Three interfaces, one platform | Locked in §0; not to be redesigned into a combined app |
| D-02 | Lot is the single shared business object | Prevents duplicate/divergent transaction records |
| D-03 | Lifecycle implemented once in `packages/shared` | All consumers enforce the same rules; impossible to drift |
| D-04 | Repository interface over direct store access | MVP demonstrable without infrastructure; store swap is contained |
| D-05 | Money as integer minor units | Floating-point currency arithmetic is unsafe |
| D-06 | Demo data isolated behind an identical service interface | Mock→real transition is configuration, not a rewrite |
| D-07 | Local-first collector flow; network never on the critical path | Real field connectivity conditions |
| D-08 | Idempotency keys on all lot-creating writes | Offline replay must not create duplicate lots |
| D-09 | AI interfaces with deterministic fallbacks from day one | No training data exists; the product must not depend on one |
| D-10 | Server-side authorization mandatory everywhere | Client role checks are UX, never enforcement |
| D-11 | Cash is a first-class payment method | Digital payment must never gate participation |
| D-12 | Both parties confirm handover | Trust-critical custody transfer |
| D-13 | Collector PII minimized; no government ID; no continuous location | Vulnerable population; data minimization is a safety property |
| D-14 | Localization authored from the start (en/hi/mr) | Retrofitting localization reliably fails |
| D-15 | No deployment/CI config yet | Premature infrastructure; deferred to Phase 6 |
| D-16 | Phase 4 (AI) blocked until Phase 3 works | No AI before the core loop |

## 6. Architecture gaps

| Gap | Phase |
|---|---|
| PostgreSQL schema, migrations, constraints, indexes | 6 |
| Real object storage for photos | 6 |
| Production deployment topology **[DATA REQUIRED]** | 6 |
| CI/CD pipeline | 6 |
| Real OTP/SMS provider **[DATA REQUIRED]** | 6 |
| Monitoring and alerting | 6 |
| Real trained AI models behind existing interfaces | 4 |
| Digital payment gateway | 6 (optional, never gating) |
| Load/scale testing **[DATA REQUIRED]** | 6 |

## 7. Frontend gaps

| Gap | Phase |
|---|---|
| Collector: camera, material identification, weight, estimate flows | 1 |
| Collector: offline SQLite database and outbox sync engine | 1 |
| Recycler: search, filtering, offer submission | 2 |
| Admin: price management, exceptions, disputes, analytics, audit log | 3–5 |
| Audio/voice support for price and safety | 1–2 (P1/P2) |
| Verified field validation of low-literacy UX | 5 |

## 8. Backend gaps

| Gap | Phase |
|---|---|
| Handover execution and confirmation endpoints | 3 |
| Payment records and earnings ledger | 3 |
| Traceability chain assembly | 3 |
| Dispute/exception handling | 3 |
| Notification delivery | 3 |
| Rate limiting configuration | 3 |
| Admin analytics endpoints | 5 |

## 9. Database gaps

The **entire** production data layer: schema, migrations, constraints, indexes, transactional integrity for multi-entity writes. Currently in-memory only, behind a repository interface, so this is a contained Phase 6 task rather than a rewrite.

## 10. Security gaps

| Gap | Severity | Phase |
|---|---|---|
| Admin MFA undefined | **High** — highest-privilege role | Before production |
| Data retention policy undefined | **High** — conflicts with traceability obligations | Before production |
| Rate limiting on all non-auth endpoints | Medium | 3 |
| Signed URL implementation for object storage | Medium | 6 |
| Security review of photo handling in field conditions | Medium | 5 |
| Penetration testing | High | 6 |

## 11. Testing gaps

- E2E test of the full core loop — **the single most important missing test** (Phase 3)
- Offline sync/replay integration test with duplicate-prevention assertion
- Authorization matrix test (every endpoint × every role)
- Weight-discrepancy and anomaly rule tests
- Collector journey frontend test covering all six async states
- Low-literacy usability validation (Phase 5, requires field research)

## 12. MVP implementation plan

Ordered. Each step verifiable before the next.

1. ~~**Finish Phase 0 verification**~~ — **done**: `pnpm run verify` green, 77/77 tests pass
2. **`packages/design-system`** — tokens and shared components
3. **`apps/api`** — Fastify + Zod over the same domain/lifecycle, OTP/JWT auth, server-side role authorization
4. **Collector: local database + outbox sync engine** — the offline foundation everything else depends on
5. **Collector: complete the Add Scrap flow** — photo → material → weight → estimate → submit
6. **Collector: Price Board, My Scrap, Earnings** on cached data
7. **Recycler: available lots with search/filter**
8. **Recycler: offer submission** with server-side validation
9. **Collector: receive offer, accept** — atomic server operation
10. **Recycler: schedule pickup, execute handover**
11. **Collector: verify handover** — two-party completion
12. **Payment records + earnings ledger** surfaces
13. **Digital Lot Passport + full traceability chain** surfaces
14. **Admin: verification, monitoring, audit log** to support the loop
15. **Phase 5: field validation with real recyclers and collectors**

Steps 4–13 are already proven at the service layer by the passing critical-loop test; the remaining work is the API and UI surfaces over it.

## 13. Files created or modified first

Documentation (complete):
`prd.md` · `system-architecture.md` · `technical-approach.md` · `rules-and-risk-controls.md` · `goals-and-roadmap.md` · `workflow-and-security.md` · `frontend-discussion.md` · `frontend-requirements.md` · `project-summary.md` · `changelog.md`

Implemented:
`package.json` · `pnpm-workspace.yaml` · `tsconfig.base.json` · `.gitignore` · `.env.example` · `packages/shared/**`

Planned, not yet on disk:
`packages/design-system/**` · `apps/api/**` · `apps/collector/**` · `apps/recycler-web/**` · `apps/admin-web/**`

## 14. Next milestone

**`packages/design-system`, then `apps/api`.**

The API must sit on the same domain model, lifecycle and engines already implemented in `packages/shared`, behind the same `ReScrapService` interface the demo service satisfies — so the collector, recycler and admin applications can be built against a real HTTP boundary without the domain rules ever being re-implemented.

---

*This document is updated at the end of every phase. If it disagrees with the code or the other documents, that is a defect — see `rules-and-risk-controls.md` R10.*
