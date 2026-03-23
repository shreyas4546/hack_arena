"use client";

import { useEffect, useState, useMemo } from "react";
import { Timer, Crown, Zap, Activity, ShieldAlert, MonitorPlay, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow, differenceInMinutes } from "date-fns";

type Team = {
  id: string;
  team_name: string;
  status: "active" | "warning" | "inactive" | "disqualified";
  score: number;
  last_push: string;
  strike_count: number;
};

// Uses the same TimerState type as GlobalTimer
export default function LiveProjectorPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [now, setNow] = useState<Date>(new Date());
  
  // Timer sync
  const [timerState, setTimerState] = useState<any>(null);
  const [elapsedMs, setElapsedMs] = useState(0);

  // Poll data
  useEffect(() => {
    async function fetchData() {
      try {
        const [teamsRes, settingsRes] = await Promise.all([
          fetch("/api/teams"),
          fetch("/api/settings")
        ]);
        
        if (teamsRes.ok) setTeams(await teamsRes.json());
        if (settingsRes.ok) {
          const settings = await settingsRes.json();
          setTimerState({
            status: settings.timer_status || "stopped",
            startTime: settings.timer_start_time ? new Date(settings.timer_start_time) : new Date(),
            accumulatedMs: Number(settings.timer_accumulated_ms) || 0,
            durationHours: Number(settings.timer_duration_hours) || 24,
          });
        }
      } catch (err) {
        console.error("Failed to fetch live data");
      }
    }
    fetchData();
    const interval = setInterval(fetchData, 15000); // 15s refresh for live display
    return () => clearInterval(interval);
  }, []);

  // Tick clock
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Calculate elapsed
  useEffect(() => {
    if (!timerState) return;
    if (timerState.status === "running") {
      setElapsedMs(Math.max(0, timerState.accumulatedMs + (now.getTime() - timerState.startTime.getTime())));
    } else {
      setElapsedMs(timerState.accumulatedMs);
    }
  }, [now, timerState]);

  const topTeams = useMemo(() => {
    return [...teams].filter(t => t.status !== "disqualified").sort((a, b) => b.score - a.score).slice(0, 5);
  }, [teams]);

  const recentActivity = useMemo(() => {
    return [...teams]
      .filter(t => t.status !== "disqualified")
      .sort((a, b) => new Date(b.last_push).getTime() - new Date(a.last_push).getTime())
      .slice(0, 10);
  }, [teams]);

  const activeCount = teams.filter(t => t.status === "active").length;

  if (!timerState) {
    return <main className="min-h-screen bg-slate-950 flex items-center justify-center"><div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div></main>;
  }

  const totalMs = timerState.durationHours * 60 * 60 * 1000;
  const remainingMs = Math.max(0, totalMs - elapsedMs);

  const hours = Math.floor(remainingMs / (1000 * 60 * 60));
  const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((remainingMs % (1000 * 60)) / 1000);
  
  const isLowTime = remainingMs < 60 * 60 * 1000; // Final hour

  return (
    <main className="min-h-screen bg-[#020617] text-white flex flex-col overflow-hidden selection:bg-cyan-500/30">
      {/* Deep Space Background */}
      <div className="fixed inset-0 z-0 pointer-events-none bg-[radial-gradient(circle_at_50%_50%,rgba(6,182,212,0.1),transparent_70%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808010_1px,transparent_1px),linear-gradient(to_bottom,#80808010_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_70%,transparent_100%)] opacity-20 pointer-events-none" />

      {/* HEADER */}
      <header className="relative z-10 p-6 flex justify-between items-center border-b border-white/5 bg-slate-950/50 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <MonitorPlay className="w-8 h-8 text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]" />
          <h1 className="text-3xl font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">HackArena Live</h1>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
             <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)] animate-pulse" />
             <span className="font-bold text-slate-300 uppercase tracking-widest text-sm">{activeCount} Teams Active</span>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT GRID */}
      <div className="flex-1 relative z-10 p-8 grid grid-cols-12 gap-8 h-full">
        
        {/* LEFT COLUMN: Huge Timer & Leaderboard */}
        <div className="col-span-8 flex flex-col gap-8 h-full">
          
          {/* MASSIVE TIMER */}
          <div className={cn(
            "flex-1 rounded-3xl border border-white/5 bg-slate-900/40 backdrop-blur-md shadow-2xl flex flex-col items-center justify-center p-12 transition-all duration-1000",
            isLowTime ? "bg-rose-950/20 border-rose-500/20" : ""
          )}>
            <div className="text-center space-y-4">
              <span className="text-sm md:text-xl font-bold uppercase tracking-[0.2em] text-cyan-400">
                {timerState.status === 'paused' ? 'Hackathon Paused' : 'Official Time Remaining'}
              </span>
              <div className={cn(
                "text-8xl md:text-[140px] font-black font-mono leading-none tracking-tighter drop-shadow-2xl",
                isLowTime ? "text-rose-400 animate-pulse drop-shadow-[0_0_40px_rgba(244,63,94,0.4)]" : "text-white"
              )}>
                {hours.toString().padStart(2, '0')}:
                {minutes.toString().padStart(2, '0')}:
                {seconds.toString().padStart(2, '0')}
              </div>
            </div>
          </div>

          {/* TOP 5 LEADERBOARD */}
          <div className="rounded-3xl border border-white/5 bg-slate-900/40 backdrop-blur-md p-8 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold flex items-center gap-3"><Crown className="w-6 h-6 text-amber-400" /> Top Performer Leaderboard</h2>
              <span className="text-sm font-medium text-slate-500 uppercase tracking-widest">Live Engine Score</span>
            </div>
            
            <div className="grid grid-cols-5 gap-4">
              {topTeams.map((team, idx) => (
                <div key={team.id} className={cn(
                  "p-4 rounded-2xl flex flex-col items-center justify-center text-center gap-2 border",
                  idx === 0 ? "bg-amber-500/10 border-amber-500/30 scale-105 transform transition-transform" : "bg-slate-800/50 border-white/5",
                  idx === 1 ? "bg-slate-300/10 border-slate-300/30" : "",
                  idx === 2 ? "bg-orange-700/10 border-orange-700/30" : ""
                )}>
                  <span className="text-4xl font-black opacity-20 absolute -top-2 right-2">#{idx + 1}</span>
                  <Activity className={cn("w-8 h-8", idx === 0 ? "text-amber-400" : idx === 1 ? "text-slate-300" : idx === 2 ? "text-orange-400" : "text-cyan-500")} />
                  <h3 className="font-bold text-lg truncate w-full px-2" title={team.team_name}>{team.team_name}</h3>
                  <div className="px-3 py-1 rounded-full bg-slate-950/50 text-sm font-black tracking-widest">{team.score || 0} PTS</div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Activity Ticker */}
        <div className="col-span-4 rounded-3xl border border-white/5 bg-slate-900/40 backdrop-blur-md p-8 shadow-2xl flex flex-col overflow-hidden">
          <div className="flex items-center gap-3 mb-8">
            <Zap className="w-6 h-6 text-emerald-400" />
            <h2 className="text-2xl font-bold">Live Commit Ticker</h2>
          </div>
          
          <div className="flex-1 overflow-hidden relative">
            {/* Gradient mask for smooth scroll fading */}
            <div className="absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-[#0f172a] to-transparent z-10" />
            <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-[#0f172a] to-transparent z-10" />
            
            <div className="space-y-4 animate-in fade-in duration-1000 flex flex-col">
              {recentActivity.map((team, idx) => {
                const diffMins = differenceInMinutes(now, new Date(team.last_push));
                const isJustNow = diffMins < 5;

                return (
                  <div key={team.id} className={cn(
                    "p-4 rounded-xl border flex items-start gap-4 transition-all",
                    isJustNow 
                      ? "bg-emerald-500/10 border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.1)] slide-in-from-left-4 animate-in" 
                      : "bg-slate-950/50 border-white/5 opacity-80"
                  )}>
                    <div className={cn("w-2 h-2 rounded-full mt-2 shrink-0", isJustNow ? "bg-emerald-400 animate-ping" : "bg-cyan-500")} />
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-1">
                        <h4 className="font-bold text-white text-lg">{team.team_name}</h4>
                        <span className="text-xs font-bold text-slate-500">{formatDistanceToNow(new Date(team.last_push))} ago</span>
                      </div>
                      <p className="text-sm text-slate-400">
                        {isJustNow ? "🔥 Heavy coding detected" : "System logged recent code push"}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

      </div>
    </main>
  );
}
