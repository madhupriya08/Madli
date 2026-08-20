const { TopBar, PhotoFrame, RankBadge, Badge, ReasonNote, RankGap, SampleSize, Button, IconButton, Icon, Card, Dialog, Tooltip } = window.MadliDesignSystem_b70beb;

// One pick, in full. The reason sits above everything transactional.
function PickDetailScreen({ pick, onBack, onSave }) {
  const [method, setMethod] = React.useState(false);
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}>
      <TopBar onBack={onBack} title={pick.name} trailing={<IconButton icon="share-2" label="Share" />} />
      <div style={{ flex: 1, overflowY: "auto" }}>
        <PhotoFrame label={pick.name} ratio="4 / 3" radius="0" overlay>
          <div style={{ position: "absolute", top: 14, left: 14, display: "flex", gap: 6, alignItems: "center" }}>
            <RankBadge rank={pick.rank} size="lg" />
            {pick.gem ? <Badge tone="onImage">Local gem</Badge> : null}
          </div>
          <div style={{ position: "absolute", bottom: 14, left: 16, right: 16, color: "var(--white)" }}>
            <div style={{ font: "var(--type-caption)", opacity: 0.85 }}>{pick.category} · {pick.priceLevel}</div>
            <div style={{ font: "var(--type-h2)", fontSize: 30, color: "var(--white)" }}>{pick.name}</div>
          </div>
        </PhotoFrame>
        <div style={{ padding: "var(--space-5) var(--gutter-mobile) var(--space-6)", display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
          <ReasonNote tone={pick.gem ? "gem" : "plain"} label={pick.gem ? "Why this is a gem" : "Why this one"}>{pick.reason}</ReasonNote>
          <Card padding="var(--space-4)" elevation="none" style={{ background: "var(--surface-sunken)", border: "none", display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <span style={{ font: "var(--type-label)", color: "var(--text-heading)" }}>Where it sits</span>
              <Tooltip label="Points are a 0–100 local score. The gap is what separates this pick from the next.">
                <Icon name="info" size={15} color="var(--text-faint)" />
              </Tooltip>
            </div>
            <RankGap tone={pick.gapTone} points={pick.gapPoints} note={pick.gapNote} />
            <SampleSize locals={pick.locals} visitors={pick.visitors} window="last 90 days" />
            <button onClick={() => setMethod(true)} style={{ background: "none", border: "none", padding: 0, textAlign: "left", font: "var(--type-body-sm)", color: "var(--text-link)", textDecoration: "underline", textUnderlineOffset: 3, cursor: "pointer" }}>
              How this was ranked
            </button>
          </Card>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            {[["map-pin", pick.address], ["footprints", pick.walk], ["clock", pick.open]].map(([ic, text]) => (
              <div key={text} style={{ display: "flex", alignItems: "center", gap: 10, font: "var(--type-body)", color: "var(--text-body)" }}>
                <Icon name={ic} size={17} color="var(--text-faint)" />{text}
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: "var(--space-2)" }}>
            <Button variant="primary" size="lg" style={{ flex: 1 }} iconLeft={<Icon name="navigation" size={18} />}>Directions</Button>
            <Button variant="secondary" size="lg" onClick={onSave} iconLeft={<Icon name="bookmark" size={18} />}>Save</Button>
          </div>
        </div>
      </div>
      <Dialog
        open={method} variant="sheet" title="How this was ranked" onClose={() => setMethod(false)}
        footer={<Button variant="primary" size="sm" onClick={() => setMethod(false)}>Got it</Button>}
      >
        <p style={{ font: "var(--type-body)", color: "var(--text-body)" }}>{pick.method}</p>
        <SampleSize locals={pick.locals} visitors={pick.visitors} window="last 90 days" extra="ratings older than 18 months dropped" />
      </Dialog>
    </div>
  );
}
window.PickDetailScreen = PickDetailScreen;
