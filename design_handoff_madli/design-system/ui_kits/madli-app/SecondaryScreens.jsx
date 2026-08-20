const { TopBar, Card, PhotoFrame, Button, EmptyState, Switch, Radio, Icon, Badge, SampleSize } = window.MadliDesignSystem_b70beb;

function SavedScreen({ onOpen }) {
  const items = window.MADLI_DATA.saved;
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <TopBar title="Saved" subtitle={items.length + " places · 1 list"} />
      <div style={{ flex: 1, overflowY: "auto", padding: "var(--space-4) var(--gutter-mobile) var(--space-6)", display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
        {items.map((s) => (
          <Card key={s.name} padding="var(--space-3)" interactive onClick={onOpen} style={{ display: "flex", gap: "var(--space-3)", alignItems: "center" }}>
            <PhotoFrame label={s.name} ratio="1 / 1" radius="var(--radius-md)" style={{ width: 56, flex: "0 0 56px" }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ font: "var(--type-h4)", fontSize: 17, color: "var(--text-heading)" }}>{s.name}</div>
              <div style={{ font: "var(--type-body-sm)", color: "var(--text-muted)" }}>{s.area}</div>
              <div style={{ font: "var(--type-evidence)", color: "var(--evidence-text)", marginTop: 2 }}>{s.note}</div>
            </div>
            <Icon name="chevron-right" size={18} color="var(--text-faint)" />
          </Card>
        ))}
        <EmptyState
          icon="folder-plus" title="One list is usually enough"
          body="Make another only if you are planning a different trip."
          action={<Button variant="secondary" size="sm">New list</Button>}
          style={{ padding: "var(--space-7) var(--space-4)" }}
        />
      </div>
    </div>
  );
}

function ProfileScreen() {
  const [gaps, setGaps] = React.useState(true);
  const [chains, setChains] = React.useState(false);
  const [basis, setBasis] = React.useState("locals");
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <TopBar title="You" subtitle="Kadıköy · 34 ratings given" />
      <div style={{ flex: 1, overflowY: "auto", padding: "var(--space-4) var(--gutter-mobile) var(--space-6)", display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        <Card padding="var(--space-4)" style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ font: "var(--type-label)", color: "var(--text-heading)" }}>Your local status</span>
            <Badge tone="teal">Local · Kadıköy</Badge>
          </div>
          <p style={{ font: "var(--type-body-sm)", color: "var(--text-body)" }}>
            Your ratings in Kadıköy count at full weight. Elsewhere they count as a visitor.
          </p>
          <SampleSize extra="34 ratings given · 18 in Kadıköy" window="" />
        </Card>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          <span style={{ font: "var(--type-eyebrow)", textTransform: "uppercase", letterSpacing: "var(--tracking-eyebrow)", color: "var(--text-muted)" }}>How you want it ranked</span>
          <Radio name="basis" label="Locals only" description="Ignores visitor ratings entirely" checked={basis === "locals"} onChange={() => setBasis("locals")} />
          <Radio name="basis" label="Locals weighted" description="Visitors count for a fifth as much" checked={basis === "weighted"} onChange={() => setBasis("weighted")} />
          <Switch label="Show ranking gaps" description="Tell me when #1 and #2 are close" checked={gaps} onChange={setGaps} />
          <Switch label="Include chains" description="Off by default" checked={chains} onChange={setChains} />
        </div>
      </div>
    </div>
  );
}

function MapScreen() {
  const { EmptyState: ES, Button: B } = window.MadliDesignSystem_b70beb;
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <TopBar title="Map" subtitle="Kadıköy · 3 picks" />
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--surface-sunken)" }}>
        <ES icon="map" title="Map view not in the source material" body="No map screen was supplied for this kit, so it is left blank rather than invented." action={<B variant="secondary" size="sm">Back to picks</B>} />
      </div>
    </div>
  );
}

Object.assign(window, { SavedScreen, ProfileScreen, MapScreen });
