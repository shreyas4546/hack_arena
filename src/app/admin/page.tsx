"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { formatDistanceToNow, differenceInMinutes } from "date-fns";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  ShieldAlert, CheckCircle2, AlertTriangle, XCircle,
  Search, RefreshCw, Lock, Unlock, Users,
  ExternalLink, Github, Activity, ArrowUpDown, Clock,
  Gavel, ChevronLeft, ChevronRight, Play, Layers, Trophy,
  Flame, Zap, Crown, Medal, Award, BarChart3, Timer, Pause, Square, Ban
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// Dynamic import for Recharts (SSR-incompatible)
// @ts-ignore
const ActivityChart = dynamic(() => import("./ActivityChart"), { ssr: false, loading: () => <div className="h-full w-full bg-slate-800/20 rounded-xl animate-pulse flex items-center justify-center"><BarChart3 className="w-8 h-8 text-slate-700" /></div> });

type Team = {
  id: string;
  team_name: string;
  repo_url: string;
  deployment_url: string | null;
  last_push: string;
  status: "active" | "warning" | "inactive" | "disqualified";
  strike_count: number;
  deployment_status: "live" | "slow" | "down" | "pending";
  response_time: number;
  score: number;
};

type SortField = "team_name" | "last_push" | "strike_count" | "status" | "score" | "deployment_status";
type SortOrder = "asc" | "desc";

type TimerState = {
  status: "running" | "paused" | "stopped";
  startTime: Date;
  accumulatedMs: number;
};

function getActivityLevel(team: Team): "high" | "medium" | "low" | "dead" {
  const mins = differenceInMinutes(new Date(), new Date(team.last_push));
  if (mins < 30) return "high";
  if (mins < 60) return "medium";
  if (mins < 120) return "low";
  return "dead";
}

function generateActivityData(teams: Team[]) {
  const hours = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const hour = new Date(now.getTime() - i * 60 * 60 * 1000);
    const label = hour.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const activeCount = teams.filter((t) => {
      const diff = Math.abs(differenceInMinutes(new Date(t.last_push), hour));
      return diff < 60 && t.status !== "disqualified";
    }).length;
    const commits = Math.max(0, activeCount * 2 + Math.floor(Math.random() * 3));
    hours.push({ time: label, activeTeams: activeCount, commits });
  }
  return hours;
}

export default function AdminDashboard() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [filter, setFilter] = useState<Team["status"] | "all">("all");
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("last_push");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [submissionsLocked, setSubmissionsLocked] = useState(false);
  const [locking, setLocking] = useState(false);
  const [registrationLocked, setRegistrationLocked] = useState(false);
  const [regLocking, setRegLocking] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date>(new Date());
  const [graphMode, setGraphMode] = useState<"commits" | "activeTeams">("activeTeams");
  const [timerState, setTimerState] = useState<TimerState>({ status: "stopped", startTime: new Date(), accumulatedMs: 0 });

  // Disqualification modal state
  const [disqualifyTarget, setDisqualifyTarget] = useState<Team | null>(null);
  const [disqualifyReason, setDisqualifyReason] = useState("");
  const [disqualifying, setDisqualifying] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    try {
      const [teamsRes, settingsRes, regLockRes] = await Promise.all([fetch("/api/teams"), fetch("/api/settings"), fetch("/api/registration-lock")]);
      if (teamsRes.ok) setTeams(await teamsRes.json());
      if (settingsRes.ok) {
        const settings = await settingsRes.json();
        setSubmissionsLocked(settings.submissions_locked);
        setTimerState({
          status: settings.timer_status || "stopped",
          startTime: settings.timer_start_time ? new Date(settings.timer_start_time) : new Date(),
          accumulatedMs: Number(settings.timer_accumulated_ms) || 0
        });
      }
      if (regLockRes.ok) {
        const regData = await regLockRes.json();
        setRegistrationLocked(regData.registration_locked);
      }
      setLastChecked(new Date());
    } catch (e) {
      console.error("Failed to fetch dashboard data", e);
      toast.error("Network issue when refreshing data");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDisqualify = async () => {
    if (!disqualifyTarget || !disqualifyReason.trim()) return;
    setDisqualifying(true);
    try {
      const res = await fetch("/api/teams/disqualify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ team_id: disqualifyTarget.id, reason: disqualifyReason.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(data.message);
      setDisqualifyTarget(null);
      setDisqualifyReason("");
      fetchDashboardData();
    } catch (err: any) {
      toast.error(err.message || "Failed to disqualify team");
    } finally {
      setDisqualifying(false);
    }
  };

  useEffect(() => { fetchDashboardData(); }, [fetchDashboardData]);
  useEffect(() => {
    const interval = setInterval(fetchDashboardData, 60000);
    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  const handleTriggerCron = async () => {
    setTriggering(true);
    const toastId = toast.loading("Executing monitor check...");
    try {
      const res = await fetch("/api/cron/monitor", { method: "POST" });
      if (res.ok) { await fetchDashboardData(); toast.success("Check completed", { id: toastId }); }
      else toast.error("Failed to trigger check", { id: toastId });
    } catch { toast.error("Error triggering check", { id: toastId }); }
    finally { setTriggering(false); }
  };

  const handleToggleLock = async () => {
    setLocking(true);
    const toastId = toast.loading("Updating settings...");
    try {
      const res = await fetch("/api/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ submissions_locked: !submissionsLocked }) });
      if (res.ok) { setSubmissionsLocked(!submissionsLocked); toast.success(!submissionsLocked ? "Submissions Locked!" : "Submissions Opened!", { id: toastId }); }
      else toast.error("Failed", { id: toastId });
    } catch { toast.error("Error", { id: toastId }); }
    finally { setLocking(false); }
  };

  const handleToggleRegLock = async () => {
    setRegLocking(true);
    const toastId = toast.loading("Updating registration lock...");
    try {
      const res = await fetch("/api/registration-lock", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ locked: !registrationLocked }) });
      if (res.ok) { setRegistrationLocked(!registrationLocked); toast.success(!registrationLocked ? "Registration Locked!" : "Registration Opened!", { id: toastId }); }
      else toast.error("Failed", { id: toastId });
    } catch { toast.error("Error", { id: toastId }); }
    finally { setRegLocking(false); }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortOrder("asc"); }
  };

  const filteredAndSortedTeams = useMemo(() => {
    let result = teams;
    if (search.trim()) result = result.filter((t) => t.team_name.toLowerCase().includes(search.toLowerCase()));
    if (filter !== "all") result = result.filter((t) => t.status === filter);
    return result.sort((a, b) => {
      let c = 0;
      if (sortField === "team_name") c = a.team_name.localeCompare(b.team_name);
      else if (sortField === "last_push") c = new Date(a.last_push).getTime() - new Date(b.last_push).getTime();
      else if (sortField === "strike_count") c = a.strike_count - b.strike_count;
      else if (sortField === "status") c = a.status.localeCompare(b.status);
      else if (sortField === "score") c = a.score - b.score;
      else if (sortField === "deployment_status") c = a.deployment_status.localeCompare(b.deployment_status);
      return sortOrder === "asc" ? c : -c;
    });
  }, [teams, filter, search, sortField, sortOrder]);

  const stats = useMemo(() => ({
    total: teams.length,
    active: teams.filter((t) => t.status === "active").length,
    warning: teams.filter((t) => t.status === "warning").length,
    inactive: teams.filter((t) => t.status === "inactive" || t.status === "disqualified").length,
  }), [teams]);

  const leaderboard = useMemo(() => {
    return [...teams].filter((t) => t.status !== "disqualified").sort((a, b) => b.score - a.score);
  }, [teams]);

  const insights = useMemo(() => {
    if (teams.length === 0) return { mostActive: "—", leastActive: "—", atRisk: 0, recentPushes: 0 };
    const active = [...teams].filter((t) => t.status !== "disqualified").sort((a, b) => new Date(b.last_push).getTime() - new Date(a.last_push).getTime());
    return {
      mostActive: active[0]?.team_name || "—",
      leastActive: active[active.length - 1]?.team_name || "—",
      atRisk: teams.filter((t) => t.status === "warning" || t.strike_count >= 2).length,
      recentPushes: teams.filter((t) => differenceInMinutes(new Date(), new Date(t.last_push)) < 60).length,
    };
  }, [teams]);

  const activityData = useMemo(() => generateActivityData(teams), [teams]);

  const commitGroups = useMemo(() => {
    const validTeams = [...teams]
      .filter((t) => t.status !== "disqualified")
      .map((t) => ({ ...t, diffMinutes: differenceInMinutes(new Date(), new Date(t.last_push)) }));
    return {
      active: validTeams.filter((t) => t.diffMinutes <= 60).sort((a,b) => a.diffMinutes - b.diffMinutes),
      violators: validTeams.filter((t) => t.diffMinutes > 60).sort((a,b) => b.diffMinutes - a.diffMinutes)
    };
  }, [teams]);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 font-sans selection:bg-cyan-500/30 overflow-x-hidden">
      <div className="fixed inset-0 z-0 pointer-events-none bg-[radial-gradient(circle_at_50%_0%,rgba(6,182,212,0.08),transparent_50%),radial-gradient(circle_at_80%_80%,rgba(147,51,234,0.08),transparent_50%)]" />

      <div className="relative z-10 max-w-[1440px] mx-auto p-4 md:p-6 lg:p-8 space-y-6">

        {/* ── HEADER ── */}
        <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 pb-5 border-b border-white/5">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <ShieldAlert className="w-7 h-7 text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]" />
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">Command Center</h1>
            </div>
            <div className="flex items-center gap-2 text-xs text-cyan-400/80 font-medium">
              <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" /><span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500" /></span>
              Live Monitoring — Auto-refresh 60s
            </div>
            <p className="text-[10px] text-slate-600/50 font-medium tracking-wide mt-0.5">Control System by Shreyas Ugargol</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => window.location.href = "/admin/projects"} variant="outline" className="bg-slate-900/50 border-white/10 text-slate-300 hover:bg-indigo-900/40 hover:text-indigo-300 hover:border-indigo-500/50 transition-all rounded-xl text-xs h-9"><Layers className="w-3.5 h-3.5 mr-1.5" />Gallery</Button>
            <Button onClick={() => window.location.href = "/admin/submissions"} variant="outline" className="bg-slate-900/50 border-white/10 text-slate-300 hover:bg-amber-900/30 hover:text-amber-300 hover:border-amber-500/50 transition-all rounded-xl text-xs h-9"><Trophy className="w-3.5 h-3.5 mr-1.5" />Submissions</Button>
            <Link href="/admin/judging" className="inline-flex items-center justify-center whitespace-nowrap bg-slate-900/50 border border-white/10 text-slate-300 hover:bg-emerald-900/30 hover:text-emerald-300 hover:border-emerald-500/50 transition-all rounded-xl text-xs h-9 px-4 font-medium"><Gavel className="w-3.5 h-3.5 mr-1.5" />Final Eval</Link>
            
            {/* Registration Lock Toggle */}
            <Button onClick={handleToggleRegLock} disabled={regLocking || loading} variant="outline" className={cn("border-white/10 bg-slate-900/50 transition-all rounded-xl text-xs h-9", registrationLocked ? "text-red-400 border-red-900/30" : "text-slate-300 border-white/10")}>
              {registrationLocked ? <Lock className="w-3.5 h-3.5 mr-1.5" /> : <Unlock className="w-3.5 h-3.5 mr-1.5" />}
              {registrationLocked ? "Reg Locked" : "Reg Open"}
            </Button>

            {/* Submissions Lock Toggle */}
            <Button onClick={handleToggleLock} disabled={locking || loading} variant="outline" className={cn("border-white/10 bg-slate-900/50 transition-all rounded-xl text-xs h-9", submissionsLocked ? "text-red-400 border-red-900/30" : "text-slate-300")}>
              {submissionsLocked ? <Lock className="w-3.5 h-3.5 mr-1.5" /> : <Unlock className="w-3.5 h-3.5 mr-1.5" />}
              {submissionsLocked ? "Sub Locked" : "Sub Open"}
            </Button>
          </div>
        </header>

        {/* ── CLOCK SYSTEM ── */}
        <HackathonClockPanel onManualCheck={handleTriggerCron} triggering={triggering} lastChecked={lastChecked} timerState={timerState} setTimerState={setTimerState} />

        {/* ── STATS ── */}
            <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatCard title="Total Teams" value={stats.total} loading={loading} icon={Users} glowColor="rgba(255,255,255,0.08)" iconColor="text-slate-200" />
              <StatCard title="Active" value={stats.active} loading={loading} icon={CheckCircle2} glowColor="rgba(34,197,94,0.12)" iconColor="text-emerald-400" />
              <StatCard title="Warning" value={stats.warning} loading={loading} icon={AlertTriangle} glowColor="rgba(234,179,8,0.12)" iconColor="text-amber-400" />
              <StatCard title="Inactive / DQ" value={stats.inactive} loading={loading} icon={XCircle} glowColor="rgba(239,68,68,0.12)" iconColor="text-rose-400" />
            </section>

            {/* ── INSIGHTS ── */}
            <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <InsightCard icon={<Flame className="w-5 h-5 text-orange-400" />} label="Most Active" value={insights.mostActive} glow="rgba(251,146,60,0.1)" />
              <InsightCard icon={<AlertTriangle className="w-5 h-5 text-amber-400" />} label="Least Active" value={insights.leastActive} glow="rgba(251,191,36,0.06)" />
              <InsightCard icon={<Zap className="w-5 h-5 text-cyan-400" />} label="Pushes (1hr)" value={String(insights.recentPushes)} glow="rgba(6,182,212,0.08)" />
              <InsightCard icon={<ShieldAlert className="w-5 h-5 text-rose-400" />} label="At Risk" value={String(insights.atRisk)} glow="rgba(244,63,94,0.1)" />
            </section>

            {/* ── LEADERBOARD + GRAPH ── */}
            <section className="grid grid-cols-1 lg:grid-cols-5 gap-4">
              {/* Leaderboard */}
              <div className="lg:col-span-2 rounded-2xl bg-slate-900/40 border border-white/5 backdrop-blur-md overflow-hidden flex flex-col">
                <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between shrink-0">
                  <h2 className="text-sm font-bold text-white flex items-center gap-2"><Crown className="w-4 h-4 text-amber-400" /> Leaderboard</h2>
                  <span className="text-[10px] text-slate-500 uppercase tracking-widest font-medium">Score</span>
                </div>
                <div className="divide-y divide-white/[0.03] overflow-y-auto flex-1 max-h-[380px] custom-scrollbar">
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-3 px-5 py-3.5 animate-pulse">
                        <div className="w-7 h-7 rounded-full bg-slate-800" />
                        <div className="flex-1 space-y-1.5"><div className="h-3.5 w-28 bg-slate-800 rounded" /><div className="h-2.5 w-16 bg-slate-800/60 rounded" /></div>
                        <div className="w-10 h-4 bg-slate-800 rounded" />
                      </div>
                    ))
                  ) : leaderboard.length === 0 ? (
                    <div className="p-10 text-center text-slate-500 text-sm flex flex-col items-center gap-2">
                      <Users className="w-8 h-8 text-slate-700" />
                      <p>No teams to rank yet</p>
                    </div>
                  ) : (
                    leaderboard.map((team, i) => (
                      <div key={team.id} className={cn("flex items-center gap-3 px-5 py-3 transition-all duration-200 hover:bg-white/[0.03] group cursor-default", i < 3 && "relative")}>
                        {i < 3 && <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" style={{ background: `linear-gradient(90deg, ${i === 0 ? "rgba(251,191,36,0.06)" : i === 1 ? "rgba(148,163,184,0.04)" : "rgba(217,119,6,0.04)"}, transparent 60%)` }} />}
                        <RankBadge rank={i + 1} />
                        <div className="flex-1 min-w-0 relative z-10">
                          <p className={cn("text-sm font-semibold truncate transition-colors", i === 0 ? "text-amber-200" : "text-slate-200")}>{team.team_name}</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">{formatDistanceToNow(new Date(team.last_push), { addSuffix: true })}</p>
                        </div>
                        <StatusDot status={team.status} />
                        <span className={cn("text-sm font-bold tabular-nums w-10 text-right relative z-10", team.score >= 80 ? "text-emerald-400" : team.score >= 50 ? "text-amber-400" : "text-rose-400")}>{team.score}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Activity Graph */}
              <div className="lg:col-span-3 rounded-2xl bg-slate-900/40 border border-white/5 backdrop-blur-md overflow-hidden flex flex-col">
                <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between shrink-0">
                  <h2 className="text-sm font-bold text-white flex items-center gap-2"><BarChart3 className="w-4 h-4 text-cyan-400" /> Activity Timeline</h2>
                  <div className="flex gap-1 p-0.5 bg-slate-950/50 rounded-lg border border-white/5">
                    {(["activeTeams", "commits"] as const).map((mode) => (
                      <button key={mode} onClick={() => setGraphMode(mode)} className={cn("px-3 py-1 text-xs font-medium rounded-md transition-all duration-200", graphMode === mode ? "bg-slate-800 text-white shadow-sm" : "text-slate-500 hover:text-slate-300")}>
                        {mode === "activeTeams" ? "Active Teams" : "Commits"}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="p-4 flex-1 min-h-[320px]">
                  {/* @ts-ignore */}
                  <ActivityChart data={activityData} mode={graphMode} loading={loading} />
                </div>
              </div>
            </section>

            {/* ── COMMIT STATUS BOARD ── */}
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-8">
              {/* LEFT: Committed (Safe) */}
              <div className="bg-slate-900/40 border border-emerald-500/20 rounded-2xl p-4 md:p-5 shadow-2xl backdrop-blur-md relative overflow-hidden flex flex-col h-[350px]">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500/0 via-emerald-400 to-emerald-500/0 opacity-50" />
                <div className="flex items-center justify-between mb-4 shrink-0">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
                    <h2 className="text-base font-bold text-emerald-400 tracking-wide drop-shadow-[0_0_5px_rgba(52,211,153,0.3)]">Committed Teams</h2>
                  </div>
                  <Badge variant="outline" className="bg-emerald-950/50 text-emerald-300 border-emerald-800/50 px-3 font-mono">{commitGroups.active.length}</Badge>
                </div>
                
                <div className="flex-1 overflow-y-auto pr-2 space-y-2.5">
                  {commitGroups.active.map(t => (
                    <div key={t.id} className="flex items-center justify-between p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/10 hover:border-emerald-500/30 transition-colors group">
                      <span className="text-sm font-bold text-emerald-50/90 truncate pr-2 group-hover:text-emerald-300 transition-colors">{t.team_name}</span>
                      <span className="text-[11px] font-mono font-bold text-emerald-400/90 whitespace-nowrap bg-emerald-950/50 px-2 py-1 rounded-md border border-emerald-500/20">{formatDistanceToNow(new Date(t.last_push), { addSuffix: true })}</span>
                    </div>
                  ))}
                  {commitGroups.active.length === 0 && <div className="h-full flex items-center justify-center"><p className="text-sm text-slate-500/80 font-medium tracking-wide">No active teams.</p></div>}
                </div>
              </div>

              {/* RIGHT: Not Committed (Violations) */}
              <div className="bg-slate-900/40 border border-red-500/20 rounded-2xl p-4 md:p-5 shadow-2xl backdrop-blur-md relative overflow-hidden flex flex-col h-[350px]">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500/0 via-red-500 to-red-500/0 opacity-50" />
                <div className="flex items-center justify-between mb-4 shrink-0">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className={cn("w-5 h-5 text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]", commitGroups.violators.length > 0 && "animate-pulse")} />
                    <h2 className="text-base font-bold text-red-400 tracking-wide drop-shadow-[0_0_5px_rgba(239,68,68,0.3)]">Missing Commits</h2>
                  </div>
                  <Badge variant="outline" className="bg-red-950/50 text-red-300 border-red-800/50 px-3 font-mono">{commitGroups.violators.length}</Badge>
                </div>
                
                <div className="flex-1 overflow-y-auto pr-2 space-y-2.5">
                  {commitGroups.violators.map(t => (
                    <div key={t.id} className={cn("flex items-center justify-between p-3 rounded-xl border transition-colors group", t.diffMinutes > 120 ? "bg-red-950/40 border-red-500/40 hover:border-red-500/60" : "bg-amber-950/30 border-amber-500/30 hover:border-amber-500/50")}>
                      <span className={cn("text-sm font-bold truncate pr-2 transition-colors", t.diffMinutes > 120 ? "text-red-100 group-hover:text-red-300" : "text-amber-100 group-hover:text-amber-300")}>{t.team_name}</span>
                      <span className={cn("text-[11px] font-mono font-bold whitespace-nowrap px-2 py-1 rounded-md border", t.diffMinutes > 120 ? "text-red-400 bg-red-900/30 border-red-500/30" : "text-amber-400 bg-amber-900/30 border-amber-500/30")}>
                        {formatDistanceToNow(new Date(t.last_push), { addSuffix: true })}
                      </span>
                    </div>
                  ))}
                  {commitGroups.violators.length === 0 && <div className="h-full flex items-center justify-center"><p className="text-sm text-emerald-500/80 font-medium tracking-wide">All teams are on track!</p></div>}
                </div>
              </div>
            </section>

            {/* ── MAIN TABLE ── */}
            <section className="space-y-3">
              <div className="flex flex-col md:flex-row justify-between gap-3 p-3 rounded-xl bg-slate-900/40 border border-white/5 backdrop-blur-md">
                <div className="flex overflow-x-auto no-scrollbar gap-1 p-1 bg-slate-950/50 rounded-lg border border-white/5">
                  {(["all", "active", "warning", "inactive", "disqualified"] as const).map((f) => (
                    <button key={f} onClick={() => setFilter(f)} className={cn("px-3 py-1.5 text-xs font-medium rounded-md capitalize whitespace-nowrap transition-all duration-200", filter === f ? "bg-slate-800 text-white shadow-sm ring-1 ring-white/10" : "text-slate-400 hover:text-slate-200 hover:bg-white/5")}>{f}</button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <Input placeholder="Search teams..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-slate-950/50 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-cyan-500/50 w-full md:w-56 h-9 text-xs" />
                  </div>
                  <Button onClick={fetchDashboardData} variant="outline" className="h-9 w-9 p-0 bg-slate-900/50 border-white/5 text-slate-400 hover:text-white rounded-lg"><RefreshCw className="w-3.5 h-3.5" /></Button>
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-slate-900/30 backdrop-blur-xl overflow-hidden shadow-2xl">
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-sm text-left border-collapse">
                    <thead className="text-[11px] tracking-wider text-slate-400 uppercase bg-slate-950/90 sticky top-0 z-10 border-b border-white/10">
                      <tr>
                        <SortableHeader label="Team" field="team_name" currentSort={sortField} sortOrder={sortOrder} onClick={handleSort} />
                        <th className="px-4 py-3 font-medium">Repo</th>
                        <SortableHeader label="App Status" field="deployment_status" currentSort={sortField} sortOrder={sortOrder} onClick={handleSort} />
                        <SortableHeader label="Last Push" field="last_push" currentSort={sortField} sortOrder={sortOrder} onClick={handleSort} />
                        <th className="px-4 py-3 font-medium text-center">Activity</th>
                        <SortableHeader label="Status" field="status" currentSort={sortField} sortOrder={sortOrder} onClick={handleSort} />
                        <SortableHeader label="Strikes" field="strike_count" currentSort={sortField} sortOrder={sortOrder} onClick={handleSort} className="text-center" />
                        <SortableHeader label="Score" field="score" currentSort={sortField} sortOrder={sortOrder} onClick={handleSort} className="text-center" />
                        <th className="px-4 py-3 font-medium text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.03]">
                      {loading ? Array.from({ length: 5 }).map((_, i) => (
                        <tr key={i} className="animate-pulse">
                          <td className="px-4 py-3"><div className="h-4 w-28 bg-slate-800 rounded" /></td>
                          <td className="px-4 py-3"><div className="h-6 w-14 bg-slate-800 rounded" /></td>
                          <td className="px-4 py-3"><div className="h-6 w-16 bg-slate-800 rounded" /></td>
                          <td className="px-4 py-3"><div className="h-4 w-20 bg-slate-800 rounded" /></td>
                          <td className="px-4 py-3"><div className="h-3 w-10 bg-slate-800 rounded mx-auto" /></td>
                          <td className="px-4 py-3"><div className="h-5 w-14 bg-slate-800 rounded-full" /></td>
                          <td className="px-4 py-3"><div className="h-6 w-6 bg-slate-800 rounded-full mx-auto" /></td>
                        </tr>
                      )) : filteredAndSortedTeams.length === 0 ? (
                        <tr><td colSpan={7} className="px-4 py-16 text-center text-slate-500"><Search className="w-8 h-8 opacity-20 mx-auto mb-3" /><p className="font-medium text-sm">No teams match your filters</p></td></tr>
                      ) : filteredAndSortedTeams.map((team) => (
                        <tr key={team.id} className={cn("group transition-colors duration-150", team.status === "active" && "hover:bg-emerald-900/10", team.status === "warning" && "hover:bg-amber-900/20 bg-amber-950/[0.15] border-l-2 border-amber-500/50", team.status === "inactive" && "hover:bg-rose-900/20 bg-rose-950/[0.15] border-l-2 border-rose-500/60 shadow-[inset_0_0_10px_rgba(225,29,72,0.05)]", team.status === "disqualified" && "hover:bg-rose-900/15 bg-rose-950/10 opacity-50")}>
                          <td className={cn("px-4 py-3 whitespace-nowrap text-sm", team.status === "inactive" ? "font-bold text-rose-100" : "font-semibold text-slate-200")}>{team.team_name}</td>
                          <td className="px-4 py-3 whitespace-nowrap"><a href={team.repo_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-800/50 hover:bg-slate-700 text-slate-300 hover:text-white text-xs border border-white/5 transition-colors"><Github className="w-3 h-3" /> Source</a></td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {team.deployment_url ? (
                              <div className="flex items-center gap-2">
                                <a href={team.deployment_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-cyan-900/20 hover:bg-cyan-900/40 text-cyan-300 text-xs border border-cyan-500/20 transition-colors"><ExternalLink className="w-3 h-3" /> Open</a>
                                <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-bold border", team.deployment_status === 'live' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : team.deployment_status === 'slow' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : team.deployment_status === 'down' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-slate-800 text-slate-400 border-white/5')}>{team.deployment_status.toUpperCase()} {team.response_time > 0 ? `(${team.response_time}ms)` : ''}</span>
                              </div>
                            ) : <span className="text-slate-600 text-xs italic">Pending</span>}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-slate-400 text-xs group-hover:text-slate-300 transition-colors">{formatDistanceToNow(new Date(team.last_push), { addSuffix: true })}</td>
                          <td className="px-4 py-3 whitespace-nowrap"><ActivityHeat level={getActivityLevel(team)} /></td>
                          <td className="px-4 py-3 whitespace-nowrap"><StatusBadge status={team.status} /></td>
                          <td className="px-4 py-3 whitespace-nowrap text-center"><span className={cn("inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold border transition-colors", team.strike_count === 0 ? "bg-slate-800 text-slate-300 border-white/10" : team.strike_count === 1 ? "bg-amber-500/20 text-amber-400 border-amber-500/30" : team.strike_count === 2 ? "bg-orange-500/20 text-orange-400 border-orange-500/30" : "bg-rose-500/20 text-rose-400 border-rose-500/30")}>{team.strike_count}</span></td>
                          <td className="px-4 py-3 whitespace-nowrap text-center font-bold text-white">{team.score}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-center">
                            {team.status === "disqualified" ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-rose-500/10 text-rose-400 text-xs font-bold border border-rose-500/20">❌ DQ'd</span>
                            ) : (
                              <button onClick={() => setDisqualifyTarget(team)} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-950/30 hover:bg-rose-900/50 text-rose-400 hover:text-rose-300 text-xs font-bold border border-rose-500/20 hover:border-rose-500/40 transition-all cursor-pointer">
                                <Ban className="w-3 h-3" /> Disqualify
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
      </div>

      {/* Disqualification Confirmation Modal */}
      {disqualifyTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-rose-500/30 rounded-2xl shadow-[0_0_50px_rgba(244,63,94,0.15)] p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center">
                <Ban className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">Disqualify Team</h3>
                <p className="text-xs text-slate-400">This action is irreversible and removes the team from rankings.</p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/15">
              <p className="text-sm text-rose-300 font-bold">{disqualifyTarget.team_name}</p>
              <p className="text-xs text-slate-500 mt-1">Strikes: {disqualifyTarget.strike_count} • Status: {disqualifyTarget.status}</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-300 uppercase tracking-widest">Reason for Disqualification</label>
              <textarea
                value={disqualifyReason}
                onChange={(e) => setDisqualifyReason(e.target.value)}
                placeholder="e.g., Code plagiarism detected, Rule violation..."
                rows={3}
                className="w-full bg-slate-950/50 border border-white/10 rounded-xl p-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-rose-500/50 resize-none"
              />
            </div>

            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={() => { setDisqualifyTarget(null); setDisqualifyReason(""); }}
                className="flex-1 px-4 py-2.5 text-sm font-bold text-slate-300 bg-slate-800 rounded-xl border border-white/10 hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDisqualify}
                disabled={!disqualifyReason.trim() || disqualifying}
                className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl border border-rose-400/50 shadow-[0_0_15px_rgba(244,63,94,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {disqualifying ? "Processing..." : "Confirm Disqualification"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

/* ═══════════════ SUB-COMPONENTS ═══════════════ */

function ActivityHeat({ level }: { level: "high" | "medium" | "low" | "dead" }) {
  const config = { high: "bg-emerald-400", medium: "bg-amber-400", low: "bg-rose-400", dead: "bg-slate-700" };
  return (
    <div className="flex items-end justify-center gap-[3px] h-4">
      <div className={cn("w-[5px] rounded-sm h-[6px] transition-all duration-300", level !== "dead" ? config[level] : "bg-slate-800")} />
      <div className={cn("w-[5px] rounded-sm h-[10px] transition-all duration-300", level === "high" || level === "medium" ? (level === "high" ? config.high : config.medium) : "bg-slate-800")} />
      <div className={cn("w-[5px] rounded-sm h-[16px] transition-all duration-300", level === "high" ? config.high : "bg-slate-800")} />
    </div>
  );
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <div className="w-7 h-7 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shadow-[0_0_12px_rgba(245,158,11,0.25)]"><Crown className="w-3.5 h-3.5 text-amber-400" /></div>;
  if (rank === 2) return <div className="w-7 h-7 rounded-full bg-slate-400/10 border border-slate-400/25 flex items-center justify-center"><Medal className="w-3.5 h-3.5 text-slate-300" /></div>;
  if (rank === 3) return <div className="w-7 h-7 rounded-full bg-orange-500/10 border border-orange-500/25 flex items-center justify-center"><Award className="w-3.5 h-3.5 text-orange-400" /></div>;
  return <div className="w-7 h-7 rounded-full bg-slate-800/80 border border-white/5 flex items-center justify-center text-[11px] font-bold text-slate-500">{rank}</div>;
}

function StatusDot({ status }: { status: Team["status"] }) {
  return <div className={cn("w-2 h-2 rounded-full shrink-0", status === "active" ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]" : status === "warning" ? "bg-amber-400 animate-pulse" : "bg-rose-400")} />;
}

function InsightCard({ icon, label, value, glow }: { icon: React.ReactNode; label: string; value: string; glow: string }) {
  return (
    <div className="group relative overflow-hidden rounded-xl bg-slate-900/40 border border-white/5 p-4 backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:border-white/10">
      <div className="absolute -inset-px opacity-0 group-hover:opacity-100 transition-opacity blur-xl pointer-events-none" style={{ background: `radial-gradient(circle at 50% 100%, ${glow}, transparent 70%)` }} />
      <div className="relative z-10 flex items-center gap-3">
        <div className="p-2 rounded-lg bg-slate-950/50 border border-white/5 shrink-0">{icon}</div>
        <div className="min-w-0">
          <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">{label}</p>
          <p className="text-sm font-bold text-white truncate mt-0.5">{value}</p>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, loading, icon: Icon, glowColor, iconColor }: any) {
  return (
    <div className="group relative overflow-hidden rounded-xl bg-slate-900/40 border border-white/5 p-4 backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:border-white/10">
      <div className="absolute -inset-px opacity-0 group-hover:opacity-100 transition-opacity blur-xl pointer-events-none" style={{ background: `radial-gradient(circle at 50% 100%, ${glowColor}, transparent 70%)` }} />
      <div className="relative z-10 flex justify-between items-center">
        <div className="space-y-1"><p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">{title}</p>{loading ? <div className="h-8 w-12 bg-slate-800 rounded animate-pulse" /> : <p className="text-3xl font-extrabold text-white tabular-nums">{value}</p>}</div>
        <div className="p-2.5 rounded-xl bg-slate-950/50 border border-white/5">{loading ? <div className="w-5 h-5 bg-slate-800 rounded animate-pulse" /> : <Icon className={cn("w-5 h-5", iconColor)} />}</div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: Team["status"] }) {
  const map = { active: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", warning: "bg-amber-500/10 text-amber-500 border-amber-500/30 animate-pulse", inactive: "bg-red-500/10 text-red-400 border-red-500/20", disqualified: "bg-rose-950 border-rose-900/50 text-rose-500" };
  const labels = { active: "Active", warning: "Warning", inactive: "Inactive", disqualified: "DQ" };
  return <Badge className={cn("text-[11px]", map[status])}>{labels[status]}</Badge>;
}

function SortableHeader({ label, field, currentSort, sortOrder, onClick, className }: { label: string; field: SortField; currentSort: SortField; sortOrder: SortOrder; onClick: (f: SortField) => void; className?: string }) {
  const isActive = currentSort === field;
  return (
    <th className={cn("px-4 py-3 font-medium cursor-pointer select-none group hover:bg-white/5 transition-colors", className)} onClick={() => onClick(field)}>
      <div className={cn("flex items-center gap-1", className?.includes("text-center") && "justify-center")}>
        <span className={cn("transition-colors", isActive ? "text-cyan-400" : "text-slate-400 group-hover:text-slate-200")}>{label}</span>
        <ArrowUpDown className={cn("w-3 h-3 transition-all", isActive ? "text-cyan-400" : "text-slate-600 opacity-0 group-hover:opacity-100")} />
      </div>
    </th>
  );
}



function HackathonClockPanel({ onManualCheck, triggering, lastChecked, timerState, setTimerState }: { onManualCheck: () => void; triggering: boolean; lastChecked: Date; timerState: TimerState; setTimerState: (s: TimerState) => void }) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => { setNow(new Date()); const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);

  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    if (!now) return;
    if (timerState.status === "running") {
      setElapsedMs(Math.max(0, timerState.accumulatedMs + (now.getTime() - timerState.startTime.getTime())));
    } else {
      setElapsedMs(timerState.accumulatedMs);
    }
  }, [now, timerState]);

  const handleTimerAction = async (action: "start" | "pause" | "stop") => {
    const newStatus = action === "start" ? "running" : action === "pause" ? "paused" : "stopped";
    if (timerState.status === newStatus) return;
    
    const body: any = { timer_status: newStatus };
    let newAccumulated = timerState.accumulatedMs;
    let newStartTime = timerState.startTime;

    if (action === "start") {
      newStartTime = new Date();
      body.timer_start_time = newStartTime.toISOString();
      if (timerState.status === "stopped") { newAccumulated = 0; body.timer_accumulated_ms = 0; }
    } else if (action === "pause") {
      newAccumulated = elapsedMs;
      body.timer_accumulated_ms = newAccumulated;
    } else if (action === "stop") {
      newAccumulated = 0;
      body.timer_accumulated_ms = 0;
    }

    setTimerState({ status: newStatus, startTime: newStartTime, accumulatedMs: newAccumulated });
    if (action === "stop") setElapsedMs(0);

    const toastId = toast.loading(`${action === 'start' ? 'Starting' : action === 'pause' ? 'Pausing' : 'Stopping'} timer...`);
    try {
      const res = await fetch("/api/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error("Failed");
      toast.success(`Timer ${newStatus}`, { id: toastId });
    } catch {
      toast.error("Failed to sync timer", { id: toastId });
    }
  };

  if (!now) return <div className="h-16 w-full animate-pulse bg-slate-900/50 rounded-2xl border border-white/5 mb-6"></div>;

  const totalDuration = 24; // Example duration
  const elapsedHrs = Math.floor(elapsedMs / (1000 * 60 * 60));
  const elapsedMins = Math.floor((elapsedMs % (1000 * 60 * 60)) / (1000 * 60));

  const nextCheckpointHrs = elapsedHrs + 1;
  const nextCheckpointMs = nextCheckpointHrs * 60 * 60 * 1000;
  const msUntilNext = nextCheckpointMs - elapsedMs;
  const minsUntilNext = Math.floor(msUntilNext / (1000 * 60));
  const secsUntilNext = Math.floor((msUntilNext % (1000 * 60)) / 1000);

  const deadlineColor = minsUntilNext < 0 ? "text-rose-400 bg-rose-500/10 border-rose-500/30" : minsUntilNext < 15 ? "text-amber-400 bg-amber-500/10 border-amber-500/30" : "text-emerald-400 bg-emerald-500/10 border-emerald-500/30";

  return (
    <div className="flex flex-col xl:flex-row justify-between items-center gap-4 p-4 rounded-2xl bg-slate-900/40 border border-white/5 backdrop-blur-md shadow-2xl relative overflow-hidden mb-8">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-cyan-500/5 blur-[80px] pointer-events-none" />

      {/* Clock & Duration */}
      <div className="flex flex-col md:flex-row items-center gap-6 relative z-10 w-full xl:w-auto justify-center xl:justify-start shrink-0">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3 bg-slate-950/50 px-5 py-2.5 rounded-xl border border-cyan-500/20 shadow-[0_0_20px_rgba(6,182,212,0.15)]">
            <Clock className="w-5 h-5 text-cyan-400" />
            <span className="text-2xl font-mono font-bold tracking-tight text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]">
              {now.toLocaleTimeString('en-US', { hour12: false })}
            </span>
          </div>
          {/* Controls */}
          <div className="flex justify-center md:justify-start gap-2">
            <Button onClick={() => handleTimerAction('start')} disabled={timerState.status === 'running'} size="sm" variant="outline" className={cn("h-7 text-[10px] uppercase font-bold tracking-wider rounded-lg transition-all", timerState.status === 'running' ? "border-white/5 text-slate-500 bg-transparent" : "border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/50")}><Play className="w-3 h-3 mr-1" /> Start</Button>
            <Button onClick={() => handleTimerAction('pause')} disabled={timerState.status !== 'running'} size="sm" variant="outline" className={cn("h-7 text-[10px] uppercase font-bold tracking-wider rounded-lg transition-all", timerState.status !== 'running' ? "border-white/5 text-slate-500 bg-transparent" : "border-amber-500/30 text-amber-400 hover:bg-amber-500/10 hover:border-amber-500/50")}><Pause className="w-3 h-3 mr-1" /> Pause</Button>
            <Button onClick={() => handleTimerAction('stop')} disabled={timerState.status === 'stopped'} size="sm" variant="outline" className={cn("h-7 text-[10px] uppercase font-bold tracking-wider rounded-lg transition-all", timerState.status === 'stopped' ? "border-white/5 text-slate-500 bg-transparent" : "border-rose-500/30 text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/50")}><Square className="w-3 h-3 mr-1" /> Stop</Button>
          </div>
        </div>
        
        <div className="flex flex-col items-center md:items-start">
          <span className="text-[10px] uppercase tracking-widest font-semibold flex items-center gap-1.5"><span className={cn("w-2 h-2 rounded-full", timerState.status === 'running' ? "bg-emerald-500 animate-pulse" : timerState.status === 'paused' ? "bg-amber-500" : "bg-rose-500")} /> Event Duration</span>
          <span className="text-sm font-medium text-slate-300">
            {elapsedHrs}h {elapsedMins}m elapsed <span className="text-slate-600 px-1">/</span> {totalDuration}h total
          </span>
        </div>
      </div>

      {/* Next Deadline Tracker */}
      <div className={cn("flex flex-col md:flex-row items-center gap-4 px-6 py-3 rounded-xl border relative z-10 w-full xl:w-auto justify-center transition-colors", deadlineColor)}>
         <div className="flex flex-col items-center md:items-start">
            <span className="text-[10px] uppercase font-bold tracking-widest opacity-80 flex items-center gap-1.5"><Timer className="w-3.5 h-3.5" /> Next Commit Deadline</span>
            <span className="text-xl font-mono font-bold">
               {timerState.status === 'stopped' ? "--" : minsUntilNext < 0 ? "Overdue!" : `${minsUntilNext}m ${secsUntilNext.toString().padStart(2, '0')}s`}
            </span>
         </div>
      </div>

      {/* Manual Check */}
      <div className="flex flex-col items-center xl:items-end gap-2 relative z-10 w-full xl:w-auto shrink-0">
        <Button onClick={onManualCheck} disabled={triggering} className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-[0_4px_20px_rgba(79,70,229,0.3)] hover:shadow-[0_4px_25px_rgba(79,70,229,0.5)] transition-all border border-indigo-500/50 rounded-xl text-sm h-11 w-full sm:w-auto px-6 group">
          <Activity className={cn("w-4 h-4 mr-2 group-hover:scale-110 transition-transform", triggering && "animate-spin")} />
          {triggering ? "Checking Systems..." : "👉 Mark Manual Check"}
        </Button>
        <span className="text-[11px] text-slate-500 font-medium">Last automated check: {lastChecked.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
    </div>
  );
}
