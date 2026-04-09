import { useState } from "react";
import AccountList from "./pages/AccountList";
import AccountForm from "./pages/AccountForm";
import AccountDetail from "./pages/AccountDetail";
import AccountSettings from "./pages/AccountSettings";
import AccountApiKeys from "./pages/AccountApiKeys";
import PromptManager from "./pages/PromptManager";

type View =
  | { page: "list" }
  | { page: "create" }
  | { page: "edit"; id: string }
  | { page: "detail"; id: string }
  | { page: "settings"; id: string }
  | { page: "apikeys"; id: string }
  | { page: "prompts"; id: string };

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
          onEdit={(id) => setView({ page: "edit", id })}
        />
      )}
      {view.page === "create" && (
        <AccountForm onDone={() => setView({ page: "list" })} />
      )}
      {view.page === "edit" && (
        <AccountForm
          accountId={view.id}
          onDone={() => setView({ page: "detail", id: view.id })}
        />
      )}
      {view.page === "detail" && (
        <AccountDetail
          accountId={view.id}
          onBack={() => setView({ page: "list" })}
          onEdit={(id) => setView({ page: "edit", id })}
          onSettings={(id) => setView({ page: "settings", id })}
          onApiKeys={(id) => setView({ page: "apikeys", id })}
          onPrompts={(id) => setView({ page: "prompts", id })}
        />
      )}
      {view.page === "settings" && (
        <AccountSettings
          accountId={view.id}
          onBack={() => setView({ page: "detail", id: view.id })}
        />
      )}
      {view.page === "apikeys" && (
        <AccountApiKeys
          accountId={view.id}
          onBack={() => setView({ page: "detail", id: view.id })}
        />
      )}
      {view.page === "prompts" && (
        <PromptManager
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
