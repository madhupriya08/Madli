const { PickCard, Card, Button, Badge, Icon, Logo, Tabs, SampleSize } = window.MadliDesignSystem_b70beb;

function SamplePicks() {
  const [scope, setScope] = React.useState("eat");
  const d = window.MADLI_DATA;
  return (
    <section style={{ background: "var(--brand-cream)", borderTop: "1px solid var(--border-hairline)", borderBottom: "1px solid var(--border-hairline)" }}>
      <div style={{ maxWidth: "var(--content-max)", margin: "0 auto", padding: "var(--space-11) var(--gutter-desktop)", display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "var(--space-6)", flexWrap: "wrap" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            <span style={{ font: "var(--type-eyebrow)", textTransform: "uppercase", letterSpacing: "var(--tracking-eyebrow)", color: "var(--slate-500)" }}>Tonight in Kadıköy, Istanbul</span>
            <h2 style={{ font: "var(--type-h2)" }}>What you actually get</h2>
          </div>
          <Tabs items={d.scopes} value={scope} onChange={setScope} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "var(--space-5)" }}>
          {d.picks[scope].map((p) => (
            <PickCard key={p.name} {...p} photoLabel={p.name} dataWindow="last 90 days" />
          ))}
        </div>
        <p style={{ font: "var(--type-body-sm)", color: "var(--slate-600)" }}>Three, then it stops. The gap and the sample size are on every card, including the ones we are unsure about.</p>
      </div>
    </section>
  );
}

function TrustSection() {
  const rows = [
    ["We show the gap", "When #1 and #2 are three points apart we print it. A near-tie is useful information, not a problem to hide."],
    ["We show the sample", "Every pick carries the real count: 412 locals, 88 visitors, last 90 days. Nothing says 'thousands of reviews'."],
    ["We stop at three", "A longer list is easier to build and harder to use. If we cannot separate three places honestly, we say the data is thin."],
    ["We do not sell rank", "Nothing in the top three is paid for. There is no promoted slot and no plan to add one."],
  ];
  return (
    <section style={{ background: "var(--teal-800)", color: "var(--text-on-dark)" }}>
      <div style={{ maxWidth: "var(--content-max)", margin: "0 auto", padding: "var(--space-11) var(--gutter-desktop)", display: "grid", gridTemplateColumns: "0.9fr 1.1fr", gap: "var(--space-10)" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          <h2 style={{ font: "var(--type-h2)", color: "var(--white)" }}>Why you can trust the order</h2>
          <p style={{ font: "var(--type-body-lg)", color: "var(--text-on-dark-muted)", maxWidth: "40ch" }}>
            The whole product is one promise: the ranking is honest about what it knows and what it does not.
          </p>
          <Button variant="inverse" size="md" style={{ alignSelf: "flex-start", marginTop: "var(--space-2)" }} iconRight={<Icon name="arrow-right" size={17} />}>Read the method</Button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-6) var(--space-7)" }}>
          {rows.map(([t, b]) => (
            <div key={t} style={{ display: "flex", flexDirection: "column", gap: 6, paddingTop: "var(--space-3)", borderTop: "1px solid var(--border-on-dark)" }}>
              <span style={{ font: "var(--type-h4)", color: "var(--white)" }}>{t}</span>
              <p style={{ font: "var(--type-body-sm)", color: "var(--text-on-dark-muted)" }}>{b}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CitiesSection() {
  const cities = [["Istanbul", "1,284 local ratings", "34 areas"], ["Lisbon", "902 local ratings", "12 areas"], ["Mexico City", "1,105 local ratings", "21 areas"], ["Naples", "480 local ratings", "9 areas"], ["Hanoi", "356 local ratings", "7 areas"], ["Tbilisi", "212 local ratings", "5 areas"]];
  return (
    <section style={{ background: "var(--bg-page)" }}>
      <div style={{ maxWidth: "var(--content-max)", margin: "0 auto", padding: "var(--space-11) var(--gutter-desktop)", display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: "var(--space-4)" }}>
          <h2 style={{ font: "var(--type-h2)" }}>Where we rank</h2>
          <Badge tone="neutral">34 cities</Badge>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "var(--space-4)" }}>
          {cities.map(([c, r, a]) => (
            <Card key={c} interactive padding="var(--space-4)" style={{ display: "flex", alignItems: "center", gap: "var(--space-4)" }}>
              <div style={{ flex: 1 }}>
                <div style={{ font: "var(--type-h4)" }}>{c}</div>
                <SampleSize extra={a} window={r} />
              </div>
              <Icon name="chevron-right" size={18} color="var(--text-faint)" />
            </Card>
          ))}
        </div>
        <p style={{ font: "var(--type-body-sm)", color: "var(--text-muted)" }}>
          A city goes live when it has 50 local ratings in at least three neighbourhoods. Until then it stays off the list.
        </p>
      </div>
    </section>
  );
}

function SiteFooter() {
  const cols = [["Product", ["How ranking works", "Cities", "Gems", "Download"]], ["Company", ["About", "Method", "Careers", "Press"]], ["Legal", ["Privacy", "Terms", "Rating policy"]]];
  return (
    <footer style={{ background: "var(--brand-cream)", borderTop: "1px solid var(--border-hairline)" }}>
      <div style={{ maxWidth: "var(--content-max)", margin: "0 auto", padding: "var(--space-9) var(--gutter-desktop)", display: "grid", gridTemplateColumns: "1.4fr repeat(3, 1fr)", gap: "var(--space-8)" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          <Logo variant="mark" height={44} assetBase="../../assets" />
          <p style={{ font: "var(--type-body-sm)", color: "var(--slate-600)", maxWidth: "28ch" }}>3 picks. 1 reason. 2 minutes.</p>
        </div>
        {cols.map(([title, items]) => (
          <div key={title} style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            <span style={{ font: "var(--type-eyebrow)", textTransform: "uppercase", letterSpacing: "var(--tracking-eyebrow)", color: "var(--slate-500)" }}>{title}</span>
            {items.map((i) => <a key={i} href="#" style={{ font: "var(--type-body-sm)", borderBottom: "none", color: "var(--slate-600)" }}>{i}</a>)}
          </div>
        ))}
      </div>
    </footer>
  );
}

Object.assign(window, { SamplePicks, TrustSection, CitiesSection, SiteFooter });
