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
  Flame, Zap, Crown, Medal, Award, BarChart3, Timer, Pause, Square, Ban, Download,
  Monitor, Plus, LockOpen, Sliders, Check, AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { CommandPresets } from "./CommandPresets";
import { Tooltip } from "./Tooltip";
import PremiumCard from "@/components/PremiumCard";

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
  judge_score: number;
  created_at: string;
};

type SortField = "team_name" | "last_push" | "strike_count" | "status" | "score" | "judge_score" | "deployment_status";
type SortOrder = "asc" | "desc";

type TimerState = {
  status: "running" | "paused" | "stopped" | "unset";
  startTime: Date;
  accumulatedMs: number;
  durationHours: number;
  announcement: string | null;
};

function getActivityLevel(team: Team): "high" | "medium" | "low" | "dead" {
  if (!team.last_push) return "dead";
  const mins = differenceInMinutes(new Date(), new Date(team.last_push));
  if (mins < 30) return "high";
  if (mins < 60) return "medium";
  if (mins < 120) return "low";
  return "dead";
}

function generateActivityData(teams: Team[]) {
  const hours = [];
  const now = new Date();
  const teamsWithPushes = teams.filter((t) => t.last_push && t.status !== "disqualified");
  for (let i = 11; i >= 0; i--) {
    const hour = new Date(now.getTime() - i * 60 * 60 * 1000);
    const label = hour.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const activeCount = teamsWithPushes.filter((t) => {
      const diff = Math.abs(differenceInMinutes(new Date(t.last_push), hour));
      return diff < 60;
    }).length;
    const commits = activeCount > 0 ? activeCount * 3 + (i % 2) : 0;
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
  const [timerState, setTimerState] = useState<TimerState>({ status: "stopped", startTime: new Date(), accumulatedMs: 0, durationHours: 24, announcement: null });

  // Pre-Hackathon Feature Configuration States
  const [featureCheckpoints, setFeatureCheckpoints] = useState(true);
  const [featureStrikes, setFeatureStrikes] = useState(true);
  const [featureScoring, setFeatureScoring] = useState(true);
  const [commitIntervalHours, setCommitIntervalHours] = useState(6);
  const [featureConfigInitialized, setFeatureConfigInitialized] = useState(false);
  const [activeEventId, setActiveEventId] = useState(1);
  const [savingConfig, setSavingConfig] = useState(false);

  // Modals
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resettingEvent, setResettingEvent] = useState(false);
  const [disqualifyTarget, setDisqualifyTarget] = useState<Team | null>(null);
  const [disqualifyReason, setDisqualifyReason] = useState("");
  const [disqualifying, setDisqualifying] = useState(false);

  const isConfigLocked = timerState.status === "running" || timerState.status === "paused";

  const fetchDashboardData = useCallback(async () => {
    try {
      const [teamsRes, settingsRes, regLockRes] = await Promise.all([
        fetch("/api/admin/teams"),
        fetch("/api/settings"),
        fetch("/api/registration-lock")
      ]);
      if (teamsRes.ok) setTeams(await teamsRes.json());
      if (settingsRes.ok) {
        const settings = await settingsRes.json();
        setSubmissionsLocked(settings.submissions_locked);
        setFeatureCheckpoints(settings.feature_checkpoints_enabled !== false);
        setFeatureStrikes(settings.feature_strikes_enabled !== false);
        setFeatureScoring(settings.feature_scoring_enabled !== false);
        setCommitIntervalHours(settings.commit_interval_hours ?? 6);
        setFeatureConfigInitialized(settings.feature_config_initialized ?? false);
        setActiveEventId(settings.event_id || 1);
        setTimerState({
          status: settings.timer_status || "unset",
          startTime: settings.timer_start_time ? new Date(settings.timer_start_time) : new Date(),
          accumulatedMs: Number(settings.timer_accumulated_ms) || 0,
          durationHours: Number(settings.timer_duration_hours) || 24,
          announcement: settings.global_announcement || null
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

  const handleSaveConfiguration = async () => {
    if (isConfigLocked) {
      toast.error("Configuration is locked while the hackathon is active (running or paused).");
      return;
    }
    setSavingConfig(true);
    const toastId = toast.loading("Saving pre-hackathon feature settings...");
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          feature_checkpoints_enabled: featureCheckpoints,
          feature_strikes_enabled: featureStrikes,
          feature_scoring_enabled: featureScoring,
          commit_interval_hours: commitIntervalHours,
          feature_config_initialized: true
        })
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to save configuration");
      }
      setFeatureConfigInitialized(true);
      toast.success("Pre-hackathon configuration confirmed and saved!", { id: toastId });
      await fetchDashboardData();
    } catch (err: any) {
      toast.error(err.message || "Failed to save configuration", { id: toastId });
    } finally {
      setSavingConfig(false);
    }
  };

  const handleResetEvent = async () => {
    setResettingEvent(true);
    const toastId = toast.loading("Initializing new hackathon event...");
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reset_event",
          confirm_new_hackathon: true
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reset event");
      toast.success(`Event reset! Initialized Event #${data.event_id || activeEventId + 1}. Configuration unlocked.`, { id: toastId });
      setResetModalOpen(false);
      await fetchDashboardData();
    } catch (err: any) {
      toast.error(err.message || "Failed to reset event", { id: toastId });
    } finally {
      setResettingEvent(false);
    }
  };

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

  const handleExportCSV = () => {
    if (!teams || teams.length === 0) return;
    
    const headers = ["Team Name", "Status"];
    if (featureScoring) headers.push("Score");
    if (featureStrikes) headers.push("Strikes");
    headers.push("Repo URL", "Deploy URL", "Last Push");

    const rows = teams.map(t => {
      const r = [
        `"${t.team_name.replace(/"/g, '""')}"`,
        t.status
      ];
      if (featureScoring) r.push(String(t.score || 0));
      if (featureStrikes) r.push(String(t.strike_count));
      r.push(`"${t.repo_url}"`, `"${t.deployment_url || ''}"`, `"${t.last_push || ''}"`);
      return r;
    });
    
    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `hackarena_teams_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Database exported to CSV!");
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortOrder("asc"); }
  };

  const filteredAndSortedTeams = useMemo(() => {
    let result = [...teams];
    if (search.trim()) result = result.filter((t) => t.team_name.toLowerCase().includes(search.toLowerCase()));
    if (filter !== "all") result = result.filter((t) => t.status === filter);
    return result.sort((a, b) => {
      let c = 0;
      if (sortField === "team_name") c = a.team_name.localeCompare(b.team_name);
      else if (sortField === "last_push") c = new Date(a.last_push).getTime() - new Date(b.last_push).getTime();
      else if (sortField === "strike_count") c = a.strike_count - b.strike_count;
      else if (sortField === "status") c = a.status.localeCompare(b.status);
      else if (sortField === "score") c = (a.score || 0) - (b.score || 0);
      else if (sortField === "deployment_status") c = a.deployment_status.localeCompare(b.deployment_status);
      return sortOrder === "asc" ? c : -c;
    });
  }, [teams, filter, search, sortField, sortOrder]);

  const stats = useMemo(() => ({
    total: teams.length,
    active: teams.filter((t) => t.status === "active").length,
    warning: teams.filter((t) => t.status === "warning").length,
    inactive: teams.filter((t) => t.status === "inactive").length,
    disqualified: teams.filter((t) => t.status === "disqualified").length,
  }), [teams]);

  const leaderboard = useMemo(() => {
    if (!featureScoring) return [];
    return [...teams].filter((t) => t.status !== "disqualified").sort((a, b) => (b.score || 0) - (a.score || 0));
  }, [teams, featureScoring]);

  const insights = useMemo(() => {
    if (teams.length === 0) return { mostActive: "—", leastActive: "—", atRisk: 0, recentPushes: 0 };
    
    const teamsWithHackathonPushes = [...teams]
      .filter((t) => {
        if (t.status === "disqualified" || !t.last_push) return false;
        return new Date(t.last_push).getTime() > new Date(t.created_at).getTime();
      })
      .sort((a, b) => new Date(b.last_push).getTime() - new Date(a.last_push).getTime());
      
    return {
      mostActive: teamsWithHackathonPushes[0]?.team_name || "—",
      leastActive: teamsWithHackathonPushes[teamsWithHackathonPushes.length - 1]?.team_name || "—",
      atRisk: teams.filter((t) => t.status !== "disqualified" && (t.status === "warning" || t.strike_count >= 2)).length,
      recentPushes: teamsWithHackathonPushes.filter((t) => differenceInMinutes(new Date(), new Date(t.last_push)) < 60).length,
    };
  }, [teams]);

  const activityData = useMemo(() => generateActivityData(teams), [teams]);

  const commitGroups = useMemo(() => {
    const validTeams = [...teams]
      .filter((t) => {
        if (t.status === "disqualified" || !t.last_push) return false;
        return new Date(t.last_push).getTime() > new Date(t.created_at).getTime();
      })
      .map((t) => ({ ...t, diffMinutes: differenceInMinutes(new Date(), new Date(t.last_push)) }));
      
    const newTeams = [...teams]
      .filter((t) => {
        if (t.status === "disqualified") return false;
        if (!t.last_push) return true;
        return new Date(t.last_push).getTime() <= new Date(t.created_at).getTime();
      });
      
    const intervalMins = (commitIntervalHours || 6) * 60;
    return {
      active: validTeams.filter((t) => t.diffMinutes <= intervalMins).sort((a,b) => a.diffMinutes - b.diffMinutes),
      violators: validTeams.filter((t) => t.diffMinutes > intervalMins).sort((a,b) => b.diffMinutes - a.diffMinutes),
      newTeams,
    };
  }, [teams, commitIntervalHours]);

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
            <Button onClick={() => window.location.href = "/admin/participants"} variant="outline" className="bg-slate-900/50 border-white/10 text-slate-300 hover:bg-cyan-900/30 hover:text-cyan-300 hover:border-cyan-500/50 transition-all rounded-xl text-xs h-9"><Users className="w-3.5 h-3.5 mr-1.5" />Participants</Button>
            <Button onClick={() => window.location.href = "/admin/submissions"} variant="outline" className="bg-slate-900/50 border-white/10 text-slate-300 hover:bg-amber-900/30 hover:text-amber-300 hover:border-amber-500/50 transition-all rounded-xl text-xs h-9"><Trophy className="w-3.5 h-3.5 mr-1.5" />Submissions</Button>
            <Button onClick={() => window.location.href = "/admin/scores"} variant="outline" className="bg-slate-900/50 border-white/10 text-slate-300 hover:bg-emerald-900/30 hover:text-emerald-300 hover:border-emerald-500/50 transition-all rounded-xl text-xs h-9"><Gavel className="w-3.5 h-3.5 mr-1.5" />Judging Matrix</Button>
            
            <span className="w-px h-6 bg-white/10 mx-1"></span>

            <Button onClick={handleExportCSV} variant="outline" className="bg-slate-900/50 border-white/10 text-slate-300 hover:bg-blue-900/30 hover:text-blue-300 hover:border-blue-500/50 transition-all rounded-xl text-xs h-9"><Download className="w-3.5 h-3.5 mr-1.5" />Export CSV</Button>
            
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

        {/* ── PRE-HACKATHON FEATURE CONTROLS HUD ── */}
        <PreHackathonConfigHUD 
          checkpoints={featureCheckpoints}
          setCheckpoints={setFeatureCheckpoints}
          strikes={featureStrikes}
          setStrikes={setFeatureStrikes}
          scoring={featureScoring}
          setScoring={setFeatureScoring}
          commitInterval={commitIntervalHours}
          setCommitInterval={setCommitIntervalHours}
          isLocked={isConfigLocked}
          isInitialized={featureConfigInitialized}
          activeEventId={activeEventId}
          onSave={handleSaveConfiguration}
          saving={savingConfig}
          onOpenResetModal={() => setResetModalOpen(true)}
        />

        {/* ── CLOCK SYSTEM ── */}
        <HackathonClockPanel 
          onManualCheck={handleTriggerCron} 
          triggering={triggering} 
          lastChecked={lastChecked} 
          timerState={timerState} 
          setTimerState={setTimerState}
          featureConfigInitialized={featureConfigInitialized}
          onOpenResetModal={() => setResetModalOpen(true)}
          activeEventId={activeEventId}
        />

        {/* ── SMART PRESETS ── */}
        <CommandPresets onRefresh={fetchDashboardData} />

        {/* ── STATS ── */}
        <section className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <StatCard title="Total Teams" value={stats.total} loading={loading} icon={Users} glowColor="rgba(255,255,255,0.08)" iconColor="text-slate-200" />
          <StatCard title="Active" value={stats.active} loading={loading} icon={CheckCircle2} glowColor="rgba(34,197,94,0.12)" iconColor="text-emerald-400" />
          <StatCard title="Warning" value={stats.warning} loading={loading} icon={AlertTriangle} glowColor="rgba(234,179,8,0.12)" iconColor="text-amber-400" />
          <StatCard title="Inactive" value={stats.inactive} loading={loading} icon={XCircle} glowColor="rgba(239,68,68,0.12)" iconColor="text-rose-400" />
          <StatCard title="Disqualified" value={stats.disqualified} loading={loading} icon={Ban} glowColor="rgba(225,29,72,0.12)" iconColor="text-red-500" />
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
          {/* Leaderboard Card (Adaptive when Scoring is OFF) */}
          {featureScoring ? (
            <div className="lg:col-span-2 rounded-2xl bg-slate-900/40 border border-white/5 backdrop-blur-md overflow-hidden flex flex-col h-[400px]">
              <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  <h2 className="text-sm font-bold text-white tracking-tight">Live Intelligence Leaderboard</h2>
                </div>
                <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[10px] py-0.5 px-2 uppercase font-black">Top 5</Badge>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
                {[...teams]
                  .filter(t => t.status !== "disqualified")
                  .sort((a, b) => (b.score || 0) - (a.score || 0))
                  .slice(0, 5)
                  .map((team, idx) => (
                    <div key={team.id} className={cn(
                      "flex items-center justify-between p-3 rounded-xl border transition-all group",
                      idx === 0 ? "bg-amber-500/10 border-amber-500/20" : "bg-slate-950/40 border-white/5"
                    )}>
                      <div className="flex items-center gap-3">
                        <span className={cn(
                          "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black border",
                          idx === 0 ? "bg-amber-500 text-slate-950 border-amber-400" : "bg-slate-800 text-slate-400 border-white/5"
                        )}>
                          {idx + 1}
                        </span>
                        <span className="font-bold text-slate-200 group-hover:text-white transition-colors truncate max-w-[140px]">{team.team_name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                         <div className="flex flex-col items-end">
                            <span className="text-xs font-black text-amber-400">{team.score || 0}</span>
                            <span className="text-[8px] uppercase tracking-tighter text-slate-500 font-bold">Points</span>
                         </div>
                         <ActivityHeat level={getActivityLevel(team)} />
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ) : (
            <div className="lg:col-span-2 rounded-2xl bg-slate-900/40 border border-white/5 backdrop-blur-md overflow-hidden flex flex-col h-[400px] p-6 items-center justify-center text-center">
              <Trophy className="w-10 h-10 text-slate-600 mb-3 opacity-40" />
              <h3 className="text-sm font-bold text-slate-300">Scoring System is Disabled</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-xs leading-relaxed">
                Numerical scoring, points evaluations, and leaderboard rankings are turned off for this event.
              </p>
            </div>
          )}

          {/* Activity Graph Card */}
          <div className="lg:col-span-3 rounded-2xl bg-slate-900/40 border border-white/5 backdrop-blur-md overflow-hidden flex flex-col h-[400px]">
            <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-cyan-400" />
                <h2 className="text-sm font-bold text-white tracking-tight">Code Activity Pulse</h2>
              </div>
              <div className="flex items-center gap-1 bg-slate-950/60 p-1 rounded-xl border border-white/5">
                <button onClick={() => setGraphMode("activeTeams")} className={cn("px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all", graphMode === "activeTeams" ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20" : "text-slate-400 hover:text-white")}>Active</button>
                <button onClick={() => setGraphMode("commits")} className={cn("px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all", graphMode === "commits" ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20" : "text-slate-400 hover:text-white")}>Estimated Pushes</button>
              </div>
            </div>
            <div className="flex-1 p-4">
              <ActivityChart data={activityData} mode={graphMode} loading={loading} />
            </div>
          </div>
        </section>

        {/* ── REPOSITORY PUSH STATUS HUDS ── */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* LEFT: Committed */}
          <div className="bg-slate-900/40 border border-emerald-500/20 rounded-2xl p-4 md:p-5 shadow-2xl backdrop-blur-md relative overflow-hidden flex flex-col h-[350px]">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500/0 via-emerald-500 to-emerald-500/0 opacity-50" />
            <div className="flex items-center justify-between mb-4 shrink-0">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
                <h2 className="text-base font-bold text-emerald-300 tracking-wide drop-shadow-[0_0_5px_rgba(52,211,153,0.3)]">On Schedule</h2>
              </div>
              <Badge variant="outline" className="bg-emerald-950/50 text-emerald-300 border-emerald-800/50 px-3 font-mono">{commitGroups.active.length}</Badge>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-2 space-y-2.5">
              {commitGroups.active.map(t => (
                <div key={t.id} className="flex items-center justify-between p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/10 hover:border-emerald-500/30 transition-colors group">
                  <span className="text-sm font-bold text-emerald-100 truncate pr-2 group-hover:text-emerald-300 transition-colors">{t.team_name}</span>
                  <span className="text-[11px] font-mono font-bold text-emerald-400/90 whitespace-nowrap bg-emerald-950/50 px-2 py-1 rounded-md border border-emerald-500/20">
                    {formatDistanceToNow(new Date(t.last_push), { addSuffix: true })}
                  </span>
                </div>
              ))}
              {commitGroups.active.length === 0 && <div className="h-full flex items-center justify-center"><p className="text-sm text-slate-500/80 font-medium tracking-wide">No teams on schedule.</p></div>}
            </div>
          </div>

          {/* MIDDLE: Missing Commits */}
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
                    {t.last_push ? formatDistanceToNow(new Date(t.last_push), { addSuffix: true }) : "No commits yet"}
                  </span>
                </div>
              ))}
              {commitGroups.violators.length === 0 && <div className="h-full flex items-center justify-center"><p className="text-sm text-emerald-500/80 font-medium tracking-wide">All teams are on track!</p></div>}
            </div>
          </div>

          {/* RIGHT: New Teams */}
          <div className="bg-slate-900/40 border border-blue-500/20 rounded-2xl p-4 md:p-5 shadow-2xl backdrop-blur-md relative overflow-hidden flex flex-col h-[350px]">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500/0 via-blue-400 to-blue-500/0 opacity-50" />
            <div className="flex items-center justify-between mb-4 shrink-0">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-400 drop-shadow-[0_0_8px_rgba(96,165,250,0.5)]" />
                <h2 className="text-base font-bold text-blue-400 tracking-wide drop-shadow-[0_0_5px_rgba(96,165,250,0.3)]">Pending First Push</h2>
              </div>
              <Badge variant="outline" className="bg-blue-950/50 text-blue-300 border-blue-800/50 px-3 font-mono">{commitGroups.newTeams.length}</Badge>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-2 space-y-2.5">
              {commitGroups.newTeams.map(t => (
                <div key={t.id} className="flex items-center justify-between p-3 rounded-xl bg-blue-950/20 border border-blue-500/10 hover:border-blue-500/30 transition-colors group">
                  <span className="text-sm font-bold text-blue-100 truncate pr-2 group-hover:text-blue-300 transition-colors">{t.team_name}</span>
                  <span className="text-[11px] font-mono font-bold text-blue-400/90 whitespace-nowrap bg-blue-950/50 px-2 py-1 rounded-md border border-blue-500/20">Awaiting push</span>
                </div>
              ))}
              {commitGroups.newTeams.length === 0 && <div className="h-full flex items-center justify-center"><p className="text-sm text-slate-500/80 font-medium tracking-wide">No pending teams.</p></div>}
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
                    {featureStrikes && (
                      <SortableHeader label="Strikes" field="strike_count" currentSort={sortField} sortOrder={sortOrder} onClick={handleSort} className="text-center" />
                    )}
                    {featureScoring && (
                      <SortableHeader label="Judge" field="judge_score" currentSort={sortField} sortOrder={sortOrder} onClick={handleSort} className="text-center text-emerald-400" />
                    )}
                    {featureScoring && (
                      <SortableHeader label="Final" field="score" currentSort={sortField} sortOrder={sortOrder} onClick={handleSort} className="text-center" />
                    )}
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
                      {featureStrikes && <td className="px-4 py-3"><div className="h-6 w-6 bg-slate-800 rounded-full mx-auto" /></td>}
                    </tr>
                  )) : filteredAndSortedTeams.length === 0 ? (
                    <tr>
                      <td colSpan={7 + (featureStrikes ? 1 : 0) + (featureScoring ? 2 : 0)} className="px-4 py-16 text-center text-slate-500">
                        <Search className="w-8 h-8 opacity-20 mx-auto mb-3" />
                        <p className="font-medium text-sm">No teams match your filters</p>
                      </td>
                    </tr>
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
                      <td className="px-4 py-3 whitespace-nowrap text-slate-400 text-xs group-hover:text-slate-300 transition-colors">{team.last_push ? formatDistanceToNow(new Date(team.last_push), { addSuffix: true }) : <span className="text-slate-600 italic">Awaiting first push</span>}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Tooltip content={
                          <div className="space-y-1">
                            <p className="font-bold text-white border-b border-white/10 pb-1 mb-1 italic">Activity Pulse</p>
                            <p>High: Last push &lt; 30m</p>
                            <p>Med: Last push &lt; 60m</p>
                            <p>Low: Last push &lt; 120m</p>
                            <p className="text-rose-400">Dead: No recent activity</p>
                          </div>
                        }>
                          <ActivityHeat level={getActivityLevel(team)} />
                        </Tooltip>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap"><StatusBadge status={team.status} /></td>
                      {featureStrikes && (
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          <Tooltip content="Each strike penalizes the automated behavior score.">
                            <span className={cn("inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold border transition-colors", team.strike_count === 0 ? "bg-slate-800 text-slate-300 border-white/10" : team.strike_count === 1 ? "bg-amber-500/20 text-amber-400 border-amber-500/30" : team.strike_count === 2 ? "bg-orange-500/20 text-orange-400 border-orange-500/30" : "bg-rose-500/20 text-rose-400 border-rose-500/30")}>{team.strike_count}</span>
                          </Tooltip>
                        </td>
                      )}
                      {featureScoring && (
                        <td className="px-4 py-3 whitespace-nowrap text-center font-black text-emerald-400">{team.judge_score || 0}</td>
                      )}
                      {featureScoring && (
                        <td className="px-4 py-3 whitespace-nowrap text-center bg-white/5">
                          <span className="font-bold text-white text-base">{team.score || 0}</span>
                        </td>
                      )}
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        {team.status === "disqualified" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-rose-500/10 text-rose-400 text-xs font-bold border border-rose-500/20">❌ DQ&apos;d</span>
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

      {/* Reset Event (New Hackathon) Confirmation Modal */}
      {resetModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-lg bg-slate-900 border border-amber-500/30 rounded-2xl shadow-[0_0_50px_rgba(245,158,11,0.2)] p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
                <RefreshCw className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">Setup New Hackathon</h3>
                <p className="text-xs text-slate-400">Initialize a fresh event cycle with unlocked feature customization.</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/80 border border-white/10 space-y-2.5 text-xs text-slate-300">
              <div className="flex items-center justify-between font-bold text-white pb-2 border-b border-white/10">
                <span>Current Event: #{activeEventId}</span>
                <span className="text-amber-400">Next Event: #{activeEventId + 1}</span>
              </div>
              <p className="text-slate-400">
                ✅ <strong className="text-white">Zero Data Loss:</strong> All existing teams, scores, strikes, and submissions from Event #{activeEventId} will be safely preserved in database archives.
              </p>
              <p className="text-slate-400">
                🔓 <strong className="text-white">Unlock Customization:</strong> Pre-hackathon feature switches (Checkpoints, Strikes, Scoring) will unlock for configuring Event #{activeEventId + 1}.
              </p>
              <p className="text-slate-400">
                ⏱️ <strong className="text-white">Timer Reset:</strong> The hackathon clock and tracking monitor will return to the Unset state.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setResetModalOpen(false)}
                disabled={resettingEvent}
                className="flex-1 px-4 py-2.5 text-sm font-bold text-slate-300 bg-slate-800 rounded-xl border border-white/10 hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleResetEvent}
                disabled={resettingEvent}
                className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-amber-600 hover:bg-amber-500 rounded-xl border border-amber-400/50 shadow-[0_0_15px_rgba(245,158,11,0.3)] transition-all disabled:opacity-50 cursor-pointer"
              >
                {resettingEvent ? "Initializing..." : "Confirm & Setup New Event"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

/* ═══════════════ PRE-HACKATHON CONFIG HUD ═══════════════ */

function PreHackathonConfigHUD({
  checkpoints,
  setCheckpoints,
  strikes,
  setStrikes,
  scoring,
  setScoring,
  commitInterval,
  setCommitInterval,
  isLocked,
  isInitialized,
  activeEventId,
  onSave,
  saving,
  onOpenResetModal
}: {
  checkpoints: boolean;
  setCheckpoints: (val: boolean) => void;
  strikes: boolean;
  setStrikes: (val: boolean) => void;
  scoring: boolean;
  setScoring: (val: boolean) => void;
  commitInterval: number;
  setCommitInterval: (val: number) => void;
  isLocked: boolean;
  isInitialized: boolean;
  activeEventId: number;
  onSave: () => Promise<void>;
  saving: boolean;
  onOpenResetModal: () => void;
}) {
  return (
    <div className="rounded-3xl bg-slate-900/40 border border-white/5 backdrop-blur-md p-6 shadow-2xl relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/5 blur-[120px] pointer-events-none" />

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-cyan-500/10 rounded-2xl border border-cyan-500/20">
            <Sliders className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black tracking-tight text-white">Pre-Hackathon Customization &amp; Feature Control</h2>
              <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-slate-800 text-slate-300 border border-white/10">Event #{activeEventId}</span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Configure event tracking mechanisms before starting the hackathon. Settings lock automatically once active.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isLocked ? (
            <div className="flex items-center gap-2">
              <Badge className="bg-rose-500/10 text-rose-400 border-rose-500/20 text-xs py-1 px-3 uppercase font-bold flex items-center gap-1.5">
                <Lock className="w-3 h-3" /> Locked (Live Event)
              </Badge>
              <Button onClick={onOpenResetModal} size="sm" variant="outline" className="h-8 text-xs border-amber-500/30 text-amber-400 hover:bg-amber-500/10 rounded-xl">
                <RefreshCw className="w-3 h-3 mr-1.5" /> Setup New Event
              </Button>
            </div>
          ) : isInitialized ? (
            <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-xs py-1 px-3 uppercase font-bold flex items-center gap-1.5">
              <Check className="w-3 h-3" /> Configured &amp; Ready
            </Badge>
          ) : (
            <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-xs py-1 px-3 uppercase font-bold flex items-center gap-1.5">
              <AlertCircle className="w-3 h-3" /> Setup Required
            </Badge>
          )}
        </div>
      </div>

      {/* Control Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 my-6">
        {/* Card 1: Commit Checkpoints */}
        <div className={cn("p-5 rounded-2xl border transition-all", checkpoints ? "bg-slate-950/60 border-cyan-500/20 shadow-[0_0_20px_rgba(6,182,212,0.05)]" : "bg-slate-950/30 border-white/5 opacity-70")}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-black uppercase tracking-wider text-slate-400">1. Commit Checkpoints</span>
            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-white/10">
              <button
                type="button"
                onClick={() => setCheckpoints(true)}
                disabled={isLocked}
                className={cn("px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition-all", checkpoints ? "bg-emerald-500 text-slate-950 shadow-md" : "text-slate-400 hover:text-white disabled:opacity-40")}
              >
                ON
              </button>
              <button
                type="button"
                onClick={() => setCheckpoints(false)}
                disabled={isLocked}
                className={cn("px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition-all", !checkpoints ? "bg-rose-500 text-white shadow-md" : "text-slate-400 hover:text-white disabled:opacity-40")}
              >
                OFF
              </button>
            </div>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed min-h-[36px]">
            {checkpoints 
              ? "Teams must commit and push code before designated interval deadlines."
              : "Disabled. Teams push code continuously without fixed checkpoint deadlines."
            }
          </p>

          {/* Interval Selector */}
          {checkpoints && (
            <div className="mt-4 pt-3 border-t border-white/5 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">Commit Interval</span>
              <div className="grid grid-cols-5 gap-1.5">
                {[3, 4, 6, 8, 12].map((hours) => (
                  <button
                    key={hours}
                    type="button"
                    onClick={() => setCommitInterval(hours)}
                    disabled={isLocked}
                    className={cn(
                      "py-1.5 rounded-lg text-xs font-bold transition-all border",
                      commitInterval === hours
                        ? "bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.2)]"
                        : "bg-slate-900/60 border-white/5 text-slate-400 hover:text-white disabled:opacity-40"
                    )}
                  >
                    {hours}h
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Card 2: Strike System */}
        <div className={cn("p-5 rounded-2xl border transition-all", strikes ? "bg-slate-950/60 border-amber-500/20 shadow-[0_0_20px_rgba(245,158,11,0.05)]" : "bg-slate-950/30 border-white/5 opacity-70")}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-black uppercase tracking-wider text-slate-400">2. Strike System</span>
            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-white/10">
              <button
                type="button"
                onClick={() => setStrikes(true)}
                disabled={isLocked}
                className={cn("px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition-all", strikes ? "bg-emerald-500 text-slate-950 shadow-md" : "text-slate-400 hover:text-white disabled:opacity-40")}
              >
                ON
              </button>
              <button
                type="button"
                onClick={() => setStrikes(false)}
                disabled={isLocked}
                className={cn("px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition-all", !strikes ? "bg-rose-500 text-white shadow-md" : "text-slate-400 hover:text-white disabled:opacity-40")}
              >
                OFF
              </button>
            </div>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed min-h-[36px]">
            {strikes 
              ? "Automated warning on 1st missed checkpoint, strikes on subsequent missed checkpoints (3 strikes = out)."
              : "Disabled. Strike mechanics, threat counts, and auto-disqualification flags are removed website-wide."
            }
          </p>
        </div>

        {/* Card 3: Scoring System */}
        <div className={cn("p-5 rounded-2xl border transition-all", scoring ? "bg-slate-950/60 border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.05)]" : "bg-slate-950/30 border-white/5 opacity-70")}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-black uppercase tracking-wider text-slate-400">3. Scoring System</span>
            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-white/10">
              <button
                type="button"
                onClick={() => setScoring(true)}
                disabled={isLocked}
                className={cn("px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition-all", scoring ? "bg-emerald-500 text-slate-950 shadow-md" : "text-slate-400 hover:text-white disabled:opacity-40")}
              >
                ON
              </button>
              <button
                type="button"
                onClick={() => setScoring(false)}
                disabled={isLocked}
                className={cn("px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition-all", !scoring ? "bg-rose-500 text-white shadow-md" : "text-slate-400 hover:text-white disabled:opacity-40")}
              >
                OFF
              </button>
            </div>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed min-h-[36px]">
            {scoring 
              ? "0.0 - 10.0 Technical health scoring engine, public leaderboard, and judge point matrix."
              : "Disabled. Score numbers, leaderboards, and numerical rankings are deactivated website-wide."
            }
          </p>
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-white/5">
        <p className="text-xs text-slate-500">
          {isLocked 
            ? "🔒 Configuration is locked while event is active. Direct API changes are blocked."
            : "Review settings carefully before launching. The hackathon clock will only start after confirmation."
          }
        </p>

        {!isLocked && (
          <Button
            onClick={onSave}
            disabled={saving}
            className="bg-gradient-to-r from-cyan-600 to-blue-500 hover:from-cyan-500 hover:to-blue-400 text-white font-bold text-xs uppercase px-6 py-2.5 rounded-xl shadow-lg shadow-cyan-900/30 transition-all self-end"
          >
            {saving ? "Saving..." : "Confirm & Save Configuration"}
          </Button>
        )}
      </div>
    </div>
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

function InsightCard({ icon, label, value, glow }: { icon: React.ReactNode; label: string; value: string; glow: string }) {
  return (
    <PremiumCard glowColor={glow} className="p-4">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-slate-950/50 border border-white/5 shrink-0 group-hover:scale-110 transition-transform duration-300">{icon}</div>
        <div className="min-w-0">
          <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">{label}</p>
          <p className="text-sm font-bold text-white truncate mt-0.5 group-hover:-translate-y-px transition-transform duration-300">{value}</p>
        </div>
      </div>
    </PremiumCard>
  );
}

function StatCard({ title, value, loading, icon: Icon, glowColor, iconColor }: any) {
  return (
    <PremiumCard glowColor={glowColor} className="p-4">
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">{title}</p>
          {loading ? <div className="h-8 w-12 bg-slate-800 rounded animate-pulse" /> : <p className="text-3xl font-extrabold text-white tabular-nums group-hover:-translate-y-px transition-transform duration-300">{value}</p>}
        </div>
        <div className="p-2.5 rounded-xl bg-slate-950/50 border border-white/5 group-hover:scale-110 group-hover:border-white/10 transition-all duration-300">{loading ? <div className="w-5 h-5 bg-slate-800 rounded animate-pulse" /> : <Icon className={cn("w-5 h-5", iconColor)} />}</div>
      </div>
    </PremiumCard>
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

function HackathonClockPanel({
  onManualCheck,
  triggering,
  lastChecked,
  timerState,
  setTimerState,
  featureConfigInitialized,
  onOpenResetModal,
  activeEventId
}: {
  onManualCheck: () => void;
  triggering: boolean;
  lastChecked: Date;
  timerState: TimerState;
  setTimerState: (s: TimerState) => void;
  featureConfigInitialized: boolean;
  onOpenResetModal: () => void;
  activeEventId: number;
}) {
  const [now, setNow] = useState<Date | null>(null);
  const [isEmergencyLocked, setIsEmergencyLocked] = useState(true);
  const [pendingAction, setPendingAction] = useState<"stop" | "restart" | null>(null);
  
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

  const handleTimerAction = async (action: "start" | "pause" | "stop" | "restart" | "update" | "unset", overrideDuration?: number, statusOverride?: "running" | "paused" | "stopped" | "unset", confirmed = false) => {
    if ((action === "restart" || action === "stop") && !confirmed) {
      if (isEmergencyLocked) {
        toast.error("Emergency Zone is Locked. Unlock first.");
        return;
      }
      setPendingAction(action);
      return;
    }

    if (action === "start" && !featureConfigInitialized) {
      toast.error("Please configure and save Pre-Hackathon feature controls before starting the event.");
      return;
    }

    let newStatus = statusOverride ? statusOverride : 
                    action === "update" ? timerState.status : 
                    action === "start" ? "running" : 
                    action === "pause" ? "paused" : 
                    action === "restart" ? "running" : 
                    (action === "unset" || action === "stop") ? "unset" : "stopped";
    
    if (action === "start" && timerState.status === "running") return;
    
    const body: any = {};
    if (action !== "update") body.timer_status = newStatus;

    let newAccumulated = timerState.accumulatedMs;
    let newStartTime = timerState.startTime;

    if (action === "start") {
      newStartTime = new Date();
      body.timer_start_time = newStartTime.toISOString();
      if (timerState.status === "stopped") { newAccumulated = 0; body.timer_accumulated_ms = 0; }
    } else if (action === "restart") {
      newStartTime = new Date();
      newAccumulated = 0;
      body.timer_start_time = newStartTime.toISOString();
      body.timer_accumulated_ms = 0;
    } else if (action === "pause") {
      newAccumulated = elapsedMs;
      body.timer_accumulated_ms = newAccumulated;
    } else if (action === "stop" || action === "unset") {
      newAccumulated = 0;
      body.timer_accumulated_ms = 0;
    }

    if (overrideDuration !== undefined) {
      body.timer_duration_hours = Math.round(overrideDuration * 100) / 100;
    }

    setTimerState({ status: newStatus as any, startTime: newStartTime, accumulatedMs: newAccumulated, durationHours: overrideDuration ?? timerState.durationHours, announcement: timerState.announcement });
    if (action === "stop" || action === "restart") setElapsedMs(0);

    const toastId = toast.loading(action === "update" ? "Updating duration..." : action === "unset" ? "Deactivating timer..." : `${action === 'start' ? 'Starting' : action === 'restart' ? 'Restarting' : action === 'pause' ? 'Pausing' : 'Stopping'} timer...`);
    try {
      const res = await fetch("/api/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error("Failed");
      toast.success(action === "update" ? "Duration Updated" : `Timer ${newStatus}`, { id: toastId });
    } catch {
      toast.error("Failed to sync timer", { id: toastId });
    }
  };

  const handleAddMinutes = (mins: number) => {
    const currentHours = timerState.durationHours || 24;
    const addedHours = mins / 60;
    handleTimerAction("update", currentHours + addedHours);
  };

  const totalDuration = timerState.durationHours || 24;
  const [localDuration, setLocalDuration] = useState(totalDuration.toString());
  
  useEffect(() => { setLocalDuration(totalDuration.toString()); }, [totalDuration]);

  if (!now) return <div className="h-48 w-full animate-pulse bg-slate-900/50 rounded-2xl border border-white/5 mb-8"></div>;
  
  const elapsedHrs = Math.floor(elapsedMs / (1000 * 60 * 60));
  const elapsedMins = Math.floor((elapsedMs % (1000 * 60 * 60)) / (1000 * 60));

  const totalMs = totalDuration * 60 * 60 * 1000;
  const progressPercent = Math.min(100, (elapsedMs / totalMs) * 100);

  const remainingMs = Math.max(0, totalMs - elapsedMs);
  const remHrs = Math.floor(remainingMs / (1000 * 60 * 60));
  const remMins = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
  const remSecs = Math.floor((remainingMs % (1000 * 60)) / 1000);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10 items-stretch">
      
      {/* 🟢 COLUMN 1: LIVE PULSE 🟢 */}
      <div className="lg:col-span-2 relative overflow-hidden rounded-3xl bg-slate-900/40 border border-white/5 backdrop-blur-md shadow-2xl p-6 flex flex-col justify-between group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none group-hover:bg-cyan-500/20 transition-all duration-700" />
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 flex items-center gap-2">
              <span className={cn("w-2 h-2 rounded-full", timerState.status === 'running' ? "bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" : timerState.status === 'paused' ? "bg-amber-500" : timerState.status === 'unset' ? "bg-slate-700" : "bg-rose-500")} />
              Event Status
            </span>
            <h3 className={cn("text-3xl font-black italic tracking-tighter uppercase", 
              timerState.status === 'running' ? "text-emerald-400" : 
              timerState.status === 'paused' ? "text-amber-400" : 
              timerState.status === 'unset' ? "text-slate-500" : "text-rose-400"
            )}>
              {timerState.status === 'running' ? "Hackathon LIVE" : 
               timerState.status === 'paused' ? "Timer Paused" : 
               timerState.status === 'unset' ? "Timer Unset" : "Event Stopped"}
            </h3>
          </div>
          
          <div className="flex flex-col items-end">
             <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Time Remaining</span>
             <div className="text-4xl font-mono font-black tracking-tighter tabular-nums text-white flex items-center gap-1">
                {remHrs.toString().padStart(2, '0')}<span className="text-slate-600 font-sans text-xl">:</span>
                {remMins.toString().padStart(2, '0')}<span className="text-slate-600 font-sans text-xl">:</span>
                {remSecs.toString().padStart(2, '0')}
             </div>
          </div>
        </div>

        {/* Progress Bar & Flexible Timing */}
        <div className="space-y-4">
           <div className="flex justify-between items-end gap-4 mb-1">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex flex-col">
                 <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Event Progress</span>
                 <div className="flex items-center gap-2">
                    <span className="text-2xl font-black text-white">{Math.floor(progressPercent)}%</span>
                    <span className="text-[10px] font-bold text-slate-600 uppercase">Complete</span>
                 </div>
              </div>
              
              <div className="flex flex-wrap items-center gap-2 bg-slate-950/50 p-1.5 rounded-2xl border border-white/5 shadow-inner">
                 <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-2 px-1">Set Target:</span>
                 <div className="flex items-center gap-1.5 bg-slate-900/40 p-1 rounded-xl border border-white/5">
                   {[3, 5, 10, 24].map((h) => (
                     <button 
                       key={h}
                       onClick={() => handleTimerAction("update", h)}
                       className={cn("px-3 py-1.5 rounded-lg text-[10px] font-black transition-all", 
                         totalDuration === h ? "bg-cyan-600 text-white shadow-lg shadow-cyan-900/40" : "bg-slate-950/50 text-slate-500 hover:text-slate-200 hover:bg-slate-800"
                       )}
                     >
                       {h}H
                     </button>
                   ))}
                 </div>
                 
                 <div className="w-px h-6 bg-white/10 mx-1" />
                 
                 <div className="flex items-center gap-1.5">
                    <div className="relative group/input">
                       <Input 
                         type="number" 
                         value={localDuration}
                         onChange={(e) => setLocalDuration(e.target.value)}
                         className="w-16 h-10 bg-slate-950 border-white/10 text-xs font-black text-center focus:ring-cyan-500/50 p-0 rounded-xl"
                       />
                       <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[9px] px-2 py-1 rounded opacity-0 group-hover/input:opacity-100 transition-opacity pointer-events-none whitespace-nowrap border border-white/5 shadow-xl">Manual Hours</span>
                    </div>
                    <Button 
                      onClick={() => {
                        if (timerState.status === "unset") {
                          const val = parseFloat(localDuration);
                          const finalDuration = (!isNaN(val) && val > 0) ? Math.round(val * 100) / 100 : timerState.durationHours;
                          handleTimerAction("update", finalDuration, "stopped"); 
                        } else {
                          handleTimerAction("unset");
                        }
                      }}
                      size="sm"
                      className={cn(
                        "h-10 px-4 text-[10px] font-black uppercase rounded-xl transition-all shadow-lg",
                        timerState.status === "unset" 
                          ? "bg-cyan-600/90 hover:bg-cyan-500 text-white" 
                          : "bg-rose-600/90 hover:bg-rose-500 text-white"
                      )}
                    >
                      {timerState.status === "unset" ? "Set" : "Unset"}
                    </Button>
                 </div>
              </div>
           </div>
           </div>

           <div className="h-3 w-full bg-slate-950 rounded-full border border-white/5 overflow-hidden shadow-inner p-[1px]">
              <div 
                className={cn("h-full rounded-full transition-all duration-1000 shadow-[0_0_15px_rgba(6,182,212,0.3)]", 
                  timerState.status === 'running' ? "bg-gradient-to-r from-cyan-600 to-blue-400" : "bg-slate-700"
                )}
                style={{ width: `${progressPercent}%` }}
              />
           </div>
           <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-500">
              <span className="flex items-center gap-2"><Clock className="w-3 h-3" /> Elapsed: {elapsedHrs}h {elapsedMins}m</span>
              <span className="text-slate-400">Target Duration: {totalDuration} Hours</span>
           </div>
        </div>

        {/* Controls Row */}
        <div className="mt-8 flex flex-wrap items-center gap-3">
           <Button 
             onClick={() => handleTimerAction('start')} 
             disabled={timerState.status === 'running'} 
             className={cn("h-12 px-6 rounded-xl font-black uppercase tracking-widest transition-all shadow-lg",
               timerState.status !== 'running' 
                 ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/20" 
                 : "bg-slate-800 text-slate-500 opacity-50"
             )}
           >
             <Play className="w-5 h-5 mr-3 fill-current" /> Start / Resume
           </Button>
           
           <Button 
             onClick={() => handleTimerAction('pause')} 
             disabled={timerState.status !== 'running'} 
             className="h-12 px-6 rounded-xl font-black uppercase tracking-widest bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50"
           >
             <Pause className="w-5 h-5 mr-3 fill-current" /> Pause
           </Button>

           <div className="h-10 w-px bg-white/10 mx-2 hidden sm:block" />

           <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mr-2">Extensions</span>
              <Button onClick={() => handleAddMinutes(10)} size="sm" variant="outline" className="h-10 px-3 bg-slate-950/50 border-white/10 text-white hover:bg-cyan-900/30 hover:border-cyan-500/50 rounded-lg text-xs font-bold">+10m</Button>
              <Button onClick={() => handleAddMinutes(30)} size="sm" variant="outline" className="h-10 px-3 bg-slate-950/50 border-white/10 text-white hover:bg-cyan-900/30 hover:border-cyan-500/50 rounded-lg text-xs font-bold">+30m</Button>
              <Button onClick={() => handleAddMinutes(60)} size="sm" variant="outline" className="h-10 px-3 bg-slate-950/50 border-white/10 text-white hover:bg-indigo-900/30 hover:border-indigo-500/50 rounded-lg text-xs font-bold">+1h</Button>
           </div>
        </div>
      </div>

      {/* 🔴 COLUMN 2: SECONDARY OPS & EMERGENCY 🔴 */}
      <div className="flex flex-col gap-6">
        {/* Projector View & Sync */}
        <div className="rounded-3xl bg-slate-900/40 border border-white/5 p-5 backdrop-blur-md flex-1 flex flex-col justify-between gap-4">
           <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-500">Live Services</span>
              <div className="flex gap-2">
                 <Button onClick={() => window.open("/admin/timer", "_blank")} size="sm" className="h-10 bg-slate-800 hover:bg-slate-700 border border-white/5 text-slate-300 text-[10px] font-black uppercase px-4 rounded-xl transition-all"><Monitor className="w-4 h-4 mr-2" /> View Projector</Button>
                 <Button onClick={onManualCheck} disabled={triggering} size="sm" className={cn("h-10 text-white text-[10px] font-black uppercase px-4 rounded-xl transition-all shadow-lg", 
                   triggering ? "bg-slate-800" : "bg-cyan-600 hover:bg-cyan-500 shadow-cyan-900/20 animate-pulse border border-cyan-400/30"
                 )}>
                   <RefreshCw className={cn("w-4 h-4 mr-2", triggering && "animate-spin")} /> Run Sync
                 </Button>
              </div>
           </div>

           <div className="space-y-3">
               <div className="flex gap-2">
                  <Input 
                    placeholder="Global Announcement Alert..." 
                    id="announcementInput" 
                    defaultValue={timerState?.announcement || ""} 
                    className="h-10 text-xs bg-slate-950/80 border-white/10 text-white placeholder:text-slate-600 pl-4 rounded-xl focus:ring-cyan-500/50 flex-1" 
                  />
                  <Button className="h-10 bg-cyan-600 hover:bg-cyan-500 text-white text-[10px] font-black px-5 rounded-xl transition-all shadow-lg" onClick={async () => {
                     const val = (document.getElementById('announcementInput') as HTMLInputElement).value;
                     const toastId = toast.loading("Updating Ticker...");
                     try {
                       const res = await fetch("/api/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ global_announcement: val }) });
                       if (!res.ok) throw new Error("Failed");
                       toast.success("Ticker Updated", { id: toastId });
                       setTimerState({ ...timerState, announcement: val });
                     } catch { toast.error("Error", { id: toastId }); }
                  }}>Update</Button>
               </div>
            </div>
           
           <div className="flex items-center justify-between text-[11px] text-slate-500">
              <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Server Time: {now.toLocaleTimeString([], { hour12: false })}</span>
              <span className="italic font-medium">Last Sync: {lastChecked.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
           </div>
        </div>

        {/* The Danger Zone */}
        <div className="rounded-3xl bg-rose-950/20 border border-rose-500/10 p-5 backdrop-blur-md relative group transition-all duration-300">
           <div className="flex items-center justify-between mb-4">
              <div className="flex flex-col">
                 <span className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-500/80">Emergency Zone</span>
                 <span className="text-[9px] font-bold text-slate-500 uppercase mt-0.5">High-Stakes Actions</span>
              </div>
              <button 
                onClick={() => setIsEmergencyLocked(!isEmergencyLocked)}
                className={cn("flex items-center gap-2 px-5 py-2.5 rounded-xl border transition-all text-[11px] font-black uppercase tracking-widest shadow-lg",
                  isEmergencyLocked 
                    ? "bg-slate-800 text-slate-400 border-white/10 hover:bg-slate-700 hover:text-white" 
                    : "bg-rose-600 text-white border-rose-400 shadow-[0_0_25px_rgba(225,29,72,0.4)] animate-pulse"
                )}
              >
                {isEmergencyLocked ? <Lock className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
                {isEmergencyLocked ? "LOCKED (Arm System)" : "ARMED (High Alert)"}
              </button>
           </div>
           
           <div className="relative group/grid">
             <div className={cn("grid grid-cols-2 gap-3 transition-all duration-500", isEmergencyLocked ? "opacity-30 blur-[2px] pointer-events-none grayscale" : "opacity-100")}>
                <Button 
                  onClick={() => handleTimerAction('stop')} 
                  variant="outline" 
                  className="h-10 bg-transparent border-rose-500/30 text-rose-400 hover:bg-rose-500 hover:text-white transition-all font-black uppercase tracking-widest text-[10px]"
                >
                  <Square className="w-3.5 h-3.5 mr-2" /> Stop Event
                </Button>
                <Button 
                  onClick={() => handleTimerAction('restart')} 
                  variant="outline"
                  className="h-10 bg-transparent border-cyan-500/30 text-cyan-400 hover:bg-cyan-500 hover:text-white transition-all font-black uppercase tracking-widest text-[10px]"
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-2" /> Reset Clock
                </Button>
                <Button 
                  onClick={onOpenResetModal}
                  variant="outline"
                  className="col-span-2 h-10 bg-amber-950/20 border-amber-500/30 text-amber-400 hover:bg-amber-500 hover:text-white transition-all font-black uppercase tracking-widest text-[10px]"
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-2" /> Setup New Hackathon (Reset Event)
                </Button>
             </div>
             
             {isEmergencyLocked && (
               <div className="absolute inset-0 flex items-center justify-center p-2 text-center z-10">
                  <p className="text-[10px] font-extrabold text-slate-400 uppercase bg-slate-900/90 px-3 py-1 rounded-lg border border-white/5 shadow-2xl backdrop-blur-sm">Controls Locked</p>
               </div>
             )}

             {pendingAction && (
                <div className="absolute inset-[-12px] z-50 flex flex-col items-center justify-center bg-slate-950/95 backdrop-blur-md rounded-3xl border border-rose-500/50 shadow-[0_0_50px_rgba(225,29,72,0.3)] animate-in fade-in zoom-in duration-200 p-4 text-center">
                  <p className="text-[11px] font-black text-rose-500 uppercase tracking-tighter mb-1">Confirm {pendingAction === 'restart' ? 'Reset' : 'Termination'}?</p>
                  <p className="text-[9px] text-slate-400 mb-4 leading-tight">This will affect ALL participants globally.</p>
                  <div className="flex gap-2 w-full">
                    <Button 
                      size="sm" 
                      className="flex-1 bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-black uppercase h-8"
                      onClick={() => {
                        handleTimerAction(pendingAction, undefined, undefined, true);
                        setPendingAction(null);
                      }}
                    >Confirm</Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="flex-1 border-white/10 text-slate-400 text-[10px] font-black uppercase h-8 hover:bg-white/5"
                      onClick={() => setPendingAction(null)}
                    >Cancel</Button>
                  </div>
                </div>
             )}
           </div>
        </div>
      </div>
    </div>
  );
}
