"use client";

import { Gavel, ShieldAlert, Plus, Minus, Save, Loader2, ExternalLink, Activity, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Tooltip } from "./Tooltip";

interface Team {
  id: string;
  team_name: string;
  status: string;
  score: number;
  strike_count: number;
  judge_score: number | null;
  deployment_url: string | null;
  deployment_status: string;
}

interface QuickScoringHUDProps {
  teams: Team[];
  onRefresh: () => Promise<void>;
}

export function QuickScoringHUD({ teams: initialTeams, onRefresh }: QuickScoringHUDProps) {
  const [localScores, setLocalScores] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [bulkSaving, setBulkSaving] = useState(false);

  useEffect(() => {
    const scores: Record<string, string> = {};
    initialTeams.forEach(t => {
      scores[t.id] = t.judge_score !== null ? t.judge_score.toString() : "";
    });
    setLocalScores(scores);
  }, [initialTeams]);

  const handleStrike = async (teamId: string, action: "add" | "remove") => {
    const toastId = toast.loading(`${action === 'add' ? 'Applying' : 'Removing'} strike...`);
    try {
      const res = await fetch("/api/teams/strike", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ team_id: teamId, action }),
      });
      if (!res.ok) throw new Error("Failed to update strikes");
      toast.success("Strike count updated", { id: toastId });
      await onRefresh();
    } catch (error) {
      toast.error("Error updating strikes", { id: toastId });
    }
  };

  const handleSaveScore = async (teamId: string) => {
    const val = localScores[teamId];
    if (val !== "" && (isNaN(Number(val)) || Number(val) < 0 || Number(val) > 10)) {
      toast.error("Invalid score (0-10)");
      return;
    }
    setSavingId(teamId);
    try {
      const res = await fetch("/api/teams/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ team_id: teamId, judge_score: val === "" ? 0 : Number(val) }),
      });
      if (!res.ok) throw new Error();
      toast.success("Score saved");
      await onRefresh();
    } catch {
      toast.error("Save failed");
    } finally {
      setSavingId(null);
    }
  };

  const handleSaveAll = async () => {
    const updates = Object.entries(localScores)
      .filter(([id, val]) => {
        const team = initialTeams.find(t => t.id === id);
        return team && val !== (team.judge_score?.toString() || "");
      })
      .map(([id, val]) => ({ team_id: id, judge_score: val === "" ? 0 : Number(val) }));

    if (updates.length === 0) {
      toast.info("No changes to save");
      return;
    }

    setBulkSaving(true);
    const toastId = toast.loading(`Saving ${updates.length} scores...`);
    try {
      const res = await fetch("/api/teams/bulk-score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      });
      if (!res.ok) throw new Error();
      toast.success("All scores synced!", { id: toastId });
      await onRefresh();
    } catch {
      toast.error("Bulk save failed", { id: toastId });
    } finally {
      setBulkSaving(false);
    }
  };

  const hasChanges = Object.entries(localScores).some(([id, val]) => {
    const team = initialTeams.find(t => t.id === id);
    return team && val !== (team.judge_score?.toString() || "");
  });

  return (
    <div className="rounded-2xl bg-slate-900/40 border border-white/5 backdrop-blur-md flex flex-col h-full">
      <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Gavel className="w-4 h-4 text-emerald-400" />
          <h2 className="text-sm font-bold text-white tracking-tight">Tactical Scoring Monitor</h2>
        </div>
        <div className="flex items-center gap-3">
          {hasChanges && (
            <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleSaveAll} 
                disabled={bulkSaving}
                className="h-8 text-[10px] font-bold uppercase tracking-widest text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 border border-emerald-500/20"
            >
                {bulkSaving ? <Loader2 className="w-3 h-3 animate-spin mr-1.5" /> : <Save className="w-3 h-3 mr-1.5" />}
                Sync All Changes
            </Button>
          )}
          <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px] py-0.5 px-2 uppercase font-black">Live Judging</Badge>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto custom-scrollbar">
        <table className="w-full text-[11px] text-left border-collapse">
          <thead className="bg-slate-950/20 text-slate-500 uppercase tracking-widest font-bold border-b border-white/5">
            <tr>
              <th className="px-5 py-3 font-bold">Team Profile</th>
              <th className="px-4 py-3 text-center">
                <Tooltip content="Disciplinary strikes penalize the automated behavior score.">
                  <span className="cursor-help">Strikes</span>
                </Tooltip>
              </th>
              <th className="px-4 py-3 text-center">
                <Tooltip content="Deployment stability monitor (Live/Down/Pending).">
                  <span className="cursor-help">Health</span>
                </Tooltip>
              </th>
              <th className="px-5 py-3 text-right">Judge Score (0-10)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.03]">
            {initialTeams.map((team) => (
              <tr key={team.id} className="group hover:bg-white/[0.01] transition-colors">
                <td className="px-5 py-2.5">
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-200 group-hover:text-white transition-colors truncate max-w-[150px]">{team.team_name}</span>
                    <span className="text-[10px] text-slate-500 flex items-center gap-1.5 mt-0.5 capitalize">
                        <Activity className="w-2.5 h-2.5" /> {team.status}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-2.5 text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <button onClick={() => handleStrike(team.id, 'remove')} className="p-1 rounded-md hover:bg-white/5 text-slate-500 hover:text-white transition-all"><Minus className="w-3 h-3" /></button>
                    <span className={cn("inline-flex items-center justify-center min-w-[20px] font-black text-xs", team.strike_count > 0 ? "text-rose-500" : "text-slate-600")}>{team.strike_count}</span>
                    <button onClick={() => handleStrike(team.id, 'add')} className="p-1 rounded-md hover:bg-white/5 text-slate-500 hover:text-white transition-all"><Plus className="w-3 h-3" /></button>
                  </div>
                </td>
                <td className="px-4 py-2.5 text-center">
                  <div className="flex justify-center">
                    <Tooltip content={`Status: ${team.deployment_status}`}>
                      <div className={cn(
                        "w-2 h-2 rounded-full cursor-help",
                        team.deployment_status === 'live' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 
                        team.deployment_status === 'down' ? 'bg-rose-500 animate-pulse' : 'bg-amber-500'
                      )} />
                    </Tooltip>
                  </div>
                </td>
                <td className="px-5 py-2.5 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Input 
                      value={localScores[team.id] || ""}
                      onChange={(e) => setLocalScores({ ...localScores, [team.id]: e.target.value })}
                      className={cn(
                        "h-7 w-14 text-right text-xs font-bold leading-none bg-slate-950/50 border-white/10",
                        localScores[team.id] !== (team.judge_score?.toString() || "") ? "border-amber-500/40 text-amber-200" : "text-slate-300"
                      )}
                      placeholder="0.0"
                    />
                    {savingId === team.id ? (
                        <Loader2 className="w-3 h-3 animate-spin text-emerald-400" />
                    ) : (
                        localScores[team.id] !== (team.judge_score?.toString() || "") && (
                            <button onClick={() => handleSaveScore(team.id)} className="text-emerald-400 hover:text-emerald-300 transition-colors p-1"><Save className="w-3.5 h-3.5" /></button>
                        )
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-5 py-3 border-t border-white/5 bg-slate-950/20 rounded-b-2xl">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-[10px] text-slate-500 font-medium italic">
            <Activity className="w-3 h-3 text-cyan-500/50" />
            <span>Hybrid Algorithm: (Behavior 40%) + (Judge 60%)</span>
          </div>
          <div className="flex items-center gap-3">
            <Tooltip content="40% calculated from activity, uptime, and strikes.">
              <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-tighter font-bold text-slate-600 cursor-help hover:text-cyan-400 transition-colors">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" /> Behavior
              </div>
            </Tooltip>
            <Tooltip content="60% assigned by human judges via this monitor.">
              <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-tighter font-bold text-slate-600 cursor-help hover:text-emerald-400 transition-colors">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Judge
              </div>
            </Tooltip>
          </div>
        </div>
      </div>
    </div>
  );
}
