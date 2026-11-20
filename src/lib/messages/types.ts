/** The texts of the site's chrome that the CMS does not hold. Page content comes from the CMS. */
export interface Messages {
  skipToContent: string;
  mainNavigation: string;
  languageSwitcher: string;
  breadcrumbs: string;
  home: string;
  footerNavigation: string;
  legalNavigation: string;
  contact: string;
  rights: string;
  previewBanner: string;
  notFound: {
    title: string;
    heading: string;
    lead: string;
    home: string;
  };
  gone: {
    title: string;
    heading: string;
    lead: string;
  };
  previewInvalid: {
    title: string;
    lead: string;
  };
  menuToggle: string;
  quickActions: string;
  call: string;
  navigate: string;
  top: string;
  poweredBy: string;
  hours: string;
  openToday: string;
  /** The line under the hero's headline: what is on right now. {time} is a clock time, {title} an event. */
  now: {
    openUntil: string;
    open: string;
    openingSoon: string;
    closedOpensAt: string;
    closed: string;
    closedToday: string;
    tonight: string;
    today: string;
    next: string;
    nextDay: string;
    todayAllDay: string;
  };
  blocks: {
    closed: string;
    hoursExceptions: string;
    opensCloses: string;
    email: string;
    phone: string;
    address: string;
    companyId: string;
    vatId: string;
    hours: string;
    social: string;
    openNow: string;
    closedNow: string;
    todayHours: string;
    todayClosed: string;
    viewLocation: string;
    primaryLocation: string;
    navigate: string;
    video: string;
    galleryItems: string;
    viewAlbum: string;
    formUnknown: string;
  };
  menu: {
    search: string;
    searchPlaceholder: string;
    noResults: string;
    allergenNames: Record<
      | "gluten"
      | "crustaceans"
      | "eggs"
      | "fish"
      | "peanuts"
      | "soy"
      | "milk"
      | "nuts"
      | "celery"
      | "mustard"
      | "sesame"
      | "sulphites"
      | "lupin"
      | "molluscs",
      string
    >;
    allergensTitle: string;
    allergensLabel: string;
    dietary: Record<"vegan" | "vegetarian" | "gluten_free" | "lactose_free" | "halal", string>;
    spicy: string;
    recommended: string;
    unavailable: string;
    available: string;
    weekdays: string;
    weekends: string;
    everyDay: string;
    viewMenu: string;
    itemsOne: string;
    itemsFew: string;
    itemsMany: string;
  };
  events: {
    allDay: string;
    free: string;
    priceFrom: string;
    priceOnRequest: string;
    statuses: Record<"CANCELLED" | "POSTPONED" | "RESCHEDULED" | "ENDED", string>;
    upNext: string;
    after: string;
    when: string;
    where: string;
    entry: string;
    performers: string;
    freeEntry: string;
    reserve: string;
    addToCalendar: string;
    viewEvent: string;
    featured: string;
    registrationOpen: string;
    next: string;
  };
  form: {
    unavailable: string;
    required: string;
    send: string;
    sending: string;
    sent: string;
    invalid: string;
    problems: Record<"required" | "invalid" | "tooShort" | "tooLong" | "other", string>;
    failed: Record<
      "captcha" | "token" | "rate_limited" | "not_found" | "js_required" | "unavailable",
      string
    >;
    back: string;
    thanksTitle: string;
    thanksHeading: string;
    thanksLead: string;
    errorTitle: string;
    errorHeading: string;
    previewNotSent: string;
    choose: string;
  };
  /** Ordering from the table (`/s/<token>`): the guest's phone page. */
  ordering: {
    pageTitle: string;
    tableTitle: string;
    tableMeta: string;
    seatsOne: string;
    seatsFew: string;
    seatsMany: string;
    categories: string;
    callWaiter: string;
    waiterCalled: string;
    waiterAlreadyCalled: string;
    add: string;
    fewer: string;
    more: string;
    quantity: string;
    itemsOne: string;
    itemsFew: string;
    itemsMany: string;
    viewOrder: string;
    cartTitle: string;
    close: string;
    cartEmpty: string;
    noteLabel: string;
    notePlaceholder: string;
    noteLimit: string;
    total: string;
    place: string;
    placing: string;
    fine: string;
    closedNotice: string;
    closedOrdering: string;
    unavailableItem: string;
    statusTitle: Record<"NOVA" | "U_PRIPREMI" | "POSLUZENA" | "NAPLACENA" | "OTKAZANA", string>;
    statusText: Record<"NOVA" | "U_PRIPREMI" | "POSLUZENA" | "NAPLACENA" | "OTKAZANA", string>;
    steps: Record<"NOVA" | "U_PRIPREMI" | "POSLUZENA", string>;
    stepDone: string;
    stepNow: string;
    cancelReason: string;
    orderMore: string;
    orderNumber: string;
    lostConnection: string;
    toastRegion: string;
    invalid: { title: string; heading: string; lead: string };
    disabled: { title: string; heading: string; lead: string };
    busy: { title: string; heading: string; lead: string };
    errors: {
      closed: string;
      needsWaiter: string;
      itemUnavailable: string;
      priceChanged: string;
      rateLimited: string;
      rateLimitedNoTime: string;
      validation: string;
      tableNotFound: string;
      callsDisabled: string;
      orderGone: string;
      network: string;
      other: string;
    };
  };
}
