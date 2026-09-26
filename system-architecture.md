# ReScrap — System Architecture

Status: Approved · Architecture is **FINAL** unless explicitly changed by the Project Owner
Last updated: 2026-09-27

---

## 1. Architecture principle (LOCKED)

```
ONE PLATFORM
ONE SHARED BACKEND
ONE SHARED DATA MODEL
ONE SHARED TRANSACTION LIFECYCLE
THREE ROLE-SPECIFIC INTERFACES
```

### 1.1 The three interfaces are not three products

```
                        RECRAP PLATFORM
                               │
          ┌────────────────────┼────────────────────┐
          │                    │                    │
          ▼                    ▼                    ▼
   COLLECTOR APP        RECYCLER PORTAL       ADMIN CONSOLE
    Android / mobile          Web                  Web
          │                    │                    │
          └────────────────────┼────────────────────┘
                               ▼
                    SHARED BACKEND / API
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
        ▼                      ▼                      ▼
       DATA                  AI / ML                SERVICES
        │                      │                      │
        ├─ Users               ├─ Classification      ├─ Pricing
        ├─ Collectors          ├─ Valuation           ├─ Matching
        ├─ Recyclers           ├─ Matching            ├─ Offers
        ├─ Materials           └─ Anomaly             ├─ Handover
        ├─ Lots                                    ├─ Payments
        ├─ Prices                                  ├─ Notifications
        └─ Transactions                            └─ Traceability
```

### 1.2 Prohibited designs

The following are explicitly forbidden without explicit written justification:

- Merging Collector and Recycler into one mobile interface
- Separate backends per role
- Duplicating the Lot model
- Duplicating pricing systems
- Duplicating transaction records
- Isolated per-role databases without documented justification

## 2. Repository layout

pnpm workspace monorepo. One clone, one version, one domain model.

```
Rescrap/
├─ apps/
│  ├─ api/              Shared Backend / API (Node + TypeScript + Fastify)
│  ├─ collector/        Collector App (React Native + Expo, Android-first)
│  ├─ recycler-web/     Recycler Portal (React + Vite + Tailwind)
│  └─ admin-web/        Admin Console (React + Vite + Tailwind)
├─ packages/
│  ├─ shared/           Domain types, lot lifecycle, engines, i18n strings
│  └─ design-system/    ReScrap tokens + shared React components
├─ docs/                (documentation lives at repo root, per §2 source of truth)
├─ prd.md
├─ system-architecture.md
├─ technical-approach.md
├─ rules-and-risk-controls.md
├─ goals-and-roadmap.md
├─ workflow-and-security.md
├─ project-summary.md
├─ changelog.md
├─ frontend-discussion.md
└─ frontend-requirements.md
```

`packages/shared` is the **single source of truth for the domain model**. All four applications import from it. No application may redefine a domain type.

## 3. Collector App

| Aspect | Decision |
|---|---|
| Platform | Android-first (iOS-compatible code, not a design target) |
| Framework | React Native + TypeScript (Expo) |
| Navigation | Bottom navigation + modal stack |
| Local persistence | SQLite (`expo-sqlite`) — structured, queryable, durable |
| Camera | `expo-camera` |
| Location | `expo-location`, captured at handover only |
| Sync | Local outbox queue → API; replay on connectivity |
| State | React hooks + context; no large state library |
| i18n | Centralized string catalogue in `packages/shared` |
| Audio | `expo-speech` (P1) |

Rationale for Expo: the offline requirement (§21) needs a real local database, and camera/location need native modules. Expo provides all three with managed prebuild. This is recorded as assumption A4.

**Low-literacy and low-end-device constraints are architectural, not cosmetic:**

- No heavy animation libraries
- No large image payloads; photos resized/compressed at capture
- Lazy loading on list screens
- Cached reference data for offline price board
- Aggressive local-first reads; network only for sync

## 4. Recycler Portal

| Aspect | Decision |
|---|---|
| Platform | Responsive web, desktop/tablet-first |
| Framework | React + TypeScript + Vite |
| Styling | Tailwind CSS consuming `packages/design-system` tokens |
| State | Server-state via fetch + query cache; local UI state only |
| Tables | Virtualized for large lot sets |
| Auth | Session token, server-side authorization enforced |

Information-dense and operational. Same design language as the other interfaces, different density.

## 5. Admin Console

Same stack as Recycler Portal. Desktop-first. Prioritizes auditability, search, filtering, and exception handling over visual presentation. Must not be designed like a consumer application.

## 6. Backend / API

| Aspect | Decision |
|---|---|
| Runtime | Node.js 22 + TypeScript |
| Framework | Fastify |
| Validation | Zod at every boundary |
| Auth | OTP → JWT (access + refresh) |
| Authorization | Server-side, role + resource scoped |
| Data access | Repository interface, so store is swappable |
| Store (target) | PostgreSQL |
| Store (Phase 0/1) | Seeded in-memory repository implementing the same interface |
| Object storage | S3-compatible (photos) — stubbed in Phase 0/1 |
| API style | REST over business resources |

### 6.1 Why a repository interface

The storage layer sits behind `LotRepository`, `OfferRepository`, `UserRepository`, `PriceRepository`, `TransactionRepository`. Phase 0/1 uses the in-memory implementation; production swaps to PostgreSQL. This keeps the MVP demonstrable without infrastructure while preventing the data model from being coupled to a store. Recorded as assumption A2.

### 6.2 API surface (resource-oriented, not UI-oriented)

```
POST   /auth/otp/request
POST   /auth/otp/verify
POST   /auth/refresh
GET    /users/me

GET    /materials
GET    /prices
GET    /prices/trends

GET    /recyclers
GET    /recyclers/me
PATCH  /recyclers/me

POST   /lots
GET    /lots
GET    /lots/:id
PATCH  /lots/:id
POST   /lots/:id/submit
GET    /lots/:id/matches
GET    /lots/:id/passport
GET    /lots/:id/trace

POST   /offers
GET    /offers
GET    /offers/:id
PATCH  /offers/:id              (accept / reject / withdraw / counter)

POST   /handovers
GET    /handovers/:id
POST   /handovers/:id/confirm

GET    /transactions
GET    /transactions/:id

GET    /earnings

POST   /ai/classify-material
POST   /ai/estimate-value
GET    /ai/feedback

GET    /notifications

GET    /admin/recyclers
POST   /admin/recyclers/:id/verify
GET    /admin/lots
GET    /admin/audit
GET    /admin/analytics
```

## 7. Authentication and authorization

**Authentication identifies. Authorization decides. These are different layers and are never conflated.**

- Role-specific navigation is a **UX** layer only.
- Server-side authorization is a **security** layer and is mandatory on every endpoint.
- Frontend role checks are UX affordances, never enforcement.
- A Collector may only access Collector-owned resources.
- A Recycler may only access lots offered to them and deals they are party to.
- Admin permissions are explicit and individually controlled.

Implementation: JWT access token (short-lived) + rotating refresh token. Role is carried in the token **and re-verified server-side against the user record on each request** — the token claim is not trusted as the sole authority.

## 8. Data architecture

### 8.1 Core entities

| Entity | Purpose |
|---|---|
| User | Authentication identity, role, locale |
| Collector | Collector profile (data-minimized) |
| Recycler | Recycler business profile + authorization status |
| Admin | Platform operations identity |
| MaterialCategory | Top-level grouping |
| Material | Specific material, category, safety flags |
| Lot | **Central business object** |
| LotItem | Material line within a lot (weight, condition, estimate) |
| PriceRecord | Reference price point |
| RecyclerOffer | Recycler's offer on a lot |
| Handover | Handover execution record + evidence |
| Payment | Payment record |
| Transaction | Consolidated completed-deal record |
| TraceabilityRecord | Append-only lifecycle event |
| Notification | Role-aware notification |
| SafetyContent | Material-specific safety guidance |
| AIPrediction | Model output + confidence + method (model/rule) |
| AuditEvent | Security-relevant administrative action |

### 8.2 Entity relationships

```
User (1) ──┬── (0..1) Collector
            ├── (0..1) Recycler
            └── (0..1) Admin

Collector (1) ── (n) Lot
Recycler  (1) ── (n) RecyclerOffer
MaterialCategory (1) ── (n) Material

Lot (1) ── (n) LotItem ── (n..1) Material
Lot (1) ── (n) RecyclerOffer ── (n..1) Recycler
Lot (1) ── (n) TraceabilityRecord      (append-only)
Lot (1) ── (0..n) Handover
Lot (1) ── (0..1) Payment
Lot (1) ── (0..1) Transaction ── (n..1) Recycler
Lot (1) ── (0..n) AIPrediction

Material (1) ── (n) PriceRecord
Material (1) ── (n) SafetyContent
Recycler (1) ── (n) PriceRecord

User (1) ── (n) Notification
Admin (1) ── (n) AuditEvent
```

### 8.3 The Lot is the shared spine

One lot, many role-specific views. The Collector, Recycler and Admin never create separate copies of the same transaction.

| Role | Sees |
|---|---|
| Collector | My scrap, material, weight, estimated value, offers, selected recycler, handover, payment, transaction history |
| Recycler | Available lot, material, weight, photos, location, estimated value, offer, pickup, handover, transaction |
| Backend | Complete lifecycle, audit history, traceability, payment, state changes, evidence |
| Admin | All of the above + verification + audit |

## 9. Lot lifecycle

```
DRAFT → CREATED → MATCHING → OFFER_RECEIVED → NEGOTIATION → ACCEPTED
      → HANDOVER_SCHEDULED → HANDED_OVER → RECEIVED → PROCESSED → CLOSED
```

Terminal: `CLOSED`. Exception paths: `CANCELLED`, `DISPUTED` (P1).

The lifecycle is a **state machine**, implemented once in `packages/shared`. Every consumer — API, all three frontends — uses the same definition. Illegal transitions are rejected at the shared layer, not re-implemented per app.

Every transition persists: previous state, new state, actor user id, actor role, timestamp, reason, evidence reference.

## 10. Services layer

| Service | Responsibility |
|---|---|
| Pricing | Reference price lookup, trends, estimate computation |
| Matching | Ranked recycler matches with explainable reasons |
| Offers | Offer lifecycle, negotiation |
| Handover | Scheduling, execution, evidence, weight reconciliation |
| Payments | Payment records, ledger, earnings |
| Notifications | Role-aware notification generation and delivery |
| Traceability | Append-only lifecycle event recording |
| Audit | Security-relevant administrative action logging |
| AI/ML | Classification, valuation assistance, matching intelligence, anomaly flags |

## 11. AI/ML architecture

AI/ML is **shared platform infrastructure**, not a per-app feature.

```
Photo  → Classification  → Confidence  → COLLECTOR CONFIRMATION
Material + Weight + Condition + Location + History → Valuation → ESTIMATE
Lot + Material + Location + Authorization + Rate + Pickup → Matching → RANKED MATCHES
Transaction attributes vs historical baselines            → Anomaly   → HUMAN REVIEW
```

**Every AI service is wrapped behind an interface with a deterministic fallback.** If a model is unavailable or confidence is below threshold, the rule-based path executes and the result is labelled accordingly. `AIPrediction` records `method: 'model' | 'rule'` and `confidence` for every output.

No AI output is auto-final. Every AI output that affects a transaction is subject to collector or recycler confirmation.

## 12. Offline and sync architecture

```
Collector App
   ↓
Local SQLite Database
   ↓
Outbox / Sync Queue (ordered, idempotent operations)
   ↓
Network Available
   ↓
Backend API
   ↓
Server Confirmation
   ↓
Local State Updated
```

Requirements:

- Every write is local-first; the network is never on the critical path for a collector action
- Outbox operations are **idempotent** and carry a client-generated idempotency key, so replay cannot duplicate a lot
- Sync is ordered per entity to preserve lifecycle order
- Failures retain the payload and surface as "Sync failed" with retry — never silent data loss
- Conflict policy: server is authoritative on lifecycle state; local drafts never overwrite a server-advanced lot

## 13. Object storage

Photos are stored in S3-compatible object storage, referenced by key from LotItem, Offer and Handover records. Images are resized and compressed at capture time on the device. Private bucket; access via short-lived signed URLs. Collector photos are not public.

## 14. Security architecture

- No secrets in code or committed config. Environment variables only.
- Input validation with Zod on **every** boundary (HTTP, sync outbox, AI inputs).
- Server-side authorization on every endpoint. Client role checks are UX only.
- **Client-provided transaction values are never trusted.** Final weight, final price and payment amounts are server-computed or server-validated against the authoritative record.
- Parameterized queries only; no string-built SQL.
- Rate limiting on auth and OTP endpoints.
- Audit logging on all administrative and financial actions.
- Secrets management via environment; no keys in source.
- Untrusted content rendered as text, never as raw HTML.
- Audit trail is append-only.

## 15. Deployment architecture

| Environment | Purpose |
|---|---|
| Local | Full stack via workspace scripts |
| Staging | Shared demo environment for validation |
| Production | [DATA REQUIRED] — pending Phase 6 decisions |

Deployment topology, hosting provider, and CI/CD pipeline tooling: **[DATA REQUIRED]**, deferred to Phase 6. The repository deliberately contains no deployment configuration yet; adding it before the core loop works would be premature infrastructure.

## 16. Analytics

Analytics are **derived from real workflow data only**. No synthetic metric is presented as an insight. Every displayed metric must map to a decision a user of that role actually makes. Analytics that exist only to look advanced are prohibited.

## 17. External integrations

| Integration | Priority | Status |
|---|---|---|
| SMS/OTP provider | P0 | Interface defined, provider **[DATA REQUIRED]** |
| S3-compatible storage | P0 | Interface defined, provider **[DATA REQUIRED]** |
| Digital payment gateway | P2 | Not required for MVP; cash is the default path |
| Maps / geocoding | P2 | Distance is computed from stored coordinates; maps optional |

No external integration is required to demonstrate the core loop. This is deliberate — MVP must not depend on third-party availability.
