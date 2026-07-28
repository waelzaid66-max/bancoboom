import type { SiteLocale } from "./hub-config";

export type ListingUiCopy = {
  home: string;
  breadcrumbAria: string;
  category: string;
  status: string;
  seller: string;
  sellerAbout: string;
  share: string;
  openInApp: string;
  publicLink: string;
  contactTitle: string;
  contactCall: string;
  contactWhatsApp: string;
  contactChat: string;
  contactBooking: string;
  contactAppHint: string;
  requestBadge: string;
  sponsored: string;
  video: string;
  notFoundTitle: string;
  notFoundBody: string;
  backToSearch: string;
  loadingAria: string;
  metadataMissing: string;
  metadataFallback: string;
  savedAdd: string;
  savedRemove: string;
  savedError: string;
  contactSignIn: string;
  contactWebHint: string;
  contactError: string;
  reportCta: string;
  reportTitle: string;
  reportSubmit: string;
  reportDone: string;
  reportError: string;
  reportCancel: string;
  reportReasonFakePrice: string;
  reportReasonWrongData: string;
  reportReasonScam: string;
  reportReasonDuplicate: string;
  reportReasonOther: string;
  commentsTitle: string;
  commentsPlaceholder: string;
  commentsSend: string;
  commentsSending: string;
  commentsSignIn: string;
  commentsEmpty: string;
  commentsError: string;
  commentsRateLimited: string;
  commentsSellerBadge: string;
  commentsReply: string;
  commentsReplyPlaceholder: string;
  commentsCancel: string;
  reviewsTitle: string;
  reviewsCount: string;
  reviewsEmpty: string;
  reviewsWrite: string;
  reviewsEdit: string;
  reviewsSignIn: string;
  reviewsNotEligible: string;
  reviewsYourRating: string;
  reviewsPlaceholder: string;
  reviewsSubmit: string;
  reviewsSubmitting: string;
  reviewsCancel: string;
  reviewsRatingRequired: string;
  reviewsError: string;
  reviewsLoading: string;
  bookingTitle: string;
  bookingNight: string;
  bookingCurrency: string;
  bookingDates: string;
  bookingNights: string;
  bookingGuests: string;
  bookingEstimate: string;
  bookingPickHint: string;
  bookingReserve: string;
  bookingSubmitting: string;
  bookingRequestNote: string;
  bookingErrorTaken: string;
  bookingConfirmedTitle: string;
  bookingConfirmedBody: string;
  bookingSignIn: string;
};

const COPY: Record<SiteLocale, ListingUiCopy> = {
  ar: {
    home: "الرئيسية",
    breadcrumbAria: "مسار التصفح",
    category: "الفئة",
    status: "الحالة",
    seller: "البائع",
    sellerAbout: "عن البائع",
    share: "مشاركة",
    openInApp: "فتح في التطبيق",
    publicLink: "رابط عام",
    contactTitle: "تواصل مع البائع",
    contactCall: "اتصال",
    contactWhatsApp: "واتساب",
    contactChat: "محادثة",
    contactBooking: "حجز إقامة",
    contactAppHint: "الاتصال والحجز والمحادثة متاحان في تطبيق BANCO — نفس تجربة الجوال.",
    requestBadge: "طلب شراء",
    sponsored: "ممول",
    video: "فيديو",
    notFoundTitle: "الإعلان غير متاح",
    notFoundBody: "ربما تم حذف الإعلان أو انتهت صلاحيته.",
    backToSearch: "العودة إلى البحث",
    loadingAria: "جاري تحميل الإعلان",
    metadataMissing: "إعلان غير موجود",
    metadataFallback: "إعلان",
    savedAdd: "حفظ الإعلان",
    savedRemove: "إزالة من المحفوظات",
    savedError: "تعذّر تحديث المحفوظات. حاول مرة أخرى.",
    contactSignIn: "سجّل الدخول للتواصل",
    contactWebHint: "بعد تسجيل الدخول يمكنك الاتصال أو مراسلة البائع من المتصفح.",
    contactError: "تعذّر إتمام التواصل. حاول مرة أخرى.",
    reportCta: "إبلاغ عن إساءة",
    reportTitle: "إبلاغ عن الإعلان",
    reportSubmit: "إرسال البلاغ",
    reportDone: "شكرًا — تم استلام بلاغك.",
    reportError: "تعذّر إرسال البلاغ. حاول مرة أخرى.",
    reportCancel: "إلغاء",
    reportReasonFakePrice: "سعر مضلل",
    reportReasonWrongData: "بيانات خاطئة",
    reportReasonScam: "احتيال",
    reportReasonDuplicate: "إعلان مكرر",
    reportReasonOther: "سبب آخر",
    commentsTitle: "أسئلة وأجوبة",
    commentsPlaceholder: "اكتب سؤالك للبائع…",
    commentsSend: "إرسال",
    commentsSending: "جاري الإرسال…",
    commentsSignIn: "سجّل الدخول لطرح سؤال",
    commentsEmpty: "لا أسئلة بعد — كن أول من يسأل.",
    commentsError: "تعذّر إرسال السؤال.",
    commentsRateLimited: "انتظر قليلًا قبل إرسال سؤال آخر.",
    commentsSellerBadge: "البائع",
    commentsReply: "رد",
    commentsReplyPlaceholder: "اكتب ردك…",
    commentsCancel: "إلغاء",
    reviewsTitle: "تقييمات البائع",
    reviewsCount: "{count} تقييم",
    reviewsEmpty: "لا توجد تقييمات بعد.",
    reviewsWrite: "اكتب تقييمًا",
    reviewsEdit: "عدّل تقييمك",
    reviewsSignIn: "سجّل الدخول لكتابة تقييم",
    reviewsNotEligible: "يمكنك التقييم بعد التواصل مع البائع.",
    reviewsYourRating: "تقييمك",
    reviewsPlaceholder: "تعليق اختياري…",
    reviewsSubmit: "إرسال التقييم",
    reviewsSubmitting: "جاري الإرسال…",
    reviewsCancel: "إلغاء",
    reviewsRatingRequired: "اختر عدد النجوم.",
    reviewsError: "تعذّر إرسال التقييم.",
    reviewsLoading: "جاري تحميل التقييمات…",
    bookingTitle: "احجز إقامتك",
    bookingNight: "ليلة",
    bookingCurrency: "ج.م",
    bookingDates: "التواريخ",
    bookingNights: "الليالي",
    bookingGuests: "الضيوف",
    bookingEstimate: "الإجمالي التقديري",
    bookingPickHint: "اختر تاريخ الوصول والمغادرة",
    bookingReserve: "احجز الآن",
    bookingSubmitting: "جاري الإرسال…",
    bookingRequestNote: "ترسل طلب حجز والمالك يؤكده. لا خصم الآن.",
    bookingErrorTaken: "هذه التواريخ حُجزت للتو. برجاء الاختيار من جديد.",
    bookingConfirmedTitle: "تم إرسال الحجز",
    bookingConfirmedBody: "سيؤكد المالك إقامتك قريبًا. يمكنك مراسلته من هذا الإعلان.",
    bookingSignIn: "سجّل الدخول لحجز الإقامة من المتصفح.",
  },
  en: {
    home: "Home",
    breadcrumbAria: "Breadcrumb",
    category: "Category",
    status: "Status",
    seller: "Seller",
    sellerAbout: "About the seller",
    share: "Share",
    openInApp: "Open in app",
    publicLink: "Public link",
    contactTitle: "Contact seller",
    contactCall: "Call",
    contactWhatsApp: "WhatsApp",
    contactChat: "Message",
    contactBooking: "Book stay",
    contactAppHint: "Call, chat, and booking run in the BANCO app — same as mobile.",
    requestBadge: "Wanted to buy",
    sponsored: "Sponsored",
    video: "Video",
    notFoundTitle: "Listing unavailable",
    notFoundBody: "It may have been removed or expired.",
    backToSearch: "Back to search",
    loadingAria: "Loading listing",
    metadataMissing: "Listing not found",
    metadataFallback: "Listing",
    savedAdd: "Save listing",
    savedRemove: "Remove from saved",
    savedError: "Could not update saved listings. Try again.",
    contactSignIn: "Sign in to contact",
    contactWebHint: "After sign-in you can call or message the seller from the browser.",
    contactError: "Could not complete contact. Try again.",
    reportCta: "Report listing",
    reportTitle: "Report this listing",
    reportSubmit: "Submit report",
    reportDone: "Thanks — your report was received.",
    reportError: "Could not submit report. Try again.",
    reportCancel: "Cancel",
    reportReasonFakePrice: "Misleading price",
    reportReasonWrongData: "Wrong information",
    reportReasonScam: "Scam or fraud",
    reportReasonDuplicate: "Duplicate listing",
    reportReasonOther: "Other",
    commentsTitle: "Questions & answers",
    commentsPlaceholder: "Ask the seller a question…",
    commentsSend: "Send",
    commentsSending: "Sending…",
    commentsSignIn: "Sign in to ask a question",
    commentsEmpty: "No questions yet — be the first to ask.",
    commentsError: "Could not post your question.",
    commentsRateLimited: "Please wait before posting again.",
    commentsSellerBadge: "Seller",
    commentsReply: "Reply",
    commentsReplyPlaceholder: "Write your reply…",
    commentsCancel: "Cancel",
    reviewsTitle: "Seller reviews",
    reviewsCount: "{count} reviews",
    reviewsEmpty: "No reviews yet.",
    reviewsWrite: "Write a review",
    reviewsEdit: "Edit your review",
    reviewsSignIn: "Sign in to leave a review",
    reviewsNotEligible: "You can review after contacting this seller.",
    reviewsYourRating: "Your rating",
    reviewsPlaceholder: "Optional comment…",
    reviewsSubmit: "Submit review",
    reviewsSubmitting: "Submitting…",
    reviewsCancel: "Cancel",
    reviewsRatingRequired: "Pick a star rating.",
    reviewsError: "Could not submit review.",
    reviewsLoading: "Loading reviews…",
    bookingTitle: "Book your stay",
    bookingNight: "night",
    bookingCurrency: "EGP",
    bookingDates: "Dates",
    bookingNights: "Nights",
    bookingGuests: "Guests",
    bookingEstimate: "Estimated total",
    bookingPickHint: "Pick your check-in and check-out dates",
    bookingReserve: "Reserve",
    bookingSubmitting: "Submitting…",
    bookingRequestNote: "You send a booking request — the host confirms. No charge now.",
    bookingErrorTaken: "Those dates were just taken. Please pick again.",
    bookingConfirmedTitle: "Booking requested",
    bookingConfirmedBody: "The host will confirm your stay shortly. You can chat with them from this listing.",
    bookingSignIn: "Sign in to book a stay from the browser.",
  },
};

export function listingUiCopy(locale: SiteLocale): ListingUiCopy {
  return COPY[locale];
}

export const LISTING_HUB_LABELS: Record<
  SiteLocale,
  Record<"car" | "real_estate" | "industrial", { href: string; label: string }>
> = {
  ar: {
    car: { href: "/cars", label: "سيارات" },
    real_estate: { href: "/real-estate", label: "عقارات" },
    industrial: { href: "/industrial", label: "صناعي" },
  },
  en: {
    car: { href: "/en/cars", label: "Cars" },
    real_estate: { href: "/en/real-estate", label: "Real Estate" },
    industrial: { href: "/en/industrial", label: "Industrial" },
  },
};
