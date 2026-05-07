"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useUiText } from "@/lib/use-ui-text";

export default function LoginPage() {
  const router = useRouter();
  const { t } = useUiText();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      router.push("/dashboard");
    } else {
      const data = await res.json();
      setError(data.error || t("login.error_wrong", "로그인 실패"));
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900">
            {t("login.title", "게임 이슈 타임라인")}
          </h1>
          <p className="text-slate-500 text-sm mt-2">
            {t("login.subtitle", "내부 분석 대시보드")}
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white border border-slate-200 rounded-xl p-8 space-y-4 shadow-sm"
        >
          <div>
            <label className="block text-sm text-slate-600 mb-2">
              {t("login.password_label", "관리자 비밀번호")}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-slate-900 focus:outline-none focus:border-blue-500 transition-colors placeholder-slate-400"
              placeholder={t("login.password_placeholder", "비밀번호를 입력하세요")}
              autoFocus
            />
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 rounded-lg transition-colors"
          >
            {loading ? t("login.loading", "로그인 중...") : t("login.submit", "로그인")}
          </button>
        </form>
      </div>
    </div>
  );
}
