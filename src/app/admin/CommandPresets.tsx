"use client";

import { Zap, Play, Coffee, Flame, Gavel, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useState } from "react";

interface CommandPresetsProps {
  onRefresh: () => Promise<void>;
}

export function CommandPresets({ onRefresh }: CommandPresetsProps) {
  const [activePreset, setActivePreset] = useState<string | null>(null);

  const handleApplyPreset = async (name: string, payload: any) => {
    setActivePreset(name);
    const toastId = toast.loading(`Executing Mission Script: ${name.toUpperCase()}...`);
    
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to execute preset");
      
      toast.success(`Mission Script ${name} Successful!`, { id: toastId });
      await onRefresh();
    } catch (error) {
      toast.error(`Critical Error executing ${name}`, { id: toastId });
    } finally {
      setActivePreset(null);
    }
  };

  const presets = [
    {
      name: "Kickoff",
      icon: Play,
      color: "hover:bg-cyan-500/20 hover:text-cyan-400 hover:border-cyan-500/50",
      description: "24h Timer + Unlock All",
      payload: {
        timer_status: "running",
        timer_duration_hours: 24,
        timer_start_time: new Date().toISOString(),
        timer_accumulated_ms: 0,
        submissions_locked: false,
        registration_locked: true,
        global_announcement: "🚀 THE HACKATHON HAS BEGUN! Start your engines!"
      }
    },
    {
      name: "Lunch Break",
      icon: Coffee,
      color: "hover:bg-amber-500/20 hover:text-amber-400 hover:border-amber-500/50",
      description: "Lock Subs + Keep Timer",
      payload: {
        submissions_locked: true,
        global_announcement: "🍱 LUNCH IS SERVED! Submissions are locked. The 24h clock continues in the background."
      }
    },
    {
      name: "Resume Hack",
      icon: Zap,
      color: "hover:bg-emerald-500/20 hover:text-emerald-400 hover:border-emerald-500/50",
      description: "Unlock Subs + Keep Timer",
      payload: {
        submissions_locked: false,
        global_announcement: "💻 LUNCH OVER! Submissions UNLOCKED. Keep building!"
      }
    },
    {
      name: "Final Hour",
      icon: Flame,
      color: "hover:bg-rose-500/20 hover:text-rose-400 hover:border-rose-500/50",
      description: "1h Remaining + Alert",
      payload: {
        timer_status: "running",
        timer_duration_hours: 1,
        timer_start_time: new Date().toISOString(),
        timer_accumulated_ms: 0,
        global_announcement: "⚠️ FINAL 60 MINUTES! Commits after this hour will NOT be counted."
      }
    },
    {
      name: "Judging",
      icon: Gavel,
      color: "hover:bg-emerald-500/20 hover:text-emerald-400 hover:border-emerald-500/50",
      description: "Lock All + Unset Timer",
      payload: {
        timer_status: "unset",
        submissions_locked: true,
        registration_locked: true,
        global_announcement: "🏁 HACKING ENDED! Judging in progress. Please head to your demo stations."
      }
    }
  ];

  return (
    <div className="rounded-2xl bg-slate-900/40 border border-white/5 backdrop-blur-md p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <Zap className="w-4 h-4 text-cyan-400" /> Mission Scripts
        </h2>
        <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Automation Presets</span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {presets.map((p) => (
          <button
            key={p.name}
            onClick={() => handleApplyPreset(p.name, p.payload)}
            disabled={activePreset !== null}
            className={`flex flex-col items-start gap-2 p-3 rounded-xl border border-white/5 bg-slate-950/40 text-left transition-all group ${p.color}`}
          >
            <div className="flex items-center justify-between w-full">
              <p.icon className="w-5 h-5 transition-transform group-hover:scale-110" />
              {activePreset === p.name && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            </div>
            <div>
              <span className="text-xs font-bold leading-none block">{p.name}</span>
              <span className="text-[10px] text-slate-500 group-hover:text-current transition-colors block mt-1 line-clamp-1">{p.description}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
