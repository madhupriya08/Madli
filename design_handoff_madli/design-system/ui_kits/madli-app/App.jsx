const { TabBar, Toast } = window.MadliDesignSystem_b70beb;

function App() {
  const [view, setView] = React.useState("start");
  const [tab, setTab] = React.useState("picks");
  const [scope, setScope] = React.useState("eat");
  const [pick, setPick] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [toast, setToast] = React.useState(null);

  const start = () => {
    setView("app"); setLoading(true);
    setTimeout(() => setLoading(false), 900);
  };
  const changeScope = (s) => {
    setScope(s); setLoading(true);
    setTimeout(() => setLoading(false), 600);
  };
  const save = () => {
    setToast("Saved to Kadıköy list");
    setTimeout(() => setToast(null), 2600);
  };

  let body;
  if (view === "start") body = <window.StartScreen onStart={start} />;
  else if (pick) body = <window.PickDetailScreen pick={pick} onBack={() => setPick(null)} onSave={save} />;
  else if (tab === "picks") body = <window.PicksScreen scope={scope} onScope={changeScope} onOpen={setPick} loading={loading} />;
  else if (tab === "map") body = <window.MapScreen />;
  else if (tab === "saved") body = <window.SavedScreen onOpen={() => { setTab("picks"); setPick(window.MADLI_DATA.picks.eat[0]); }} />;
  else body = <window.ProfileScreen />;

  return (
    <div className="phone">
      <div className="statusbar"><span>9:41</span><span style={{ display: "flex", gap: 5 }}><span>Kadıköy</span><span>100%</span></span></div>
      {body}
      {toast ? (
        <div style={{ position: "absolute", left: 16, right: 16, bottom: 92, zIndex: 50 }}>
          <Toast tone="success" actionLabel="Undo" action={() => setToast(null)}>{toast}</Toast>
        </div>
      ) : null}
      {view === "app" && !pick ? (
        <TabBar value={tab} onChange={(t) => { setTab(t); setPick(null); }} items={[
          { value: "picks", label: "Picks", icon: "sparkles" },
          { value: "map", label: "Map", icon: "map" },
          { value: "saved", label: "Saved", icon: "bookmark" },
          { value: "you", label: "You", icon: "user" },
        ]} />
      ) : null}
    </div>
  );
}
window.App = App;
