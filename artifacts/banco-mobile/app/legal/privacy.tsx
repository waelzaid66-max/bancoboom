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
      heading: "Overview",
      body: "BANCO is an asset marketplace for cars, real estate, and industrial equipment. This Privacy Policy explains what data we collect, how we use it, who we share it with, and the controls you have. It applies to the BANCO mobile app and related services.",
    },
    {
      heading: "Data We Collect",
      body: "Account data: your name, email address, and the password you set (handled by our authentication provider). Inquiry data: when you contact a seller we record the listing, the action (call, WhatsApp, chat), and any name or phone number you choose to share. Activity data: anonymous signals such as listings viewed, searches, and taps used to personalize your feed. Device data: basic technical information needed to operate and secure the app.",
    },
    {
      heading: "How We Use Your Data",
      body: "We use your data to operate the marketplace: to authenticate your account, sync your saved listings across devices, connect you with sellers, personalize recommendations, prevent fraud and abuse, and meet legal obligations.",
    },
    {
      heading: "Sharing Your Data",
      body: "When you contact a seller, the contact details you choose to share are provided to that seller so they can respond. We use trusted service providers (such as cloud hosting and authentication) under confidentiality obligations. We do not sell your personal data and do not share it with third parties for their own advertising. We may disclose data when required by law.",
    },
    {
      heading: "Location",
      body: "If you grant location permission, we use your approximate location only to show nearby listings. You can deny or revoke this permission at any time; the app remains fully usable, showing listings from the most relevant market instead.",
    },
    {
      heading: "Camera & Photo Access",
      body: "BANCO only requests access to your camera or photo library when you choose to add a photo (for example, your profile picture). We always explain why access is needed before the system prompt appears, and we never access your media in the background.",
    },
    {
      heading: "Data Retention",
      body: "We keep personal data only as long as needed to provide the service and meet legal requirements. When you delete your account, we anonymize or remove your personal data as described below.",
    },
    {
      heading: "Data Security",
      body: "All data is encrypted in transit using HTTPS/TLS, and stored data is encrypted at rest by our infrastructure providers. Access to personal data is restricted and logged.",
    },
    {
      heading: "Your Rights",
      body: "You may access, correct, or delete your personal data, and request a copy of it. You can manage much of this in the app, or contact us for assistance. Where applicable law grants additional rights, we honor them.",
    },
    {
      heading: "Children",
      body: "BANCO is not directed to children under 18, and we do not knowingly collect their data.",
    },
    {
      heading: "International Users",
      body: "BANCO serves users in Egypt and the GCC. Your data may be processed on infrastructure located in other countries with appropriate safeguards.",
    },
    {
      heading: "Deleting Your Account",
      body: "You can delete your account at any time from Profile \u2192 Delete Account. Deletion anonymizes your account, removes your saved listings and activity history, erases personal contact details from your past inquiries, and removes your sign-in credentials from our authentication provider.",
    },
    {
      heading: "Changes to This Policy",
      body: "We may update this policy. The \u201cLast updated\u201d date reflects the latest version, and we will provide in-app notice of material changes.",
    },
    {
      heading: "Contact",
      body: "For privacy questions or data requests, contact privacy@banco.today.",
    },
  ],
  ar: [
    {
      heading: "نظرة عامة",
      body: "بانكو سوق للأصول يشمل السيارات والعقارات والمعدات الصناعية. توضّح سياسة الخصوصية هذه البيانات التي نجمعها وكيفية استخدامها ومع من نشاركها والتحكم المتاح لك. وتسري على تطبيق بانكو والخدمات المرتبطة به.",
    },
    {
      heading: "البيانات التي نجمعها",
      body: "بيانات الحساب: اسمك وبريدك الإلكتروني وكلمة المرور التي تحددها (يديرها مزوّد المصادقة لدينا). بيانات التواصل: عند تواصلك مع بائع نسجّل الإعلان ونوع الإجراء (اتصال، واتساب، محادثة) وأي اسم أو رقم هاتف تختار مشاركته. بيانات النشاط: إشارات مجهولة مثل الإعلانات المعروضة وعمليات البحث والنقرات لتخصيص واجهتك. بيانات الجهاز: معلومات تقنية أساسية لازمة لتشغيل التطبيق وتأمينه.",
    },
    {
      heading: "كيف نستخدم بياناتك",
      body: "نستخدم بياناتك لتشغيل السوق: للتحقق من حسابك، ومزامنة إعلاناتك المحفوظة عبر أجهزتك، وربطك بالبائعين، وتخصيص التوصيات، ومنع الاحتيال والإساءة، والوفاء بالالتزامات القانونية.",
    },
    {
      heading: "مشاركة بياناتك",
      body: "عند تواصلك مع بائع، تُقدَّم بيانات الاتصال التي تختار مشاركتها إلى ذلك البائع ليتمكن من الرد. ونستعين بمزوّدي خدمات موثوقين (مثل الاستضافة السحابية والمصادقة) ملتزمين بالسرية. ولا نبيع بياناتك الشخصية ولا نشاركها مع أطراف ثالثة لأغراض إعلاناتهم. وقد نفصح عن البيانات عندما يقتضي القانون ذلك.",
    },
    {
      heading: "الموقع الجغرافي",
      body: "إذا منحت إذن الموقع، نستخدم موقعك التقريبي فقط لعرض الإعلانات القريبة منك. ويمكنك رفض هذا الإذن أو سحبه في أي وقت؛ ويظل التطبيق صالحاً للاستخدام بالكامل، إذ يعرض إعلانات أقرب سوق مناسب بدلاً من ذلك.",
    },
    {
      heading: "الوصول إلى الكاميرا والصور",
      body: "لا تطلب بانكو الوصول إلى الكاميرا أو مكتبة الصور إلا عند اختيارك إضافة صورة (مثل صورة ملفك الشخصي). ونوضّح دائماً سبب الحاجة إلى الإذن قبل ظهور رسالة النظام، ولا نصل إلى وسائطك في الخلفية إطلاقاً.",
    },
    {
      heading: "الاحتفاظ بالبيانات",
      body: "نحتفظ بالبيانات الشخصية فقط للمدة اللازمة لتقديم الخدمة والوفاء بالمتطلبات القانونية. وعند حذف حسابك، نخفي هوية بياناتك الشخصية أو نزيلها كما هو موضّح أدناه.",
    },
    {
      heading: "أمن البيانات",
      body: "تُشفَّر جميع البيانات أثناء النقل عبر HTTPS/TLS، وتُشفَّر البيانات المخزَّنة لدى مزوّدي البنية التحتية لدينا. والوصول إلى البيانات الشخصية مقيَّد ومسجَّل.",
    },
    {
      heading: "حقوقك",
      body: "يمكنك الوصول إلى بياناتك الشخصية وتصحيحها أو حذفها وطلب نسخة منها. ويمكنك إدارة الكثير من ذلك داخل التطبيق، أو التواصل معنا للمساعدة. وحيثما يمنحك القانون المعمول به حقوقاً إضافية، فإننا نلتزم بها.",
    },
    {
      heading: "الأطفال",
      body: "تطبيق بانكو غير موجَّه للأطفال دون سن 18 عاماً، ولا نجمع بياناتهم عن علم.",
    },
    {
      heading: "المستخدمون الدوليون",
      body: "تخدم بانكو المستخدمين في مصر ودول الخليج. وقد تتم معالجة بياناتك على بنية تحتية في دول أخرى مع توفير الضمانات المناسبة.",
    },
    {
      heading: "حذف حسابك",
      body: "يمكنك حذف حسابك في أي وقت من «حسابي ← حذف الحساب». ويؤدي الحذف إلى إخفاء هوية حسابك وإزالة إعلاناتك المحفوظة وسجل نشاطك، ومحو بيانات الاتصال الشخصية من استفساراتك السابقة، وإزالة بيانات دخولك من مزوّد المصادقة لدينا.",
    },
    {
      heading: "تغييرات هذه السياسة",
      body: "قد نحدّث هذه السياسة. ويعكس تاريخ «آخر تحديث» أحدث نسخة، وسنوفّر إشعاراً داخل التطبيق بالتغييرات الجوهرية.",
    },
    {
      heading: "التواصل",
      body: "للاستفسارات المتعلقة بالخصوصية أو طلبات البيانات، تواصل عبر privacy@banco.today.",
    },
  ],
};

export default function PrivacyPolicyScreen() {
  const { t, lang } = useI18n();
  return (
    <LegalScreen
      title={t("profile.privacy")}
      updated={UPDATED[lang]}
      sections={SECTIONS[lang]}
    />
  );
}
