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

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{ background: "rgba(0,0,0,0.5)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="neo-card w-full max-w-lg p-6">
        <h2 className="text-lg font-black mb-6" style={{ color: "var(--text)" }}>🎮 게임 등록</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="게임명 *">
            <input type="text" required value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="neo-input w-full px-4 py-3 text-sm"
              placeholder="예: 메이플 키우기" />
          </Field>

          <Field label="DC 갤러리 raw 시트" hint="구글 시트 URL 또는 ID">
            <input type="text" value={form.dcRawSheetId}
              onChange={(e) => setForm({ ...form, dcRawSheetId: e.target.value })}
              className="neo-input w-full px-4 py-3 text-sm"
              placeholder="https://docs.google.com/spreadsheets/d/..." />
          </Field>

          <Field label="DC 시트 탭 이름" hint="기본값: 시트1">
            <input type="text" value={form.dcSheetTab}
              onChange={(e) => setForm({ ...form, dcSheetTab: e.target.value })}
              className="neo-input w-full px-4 py-3 text-sm"
              placeholder="시트1" />
          </Field>

          <Field label="포럼 raw 시트" hint="공지사항/패치노트/이벤트 탭이 있는 시트">
            <input type="text" value={form.forumRawSheetId}
              onChange={(e) => setForm({ ...form, forumRawSheetId: e.target.value })}
              className="neo-input w-full px-4 py-3 text-sm"
              placeholder="https://docs.google.com/spreadsheets/d/..." />
          </Field>

          {!prefilledPw && (
            <div className="pt-2" style={{ borderTop: "2px solid #E2E8F0" }}>
              <Field label="🔑 관리자 비밀번호 *">
                <input type="password" required value={form.adminPassword}
                  onChange={(e) => setForm({ ...form, adminPassword: e.target.value })}
                  className="neo-input w-full px-4 py-3 text-sm"
                  placeholder="관리자 비밀번호를 입력하세요"
                  autoComplete="current-password" />
              </Field>
            </div>
          )}

          {error && (
            <p className="text-sm font-bold rounded-xl px-4 py-2"
              style={{ background: "#FEE2E2", color: "#991B1B", border: "1.5px solid #FCA5A5" }}>
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="neo-btn flex-1 py-3 text-sm" style={{ background: "var(--bg)" }}>
              취소
            </button>
            <button type="submit" disabled={loading}
              className="neo-btn flex-1 py-3 text-sm"
              style={{ background: loading ? "var(--bg)" : "#FFD600" }}>
              {loading ? "등록 중..." : "등록"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const inputClass = "neo-input w-full px-4 py-3 text-sm";

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-black mb-1.5" style={{ color: "var(--text)" }}>{label}</label>
      {children}
      {hint && <p className="text-xs font-medium mt-1" style={{ color: "var(--text-muted)" }}>{hint}</p>}
    </div>
  );
}
