"use client";

import { useState, FormEvent } from "react";

type Props = {
  onClose: () => void;
  onSuccess: () => void;
  adminPassword?: string;
};

export default function GameRegistrationModal({ onClose, onSuccess, adminPassword: prefilledPw }: Props) {
  const [form, setForm] = useState({
    name: "",
    dcRawSheetId: "",
    dcSheetTab: "시트1",
    forumRawSheetId: "",
    adminPassword: prefilledPw || "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  function extractSheetId(input: string): string {
    const match = input.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : input.trim();
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");
    const res = await fetch("/api/games", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        dcRawSheetId: extractSheetId(form.dcRawSheetId),
        dcSheetTab: form.dcSheetTab || "시트1",
        forumRawSheetId: extractSheetId(form.forumRawSheetId),
        adminPassword: form.adminPassword,
      }),
    });
    const data = await res.json();
    if (res.ok) onSuccess();
    else { setError(data.error || "등록 실패"); setLoading(false); }
  }

  const inputCls = "border border-gray-200 rounded-lg px-3 py-2.5 text-sm w-full outline-none focus:border-gray-400 transition-colors";

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{ background: "rgba(0,0,0,0.4)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white border border-gray-200 rounded-lg w-full max-w-lg p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-5">🎮 게임 등록</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="게임명 *">
            <input
              type="text" required value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={inputCls}
              placeholder="예: 메이플 키우기"
            />
          </Field>

          <Field label="DC 갤러리 raw 시트" hint="구글 시트 URL 또는 ID">
            <input
              type="text" value={form.dcRawSheetId}
              onChange={(e) => setForm({ ...form, dcRawSheetId: e.target.value })}
              className={inputCls}
              placeholder="https://docs.google.com/spreadsheets/d/..."
            />
          </Field>

          <Field label="DC 시트 탭 이름" hint="기본값: 시트1">
            <input
              type="text" value={form.dcSheetTab}
              onChange={(e) => setForm({ ...form, dcSheetTab: e.target.value })}
              className={inputCls}
              placeholder="시트1"
            />
          </Field>

          <Field label="포럼 raw 시트" hint="공지사항/패치노트/이벤트 탭이 있는 시트">
            <input
              type="text" value={form.forumRawSheetId}
              onChange={(e) => setForm({ ...form, forumRawSheetId: e.target.value })}
              className={inputCls}
              placeholder="https://docs.google.com/spreadsheets/d/..."
            />
          </Field>

          {!prefilledPw && (
            <div className="pt-2 border-t border-gray-100">
              <Field label="🔑 관리자 비밀번호 *">
                <input
                  type="password" required value={form.adminPassword}
                  onChange={(e) => setForm({ ...form, adminPassword: e.target.value })}
                  className={inputCls}
                  placeholder="관리자 비밀번호를 입력하세요"
                  autoComplete="current-password"
                />
              </Field>
            </div>
          )}

          {error && (
            <p className="text-sm px-3 py-2 rounded-lg bg-red-50 text-red-600 border border-red-200">
              {error}
            </p>
          )}

          <div className="flex gap-2.5 pt-1">
            <button
              type="button" onClick={onClose}
              className="flex-1 py-2.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors"
            >
              취소
            </button>
            <button
              type="submit" disabled={loading}
              className="flex-1 py-2.5 text-sm bg-gray-900 hover:bg-gray-700 disabled:bg-gray-300 text-white rounded-lg transition-colors font-medium"
            >
              {loading ? "등록 중..." : "등록"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}
