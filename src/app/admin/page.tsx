"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { GameConfig } from "@/lib/types";
import GameRegistrationModal from "@/components/GameRegistrationModal";

const SESSION_KEY = "admin_pw";

// ──────────────────────────────────────────
// AI 생성 컨트롤 (per-game)
// ──────────────────────────────────────────
function AiGenerateControl({ game, adminPassword }: { game: GameConfig; adminPassword: string }) {
  const today = new Date();
  const threeMonthsAgo = new Date(today);
  threeMonthsAgo.setMonth(today.getMonth() - 3);

  const [fromDate, setFromDate] = useState(threeMonthsAgo.toISOString().slice(0, 10));
  const [toDate, setToDate] = useState(today.toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [actionsUrl, setActionsUrl] = useState("");

  async function handleGenerate() {
    if (!confirm(`"${game.name}" 타임라인을 AI로 생성합니다.\n기간: ${fromDate} ~ ${toDate}\n\n기존 타임라인은 덮어씌워집니다.`)) return;

    setLoading(true);
    setActionsUrl("");
    setStatus("GitHub Actions 실행 중...");

    try {
      const res = await fetch(`/api/ai/generate/${game.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromDate, toDate, adminPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        setActionsUrl(data.actionsUrl || "");
        setStatus("✅ 워크플로우 시작됨! 완료까지 수 분 소요됩니다.");
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
    <div className="mt-3 pt-3 border-t border-slate-100">
      <p className="text-xs font-medium text-slate-500 mb-2">AI 타임라인 생성</p>
      <div className="flex items-center gap-2 flex-wrap">
        <input
          type="date"
          lang="en"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-900 text-xs focus:outline-none focus:border-blue-400"
        />
        <span className="text-slate-300 text-xs">–</span>
        <input
          type="date"
          lang="en"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-900 text-xs focus:outline-none focus:border-blue-400"
        />
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="bg-violet-500 hover:bg-violet-600 disabled:opacity-50 text-white text-xs px-3 py-1.5 rounded-lg transition-colors"
        >
          {loading ? "⏳ 요청 중..." : "✨ AI 생성"}
        </button>
      </div>
      {status && <p className="text-xs text-slate-500 mt-1.5">{status}</p>}
      {actionsUrl && (
        <a href={actionsUrl} target="_blank" rel="noopener noreferrer"
          className="text-xs text-violet-500 hover:underline mt-0.5 block">
          GitHub Actions 진행 상황 →
        </a>
      )}
    </div>
  );
}

// ──────────────────────────────────────────
// 비밀번호 입력 화면
// ──────────────────────────────────────────
function PasswordGate({ onSuccess }: { onSuccess: (pw: string) => void }) {
  const [pw, setPw] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminPassword: pw }),
      });
      if (res.ok) {
        sessionStorage.setItem(SESSION_KEY, pw);
        onSuccess(pw);
      } else {
        setError("비밀번호가 올바르지 않습니다.");
      }
    } catch {
      setError("요청 실패. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8 w-full max-w-sm">
        <h1 className="text-xl font-bold text-slate-900 mb-1">관리자 패널</h1>
        <p className="text-sm text-slate-400 mb-6">관리자 비밀번호를 입력하세요</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            autoFocus
            required
            placeholder="비밀번호"
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-slate-900 text-sm focus:outline-none focus:border-blue-500 transition-colors"
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white py-3 rounded-lg text-sm font-medium transition-colors"
          >
            {loading ? "확인 중..." : "입장"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────
// 관리자 패널 메인
// ──────────────────────────────────────────
export default function AdminPage() {
  const router = useRouter();
  const [adminPassword, setAdminPassword] = useState<string | null>(null);
  const [games, setGames] = useState<GameConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // 세션에 저장된 비번 복원
  useEffect(() => {
    const saved = sessionStorage.getItem(SESSION_KEY);
    if (saved) setAdminPassword(saved);
  }, []);

  useEffect(() => {
    if (adminPassword) fetchGames();
  }, [adminPassword]);

  async function fetchGames() {
    setLoading(true);
    const res = await fetch("/api/games");
    if (res.ok) {
      const data = await res.json();
      setGames(data.games);
    }
    setLoading(false);
  }

  function handleLogout() {
    sessionStorage.removeItem(SESSION_KEY);
    setAdminPassword(null);
  }

  if (!adminPassword) {
    return <PasswordGate onSuccess={setAdminPassword} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* 헤더 */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/dashboard")}
            className="text-slate-400 hover:text-slate-900 transition-colors text-sm"
          >
            ← 대시보드
          </button>
          <h1 className="text-lg font-bold text-slate-900">관리자 패널</h1>
          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
            🔑 관리자
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-500 hover:bg-blue-600 text-white text-sm px-4 py-2 rounded-lg transition-colors"
          >
            + 게임 등록
          </button>
          <button
            onClick={handleLogout}
            className="text-slate-400 hover:text-red-500 text-sm border border-slate-200 px-3 py-2 rounded-lg transition-colors"
          >
            로그아웃
          </button>
        </div>
      </header>

      <main className="p-6 max-w-4xl mx-auto">
        {loading ? (
          <div className="text-slate-400 text-center py-20">로딩 중...</div>
        ) : games.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-slate-400 mb-4">등록된 게임이 없습니다.</p>
            <button
              onClick={() => setShowModal(true)}
              className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors"
            >
              첫 번째 게임 등록하기
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {games.map((game) => (
              <div key={game.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="text-base font-semibold text-slate-900">{game.name}</h2>
                    <p className="text-slate-400 text-xs mt-0.5">
                      등록일: {new Date(game.created_at).toLocaleDateString("ko-KR")}
                    </p>
                  </div>
                  <button
                    onClick={() => router.push(`/dashboard/${game.id}`)}
                    className="text-xs text-blue-500 hover:underline shrink-0"
                  >
                    타임라인 보기 →
                  </button>
                </div>

                <div className="space-y-1 text-xs text-slate-500 mt-3">
                  <StatusDot on={!!game.dc_raw_sheet_id} onText="DC 갤러리 시트 연결됨" offText="DC 갤러리 시트 미연결" />
                  <StatusDot on={!!game.forum_raw_sheet_id} onText="포럼 시트 연결됨" offText="포럼 시트 미연결" />
                  <StatusDot on={!!game.processed_sheet_id} onText="타임라인 시트 생성됨" offText="타임라인 시트 미생성" color="blue" />
                </div>

                <AiGenerateControl game={game} adminPassword={adminPassword} />
              </div>
            ))}
          </div>
        )}
      </main>

      {showModal && (
        <GameRegistrationModal
          adminPassword={adminPassword}
          onClose={() => setShowModal(false)}
          onSuccess={() => { setShowModal(false); fetchGames(); }}
        />
      )}
    </div>
  );
}

function StatusDot({ on, onText, offText, color = "green" }: {
  on: boolean; onText: string; offText: string; color?: "green" | "blue";
}) {
  const dotColor = on ? (color === "blue" ? "bg-blue-400" : "bg-emerald-400") : "bg-slate-300";
  return (
    <div className="flex items-center gap-2">
      <span className={`w-2 h-2 rounded-full ${dotColor}`} />
      {on ? onText : offText}
    </div>
  );
}
