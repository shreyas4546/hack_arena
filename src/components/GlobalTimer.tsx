"use client";

import { useEffect, useState } from "react";
import { Clock, Timer } from "lucide-react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type TimerState = {
  status: "running" | "paused" | "stopped";
  startTime: Date;
  accumulatedMs: number;
  durationHours: number;
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
          setTimerState({
            status: settings.timer_status || "stopped",
            startTime: settings.timer_start_time ? new Date(settings.timer_start_time) : new Date(),
            accumulatedMs: Number(settings.timer_accumulated_ms) || 0,
            durationHours: Number(settings.timer_duration_hours) || 24,
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

  // Don't show in admin routes as admin has their own large panel
  if (pathname?.startsWith("/admin")) return null;
  if (!timerState || timerState.status === "stopped") return null;

  const totalMs = timerState.durationHours * 60 * 60 * 1000;
  const remainingMs = Math.max(0, totalMs - elapsedMs);

  const hours = Math.floor(remainingMs / (1000 * 60 * 60));
  const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((remainingMs % (1000 * 60)) / 1000);

  const isLowTime = remainingMs < 60 * 60 * 1000; // less than 1 hour

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-4 duration-500 pointer-events-none">
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
  );
}
