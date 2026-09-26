/**
 * ReScrap demo seed data.
 *
 * ============================================================
 *  HONESTY NOTICE - READ BEFORE USE  (rules-and-risk-controls.md HON-01..07)
 * ============================================================
 *
 * EVERYTHING IN THIS FILE IS FICTIONAL DEMO DATA.
 *
 * There are no real recyclers. There is no real recycler authorization.
 * There is no real pricing. There are no real payments. There is no
 * trained AI model. There are no real collector statistics.
 *
 * Every seeded entity carries `demo: true` and every seeded payment carries
 * `simulated: true`, so the UI is structurally obliged to label it.
 * [DATA REQUIRED] for any real value that would replace these.
 * ============================================================
 */

import { money, type Money } from '../domain/money.js';
import type {
  AiPrediction,
  AuditEvent,
  Collector,
  Material,
  MaterialCategory,
  PriceRecord,
  Recycler,
  SafetyContent,
  User,
} from '../domain/types.js';
import type {
  AdminId,
  CollectorId,
  MaterialCategoryId,
  MaterialId,
  PriceRecordId,
  RecyclerId,
  UserId,
} from '../domain/ids.js';

const T0 = '2026-09-20T04:30:00.000Z';
const T1 = '2026-09-22T09:15:00.000Z';
const T2 = '2026-09-25T11:00:00.000Z';

function price(paise: number): Money {
  return money(paise);
}

/* ------------------------------------------------------------------ *
 * Users
 * ------------------------------------------------------------------ */

export const demoUsers: User[] = [
  {
    id: 'usr_collector_demo' as UserId,
    phone: '+919000000001',
    role: 'COLLECTOR',
    locale: 'hi',
    displayName: 'Sunita Devi',
    profileComplete: true,
    demo: true,
    createdAt: T0,
    updatedAt: T0,
  },
  {
    id: 'usr_recycler_demo' as UserId,
    phone: '+919000000002',
    role: 'RECYCLER',
    locale: 'en',
    displayName: 'Green Loop Recycling',
    profileComplete: true,
    demo: true,
    createdAt: T0,
    updatedAt: T0,
  },
  {
    id: 'usr_recycler_2' as UserId,
    phone: '+919000000003',
    role: 'RECYCLER',
    locale: 'en',
    displayName: 'Metro E-Waste Solutions',
    profileComplete: true,
    demo: true,
    createdAt: T0,
    updatedAt: T0,
  },
  {
    // Rule REC-01: one user owns exactly one Recycler entity. The PENDING_REVIEW
    // recycler therefore needs its own user, otherwise an unverified recycler
    // would be reachable through a verified sibling's session.
    id: 'usr_recycler_3' as UserId,
    phone: '+919000000005',
    role: 'RECYCLER',
    locale: 'en',
    displayName: 'Sahyadri Scrap Traders',
    profileComplete: true,
    demo: true,
    createdAt: T2,
    updatedAt: T2,
  },
  {
    id: 'usr_admin_demo' as UserId,
    phone: '+919000000004',
    role: 'ADMIN',
    locale: 'en',
    displayName: 'ReScrap Operations',
    profileComplete: true,
    // Rule: MFA policy is [DATA REQUIRED] - see project-summary.md 10.
    mfaEnrolled: false,
    demo: true,
    createdAt: T0,
    updatedAt: T0,
  },
];

/* ------------------------------------------------------------------ *
 * Collector  (rule PRIV-03: minimal profile, no government ID)
 * ------------------------------------------------------------------ */

export const demoCollectors: Collector[] = [
  {
    id: 'col_demo_01' as CollectorId,
    userId: 'usr_collector_demo' as UserId,
    displayName: 'Sunita Devi',
    phone: '+919000000001',
    locale: 'hi',
    baseArea: 'Pune - Hadapsar',
    dataMinimised: true,
    demo: true,
    createdAt: T0,
    updatedAt: T0,
  },
];

/* ------------------------------------------------------------------ *
 * Recyclers  (rule HON-01: demo authorization, clearly flagged)
 * ------------------------------------------------------------------ */

export const demoRecyclers: Recycler[] = [
  {
    id: 'rec_demo_01' as RecyclerId,
    userId: 'usr_recycler_demo' as UserId,
    businessName: 'Green Loop Recycling',
    phone: '+919000000002',
    authorizationStatus: 'VERIFIED',
    acceptedCategoryIds: [
      'cat_electronics' as MaterialCategoryId,
      'cat_appliances' as MaterialCategoryId,
    ],
    serviceAreas: ['Pune - Hadapsar', 'Pune - Kothrud', 'Pune - Hinjewadi'],
    pickupAvailable: true,
    authorizationIsDemo: true,
    verificationNote:
      'Demo recycler. Business name, service areas and verification status are fictional.',
    demo: true,
    createdAt: T0,
    updatedAt: T0,
  },
  {
    id: 'rec_demo_02' as RecyclerId,
    userId: 'usr_recycler_2' as UserId,
    businessName: 'Metro E-Waste Solutions',
    phone: '+919000000003',
    authorizationStatus: 'VERIFIED',
    acceptedCategoryIds: ['cat_electronics' as MaterialCategoryId],
    serviceAreas: ['Pune - Viman Nagar', 'Pune - Kharadi'],
    pickupAvailable: true,
    authorizationIsDemo: true,
    verificationNote:
      'Demo recycler. Business name, service areas and verification status are fictional.',
    demo: true,
    createdAt: T0,
    updatedAt: T0,
  },
  {
    id: 'rec_demo_03' as RecyclerId,
    userId: 'usr_recycler_3' as UserId,
    businessName: 'Sahyadri Scrap Traders',
    phone: '+919000000005',
    authorizationStatus: 'PENDING_REVIEW',
    acceptedCategoryIds: ['cat_metals' as MaterialCategoryId],
    serviceAreas: ['Pune'],
    pickupAvailable: false,
    authorizationIsDemo: true,
    verificationNote: 'Demo application awaiting admin review.',
    demo: true,
    createdAt: T2,
    updatedAt: T2,
  },
];

/* ------------------------------------------------------------------ *
 * Material catalogue
 * ------------------------------------------------------------------ */

export const demoMaterialCategories: MaterialCategory[] = [
  {
    id: 'cat_electronics' as MaterialCategoryId,
    key: 'electronics',
    label: { en: 'Electronics', hi: 'इलेक्ट्रॉनिक्स', mr: 'इलेक्ट्रॉनिक्स' },
    icon: 'device',
    demo: true,
    createdAt: T0,
    updatedAt: T0,
  },
  {
    id: 'cat_appliances' as MaterialCategoryId,
    key: 'appliances',
    label: { en: 'Home Appliances', hi: 'घरेलू उपकरण', mr: 'घरगुती उपकरणे' },
    icon: 'appliance',
    demo: true,
    createdAt: T0,
    updatedAt: T0,
  },
  {
    id: 'cat_accessories' as MaterialCategoryId,
    key: 'accessories',
    label: { en: 'Cables & Accessories', hi: 'केबल और सामान', mr: 'केबल व साहित्य' },
    icon: 'cable',
    demo: true,
    createdAt: T0,
    updatedAt: T0,
  },
  {
    id: 'cat_metals' as MaterialCategoryId,
    key: 'metals',
    label: { en: 'Metals', hi: 'धातु', mr: 'धातू' },
    icon: 'metal',
    demo: true,
    createdAt: T0,
    updatedAt: T0,
  },
];

function material(
  id: string,
  categoryId: string,
  key: string,
  en: string,
  hi: string,
  mr: string,
  icon: string,
  hazardFlags: Material['hazardFlags'],
): Material {
  return {
    id: id as MaterialId,
    categoryId: categoryId as MaterialCategoryId,
    key,
    label: { en, hi, mr },
    icon,
    hazardFlags,
    active: true,
    demo: true,
    createdAt: T0,
    updatedAt: T0,
  };
}

export const demoMaterials: Material[] = [
  material('mat_mobile_phone', 'cat_electronics', 'mobile-phone', 'Mobile phones', 'मोबाइल फ़ोन', 'मोबाइल फोन', 'phone', ['BATTERY']),
  material('mat_laptop', 'cat_electronics', 'laptop', 'Laptops & computers', 'लैपटॉप और कंप्यूटर', 'लॅपटॉप व संगणक', 'laptop', ['BATTERY']),
  material('mat_desktop_cpu', 'cat_electronics', 'desktop-cpu', 'Desktop CPU', 'डेस्कटॉप सीपीयू', 'डेस्कटॉप सीपीयू', 'cpu', []),
  material('mat_television', 'cat_electronics', 'television', 'TV (LCD/LED)', 'टीवी (एलसीडी/एलईडी)', 'टीव्ही (एलसीडी/एलईडी)', 'tv', ['SHARP']),
  material('mat_crt_monitor', 'cat_electronics', 'crt-monitor', 'Old CRT TV / Monitor', 'पुराना सीआरटी टीवी / मॉनिटर', 'जुनी सीआरटी टीव्ही / मॉनिटर', 'crt', ['CRT']),
  material('mat_refrigerator', 'cat_appliances', 'refrigerator', 'Fridge / AC', 'फ्रिज / एसी', 'फ्रिज / एसी', 'fridge', ['REFRIGERANT', 'SHARP']),
  material('mat_home_appliance', 'cat_appliances', 'home-appliance', 'Mixer, grinder, iron', 'मिक्सर, ग्राइंडर, इस्तरी', 'मिक्सर, ग्राइंडर, इस्तरी', 'mixer', ['SHARP']),
  material('mat_cable', 'cat_accessories', 'cable', 'Cables & chargers', 'केबल और चार्जर', 'केबल व चार्जर', 'cable', ['CABLE']),
  material('mat_battery', 'cat_accessories', 'battery', 'Batteries & power banks', 'बैटरी और पावर बैंक', 'बॅटरी व पावरबँक', 'battery', ['BATTERY']),
  material('mat_printer', 'cat_electronics', 'printer', 'Printers & toner', 'प्रिंटर और टोनर', 'प्रिंटर व टोनर', 'printer', ['TONER']),
  material('mat_circuit_board', 'cat_electronics', 'circuit-board', 'Circuit boards', 'सर्किट बोर्ड', 'सर्किट बोर्ड', 'board', []),
  material('mat_metal_scrap', 'cat_metals', 'metal-scrap', 'Steel & aluminium', 'स्टील और एल्युमिनियम', 'स्टील व अ‍ॅल्युमिनियम', 'metal', ['SHARP']),
];

/* ------------------------------------------------------------------ *
 * Demo reference prices  (rule HON-01: labelled demo, not real market data)
 * ------------------------------------------------------------------ */

function priceRecord(
  id: string,
  materialId: string,
  area: string,
  paisePerKg: number,
  effectiveFrom: string,
  sourceLabel: string,
): PriceRecord {
  return {
    id: id as PriceRecordId,
    materialId: materialId as MaterialId,
    area,
    buyingPricePerKg: price(paisePerKg),
    effectiveFrom,
    sourceLabel: `DEMO - ${sourceLabel}`,
    demo: true,
    createdAt: effectiveFrom,
    updatedAt: effectiveFrom,
  };
}

export const demoPriceRecords: PriceRecord[] = [
  priceRecord('prc_01', 'mat_mobile_phone', 'Pune - Hadapsar', 12000, T2, 'platform curated'),
  priceRecord('prc_02', 'mat_laptop', 'Pune - Hadapsar', 18000, T2, 'platform curated'),
  priceRecord('prc_03', 'mat_desktop_cpu', 'Pune - Hadapsar', 9000, T2, 'platform curated'),
  priceRecord('prc_04', 'mat_television', 'Pune - Hadapsar', 6500, T2, 'platform curated'),
  priceRecord('prc_05', 'mat_crt_monitor', 'Pune - Hadapsar', 3000, T1, 'platform curated'),
  priceRecord('prc_06', 'mat_refrigerator', 'Pune - Hadapsar', 5500, T2, 'platform curated'),
  priceRecord('prc_07', 'mat_home_appliance', 'Pune - Hadapsar', 4200, T2, 'platform curated'),
  priceRecord('prc_08', 'mat_cable', 'Pune - Hadapsar', 8500, T2, 'platform curated'),
  priceRecord('prc_09', 'mat_battery', 'Pune - Hadapsar', 15000, T2, 'platform curated'),
  priceRecord('prc_10', 'mat_printer', 'Pune - Hadapsar', 7000, T1, 'platform curated'),
  priceRecord('prc_11', 'mat_circuit_board', 'Pune - Hadapsar', 22000, T2, 'platform curated'),
  priceRecord('prc_12', 'mat_metal_scrap', 'Pune - Hadapsar', 2800, T2, 'platform curated'),
];

/* ------------------------------------------------------------------ *
 * Safety content  (rule SAFE-01: attached to materials, not generic)
 * ------------------------------------------------------------------ */

export const demoSafetyContent: SafetyContent[] = [
  {
    materialId: 'mat_battery' as MaterialId,
    locale: 'hi',
    headline: {
      en: 'Battery - handle with care.',
      hi: 'बैटरी - सावधानी से पकड़ें।',
      mr: 'बॅटरी - काळजीपूर्वक हाताळा.',
    },
    doNot: [
      'Do not touch both terminals at the same time.',
      'Do not crush, puncture or burn any battery.',
    ],
    doInstead: [
      'Tape the terminals with tape before moving it.',
      'Keep batteries dry and away from heat.',
      'Wash your hands after handling.',
    ],
    pictogramKey: 'battery-hazard',
    demo: true,
    createdAt: T0,
    updatedAt: T0,
  },
  {
    materialId: 'mat_cable' as MaterialId,
    locale: 'hi',
    headline: {
      en: 'Cables - do not burn.',
      hi: 'केबल - न जलाएं।',
      mr: 'केबल - जाळू नका.',
    },
    doNot: ['Do not burn cables to strip them.'],
    doInstead: ['Strip cable by hand or with a tool, and wear gloves.', 'Wash your hands after handling.'],
    pictogramKey: 'no-fire',
    demo: true,
    createdAt: T0,
    updatedAt: T0,
  },
  {
    materialId: 'mat_crt_monitor' as MaterialId,
    locale: 'hi',
    headline: {
      en: 'TV or monitor - heavy and fragile.',
      hi: 'टीवी या मॉनिटर - भारी और नाज़ुक।',
      mr: 'टीव्ही किंवा मॉनिटर - जड आणि नाजूक.',
    },
    doNot: ['Do not break the screen.', 'Do not carry it alone.'],
    doInstead: ['Keep it upright and move it with help.', 'Wash your hands after handling.'],
    pictogramKey: 'heavy-item',
    demo: true,
    createdAt: T0,
    updatedAt: T0,
  },
];

/* ------------------------------------------------------------------ *
 * AI predictions  (rule AI-01/AI-08: method and confidence always recorded)
 * ------------------------------------------------------------------ */

export const demoAiPredictions: AiPrediction[] = [
  {
    id: 'aip_01' as AiPrediction['id'],
    capability: 'MATERIAL_CLASSIFICATION',
    method: 'rule',
    confidence: 0.72,
    result: 'mobile-phone',
    createdAt: T2,
    demo: true,
  },
  {
    id: 'aip_02' as AiPrediction['id'],
    capability: 'MATERIAL_CLASSIFICATION',
    method: 'rule',
    confidence: 0.48,
    result: 'unclassified',
    createdAt: T2,
    demo: true,
  },
  {
    id: 'aip_03' as AiPrediction['id'],
    capability: 'VALUATION',
    method: 'rule',
    confidence: 0.7,
    result: 'estimated',
    createdAt: T2,
    demo: true,
  },
];

/* ------------------------------------------------------------------ *
 * Audit events  (rule AUD-05: append-only demo)
 * ------------------------------------------------------------------ */

export const demoAuditEvents: AuditEvent[] = [
  {
    id: 'aud_01' as AuditEvent['id'],
    at: T1,
    actorUserId: 'usr_admin_demo' as UserId,
    actorRole: 'ADMIN',
    action: 'RECYCLER_APPROVED',
    targetType: 'Recycler',
    targetId: 'rec_demo_01',
    after: 'authorizationStatus=VERIFIED (DEMO)',
    reason: 'Demo seed. Not a real authorization decision.',
    demo: true,
  },
  {
    id: 'aud_02' as AuditEvent['id'],
    at: T1,
    actorUserId: 'usr_admin_demo' as UserId,
    actorRole: 'ADMIN',
    action: 'RECYCLER_APPROVED',
    targetType: 'Recycler',
    targetId: 'rec_demo_02',
    after: 'authorizationStatus=VERIFIED (DEMO)',
    reason: 'Demo seed. Not a real authorization decision.',
    demo: true,
  },
];

export const demoAdminId = 'adm_demo_01' as AdminId;

/**
 * Demo OTP. Rule PAY-07 / workflow-and-security.md: no SMS provider is
 * integrated, so the code is returned in the development response and
 * logged. This is development-only and gated by RESCRAP_OTP_DELIVERY.
 */
export const DEMO_OTP_CODE = '1234';
