# ReScrap — Frontend Requirements

Status: Approved · Last updated: 2026-09-27

This document defines the **actual screens and components** frontend developers must build. Every screen must support a real product requirement. Screens are not created to make the application appear complete.

Notation: **P0** core MVP · **P1** after MVP · **P2** future

---

# PART A — COLLECTOR APP (Android / React Native)

Target: entry-level Android, offline-first, low-literacy, Hindi/Marathi-ready.

## A-01 · Splash
- **Purpose:** branding, session restore, locale restore
- **Entry:** app launch · **User:** any
- **Data:** stored session, stored locale
- **Components:** Logo, ActivityIndicator
- **Primary:** auto-advance · **Secondary:** none
- **States:** loading only; error → A-03
- **Offline:** n/a (no network)
- **→ Next:** A-02 or A-03

## A-02 · Language
- **Purpose:** choose interface language
- **Entry:** first run, or Profile → Language · **User:** any
- **Data:** available locales (en, hi, mr)
- **Components:** LargeLanguageTile ×3
- **Primary:** select language · **Secondary:** none
- **States:** default
- **Offline:** fully functional
- **→ Next:** A-03 (first run) / A-05 (returning)

## A-03 · Mobile / OTP
- **Purpose:** authenticate the collector
- **Entry:** first run, session expiry · **User:** any
- **Data:** phone number; OTP verification
- **Components:** LargeTextInput, PrimaryButton, OtpInput, InlineError, TimerLabel
- **Primary:** Request OTP → Verify OTP · **Secondary:** Resend (rate-limited), Change number
- **States:** loading; error (wrong/expired OTP); offline (queued request, auto-retried)
- **Offline:** request queues and retries on reconnect; user is told it is pending
- **→ Next:** A-04 (new) / A-05 (returning)
- **Security:** rate-limited; tokens to secure storage

## A-04 · Basic Profile
- **Purpose:** collect minimum identifying information
- **Entry:** post-OTP first run · **User:** Collector
- **Data:** name, language (prefilled)
- **Components:** LargeTextInput, LanguageSelector, PrimaryButton
- **Primary:** Save and continue · **Secondary:** Back
- **States:** loading; error (validation)
- **Offline:** saved locally, queued
- **→ Next:** A-05
- **Constraint:** name + language only. No ID, no address, no documents (PRIV-03)

## A-05 · Home
- **Purpose:** current state and the single primary action
- **Entry:** app root, BottomNav · **User:** Collector
- **Data:** active lot, recent lots, sync state, price board teaser, safety tip
- **Components:** AppShell, BottomNav, ActiveScrapCard, BigPrimaryButton, OfflineChip, ScrapCard ×n, SafetyCard
- **Primary:** **Add Scrap** (persistent, ≥56dp) · **Secondary:** view active scrap, view Price Board
- **States:** loading; empty (no scrap yet — instruction + Add Scrap); error; offline; syncing
- **Offline:** full function; cached data + offline chip
- **→ Next:** A-06 / A-18 / A-19

## A-06 · Start Scrap
- **Purpose:** begin a new lot
- **Entry:** Home primary action · **User:** Collector
- **Data:** none (creates local DRAFT)
- **Components:** BigPrimaryButton, CameraCapture prompt
- **Primary:** Take Photo → A-07
- **States:** default
- **Offline:** fully functional
- **→ Next:** A-07

## A-07 · Capture Photo
- **Purpose:** photograph the material
- **Entry:** A-06, or re-shoot from A-08 · **User:** Collector
- **Data:** camera
- **Components:** CameraCapture, CaptureButton, ImagePreview, RetakeButton
- **Primary:** Capture · **Secondary:** Retake, Use Photo
- **States:** loading (camera init); error (permission denied → manual material path; no camera)
- **Offline:** fully functional; image stored locally
- **→ Next:** A-08
- **Constraint:** image resized/compressed on device; metadata stripped

## A-08 · AI Material Identification
- **Purpose:** suggest material from photo, collector confirms or corrects
- **Entry:** A-07 · **User:** Collector
- **Data:** classification suggestion + confidence + material catalogue
- **Components:** ImagePreview, MaterialTile grid, ConfidenceBadge, ConfirmButton, ChangeMaterialButton, SafetyWarning
- **Primary:** **Confirm material** · **Secondary:** Choose different material
- **States:** loading ("Looking at your photo…"); empty (no suggestion → manual grid); error ("Couldn't identify. Choose manually."); offline (rule-based fallback, labelled)
- **Offline:** works via cached catalogue; shows that the suggestion is on-device
- **→ Next:** A-09
- **Constraint:** AI advisory only; unconfirmed output is never persisted (LOT-06). Confidence always shown. Material-specific safety warning surfaces here.

## A-09 · Scrap Details
- **Purpose:** weight, condition, source
- **Entry:** A-08 · **User:** Collector
- **Data:** material, weight, condition, source type
- **Components:** WeightStepper (large, +/-), ConditionSelector, SourceTypeSelector, EstimatedValuePreview, PrimaryButton
- **Primary:** Continue · **Secondary:** Back, change material
- **States:** loading; error (validation — weight required, > 0)
- **Offline:** fully functional; saves locally
- **→ Next:** A-10
- **Constraint:** weight is a declaration, not authoritative (HAND-03)

## A-10 · Review + Estimated Value
- **Purpose:** confirm the lot and see the approximate value
- **Entry:** A-09 · **User:** Collector
- **Data:** lot summary, estimated value, price freshness
- **Components:** SummaryCard, PriceCard, FreshnessBadge, PrimaryButton, WarningNote
- **Primary:** **Submit Scrap** · **Secondary:** Edit details
- **States:** loading; error; offline (estimate from cached prices + staleness indicator)
- **Offline:** submits locally, queues sync
- **→ Next:** A-11
- **Constraint:** estimate labelled unmistakably; visually distinct from offer/final (PRICE-03); server-computed (PRICE-04)

## A-11 · Recycler Matches
- **Purpose:** show verified recyclers who can take this material
- **Entry:** A-10 submit, Home active scrap, A-18 · **User:** Collector
- **Data:** matched recyclers with reasons, distance, verification, pickup availability
- **Components:** RecyclerCard ×n, ReasonChip list, MatchEmptyState, OfflineChip
- **Primary:** view recycler / wait for offers · **Secondary:** Refresh, view all
- **States:** loading ("Finding recyclers…"); empty ("No matching recyclers yet."); error ("Couldn't load recyclers."); offline (cached, with freshness)
- **Offline:** cached matches with freshness indicator
- **→ Next:** A-12, A-14
- **Constraint:** only VERIFIED recyclers (RECY-02); plain-language reasons only, no opaque score (AI-05); collector phone not disclosed (PRIV-04)

## A-12 · Recycler Offer
- **Purpose:** view incoming offers on a lot
- **Entry:** notification, A-11, A-18 · **User:** Collector
- **Data:** offers with amount, validity, recycler, verification
- **Components:** OfferCard ×n, AcceptButton, DeclineButton, OfferEmptyState
- **Primary:** **Accept offer** · **Secondary:** Decline, view recycler
- **States:** loading; empty ("No offers yet."); error; offline (cached)
- **→ Next:** A-13 / A-11
- **Constraint:** amount not editable; out-of-band offers surfaced not hidden; one accepted offer per lot (OFFER-07)

## A-13 · Offer Accepted
- **Purpose:** confirm the deal
- **Entry:** A-12 accept · **User:** Collector
- **Data:** accepted offer, recycler, lot status
- **Components:** SuccessHeader, RecyclerCard, StatusTimeline, PrimaryButton
- **Primary:** Continue · **Secondary:** View scrap
- **States:** success; error (accept failed)
- **→ Next:** A-14
- **Constraint:** atomic server operation; audit-logged

## A-14 · Handover Tracking
- **Purpose:** show pickup progress
- **Entry:** Home active scrap, notification · **User:** Collector
- **Data:** recycler, scheduled window, location context, status
- **Components:** StatusTimeline, RecyclerCard, ScheduleCard, ContactButton
- **Primary:** View details / contact recycler · **Secondary:** Back
- **States:** loading; error; offline (cached status)
- **→ Next:** A-15
- **Constraint:** precise location released only after scheduling (PRIV-04)

## A-15 · Verify Handover
- **Purpose:** collector confirms physical handover
- **Entry:** A-14, notification · **User:** Collector
- **Data:** recycler final weight, photos, timestamp, location, declared vs final
- **Components:** PhotoViewer, WeightComparisonCard, DiscrepancyWarning, ConfirmButton, ReportButton
- **Primary:** **Confirm handover** · **Secondary:** Report problem (P1)
- **States:** loading; error; offline (queues verification, states it is saved on phone); discrepancy (blocks until acknowledged)
- **→ Next:** A-16
- **Constraint:** collector confirmation required — handover cannot complete without it (HAND-02). Discrepancy beyond tolerance blocks automatic payment (HAND-04).

## A-16 · Payment Confirmation
- **Purpose:** show what was received
- **Entry:** A-15 confirm, notification · **User:** Collector
- **Data:** quoted price, final amount, method, status, date
- **Components:** PaymentCard, PriceComparisonRow, SimulatedBadge, StatusPill, PrimaryButton
- **Primary:** Done · **Secondary:** View scrap
- **States:** loading; pending ("Payment pending."); confirmed; disputed
- **→ Next:** A-17
- **Constraint:** final amount server-computed (PAY-03). MVP completion explicitly labelled simulated (PAY-07, HON-02). Cash always available (PAY-01).

## A-17 · Digital Lot Passport
- **Purpose:** permanent record of the transaction
- **Entry:** A-16, A-18, notification · **User:** Collector
- **Data:** full lifecycle, parties, material, weights, amount, method, timestamps, evidence refs
- **Components:** PassportHeader, Timeline, DetailRows, EvidenceGrid, ShareButton
- **Primary:** Share / Download · **Secondary:** Back
- **States:** loading; error; not-found
- **→ Next:** A-18
- **Constraint:** retrievable after app reinstall (server record)

## A-18 · My Scrap
- **Purpose:** all the collector's lots
- **Entry:** BottomNav · **User:** Collector
- **Data:** lots with status, material, weight, value, offer count
- **Components:** ScrapCard ×n, FilterChips (All/Active/Completed), BigPrimaryButton
- **Primary:** open scrap · **Secondary:** Add Scrap, filter
- **States:** loading; empty ("No scrap yet."); error; offline (cached)
- **→ Next:** A-10 / A-11 / A-12 / A-14 / A-17

## A-19 · Price Board
- **Purpose:** reference prices by material
- **Entry:** BottomNav, A-10 · **User:** Collector
- **Data:** reference prices, trends, freshness
- **Components:** MaterialPriceRow ×n, TrendIndicator, FreshnessBadge, SearchInput
- **Primary:** view material price · **Secondary:** search, refresh
- **States:** loading; empty; error ("Couldn't load prices."); offline (cached + staleness)
- **Constraint:** reference price clearly distinct from estimate and offer (PRICE-03)

## A-20 · Earnings
- **Purpose:** earnings ledger
- **Entry:** BottomNav · **User:** Collector
- **Data:** confirmed total, pending, per-lot history
- **Components:** EarningsSummaryCard, LedgerRow ×n, PeriodFilter
- **Primary:** view transaction · **Secondary:** filter by period
- **States:** loading; empty ("No earnings yet."); error; offline (cached)
- **Constraint:** only CONFIRMED payments counted; pending shown separately (EARN-01, EARN-02)

## A-21 · Profile
- **Purpose:** profile, language, safety, help
- **Entry:** BottomNav · **User:** Collector
- **Data:** name, phone, language, notification prefs
- **Components:** ProfileCard, ListRow ×n
- **Primary:** navigate to section · **Secondary:** logout
- **Sections:** Edit name, Language, Safety guidelines, About ReScrap, Log out
- **→ Next:** A-02 / Safety

---

# PART B — RECYCLER PORTAL (Web)

Target: desktop/tablet-first, operational, information-dense.

## B-01 · Login
- **Purpose:** authenticate
- **Entry:** app root · **User:** Recycler
- **Data:** phone, OTP
- **Components:** AuthCard, TextInput, OtpInput, Button, InlineError
- **Primary:** Request/Verify OTP · **Secondary:** Resend
- **States:** loading; error; offline
- **→ Next:** B-02
- **Constraint:** role resolved server-side, never client-selected

## B-02 · Dashboard
- **Purpose:** operational state and required actions
- **Entry:** app root, sidebar · **User:** Recycler
- **Data:** new lots, pending offers, active deals, upcoming pickups, completed, acceptance rate
- **Components:** MetricCard ×6 (each with reason label), NewLotsTable, PendingActionsList
- **Primary:** act on a pending item · **Secondary:** navigate to full list
- **States:** loading (skeletons); empty; error; offline
- **→ Next:** B-03 / B-04 / B-05
- **Constraint:** every metric must pass "which decision does this change?" (FD-11)

## B-03 · Available Lots
- **Purpose:** browse open lots
- **Entry:** sidebar, Dashboard · **User:** Recycler
- **Data:** lots in offer-eligible state
- **Components:** FilterPanel, LotTable, LotCard (mobile), Pagination, ActiveFilterChips
- **Primary:** open lot · **Secondary:** filter, sort, paginate
- **Filters:** material, category, location/area, weight range, price range, status
- **States:** loading; empty ("No lots match these filters."); error; offline
- **→ Next:** B-05

## B-04 · Offers
- **Purpose:** manage sent and received offers
- **Entry:** sidebar · **User:** Recycler
- **Data:** offers by status
- **Components:** TabbedTable, OfferForm, StatusPill
- **Tabs:** Sent · Received · Accepted · Expired
- **Primary:** respond to counter / withdraw · **Secondary:** filter
- **States:** loading; empty per tab; error
- **→ Next:** B-05 / B-06

## B-05 · Lot Detail
- **Purpose:** full lot information to make an informed offer
- **Entry:** B-03, B-04 · **User:** Recycler
- **Data:** photos, material, weight, condition, collection area, estimated value, offer history, safety notes
- **Components:** ImageGallery, DetailGrid, EstimateCard, OfferHistoryTable, OfferFormPanel, VerificationBadge
- **Primary:** **Make offer** · **Secondary:** save for later, view history
- **States:** loading; error; not-found; offer-sent (disabled state with reason)
- **→ Next:** B-04
- **Constraint:** only VERIFIED recyclers may offer (RECY-01). Amount validated; out-of-band needs justification (OFFER-04). Collector PII minimized (PRIV-04).

## B-06 · Active Deals
- **Purpose:** manage ongoing transactions
- **Entry:** sidebar, Dashboard · **User:** Recycler
- **Data:** accepted lots, pickup status, handover status
- **Components:** DealTable, DealStatus, PickupSchedule
- **Primary:** schedule pickup / execute handover · **Secondary:** filter
- **States:** loading; empty ("No active deals."); error
- **→ Next:** B-07 / B-08

## B-07 · Pickup Scheduling
- **Purpose:** set date, window, team
- **Entry:** B-06 · **User:** Recycler
- **Data:** accepted deal, available windows
- **Components:** DatePicker, TimeWindowSelector, TeamInput, ConfirmDialog
- **Primary:** Confirm schedule · **Secondary:** Cancel
- **States:** loading; error (conflict); success
- **→ Next:** B-06
- **Constraint:** scheduling releases collector contact + precise location; access logged (workflow SB-4)

## B-08 · Handover Execution
- **Purpose:** record physical transfer
- **Entry:** B-06/B-07 · **User:** Recycler
- **Data:** declared weight, final weight entry, photos, location, timestamp
- **Components:** WeightInput, CameraUpload, LocationBadge, EvidenceChecklist, ConfirmDialog, DiscrepancyWarning
- **Primary:** **Confirm handover** · **Secondary:** cancel
- **States:** loading; error (validation); success; discrepancy
- **→ Next:** B-09
- **Constraint:** final weight authoritative (HAND-03); evidence mandatory + immutable (HAND-05); cannot execute twice (HAND-06)

## B-09 · Transaction History
- **Purpose:** completed records
- **Entry:** sidebar · **User:** Recycler
- **Data:** transactions, amounts, status, dates
- **Components:** TransactionTable, DateFilter, ExportButton, RecyclingStatusControl (P1)
- **Primary:** view transaction · **Secondary:** filter, export
- **States:** loading; empty; error
- **Constraint:** transactions immutable (TXN-05)

## B-10 · Business Profile
- **Purpose:** recycler identity and verification display
- **Entry:** sidebar · **User:** Recycler
- **Data:** business details, verification status, accepted materials, service area, pickup availability
- **Components:** ProfileCard, VerificationBadge, MaterialTagList, ServiceAreaInput
- **Primary:** edit service area / materials · **Secondary:** view verification details
- **States:** loading; error; success
- **Constraint:** demo verification status labelled as demo (HON-01)

---

# PART C — ADMIN CONSOLE (Web)

Target: desktop-first, operational, auditability-first.

## C-01 · Admin Login
- **Purpose:** authenticate the highest-privilege role
- **Entry:** app root · **User:** Admin
- **Data:** credentials
- **Components:** AuthCard, TextInput, OtpInput, Button
- **Primary:** Sign in · **Secondary:** none
- **States:** loading; error; lockout notice
- **→ Next:** C-02
- **Security gap:** MFA policy **[DATA REQUIRED]** — must close before production

## C-02 · Admin Dashboard
- **Purpose:** platform operational state
- **Entry:** app root, sidebar · **User:** Admin
- **Data:** volumes, verification queue depth, exception count, sync health, disputes
- **Components:** MetricCard ×n, ExceptionPreview, VerificationQueuePreview
- **Primary:** drill into a queue · **Secondary:** time-range filter
- **States:** loading; empty; error
- **→ Next:** C-03 / C-06 / C-07
- **Constraint:** aggregate views; no personal data surfaced for convenience; no decorative metrics

## C-03 · Recycler Verification
- **Purpose:** approve or reject recycler authorization
- **Entry:** sidebar, Dashboard · **User:** Admin
- **Data:** applications with submitted evidence
- **Components:** VerificationQueue, VerificationPanel, EvidenceViewer, ApproveButton, RejectDialog (reason required)
- **Primary:** Approve / Reject · **Secondary:** request more evidence
- **States:** loading; empty ("Queue is clear."); error; success
- **→ Next:** C-04
- **Constraint:** every decision audit-logged including rejections (AUD-04); reason mandatory on rejection

## C-04 · Recycler Management
- **Purpose:** view and manage recyclers
- **Entry:** sidebar · **User:** Admin
- **Data:** recycler list, status, activity
- **Components:** DataTable, FilterPanel, RecyclerDrawer, StatusControl
- **Primary:** view recycler · **Secondary:** filter, suspend/reactivate
- **States:** loading; empty; error
- **Constraint:** status changes audit-logged (RECY-03)

## C-05 · Collector Management
- **Purpose:** view collectors
- **Entry:** sidebar · **User:** Admin
- **Data:** collector list, activity, aggregate stats
- **Components:** DataTable, FilterPanel, CollectorDrawer
- **Primary:** view collector · **Secondary:** filter
- **States:** loading; empty; error
- **Constraint:** PII minimized; no unnecessary personal data (PRIV-03)

## C-06 · Material Catalogue
- **Purpose:** manage materials and safety flags
- **Entry:** sidebar · **User:** Admin
- **Data:** categories, materials, safety flags, active status
- **Components:** DataTable, MaterialForm, CategoryTree, SafetyFlagToggle
- **Primary:** create/edit material · **Secondary:** deactivate
- **States:** loading; empty; error; success
- **Constraint:** audit-logged; deactivation does not delete history

## C-07 · Price Management
- **Purpose:** manage reference price records
- **Entry:** sidebar · **User:** Admin
- **Data:** price history by material/location, effective dates
- **Components:** PriceTable, PriceForm, HistoryChart, EffectiveDatePicker
- **Primary:** create price record · **Secondary:** view history
- **States:** loading; empty; error; success
- **Constraint:** effective-dated, never overwritten (PRICE-01); all changes audit-logged; seed prices labelled demo (HON-01)

## C-08 · Transaction Monitoring
- **Purpose:** watch all platform transactions
- **Entry:** sidebar, Dashboard · **User:** Admin
- **Data:** transactions with status, amounts, parties, timestamps
- **Components:** DataTable, FilterPanel, TransactionDrawer, TraceabilityTimeline
- **Primary:** drill into a transaction · **Secondary:** filter, export
- **States:** loading; empty; error
- **→ Next:** C-09
- **Constraint:** access to transaction detail is itself audit-logged

## C-09 · Traceability View
- **Purpose:** full lifecycle chain for a lot
- **Entry:** C-08 drill-down · **User:** Admin
- **Data:** complete audit + traceability chain
- **Components:** AuditTimeline, EvidenceGrid, StateTransitionList
- **Primary:** inspect chain · **Secondary:** export
- **States:** loading; error; not-found
- **Constraint:** append-only, not editable (AUD-05)

## C-10 · Disputes
- **Purpose:** resolve disputes
- **Entry:** sidebar · **User:** Admin
- **Data:** open disputes, evidence from both parties
- **Components:** DisputeTable, DisputePanel, EvidenceCompare, ResolveDialog (reason required)
- **Primary:** resolve · **Secondary:** request information
- **States:** loading; empty ("No open disputes."); error
- **Constraint:** resolution is an adjustment event, never an edit (TXN-05); audit-logged (AUD-07)

## C-11 · Exceptions
- **Purpose:** triage stuck or anomalous lots
- **Entry:** sidebar, Dashboard · **User:** Admin
- **Data:** lots flagged for weight discrepancy, stale state, or anomaly
- **Components:** ExceptionQueue, ExceptionDetail, OverrideDialog (reason required)
- **Primary:** resolve / override · **Secondary:** assign, filter
- **States:** loading; empty ("No exceptions."); error
- **Constraint:** overrides append history, never erase it (AUD-07)

## C-12 · Analytics
- **Purpose:** derived operational insight
- **Entry:** sidebar · **User:** Admin
- **Data:** volumes, price trends, funnel, acceptance, geography
- **Components:** AnalyticsCard, TrendChart, FunnelChart, DateRangePicker, DemoDataBadge
- **Primary:** adjust range · **Secondary:** export
- **States:** loading; empty; error
- **Constraint:** every metric maps to a decision; demo data visibly separated; personal data excluded (PRIV-06)

## C-13 · Data Quality
- **Purpose:** monitor data integrity
- **Entry:** sidebar · **User:** Admin
- **Data:** missing fields, low-confidence predictions, uncategorized materials, outliers
- **Components:** DataQualityCard, IssueList, IssueDetail
- **Primary:** review issue · **Secondary:** filter by type
- **States:** loading; empty; error
- **P1**

## C-14 · Audit Log
- **Purpose:** accountability record
- **Entry:** sidebar · **User:** Admin
- **Data:** append-only audit events
- **Components:** AuditTable, FilterPanel, AuditDetailDrawer, ExportButton
- **Primary:** inspect event · **Secondary:** filter, export
- **States:** loading; empty; error
- **Constraint:** no edit, no delete, for anyone (AUD-05)

## C-15 · Safety Content
- **Purpose:** manage safety guidance
- **Entry:** sidebar · **User:** Admin
- **Data:** safety content per material, language variants
- **Components:** ContentTable, ContentForm, LanguageTabs, PreviewCard
- **Primary:** edit content · **Secondary:** preview per language
- **States:** loading; empty; error; success
- **P1** · **Constraint:** safety review required before publication

## C-16 · AI/ML Monitoring
- **Purpose:** inspect model behaviour
- **Entry:** sidebar · **User:** Admin
- **Data:** prediction volume, confidence distribution, method mix, override rate, flagged anomalies
- **Components:** AiMetricCard, ConfidenceHistogram, MethodMixChart, PredictionList
- **P2** (after Phase 4)
- **Constraint:** no accuracy claim without measured evidence (AI-09)

---

## Screen count summary

| Interface | P0 | P1 | P2 | Total |
|---|---|---|---|---|
| Collector App | 21 | 3 | 2 | 26 |
| Recycler Portal | 10 | 2 | 0 | 12 |
| Admin Console | 9 | 5 | 1 | 15 |

Every screen above maps to a documented user need in `prd.md` §9. None exist merely for completeness.
