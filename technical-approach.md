# ReScrap — Technical Approach

Status: Approved · Last updated: 2026-09-27

This document explains **HOW** the system is built. It does not restate the product (see `prd.md`) or the topology (see `system-architecture.md`).

---

## 1. Technology selection principle

Technology is selected against actual ReScrap requirements, not fashion. Each decision below records the requirement that justifies it.

| Layer | Choice | Justifying requirement |
|---|---|---|
| Language | TypeScript (all layers) | One domain model shared across 4 apps; prevents contract drift between Collector App, Recycler Portal, Admin Console and API. Single highest-value choice in the stack. |
| Monorepo | pnpm workspaces | Shared domain package must not be duplicated or version-drifted across 4 apps. |
| Mobile | React Native + Expo | Offline local DB, camera, location, speech are all hard requirements (§ collector offline). |
| Web | React + Vite | Fast dev loop, small bundles, mature ecosystem for information-dense operational UIs. |
| Styling (web) | Tailwind CSS | Token-driven styling from one design system; avoids divergent ad-hoc CSS across two web apps. |
| API | Fastify | Schema-first validation, low overhead, good fit for a mobile client on low-end devices. |
| Validation | Zod | One schema definition usable for HTTP validation *and* shared TypeScript types. |
| Data store | PostgreSQL (prod) / in-memory (Phase 0–1) | Relational integrity is required for transactions, offers and traceability. Repository interface allows MVP to run without infrastructure. |
| Auth | JWT + OTP | Low-friction for low-literacy users (no password to remember); server-side authz regardless. |
| Tests | Vitest | Fast, TS-native, works across API and web apps. |
| Lint/format | ESLint flat config + Prettier | Consistent across a 4-app monorepo. |

### 1.1 Explicitly rejected

| Rejected | Why |
|---|---|
| GraphQL | Unnecessary for a resource-shaped domain; adds client complexity for no MVP benefit. |
| Microservices | Single-team MVP. Would add deployment and consistency cost with no gain. |
| Redux / Zustand | Unnecessary. Requirements are separable via context + hooks; a state library would obscure rather than clarify. |
| Prisma | Excellent, but heavier than needed while the schema is still the design. Raw SQL via `pg` keeps the data model explicit and migration under our control. Revisit at Phase 6. |
| Kubernetes / Docker Compose | Premature. No deployment topology decided ([DATA REQUIRED]). |
| Heavy UI kit (MUI/AntD) | Would fight the ReScrap design language. Design system is built in-repo. |
| On-device ML (TFLite/CoreML) | No training data exists. Rule-based + server-side interface first; see §6. |

## 2. Repository and build strategy

- pnpm workspace, single lockfile
- `packages/shared` is consumed as **source TypeScript** by all apps, compiled once by each consumer. No separate publish cycle, no version drift during rapid iteration.
- Shared design tokens are the single source for the Tailwind theme in both web apps and the RN theme in the mobile app.

```
packages/shared/src/
├─ domain/        types, entities, enums
├─ lifecycle/     lot state machine, transaction state machine
├─ engines/       pricing, matching, valuation, anomaly
├─ i18n/          string catalogues (en, hi, mr)
├─ validation/    Zod schemas shared by API and clients
└─ demo/          clearly-labelled demo/seed data
```

## 3. Frontend architecture

### 3.1 Shared rules (all three interfaces)

- **Data access is isolated behind a service layer.** Components never call `fetch` directly. This is what makes the mock→real API transition in `prd.md` §6 cheap.
- Every service call goes through a single client that handles auth, base URL, error normalization and offline detection.
- Screens are thin. Business logic lives in `packages/shared` engines, not in components.
- All user-facing strings come from the i18n catalogue. No hardcoded strings in components.
- Every asynchronous screen defines all six states: loading, empty, error, offline, syncing, success.

### 3.2 Service layer / mock-to-real contract

```
src/services/
├─ types.ts          ServiceInterface — the contract
├─ api/              RealApiService   (fetch → /api)
├─ demo/             DemoApiService   (in-memory, latency-simulated)
└─ index.ts          Provider selection

RESCRAP_DATA_SOURCE=demo | api
```

Both implementations satisfy the identical `ServiceInterface`. Switching is a configuration change, not a rewrite. UI components are unaware of which is active, and demo responses are explicitly flagged `demo: true` so the UI can render demo indicators.

This is the concrete mechanism that satisfies the demo-data rule: demo is a *first-class, isolated* implementation, never scattered inside components.

## 4. Mobile architecture

### 4.1 Layering

```
screens/        Route-level composition only
components/     Reusable, presentational
services/       Data access (offline-aware)
state/          Context providers (auth, lot, sync, notifications)
db/             SQLite schema, migrations, DAOs
sync/           Outbox queue, replay engine, conflict policy
i18n/           Locale resolution + string lookup
```

### 4.2 Local database

SQLite via `expo-sqlite`. Tables mirror the domain model plus sync metadata:

| Table | Purpose |
|---|---|
| `lots` | Locally created and cached lots |
| `lot_items` | Material/weight/condition lines |
| `offers` | Cached offers for collector's lots |
| `materials` | Cached material catalogue |
| `prices` | Cached reference prices |
| `recyclers` | Cached recycler directory |
| `outbox` | Pending sync operations |
| `sync_meta` | Last successful sync cursors |

Reads are always local. The network is used only by the outbox drain.

### 4.3 Outbox and idempotency

Every local write produces an outbox row: `{ id, entity, entityLocalId, op, payload, idempotencyKey, attempts, createdAt }`.

- `idempotencyKey` is a client-generated UUID, stable across retries
- The API deduplicates on this key, so a replayed op returns the original result instead of creating a duplicate lot — this is the offline duplicate-transaction defence
- Ops are drained in creation order
- On failure, `attempts` increments with backoff; the row is retained indefinitely and surfaced as "Sync failed"
- Server response carries the authoritative entity; local state is updated from it, never assumed

### 4.4 Performance for low-end devices

- Photos resized/compressed at capture; thumbnail for list views
- No heavy animation; `LayoutAnimation`/Reanimated only where it aids comprehension
- List screens use `FlatList` with windowing and memoized rows
- Reference data cached with a staleness window; price board usable fully offline
- Target: fast cold start, minimal background work

## 5. Web architecture

- Route-based pages with a persistent shell (sidebar + workspace)
- Server state cached by a small query layer; components subscribe to it
- Tables virtualized when row count is unbounded
- Forms validated with the **same Zod schemas** as the API — one definition, both sides
- Keyboard-first interaction on operational screens
- Desktop-first layout; breakpoints handle tablet, not as an afterthought

## 6. AI/ML technical approach

### 6.1 Current approach: interface-first, deterministic by default

No training data exists. Therefore:

| Capability | Phase 0–3 implementation | Phase 4 target |
|---|---|---|
| Material classification | `ClassificationService` interface; rule/keyword+metadata heuristic fallback, confidence reported | Trained image classifier, same interface |
| Valuation | Deterministic: reference price × weight × condition factor × location factor | Learned model, same interface |
| Matching | Deterministic, weighted, explainable scoring | Learned ranking, same interface |
| Anomaly detection | Statistical thresholds over transaction history | Model-assisted, still human-reviewed |

Every service is defined as an interface with at least one implementation. Swapping in a trained model requires no call-site change.

### 6.2 Honesty requirements

`AIPrediction` stores `{ method: 'model' | 'rule', confidence, modelVersion?, inputRef, createdAt }`.

- Any prediction produced by a rule-based path is labelled as such
- Confidence is always present
- Model accuracy is **never** stated without measured evidence — **[DATA REQUIRED]**
- No interface may display a confidence figure that was not actually produced by the calculation that produced the prediction

## 7. Backend implementation approach

```
apps/api/src/
├─ server.ts        Fastify bootstrap
├─ plugins/         auth, rate-limit, error handling
├─ modules/
│  ├─ auth/
│  ├─ lots/
│  ├─ offers/
│  ├─ handover/
│  ├─ payments/
│  ├─ transactions/
│  ├─ materials/
│  ├─ prices/
│  ├─ matching/
│  ├─ ai/
│  ├─ notifications/
│  ├─ traceability/
│  └─ admin/
├─ repositories/    Storage interfaces + implementations
├─ schemas/         Zod request/response schemas
└─ lib/             ids, money, time, errors, logging
```

### 7.1 Module convention

Each module owns: routes, schemas, service logic, authorization rules, repository access. Cross-module access goes through the owning module's service, never directly into another module's repository.

### 7.2 Money handling

All monetary values are **integer minor units** (paise). Floating-point currency arithmetic is prohibited. A shared `Money` type prevents `number` from being used for currency by accident at the type level.

### 7.3 Identifier format

Lots use human-readable sequential IDs: `LOT-RS-00001`. Displayed to collectors as "Scrap ID". Generated server-side; never client-asserted.

### 7.4 Errors

A single normalized error envelope. The API never leaks stack traces or internal detail. Errors carry a stable `code` so clients can render language-appropriate, non-technical messages.

## 8. Database strategy

- PostgreSQL, schema managed by versioned SQL migrations
- Repository interfaces in `apps/api/src/repositories/` — the only layer that knows the store
- Transactions for any multi-entity write (offer acceptance must atomically create the deal, transition the lot, and write the traceability event)
- Constraints enforced in the database, not only in application code: unique idempotency keys, non-negative weights, valid state enums
- Indexes on the actual access paths: `lots(collectorId, state)`, `lots(materialCategory, state)`, `offers(recyclerId, state)`, `priceRecords(materialId, recordedAt)`

## 9. Localization approach

- String catalogues in `packages/shared/src/i18n/{en,hi,mr}.ts`, keyed by stable ID
- Components reference keys, never literals
- Interpolated values via a typed function, not string concatenation
- Layouts use flexible sizing and text wrapping so longer translations (Marathi/Hindi) do not break layouts
- Locale persisted per user, overridable in-app
- **English, Hindi and Marathi are all authored from the start** — retrofitting localization is the common failure this avoids

## 10. Accessibility approach

- Semantic roles and labels on every interactive element
- Touch targets ≥44pt (Collector primary actions ≥56dp)
- Contrast ratios meeting WCAG AA against both light and dark surfaces
- Status never conveyed by colour alone — always icon + text
- `prefers-reduced-motion` respected on web; reduced motion on mobile
- Focus management and keyboard operability on all web workflows

## 11. Testing approach

| Level | Scope | Tool |
|---|---|---|
| Unit | Lifecycle transitions, pricing math, matching scores, validation | Vitest |
| Integration | API routes + repositories, authn, authz, full lot/offer/handover/payment lifecycle | Vitest + Fastify inject |
| Frontend | Critical screens, all six async states, offline behaviour | Vitest + Testing Library |
| E2E | **The core loop** | Scripted integration test over the real API |

### 11.1 The critical E2E test

The single most important test in the project:

```
Collector creates Lot (material, photo, weight, estimate)
  → Recycler receives Lot
  → Recycler views Lot
  → Recycler makes Offer
  → Collector receives Offer
  → Collector accepts
  → Recycler confirms Handover
  → Payment record created
  → Collector sees Lot Passport + traceability chain
```

This runs against the real API with the real shared state machine. If this test passes, the MVP loop is proven.

## 12. Deployment and monitoring

**Deferred: [DATA REQUIRED].** Hosting, CI/CD tooling and deployment topology are Phase 6 decisions and are deliberately absent from the repository now.

Logging and audit structure are built now (structured logs, append-only audit events) so the eventual deployment does not require retrofitting.

## 13. Performance strategy

| Area | Approach |
|---|---|
| Mobile startup | Minimal boot work; lazy-load route components |
| Mobile network | Local-first reads; sync is background and batched |
| Mobile images | Capture-time compression; thumbnails for lists |
| API | Indexed access paths; pagination on all list endpoints; no unbounded queries |
| Web | Route-level code splitting; virtualized tables |
| Payload | Compact field selection — the Collector App never receives recycler business internals |

Privacy note: the Collector App's payloads are deliberately narrow. The Recycler Portal never receives collector personal data beyond what the handover workflow requires.
