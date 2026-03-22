"use client";

import { useEffect, useState, useMemo } from "react";
import { formatDistanceToNow } from "date-fns";
import { 
  ShieldAlert, CheckCircle2, AlertTriangle, XCircle, 
  Search, RefreshCw, Lock, Unlock, Users, 
  ExternalLink, Github, Activity, ArrowUpDown, Clock,
  Gavel, ChevronLeft, ChevronRight, Play, Layers, Trophy
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Team = {
  id: string;
  team_name: string;
  repo_url: string;
  deployment_url: string | null;
  last_push: string;
  status: "active" | "warning" | "inactive" | "disqualified";
  strike_count: number;
};

type SortField = 'team_name' | 'last_push' | 'strike_count' | 'status';
type SortOrder = 'asc' | 'desc';

export default function AdminDashboard() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [filter, setFilter] = useState<Team["status"] | "all">("all");
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>('last_push');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  
  const [submissionsLocked, setSubmissionsLocked] = useState(false);
  const [locking, setLocking] = useState(false);
  
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date>(new Date());

  const [judgeMode, setJudgeMode] = useState(false);
  const [judgeIndex, setJudgeIndex] = useState(0);

  const fetchDashboardData = async () => {
    try {
      const [teamsRes, settingsRes] = await Promise.all([
        fetch("/api/teams"),
        fetch("/api/settings"),
      ]);
      
      if (teamsRes.ok) setTeams(await teamsRes.json());
      if (settingsRes.ok) {
        const settings = await settingsRes.json();
        setSubmissionsLocked(settings.submissions_locked);
      }
      setLastChecked(new Date());
    } catch (e) {
      console.error("Failed to fetch dashboard data", e);
      toast.error("Network issue when refreshing data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(() => {
        fetchDashboardData();
      }, 30000); // 30s refresh
    }
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const handleTriggerCron = async () => {
    setTriggering(true);
    const toastId = toast.loading("Executing hourly monitor check...");
    try {
      const res = await fetch("/api/admin/trigger", { method: "POST" });
      if (res.ok) {
        await fetchDashboardData();
        toast.success("Monitoring checks executed successfully", { id: toastId });
      } else {
        toast.error("Failed to trigger check", { id: toastId });
      }
    } catch (e) {
      console.error(e);
      toast.error("Error triggering system check", { id: toastId });
    } finally {
      setTriggering(false);
    }
  };

  const handleToggleLock = async () => {
    setLocking(true);
    const toastId = toast.loading("Updating security settings...");
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissions_locked: !submissionsLocked }),
      });
      if (res.ok) {
        setSubmissionsLocked(!submissionsLocked);
        toast.success(!submissionsLocked ? "Submissions Locked!" : "Submissions Opened!", { id: toastId });
      } else {
        toast.error("Failed to update security settings", { id: toastId });
      }
    } catch (e) {
      console.error(e);
      toast.error("Error modifying lock state", { id: toastId });
    } finally {
      setLocking(false);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const filteredAndSortedTeams = useMemo(() => {
    let result = teams;

    if (search.trim()) {
      const query = search.toLowerCase();
      result = result.filter(t => t.team_name.toLowerCase().includes(query));
    }

    if (filter !== "all") {
      result = result.filter((t) => t.status === filter);
    }

    return result.sort((a, b) => {
      let comparison = 0;
      if (sortField === 'team_name') {
        comparison = a.team_name.localeCompare(b.team_name);
      } else if (sortField === 'last_push') {
        comparison = new Date(a.last_push).getTime() - new Date(b.last_push).getTime();
      } else if (sortField === 'strike_count') {
        comparison = a.strike_count - b.strike_count;
      } else if (sortField === 'status') {
        comparison = a.status.localeCompare(b.status);
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [teams, filter, search, sortField, sortOrder]);

  const stats = useMemo(() => {
    return {
      total: teams.length,
      active: teams.filter(t => t.status === 'active').length,
      warning: teams.filter(t => t.status === 'warning').length,
      inactive: teams.filter(t => t.status === 'inactive' || t.status === 'disqualified').length,
    };
  }, [teams]);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 font-sans selection:bg-cyan-500/30 overflow-x-hidden">
      {/* Deep Cyberpunk / Neon Background Overlay */}
      <div className="fixed inset-0 z-0 pointer-events-none bg-[radial-gradient(circle_at_50%_0%,rgba(6,182,212,0.08),transparent_50%),radial-gradient(circle_at_80%_80%,rgba(147,51,234,0.08),transparent_50%)]" />

      <div className="relative z-10 max-w-7xl mx-auto p-6 md:p-8 space-y-8">
        
        {/* TOP HEADER */}
        <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 pb-6 border-b border-white/5">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <ShieldAlert className="w-8 h-8 text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]" />
              <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                Control Panel
              </h1>
            </div>
            <div className="flex items-center gap-2 text-sm text-cyan-400/80 font-medium">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
              </span>
              System Monitoring Active
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="text-xs text-slate-400 flex items-center gap-1.5 bg-slate-900/50 px-3 py-1.5 rounded-full border border-white/5 shadow-inner">
              <Clock className="w-3.5 h-3.5" /> Checked {formatDistanceToNow(lastChecked, { addSuffix: true })}
            </div>

            <Button
              onClick={() => window.location.href = '/admin/projects'}
              variant="outline"
              className="bg-slate-900/50 border-white/10 text-slate-300 hover:bg-indigo-900/40 hover:text-indigo-300 hover:border-indigo-500/50 transition-all duration-300 rounded-xl shadow-[0_0_15px_rgba(79,70,229,0)] hover:shadow-[0_0_15px_rgba(79,70,229,0.3)]"
            >
              <Layers className="w-4 h-4 mr-2" />
              Project Gallery
            </Button>

            <Button
              onClick={() => window.location.href = '/admin/submissions'}
              variant="outline"
              className="bg-slate-900/50 border-white/10 text-slate-300 hover:bg-amber-900/30 hover:text-amber-300 hover:border-amber-500/50 transition-all duration-300 rounded-xl shadow-[0_0_15px_rgba(245,158,11,0)] hover:shadow-[0_0_15px_rgba(245,158,11,0.3)]"
            >
              <Trophy className="w-4 h-4 mr-2" />
              Final Submissions
            </Button>
            
            <Button
              onClick={() => {
                setJudgeMode(!judgeMode);
                setJudgeIndex(0);
              }}
              variant="outline"
              className={cn(
                "transition-all duration-300 rounded-xl",
                judgeMode 
                  ? "bg-cyan-900/40 text-cyan-300 border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.3)] hover:bg-cyan-800/50 hover:text-cyan-200" 
                  : "bg-slate-900/50 border-white/10 text-slate-300 hover:bg-slate-800 hover:text-white"
              )}
            >
              <Gavel className={cn("w-4 h-4 mr-2 transition-colors", judgeMode && "text-cyan-400")} />
              {judgeMode ? "Exit Judge Mode" : "Judge Mode"}
            </Button>

            <Button
              onClick={handleToggleLock}
              disabled={locking || loading}
              variant="outline"
              className={cn(
                "border-white/10 bg-slate-900/50 backdrop-blur-md hover:bg-slate-800 transition-all rounded-xl",
                submissionsLocked ? "text-red-400 hover:text-red-300 border-red-900/30" : "text-slate-200"
              )}
            >
              {submissionsLocked ? <Lock className="w-4 h-4 mr-2" /> : <Unlock className="w-4 h-4 mr-2" />}
              {submissionsLocked ? "Submissions Locked" : "Submissions Open"}
            </Button>
            <Button
              onClick={handleTriggerCron}
              disabled={triggering || loading}
              className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold shadow-[0_0_15px_rgba(6,182,212,0.4)] hover:shadow-[0_0_25px_rgba(6,182,212,0.6)] transition-all border-none rounded-xl"
            >
              <Activity className={cn("w-4 h-4 mr-2", triggering && "animate-spin")} />
              {triggering ? "Running..." : "Run Check Now"}
            </Button>
          </div>
        </header>

        {judgeMode ? (
          <JudgeModeView 
            teams={filteredAndSortedTeams} 
            currentIndex={judgeIndex} 
            setIndex={setJudgeIndex} 
          />
        ) : (
          <>
            {/* STATS ARRAY (4 CARDS) */}
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard 
                title="Total Teams" 
                value={stats.total} 
                loading={loading}
                icon={Users} 
                glowColor="rgba(255,255,255,0.1)" 
                iconColor="text-slate-200"
              />
              <StatCard 
                title="Active Standing" 
                value={stats.active} 
                loading={loading}
                icon={CheckCircle2} 
                glowColor="rgba(34,197,94,0.15)" 
                iconColor="text-emerald-400"
                ringClass="group-hover:ring-emerald-500/50"
              />
              <StatCard 
                title="Warning (1-2 Strikes)" 
                value={stats.warning} 
                loading={loading}
                icon={AlertTriangle} 
                glowColor="rgba(234,179,8,0.15)" 
                iconColor="text-amber-400"
                ringClass="group-hover:ring-amber-500/50"
              />
              <StatCard 
                title="Inactive / DQ" 
                value={stats.inactive} 
                loading={loading}
                icon={XCircle} 
                glowColor="rgba(239,68,68,0.15)" 
                iconColor="text-rose-400"
                ringClass="group-hover:ring-rose-500/50"
              />
            </section>

            {/* MAIN DATA SECTION */}
            <section className="space-y-4 animate-in fade-in duration-300">
              
              {/* Filters & Controls */}
              <div className="flex flex-col md:flex-row justify-between gap-4 p-4 rounded-xl bg-slate-900/40 border border-white/5 backdrop-blur-md">
                <div className="flex overflow-x-auto no-scrollbar gap-1 p-1 bg-slate-950/50 rounded-lg border border-white/5">
                  {(['all', 'active', 'warning', 'inactive', 'disqualified'] as const).map(f => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={cn(
                        "px-4 py-1.5 text-sm font-medium rounded-md capitalize whitespace-nowrap transition-all duration-200",
                        filter === f 
                          ? "bg-slate-800 text-white shadow-sm ring-1 ring-white/10" 
                          : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                      )}
                    >
                      {f}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <Input 
                      placeholder="Search teams..." 
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-9 bg-slate-950/50 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-cyan-500/50 w-full md:w-64 transition-all"
                    />
                  </div>
                  <button 
                    onClick={() => setAutoRefresh(!autoRefresh)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 border",
                      autoRefresh 
                        ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20 shadow-[0_0_10px_rgba(6,182,212,0.1)]" 
                        : "bg-slate-900/50 text-slate-400 border-white/5 hover:text-slate-200"
                    )}
                  >
                    <RefreshCw className={cn("w-4 h-4 transition-transform", autoRefresh && "animate-spin-slow text-cyan-400")} />
                    Auto
                  </button>
                </div>
              </div>

              {/* TABLE CONTAINER */}
              <div className="rounded-xl border border-white/10 bg-slate-900/30 backdrop-blur-xl overflow-hidden shadow-2xl relative">
                
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-sm text-left border-collapse">
                    <thead className="text-xs tracking-wider text-slate-400 uppercase bg-slate-950/90 backdrop-blur-xl sticky top-0 z-10 border-b border-white/10 shadow-sm">
                      <tr>
                        <SortableHeader label="Team Name" field="team_name" currentSort={sortField} sortOrder={sortOrder} onClick={handleSort} />
                        <th className="px-6 py-4 font-medium transition-colors">Repository</th>
                        <th className="px-6 py-4 font-medium transition-colors">Live App</th>
                        <SortableHeader label="Last Push" field="last_push" currentSort={sortField} sortOrder={sortOrder} onClick={handleSort} />
                        <SortableHeader label="Status" field="status" currentSort={sortField} sortOrder={sortOrder} onClick={handleSort} />
                        <SortableHeader label="Strikes" field="strike_count" currentSort={sortField} sortOrder={sortOrder} onClick={handleSort} className="text-center" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 relative">
                      {loading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                          <tr key={i} className="animate-pulse border-b border-white/5">
                            <td className="px-6 py-4"><div className="h-5 w-32 bg-slate-800 rounded-md"></div></td>
                            <td className="px-6 py-4"><div className="h-6 w-20 bg-slate-800 rounded-md"></div></td>
                            <td className="px-6 py-4"><div className="h-6 w-24 bg-slate-800 rounded-md"></div></td>
                            <td className="px-6 py-4"><div className="h-5 w-24 bg-slate-800 rounded-md"></div></td>
                            <td className="px-6 py-4"><div className="h-6 w-16 bg-slate-800 rounded-full"></div></td>
                            <td className="px-6 py-4"><div className="h-6 w-6 bg-slate-800 rounded-full mx-auto"></div></td>
                          </tr>
                        ))
                      ) : filteredAndSortedTeams.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-12 text-center text-slate-500 bg-slate-900/20">
                            <div className="flex flex-col items-center justify-center gap-3">
                              <Search className="w-10 h-10 opacity-20" />
                              <p className="font-medium text-slate-400 tracking-wide text-base">No teams found matching criteria.</p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        filteredAndSortedTeams.map((team) => (
                          <tr 
                            key={team.id} 
                            className={cn(
                              "group transition-colors duration-200",
                              team.status === 'active' && "hover:bg-emerald-900/10 bg-transparent",
                              team.status === 'warning' && "hover:bg-amber-900/10 bg-amber-950/5",
                              team.status === 'inactive' && "hover:bg-rose-900/10 bg-rose-950/10",
                              team.status === 'disqualified' && "hover:bg-rose-900/20 bg-rose-950/20 opacity-75"
                            )}
                          >
                            <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-200 transition-colors">
                              {team.team_name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <a 
                                href={team.repo_url} 
                                target="_blank" 
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-slate-800/50 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors text-xs border border-white/5"
                              >
                                <Github className="w-4 h-4" /> Source
                              </a>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {team.deployment_url ? (
                                <a 
                                  href={team.deployment_url} 
                                  target="_blank" 
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-cyan-900/20 hover:bg-cyan-900/40 text-cyan-300 hover:text-cyan-200 transition-colors text-xs border border-cyan-500/20 shadow-[0_0_8px_rgba(6,182,212,0.1)] group-hover:shadow-[0_0_12px_rgba(6,182,212,0.2)]"
                                >
                                  <ExternalLink className="w-4 h-4" /> Open App
                                </a>
                              ) : (
                                <span className="text-slate-600 text-xs italic">Pending</span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-slate-400 transition-colors group-hover:text-slate-300">
                              {formatDistanceToNow(new Date(team.last_push), { addSuffix: true })}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap transition-colors">
                              <StatusBadge status={team.status} />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center transition-colors">
                              <span className={cn(
                                "inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold border shadow-inner transition-colors",
                                team.strike_count === 0 ? "bg-slate-800 text-slate-300 border-white/10" :
                                team.strike_count === 1 ? "bg-amber-500/20 text-amber-400 border-amber-500/30" :
                                team.strike_count === 2 ? "bg-orange-500/20 text-orange-400 border-orange-500/30" :
                                "bg-rose-500/20 text-rose-400 border-rose-500/30"
                              )}>
                                {team.strike_count}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                {/* Inner Border Glow */}
                <div className="absolute inset-0 pointer-events-none rounded-xl border border-white/5 transition-colors" />
              </div>
            </section>
          </>
        )}

      </div>
    </main>
  );
}


/* --- HELPER COMPONENTS --- */

function JudgeModeView({ teams, currentIndex, setIndex }: { teams: Team[], currentIndex: number, setIndex: (i: number) => void }) {
  const next = () => { if (currentIndex < teams.length - 1) setIndex(currentIndex + 1); };
  const prev = () => { if (currentIndex > 0) setIndex(currentIndex - 1); };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft') prev();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, teams.length]);

  if (teams.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-20 min-h-[50vh] bg-slate-900/20 rounded-2xl border border-white/5 animate-in fade-in duration-300">
         <Gavel className="w-16 h-16 text-slate-600 mb-4" />
         <h2 className="text-2xl font-bold text-slate-400">No teams available to judge</h2>
         <p className="text-slate-500 mt-2">Try clearing your filters or search query.</p>
      </div>
    );
  }

  const team = teams[currentIndex];

  return (
    <div className="relative max-w-4xl mx-auto mt-8 mb-20 animate-in fade-in zoom-in-95 duration-500">
      <div className="p-10 md:p-14 rounded-[2rem] bg-slate-900/60 border border-white/10 backdrop-blur-xl shadow-2xl relative overflow-hidden group">
         {/* inner glow bg */}
         <div className="absolute top-0 right-0 -mt-20 -mr-20 w-96 h-96 bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none transition-opacity group-hover:opacity-100 opacity-50" />
         
         {/* Header area */}
         <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12 relative z-10">
           <div>
             <h2 className="text-5xl md:text-6xl font-extrabold text-white mb-6 tracking-tight drop-shadow-md">{team.team_name}</h2>
             <div className="flex flex-wrap items-center gap-4">
               <StatusBadge status={team.status} />
               <div className="hidden md:block h-6 w-px bg-white/10" />
               <span className="text-sm font-medium text-slate-400 flex items-center gap-2">
                 <Clock className="w-4 h-4 text-slate-500"/> Pushed {formatDistanceToNow(new Date(team.last_push), { addSuffix: true })}
               </span>
               <div className="hidden md:block h-6 w-px bg-white/10" />
               <span className="text-sm font-medium text-slate-400 flex items-center gap-2">
                 <ShieldAlert className="w-4 h-4 text-amber-500" /> Strikes: <span className="text-white font-bold">{team.strike_count}</span>
               </span>
             </div>
           </div>
           <div className="bg-slate-950/80 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/10 shadow-inner md:absolute top-0 right-0">
             <p className="text-sm text-cyan-400 tracking-widest uppercase font-bold flex items-center gap-2">
               <Gavel className="w-4 h-4"/> Team {currentIndex + 1} <span className="text-slate-600 font-normal">/</span> {teams.length}
             </p>
           </div>
         </div>

         {/* Call to Actions */}
         <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12 mb-4 relative z-10">
            <a 
              href={team.deployment_url || '#'} 
              target={team.deployment_url ? "_blank" : undefined}
              rel="noreferrer"
              className={cn(
                "p-8 rounded-[1.5rem] border flex flex-col items-center justify-center gap-5 transition-all duration-300", 
                team.deployment_url 
                  ? "bg-cyan-950/30 border-cyan-500/30 hover:bg-cyan-900/50 hover:border-cyan-400/60 hover:shadow-[0_0_40px_rgba(6,182,212,0.15)] text-cyan-300 hover:text-cyan-100 hover:-translate-y-1" 
                  : "bg-slate-900/20 border-white/5 text-slate-600 cursor-not-allowed"
              )}
            >
               <div className={cn("p-4 rounded-full transition-colors", team.deployment_url ? "bg-cyan-500/20" : "bg-white/5")}>
                 <Play className={cn("w-10 h-10 transition-transform", team.deployment_url && "text-cyan-400 hover:scale-110")} />
               </div>
               <div className="text-center">
                 <span className="text-2xl font-bold block mb-1">{team.deployment_url ? "Launch Live App" : "No Deployment"}</span>
                 <span className="text-sm opacity-70 font-medium">{team.deployment_url ? "Review the final submission" : "Pending deployment link"}</span>
               </div>
            </a>

            <a 
              href={team.repo_url} 
              target="_blank"
              rel="noreferrer"
              className="p-8 rounded-[1.5rem] bg-slate-900/40 border border-white/10 hover:bg-slate-800/80 hover:border-white/20 text-slate-300 hover:text-white transition-all duration-300 flex flex-col items-center justify-center gap-5 hover:-translate-y-1 hover:shadow-2xl"
            >
               <div className="p-4 rounded-full bg-white/5 transition-colors group-hover:bg-white/10">
                 <Github className="w-10 h-10 transition-transform hover:scale-110" />
               </div>
               <div className="text-center">
                 <span className="text-2xl font-bold block mb-1">Source Repository</span>
                 <span className="text-sm opacity-70 font-medium">Review the raw codebase</span>
               </div>
            </a>
         </div>

         {/* Arrow Navigation Desktop */}
         <div className="hidden md:block">
           <Button 
             onClick={prev} disabled={currentIndex === 0} 
             variant="outline" 
             className="absolute top-1/2 -translate-y-1/2 -left-6 w-14 h-14 rounded-full p-0 bg-slate-900 border-white/10 shadow-2xl hover:bg-slate-800 hover:border-white/20 hover:scale-110 text-white disabled:opacity-0 disabled:scale-100 transition-all z-20"
           >
             <ChevronLeft className="w-6 h-6"/>
           </Button>
           <Button 
             onClick={next} disabled={currentIndex === teams.length - 1} 
             variant="outline" 
             className="absolute top-1/2 -translate-y-1/2 -right-6 w-14 h-14 rounded-full p-0 bg-slate-900 border-white/10 shadow-2xl hover:bg-slate-800 hover:border-white/20 hover:scale-110 text-white disabled:opacity-0 disabled:scale-100 transition-all z-20"
           >
             <ChevronRight className="w-6 h-6"/>
           </Button>
         </div>
      </div>
      
      {/* Mobile Action Nav */}
      <div className="mt-8 flex justify-center gap-4 relative z-10 md:hidden">
         <Button onClick={prev} disabled={currentIndex === 0} variant="outline" className="border-white/10 bg-slate-900 text-white py-6 px-6 rounded-xl w-32 shadow-xl"><ChevronLeft className="w-5 h-5 mr-1"/> Prev</Button>
         <Button onClick={next} disabled={currentIndex === teams.length - 1} className="bg-cyan-600 hover:bg-cyan-500 text-white py-6 px-6 rounded-xl font-bold w-32 shadow-xl hover:shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all">Next <ChevronRight className="w-5 h-5 ml-1"/></Button>
      </div>
    </div>
  );
}

function StatCard({ title, value, loading, icon: Icon, glowColor, iconColor, ringClass }: any) {
  return (
    <div className="group relative overflow-hidden rounded-2xl bg-slate-900/40 border border-white/5 p-6 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:border-white/10">
      <div 
        className="absolute -inset-px opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl ease-out"
        style={{ background: `radial-gradient(circle at 50% 100%, ${glowColor}, transparent 70%)` }}
      />
      <div className="relative z-10 flex justify-between items-start">
        <div className="space-y-3">
          <p className="text-sm font-medium text-slate-400 tracking-wide">{title}</p>
          {loading ? (
             <div className="h-9 w-16 bg-slate-800 rounded-md animate-pulse" />
          ) : (
            <p className="text-4xl font-extrabold text-white tracking-tight drop-shadow-sm">{value}</p>
          )}
        </div>
        <div className={cn("p-3 rounded-xl bg-slate-950/50 border border-white/5 shadow-inner transition-all duration-300", ringClass)}>
          {loading ? (
            <div className="w-6 h-6 bg-slate-800 rounded-md animate-pulse" />
          ) : (
             <Icon className={cn("w-6 h-6 transition-transform duration-300 group-hover:scale-110", iconColor)} />
          )}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: Team['status'] }) {
  switch (status) {
    case 'active':
      return <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_10px_rgba(52,211,153,0.1)] hover:bg-emerald-500/20 transition-all">Active</Badge>;
    case 'warning':
      return <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/30 shadow-[0_0_15px_rgba(251,191,36,0.3)] hover:bg-amber-500/20 animate-pulse transition-all">Warning</Badge>;
    case 'inactive':
      return <Badge className="bg-red-500/10 text-red-400 border-red-500/20 shadow-[0_0_10px_rgba(248,113,113,0.1)] hover:bg-red-500/20 transition-all">Inactive</Badge>;
    case 'disqualified':
      return <Badge className="bg-rose-950 border-rose-900/50 text-rose-500 transition-all">Disqualified</Badge>;
  }
}

function SortableHeader({ 
  label, field, currentSort, sortOrder, onClick, className 
}: { 
  label: string, field: SortField, currentSort: SortField, sortOrder: SortOrder, onClick: (f: SortField) => void, className?: string 
}) {
  const isActive = currentSort === field;
  return (
    <th 
      className={cn("px-6 py-5 font-semibold cursor-pointer select-none group hover:bg-white/5 transition-colors", className)}
      onClick={() => onClick(field)}
    >
      <div className={cn("flex items-center gap-1.5", className?.includes("text-center") && "justify-center")}>
        <span className={cn("transition-colors", isActive ? "text-cyan-400" : "text-slate-400 group-hover:text-slate-200")}>{label}</span>
        <ArrowUpDown className={cn(
          "w-3.5 h-3.5 transition-all duration-300", 
          isActive ? "text-cyan-400 opacity-100" : "text-slate-600 opacity-0 group-hover:opacity-100 -translate-y-1 group-hover:translate-y-0"
        )} />
      </div>
    </th>
  );
}
