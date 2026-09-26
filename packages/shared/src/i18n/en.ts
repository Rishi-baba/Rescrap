/**
 * ReScrap string catalogue - English.
 *
 * Rule PRD 21 / FD-15: no hardcoded strings in components. Authored in
 * en/hi/mr together from the start.
 *
 * Rule master prompt 42: collector-facing language must be simple.
 * The `collector` namespace contains no technical vocabulary. Compare
 * frontend-discussion.md 3.4 for the enforced terminology mapping.
 */

export const en = {
  common: {
    appName: 'ReScrap',
    continue: 'Continue',
    back: 'Back',
    cancel: 'Cancel',
    save: 'Save',
    retry: 'Try again',
    close: 'Close',
    loading: 'Loading...',
    demoBadge: 'Demo',
    demoBanner: 'This is demo data. No real scrap, recycler or payment is involved.',
    yes: 'Yes',
    no: 'No',
  },

  collector: {
    addScrap: 'Add Scrap',
    takePhoto: 'Take Photo',
    retakePhoto: 'Take Again',
    usePhoto: 'Use This Photo',
    chooseMaterial: 'Choose Material',
    confirmMaterial: 'Confirm',
    changeMaterial: 'Change',
    howMuch: 'How much?',
    condition: 'Condition',
    conditionGood: 'Good',
    conditionFair: 'Usable',
    conditionPoor: 'Broken',
    conditionMixed: 'Mixed',
    source: 'Where did you get it?',
    sourceHousehold: 'Home',
    sourceItOffice: 'Office',
    sourceCommercial: 'Shop / Office',
    sourceMixed: 'Mixed',
    checkPrice: 'Check Price',
    approximateValue: 'Approximate value',
    estimatedValueNote: 'This is an estimate. The recycler will offer their own price.',
    submitScrap: 'Send Scrap',
    myScrap: 'My Scrap',
    priceBoard: 'Price Board',
    earnings: 'Earnings',
    home: 'Home',
    profile: 'Profile',
    findRecycler: 'Find Recycler',
    newOffer: 'New Offer',
    noOffersYet: 'No offers yet.',
    acceptOffer: 'Accept Offer',
    declineOffer: 'Decline',
    offerAccepted: 'Offer Accepted',
    confirmHandover: 'Confirm Handover',
    reportProblem: 'Report a Problem',
    paymentReceived: 'Payment Received',
    paymentPending: 'Payment pending',
    scrapId: 'Scrap ID',
    record: 'Record',
    totalEarned: 'Total Earned',
    stillComing: 'Still coming',
    noScrapYet: 'No scrap yet. Tap Add Scrap.',
    noEarningsYet: 'No earnings yet.',
    noPricesYet: 'No prices available right now.',
  },

  /** Rule master prompt 41 / FD-10: exact offline wording. */
  sync: {
    offline: "No internet. Your scrap is saved on this phone.",
    queued: 'Saved on this phone. Will send when internet comes.',
    syncing: 'Sending...',
    synced: 'Sent.',
    failed: "Couldn't send. Tap to try again.",
  },

  states: {
    findingRecyclers: 'Finding recyclers...',
    noMatchingRecyclers: 'No matching recyclers yet.',
    couldNotLoadPrices: "Couldn't load prices.",
    couldNotLoadRecyclers: "Couldn't load recyclers.",
    couldNotIdentify: "Couldn't identify. Choose manually.",
    saved: 'Scrap added.',
    couldNotAdd: "Couldn't add scrap. Saved on this phone.",
  },

  reasons: {
    VERIFIED: 'Verified recycler',
    ACCEPTS_THIS_MATERIAL: 'Accepts this material',
    NEARBY: 'Nearby',
    PICKUP_AVAILABLE: 'Pickup available',
    OFFER_PRICE: 'Pays above the usual rate',
    RECENT_TRANSACTION: 'Worked with ReScrap before',
  },

  safety: {
    title: 'Stay Safe',
    doNot: 'Do not',
    doInstead: 'Do this instead',
    washHands: 'Wash your hands after handling.',
  },

  recycler: {
    dashboard: 'Dashboard',
    availableLots: 'Available Lots',
    offers: 'Offers',
    activeDeals: 'Active Deals',
    history: 'History',
    businessProfile: 'Business Profile',
    makeOffer: 'Make Offer',
    yourOffer: 'Your Offer',
    perKg: 'per kg',
    newLots: 'New lots for you',
    pendingOffers: 'Offers awaiting your reply',
    activeDealsMetric: 'Deals in progress',
    upcomingPickups: 'Upcoming pickups',
    completed: 'Completed',
    acceptanceRate: 'Your acceptance rate',
    decisionNewLots: 'Should I bid on these now?',
    decisionPendingOffers: 'What needs my reply?',
    decisionActiveDeals: 'What needs scheduling?',
    decisionPickups: 'What needs logistics today?',
    decisionCompleted: 'Is this channel working for me?',
    decisionAcceptance: 'Should I change my pricing?',
    noLotsMatch: 'No lots match these filters.',
    noActiveDeals: 'No active deals.',
    verified: 'Demo verified recycler',
  },

  admin: {
    dashboard: 'Dashboard',
    verification: 'Recycler Verification',
    recyclers: 'Recyclers',
    collectors: 'Collectors',
    catalog: 'Material Catalogue',
    prices: 'Price Management',
    transactions: 'Transactions',
    traceability: 'Traceability',
    disputes: 'Disputes',
    exceptions: 'Exceptions',
    analytics: 'Analytics',
    dataQuality: 'Data Quality',
    safetyContent: 'Safety Content',
    aiMonitoring: 'AI Monitoring',
    auditLog: 'Audit Log',
    queueClear: 'Queue is clear.',
    noOpenDisputes: 'No open disputes.',
    noExceptions: 'No exceptions.',
    approve: 'Approve',
    reject: 'Reject',
    reasonRequired: 'A reason is required.',
    demoAuthorizationNotice:
      'Demo only. No real recycler authorization exists and none is claimed.',
    demoPriceNotice: 'Demo reference prices. Not real market data.',
  },
} as const;

/**
 * Structural shape of a catalogue. Values are widened to `string` so that a
 * translated catalogue is assignable to the same type as the English one -
 * a missing key becomes a type error rather than a runtime undefined.
 */
export type StringCatalogue = {
  readonly [N in keyof typeof en]: { readonly [K in keyof (typeof en)[N]]: string };
};
