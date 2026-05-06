"use client";

import { useState, FormEvent } from "react";

type Props = {
  onClose: () => void;
  onSuccess: () => void;
};

export default function GameRegistrationModal({ onClose, onSuccess }: Props) {
  const [form, setForm] = useState({
    name: "",
    dcRawSheetId: "",
    dcSheetTab: "시트1",
    forumRawSheetId: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function extractSheetId(input: string): string {
    // 구글 시트 URL에서 ID 추출 or 직접 ID 입력 모두 지원
    const match = input.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : input.trim();
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/games", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        dcRawSheetId: extractSheetId(form.dcRawSheetId),
        dcSheetTab: form.dcSheetTab || "시트1",
        forumRawSheetId: extractSheetId(form.forumRawSheetId),
      }),
    });

    const data = await res.json();
    if (res.ok) {
      onSuccess();
    } else {
      setError(data.error || "등록 실패");
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-[#1a1f2e] border border-[#2d3748] rounded-xl w-full max-w-lg p-6">
        <h2 className="text-lg font-bold mb-6">게임 등록</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="게임명 *">
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={inputClass}
              placeholder="예: 메이플 키우기"
            />
          </Field>

          <Field
            label="DC 갤러리 raw 시트"
            hint="구글 시트 URL 또는 ID를 입력하세요"
          >
            <input
              type="text"
              value={form.dcRawSheetId}
              onChange={(e) => setForm({ ...form, dcRawSheetId: e.target.value })}
              className={inputClass}
              placeholder="https://docs.google.com/spreadsheets/d/..."
            />
          </Field>

          <Field
            label="DC 시트 탭 이름"
            hint="기본값: 시트1"
          >
            <input
              type="text"
              value={form.dcSheetTab}
              onChange={(e) => setForm({ ...form, dcSheetTab: e.target.value })}
              className={inputClass}
              placeholder="시트1"
            />
          </Field>

          <Field
            label="포럼 raw 시트"
            hint="공지사항/패치노트/이벤트 탭이 있는 시트"
          >
            <input
              type="text"
              value={form.forumRawSheetId}
              onChange={(e) => setForm({ ...form, forumRawSheetId: e.target.value })}
              className={inputClass}
              placeholder="https://docs.google.com/spreadsheets/d/..."
            />
          </Field>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-[#2d3748] text-[#94a3b8] py-3 rounded-lg hover:text-white transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-[#3b82f6] hover:bg-[#2563eb] disabled:opacity-50 text-white py-3 rounded-lg transition-colors"
            >
              {loading ? "등록 중..." : "등록"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const inputClass =
  "w-full bg-[#0f1117] border border-[#2d3748] rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-[#3b82f6] transition-colors placeholder-[#4a5568]";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm text-[#94a3b8] mb-1">{label}</label>
      {children}
      {hint && <p className="text-xs text-[#4a5568] mt-1">{hint}</p>}
    </div>
  );
}
