import { useAppStore } from "@/store/appStore";

export default function TabBar() {
  const tabs = useAppStore((s) => s.tabs);
  const activeTabId = useAppStore((s) => s.activeTabId);
  const setActiveTab = useAppStore((s) => s.setActiveTab);
  const closeTab = useAppStore((s) => s.closeTab);
  const newTab = useAppStore((s) => s.newTab);

  if (tabs.length <= 1) return null;

  return (
    <div className="tab-bar">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`tab${tab.id === activeTabId ? " tab-active" : ""}`}
          onClick={() => setActiveTab(tab.id)}
          title={tab.filePath || tab.fileName}
        >
          <span className="tab-label">
            {tab.dirty ? "\u25CF " : ""}{tab.fileName}
          </span>
          <span
            className="tab-close"
            role="button"
            aria-label={`Close ${tab.fileName}`}
            onClick={(e) => {
              e.stopPropagation();
              closeTab(tab.id);
            }}
          >
            &#x2715;
          </span>
        </button>
      ))}
      <button className="tab tab-new" onClick={newTab} title="New tab" aria-label="New tab">
        +
      </button>
    </div>
  );
}
