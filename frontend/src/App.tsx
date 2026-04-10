import { useState } from "react";
import AccountList from "./pages/AccountList";
import AccountForm from "./pages/AccountForm";
import AccountDetail from "./pages/AccountDetail";
import SettingsPage from "./pages/SettingsPage";
import ContentPage from "./pages/ContentPage";
import UsageDashboard from "./pages/UsageDashboard";

type View =
  | { page: "list" }
  | { page: "create" }
  | { page: "detail"; id: string }
  | { page: "settings"; id: string }
  | { page: "content"; id: string }
  | { page: "usage"; id: string };

export default function App() {
  const [view, setView] = useState<View>({ page: "list" });

  return (
    <div
      style={{
        maxWidth: 800,
        margin: "0 auto",
        padding: 20,
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 24,
          borderBottom: "2px solid #1da1f2",
          paddingBottom: 12,
        }}
      >
        <h1
          style={{ fontSize: 24, margin: 0, cursor: "pointer" }}
          onClick={() => setView({ page: "list" })}
        >
          AutomateAffiliate
        </h1>
        {view.page !== "create" && (
          <button onClick={() => setView({ page: "create" })} style={btnStyle}>
            + 新規アカウント
          </button>
        )}
      </header>

      {view.page === "list" && (
        <AccountList
          onSelect={(id) => setView({ page: "detail", id })}
          onEdit={(id) => setView({ page: "settings", id })}
        />
      )}
      {view.page === "create" && (
        <AccountForm onDone={() => setView({ page: "list" })} />
      )}
      {view.page === "detail" && (
        <AccountDetail
          accountId={view.id}
          onBack={() => setView({ page: "list" })}
          onSettings={(id) => setView({ page: "settings", id })}
          onContent={(id) => setView({ page: "content", id })}
          onUsage={(id) => setView({ page: "usage", id })}
        />
      )}
      {view.page === "settings" && (
        <SettingsPage
          accountId={view.id}
          onBack={() => setView({ page: "detail", id: view.id })}
        />
      )}
      {view.page === "content" && (
        <ContentPage
          accountId={view.id}
          onBack={() => setView({ page: "detail", id: view.id })}
        />
      )}
      {view.page === "usage" && (
        <UsageDashboard
          accountId={view.id}
          onBack={() => setView({ page: "detail", id: view.id })}
        />
      )}
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  background: "#1da1f2",
  color: "#fff",
  border: "none",
  borderRadius: 6,
  padding: "8px 16px",
  cursor: "pointer",
  fontSize: 14,
  fontWeight: 600,
};
