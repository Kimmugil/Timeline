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
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-lg p-6 shadow-xl">
        <h2 className="text-lg font-bold text-slate-900 mb-6">게임 등록</h2>

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

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-slate-200 text-slate-600 py-3 rounded-lg hover:bg-slate-50 transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white py-3 rounded-lg transition-colors"
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
  "w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-slate-900 text-sm focus:outline-none focus:border-blue-500 transition-colors placeholder-slate-400";

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
      <label className="block text-sm text-slate-600 mb-1">{label}</label>
      {children}
      {hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
    </div>
  );
}
