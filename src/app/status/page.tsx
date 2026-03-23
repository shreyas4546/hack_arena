"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Activity, ShieldAlert, ArrowLeft, Loader2, CheckCircle2, AlertTriangle, XCircle, Github, HeartPulse } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

type Team = {
  id: string;
  team_name: string;
  status: "active" | "warning" | "inactive" | "disqualified";
  strike_count: number;
  score: number;
  last_push: string;
  repo_url: string;
  deployment_url: string | null;
  deployment_status: "live" | "slow" | "down" | "pending";
  response_time: number;
};

export default function ParticipantDashboard() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTeams() {
      try {
        const res = await fetch("/api/teams");
        if (res.ok) {
          const data = await res.json();
          // Sort teams alphabetically for easier selection
          setTeams(data.sort((a: Team, b: Team) => a.team_name.localeCompare(b.team_name)));
        }
      } catch (err) {
        console.error("Failed to fetch teams");
      } finally {
        setLoading(false);
      }
    }
    fetchTeams();
  }, []);

  const selectedTeam = teams.find(t => t.id === selectedTeamId);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
      case "warning": return "text-amber-400 bg-amber-500/10 border-amber-500/20";
      case "inactive": return "text-rose-400 bg-rose-500/10 border-rose-500/20";
      case "disqualified": return "text-red-500 bg-red-950/40 border-red-500/30 line-through opacity-70";
      default: return "text-slate-400 bg-slate-800 border-slate-700";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active": return <CheckCircle2 className="w-5 h-5 text-emerald-400" />;
      case "warning": return <AlertTriangle className="w-5 h-5 text-amber-400" />;
      case "inactive": return <XCircle className="w-5 h-5 text-rose-400" />;
      default: return <ShieldAlert className="w-5 h-5 text-slate-400" />;
    }
  };

  return (
    <main className="min-h-screen bg-[#0a0a0a] flex flex-col items-center py-20 px-4 selection:bg-orange-500/30 font-sans relative">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(251,146,60,0.08),transparent_50%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:60px_60px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_60%,transparent_100%)]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-3xl relative z-10 space-y-8"
      >
        <Link href="/" className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-orange-400 transition-colors mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
        </Link>

        <div className="text-center space-y-4">
          <h1 className="text-4xl md:text-6xl font-black tracking-tight bg-gradient-to-b from-white to-orange-200/60 bg-clip-text text-transparent">Participant Dashboard</h1>
          <p className="text-slate-500 max-w-xl mx-auto font-medium">
            Check your team&apos;s real-time status, including last detected commit and deployment health.
          </p>
        </div>

        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 backdrop-blur-xl shadow-2xl space-y-8">
          
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Select Your Team</label>
            {loading ? (
              <div className="h-11 bg-white/[0.03] animate-pulse rounded-md w-full border border-white/[0.06]" />
            ) : (
              <Select onValueChange={setSelectedTeamId} value={selectedTeamId}>
                <SelectTrigger className="w-full h-12 bg-white/[0.03] border-white/[0.08] text-white font-medium focus:ring-orange-500/50">
                  <SelectValue placeholder="Select a registered team..." />
                </SelectTrigger>
                <SelectContent className="bg-[#0a0a0a] border-white/10 text-slate-200">
                  {teams.map(team => (
                    <SelectItem key={team.id} value={team.id} className="focus:bg-orange-500/20 focus:text-white">
                      {team.team_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {selectedTeam && (
            <motion.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="grid md:grid-cols-2 gap-4"
            >
              {/* Primary Status Card */}
              <div className={cn("col-span-1 md:col-span-2 p-6 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-6", getStatusColor(selectedTeam.status))}>
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-black/20 rounded-full">
                    {getStatusIcon(selectedTeam.status)}
                  </div>
                  <div>
                    <h2 className="text-2xl font-black tracking-tight">{selectedTeam.team_name}</h2>
                    <p className="text-sm font-medium opacity-80 uppercase tracking-widest mt-0.5">Status: {selectedTeam.status}</p>
                  </div>
                </div>


              </div>

              {/* Data Points */}
              <div className="bg-white/[0.03] border border-white/[0.06] p-5 rounded-2xl flex items-start gap-3">
                <Github className="w-5 h-5 text-slate-500 shrink-0" />
                <div>
                  <h4 className="text-sm font-bold text-white">Last Detected Commit</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    {selectedTeam.last_push 
                      ? `${formatDistanceToNow(new Date(selectedTeam.last_push))} ago`
                      : "No commits detected yet"}
                  </p>
                  <a href={selectedTeam.repo_url} target="_blank" rel="noreferrer" className="text-[10px] text-orange-400 hover:text-orange-300 hover:underline mt-2 inline-block">View Repository ↗</a>
                </div>
              </div>

              <div className="bg-white/[0.03] border border-white/[0.06] p-5 rounded-2xl flex items-start gap-3">
                <HeartPulse className={cn("w-5 h-5 shrink-0", selectedTeam.deployment_status === 'live' ? 'text-emerald-400' : selectedTeam.deployment_status === 'slow' ? 'text-amber-400' : 'text-slate-500')} />
                <div>
                  <h4 className="text-sm font-bold text-white">Deployment Health</h4>
                  {selectedTeam.deployment_url ? (
                    <>
                      <p className="text-xs text-slate-500 mt-1 capitalize">{selectedTeam.deployment_status} • {selectedTeam.response_time}ms ping</p>
                      <a href={selectedTeam.deployment_url} target="_blank" rel="noreferrer" className="text-[10px] text-orange-400 hover:text-orange-300 hover:underline mt-2 inline-block">Test Live Link ↗</a>
                    </>
                  ) : (
                    <p className="text-xs text-slate-600 mt-1">No deployment URL submitted yet.</p>
                  )}
                </div>
              </div>

            </motion.div>
          )}

        </div>
      </motion.div>
    </main>
  );
}
