export const SUPPORTED_LOCALES = ["en", "de", "es", "fr", "it"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

export interface Dictionary {
  common: {
    language: string;
    languageNames: Record<Locale, string>;
    autoDetected: string;
    save: string;
    delete: string;
    cancel: string;
    loading: string;
  };
  nav: {
    dashboard: string;
    campaigns: string;
    customize: string;
    plans: string;
  };
  postPurchase: {
    specialOffer: string;
  };
  dashboard: {
    title: string;
    subtitle: string;
    planSuffix: string;
    freePlanBanner: {
      title: string;
      subtitle: string;
      cta: string;
    };
    basicPlanBanner: {
      text: string;
      cta: string;
    };
    checklist: {
      title: string;
      stepsCompleted: (completed: number, total: number) => string;
      description: string;
    };
    embedStep: {
      title: string;
      description: string;
      instructionPrefix: string;
      instructionPath: string;
      instructionSuffix: string;
    };
    campaignStep: {
      title: string;
      description: string;
      cta: string;
    };
    verifyStep: {
      title: string;
      description: string;
      cta: string;
    };
    quickStart: {
      title: string;
      description: string;
      upgradeCta: string;
      createCta: string;
    };
  };
  campaignsIndex: {
    title: string;
    createCampaign: string;
    upgradePlanAction: string;
    emptyState: {
      heading: string;
      cta: string;
      body: string;
    };
    limitBanner: {
      freeTitle: string;
      genericTitle: string;
      contactSupport: string;
      upgradePlan: string;
      freeBody: string;
      basicBody: string;
      advancedBody: string;
    };
    table: {
      name: string;
      type: string;
      status: string;
      discount: string;
      triggers: string;
      offers: string;
      actions: string;
    };
    deleteCampaignAction: string;
    deleteModal: {
      title: string;
      confirm: string;
      cancel: string;
      body: (name: string) => string;
    };
    planUsage: {
      currentPlan: string;
      usage: string;
      unlimited: string;
    };
    discount: {
      percentOff: (value: number) => string;
      fixedOff: (value: number) => string;
      tiered: string;
      none: string;
    };
    statusLabels: Record<string, string>;
  };
  campaignDetail: {
    campaignNameLabel: string;
    savedOverlay: {
      title: string;
      subtitle: string;
    };
    trigger: {
      sectionTitle: string;
      description: string;
      typeLabel: string;
      allProducts: string;
      specificProducts: string;
      specificCollections: string;
      browseProducts: string;
      browseCollections: string;
    };
    offers: {
      sectionTitle: string;
      descriptionAuto: string;
      descriptionManual: string;
    };
    settings: {
      sectionTitle: string;
      showQuantityPicker: string;
      allowDeselectTrigger: string;
      doNotPreselect: string;
      randomizeOffers: string;
      limitOffersShown: string;
      maxOffers: string;
      autoMatchVariants: string;
      autoMatchVariantsHelp: string;
    };
    cartLayout: {
      sectionTitle: string;
      description: string;
      horizontal: string;
      vertical: string;
    };
    discounts: {
      sectionTitle: string;
      typeLabel: string;
      noDiscount: string;
      percentageOff: string;
      fixedAmountOff: string;
      tieredLabel: string;
      amountOff: string;
    };
    tiers: {
      helperText: string;
      minItems: string;
      typeLabel: string;
      percentage: string;
      fixedAmount: string;
      percentOff: string;
      amount: string;
      addTier: string;
      removeTier: string;
    };
    schedule: {
      sectionTitle: string;
      description: string;
      startDate: string;
      startTime: string;
      setEndDate: string;
      endDate: string;
      endTime: string;
      timezone: string;
    };
    otherSettings: {
      sectionTitle: string;
      campaignTitle: string;
      campaignTitlePlaceholder: string;
      campaignTitleHelp: string;
      campaignSubtitle: string;
      campaignSubtitlePlaceholder: string;
      campaignSubtitleHelp: string;
      priority: string;
      priorityHelp: string;
    };
    status: {
      label: string;
      active: string;
      draft: string;
      paused: string;
    };
    appearance: {
      sectionTitle: string;
      description: string;
      upgradeCta: string;
      customizeCta: string;
    };
    resourceList: {
      remove: string;
    };
  };
  campaignNew: {
    sections: {
      productPage: string;
      popups: string;
      addons: string;
      shopCollection: string;
      cart: string;
      postPurchase: string;
    };
    types: Record<string, { title: string; description: string }>;
    card: {
      preview: string;
      create: string;
      newBadge: string;
      shopifyPaymentsOnly: string;
    };
    mockup: {
      addBundleToCart: string;
      payNow: string;
      decline: string;
      checkoutItems: (count: number) => string;
    };
  };
  plans: {
    title: string;
    hero: {
      badge: string;
      title: string;
      subtitle: string;
    };
    perMonth: string;
    trialSuffix: string;
    mostPopular: string;
    whatsIncluded: string;
    activePlanCta: string;
    startTrialCta: string;
    manageCta: string;
    noCreditCard: string;
    trustRow: string[];
    free: {
      name: string;
      tagline: string;
      description: string;
      features: string[];
    };
    basic: {
      name: string;
      tagline: string;
      description: string;
      trialText: string;
      features: string[];
    };
    advanced: {
      name: string;
      tagline: string;
      description: string;
      trialText: string;
      features: string[];
    };
  };
  billing: {
    errorBoundary: string;
    title: string;
    subtitle: string;
    devStoreBanner: {
      prefix: string;
      bold: string;
      suffix: string;
    };
    currentPlanBanner: {
      prefix: string;
      suffix: string;
    };
    cancelConfirm: string;
    cancelPlanCta: string;
    upgradeAdvancedCta: string;
    switchBasicCta: string;
    downgradeCta: string;
    testChargeBadge: string;
    currentPlanBadge: string;
    perMonth: string;
    trialText: (days: number) => string;
    featuresLabel: string;
    pleaseWait: string;
    footerNote: string;
    basicFeatures: string[];
    advancedFeatures: string[];
  };
  customize: {
    pageTitle: string;
    commonSettings: {
      title: string;
      description: string;
      editCta: string;
    };
    widgetsHeading: string;
    filterLabel: string;
    filterOptions: {
      all: string;
      productPage: string;
      popups: string;
      cart: string;
      postPurchase: string;
    };
    editWidgetCta: string;
    widgetDescriptions: Record<string, string>;
  };
  widgetConfig: {
    fallbackName: string;
    position: {
      sectionTitle: string;
      missingBlockWarning: (shortName: string) => string;
      addBlockCta: (shortName: string) => string;
      ignoreNote: string;
      useCssSelectors: string;
      useCssSelectorsHelp: string;
    };
    appearance: {
      sectionTitle: string;
      description: string;
      resetCta: string;
      customizeCta: string;
    };
    otherSettings: {
      sectionTitle: string;
      actionAfterAdd: string;
      openCartDrawer: string;
      navigateCartPage: string;
      stayOnPage: string;
      imageResolution: string;
      standardRes: string;
      highRes: string;
      hideWidget: string;
      hideWidgetHelp: string;
      showAllValidCampaigns: string;
      showAllValidCampaignsHelp: string;
    };
  };
  widgetSettings: {
    pageTitle: string;
    upgradeModal: {
      title: string;
      viewPlansCta: string;
      maybeLater: string;
      heading: string;
      description: string;
      features: string[];
    };
    savedBanner: string;
    freePlanBanner: {
      title: string;
      cta: string;
    };
    text: {
      sectionTitle: string;
      defaultTitle: string;
      defaultSubtitle: string;
      defaultSubtitleHelp: string;
      ctaLabel: string;
    };
    appearance: {
      sectionTitle: string;
      accentColor: string;
      textColor: string;
      borderRadius: string;
      fontFamily: string;
      fontFamilyHelp: string;
    };
    preview: {
      sectionTitle: string;
      productA: string;
      productB: string;
      upgradeToSaveCta: string;
    };
  };
  additional: {
    pageTitle: string;
    intro1Prefix: string;
    intro1LinkText: string;
    intro2Prefix: string;
    intro2Middle: string;
    intro2Suffix: string;
    resourcesHeading: string;
    navBestPractices: string;
  };
}
