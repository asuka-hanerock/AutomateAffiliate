import { useState } from "react";
import AccountForm from "./AccountForm";
import AccountSettings from "./AccountSettings";
import AccountApiKeys from "./AccountApiKeys";

interface Props {
  accountId: string;
  onBack: () => void;
}

const tabs = [
  { key: "profile", label: "プロフィール" },
  { key: "posting", label: "投稿設定" },
  { key: "api", label: "API連携" },
] as const;

type TabKey = (typeof tabs)[number]["key"];

export default function SettingsPage({ accountId, onBack }: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>("profile");

  return (
    <div>
      <button
        onClick={onBack}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "#1da1f2",
          marginBottom: 16,
          padding: 0,
        }}
      >
        ← 戻る
      </button>

      <h2 style={{ marginBottom: 16 }}>設定</h2>

      {/* タブ */}
      <div
        style={{
          display: "flex",
          gap: 0,
          borderBottom: "2px solid #e0e0e0",
          marginBottom: 20,
        }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: "10px 20px",
              border: "none",
              borderBottom:
                activeTab === tab.key
                  ? "2px solid #1da1f2"
                  : "2px solid transparent",
              background: "none",
              cursor: "pointer",
              fontSize: 14,
              fontWeight: activeTab === tab.key ? 600 : 400,
              color: activeTab === tab.key ? "#1da1f2" : "#666",
              marginBottom: -2,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* タブコンテンツ */}
      {activeTab === "profile" && (
        <AccountForm accountId={accountId} onDone={onBack} />
      )}
      {activeTab === "posting" && (
        <AccountSettings accountId={accountId} onBack={() => {}} embedded />
      )}
      {activeTab === "api" && (
        <AccountApiKeys accountId={accountId} onBack={() => {}} embedded />
      )}
    </div>
  );
}
