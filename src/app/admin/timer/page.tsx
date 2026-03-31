"use client";

import { useEffect, useState } from "react";
import { Timer, Trophy, ShieldAlert, Clock, Coffee } from "lucide-react";
import { cn } from "@/lib/utils";

type TimerState = {
  status: "running" | "paused" | "stopped" | "unset";
  startTime: Date;
  accumulatedMs: number;
  durationHours: number;
  submissionsLocked: boolean;
  globalAnnouncement: string;
};

export default function FullScreenTimer() {
  const [timerState, setTimerState] = useState<TimerState | null>(null);
  const [now, setNow] = useState<Date>(new Date());
  const [elapsedMs, setElapsedMs] = useState(0);

  // Poll settings
  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch("/api/settings");
        if (res.ok) {
          const settings = await res.json();
            setTimerState({
            status: settings.timer_status || "unset",
            startTime: settings.timer_start_time ? new Date(settings.timer_start_time) : new Date(),
            accumulatedMs: Number(settings.timer_accumulated_ms) || 0,
            durationHours: Number(settings.timer_duration_hours) || 24,
            submissionsLocked: settings.submissions_locked || false,
            globalAnnouncement: settings.global_announcement || "",
          });
        }
      } catch (e) {
        console.error("Failed to fetch timer settings");
      }
    }
    
    fetchSettings();
    const poll = setInterval(fetchSettings, 10000); // sync every 10s for projector
    return () => clearInterval(poll);
  }, []);

  // Tick clock
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 100);
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

  if (!timerState) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full border-4 border-cyan-500/20 border-t-cyan-500 animate-spin" />
          <p className="text-cyan-500/50 font-mono tracking-widest uppercase text-sm">Synchronizing Chronos...</p>
        </div>
      </div>
    );
  }

  // Handle Unset / Standby State
  if (timerState.status === "unset") {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center relative overflow-hidden font-sans">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(6,182,212,0.05),transparent_70%)] animate-pulse" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-150 contrast-150 pointer-events-none" />
        
        <div className="relative z-10 flex flex-col items-center gap-12 text-center px-8 animate-in fade-in zoom-in duration-1000">
          <div className="w-32 h-32 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center backdrop-blur-3xl shadow-2xl animate-bounce">
             <Timer className="w-16 h-16 text-cyan-400 opacity-50" />
          </div>
          
          <div className="space-y-4">
            <h1 className="text-6xl md:text-8xl font-black italic tracking-tighter uppercase text-white/90">
              Mission <span className="text-cyan-400">Standby</span>
            </h1>
            <p className="text-xl md:text-2xl text-white/30 uppercase tracking-[1em] font-bold">Waiting for Launch Authority</p>
          </div>

          <div className="flex flex-col items-center gap-2">
            <div className="h-1 w-48 bg-white/5 rounded-full overflow-hidden">
               <div className="h-full w-1/3 bg-cyan-500 animate-[loading_2s_infinite]" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-cyan-500/50">System Secure // Signal Stable</span>
          </div>
        </div>

        <style jsx>{`
          @keyframes loading {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(300%); }
          }
        `}</style>
      </main>
    );
  }

  const totalMs = timerState.durationHours * 60 * 60 * 1000;
  const remainingMs = Math.max(0, totalMs - elapsedMs);

  const hours = Math.floor(remainingMs / (1000 * 60 * 60));
  const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((remainingMs % (1000 * 60)) / 1000);

  const isLowTime = remainingMs < 60 * 60 * 1000 && remainingMs > 0; // less than 1 hour
  const isOver = remainingMs <= 0;
  const isLunchBreak = timerState.submissionsLocked && timerState.globalAnnouncement.toLowerCase().includes("lunch");

  return (
    <main className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center relative overflow-hidden font-sans">
      {/* Dynamic Backgrounds */}
      <div className="fixed inset-0 z-0">
        <div className={cn(
          "absolute inset-0 transition-opacity duration-1000",
          isLunchBreak ? "opacity-20 bg-amber-950/30" : isLowTime ? "opacity-30 bg-rose-950/20" : "opacity-10 bg-cyan-950/10"
        )} />
        <div 
          className="absolute inset-0 animate-pulse transition-colors duration-1000" 
          style={{ backgroundImage: `radial-gradient(circle at 50% 50%, ${isLunchBreak ? 'rgba(245,158,11,0.15)' : isLowTime ? 'rgba(244,63,94,0.1)' : 'rgba(6,182,212,0.1)'}, transparent 70%)` }}
        />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-150 contrast-150 pointer-events-none" />
      </div>

      {/* Decorative Orbs */}
      <div className={cn(
        "absolute top-1/4 -left-20 w-80 h-80 rounded-full blur-[120px] transition-colors duration-1000",
        isLunchBreak ? "bg-amber-500/20" : isLowTime ? "bg-rose-500/10" : "bg-cyan-500/10"
      )} />
      <div className={cn(
        "absolute bottom-1/4 -right-20 w-80 h-80 rounded-full blur-[120px] transition-colors duration-1000",
        isLunchBreak ? "bg-orange-500/20" : isLowTime ? "bg-amber-500/10" : "bg-indigo-500/10"
      )} />

      <div className="relative z-10 w-full max-w-7xl px-8 flex flex-col items-center animate-in fade-in zoom-in duration-1000">
        
        {/* Header Section */}
        <div className="flex flex-col items-center gap-6 mb-10">
          <div className="flex items-center gap-4 px-6 py-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-xl transition-all duration-1000">
            {isLunchBreak ? <Coffee className="w-6 h-6 text-amber-500 animate-pulse" /> : <Trophy className="w-6 h-6 text-amber-400" />}
            <span className="text-xl font-black uppercase tracking-[0.4em] text-white/80">
              {isLunchBreak ? "REFUEL ZONE" : "HackArena Live"}
            </span>
          </div>
          
          <div className={cn(
            "px-8 py-3 rounded-2xl border transition-all duration-500 flex items-center gap-3",
            isLunchBreak 
              ? "bg-amber-500/10 border-amber-500/30 text-amber-500"
              : timerState.status === "running" 
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" 
              : timerState.status === "paused"
                ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                : "bg-rose-500/10 border-rose-500/30 text-rose-400"
          )}>
            <div className={cn("w-3 h-3 rounded-full",
              isLunchBreak ? "animate-bounce bg-amber-500" :
              timerState.status === "running" ? "animate-pulse bg-emerald-500" : 
              timerState.status === "paused" ? "bg-amber-500" : "bg-rose-500"
            )} />
            <span className="text-2xl font-black uppercase tracking-widest">
              {isLunchBreak ? "Submissions Locked" : timerState.status === "running" ? "Event Active" : timerState.status === "paused" ? "Time Paused" : "Event Stopped"}
            </span>
          </div>
        </div>

        {/* The Big Timer */}
        <div className="relative flex flex-col items-center">
          {/* Glowing Shadow */}
          <div className={cn(
            "absolute inset-0 blur-[100px] transition-colors duration-1000 opacity-50",
            isLunchBreak ? "bg-amber-500" : isLowTime ? "bg-rose-500" : "bg-cyan-500"
          )} />
          
          <div className="relative flex flex-col items-center gap-4">
            <div className={cn(
              "text-[min(18vw,280px)] font-[900] font-mono leading-none tracking-tighter tabular-nums drop-shadow-[0_0_40px_rgba(255,255,255,0.2)] transition-colors duration-1000",
              isLunchBreak ? "text-amber-100" : isLowTime ? "text-rose-400" : "text-white"
            )}>
              {hours.toString().padStart(2, '0')}:
              {minutes.toString().padStart(2, '0')}:
              {seconds.toString().padStart(2, '0')}
            </div>
            
            <div className="flex justify-between w-full px-10">
              <span className="text-2xl font-black text-white/30 uppercase tracking-[.5em]">Hours</span>
              <span className="text-2xl font-black text-white/30 uppercase tracking-[.5em]">Minutes</span>
              <span className="text-2xl font-black text-white/30 uppercase tracking-[.5em]">Seconds</span>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full mt-16 max-w-5xl">
          <div className="h-4 w-full bg-white/5 rounded-full border border-white/10 overflow-hidden relative shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)]">
            <div 
              className={cn(
                "h-full transition-all duration-1000 ease-linear shadow-[0_0_20px_rgba(6,182,212,0.5)]",
                isLunchBreak ? "bg-gradient-to-r from-amber-600 to-orange-400 !shadow-[0_0_20px_rgba(245,158,11,0.5)]" : isLowTime ? "bg-gradient-to-r from-rose-600 to-rose-400 !shadow-[0_0_20px_rgba(244,63,94,0.5)]" : "bg-gradient-to-r from-cyan-600 to-blue-400"
              )}
              style={{ width: `${Math.min(100, (elapsedMs / totalMs) * 100)}%` }}
            />
          </div>
          <div className="flex justify-between mt-8 text-white/30 font-mono font-black uppercase tracking-[0.3em] text-[min(1.2vw,14px)]">
            <div className="flex flex-col items-start gap-1">
              <span className="opacity-50 text-[min(1vw,12px)] tracking-normal">Point A</span>
              <span>Event Start</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className={cn("text-white font-black", isLowTime && "text-rose-400 animate-pulse")}>
                {Math.min(100, Math.floor((elapsedMs / totalMs) * 100))}% Complete
              </span>
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.8)]" />
            </div>
            <div className="flex flex-col items-end gap-1 text-right">
              <span className="opacity-50 text-[min(1vw,12px)] tracking-normal">Point B</span>
              <span>Deadline Reached</span>
            </div>
          </div>
        </div>

        {/* Warning Badge */}
        {isLowTime && !isOver && (
          <div className="mt-12 animate-bounce">
            <div className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-rose-500 text-white shadow-[0_0_40px_rgba(244,63,94,0.5)]">
              <ShieldAlert className="w-8 h-8" />
              <span className="text-2xl font-black uppercase tracking-tight">Final Countdown: Less than 1 Hour remaining!</span>
            </div>
          </div>
        )}

        {isOver && (
          <div className="mt-12 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            <div className="flex flex-col items-center gap-4">
              <div className="px-12 py-6 rounded-[2rem] bg-white text-slate-950 shadow-[0_0_80px_rgba(255,255,255,0.6)]">
                <span className="text-5xl font-black uppercase tracking-tight">Time&apos;s Up!</span>
              </div>
              <p className="text-white/40 uppercase tracking-[1em] font-bold text-lg mt-4">Please stop all coding immediately</p>
            </div>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="fixed bottom-4 left-0 right-0 z-20 px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-8 text-white/10 uppercase tracking-[0.2em] font-bold text-[10px] border-t border-white/5 pt-3">
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5" />
            <span>Local: {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}</span>
          </div>
          <span className="hidden sm:inline">Hackathon Mission Control Display v2.1</span>
          <span>&copy; HackArena 2K26</span>
        </div>
      </div>
    </main>
  );
}
