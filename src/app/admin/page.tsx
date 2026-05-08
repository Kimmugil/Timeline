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
    <div className="mt-4 pt-4" style={{ borderTop: "1.5px solid #E2E8F0" }}>
      <p className="section-label mb-2">✨ AI 타임라인 생성</p>
      <div className="flex items-center gap-2 flex-wrap">
        <input type="date" lang="en" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="neo-input text-xs px-2.5 py-1.5" />
        <span className="text-xs font-bold" style={{ color: "var(--text-muted)" }}>–</span>
        <input type="date" lang="en" value={toDate} onChange={(e) => setToDate(e.target.value)} className="neo-input text-xs px-2.5 py-1.5" />
        <button onClick={handleGenerate} disabled={loading} className="neo-btn text-xs px-3 py-1.5"
          style={{ background: loading ? "var(--bg)" : "#FFD600" }}>
          {loading ? "⏳ 요청 중..." : "✨ AI 생성"}
        </button>
      </div>
      {status && <p className="text-xs font-medium mt-1.5" style={{ color: "var(--text-2)" }}>{status}</p>}
      {actionsUrl && (
        <a href={actionsUrl} target="_blank" rel="noopener noreferrer"
          className="text-xs font-bold hover:underline mt-0.5 block" style={{ color: "#7c3aed" }}>
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

  return (
    <div className="mt-3 pt-3 space-y-2.5" style={{ borderTop: "1.5px solid #E2E8F0" }}>
      <p className="section-label">🔧 시트 연결 변경</p>
      <div>
        <label className="text-[11px] font-black mb-1 block" style={{ color: "var(--text-2)" }}>DC 갤러리 시트</label>
        <input type="text" value={form.dcRawSheetId} onChange={(e) => setForm({ ...form, dcRawSheetId: e.target.value })}
          className="neo-input w-full px-3 py-2 text-xs" placeholder="시트 URL 또는 ID" />
      </div>
      <div>
        <label className="text-[11px] font-black mb-1 block" style={{ color: "var(--text-2)" }}>DC 탭 이름</label>
        <input type="text" value={form.dcSheetTab} onChange={(e) => setForm({ ...form, dcSheetTab: e.target.value })}
          className="neo-input w-full px-3 py-2 text-xs" placeholder="시트1" />
      </div>
      <div>
        <label className="text-[11px] font-black mb-1 block" style={{ color: "var(--text-2)" }}>포럼 시트</label>
        <input type="text" value={form.forumRawSheetId} onChange={(e) => setForm({ ...form, forumRawSheetId: e.target.value })}
          className="neo-input w-full px-3 py-2 text-xs" placeholder="시트 URL 또는 ID" />
      </div>
      {error && <p className="text-xs font-bold px-3 py-1.5 rounded-lg" style={{ background: "#FEE2E2", color: "#991B1B" }}>{error}</p>}
      <div className="flex gap-2">
        <button onClick={handleSave} disabled={saving} className="neo-btn flex-1 py-1.5 text-xs"
          style={{ background: saving ? "var(--bg)" : "#FFD600" }}>
          {saving ? "저장 중..." : "저장"}
        </button>
        <button onClick={onDone} className="neo-btn px-3 py-1.5 text-xs" style={{ background: "var(--bg)" }}>
          취소
        </button>
      </div>
    </div>
  );
}

// ── 게임 카드 ──
function GameCard({ game, adminPassword, onRefresh }: {
  game: GameConfig; adminPassword: string; onRefresh: () => void;
}) {
  const router = useRouter();
  const [editingSheets, setEditingSheets] = useState(false);

  const dcUrl     = sheetUrl(game.dc_raw_sheet_id);
  const forumUrl  = sheetUrl(game.forum_raw_sheet_id);
  const timelineUrl = sheetUrl(game.processed_sheet_id);

  return (
    <div className="neo-card p-5">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <h2 className="font-black text-base" style={{ color: "var(--text)" }}>{game.name}</h2>
          <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
            등록일: {new Date(game.created_at).toLocaleDateString("ko-KR")}
          </p>
        </div>
        <button onClick={() => router.push(`/dashboard/${game.id}`)}
          className="neo-btn text-xs px-2.5 py-1 shrink-0" style={{ background: "var(--bg)" }}>
          타임라인 →
        </button>
      </div>

      {/* 시트 상태 + 바로가기 */}
      <div className="space-y-1.5 mb-1">
        <SheetStatusRow
          on={!!game.dc_raw_sheet_id} onText="DC 갤러리 시트" offText="DC 갤러리 시트 미연결"
          url={dcUrl} />
        <SheetStatusRow
          on={!!game.forum_raw_sheet_id} onText="포럼 시트" offText="포럼 시트 미연결"
          url={forumUrl} />
        <SheetStatusRow
          on={!!game.processed_sheet_id} onText="타임라인 시트" offText="타임라인 시트 미생성"
          url={timelineUrl} accent />
      </div>

      {/* 시트 변경 버튼 */}
      {!editingSheets && (
        <button onClick={() => setEditingSheets(true)}
          className="mt-2 text-[11px] font-black hover:underline"
          style={{ color: "var(--text-muted)" }}>
          🔧 시트 변경
        </button>
      )}

      {/* 시트 변경 폼 */}
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

function SheetStatusRow({ on, onText, offText, url, accent }: {
  on: boolean; onText: string; offText: string; url: string | null; accent?: boolean;
}) {
  const color = on ? (accent ? "#3b82f6" : "#10b981") : "#D1D5DB";
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 text-xs font-medium"
        style={{ color: on ? "var(--text-2)" : "var(--text-muted)" }}>
        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
        {on ? onText : offText}
      </div>
      {on && url && (
        <a href={url} target="_blank" rel="noopener noreferrer"
          className="text-[10px] font-black hover:underline shrink-0"
          style={{ color: "#3b82f6" }}>
          시트 열기 ↗
        </a>
      )}
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
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "var(--bg)" }}>
      <div className="neo-card p-8 w-full max-w-sm">
        <div className="mb-6">
          <p className="text-2xl mb-2">🔑</p>
          <h1 className="text-xl font-black mb-1" style={{ color: "var(--text)" }}>관리자 패널</h1>
          <p className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>비밀번호를 입력하세요</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="password" value={pw} onChange={(e) => setPw(e.target.value)}
            autoFocus required placeholder="비밀번호"
            className="neo-input w-full px-4 py-3 text-sm" />
          {error && (
            <p className="text-sm font-bold rounded-xl px-4 py-2"
              style={{ background: "#FEE2E2", color: "#991B1B", border: "1.5px solid #FCA5A5" }}>
              {error}
            </p>
          )}
          <button type="submit" disabled={loading} className="neo-btn w-full py-3 text-sm"
            style={{ background: loading ? "var(--bg)" : "#FFD600" }}>
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
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      {/* 헤더 */}
      <header className="bg-white sticky top-0 z-20" style={{ borderBottom: "2px solid #1A1A1A" }}>
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-3 flex-wrap">
          <button onClick={() => router.push("/dashboard")}
            className="neo-btn px-3 py-1.5 text-xs" style={{ background: "var(--bg)" }}>
            ← 대시보드
          </button>
          <h1 className="text-base font-black" style={{ color: "var(--text)" }}>관리자 패널</h1>
          <span className="text-xs font-black px-2.5 py-1 rounded-full"
            style={{ background: "#FEF9C3", color: "#854D0E", border: "1.5px solid #FDE047" }}>
            🔑 관리자 모드
          </span>
          <div className="ml-auto flex items-center gap-2.5 flex-wrap">
            {adminSheetUrl && (
              <a href={adminSheetUrl} target="_blank" rel="noopener noreferrer"
                className="neo-btn px-3 py-1.5 text-xs" style={{ background: "var(--bg)" }}>
                📊 관리자 시트 ↗
              </a>
            )}
            <button onClick={() => setShowModal(true)}
              className="neo-btn px-4 py-2 text-sm" style={{ background: "#FFD600" }}>
              + 게임 등록
            </button>
            <button onClick={handleLogout}
              className="neo-btn px-3 py-2 text-xs" style={{ background: "var(--bg)" }}>
              로그아웃
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1,2].map(i => (
              <div key={i} className="neo-card h-48 animate-pulse" style={{ background: "#F0EFEC" }} />
            ))}
          </div>
        ) : games.length === 0 ? (
          <div className="neo-card text-center py-20">
            <p className="text-2xl mb-3">🎮</p>
            <p className="font-bold mb-4" style={{ color: "var(--text-2)" }}>등록된 게임이 없습니다.</p>
            <button onClick={() => setShowModal(true)}
              className="neo-btn px-6 py-3 text-sm" style={{ background: "#FFD600" }}>
              첫 번째 게임 등록하기
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
