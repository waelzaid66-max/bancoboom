import type { SiteLocale } from "./hub-config";

export type WorkspaceUiCopy = {
  title: string;
  navOverview: string;
  navListings: string;
  navNewListing: string;
  navLeads: string;
  navSaved: string;
  navMarket: string;
  signInRequired: string;
  signInCta: string;
  authDisabled: string;
  metricsActive: string;
  metricsTotal: string;
  metricsMemberSince: string;
  metricsVerified: string;
  metricsResponseRate: string;
  listingsTitle: string;
  listingsEmpty: string;
  listingsNew: string;
  listingsEdit: string;
  listingsDelete: string;
  listingsBump: string;
  listingsStatus: string;
  listingsViews: string;
  listingsLeads: string;
  createTitle: string;
  createSubmit: string;
  createCategory: string;
  createTitleLabel: string;
  createDescription: string;
  createLocation: string;
  createPrice: string;
  createPhotos: string;
  createPhotosHint: string;
  createSuccess: string;
  editTitle: string;
  editSubmit: string;
  leadsTitle: string;
  leadsEmpty: string;
  leadsEmptyHint: string;
  leadsBuyer: string;
  leadsAction: string;
  leadsDate: string;
  uploadError: string;
  mediaRemove: string;
  photosUploading: string;
  confirmDelete: string;
  loading: string;
  errorGeneric: string;
  backToWorkspace: string;
  b2bTitle: string;
  b2bBody: string;
  b2bMarketCta: string;
  b2bMarketLinks: string;
  b2bMarketNote: string;
  b2bMarketDisabled: string;
  marketCopyTitle: string;
  marketCopyBody: string;
  marketTabOverview: string;
  marketTabRfqs: string;
  marketTabSupply: string;
  marketStatsActive: string;
  marketStatsLeadsToday: string;
  marketStatsViews: string;
  marketStatsConversion: string;
  marketTrendsTitle: string;
  marketTrendsEmpty: string;
  marketRfqsTitle: string;
  marketRfqsEmpty: string;
  marketRfqsOffers: string;
  marketRfqsDeadline: string;
  marketRfqCreateTitle: string;
  marketRfqCreateHint: string;
  marketRfqCreateSubmit: string;
  marketRfqCreateSuccess: string;
  marketRfqTitleRequired: string;
  marketRfqQuantity: string;
  marketRfqUnit: string;
  marketRfqTargetPrice: string;
  marketRfqDestination: string;
  marketRfqIndustry: string;
  marketRfqIndustrialType: string;
  marketSupplyTitle: string;
  marketSupplyEmpty: string;
  marketSupplyResponses: string;
  marketClassicTitle: string;
  marketClassicNote: string;
  marketNavWebCopy: string;
  overviewQuickLinks: string;
  overviewSubtitle: string;
  overviewNewHint: string;
  overviewListingsHint: string;
  overviewLeadsHint: string;
  overviewAnalyticsHint: string;
  overviewB2bHint: string;
  overviewSavedHint: string;
  overviewMessagesHint: string;
  overviewBookingsHint: string;
  overviewWalletHint: string;
  navMessages: string;
  navWallet: string;
  navBookings: string;
  messagesTitle: string;
  messagesEmpty: string;
  messagesEmptyHint: string;
  messagesErrorTitle: string;
  messagesNoMessages: string;
  messagesUnread: string;
  messagesDeleteTitle: string;
  messagesDeleteBody: string;
  messagesDelete: string;
  messagesCancel: string;
  messagesBack: string;
  messagesPlaceholder: string;
  messagesSend: string;
  messagesSending: string;
  messagesSendError: string;
  messagesThreadEmpty: string;
  walletTitle: string;
  walletAvailable: string;
  walletBalanceHint: string;
  walletErrorTitle: string;
  walletErrorBody: string;
  walletAddFunds: string;
  walletPromoTitle: string;
  walletPromoExpires: string;
  walletPromoNone: string;
  walletPromoMonthly: string;
  walletTransactions: string;
  walletEmptyTitle: string;
  walletEmptyHint: string;
  walletLoadMore: string;
  walletDoneTitle: string;
  walletDoneBody: string;
  walletAwaitingTitle: string;
  walletAwaitingBody: string;
  walletDone: string;
  walletAmountLabel: string;
  walletMethodLabel: string;
  walletTopupFailed: string;
  walletPay: string;
  walletEnterAmount: string;
  walletTxWalletTopup: string;
  walletTxBoostCharge: string;
  walletTxSubscriptionCharge: string;
  walletTxLeadCharge: string;
  walletTxRefund: string;
  walletTxAdjustment: string;
  walletMethodVodafone: string;
  walletMethodFawry: string;
  walletMethodInstapay: string;
  walletMethodBank: string;
  bookingsTitle: string;
  bookingsTabTrips: string;
  bookingsTabRequests: string;
  bookingsEmptyTrips: string;
  bookingsEmptyRequests: string;
  bookingsErrorBody: string;
  bookingsNights: string;
  bookingsGuests: string;
  bookingsGuest: string;
  bookingsHost: string;
  bookingsViewListing: string;
  bookingsConfirm: string;
  bookingsReject: string;
  bookingsCancel: string;
  bookingsStatusRequested: string;
  bookingsStatusConfirmed: string;
  bookingsStatusRejected: string;
  bookingsStatusCancelled: string;
  retry: string;
  navAnalytics: string;
  analyticsTitle: string;
  analyticsSubtitle: string;
  analyticsTotalViews: string;
  analyticsTotalLeads: string;
  analyticsConversion: string;
  analyticsListing: string;
  analyticsViews: string;
  analyticsLeads: string;
  analyticsConvRate: string;
  analyticsEmpty: string;
  categoryCar: string;
  categoryRealEstate: string;
  categoryIndustrial: string;
  selectEmpty: string;
  specMake: string;
  specModel: string;
  specYear: string;
  specMileage: string;
  specPropertyType: string;
  specAreaSqm: string;
  specRooms: string;
  specIndustrialType: string;
  specEquipmentType: string;
  specCondition: string;
};

const COPY: Record<SiteLocale, WorkspaceUiCopy> = {
  ar: {
    title: "مساحة عمل البائع",
    navOverview: "نظرة عامة",
    navListings: "إعلاناتي",
    navNewListing: "إعلان جديد",
    navLeads: "طلبات التواصل",
    navSaved: "المحفوظات",
    navMarket: "بانكو ماركت",
    signInRequired: "سجّل الدخول لإدارة إعلاناتك ومتابعة أدائك.",
    signInCta: "تسجيل الدخول",
    authDisabled: "تسجيل الدخول غير مفعّل على هذه البيئة.",
    metricsActive: "إعلانات نشطة",
    metricsTotal: "إجمالي الإعلانات",
    metricsMemberSince: "عضو منذ",
    metricsVerified: "حساب موثّق",
    metricsResponseRate: "معدل الاستجابة",
    listingsTitle: "إعلاناتي",
    listingsEmpty: "لا توجد إعلانات بعد. أنشئ أول إعلان من المتصفح.",
    listingsNew: "إعلان جديد",
    listingsEdit: "تعديل",
    listingsDelete: "حذف",
    listingsBump: "تجديد",
    listingsStatus: "الحالة",
    listingsViews: "مشاهدات",
    listingsLeads: "طلبات",
    createTitle: "إنشاء إعلان",
    createSubmit: "نشر الإعلان",
    createCategory: "الفئة",
    createTitleLabel: "العنوان",
    createDescription: "الوصف",
    createLocation: "الموقع",
    createPrice: "السعر (جنيه)",
    createPhotos: "الصور",
    createPhotosHint: "ارفع صورة واحدة على الأقل (JPG أو PNG).",
    createSuccess: "تم نشر الإعلان بنجاح.",
    editTitle: "تعديل الإعلان",
    editSubmit: "حفظ التغييرات",
    leadsTitle: "طلبات التواصل",
    leadsEmpty: "لا توجد طلبات تواصل بعد.",
    leadsEmptyHint: "عندما يتواصل مشترٍ مع إعلاناتك ستظهر هنا. انشر إعلاناً أو فعّل التواصل على الإعلان.",
    leadsBuyer: "المشتري",
    leadsAction: "الإجراء",
    leadsDate: "التاريخ",
    uploadError: "تعذّر رفع الصورة. أزلها وحاول مرة أخرى.",
    mediaRemove: "إزالة",
    photosUploading: "جاري رفع الصور… انتظر قبل الإرسال.",
    confirmDelete: "هل تريد حذف هذا الإعلان؟",
    loading: "جاري التحميل…",
    errorGeneric: "حدث خطأ. حاول مرة أخرى.",
    backToWorkspace: "العودة لمساحة العمل",
    b2bTitle: "خدمات B2B",
    b2bBody: "RFQ والتوريد والاستثمارات متاحة عبر بانكو ماركت للتجار — منفصلة عن موقع المستهلك.",
    b2bMarketCta: "فتح بانكو ماركت",
    b2bMarketLinks: "روابط بانكو ماركت",
    b2bMarketNote: "تفتح في نافذة جديدة — نفس منصة Dealer OS للتجار.",
    b2bMarketDisabled: "بانكو ماركت غير مُعرّف على هذه البيئة (NEXT_PUBLIC_MARKET_URL).",
    marketCopyTitle: "بانكو ماركت (نسخة الويب)",
    marketCopyBody:
      "تجربة تاجر داخل الموقع عبر نفس الـ API — دون تعديل Dealer OS الأصلي. يمكنك العودة للمنصة الكلاسيكية في أي وقت.",
    marketTabOverview: "نظرة عامة",
    marketTabRfqs: "طلبات RFQ",
    marketTabSupply: "توريد عالمي",
    marketStatsActive: "إعلانات نشطة",
    marketStatsLeadsToday: "تواصل اليوم",
    marketStatsViews: "مشاهدات",
    marketStatsConversion: "معدل التحويل",
    marketTrendsTitle: "مؤشرات السوق",
    marketTrendsEmpty: "لا تتوفر مؤشرات كافية بعد.",
    marketRfqsTitle: "طلبات عروض الأسعار المفتوحة",
    marketRfqsEmpty: "لا توجد طلبات RFQ مفتوحة حالياً.",
    marketRfqsOffers: "عروض",
    marketRfqsDeadline: "آخر موعد",
    marketRfqCreateTitle: "إنشاء طلب RFQ",
    marketRfqCreateHint: "يُنشأ عبر نفس API الماركت — دون لمس Dealer OS.",
    marketRfqCreateSubmit: "نشر الطلب",
    marketRfqCreateSuccess: "تم إنشاء طلب RFQ. ستظهر القائمة محدّثة بعد لحظات.",
    marketRfqTitleRequired: "العنوان مطلوب (٣ أحرف على الأقل).",
    marketRfqQuantity: "الكمية",
    marketRfqUnit: "الوحدة",
    marketRfqTargetPrice: "الحد الأقصى للسعر",
    marketRfqDestination: "بلد الوجهة",
    marketRfqIndustry: "الصناعة",
    marketRfqIndustrialType: "نوع صناعي",
    marketSupplyTitle: "طلبات توريد / استيراد",
    marketSupplyEmpty: "لا توجد طلبات توريد مفتوحة حالياً.",
    marketSupplyResponses: "ردود",
    marketClassicTitle: "المنصة الكلاسيكية (Dealer OS)",
    marketClassicNote: "تبقى متاحة عبر رابط منفصل — لا نلمسها من مسار الويب.",
    marketNavWebCopy: "ماركت الويب",
    overviewQuickLinks: "اختصارات سريعة",
    overviewSubtitle: "انتقل مباشرة إلى أهم مهام البائع من المتصفح.",
    overviewNewHint: "نشر إعلان جديد",
    overviewListingsHint: "إدارة وتعديل إعلاناتك",
    overviewLeadsHint: "متابعة طلبات التواصل",
    overviewAnalyticsHint: "مشاهدات وتحويلات",
    overviewB2bHint: "RFQ والتوريد للتجار",
    overviewSavedHint: "إعلاناتك المحفوظة",
    overviewMessagesHint: "محادثات مع البائعين",
    overviewBookingsHint: "طلبات الإقامة كضيف أو مضيف",
    overviewWalletHint: "الرصيد وسجل المعاملات",
    navMessages: "الرسائل",
    navWallet: "المحفظة",
    navBookings: "الحجوزات",
    messagesTitle: "الرسائل",
    messagesEmpty: "لا محادثات بعد",
    messagesEmptyHint: "ابدأ محادثة من أي إعلان للتواصل مع البائع.",
    messagesErrorTitle: "تعذّر تحميل الرسائل",
    messagesNoMessages: "لا رسائل بعد",
    messagesUnread: "{count} غير مقروء",
    messagesDeleteTitle: "حذف المحادثة؟",
    messagesDeleteBody: "ستُزال من صندوق الوارد. الطرف الآخر ما زال يراها.",
    messagesDelete: "حذف",
    messagesCancel: "إلغاء",
    messagesBack: "العودة للرسائل",
    messagesPlaceholder: "اكتب رسالة…",
    messagesSend: "إرسال",
    messagesSending: "جاري الإرسال…",
    messagesSendError: "تعذّر إرسال الرسالة.",
    messagesThreadEmpty: "لا رسائل بعد — قل مرحبًا.",
    walletTitle: "المحفظة",
    walletAvailable: "الرصيد المتاح",
    walletBalanceHint: "يُستخدم للترويج والإبراز المميز",
    walletErrorTitle: "تعذّر تحميل المحفظة",
    walletErrorBody: "تحقق من الاتصال وحاول مرة أخرى.",
    walletAddFunds: "إضافة رصيد",
    walletPromoTitle: "رصيد إعلانات مجاني",
    walletPromoExpires: "ينتهي {date}",
    walletPromoNone: "لا يوجد رصيد إعلانات مجاني حاليًا.",
    walletPromoMonthly: "{amount} ج.م تُمنح شهريًا",
    walletTransactions: "المعاملات",
    walletEmptyTitle: "لا معاملات بعد",
    walletEmptyHint: "أضف رصيدًا لبدء ترويج إعلاناتك.",
    walletLoadMore: "تحميل المزيد",
    walletDoneTitle: "تمت إضافة الرصيد",
    walletDoneBody: "رصيدك الجديد: {balance}",
    walletAwaitingTitle: "جاري معالجة الدفع",
    walletAwaitingBody: "نؤكد الدفع مع مزود الخدمة. سيُحدَّث رصيدك تلقائيًا عند الاكتمال.",
    walletDone: "تم",
    walletAmountLabel: "المبلغ (ج.م)",
    walletMethodLabel: "طريقة الدفع",
    walletTopupFailed: "فشل الشحن. حاول مرة أخرى.",
    walletPay: "ادفع {amount}",
    walletEnterAmount: "أدخل مبلغًا",
    walletTxWalletTopup: "شحن المحفظة",
    walletTxBoostCharge: "ترويج إعلان",
    walletTxSubscriptionCharge: "اشتراك",
    walletTxLeadCharge: "رسوم طلب",
    walletTxRefund: "استرداد",
    walletTxAdjustment: "تعديل",
    walletMethodVodafone: "فودافون كاش",
    walletMethodFawry: "فوري",
    walletMethodInstapay: "إنستاباي",
    walletMethodBank: "تحويل بنكي",
    bookingsTitle: "الحجوزات",
    bookingsTabTrips: "رحلاتي",
    bookingsTabRequests: "الطلبات",
    bookingsEmptyTrips: "لا حجوزات بعد. ابحث عن إيجار يومي مفروش واحجز أول إقامة.",
    bookingsEmptyRequests: "لا توجد طلبات حجز على إعلاناتك بعد.",
    bookingsErrorBody: "تعذّر تحميل حجوزاتك.",
    bookingsNights: "ليلة",
    bookingsGuests: "ضيف",
    bookingsGuest: "الضيف",
    bookingsHost: "المضيف",
    bookingsViewListing: "عرض الإعلان",
    bookingsConfirm: "تأكيد",
    bookingsReject: "رفض",
    bookingsCancel: "إلغاء",
    bookingsStatusRequested: "قيد الانتظار",
    bookingsStatusConfirmed: "مؤكَّد",
    bookingsStatusRejected: "مرفوض",
    bookingsStatusCancelled: "ملغى",
    retry: "إعادة المحاولة",
    navAnalytics: "التحليلات",
    analyticsTitle: "تحليلات الأداء",
    analyticsSubtitle: "مؤشرات المشاهدات والطلبات لكل إعلان.",
    analyticsTotalViews: "إجمالي المشاهدات",
    analyticsTotalLeads: "طلبات التواصل",
    analyticsConversion: "معدل التحويل",
    analyticsListing: "الإعلان",
    analyticsViews: "مشاهدات",
    analyticsLeads: "طلبات",
    analyticsConvRate: "تحويل",
    analyticsEmpty: "لا توجد بيانات بعد.",
    categoryCar: "سيارات",
    categoryRealEstate: "عقارات",
    categoryIndustrial: "صناعي",
    selectEmpty: "—",
    specMake: "الماركة",
    specModel: "الموديل",
    specYear: "سنة الصنع",
    specMileage: "الكيلومترات",
    specPropertyType: "نوع العقار",
    specAreaSqm: "المساحة (م²)",
    specRooms: "الغرف",
    specIndustrialType: "النوع الصناعي",
    specEquipmentType: "نوع المعدة",
    specCondition: "الحالة",
  },
  en: {
    title: "Seller workspace",
    navOverview: "Overview",
    navListings: "My listings",
    navNewListing: "New listing",
    navLeads: "Leads",
    navSaved: "Saved",
    navMarket: "BANCO Market",
    signInRequired: "Sign in to manage listings and track performance.",
    signInCta: "Sign in",
    authDisabled: "Sign-in is not configured on this environment.",
    metricsActive: "Active listings",
    metricsTotal: "Total listings",
    metricsMemberSince: "Member since",
    metricsVerified: "Verified account",
    metricsResponseRate: "Response rate",
    listingsTitle: "My listings",
    listingsEmpty: "No listings yet. Create your first listing from the browser.",
    listingsNew: "New listing",
    listingsEdit: "Edit",
    listingsDelete: "Delete",
    listingsBump: "Bump",
    listingsStatus: "Status",
    listingsViews: "Views",
    listingsLeads: "Leads",
    createTitle: "Create listing",
    createSubmit: "Publish listing",
    createCategory: "Category",
    createTitleLabel: "Title",
    createDescription: "Description",
    createLocation: "Location",
    createPrice: "Price (EGP)",
    createPhotos: "Photos",
    createPhotosHint: "Upload at least one image (JPG or PNG).",
    createSuccess: "Listing published successfully.",
    editTitle: "Edit listing",
    editSubmit: "Save changes",
    leadsTitle: "Contact leads",
    leadsEmpty: "No contact leads yet.",
    leadsEmptyHint: "When a buyer contacts your listings they appear here. Publish a listing or enable contact on it.",
    leadsBuyer: "Buyer",
    leadsAction: "Action",
    leadsDate: "Date",
    uploadError: "Could not upload image. Remove it and try again.",
    mediaRemove: "Remove",
    photosUploading: "Uploading photos… wait before submitting.",
    confirmDelete: "Delete this listing?",
    loading: "Loading…",
    errorGeneric: "Something went wrong. Try again.",
    backToWorkspace: "Back to workspace",
    b2bTitle: "B2B services",
    b2bBody: "RFQ, global supply, and investments live in BANCO Market for dealers — separate from the consumer site.",
    b2bMarketCta: "Open BANCO Market",
    b2bMarketLinks: "BANCO Market links",
    b2bMarketNote: "Opens in a new tab — same Dealer OS platform for merchants.",
    b2bMarketDisabled: "BANCO Market is not configured on this environment (NEXT_PUBLIC_MARKET_URL).",
    marketCopyTitle: "BANCO Market (web copy)",
    marketCopyBody:
      "Dealer experience inside the website via the shared API — dealer-os stays untouched. Classic Market remains available as a fallback.",
    marketTabOverview: "Overview",
    marketTabRfqs: "RFQs",
    marketTabSupply: "Global supply",
    marketStatsActive: "Active listings",
    marketStatsLeadsToday: "Leads today",
    marketStatsViews: "Views",
    marketStatsConversion: "Conversion",
    marketTrendsTitle: "Market trends",
    marketTrendsEmpty: "Not enough trend samples yet.",
    marketRfqsTitle: "Open RFQs",
    marketRfqsEmpty: "No open RFQs right now.",
    marketRfqsOffers: "Offers",
    marketRfqsDeadline: "Deadline",
    marketRfqCreateTitle: "Create RFQ",
    marketRfqCreateHint: "Posted through the shared Market API — dealer-os stays untouched.",
    marketRfqCreateSubmit: "Publish RFQ",
    marketRfqCreateSuccess: "RFQ created. The list will refresh shortly.",
    marketRfqTitleRequired: "Title is required (at least 3 characters).",
    marketRfqQuantity: "Quantity",
    marketRfqUnit: "Unit",
    marketRfqTargetPrice: "Max target price",
    marketRfqDestination: "Destination country",
    marketRfqIndustry: "Industry",
    marketRfqIndustrialType: "Industrial type",
    marketSupplyTitle: "Open sourcing requests",
    marketSupplyEmpty: "No open sourcing requests right now.",
    marketSupplyResponses: "Responses",
    marketClassicTitle: "Classic Market (Dealer OS)",
    marketClassicNote: "Stays available via a separate link — the web track does not modify it.",
    marketNavWebCopy: "Web Market",
    overviewQuickLinks: "Quick actions",
    overviewSubtitle: "Jump to the seller tasks you use most in the browser.",
    overviewNewHint: "Publish a new listing",
    overviewListingsHint: "Manage and edit listings",
    overviewLeadsHint: "Follow up on contact leads",
    overviewAnalyticsHint: "Views and conversion",
    overviewB2bHint: "RFQ and supply for dealers",
    overviewSavedHint: "Your saved listings",
    overviewMessagesHint: "Chats with sellers",
    overviewBookingsHint: "Stay requests as guest or host",
    overviewWalletHint: "Balance and transaction ledger",
    navMessages: "Messages",
    navWallet: "Wallet",
    navBookings: "Bookings",
    messagesTitle: "Messages",
    messagesEmpty: "No conversations yet",
    messagesEmptyHint: "Start a chat from any listing to reach the seller.",
    messagesErrorTitle: "Couldn't load messages",
    messagesNoMessages: "No messages yet",
    messagesUnread: "{count} unread",
    messagesDeleteTitle: "Delete conversation?",
    messagesDeleteBody: "It's removed from your inbox. The other person can still see it.",
    messagesDelete: "Delete",
    messagesCancel: "Cancel",
    messagesBack: "Back to messages",
    messagesPlaceholder: "Write a message…",
    messagesSend: "Send",
    messagesSending: "Sending…",
    messagesSendError: "Could not send message.",
    messagesThreadEmpty: "No messages yet — say hello.",
    walletTitle: "Wallet",
    walletAvailable: "Available Balance",
    walletBalanceHint: "Used for boosts and premium placements",
    walletErrorTitle: "Couldn't load your wallet",
    walletErrorBody: "Check your connection and try again.",
    walletAddFunds: "Add Funds",
    walletPromoTitle: "Free Ad Credit",
    walletPromoExpires: "Expires {date}",
    walletPromoNone: "No free ad credit right now.",
    walletPromoMonthly: "{amount} EGP granted monthly",
    walletTransactions: "Transactions",
    walletEmptyTitle: "No transactions yet",
    walletEmptyHint: "Add funds to start boosting your listings.",
    walletLoadMore: "Load more",
    walletDoneTitle: "Funds added",
    walletDoneBody: "Your new balance is {balance}.",
    walletAwaitingTitle: "Payment processing",
    walletAwaitingBody:
      "We're confirming your payment with the provider. Your balance will update automatically once it's settled.",
    walletDone: "Done",
    walletAmountLabel: "Amount (EGP)",
    walletMethodLabel: "Payment Method",
    walletTopupFailed: "Top-up failed. Please try again.",
    walletPay: "Pay {amount}",
    walletEnterAmount: "Enter an amount",
    walletTxWalletTopup: "Wallet top-up",
    walletTxBoostCharge: "Listing boost",
    walletTxSubscriptionCharge: "Subscription",
    walletTxLeadCharge: "Lead charge",
    walletTxRefund: "Refund",
    walletTxAdjustment: "Adjustment",
    walletMethodVodafone: "Vodafone Cash",
    walletMethodFawry: "Fawry",
    walletMethodInstapay: "InstaPay",
    walletMethodBank: "Bank Transfer",
    bookingsTitle: "Bookings",
    bookingsTabTrips: "My trips",
    bookingsTabRequests: "Requests",
    bookingsEmptyTrips: "No bookings yet. Find a furnished daily rental to book your first stay.",
    bookingsEmptyRequests: "No booking requests on your listings yet.",
    bookingsErrorBody: "Couldn't load your bookings.",
    bookingsNights: "nights",
    bookingsGuests: "guests",
    bookingsGuest: "Guest",
    bookingsHost: "Host",
    bookingsViewListing: "View listing",
    bookingsConfirm: "Confirm",
    bookingsReject: "Reject",
    bookingsCancel: "Cancel",
    bookingsStatusRequested: "Pending",
    bookingsStatusConfirmed: "Confirmed",
    bookingsStatusRejected: "Rejected",
    bookingsStatusCancelled: "Cancelled",
    retry: "Retry",
    navAnalytics: "Analytics",
    analyticsTitle: "Performance analytics",
    analyticsSubtitle: "Views and leads across your listings.",
    analyticsTotalViews: "Total views",
    analyticsTotalLeads: "Contact leads",
    analyticsConversion: "Conversion rate",
    analyticsListing: "Listing",
    analyticsViews: "Views",
    analyticsLeads: "Leads",
    analyticsConvRate: "Conv.",
    analyticsEmpty: "No data yet.",
    categoryCar: "Cars",
    categoryRealEstate: "Real estate",
    categoryIndustrial: "Industrial",
    selectEmpty: "—",
    specMake: "Make",
    specModel: "Model",
    specYear: "Year",
    specMileage: "Mileage (km)",
    specPropertyType: "Property type",
    specAreaSqm: "Area (sqm)",
    specRooms: "Rooms",
    specIndustrialType: "Industrial type",
    specEquipmentType: "Equipment type",
    specCondition: "Condition",
  },
};

export function workspaceUiCopy(locale: SiteLocale): WorkspaceUiCopy {
  return COPY[locale];
}
