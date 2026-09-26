# ReScrap — Frontend Discussion (UX / Design Decision Log)

Status: Approved · Last updated: 2026-09-27

This is the **UX and product design decision log**. Decisions are recorded here with rationale. Changes to a finalized decision require an entry here plus updates to `frontend-requirements.md`, `project-summary.md` and `changelog.md`.

---

## 1. Design principles

1. **One language, three densities.** All ReScrap interfaces share one design system. They differ in density and layout, never in visual identity.
2. **Simplicity is a feature, not a reduction.** The collector's interface is simple because the user is often working outdoors, one-handed, in a second language, possibly with literacy challenges. Every simplification must serve a real barrier.
3. **Trust is the product.** This platform moves a vulnerable user's goods and money. Visual design must communicate reliability: clear status, visible evidence, no ambiguity about what has happened.
4. **Honesty over polish.** Demo indicators, confidence levels, and "estimate" labels are never hidden for visual cleanliness.
5. **The interface must not require reading.** Every critical collector action must be completable through icon + colour + minimal text, with audio reinforcement where required.
6. **Never break the collector's flow for the platform's convenience.** Sync is a background concern and is communicated in one plain line.

## 2. Information architecture

One product, three navigation models, one shared domain.

```
COLLECTOR (bottom nav)        RECYCLER (sidebar)           ADMIN (sidebar)
├─ Home                        ├─ Dashboard                 ├─ Dashboard
├─ My Scrap                    ├─ Available Lots            ├─ Verification
├─ Price Board                 ├─ Offers                    ├─ Catalog & Prices
├─ Earnings                    ├─ Active Deals              ├─ Transactions
└─ Profile                     ├─ Schedule                  ├─ Disputes
                               └─ History                   ├─ Analytics
                                                              └─ Audit Log
```

Bottom navigation for the collector because it is thumb-reachable one-handed on a large device. Sidebars for web because vertical space is not the constraint and label density is.

**Collector nav rule:** exactly five destinations maximum. The primary action ("Add Scrap") is a persistent, prominent element — not buried in a tab.

## 3. Collector UX

### 3.1 Design principles

- Large touch targets: primary actions ≥56dp, all interactive elements ≥48dp
- High contrast, legible in direct sunlight
- Visual category selection over typing
- Short screens — one decision per screen
- Minimal typing; numeric entry via large keypad
- Audio reinforcement for price and safety information
- Hindi and Marathi as first-class, not afterthought translations
- Offline states always visible, never alarming
- Must run acceptably on entry-level Android hardware

### 3.2 Interaction patterns

| Pattern | Usage |
|---|---|
| Single primary CTA per screen | Reduces decision load; one obvious next step |
| Large illustrated category tiles | Material selection without reading |
| Big numeric display with +/- steppers | Weight entry without a keyboard |
| Bottom sheet for secondary choices | Keeps primary flow visible |
| Inline confirmation for destructive actions | Avoids modal fatigue |
| Persistent sync chip | Offline/syncing/synced state, always in the same place |
| Progressive status timeline | Handover progress legible at a glance, without reading detail |
| Photo-first material flow | Collector recognises objects; they do not read categories |
| Explicit "Saved on this phone" | Reassurance that nothing is lost |

### 3.3 Low-literacy UX

This is a primary design constraint, not an enhancement.

- **Icons carry meaning.** Colour + icon together; never colour alone.
- **Numbers are visual.** Weights and amounts get large, high-contrast numeric presentation.
- **One instruction per screen.** Short imperative, large type.
- **Every destructive or committing action is visually distinct** and confirmed with a large, obvious control.
- **Photographs as confirmation.** Showing the captured photo back to the collector is itself a confirmation mechanism.
- **No jargon, ever.** No "lot", "transaction", "authorization", "sync", "API".
- **Language fallback** is always available; no dead ends from missing translation.
- **Audio** carries price and safety information for users who cannot rely on reading it. (Audio is P1; layouts must not depend on it.)

### 3.4 Terminology mapping (enforced)

| Never say | Say instead |
|---|---|
| Create Transaction Entity | Add Scrap |
| Initiate Material Channelization | Find Recycler |
| Execute Compliance Workflow | Confirm Handover |
| Lot (collector-facing) | Scrap ID / Batch ID |
| Recycler Authorization Status | Verified |
| Synchronization | Syncing / Synced |
| Local Persistence | Saved on this phone |
| Valuation Engine | Check Price |
| Matching Algorithm | Nearby recyclers |
| Reference Price | Today's rate |
| Estimated Value | Approximate value |
| Anomaly Detected | Needs review |
| Offline | No internet — saved on this phone |

### 3.5 Offline UX

Collector-facing states, exact language:

| State | Message |
|---|---|
| Offline | "No internet. Your scrap is saved on this phone." |
| Queued | "Saved on this phone. Will send when internet comes." |
| Syncing | "Sending…" |
| Synced | "Sent." |
| Failed | "Couldn't send. Tap to try again." |

Rules:
- The primary action **always succeeds** and always confirms locally. Network failure never loses the collector's work.
- The sync chip is persistent and in a fixed location so its state is learnable.
- Reference prices show a freshness indicator when read from cache.
- **No error dialog may block a collector from continuing.** Failures are informative, never blocking.

### 3.6 Collector screen sequence (FINAL)

```
01 Splash          07 Capture Photo        13 Offer Accepted
02 Language        08 Material ID          14 Handover Tracking
03 Mobile / OTP    09 Scrap Details        15 Verify Handover
04 Basic Profile   10 Review + Value       16 Payment Confirmation
05 Home            11 Recycler Matches     17 Digital Lot Passport
06 Start Scrap     12 Recycler Offer
```

Supporting: `18 My Scrap` · `19 Price Board` · `20 Earnings` · `21 Profile`

This sequence is final. Reordering requires: identification of the problem → explanation of why the current order is insufficient → identification of affected documentation → approval.

## 4. Recycler UX

### 4.1 Design principles

- Operational and information-dense
- Web/desktop-first
- Fast scanning of tables and lists
- Filters always visible and always stateful
- Every screen answers a business question
- Same ReScrap visual language, higher density

### 4.2 Interaction patterns

| Pattern | Usage |
|---|---|
| Faceted filter sidebar with active-filter chips | Fast narrowing; user always sees what is applied |
| Dense data table with sticky header | Primary supply browsing surface |
| Lot card → detail panel (not page navigation) | Preserves scan context |
| Inline offer form in a side panel | No context loss while making an offer |
| Dashboard metric cards, each with a reason label | Every metric must be self-justifying |
| Status pills colour + icon + text | Never colour alone |
| Keyboard-first interaction | Operational users work fast |

### 4.3 Recycler information architecture

```
Dashboard
├─ New Lots · Pending Offers · Active Deals
├─ Upcoming Pickups · Completed · Pending Actions
Available Lots
├─ Search + Filter (material, location, weight, price, status)
└─ Lot Detail → Make Offer
Offers
├─ Sent · Received · Accepted · Expired
Deals
├─ Active · Scheduled Pickup · Handover
History
└─ Transactions
```

### 4.4 Dashboard metrics — justification requirement

Every dashboard metric must pass: *"which decision does this change?"* If none, it is removed.

| Metric | Decision it supports |
|---|---|
| New lots matching your materials | "Should I bid now?" |
| Offers awaiting response | "What needs my action?" |
| Active deals | "What needs scheduling?" |
| Upcoming pickups | "What needs logistics?" |
| Completed this month | "Is this channel working for me?" |
| Acceptance rate | "Should I adjust my pricing?" |

## 5. Admin UX

### 5.1 Design principles

- Desktop-first
- Auditability over visual appeal
- Tables, filters, search as primary tools
- Verification and exception workflows are the core
- **Not designed like a consumer application**
- Destructive and override actions are visually unmistakable and always reasoned

### 5.2 Interaction patterns

| Pattern | Usage |
|---|---|
| Data table with column filters and saved views | Operational scanning at volume |
| Verification panel with evidence side-by-side | Fast approve/reject decisions |
| Audit timeline per entity | Answer "what happened to this?" |
| Exception queue ordered by severity/age | Triage |
| Reason-required dialogs on override | Accountability |

## 6. Design system

### 6.1 Visual direction

Premium. Modern. Trustworthy. Clean. Practical. Accessible.

### 6.2 Typography

**Inter** across all three interfaces — one type family, one identity.

| Role | Collector | Recycler / Admin |
|---|---|---|
| Display | 32 / 700 | 28 / 700 |
| Title | 24 / 700 | 20 / 700 |
| Body | 18 / 500 | 15 / 500 |
| Caption | 15 / 500 | 13 / 500 |
| Numeric | 40 / 700 tabular | 20 / 600 tabular |

Collector body text is substantially larger. Numeric values use tabular figures so weights and amounts do not jitter as they update.

### 6.3 Colour

| Token | Value | Usage |
|---|---|---|
| `forest-900` | `#0B2E23` | Deep Forest — primary dark, headers |
| `forest-700` | `#14513C` | Deep Forest mid — primary surfaces |
| `green-500` | `#2FBF71` | Impact Green — primary CTA, success |
| `green-400` | `#4FD68C` | Impact Green light — hover, highlight |
| `ash-100` | `#F4F6F5` | Soft Ash — app background |
| `ash-200` | `#E4E8E6` | Soft Ash border — dividers |
| `ash-400` | `#9AA5A0` | Muted text, disabled |
| `carbon-800` | `#1A1D1C` | Carbon Grey — primary text |
| `carbon-500` | `#5B6461` | Carbon Grey — secondary text |
| `surface` | `#FFFFFF` | Card surface |

**Semantic status colours** (always paired with icon + text, never used alone):

| State | Colour |
|---|---|
| Success / confirmed | `green-500` |
| Warning / pending | `#E8A33D` |
| Danger / failed / disputed | `#D9534F` |
| Info / matching | `#3D8BE8` |
| Neutral / draft | `ash-400` |

Backgrounds use warm/light surfaces. Depth comes from subtle elevation, not heavy shadow.

### 6.4 Spacing, radius, elevation

- Spacing scale: 4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48
- Radius: 8 (small) · 12 (card) · 16 (large) · 999 (pill)
- Elevation: three levels only — `sm` (cards), `md` (raised), `lg` (modals/sheets)
- Collector cards use a larger radius (16) and more generous padding than web cards

### 6.5 Restraint rules

Explicitly **avoid**: excessive gradients, glassmorphism, heavy shadows, over-rounded containers, decorative elements, animation for its own sake.

One intentional gradient is permitted: the primary CTA (`forest-700 → green-500`) and the collector Home header. Nowhere else.

Motion: 150–250ms, ease-out, transform/opacity only. Disabled entirely under reduced-motion.

### 6.6 Iconography

Single consistent set, 24px base, consistent stroke weight. Icons are always paired with a text label in the Collector App — never icon-only, where meaning must survive translation and literacy barriers.

### 6.7 Component inventory

**Shared:** Button, Input, Select, Card, Badge, StatusPill, Modal, BottomSheet, Toast, EmptyState, LoadingState, ErrorState, OfflineState, Image, PriceDisplay, LotStatus, DataTable, FilterChip, Timeline, Avatar.

**Collector:** AppShell, BottomNav, ScrapCard, MaterialTile, CameraCapture, WeightStepper, PriceCard, RecyclerCard, OfferCard, StatusTimeline, PaymentCard, LotPassport, OfflineChip, SyncState, SafetyCard, LanguagePicker.

**Recycler:** Dashboard, MetricCard, LotTable, LotCard, FilterPanel, OfferForm, DealStatus, PickupSchedule, TransactionTable, VerificationBadge.

**Admin:** DataTable, FilterPanel, VerificationPanel, AuditTimeline, AnalyticsCard, OverrideDialog, ExceptionQueue.

## 7. Accessibility decisions

- Touch targets: ≥48dp web, ≥56dp collector primary actions
- Contrast: WCAG AA minimum on all text/background pairs
- **Status is never conveyed by colour alone** — always icon + text
- Full keyboard operability on web; visible focus rings
- Screen-reader labels on every interactive element
- `prefers-reduced-motion` respected
- Text wraps; no fixed-height text containers (translations expand)
- Tabular numerals for money and weight

## 8. Localization decisions

- en / hi / mr authored together from the start
- Centralized catalogues; no literals in components
- Layouts sized for expansion — Hindi/Marathi strings are frequently longer than English
- No text baked into images
- Icons and layout carry meaning so a missing or long string degrades gracefully
- Audio reinforcement for price and safety information (P1)

## 9. Error, empty, loading states

Reusable components, used within screens. Separate screens are created only where the event genuinely warrants dedicated confirmation.

| State | Pattern | Example copy (Collector) |
|---|---|---|
| Loading | Skeleton matching final layout | — |
| Empty | Icon + short instruction + one action | "No scrap yet. Tap Add Scrap." |
| Error | Plain message + retry, never technical | "Couldn't load prices. Tap to try again." |
| Offline | Persistent chip + contextual note | "No internet. Saved on this phone." |
| Syncing | Non-blocking progress | "Sending…" |
| Success | Toast or inline confirmation | "Scrap added." |

Errors never display technical detail, HTTP status, or stack information. Errors never block the collector from continuing.

## 10. Decision log

| # | Decision | Rationale | Date |
|---|---|---|---|
| FD-01 | Three interfaces, one design system | One product identity; §0 architecture | 2026-09-27 |
| FD-02 | Bottom nav for Collector, sidebar for web | Thumb reach vs. vertical space | 2026-09-27 |
| FD-03 | Inter as the single family | One identity across three interfaces | 2026-09-27 |
| FD-04 | Deep Forest + Impact Green palette | Trustworthy, not "eco-cliché" | 2026-09-27 |
| FD-05 | Status never colour-only | Accessibility + translation safety | 2026-09-27 |
| FD-06 | Local-first collector flow, network never on the critical path | Real field connectivity | 2026-09-27 |
| FD-07 | Photo-first material identification | Collectors recognise objects, not categories | 2026-09-27 |
| FD-08 | AI output always requires collector confirmation | Collector agency; safety | 2026-09-27 |
| FD-09 | Estimate / offer / final amount visually distinct | PRICE-03 honesty control | 2026-09-27 |
| FD-10 | Errors never block the collector | A lost session destroys trust and work | 2026-09-27 |
| FD-11 | Recycler Dashboard metrics must justify themselves | Prohibited decorative analytics | 2026-09-27 |
| FD-12 | Handover requires both parties to confirm | Trust-critical custody transfer | 2026-09-27 |
| FD-13 | Digital payment never a participation prerequisite | Inclusion of cash-first collectors | 2026-09-27 |
| FD-14 | Demo indicators visible wherever demo data appears | No-fabrication rule | 2026-09-27 |
| FD-15 | Localization authored from the start, not retrofitted | Retrofitting localization fails | 2026-09-27 |
| FD-16 | Collector flow is local-first; server never blocks a tap | Offline is a first-class requirement | 2026-09-27 |
