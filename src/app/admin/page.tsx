"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { GameConfig } from "@/lib/types";
import GameRegistrationModal from "@/components/GameRegistrationModal";

const SESSION_KEY = "admin_pw";

function sheetUrl(id: string | null) {
  return id ? `https://docs.google.com/spreadsheets/d/${id}` : null;
}

// ── AI 생성 컨트롤 ──
function AiGenerateControl({ game, adminPassword }: { game: GameConfig; adminPassword: string }) {
  const today = new Date();
  const threeMonthsAgo = new Date(today);
  threeMonthsAgo.setMonth(today.getMonth() - 3);

  const [fromDate, setFromDate] = useState(threeMonthsAgo.toISOString().slice(0, 10));
  const [toDate, setToDate]     = useState(today.toISOString().slice(0, 10));
  const [loading, setLoading]   = useState(false);
  const [status, setStatus]     = useState("");
  const [actionsUrl, setActionsUrl] = useState("");

  async function handleGenerate() {
    if (!confirm(`"${game.name}" 타임라인을 AI로 생성합니다.\n기간: ${fromDate} ~ ${toDate}\n\n기존 타임라인은 덮어씌워집니다.`)) return;
    setLoading(true); setActionsUrl(""); setStatus("GitHub Actions 실행 중...");
    try {
      const res = await fetch(`/api/ai/generate/${game.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromDate, toDate, adminPassword }),
      });
      const data = await res.json();
      if (res.ok) { setActionsUrl(data.actionsUrl || ""); setStatus("✅ 워크플로우 시작됨! 완료까지 수 분 소요됩니다."); }
      else setStatus(`❌ ${data.error}`);
    } catch { setStatus("❌ 요청 실패"); }
    finally { setLoading(false); }
  }

  return (
    <div className="mt-4 pt-4 border-t border-gray-100">
      <p className="text-xs font-semibold text-gray-500 mb-2">✨ AI 타임라인 생성</p>
      <div className="flex items-center gap-2 flex-wrap">
        <input
          type="date" lang="en" value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
          className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-gray-400 transition-colors"
        />
        <span className="text-xs text-gray-400">–</span>
        <input
          type="date" lang="en" value={toDate}
          onChange={(e) => setToDate(e.target.value)}
          className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-gray-400 transition-colors"
        />
        <button
          onClick={handleGenerate} disabled={loading}
          className="bg-gray-900 hover:bg-gray-700 disabled:bg-gray-300 text-white text-xs px-3 py-1.5 rounded-lg transition-colors"
        >
          {loading ? "⏳ 요청 중..." : "✨ AI 생성"}
        </button>
      </div>
      {status && <p className="text-xs text-gray-600 mt-1.5">{status}</p>}
      {actionsUrl && (
        <a href={actionsUrl} target="_blank" rel="noopener noreferrer"
          className="text-xs text-blue-500 hover:underline mt-0.5 block">
          GitHub Actions 진행 상황 →
        </a>
      )}
    </div>
  );
}

// ── 시트 변경 폼 ──
function SheetEditForm({ game, adminPassword, onDone }: {
  game: GameConfig; adminPassword: string; onDone: () => void;
}) {
  const [form, setForm] = useState({
    dcRawSheetId: game.dc_raw_sheet_id || "",
    dcSheetTab: game.dc_sheet_tab || "시트1",
    forumRawSheetId: game.forum_raw_sheet_id || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  function extractId(input: string) {
    const match = input.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : input.trim();
  }

  async function handleSave() {
    setSaving(true); setError("");
    try {
      const res = await fetch(`/api/games/${game.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminPassword,
          dcRawSheetId: extractId(form.dcRawSheetId),
          dcSheetTab: form.dcSheetTab,
          forumRawSheetId: extractId(form.forumRawSheetId),
        }),
      });
      if (res.ok) onDone();
      else { const d = await res.json(); setError(d.error || "저장 실패"); }
    } catch { setError("요청 실패"); }
    finally { setSaving(false); }
  }

  const inputCls = "border border-gray-200 rounded-lg px-3 py-2 text-xs w-full outline-none focus:border-gray-400 transition-colors";

  return (
    <div className="mt-3 pt-3 border-t border-gray-100 space-y-2.5">
      <p className="text-xs font-semibold text-gray-500">🔧 시트 연결 변경</p>
      <div>
        <label className="text-[11px] font-medium text-gray-500 mb-1 block">DC 갤러리 시트</label>
        <input type="text" value={form.dcRawSheetId}
          onChange={(e) => setForm({ ...form, dcRawSheetId: e.target.value })}
          className={inputCls} placeholder="시트 URL 또는 ID" />
      </div>
      <div>
        <label className="text-[11px] font-medium text-gray-500 mb-1 block">DC 탭 이름</label>
        <input type="text" value={form.dcSheetTab}
          onChange={(e) => setForm({ ...form, dcSheetTab: e.target.value })}
          className={inputCls} placeholder="시트1" />
      </div>
      <div>
        <label className="text-[11px] font-medium text-gray-500 mb-1 block">포럼 시트</label>
        <input type="text" value={form.forumRawSheetId}
          onChange={(e) => setForm({ ...form, forumRawSheetId: e.target.value })}
          className={inputCls} placeholder="시트 URL 또는 ID" />
      </div>
      {error && (
        <p className="text-xs px-3 py-1.5 rounded-lg bg-red-50 text-red-600 border border-red-200">{error}</p>
      )}
      <div className="flex gap-2">
        <button onClick={handleSave} disabled={saving}
          className="flex-1 bg-gray-900 hover:bg-gray-700 disabled:bg-gray-300 text-white text-xs py-1.5 rounded-lg transition-colors">
          {saving ? "저장 중..." : "저장"}
        </button>
        <button onClick={onDone}
          className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors">
          취소
        </button>
      </div>
    </div>
  );
}

// ── 시트 상태 행 ──
function SheetStatusRow({ on, onText, offText, url, accent }: {
  on: boolean; onText: string; offText: string; url: string | null; accent?: boolean;
}) {
  const dotColor = on ? (accent ? "bg-blue-400" : "bg-emerald-400") : "bg-gray-300";
  return (
    <div className="flex items-center justify-between gap-2">
      <div className={`flex items-center gap-2 text-xs ${on ? "text-gray-600" : "text-gray-400"}`}>
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />
        {on ? onText : offText}
      </div>
      {on && url && (
        <a href={url} target="_blank" rel="noopener noreferrer"
          className="text-[10px] text-blue-500 hover:underline shrink-0">
          시트 열기 ↗
        </a>
      )}
    </div>
  );
}

// ── 게임 카드 ──
function GameCard({ game, adminPassword, onRefresh }: {
  game: GameConfig; adminPassword: string; onRefresh: () => void;
}) {
  const router = useRouter();
  const [editingSheets, setEditingSheets] = useState(false);

  const dcUrl      = sheetUrl(game.dc_raw_sheet_id);
  const forumUrl   = sheetUrl(game.forum_raw_sheet_id);
  const timelineUrl = sheetUrl(game.processed_sheet_id);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">{game.name}</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            등록일: {new Date(game.created_at).toLocaleDateString("ko-KR")}
          </p>
        </div>
        <button
          onClick={() => router.push(`/dashboard/${game.id}`)}
          className="text-xs border border-gray-200 px-2.5 py-1 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors shrink-0"
        >
          타임라인 →
        </button>
      </div>

      <div className="space-y-1.5 mb-1">
        <SheetStatusRow on={!!game.dc_raw_sheet_id} onText="DC 갤러리 시트" offText="DC 갤러리 시트 미연결" url={dcUrl} />
        <SheetStatusRow on={!!game.forum_raw_sheet_id} onText="포럼 시트" offText="포럼 시트 미연결" url={forumUrl} />
        <SheetStatusRow on={!!game.processed_sheet_id} onText="타임라인 시트" offText="타임라인 시트 미생성" url={timelineUrl} accent />
      </div>

      {!editingSheets && (
        <button
          onClick={() => setEditingSheets(true)}
          className="mt-2 text-[11px] text-gray-400 hover:text-gray-600 hover:underline transition-colors"
        >
          🔧 시트 변경
        </button>
      )}

      {editingSheets && (
        <SheetEditForm
          game={game}
          adminPassword={adminPassword}
          onDone={() => { setEditingSheets(false); onRefresh(); }}
        />
      )}

      <AiGenerateControl game={game} adminPassword={adminPassword} />
    </div>
  );
}

// ── 비밀번호 입력 화면 ──
function PasswordGate({ onSuccess }: { onSuccess: (pw: string) => void }) {
  const [pw, setPw]           = useState("");
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminPassword: pw }),
      });
      if (res.ok) { sessionStorage.setItem(SESSION_KEY, pw); onSuccess(pw); }
      else setError("비밀번호가 올바르지 않습니다.");
    } catch { setError("요청 실패. 다시 시도해주세요."); }
    finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white border border-gray-200 rounded-lg p-8 w-full max-w-sm">
        <div className="mb-6">
          <p className="text-2xl mb-2">🔑</p>
          <h1 className="text-lg font-semibold text-gray-900 mb-1">관리자 패널</h1>
          <p className="text-sm text-gray-400">비밀번호를 입력하세요</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="password" value={pw} onChange={(e) => setPw(e.target.value)}
            autoFocus required placeholder="비밀번호"
            className="border border-gray-200 rounded-lg px-4 py-3 text-sm w-full outline-none focus:border-gray-400 transition-colors"
          />
          {error && (
            <p className="text-sm px-4 py-2 rounded-lg bg-red-50 text-red-600 border border-red-200">
              {error}
            </p>
          )}
          <button
            type="submit" disabled={loading}
            className="w-full bg-gray-900 hover:bg-gray-700 disabled:bg-gray-300 text-white text-sm py-3 rounded-lg transition-colors font-medium"
          >
            {loading ? "확인 중..." : "입장 →"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── 관리자 패널 메인 ──
export default function AdminPage() {
  const router = useRouter();
  const [adminPassword, setAdminPassword] = useState<string | null>(null);
  const [games, setGames]                 = useState<GameConfig[]>([]);
  const [loading, setLoading]             = useState(false);
  const [showModal, setShowModal]         = useState(false);
  const [adminSheetUrl, setAdminSheetUrl] = useState<string | null>(null);

  useEffect(() => {
    const saved = sessionStorage.getItem(SESSION_KEY);
    if (saved) setAdminPassword(saved);
  }, []);

  useEffect(() => {
    if (adminPassword) {
      fetchGames();
      fetchAdminSheetUrl();
    }
  }, [adminPassword]);

  async function fetchGames() {
    setLoading(true);
    const res = await fetch("/api/games");
    if (res.ok) setGames((await res.json()).games);
    setLoading(false);
  }

  async function fetchAdminSheetUrl() {
    try {
      const res = await fetch("/api/admin/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminPassword }),
      });
      if (res.ok) {
        const data = await res.json();
        setAdminSheetUrl(data.adminSheetUrl || null);
      }
    } catch { /* 무시 */ }
  }

  function handleLogout() {
    sessionStorage.removeItem(SESSION_KEY);
    setAdminPassword(null);
  }

  if (!adminPassword) return <PasswordGate onSuccess={setAdminPassword} />;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-gray-900 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 h-12 flex items-center gap-3 flex-wrap">
          <button
            onClick={() => router.push("/dashboard")}
            className="text-gray-400 hover:text-white transition-colors text-xs"
          >
            ← 대시보드
          </button>
          <span className="border-l border-gray-700 pl-3 text-sm font-semibold text-white">
            관리자 패널
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-400 text-yellow-900 font-medium">
            🔑 관리자 모드
          </span>
          <div className="ml-auto flex items-center gap-2 flex-wrap">
            {adminSheetUrl && (
              <a
                href={adminSheetUrl} target="_blank" rel="noopener noreferrer"
                className="text-xs text-gray-400 hover:text-white transition-colors px-3 py-1.5 rounded hover:bg-gray-800"
              >
                📊 관리자 시트 ↗
              </a>
            )}
            <button
              onClick={() => setShowModal(true)}
              className="text-xs bg-white text-gray-900 hover:bg-gray-100 font-medium px-3 py-1.5 rounded-lg transition-colors"
            >
              + 게임 등록
            </button>
            <button
              onClick={handleLogout}
              className="text-xs text-gray-400 hover:text-white transition-colors px-3 py-1.5 rounded hover:bg-gray-800"
            >
              로그아웃
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2].map((i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-lg h-48 animate-pulse" />
            ))}
          </div>
        ) : games.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg text-center py-20">
            <p className="text-2xl mb-3">🎮</p>
            <p className="text-sm text-gray-500 mb-4">등록된 게임이 없습니다.</p>
            <button
              onClick={() => setShowModal(true)}
              className="bg-gray-900 hover:bg-gray-700 text-white text-sm px-5 py-2 rounded-lg transition-colors"
            >
              첫 번째 게임 등록하기
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {games.map((game) => (
              <GameCard
                key={game.id}
                game={game}
                adminPassword={adminPassword}
                onRefresh={fetchGames}
              />
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
