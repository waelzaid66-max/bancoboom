import { BrandMark } from "./BrandMark";

type MaintenanceViewProps = {
  locale: "ar" | "en";
};

const COPY = {
  ar: {
    brandAria: "BANCO",
    title: "الموقع متوقف مؤقتاً",
    body: "تجربة الويب مفصولة عن خط الإنتاج (الفيشة مطفأة). التطبيق والـ API يبقيان يعملان كالمعتاد.",
    hint: "إن كنت من فريق التشغيل: راجع WEB_PLUG_ENABLED أو دليل فصل الفيشة.",
  },
  en: {
    brandAria: "BANCO",
    title: "Website temporarily offline",
    body: "The consumer web plug is disconnected. The mobile app and API keep running as usual.",
    hint: "Operators: check WEB_PLUG_ENABLED or the plug detach runbook.",
  },
} as const;

export function MaintenanceView({ locale }: MaintenanceViewProps) {
  const copy = COPY[locale];
  const home = locale === "en" ? "/en" : "/";

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem 1.25rem",
        background:
          "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(232,0,45,0.18), transparent 55%), #050505",
      }}
      data-banco-plug="off"
      data-banco-journey="maintenance"
    >
      <div style={{ maxWidth: 480, textAlign: "center" }}>
        <BrandMark href={home} ariaLabel={copy.brandAria} size="header" />
        <h1
          style={{
            margin: "1.5rem 0 0.75rem",
            fontSize: "clamp(1.4rem, 4vw, 1.85rem)",
            fontWeight: 800,
            color: "var(--banco-fg)",
          }}
        >
          {copy.title}
        </h1>
        <p style={{ margin: 0, color: "var(--banco-muted)", lineHeight: 1.7 }}>{copy.body}</p>
        <p
          style={{
            margin: "1rem 0 0",
            color: "var(--banco-muted)",
            fontSize: "0.85rem",
            lineHeight: 1.6,
          }}
        >
          {copy.hint}
        </p>
      </div>
    </main>
  );
}
