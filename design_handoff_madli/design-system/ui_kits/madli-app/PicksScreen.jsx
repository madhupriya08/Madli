const { TopBar, Tabs, PickCard, PickSkeleton, IconButton, Badge, Button, Icon } = window.MadliDesignSystem_b70beb;

// The main view: exactly three picks for the chosen scope.
function PicksScreen({ scope, onScope, onOpen, loading }) {
  const d = window.MADLI_DATA;
  const picks = d.picks[scope];
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <TopBar
        title={d.area}
        subtitle={"3 picks · " + d.updated}
        trailing={<IconButton icon="sliders-horizontal" label="Filters" />}
      />
      <div style={{ flex: 1, overflowY: "auto", padding: "var(--space-4) var(--gutter-mobile) var(--space-6)", display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        <Tabs items={d.scopes} value={scope} onChange={onScope} style={{ alignSelf: "flex-start" }} />
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
          <h2 style={{ font: "var(--type-h2)", fontSize: 28 }}>
            {scope === "eat" ? "Eat tonight" : scope === "do" ? "Do this evening" : "Stay two nights"}
          </h2>
          <Badge tone="teal">Locals weighted</Badge>
        </div>
        {loading ? (
          <React.Fragment>
            <PickSkeleton />
            <PickSkeleton />
          </React.Fragment>
        ) : (
          picks.map((p) => (
            <PickCard key={p.name} {...p} photoLabel={p.name} dataWindow="last 90 days" onClick={() => onOpen(p)} />
          ))
        )}
        {!loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", padding: "var(--space-4) 0" }}>
            <p style={{ font: "var(--type-body-sm)", color: "var(--text-muted)" }}>
              That is the list. We stop at three on purpose.
            </p>
            <Button variant="secondary" size="sm" iconLeft={<Icon name="refresh-cw" size={16} />} style={{ alignSelf: "flex-start" }}>
              Re-rank without chains
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
window.PicksScreen = PicksScreen;
