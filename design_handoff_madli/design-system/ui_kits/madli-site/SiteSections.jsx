const { Logo, Button, Icon, SearchField, Badge } = window.MadliDesignSystem_b70beb;

function SiteHeader({ page, onPage }) {
  const links = [["how", "How ranking works"], ["cities", "Cities"], ["gems", "Gems"]];
  return (
    <header style={{ position: "sticky", top: 0, zIndex: 30, background: "var(--bar-scrim)", backdropFilter: "var(--blur-bar)", WebkitBackdropFilter: "var(--blur-bar)", borderBottom: "1px solid var(--border-hairline)" }}>
      <div style={{ maxWidth: "var(--content-max)", margin: "0 auto", padding: "14px var(--gutter-desktop)", display: "flex", alignItems: "center", gap: "var(--space-7)" }}>
        <Logo variant="wordmark" height={24} assetBase="../../assets" />
        <nav style={{ display: "flex", gap: "var(--space-6)", flex: 1 }}>
          {links.map(([k, l]) => (
            <button key={k} onClick={() => onPage(k)} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", font: "var(--type-body-sm)", color: page === k ? "var(--text-heading)" : "var(--text-muted)", borderBottom: page === k ? "1.5px solid var(--teal-500)" : "1.5px solid transparent", paddingBottom: 2 }}>{l}</button>
          ))}
        </nav>
        <Button variant="ghost" size="sm">Sign in</Button>
        <Button variant="accent" size="sm">Get the app</Button>
      </div>
    </header>
  );
}

function Hero() {
  const [q, setQ] = React.useState("");
  return (
    <section style={{ background: "var(--brand-cream)", borderBottom: "1px solid var(--border-hairline)" }}>
      <div style={{ maxWidth: "var(--content-max)", margin: "0 auto", padding: "var(--space-12) var(--gutter-desktop)", display: "grid", gridTemplateColumns: "1.05fr 0.95fr", gap: "var(--space-10)", alignItems: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
          <span style={{ font: "var(--type-eyebrow)", textTransform: "uppercase", letterSpacing: "var(--tracking-eyebrow)", color: "var(--slate-500)" }}>Locally ranked food &amp; travel</span>
          <h1 style={{ font: "var(--type-display)", fontSize: 68 }}>Three picks.<br />One reason each.</h1>
          <p style={{ font: "var(--type-body-lg)", color: "var(--slate-600)", maxWidth: "48ch" }}>
            Not a list of forty places. Three, ranked by the people who eat there every week, with the reason written out so you can decide in two minutes.
          </p>
          <div style={{ maxWidth: 420, display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            <SearchField size="lg" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Which city are you in?" />
            <p style={{ font: "var(--type-caption)", color: "var(--slate-500)" }}>34 cities ranked · 1.2M local ratings · gaps and sample sizes shown on every pick</p>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <img src="../../assets/logo-madli-full.png" alt="Madli" style={{ width: "78%", maxWidth: 420, mixBlendMode: "multiply" }} />
        </div>
      </div>
    </section>
  );
}

function HowSection() {
  const steps = [
    ["map-pin", "Say where you are", "One field. City or neighbourhood — Madli ranks at the neighbourhood level because that is how people actually choose."],
    ["scale", "We weight locals", "A rating counts at full weight where you live and a fifth as much where you are visiting. Ratings older than 18 months are dropped."],
    ["list-ordered", "You get three", "With the reason, the gap to the next pick, and the number of people behind it. If the top two are nearly tied, we say so."],
  ];
  return (
    <section style={{ background: "var(--bg-page)" }}>
      <div style={{ maxWidth: "var(--content-max)", margin: "0 auto", padding: "var(--space-11) var(--gutter-desktop)", display: "flex", flexDirection: "column", gap: "var(--space-8)" }}>
        <h2 style={{ font: "var(--type-h2)", maxWidth: "22ch" }}>How the ranking works</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "var(--space-7)" }}>
          {steps.map(([ic, title, body], i) => (
            <div key={title} style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", paddingTop: "var(--space-4)", borderTop: "2px solid var(--teal-200)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Icon name={ic} size={20} color="var(--teal-500)" />
                <span style={{ font: "var(--type-eyebrow)", textTransform: "uppercase", letterSpacing: "var(--tracking-eyebrow)", color: "var(--slate-500)" }}>Step {i + 1}</span>
              </div>
              <h4 style={{ font: "var(--type-h4)" }}>{title}</h4>
              <p style={{ font: "var(--type-body)", color: "var(--text-body)" }}>{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

Object.assign(window, { SiteHeader, Hero, HowSection });
