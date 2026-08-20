const { SearchField, Button, Tag, Logo, Icon } = window.MadliDesignSystem_b70beb;

// Entry screen. One question, three shortcuts, one action.
function StartScreen({ onStart }) {
  const [q, setQ] = React.useState("Kadıköy, Istanbul");
  const [craving, setCraving] = React.useState("Dinner");
  const cravings = ["Dinner", "Breakfast", "Something to do", "A quiet night"];
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "var(--brand-cream)", padding: "var(--gutter-mobile)", paddingTop: 56, gap: "var(--space-6)" }}>
      <Logo variant="wordmark" height={30} assetBase="../../assets" />
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
        <h1 style={{ font: "var(--type-h1)", fontSize: 40 }}>Three picks, one reason each.</h1>
        <p style={{ font: "var(--type-body-lg)", color: "var(--slate-600)", maxWidth: "var(--reason-max)" }}>
          Ranked by people who actually eat here. Decide in two minutes.
        </p>
      </div>
      <SearchField value={q} onChange={(e) => setQ(e.target.value)} size="lg" placeholder="Where are you?" />
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
        <span style={{ font: "var(--type-eyebrow)", textTransform: "uppercase", letterSpacing: "var(--tracking-eyebrow)", color: "var(--slate-500)" }}>What are you after</span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)" }}>
          {cravings.map((c) => (
            <Tag key={c} selected={craving === c} onClick={() => setCraving(c)}>{c}</Tag>
          ))}
        </div>
      </div>
      <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: "var(--space-3)", paddingBottom: "var(--space-6)" }}>
        <Button variant="accent" size="lg" block onClick={onStart} iconRight={<Icon name="arrow-right" size={18} />}>Get 3 picks</Button>
        <p style={{ font: "var(--type-caption)", color: "var(--slate-500)", textAlign: "center" }}>
          1,284 local ratings in Kadıköy · last 90 days
        </p>
      </div>
    </div>
  );
}
window.StartScreen = StartScreen;
