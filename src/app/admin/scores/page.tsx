"use client";

import { useEffect, useState, useMemo } from "react";
import { Trophy, ArrowLeft, Loader2, Save, Activity, ShieldAlert, CheckCircle2, Download } from "lucide-react";
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
      }
    } catch (e) {
      toast.error("Failed to load teams for judging");
    } finally {
      setLoading(false);
    }
  };




  const handleExportCSV = () => {
    if (!teams || teams.length === 0) return;
    
    const headers = ["Team Name", "Status", "Engine Score", "Strikes", "Judge Score", "Last Push", "Deployment"];
    const rows = teams.map(t => [
      `"${t.team_name.replace(/"/g, '""')}"`,
      t.status,
      t.score || 0,
      t.strike_count,
      t.judge_score !== null ? t.judge_score : "",
      `"${t.last_push || ''}"`,
      `"${t.deployment_status || ''}"`
    ]);
    
    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `judging_matrix_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Judging matrix exported to CSV!");
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
              Privately evaluate and assign final points to participants. The matrix shows objective, automated engine metrics.
            </p>
          </div>
          <Button onClick={handleExportCSV} variant="outline" className="bg-slate-900/50 border-white/10 text-slate-300 hover:bg-rose-900/30 hover:text-rose-300 hover:border-rose-500/50 transition-all rounded-xl text-xs h-9 self-start md:self-auto"><Download className="w-3.5 h-3.5 mr-1.5" />Export CSV</Button>
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
                    <th className="px-6 py-4 font-bold tracking-widest text-rose-400 text-right">Final Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {teams.map((team) => (
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

                        {/* Final Exact Score */}
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-3">
                             <div className="w-20 text-right text-lg font-black text-emerald-400 bg-slate-950/50 border border-white/10 rounded-lg p-2 px-3 shadow-[0_0_15px_rgba(52,211,153,0.1)]">
                                {team.score || 0}
                             </div>
                          </div>
                        </td>

                      </tr>
                    ))}
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
