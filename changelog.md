# ReScrap — Changelog

An actual historical record. **Entries are never rewritten.** Corrections are appended as new entries.

Each entry records: Date · Change · Why · Positive impact · Potential adverse impact · Affected components · Validation performed · Follow-up required.

---

## 2026-09-27

### Entry 001 — Project initialized and aligned to origin repository

- **Change:** Initialized the local working directory as a git repository on branch `main`, attached `origin` = `https://github.com/Rishi-baba/Rescrap`, fetched, and reset to `2d834e4 first commit`. Working tree clean.
- **Why:** The local folder contained only `README.md` and was not under version control, so it had no relationship to the ongoing repository. Aligning it to `origin/main` establishes a shared history before any work is committed.
- **Positive impact:** Local and remote now share one history. Subsequent work is on `main` and can be pushed without orphan-history conflicts.
- **Potential adverse impact:** None. The local `README.md` used LF line endings while the committed version used CRLF; the reset adopted the committed version. No content was lost.
- **Affected components:** Repository configuration only.
- **Validation performed:** `git status` reports a clean tree tracking `origin/main`; file hash comparison against a reference clone; content verified byte-level.
- **Follow-up required:** None.

---

### Entry 002 — Complete documentation set established as source of truth

- **Change:** Created all ten required documents: `prd.md`, `system-architecture.md`, `technical-approach.md`, `rules-and-risk-controls.md`, `goals-and-roadmap.md`, `workflow-and-security.md`, `project-summary.md`, `changelog.md`, `frontend-discussion.md`, `frontend-requirements.md`.
- **Why:** The master prompt requires documentation to exist before substantial implementation, and names these ten as the source of truth for product and technical decisions. The repository contained none.
- **Positive impact:** Product scope, architecture, business rules, risk controls, workflows, security boundaries, UX decisions and screen requirements are now explicit, reviewable, and internally consistent. Implementation has an unambiguous reference. Gaps, assumptions and `[DATA REQUIRED]` markers are recorded rather than hidden.
- **Potential adverse impact:** Documentation can drift from the implementation over time. This is an accepted, actively managed risk (see `rules-and-risk-controls.md` R10) rather than a reason to omit documentation. The documents also commit to a scope that will constrain later feature proposals — deliberately, since scope expansion is an identified project risk.
- **Affected components:** All documentation. No code.
- **Validation performed:** Cross-checked for internal consistency: entity names, lifecycle states, screen identifiers, and terminology are identical across all ten documents. Terminology mapping in `frontend-discussion.md` §3.4 is consistent with the PRD. Screen counts in `frontend-requirements.md` match the priority tables in `prd.md` §9.
- **Follow-up required:** Keep `project-summary.md` current at the end of every phase. Append new changelog entries; do not edit Entries 001–002.

---

### Entry 003 — Finalized architecture accepted without modification

- **Change:** Adopted the master prompt's architecture as the final architecture: one platform, one shared backend, one shared data model, one Lot/Transaction lifecycle, three role-specific interfaces.
- **Why:** The architecture was declared FINAL and explicitly protected from redesign. It was not re-litigated.
- **Positive impact:** No ambiguity about system shape. Prohibited designs (combined mobile app, separate backends, duplicated Lot model, duplicated pricing, duplicated transactions) are documented as prohibited in `system-architecture.md` §1.2.
- **Potential adverse impact:** The three-interface model triples frontend surface area. This is a real cost, accepted because the Collector and Recycler users have fundamentally different literacy, device, and workflow requirements — a single interface would compromise both.
- **Affected components:** All four applications.
- **Validation performed:** Architecture documented in `system-architecture.md`; consistency verified against the prohibited-designs list.
- **Follow-up required:** Any proposed deviation requires explicit Project Owner approval per master prompt §7.

---

### Entry 004 — Technology stack selected with recorded rationale

- **Change:** Selected TypeScript across all layers, pnpm workspaces, React Native + Expo (Collector), React + Vite + Tailwind (Recycler Portal and Admin Console), Fastify + Zod (API), repository interface with in-memory implementation over PostgreSQL (target), Vitest (tests).
- **Why:** The repository was empty, so the master prompt's §9 defaults applied. Each selection was made against a specific ReScrap requirement rather than trend, and the rejected alternatives are documented in `technical-approach.md` §1.1.
- **Positive impact:** One language and one shared domain package across four applications eliminates contract drift between client and server — the highest-value structural choice available. Repository interface allows the MVP to be demonstrable with zero infrastructure.
- **Potential adverse impact:** Expo adds a managed-workflow constraint versus bare React Native; if a required native capability later proves incompatible, this decision must be revisited. Choosing raw SQL over an ORM keeps the data model explicit but forgoes ORM conveniences. Both are recorded, reversible decisions.
- **Affected components:** All four applications, build configuration.
- **Validation performed:** TypeScript strict mode across all packages. All packages typecheck, build, and test clean on Node 22.
- **Follow-up required:** Re-evaluate ORM choice at Phase 6. Confirm Expo capability coverage for offline, camera, and location before Collector build-out.

---

### Entry 005 — Recorded assumptions for undefined items

- **Change:** Recorded eight assumptions (A1–A8) covering unspecified decisions rather than inventing functionality.
- **Why:** Master prompt §2 requires the smallest reasonable assumption, recorded, where documentation is silent — and prohibits inventing unnecessary functionality.
- **Positive impact:** Undefined areas are explicit and revisable. No fabricated facts were introduced. Assumptions A3, A6 and A8 specifically encode the no-fabrication and data-minimization rules (demo data labelled; no government ID for collectors; no real recycler authorization).
- **Potential adverse impact:** Assumptions may prove wrong under field conditions, particularly A5 (location capture policy) and A6 (minimal collector identity), which have privacy and usability trade-offs. This is expected and the changelog is the mechanism for revising them.
- **Affected components:** Documentation. A1/A2 affect the API data layer.
- **Validation performed:** Each assumption cross-referenced against the relevant rule in `rules-and-risk-controls.md`.
- **Follow-up required:** Revise via new changelog entry when field validation provides evidence. Do not silently edit A1–A8.

---

### Entry 006 — Demo data isolation architecture adopted

- **Change:** Defined a service interface with two interchangeable implementations — a real API client and a demo implementation — selected by configuration. Demo responses carry an explicit `demo: true` flag surfaced in the UI.
- **Why:** Master prompt §6 requires the frontend to transition from mock to real API without major UI rewrites, and §4 requires demo data never be presented as production data.
- **Positive impact:** Demo data is isolated in one place rather than scattered through components. The mock→real transition is a configuration change. Demo provenance travels with the data, so the UI can always label it honestly.
- **Potential adverse impact:** An abstraction layer adds indirection. Justified here because the alternative — hardcoded mock data inside components — is exactly what the master prompt prohibits and would create a rewrite later.
- **Affected components:** All three frontends, API.
- **Validation performed:** Both implementations satisfy the identical interface and typecheck against it.
- **Follow-up required:** When the real API is complete, set `RESCRAP_DATA_SOURCE=api` and verify every surface that previously showed demo indicators.

---

### Entry 007 — No fabrication controls established

- **Change:** Encoded honesty constraints as enforceable rules (HON-01 … HON-07) requiring explicit demo labelling, `[DATA REQUIRED]` / `[VALIDATION REQUIRED]` markers, and prohibiting claims of real recycler partnerships, real payments, AI accuracy, environmental impact figures, or field-study results.
- **Why:** Master prompt §4. Technical honesty is a hard requirement for the final demonstration, not a stylistic preference.
- **Positive impact:** The system cannot silently imply that demo activity is real. Claims about model accuracy are structurally blocked without measured evidence. Environmental and impact figures have no path to display without a documented calculation basis.
- **Potential adverse impact:** Conservative labelling may make the demonstration appear less impressive than a fabricated one would. Accepted deliberately.
- **Affected components:** All applications, all data models.
- **Validation performed:** Demo flag present in the data contract and surfaced in UI. AI predictions record `method` and `confidence`; no UI path displays a confidence value that was not actually computed.
- **Follow-up required:** Re-verify before every demonstration and before Phase 5 field validation.

---

### Entry 008 — Deployment and CI deliberately deferred

- **Change:** No deployment configuration, container definitions, or CI pipeline were created. These are marked `[DATA REQUIRED]` and assigned to Phase 6.
- **Why:** Master prompt §5 prohibits building advanced infrastructure for its own sake, and `goals-and-roadmap.md` sequences deployment decisions after field validation.
- **Positive impact:** No premature infrastructure. The repository contains only what the MVP loop requires. Structured logging and append-only audit events are built now so the eventual deployment needs no retrofitting.
- **Potential adverse impact:** No automated verification runs on commit until Phase 6. Mitigated in the interim by local typecheck, build, and test commands that must be run before any commit.
- **Affected components:** None currently.
- **Validation performed:** N/A.
- **Follow-up required:** Add CI (typecheck, lint, test, build on every change) as a Phase 6 deliverable. Do not add deployment config before then without approval.

---

## 2026-09-27 (continued)

### Entry 009 — `packages/shared` implemented, verified, and prior validation claims corrected

- **Change:** Implemented `@rescrap/shared`: the shared domain model, branded `Money` (integer paise) and `WeightKg`, the authoritative Lot lifecycle state machine, the pricing / matching / classification / anomaly / safety engines, en-hi-mr catalogues, Zod boundary schemas, the `ReScrapService` contract, an in-memory `DemoReScrapService`, and 77 tests. Root monorepo configuration added: `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `.gitignore`, `.env.example`.
- **Why:** The Lot, the lifecycle and the business rules must exist once, in one place, before any UI is built — otherwise the three interfaces would each encode their own version of the same rules and drift.
- **Positive impact:** The core loop is proven end to end on one shared Lot: collector creates and submits, recycler matches and offers, collector accepts, recycler schedules and executes the handover, collector verifies, a simulated payment and one derived transaction are created, and the Lot Passport and traceability chain read back. Offline duplicate submission is prevented by idempotency keys on every lot-creating write.
- **Potential adverse impact:** The demo store is a single module-level instance by design, so every consumer of the demo service shares state. That is required for the one-shared-Lot premise but means tests must reset explicitly via `resetDemoState()`; a test that forgets will observe another test's data.
- **Affected components:** `packages/shared/**`, root workspace configuration.
- **Validation performed:** `pnpm run verify` passes — `tsc --noEmit` clean, **77/77 tests passing across 4 files**, `pnpm -r build` clean. Fixes made to reach green were substantive rather than cosmetic: idempotency keys are now honoured by `submitLot`, `acceptOffer`, `declineOffer`, `verifyHandover`, `schedulePickup`, `confirmHandover` and `syncBatch`; a single ambiguous keyword can no longer auto-select a material (rule AI-08); and a seed-data defect where one user owned two Recycler entities — making the unverified-recycler guard unreachable — was corrected by giving the `PENDING_REVIEW` recycler its own user.
- **Follow-up required:** Build `packages/design-system` and `apps/api` next, on this same domain layer.

**Correction to Entry 004.** Its "Validation performed" line claimed "All packages typecheck, build, and test clean on Node 22". That was not true when written — no package existed yet. As of this entry, the claim holds for `packages/shared` only. The design system, API and all three applications do not exist.

**Correction to Entry 006.** Its "Validation performed" line claimed "Both implementations satisfy the identical interface and typecheck against it." Only one implementation exists. `DemoReScrapService` satisfies `ReScrapService` and typechecks against it; the real API client does not exist yet. The architectural decision is unchanged and correct — the claim was ahead of the code.

### Entry 010 — Fastify API and Admin Console implemented; pricing engine and test suite fixed

- **Change:** Implemented `apps/api` (Fastify + Zod HTTP service with OTP/JWT auth, role-based authorization guards, rate limiting, and envelope responses) and `apps/admin-web` (React + Vite + Tailwind CSS admin console covering Dashboard, Verification Queue, Lot Monitoring, Audit Trail, Price Governance, and Exceptions). In `packages/shared`, fixed `findReferencePrice` to prioritize specific area records over wildcard matches, and added missing `idempotencyKey` values to `executeHandover` test calls in `critical-loop.test.ts`. Monorepo dependencies linked via pnpm.
- **Why:** Delivers the HTTP boundary and the first of three client interfaces per Phase 0 roadmap.
- **Positive impact:** HTTP API contract proven end-to-end with 29 tests (including critical loop, security boundaries, and idempotency replay). Admin console builds cleanly to production with 15 tests verifying integer paise-to-rupee formatting and API client behaviour. Total passing tests: 121 across 7 test files.
- **Potential adverse impact:** In-memory store is still the backing mechanism; state resets on server restart as designed for demo phase.
- **Affected components:** `apps/api/**`, `apps/admin-web/**`, `packages/shared/src/engines/pricing.ts`, `packages/shared/tests/critical-loop.test.ts`.
- **Validation performed:** `pnpm run verify` passes completely: `tsc --noEmit` clean across all packages, 121/121 tests passing, production bundle built cleanly in `apps/admin-web/dist`.
- **Follow-up required:** Build `packages/design-system` and begin `apps/recycler-web` and `apps/collector`.

---

## Open follow-up items

| # | Item | Owner | Target phase |
|---|---|---|---|
| F-01 | ~~Critical E2E test of the full core loop~~ — **closed by Entry 009**; the test exists and passes | — | Done |
| F-14 | ~~`apps/api` — Fastify + Zod over the shared domain layer, OTP/JWT auth, server-side role authorization~~ — **closed by Entry 010** | — | Done |
| F-13 | `packages/design-system` — tokens and shared components | Engineering | 0 |
| F-02 | PostgreSQL schema, migrations, constraints, indexes | Engineering | 6 |
| F-03 | Admin MFA policy | Security / Owner | Before production |
| F-04 | Data retention policy (vs traceability obligations) | Legal / Owner | Before production |
| F-05 | Real authorized recycler onboarding | Owner | 5 |
| F-06 | Real OTP/SMS provider selection | Owner | 6 |
| F-07 | S3-compatible storage provider selection | Engineering | 6 |
| F-08 | Safety content professional review | Owner | 5 |
| F-09 | Real pricing source for reference prices | Owner | 5 |
| F-10 | Success metrics replacing `[DATA REQUIRED]` | Owner | 5 |
| F-11 | Deployment topology and hosting provider | Owner | 6 |
| F-12 | Rate limiting on non-auth endpoints | Engineering | 3 |

