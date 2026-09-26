/**
 * @rescrap/shared
 *
 * The single source of truth for the ReScrap domain. Consumed by the API,
 * the Collector App, the Recycler Portal and the Admin Console.
 *
 * No application may redefine a domain type declared here
 * (system-architecture.md 2, decision D-01).
 */

/* Domain */
export * from './domain/money.js';
export * from './domain/ids.js';
export * from './domain/types.js';

/* Lifecycle - implemented once, consumed by all */
export * from './lifecycle/lot.js';
export * from './lifecycle/transaction.js';

/* Engines */
export * from './engines/pricing.js';
export * from './engines/matching.js';
export * from './engines/intelligence.js';

/* Localization */
export * from './i18n/index.js';
export { en } from './i18n/en.js';
export { hi } from './i18n/hi.js';
export { mr } from './i18n/mr.js';

/* Validation */
export * from './validation/schemas.js';

/* Demo data - every value is fictional (rules-and-risk-controls.md HON-01..07) */
export * as demoSeed from './demo/seed.js';

/* Service contract */
export type {
  ReScrapService,
  SyncOperation,
  SyncResult,
  AuthSession,
  CollectorLotView,
  RecyclerLotView,
  AdminLotView,
  LotPassportView,
  PriceBoardRow,
  EarningsView,
  RecyclerDashboardView,
  AdminDashboardView,
  ClassificationResultView,
  OtpRequestResult,
  ApiErrorShape,
} from './services/contract.js';
export { DemoReScrapService } from './services/demo.js';
