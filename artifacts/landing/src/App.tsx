import { useEffect, useRef, useState } from "react";
import logoUrl from "@/assets/banco-logo.png";

/**
 * BANCO — صفحة الدخول الرسمية
 * روابط سريعة ثابتة لكل الأسطح: التطبيق · ماركت · لوحة التحكم
 * لا تعتمد على متغيرات بيئة — المسارات معروفة دائماً.
 */

const PATHS = {
  app: "/banco-mobile/",
  market: "/dealer-os/",
  admin: "/admin-os/",
};

const SECTIONS = [
  { icon: "🚗", ar: "سيارات", en: "Cars" },
  { icon: "🏠", ar: "عقارات وإيجار وحجز يومي", en: "Real Estate & Daily Booking" },
  { icon: "⚙️", ar: "صناعة وتوريد", en: "Industry & Supply" },
  { icon: "🤝", ar: "أعمال B2B", en: "B2B Market" },
  { icon: "💬", ar: "رسائل فورية", en: "Instant Messaging" },
  { icon: "🤖", ar: "مساعد ذكي", en: "AI Assistant" },
];

function useScrollY() {
  const [y, setY] = useState(0);
  useEffect(() => {
    const fn = () => setY(window.scrollY);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);
  return y;
}

/**
 * Domain-aware redirect:
 *   banco.deals  → /dealer-os/   (dealer management platform)
 *   banco.autos  → /banco-mobile/ (automotive marketplace)
 *   banco.today  → show main landing (consumer entry)
 * All three domains hit the same Replit deployment — we route by Host header.
 */
function DomainRouter({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const h = window.location.hostname.toLowerCase().replace(/^www\./, "");
    // تسجيل الدخول (Clerk live) مربوط بنطاق banco.today فقط — النطاقات الأخرى
    // تُحوَّل لمسار banco.today مباشرة حتى يعمل الحساب والدخول بشكل كامل.
    if (h === "banco.deals") {
      window.location.replace("https://banco.today/dealer-os/");
    } else if (h === "banco.autos") {
      window.location.replace("https://banco.today/banco-mobile/");
    }
  }, []);
  return <>{children}</>;
}

export default function App() {
  const scrollY = useScrollY();
  const heroRef = useRef<HTMLDivElement>(null);

  return (
    <DomainRouter>
    <div style={S.root} dir="rtl">
      {/* ── شريط التنقل العلوي ── */}
      <nav
        style={{
          ...S.nav,
          background: scrollY > 40 ? "rgba(0,0,0,0.92)" : "transparent",
          borderBottom: scrollY > 40 ? "1px solid #1a1a1a" : "1px solid transparent",
        }}
      >
        <img src={logoUrl} alt="BANCO" style={S.navLogo} />
        <div style={S.navLinks}>
          <a href={PATHS.app} style={S.navLink}>التطبيق</a>
          <a href={PATHS.market} style={S.navLink}>ماركت</a>
          <a href={PATHS.admin} style={{ ...S.navLink, opacity: 0.5 }}>إدارة</a>
        </div>
      </nav>

      {/* ── الـ Hero ── */}
      <header ref={heroRef} style={S.hero}>
        {/* توهج خلفي */}
        <div style={S.glow} />

        <img src={logoUrl} alt="BANCO" style={S.logo} />

        <h1 style={S.title}>بانكو</h1>
        <p style={S.subtitle}>سوق واحد لكل شيء</p>
        <p style={S.tagline}>
          سيارات · عقارات · تجارة · B2B · حجز يومي — على الموبايل والويب
        </p>

        {/* أزرار الدخول */}
        <div style={S.ctaGroup}>
          <a href={PATHS.app} style={S.ctaPrimary}>
            <span>📱</span>
            <span>ادخل التطبيق</span>
          </a>
          <a href={PATHS.market} style={S.ctaSecondary}>
            <span>🛒</span>
            <span>بانكو ماركت</span>
          </a>
        </div>

        <a href={PATHS.admin} style={S.adminLink}>لوحة التحكم ←</a>
      </header>

      {/* ── أقسام التطبيق ── */}
      <section style={S.sectionsWrap}>
        <h2 style={S.sectionTitle}>كل شيء في مكان واحد</h2>
        <div style={S.sectionsGrid}>
          {SECTIONS.map((s) => (
            <div key={s.en} style={S.sectionCard}>
              <span style={S.sectionIcon}>{s.icon}</span>
              <span style={S.sectionAr}>{s.ar}</span>
              <span style={S.sectionEn}>{s.en}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── لوحات الدخول السريع ── */}
      <section style={S.cardsRow}>
        {/* تطبيق الموبايل */}
        <a href={PATHS.app} style={{ ...S.card, borderColor: "#E8002D33" }}>
          <div style={{ ...S.cardAccent, background: "#E8002D" }} />
          <div style={S.cardIcon}>📱</div>
          <h3 style={S.cardTitle}>تطبيق بانكو</h3>
          <p style={S.cardBody}>التجربة الكاملة — كل الأقسام والخدمات في تطبيق واحد</p>
          <span style={{ ...S.cardCta, background: "#E8002D" }}>دخول ←</span>
        </a>

        {/* بانكو ماركت */}
        <a href={PATHS.market} style={{ ...S.card, borderColor: "#1FA97D33" }}>
          <div style={{ ...S.cardAccent, background: "#1FA97D" }} />
          <div style={S.cardIcon}>🛒</div>
          <h3 style={S.cardTitle}>بانكو ماركت</h3>
          <p style={S.cardBody}>منصة الويب للتجار والشركات — عرض الإعلانات وإدارة الأعمال</p>
          <span style={{ ...S.cardCta, background: "#1FA97D" }}>دخول ←</span>
        </a>

        {/* لوحة التحكم */}
        <a href={PATHS.admin} style={{ ...S.card, borderColor: "#6C63FF33" }}>
          <div style={{ ...S.cardAccent, background: "#6C63FF" }} />
          <div style={S.cardIcon}>⚙️</div>
          <h3 style={S.cardTitle}>لوحة التحكم</h3>
          <p style={S.cardBody}>إدارة المنصة — مستخدمون، إشراف، تحليلات، إيرادات</p>
          <span style={{ ...S.cardCta, background: "#6C63FF" }}>دخول ←</span>
        </a>
      </section>

      {/* ── الفوتر ── */}
      <footer style={S.footer}>
        <img src={logoUrl} alt="BANCO" style={{ height: 28, opacity: 0.5 }} />
        <p style={S.footerText}>
          banco.autos · banco.today · banco.deals
        </p>
        <p style={{ ...S.footerText, marginTop: 4 }}>
          © {new Date().getFullYear()} BANCO · جميع الحقوق محفوظة
        </p>
      </footer>
    </div>
    </DomainRouter>
  );
}

/* ─────────────────── الأنماط ─────────────────── */
const S: Record<string, React.CSSProperties> = {
  root: {
    minHeight: "100vh",
    background: "#000",
    color: "#fff",
    fontFamily:
      "'Cairo', 'IBM Plex Arabic', 'Segoe UI', system-ui, -apple-system, sans-serif",
    overflowX: "hidden",
  },

  /* ── nav ── */
  nav: {
    position: "fixed",
    top: 0,
    insetInline: 0,
    zIndex: 100,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "14px 32px",
    backdropFilter: "blur(12px)",
    transition: "background 0.3s, border-color 0.3s",
  },
  navLogo: { height: 28, width: "auto" },
  navLinks: { display: "flex", gap: 28, alignItems: "center" },
  navLink: {
    color: "#e0e0e0",
    textDecoration: "none",
    fontSize: 15,
    fontWeight: 600,
    transition: "color 0.2s",
  },

  /* ── hero ── */
  hero: {
    position: "relative",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    minHeight: "100vh",
    padding: "120px 24px 80px",
    gap: 16,
    overflow: "hidden",
  },
  glow: {
    position: "absolute",
    top: "30%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: 600,
    height: 600,
    borderRadius: "50%",
    background:
      "radial-gradient(circle, rgba(232,0,45,0.15) 0%, rgba(232,0,45,0.04) 50%, transparent 70%)",
    pointerEvents: "none",
    zIndex: 0,
  },
  logo: {
    position: "relative",
    zIndex: 1,
    width: "min(55vw, 180px)",
    height: "auto",
    marginBottom: 8,
    filter: "drop-shadow(0 0 40px rgba(232,0,45,0.4))",
  },
  title: {
    position: "relative",
    zIndex: 1,
    fontSize: "clamp(42px, 8vw, 72px)",
    fontWeight: 900,
    margin: 0,
    letterSpacing: "-1px",
    background: "linear-gradient(135deg, #fff 40%, #aaa)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  subtitle: {
    position: "relative",
    zIndex: 1,
    fontSize: "clamp(20px, 3.5vw, 30px)",
    fontWeight: 700,
    color: "#c8c8c8",
    margin: 0,
  },
  tagline: {
    position: "relative",
    zIndex: 1,
    fontSize: "clamp(14px, 2vw, 17px)",
    color: "#6a6a6a",
    margin: 0,
    lineHeight: 1.9,
    maxWidth: 540,
  },

  /* أزرار الدخول */
  ctaGroup: {
    position: "relative",
    zIndex: 1,
    display: "flex",
    gap: 14,
    flexWrap: "wrap",
    justifyContent: "center",
    marginTop: 12,
  },
  ctaPrimary: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: "#E8002D",
    color: "#fff",
    fontWeight: 800,
    fontSize: 17,
    padding: "14px 32px",
    borderRadius: 999,
    textDecoration: "none",
    boxShadow: "0 0 30px rgba(232,0,45,0.4)",
    transition: "transform 0.15s, box-shadow 0.15s",
  },
  ctaSecondary: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: "transparent",
    color: "#fff",
    fontWeight: 700,
    fontSize: 17,
    padding: "13px 28px",
    borderRadius: 999,
    border: "1.5px solid #333",
    textDecoration: "none",
    transition: "border-color 0.2s, background 0.2s",
  },
  adminLink: {
    position: "relative",
    zIndex: 1,
    color: "#444",
    fontSize: 13,
    textDecoration: "none",
    marginTop: 4,
    transition: "color 0.2s",
  },

  /* ── sections ── */
  sectionsWrap: {
    padding: "60px 24px",
    maxWidth: 900,
    margin: "0 auto",
    textAlign: "center",
  },
  sectionTitle: {
    fontSize: "clamp(20px, 3.5vw, 26px)",
    fontWeight: 800,
    color: "#fff",
    marginBottom: 32,
  },
  sectionsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
    gap: 16,
  },
  sectionCard: {
    background: "#0e0e0e",
    border: "1px solid #1c1c1c",
    borderRadius: 14,
    padding: "20px 14px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 8,
    transition: "border-color 0.2s",
  },
  sectionIcon: { fontSize: 28 },
  sectionAr: { fontSize: 13, fontWeight: 700, color: "#e0e0e0" },
  sectionEn: { fontSize: 11, color: "#555" },

  /* ── cards row ── */
  cardsRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: 20,
    maxWidth: 1000,
    margin: "0 auto",
    padding: "20px 24px 80px",
  },
  card: {
    position: "relative",
    background: "#0d0d0d",
    border: "1px solid #1c1c1c",
    borderRadius: 20,
    padding: "28px 24px",
    display: "flex",
    flexDirection: "column",
    gap: 10,
    textDecoration: "none",
    color: "#fff",
    overflow: "hidden",
    transition: "transform 0.2s, border-color 0.2s",
  },
  cardAccent: {
    position: "absolute",
    top: 0,
    insetInline: 0,
    height: 3,
    borderRadius: "20px 20px 0 0",
  },
  cardIcon: { fontSize: 30, marginTop: 4 },
  cardTitle: { fontSize: 18, fontWeight: 800, margin: 0 },
  cardBody: { fontSize: 13.5, color: "#888", lineHeight: 1.7, flexGrow: 1 },
  cardCta: {
    display: "inline-block",
    color: "#fff",
    fontWeight: 700,
    fontSize: 13.5,
    padding: "9px 20px",
    borderRadius: 999,
    marginTop: 6,
    alignSelf: "flex-start",
    textDecoration: "none",
  },

  /* ── footer ── */
  footer: {
    borderTop: "1px solid #111",
    padding: "32px 24px",
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 8,
  },
  footerText: { color: "#3a3a3a", fontSize: 12, margin: 0 },
};
