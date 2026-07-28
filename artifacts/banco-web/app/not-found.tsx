import Link from "next/link";

const mainStyle: React.CSSProperties = {
  maxWidth: 640,
  margin: "0 auto",
  padding: "3rem 1.25rem",
  textAlign: "center",
};

const mutedStyle: React.CSSProperties = {
  color: "var(--banco-muted)",
  lineHeight: 1.7,
};

const gridStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "0.5rem",
  justifyContent: "center",
  marginTop: "1.25rem",
};

const pillStyle: React.CSSProperties = {
  border: "1px solid var(--banco-border)",
  borderRadius: 999,
  padding: "0.35rem 0.85rem",
  fontSize: "0.85rem",
  textDecoration: "none",
  color: "inherit",
};

export const metadata = {
  title: "غير موجود",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <main style={mainStyle}>
      <h1 style={{ marginTop: 0 }}>الصفحة غير موجودة</h1>
      <p style={mutedStyle}>
        الرابط غير صحيح أو تم نقل الصفحة. جرّب أحد مراكز التصفح أدناه.
      </p>
      <div style={gridStyle}>
        <Link href="/" style={pillStyle}>
          الرئيسية
        </Link>
        <Link href="/cars" style={pillStyle}>
          سيارات
        </Link>
        <Link href="/real-estate" style={pillStyle}>
          عقارات
        </Link>
        <Link href="/industrial" style={pillStyle}>
          صناعي
        </Link>
        <Link href="/search" style={pillStyle}>
          بحث
        </Link>
      </div>
    </main>
  );
}
