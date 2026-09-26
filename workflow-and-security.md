# ReScrap — Workflow & Security

Status: Approved · Last updated: 2026-09-27

Every workflow below is annotated with the **security boundary** crossed at each step. Role-specific navigation is a UX layer only; every authorization decision is enforced server-side.

---

## 1. COLLECTOR — End-to-end workflow

```
01 Splash
 ↓
02 Language
 ↓
03 Mobile / OTP
 ↓
04 Basic Profile
 ↓
05 Home
 ↓
06 Start Scrap
 ↓
07 Capture Photo
 ↓
08 AI Material Identification
 ↓
09 Scrap Details
 ↓
10 Review + Estimated Value
 ↓
11 Recycler Matches
 ↓
12 Recycler Offer
 ↓
13 Offer Accepted
 ↓
14 Handover Tracking
 ↓
15 Verify Handover
 ↓
16 Payment Confirmation
 ↓
17 Digital Lot Passport
```

Supporting: `18 My Scrap` · `19 Price Board` · `20 Earnings` · `21 Profile`

This sequence is **FINAL**. It is not to be renamed, reordered, merged or split without a documented product/UX reason and updates to `frontend-discussion.md`, `frontend-requirements.md`, `project-summary.md`, and `changelog.md`.

### 01 Splash
Branding, session check, locale restore. No collector data exposed before auth.
**Security:** none. No PII rendered pre-auth.

### 02 Language
Choose English / हिन्दी / मराठी. Selection persists and applies immediately.
**Security:** none.

### 03 Mobile / OTP
Enter phone → request OTP → verify.
**Security boundary:** *rate-limited OTP issuance; verification produces a session. This is the authentication boundary — everything after is an authenticated session.*
- Phone numbers normalized before comparison
- OTP stored hashed, short expiry, single-use
- Rate limits on both request and verify
- Session = short-lived access token + rotating refresh token
- Session stored in platform secure storage

### 04 Basic Profile
Name and preferred language. Nothing more.
**Security:** *data minimization enforced — no government ID, no address, no documents in MVP (PRIV-03).*
- Fields length-capped and validated
- Profile is editable but identity is not reassignable

### 05 Home
Active scrap status, primary CTA "Add Scrap", sync state, safety reminder.
**Security:** lot queries scoped to `collectorId` from the session. A collector cannot request another collector's lots — enforced by ownership filter, not by the client hiding the option.

### 06 Start Scrap
Creates a local `DRAFT` lot with a client reference. No network required.
**Security:** local only. Nothing is transmitted yet.

### 07 Capture Photo
Camera capture; images resized and compressed on-device.
**Security:** *photos may contain personal data (house interiors, faces, documents).*
- Stored locally only until sync
- Metadata stripped on capture
- Never public; private object storage with short-lived signed URLs
- Explicit capture consent implied by the action; no background camera access

### 08 AI Material Identification
Photo → classification suggestion + confidence → **collector confirms or corrects**.
**Security:** *the collector is not a passive subject of automated decision-making.*
- AI output is advisory only; unconfirmed output is never persisted as the lot item's material (AI-03, LOT-06)
- Confidence is always shown
- Material-specific safety warning surfaces at this point, before handling continues
- Manual selection is always available; the AI path is never mandatory
- Below-threshold confidence falls back to deterministic handling and says so

### 09 Scrap Details
Weight, condition, optional source type.
**Security:** *input validation is the boundary.*
- Zod validation; weight finite, > 0, sane upper bound
- Weight is a **collector declaration** at this stage — explicitly not authoritative
- Offline: saved locally, queued

### 10 Review + Estimated Value
Shows declared weight, material, and the computed estimate.
**Security:** *estimate is server-computed; the client cannot assert it (PRICE-04).*
- Estimate is labelled an estimate, prominently and unavoidably
- Distinct visual treatment from any offer or final amount (PRICE-03)
- Offline: computed from cached reference prices, with a visible staleness indicator
- Submitting transitions the lot and enqueues sync

### 11 Recycler Matches
Ranked, verified recyclers with plain-language reasons.
**Security:** *authorization boundary — the collector's data meets the recycler's existence.*
- Only `VERIFIED` recyclers are returned (RECY-02)
- Reasons are explainable; no opaque score (AI-05)
- Only material-compatibility-relevant recyclers are shown
- Collector phone number is **not** disclosed at this stage (PRIV-04)
- Offline: shows cached matches with a clear freshness indicator

### 12 Recycler Offer
Collector sees incoming offers.
**Security:** *the collector is the decision authority.*
- Only offers on lots the collector owns are visible
- Amount, validity window, recycler identity, verification status shown
- The collector cannot modify an offer amount
- Sanity-band violations are surfaced, not silently hidden

### 13 Offer Accepted
**Security boundary:** *the commercial commitment. Atomic and audited.*
- Atomic operation: supersede competing offers → transition lot → create traceability event
- Partial application prohibited (OFFER-06)
- Server-validated; the client sends an intent, not a result
- Full audit record (AUD-01)

### 14 Handover Tracking
Scheduled pickup status, recycler identity, location context.
**Security:** *location disclosure begins here, narrowly.*
- Precise collector location is shared only once a pickup is scheduled
- Intermediate matching stages reveal area, not coordinates (PRIV-04)
- Recycler contact details shared at scheduling so the handover can physically occur — minimum required for the workflow

### 15 Verify Handover
**Security boundary:** *physical custody transfer. Trust-critical.*
- Recycler-declared final weight, photos, location, timestamp presented
- Collector must explicitly confirm
- **Neither party alone completes the handover** (HAND-02)
- Weight discrepancy beyond tolerance is shown prominently and **blocks automatic payment** pending resolution (HAND-04)
- Evidence immutable once recorded (HAND-05a)
- Offline: verification queues and syncs; the UI states the handover is recorded on the phone and pending sync

### 16 Payment Confirmation
Quoted price, final price, method, status, date.
**Security:** *financial record.*
- Final amount is **server-computed** from accepted rate × reconciled final weight — never client-supplied (PAY-03)
- Method: cash default; digital optional and never a participation prerequisite (PAY-01)
- Status cannot be set to complete without a confirmation reference or a visible simulated indicator (PAY-04)
- Every payment action audit-logged (AUD-03, PAY-06)
- MVP payment completion is explicitly labelled as simulated (PAY-07, HON-02)

### 17 Digital Lot Passport
The collector's permanent, portable record of this transaction.
**Security:** collector-owned read view.
- Full lifecycle, parties, material, weights, amount, method, timestamps, evidence references
- Retrievable later; the passport survives app reinstall via server record
- No data the collector is not entitled to

---

## 2. RECYCLER — End-to-end workflow

```
01 Login
 ↓
02 Dashboard
 ↓
03 Available Lots
 ↓
04 Search / Filter
 ↓
05 Lot Details
 ↓
06 Make Offer
 ↓
07 Negotiation (P1)
 ↓
08 Offer Accepted
 ↓
09 Collection / Handover Scheduling
 ↓
10 Handover Execution
 ↓
11 Confirmation
 ↓
12 Transaction
 ↓
13 Recycling Status (P1)
```

### 01 Login
Phone + OTP. Role is resolved server-side, never selected by the client.
**Security boundary:** authentication. *A client-requested role is never trusted — the role comes from the user record.*

### 02 Dashboard
New lots, pending offers, active deals, upcoming pickups, completed transactions, pending actions.
**Security:** queries scoped to the recycler's own offers and deals. No collector personal data.
- Every metric must support a real decision; no decorative analytics
- Live aggregate data may briefly include unaccepted lots (business necessity to trade), but lot identity, exact coordinates and contact details are withheld until a pickup is scheduled (PRIV-04)

### 03 Available Lots
Lots currently open to offers.
**Security:** only lots in an offer-eligible state are listed. Expired/withdrawn lots are excluded.

### 04 Search / Filter
Material, category, location, weight range, price range, status.
**Security:** filter parameters are validated and parameterized. No unbounded queries.

### 05 Lot Details
Photos, material, weight, condition, collection area, estimated value, safety context.
**Security:** *minimum-necessary disclosure.* Collector identity is limited to what the handover requires; precise location withheld until scheduling.

### 06 Make Offer
**Security boundary:** *a binding commercial commitment.*
- Only `VERIFIED` recyclers may offer (RECY-01)
- Amount validated: > 0, integer minor units, within sanity band (OFFER-04)
- Out-of-band amount requires explicit justification and is flagged
- Validity window required
- Server-validated; the client sends an intent

### 07 Negotiation (P1)
Counter-offers, with full history preserved.
**Security:** counters validated identically to offers. Only the owning parties may act. Full history retained (OFFER-08).

### 08 Offer Accepted
The recycler is notified that their offer was accepted.
**Security:** server-initiated state change, audit-logged. The recycler cannot self-accept.

### 09 Collection / Handover Scheduling
Pickup date, time window, recycler team.
**Security boundary:** *contact and precise location become necessary.*
- Precise collector location and contact are released at this point only
- Access to released data is logged
- Scheduling conflicts validated

### 10 Handover Execution
Recycler records final weight, photographs, location, timestamp.
**Security boundary:** *physical custody transfer.*
- Final weight is recycler-declared but becomes authoritative for valuation (HAND-03)
- Declared weight retained for comparison
- Evidence mandatory and immutable (HAND-05, HAND-05a)
- Discrepancy beyond tolerance auto-flags and holds payment (HAND-04)
- Cannot execute twice (HAND-06)
- Location captured here — and only here — for the handover record (HAND-07)

### 11 Confirmation
Recycler confirms the handover. Combined with collector verification, this completes it.
**Security:** both-party requirement enforced server-side (HAND-02).

### 12 Transaction
Consolidated record: lot, parties, material, weights, amount, method, status.
**Security:** immutable once created (TXN-05). Derived status only (TXN-03).

### 13 Recycling Status (P1)
Recycler updates processing status against the formal recycling stream.
**Security:** status updates are audit-logged. They do not alter the financial record.

---

## 3. ADMIN — End-to-end workflow

```
01 Login
 ↓
02 Dashboard
 ↓
03 Recycler Verification
 ↓
04 Material / Price Management
 ↓
05 Transaction Monitoring
 ↓
06 Dispute / Exception Handling (P1)
 ↓
07 Analytics / Data Quality (P1)
 ↓
08 Audit Log
```

### 01 Login
Admin credentials with stronger authentication. **[DATA REQUIRED]** — MFA policy to be defined; flagged as a security gap to close before production.
**Security boundary:** authentication. Admin is the highest-privilege role; least privilege applies from login onward.

### 02 Dashboard
Platform operational state: volumes, exceptions, verification queue depth, sync health.
**Security:** aggregate views. Personal data is not surfaced for convenience.
- No decorative metrics (AI-13 spirit applied to admin analytics)

### 03 Recycler Verification
Review submitted evidence; approve or reject with a reason.
**Security boundary:** *authorization grant.*
- Every decision audit-logged including rejections (AUD-04)
- Reason is mandatory on rejection
- Approval is the only path to `VERIFIED`, which is the only path to offering (RECY-01, RECY-02)
- No fabricated approvals in demo data — demo status is labelled as demo (HON-01)

### 04 Material / Price Management
Material catalogue CRUD; reference price record management.
**Security:** all changes audit-logged with before/after. Price records are effective-dated, never overwritten in place.
- No fabricated real pricing. Seed prices are labelled demo data (HON-01)

### 05 Transaction Monitoring
All transactions across the platform with filters and drill-down.
**Security:** *elevated read access.* Access to transaction detail is itself audit-logged — admin visibility is not implicit.
- Full traceability chain available per lot

### 06 Dispute / Exception Handling (P1)
Open and resolve disputes; intervene in stuck or anomalous lots.
**Security boundary:** *override authority.*
- Every state override is audit-logged with actor, reason, before/after (AUD-07)
- Overrides never erase history; they append
- Admin cannot silently alter a financial amount — corrections are adjustment events (TXN-05)

### 07 Analytics / Data Quality (P1)
Derived metrics; data quality and anomaly review.
**Security:** analytics payloads exclude personal data (PRIV-06).
- Every metric maps to a decision
- Demo data is visibly separated from any real data

### 08 Audit Log
Queryable append-only event stream.
**Security:** *the accountability record.* Audit records cannot be edited or deleted by anyone, including admins (AUD-05).

---

## 4. Security boundaries — summary

| # | Boundary | Crossed when | Control |
|---|---|---|---|
| SB-1 | Unauthenticated → Authenticated | OTP verification | Rate limiting, hashed OTP, token issuance |
| SB-2 | Authenticated → Role-authorized | Role resolved server-side from user record | Server-side authz on every endpoint |
| SB-3 | Collector → Recycler visibility | Lot submitted for matching | Minimum-necessary field projection |
| SB-4 | Recycler → Collector contact/location | Pickup scheduled | Explicit release, access logged |
| SB-5 | Collector → Recycler verification | Recycler reaches `VERIFIED` | Admin decision, audit-logged |
| SB-6 | Both parties → Handover complete | Collector verify + recycler confirm | Two-party requirement, immutable evidence |
| SB-7 | Transaction → Financial record | Handover complete | Server-computed amounts, audit trail |
| SB-8 | User → Admin capability | Admin login | Highest privilege, least privilege, MFA **[DATA REQUIRED]** |
| SB-9 | Client → Server truth | Any client payload | Server never trusts client prices, weights, roles or ownership |
| SB-10 | Offline → Server | Sync outbox replay | Idempotency keys, ordered replay, server-authoritative state |

## 5. Cross-cutting controls applied to every workflow

- **Authentication** — required for every route except health and OTP issuance
- **Authorization** — server-side, role + resource scoped, on every route
- **Input validation** — Zod at every boundary
- **Rate limiting** — auth/OTP endpoints strictly; list endpoints moderately
- **Audit logging** — all state transitions, all administrative and financial actions
- **Output filtering** — each role receives a field projection, not the full record
- **Secure storage** — tokens in platform secure storage; secrets in environment only
- **Error handling** — normalized envelope, no stack traces, no internal detail leaked
- **Data minimization** — collect nothing the workflow does not require
