"use client";

import { useEffect, useState } from "react";
import { Clock, Timer } from "lucide-react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type TimerState = {
  status: "running" | "paused" | "stopped" | "unset";
  startTime: Date;
  accumulatedMs: number;
  durationHours: number;
  announcement: string | null;
};

export default function GlobalTimer() {
  const pathname = usePathname();
  const [timerState, setTimerState] = useState<TimerState | null>(null);
  const [now, setNow] = useState<Date | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);

  // Poll settings
  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch("/api/settings");
          if (res.ok) {
            const settings = await res.json();
            console.log("GlobalTimer refreshed announcement:", settings.global_announcement);
            setTimerState({
            status: settings.timer_status || "unset",
            startTime: settings.timer_start_time ? new Date(settings.timer_start_time) : new Date(),
            accumulatedMs: Number(settings.timer_accumulated_ms) || 0,
            durationHours: Number(settings.timer_duration_hours) || 24,
            announcement: settings.global_announcement || null,
          });
        }
      } catch (e) {
        console.error("Failed to fetch timer settings");
      }
    }
    
    fetchSettings();
    const poll = setInterval(fetchSettings, 30000); // sync every 30s
    return () => clearInterval(poll);
  }, []);

  // Tick clock
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Calculate elapsed
  useEffect(() => {
    if (!now || !timerState) return;
    if (timerState.status === "running") {
      setElapsedMs(Math.max(0, timerState.accumulatedMs + (now.getTime() - timerState.startTime.getTime())));
    } else {
      setElapsedMs(timerState.accumulatedMs);
    }
  }, [now, timerState]);

  // Don't show the floating timer in admin routes as admin has their own large panel, 
  // but we might still want to show the announcement ticker.
  if (!timerState) return null;

  const isDashboard = pathname === "/admin";
  const isProjector = pathname === "/admin/timer";
  const isAdmin = isDashboard || isProjector;

  const showTicker = !!timerState.announcement && !isDashboard;
  const showFloatingTimer = !isAdmin && timerState.status !== "unset";

  if (isAdmin && !showTicker) return null;
  if (!showTicker && !showFloatingTimer) return null;

  const totalMs = timerState.durationHours * 60 * 60 * 1000;
  const remainingMs = Math.max(0, totalMs - elapsedMs);

  const hours = Math.floor(remainingMs / (1000 * 60 * 60));
  const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((remainingMs % (1000 * 60)) / 1000);

  const isLowTime = remainingMs < 60 * 60 * 1000; // less than 1 hour

  return (
    <>
      <style>{`
        @keyframes marquee { 0% { transform: translateX(100vw); } 100% { transform: translateX(-100%); } }
        .animate-marquee { display: inline-block; animation: marquee 25s linear infinite; }
      `}</style>
      
      {/* 🚨 FULL-WIDTH BOTTOM TICKER 🚨 */}
      {showTicker && (
        <div className="fixed bottom-0 left-0 right-0 z-[100] h-10 bg-rose-600/95 backdrop-blur-md border-t border-rose-400/50 shadow-[0_-10px_40px_rgba(225,29,72,0.4)] flex items-center overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-rose-600 to-transparent z-10 pointer-events-none" />
          
          <div className="animate-marquee whitespace-nowrap text-white font-black text-[13px] uppercase tracking-[0.2em] px-4 py-1 flex items-center">
            <span className="bg-white text-rose-600 px-2 py-0.5 rounded-sm mr-4 tracking-black drop-shadow-md">LIVE ALERT</span> 
            {timerState.announcement}
          </div>

          <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-rose-600 to-transparent z-10 pointer-events-none" />
        </div>
      )}

      {/* ⏱️ FLOATING TOP TIMER ⏱️ */}
      {showFloatingTimer && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-4 duration-500 pointer-events-none flex flex-col items-center gap-2">
        
        <div className={cn(
          "flex items-center gap-3 px-5 py-2.5 rounded-2xl border backdrop-blur-xl shadow-2xl transition-all duration-500",
          isLowTime 
            ? "bg-rose-950/80 border-rose-500/50 shadow-[0_0_30px_rgba(244,63,94,0.3)]" 
            : "bg-slate-900/80 border-cyan-500/30 shadow-[0_0_30px_rgba(6,182,212,0.15)]"
        )}>
        <div className={cn("p-1.5 rounded-full", isLowTime ? "bg-rose-500/20" : "bg-cyan-500/20")}>
          <Timer className={cn("w-4 h-4", isLowTime ? "text-rose-400 animate-pulse" : "text-cyan-400")} />
        </div>
        <div className="flex flex-col items-center">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 leading-none mb-1">
            {timerState.status === "paused" ? "Timer Paused" : "Time Remaining"}
          </span>
          <span className={cn(
            "text-2xl font-black font-mono leading-none tracking-tight",
            isLowTime ? "text-rose-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.5)]" : "text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]"
          )}>
            {hours.toString().padStart(2, '0')}:
            {minutes.toString().padStart(2, '0')}:
            {seconds.toString().padStart(2, '0')}
          </span>
        </div>
      </div>
        </div>
      )}
    </>
  );
}
