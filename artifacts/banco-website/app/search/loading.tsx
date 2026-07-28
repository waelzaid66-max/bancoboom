const skeletonStyle: React.CSSProperties = {
  maxWidth: 1080,
  margin: "0 auto",
  padding: "2rem 1.25rem",
};

const blockStyle: React.CSSProperties = {
  border: "1px solid var(--banco-border)",
  borderRadius: "var(--banco-radius)",
  background: "var(--banco-card)",
  padding: "1rem",
  minHeight: 120,
  opacity: 0.65,
  marginBottom: "0.75rem",
};

export default function SearchLoading() {
  return (
    <main style={skeletonStyle} aria-busy="true" aria-label="جاري تحميل البحث">
      <div style={{ ...blockStyle, minHeight: 48, maxWidth: 320 }} />
      <div style={blockStyle} />
      <div style={blockStyle} />
    </main>
  );
}
