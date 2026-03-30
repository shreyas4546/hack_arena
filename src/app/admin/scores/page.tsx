"use client";

import { useEffect, useState, useMemo } from "react";
import { Trophy, ArrowLeft, Loader2, Save, Activity, ShieldAlert, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { differenceInMinutes, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

type Team = {
  id: string;
  team_name: string;
  status: "active" | "warning" | "inactive" | "disqualified";
  score: number;
  strike_count: number;
  judge_score: number | null;
  last_push: string;
  deployment_url: string | null;
  deployment_status: "live" | "slow" | "down" | "pending";
};

export default function AdminJudgingMatrix() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  
  // Local state for edits before saving
  const [localScores, setLocalScores] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    try {
      const res = await fetch("/api/teams");
      if (res.ok) {
        const data = await res.json();
        // Sort active/top teams first
        const sorted = data.sort((a: Team, b: Team) => {
           if (a.status === "disqualified" && b.status !== "disqualified") return 1;
           if (b.status === "disqualified" && a.status !== "disqualified") return -1;
           return b.score - a.score;
        });
        setTeams(sorted);
        
        // Initialize local edit state
        const initialLocals: Record<string, string> = {};
        sorted.forEach((t: Team) => { 
           initialLocals[t.id] = t.judge_score !== null ? t.judge_score.toString() : ""; 
        });
        setLocalScores(initialLocals);
      }
    } catch (e) {
      toast.error("Failed to load teams for judging");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveScore = async (teamId: string) => {
    const rawVal = localScores[teamId];
    const scoreNum = Number(rawVal);
    
    if (rawVal !== "" && (isNaN(scoreNum) || scoreNum < 0 || scoreNum > 10)) {
      toast.error("Score must be between 0 and 10");
      return;
    }

    setSavingId(teamId);
    const toastId = toast.loading("Saving score...");

    try {
      const res = await fetch("/api/teams/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ team_id: teamId, judge_score: rawVal === "" ? 0 : scoreNum }),
      });

      if (!res.ok) {
        throw new Error("Failed to save score");
      }

      toast.success("Score updated successfully", { id: toastId });
      
      // Update local canonical state so the "Save" button hides
      setTeams(prev => prev.map(t => t.id === teamId ? { ...t, judge_score: rawVal === "" ? 0 : scoreNum } : t));
    } catch (e) {
      toast.error("Error saving score", { id: toastId });
    } finally {
      setSavingId(null);
    }
  };


  return (
    <main className="min-h-screen bg-[#020617] text-white p-6 md:p-12 selection:bg-rose-500/30">
      <div className="max-w-7xl mx-auto space-y-8">
        
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <Link href="/admin" className="inline-flex items-center text-sm font-medium text-slate-400 hover:text-white transition-colors mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
            </Link>
            <h1 className="text-3xl font-black text-rose-400 flex items-center gap-3">
              <Trophy className="w-8 h-8" /> Final Judging Matrix
            </h1>
            <p className="text-slate-400 mt-2 max-w-2xl">
              Privately evaluate and assign final points (0-10) to participants. The matrix shows objective, automated engine metrics to assist your manual judging decisions.
            </p>
          </div>
        </header>

        {loading ? (
          <div className="flex items-center justify-center p-20">
            <Loader2 className="w-8 h-8 text-rose-500 animate-spin" />
          </div>
        ) : (
          <div className="bg-slate-900/40 rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs uppercase bg-slate-900/80 text-slate-400 border-b border-white/10">
                  <tr>
                    <th className="px-6 py-4 font-bold tracking-widest text-slate-300">Team Name</th>
                    <th className="px-6 py-4 font-bold tracking-widest text-slate-300">Engine Stats</th>
                    <th className="px-6 py-4 font-bold tracking-widest text-slate-300">Live Health</th>
                    <th className="px-6 py-4 font-bold tracking-widest text-rose-400 text-right">Final Judge Score (0-10)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {teams.map((team) => {
                    const isEdited = localScores[team.id] !== (team.judge_score !== null ? team.judge_score.toString() : "");

                    return (
                      <tr key={team.id} className={cn("hover:bg-white/[0.04] transition-colors even:bg-white/[0.015]", team.status === "disqualified" && "opacity-50 grayscale")}>
                        {/* Team Name */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={cn("w-2 h-2 rounded-full shadow-lg", 
                               team.status === 'active' ? 'bg-emerald-400' : 
                               team.status === 'warning' ? 'bg-amber-400' : 
                               'bg-rose-500'
                            )} />
                            <div>
                               <h3 className="font-bold text-lg">{team.team_name}</h3>
                               <p className="text-xs text-slate-500 uppercase tracking-wider">{team.status}</p>
                            </div>
                          </div>
                        </td>

                        {/* Engine Stats */}
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-2 text-slate-300">
                               <Activity className="w-4 h-4 text-cyan-400" />
                               <span>Raw Pts: <strong className="text-white">{team.score}</strong></span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-400 text-xs">
                               <ShieldAlert className="w-3.5 h-3.5" />
                               <span>{team.strike_count} Strikes</span>
                            </div>
                          </div>
                        </td>

                        {/* Live Health */}
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            <span className="text-slate-300">
                               Last push: <strong className="text-white">{team.last_push ? formatDistanceToNow(new Date(team.last_push)) + " ago" : "N/A"}</strong>
                            </span>
                            <span className="text-xs text-slate-500 flex items-center gap-1">
                               Deploy: <span className={team.deployment_status === 'live' ? "text-emerald-400" : "text-amber-400"}>{team.deployment_status}</span>
                            </span>
                          </div>
                        </td>

                        {/* Judging Action */}
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-3">
                            <div className="relative">
                               <Input
                                 type="text"
                                 value={localScores[team.id]}
                                 onChange={(e) => setLocalScores({ ...localScores, [team.id]: e.target.value })}
                                 placeholder="0.0"
                                 className={cn(
                                    "w-20 text-right text-lg font-black bg-slate-950 border-white/10 focus:border-rose-500 focus:ring-rose-500/20",
                                    isEdited ? "border-amber-500/50 text-amber-300 bg-amber-950/20" : "text-rose-100"
                                 )}
                               />
                               <span className="absolute right-3 -top-5 text-[10px] text-slate-500 font-bold tracking-widest">/ 10</span>
                            </div>
                            
                            {isEdited && (
                              <Button 
                                size="sm" 
                                onClick={() => handleSaveScore(team.id)}
                                disabled={savingId === team.id}
                                className="bg-rose-600 hover:bg-rose-500 text-white animate-in zoom-in h-10 w-10 p-0 rounded-lg shadow-[0_0_15px_rgba(225,29,72,0.4)]"
                              >
                                {savingId === team.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                              </Button>
                            )}
                            {!isEdited && localScores[team.id] !== "" && (
                               <div className="h-10 w-10 flex items-center justify-center">
                                  <CheckCircle2 className="w-5 h-5 text-emerald-500/50" />
                               </div>
                            )}
                          </div>
                        </td>

                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {teams.length === 0 && !loading && (
              <div className="p-12 text-center text-slate-500 font-medium">
                No teams registered yet.
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
