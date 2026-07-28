import { useState } from "react";
import { Link } from "wouter";
import {
  PRIVACY_SECTIONS,
  TERMS_SECTIONS,
  LEGAL_UPDATED,
  UI_TEXT,
  type LegalLang,
} from "@/lib/legal-content";

const basePath = import.meta.env.BASE_URL; // ends with "/"
const logoUrl = `${basePath}banco-logo.png`;

export function LegalPage({ kind }: { kind: "privacy" | "terms" }) {
  const [lang, setLang] = useState<LegalLang>("en");
  const isAr = lang === "ar";
  const ui = UI_TEXT[lang];
  const sections = kind === "privacy" ? PRIVACY_SECTIONS[lang] : TERMS_SECTIONS[lang];
  const title = kind === "privacy" ? ui.privacyTitle : ui.termsTitle;

  return (
    <div
      dir={isAr ? "rtl" : "ltr"}
      lang={lang}
      className="min-h-[100dvh] bg-[#0A0A0A] text-white"
    >
      <header className="sticky top-0 z-10 border-b border-white/10 bg-[#0A0A0A]/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-5 py-4">
          <Link
            href="/privacy"
            className="flex items-center gap-2"
            aria-label={ui.backToApp}
          >
            <img src={logoUrl} alt="BANCO" className="h-7 w-auto" />
          </Link>
          <button
            type="button"
            onClick={() => setLang(isAr ? "en" : "ar")}
            className="rounded-md border border-white/15 px-3 py-1.5 text-sm font-medium text-gray-200 transition hover:border-[#E8002D] hover:text-white"
          >
            {ui.langToggle}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-10">
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-gray-400">
          {ui.updatedLabel}: {LEGAL_UPDATED[lang]}
        </p>

        <div className="mt-8 space-y-7">
          {sections.map((section) => (
            <section
              key={section.heading}
              className={
                section.highlight
                  ? "rounded-xl border border-[#E8002D]/40 bg-[#E8002D]/[0.06] p-5"
                  : ""
              }
            >
              <h2
                className={
                  section.highlight
                    ? "text-lg font-semibold text-[#FF4D6D]"
                    : "text-lg font-semibold text-white"
                }
              >
                {section.heading}
              </h2>
              <p className="mt-2 leading-relaxed text-gray-300">{section.body}</p>
            </section>
          ))}
        </div>

        <footer className="mt-12 border-t border-white/10 pt-6 text-sm text-gray-400">
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <Link href="/privacy" className="text-gray-300 transition hover:text-[#E8002D]">
              {ui.seePrivacy}
            </Link>
            <Link href="/terms" className="text-gray-300 transition hover:text-[#E8002D]">
              {ui.seeTerms}
            </Link>
          </div>
          <p className="mt-4 text-gray-500">© {new Date().getFullYear()} BANCO</p>
        </footer>
      </main>
    </div>
  );
}
