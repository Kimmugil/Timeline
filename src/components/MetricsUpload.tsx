"use client";

import { useState, useRef } from "react";

type Props = {
  gameId: number;
  onSuccess: () => void;
};

export default function MetricsUpload({ gameId, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>("");
  const [error, setError] = useState<string>("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleUpload() {
    const file = fileRef.current?.files?.[0];
    if (!file) return;

    setLoading(true);
    setError("");
    setResult("");

    const text = await file.text();
    const res = await fetch(`/api/metrics/${gameId}/upload`, {
      method: "POST",
      headers: { "Content-Type": "text/csv" },
      body: text,
    });

    const data = await res.json();
    if (res.ok) {
      setResult(
        `✅ ${data.uploadedRows}행 업로드 완료. 컬럼: ${(data.metricColumns || []).join(", ")}`
      );
      onSuccess();
    } else {
      setError(data.error || "업로드 실패");
    }
    setLoading(false);
  }

  return (
    <div className="bg-[#1a1f2e] border border-[#2d3748] rounded-xl p-5">
      <h3 className="font-semibold mb-3">지표 데이터 업로드</h3>
      <p className="text-[#94a3b8] text-xs mb-4">
        CSV 형식: 첫 행은 컬럼명 (date 필수), 이후 행은 데이터
        <br />
        예) <code className="bg-[#0f1117] px-1 rounded">date,dau,revenue,paying_users</code>
      </p>

      <div className="flex items-center gap-3">
        <input
          ref={fileRef}
          type="file"
          accept=".csv"
          className="text-sm text-[#94a3b8] file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-[#2d3748] file:text-white file:cursor-pointer hover:file:bg-[#3d4a5f]"
        />
        <button
          onClick={handleUpload}
          disabled={loading}
          className="bg-[#3b82f6] hover:bg-[#2563eb] disabled:opacity-50 text-white text-sm px-5 py-2 rounded-lg transition-colors whitespace-nowrap"
        >
          {loading ? "업로드 중..." : "업로드"}
        </button>
      </div>

      {result && <p className="text-green-400 text-sm mt-3">{result}</p>}
      {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
    </div>
  );
}
