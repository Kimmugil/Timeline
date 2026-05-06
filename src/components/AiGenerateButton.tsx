"use client";

import { useState } from "react";

type Props = {
  gameId: number;
  fromDate: string;
  toDate: string;
  onSuccess: () => void;
};

export default function AiGenerateButton({ gameId, fromDate, toDate, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>("");

  async function handleGenerate() {
    if (
      !confirm(
        `${fromDate} ~ ${toDate} 기간의 타임라인을 AI로 생성합니다.\n(기존 타임라인은 덮어씌워집니다)\n\n계속하시겠습니까?`
      )
    )
      return;

    setLoading(true);
    setStatus("AI 분석 중... (수 분 소요될 수 있습니다)");

    try {
      const res = await fetch(`/api/ai/generate/${gameId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromDate, toDate }),
      });

      const data = await res.json();
      if (res.ok) {
        setStatus(`✅ 완료! ${data.itemCount}개 타임라인 생성`);
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
    <div className="flex items-center gap-2">
      <button
        onClick={handleGenerate}
        disabled={loading}
        className="bg-[#8b5cf6] hover:bg-[#7c3aed] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm px-4 py-2 rounded-lg transition-colors"
      >
        {loading ? "⏳ 분석 중..." : "✨ AI 타임라인 생성"}
      </button>
      {status && (
        <span className="text-xs text-[#94a3b8]">{status}</span>
      )}
    </div>
  );
}
