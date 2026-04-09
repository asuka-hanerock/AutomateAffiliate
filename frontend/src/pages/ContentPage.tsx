import { useEffect, useState } from "react";
import PromptManager from "./PromptManager";
import FormatManager from "./FormatManager";
import QuoteTargetManager from "./QuoteTargetManager";

interface Props {
  accountId: string;
  onBack: () => void;
}

const tabs = [
  { key: "prompts", label: "プロンプト" },
  { key: "formats", label: "流行構文" },
  { key: "quotes", label: "引用対象" },
] as const;

type TabKey = (typeof tabs)[number]["key"];

export default function ContentPage({ accountId, onBack }: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>("prompts");
  const [xPremiumTier, setXPremiumTier] = useState("none");

  useEffect(() => {
    fetch(`/api/accounts/${accountId}`)
      .then((r) => r.json())
      .then((data) => setXPremiumTier(data.xPremiumTier ?? "none"));
  }, [accountId]);

  const isPremium = xPremiumTier !== "none";

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

      <h2 style={{ marginBottom: 16 }}>コンテンツ</h2>

      {/* タブ */}
      <div
        style={{
          display: "flex",
          gap: 0,
          borderBottom: "2px solid #e0e0e0",
          marginBottom: 20,
        }}
      >
        {tabs.map((tab) => {
          const disabled = tab.key === "quotes" && !isPremium;
          return (
            <button
              key={tab.key}
              onClick={() => !disabled && setActiveTab(tab.key)}
              style={{
                padding: "10px 20px",
                border: "none",
                borderBottom:
                  activeTab === tab.key
                    ? "2px solid #794bc4"
                    : "2px solid transparent",
                background: "none",
                cursor: disabled ? "not-allowed" : "pointer",
                fontSize: 14,
                fontWeight: activeTab === tab.key ? 600 : 400,
                color: disabled
                  ? "#ccc"
                  : activeTab === tab.key
                    ? "#794bc4"
                    : "#666",
                marginBottom: -2,
                opacity: disabled ? 0.5 : 1,
              }}
              title={disabled ? "Xプレミアムが必要です" : ""}
            >
              {tab.label}
              {disabled && " 🔒"}
            </button>
          );
        })}
      </div>

      {/* タブコンテンツ */}
      {activeTab === "prompts" && (
        <PromptManager accountId={accountId} onBack={() => {}} embedded />
      )}
      {activeTab === "formats" && (
        <FormatManager accountId={accountId} onBack={() => {}} embedded />
      )}
      {activeTab === "quotes" && (
        <QuoteTargetManager accountId={accountId} isPremium={isPremium} />
      )}
    </div>
  );
}
