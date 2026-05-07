"use client";

import { useState } from "react";

type Props = {
  gameId: string;
  fromDate: string;
  toDate: string;
  onSuccess: () => void;
  label?: string;
};

export default function AiGenerateButton({ gameId, fromDate, toDate, onSuccess, label }: Props) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>("");
  const [actionsUrl, setActionsUrl] = useState<string>("");

  async function handleGenerate() {
    if (!confirm(`${fromDate} ~ ${toDate} 기간의 타임라인을 AI로 생성합니다.\n(기존 타임라인은 덮어씌워집니다)\n\nGitHub Actions에서 실행되며 수 분 소요됩니다.`)) {
      return;
    }

    // 관리자 비밀번호 입력
    const adminPassword = window.prompt("관리자 비밀번호를 입력하세요");
    if (adminPassword === null) return; // 취소

    setLoading(true);
    setActionsUrl("");
    setStatus("GitHub Actions 실행 중...");

    try {
      const res = await fetch(`/api/ai/generate/${gameId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromDate, toDate, adminPassword }),
      });

      const data = await res.json();
      if (res.ok) {
        setActionsUrl(data.actionsUrl || "");
        setStatus("✅ 워크플로우 시작됨! 완료 후 새로고침하세요.");
        onSuccess();
      } else {
        setStatus(`❌ ${data.error}`);
      }
    } catch {
      setStatus("❌ 요청 실패");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button
        onClick={handleGenerate}
        disabled={loading}
        className="bg-violet-500 hover:bg-violet-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm px-4 py-2 rounded-lg transition-colors"
      >
        {loading ? "⏳ 요청 중..." : (label || "✨ AI 타임라인 생성")}
      </button>
      {status && <span className="text-xs text-slate-500">{status}</span>}
      {actionsUrl && (
        <a
          href={actionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-violet-500 hover:underline"
        >
          GitHub Actions 진행 상황 →
        </a>
      )}
    </div>
  );
}
