import React from "react";

import { LegalScreen, type LegalSection } from "@/components/LegalScreen";
import { useI18n } from "@/context/LanguageContext";

const UPDATED: Record<"en" | "ar", string> = {
  en: "June 11, 2026",
  ar: "11 يونيو 2026",
};

const SECTIONS: Record<"en" | "ar", LegalSection[]> = {
  en: [
    {
      heading: "Acceptance & Consent",
      body: "By creating an account, tapping \u201cI agree\u201d, or otherwise using BANCO, you confirm that you have read, understood, and agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree, please do not use the service. If you accept these Terms on behalf of a company or dealership, you represent that you are authorized to bind that organization.",
    },
    {
      heading: "Definitions",
      body: "\u201cBANCO\u201d (\u201cwe\u201d, \u201cthe Platform\u201d) is the operator of this marketplace. \u201cBuyer\u201d is any user who browses or contacts a seller. \u201cSeller\u201d is any individual, dealer, company, or enterprise that publishes a listing. \u201cListing\u201d is an advertisement for an \u201cAsset\u201d \u2014 a car, property, or industrial item offered by a Seller.",
    },
    {
      heading: "Financial Transparency",
      highlight: true,
      body: "BANCO is an asset marketplace and a neutral intermediary only. BANCO does not provide loans, credit, financing, or any other financial service, and is not a bank, lender, or financial institution. Any installment, monthly-payment, or financing terms shown on a listing are offered and set entirely by third parties \u2014 the Seller, dealer, or their financing partner. BANCO displays this information for convenience only; it does not originate, underwrite, guarantee, or service any financing and is not a party to any payment or credit agreement. You are responsible for independently verifying all financing terms directly with the provider before entering into any agreement.",
    },
    {
      heading: "Role of BANCO",
      body: "BANCO provides a technology platform that connects Buyers and Sellers. We do not own, inspect, store, or take possession of any Asset, we are not a broker or agent for any party, and we are not a party to any transaction. Negotiations, payments, contracts, inspections, and ownership transfers occur directly between Buyer and Seller.",
    },
    {
      heading: "Eligibility & Accounts",
      body: "You must be at least 18 years old and provide accurate, current information. You are responsible for safeguarding your login credentials and for all activity under your account. Business and dealer accounts must be registered by an authorized representative.",
    },
    {
      heading: "Buyer Rights & Responsibilities",
      body: "You may browse listings without an account. When you contact a Seller you agree to provide accurate information and to engage in good faith. You are responsible for independently inspecting and verifying any Asset, its legal status, and any financing terms before committing to a purchase.",
    },
    {
      heading: "Seller & Dealer Obligations",
      body: "Sellers are solely responsible for the accuracy and legality of their listings, for holding clear title or the right to sell, and for honoring the terms they advertise. Sellers must comply with all applicable advertising, consumer-protection, and asset-registration laws, and must not list prohibited, stolen, or misrepresented items.",
    },
    {
      heading: "Business Accounts & Paid Services",
      body: "Dealers, companies, and enterprises may access additional tools and optional paid services such as listing boosts, subscription plans, and lead services. Where fees apply, the price is set by BANCO and shown to you before purchase. Paid promotion affects visibility and placement only \u2014 it never guarantees a sale and never alters the neutral, third-party nature of any financing shown.",
    },
    {
      heading: "Listings & Transactions",
      body: "Each listing is the responsibility of its Seller. BANCO does not guarantee the availability, quality, safety, or legality of any Asset, nor the truth or accuracy of any listing. Any dispute arising from a transaction is between the Buyer and the Seller.",
    },
    {
      heading: "Prohibited Conduct",
      body: "You agree not to post fraudulent, misleading, or illegal listings; impersonate others; harass users; scrape or copy the service; circumvent security, moderation, or rate limits; or use the platform to defraud any party. Violations may result in listing removal, account suspension, or legal action.",
    },
    {
      heading: "Content & Intellectual Property",
      body: "You retain ownership of the content you submit and grant BANCO a worldwide, non-exclusive license to host, display, and promote your listings within the service. The BANCO name, logo, and software remain the property of BANCO and may not be used without permission.",
    },
    {
      heading: "Moderation & Enforcement",
      body: "To protect users, BANCO may review, rank, restrict, hide, or remove listings and accounts that violate these Terms or applicable law, including through automated abuse and fraud controls. We aim to apply these measures fairly and proportionately.",
    },
    {
      heading: "Disclaimers",
      body: "The service is provided \u201cas is\u201d and \u201cas available\u201d without warranties of any kind. BANCO does not warrant the conduct of any Buyer or Seller, the condition of any Asset, or the terms offered by any third-party financier.",
    },
    {
      heading: "Limitation of Liability",
      body: "To the maximum extent permitted by law, BANCO is not liable for any indirect, incidental, or consequential damages, or for any loss arising from transactions, financing arrangements, or dealings between users and third parties. Nothing in these Terms limits liability that cannot be excluded under applicable law.",
    },
    {
      heading: "Indemnification",
      body: "You agree to indemnify and hold BANCO harmless from any claim, loss, or expense arising out of your listings, your use of the service, your conduct toward other users, or your breach of these Terms or applicable law.",
    },
    {
      heading: "Privacy",
      body: "Our collection and use of personal data are described in the Privacy Policy, which forms part of these Terms. By using BANCO you also consent to that policy.",
    },
    {
      heading: "Governing Law & Disputes",
      body: "These Terms are governed by the laws of the Arab Republic of Egypt. For users in GCC countries, mandatory local consumer-protection rights continue to apply. Disputes that cannot be resolved amicably shall be submitted to the competent courts having jurisdiction.",
    },
    {
      heading: "Changes to These Terms",
      body: "We may update these Terms from time to time. Material changes will be reflected by a new \u201cLast updated\u201d date and, where appropriate, in-app notice. Your continued use after changes take effect constitutes acceptance of the revised Terms.",
    },
    {
      heading: "Account Deletion",
      body: "You may delete your account at any time from Profile \u2192 Delete Account. Deletion anonymizes your account and removes your personal data as described in our Privacy Policy.",
    },
    {
      heading: "Contact",
      body: "For questions about these Terms, contact legal@banco.today.",
    },
  ],
  ar: [
    {
      heading: "القبول والموافقة",
      body: "بإنشائك حساباً، أو الضغط على «أوافق»، أو استخدامك تطبيق بانكو بأي شكل، فإنك تقرّ بأنك قرأت وفهمت ووافقت على الالتزام بشروط الاستخدام هذه وسياسة الخصوصية. وإذا كنت لا توافق فيرجى عدم استخدام الخدمة. وإذا كنت تقبل هذه الشروط نيابةً عن شركة أو معرض، فإنك تقرّ بأنك مخوَّل بإلزام تلك الجهة.",
    },
    {
      heading: "تعريفات",
      body: "«بانكو» («نحن»، «المنصة») هي مشغّل هذا السوق. و«المشتري» هو أي مستخدم يتصفح أو يتواصل مع بائع. و«البائع» هو أي فرد أو تاجر أو شركة أو مؤسسة ينشر إعلاناً. و«الإعلان» هو عرض «أصل» — سيارة أو عقار أو منتج صناعي — مقدَّم من البائع.",
    },
    {
      heading: "الشفافية المالية",
      highlight: true,
      body: "بانكو سوق للأصول ووسيط محايد فقط. لا تقدّم بانكو قروضاً أو ائتماناً أو تمويلاً أو أي خدمة مالية، وليست بنكاً أو مُقرضاً أو مؤسسة مالية. وأي شروط تقسيط أو أقساط شهرية أو تمويل تظهر على أي إعلان يحددها ويقدّمها طرف ثالث بالكامل — البائع أو التاجر أو شريكه التمويلي. وتعرض بانكو هذه المعلومات للتيسير فقط، ولا تُنشئ أو تضمن أو تدير أي تمويل، وليست طرفاً في أي اتفاق سداد أو ائتمان. وأنت مسؤول عن التحقق من جميع شروط التمويل مباشرةً مع مقدّم الخدمة قبل إبرام أي اتفاق.",
    },
    {
      heading: "دور بانكو",
      body: "توفّر بانكو منصة تقنية تربط بين المشترين والبائعين. ونحن لا نملك أي أصل ولا نفحصه ولا نحوزه، ولسنا وسيطاً أو وكيلاً لأي طرف، ولسنا طرفاً في أي معاملة. وتتم المفاوضات والمدفوعات والعقود والمعاينة ونقل الملكية مباشرةً بين المشتري والبائع.",
    },
    {
      heading: "الأهلية والحسابات",
      body: "يجب أن يكون عمرك 18 عاماً على الأقل وأن تقدّم معلومات دقيقة وحديثة. وأنت مسؤول عن حماية بيانات دخولك وعن جميع الأنشطة التي تتم عبر حسابك. ويجب أن تُسجَّل حسابات الشركات والتجار من قِبل ممثل مخوَّل.",
    },
    {
      heading: "حقوق المشتري ومسؤولياته",
      body: "يمكنك تصفح الإعلانات دون حساب. وعند تواصلك مع بائع فإنك توافق على تقديم معلومات صحيحة والتعامل بحسن نية. وأنت مسؤول عن معاينة أي أصل والتحقق منه ومن وضعه القانوني ومن أي شروط تمويل بشكل مستقل قبل الالتزام بالشراء.",
    },
    {
      heading: "التزامات البائع والتاجر",
      body: "يتحمّل البائعون وحدهم مسؤولية دقة إعلاناتهم وقانونيتها، وامتلاكهم سند ملكية واضح أو حق البيع، والوفاء بالشروط المعلَنة. ويجب على البائعين الالتزام بجميع قوانين الإعلان وحماية المستهلك وتسجيل الأصول المعمول بها، وعدم عرض أي عناصر محظورة أو مسروقة أو مضلِّلة.",
    },
    {
      heading: "حسابات الأعمال والخدمات المدفوعة",
      body: "يمكن للتجار والشركات والمؤسسات الوصول إلى أدوات إضافية وخدمات مدفوعة اختيارية مثل تمييز الإعلانات وخطط الاشتراك وخدمات العملاء المحتملين. وحيثما تُطبَّق رسوم، تحددها بانكو وتُعرض عليك قبل الشراء. ويؤثر الترويج المدفوع على الظهور والترتيب فقط — ولا يضمن البيع إطلاقاً ولا يغيّر الطبيعة المحايدة لأي تمويل يقدّمه طرف ثالث.",
    },
    {
      heading: "الإعلانات والمعاملات",
      body: "كل إعلان مسؤولية بائعه. ولا تضمن بانكو توافر أي أصل أو جودته أو سلامته أو قانونيته، ولا صحة أي إعلان أو دقته. وأي نزاع ينشأ عن معاملة يكون بين المشتري والبائع.",
    },
    {
      heading: "السلوكيات المحظورة",
      body: "توافق على عدم نشر إعلانات احتيالية أو مضلِّلة أو غير قانونية، أو انتحال صفة الغير، أو مضايقة المستخدمين، أو استخراج بيانات الخدمة أو نسخها، أو الالتفاف على إجراءات الأمان أو الإشراف أو حدود الاستخدام، أو استخدام المنصة للاحتيال على أي طرف. وقد تؤدي المخالفات إلى إزالة الإعلان أو تعليق الحساب أو اتخاذ إجراء قانوني.",
    },
    {
      heading: "المحتوى والملكية الفكرية",
      body: "تحتفظ بملكية المحتوى الذي تقدّمه، وتمنح بانكو ترخيصاً عالمياً غير حصري لاستضافة إعلاناتك وعرضها والترويج لها داخل الخدمة. ويبقى اسم بانكو وشعارها وبرمجياتها ملكاً لبانكو ولا يجوز استخدامها دون إذن.",
    },
    {
      heading: "الإشراف والإنفاذ",
      body: "حمايةً للمستخدمين، يجوز لبانكو مراجعة الإعلانات والحسابات أو ترتيبها أو تقييدها أو إخفائها أو إزالتها إذا خالفت هذه الشروط أو القانون، بما في ذلك عبر أنظمة مكافحة الاحتيال والإساءة الآلية. ونسعى لتطبيق هذه الإجراءات بإنصاف وتناسب.",
    },
    {
      heading: "إخلاء المسؤولية",
      body: "تُقدَّم الخدمة «كما هي» و«حسب توافرها» دون أي ضمانات من أي نوع. ولا تضمن بانكو سلوك أي مشترٍ أو بائع، ولا حالة أي أصل، ولا الشروط التي يقدّمها أي مموّل من الغير.",
    },
    {
      heading: "حدود المسؤولية",
      body: "إلى أقصى حد يسمح به القانون، لا تتحمل بانكو المسؤولية عن أي أضرار غير مباشرة أو عرضية أو تبعية، ولا عن أي خسارة تنشأ عن المعاملات أو ترتيبات التمويل أو التعاملات بين المستخدمين والغير. ولا يحدّ أي بند هنا من مسؤولية لا يجوز استبعادها قانوناً.",
    },
    {
      heading: "التعويض",
      body: "توافق على تعويض بانكو وحمايتها من أي مطالبة أو خسارة أو نفقة تنشأ عن إعلاناتك أو استخدامك للخدمة أو سلوكك تجاه المستخدمين الآخرين أو إخلالك بهذه الشروط أو القانون.",
    },
    {
      heading: "الخصوصية",
      body: "يرد وصف جمعنا للبيانات الشخصية واستخدامها في سياسة الخصوصية التي تُعد جزءاً من هذه الشروط. وباستخدامك بانكو فإنك توافق أيضاً على تلك السياسة.",
    },
    {
      heading: "القانون الحاكم والنزاعات",
      body: "تخضع هذه الشروط لقوانين جمهورية مصر العربية. وبالنسبة لمستخدمي دول مجلس التعاون الخليجي، تظل حقوق حماية المستهلك المحلية الإلزامية سارية. وتُحال النزاعات التي يتعذّر حلها ودياً إلى المحاكم المختصة.",
    },
    {
      heading: "تعديل الشروط",
      body: "قد نحدّث هذه الشروط من حين لآخر. وستظهر التغييرات الجوهرية بتاريخ «آخر تحديث» جديد، وبإشعار داخل التطبيق عند الاقتضاء. ويُعد استمرارك في الاستخدام بعد سريان التغييرات قبولاً للشروط المعدَّلة.",
    },
    {
      heading: "حذف الحساب",
      body: "يمكنك حذف حسابك في أي وقت من «حسابي ← حذف الحساب». ويؤدي الحذف إلى إخفاء هوية حسابك وإزالة بياناتك الشخصية كما هو موضّح في سياسة الخصوصية.",
    },
    {
      heading: "التواصل",
      body: "للاستفسار عن هذه الشروط، تواصل عبر legal@banco.today.",
    },
  ],
};

export default function TermsOfServiceScreen() {
  const { t, lang } = useI18n();
  return (
    <LegalScreen
      title={t("profile.terms")}
      updated={UPDATED[lang]}
      sections={SECTIONS[lang]}
    />
  );
}
