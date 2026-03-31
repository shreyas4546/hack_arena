"use client";

import { useEffect, useState, useCallback } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  ArrowLeft, Users, Github, Search, CheckCircle2,
  XCircle, AlertTriangle, Clock, Hash,
  Key, Mail, Loader2, RefreshCw
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
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
  email?: string;
};

export default function ParticipantsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  
  // Account Recovery State
  const [resetTarget, setResetTarget] = useState<Team | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [resetting, setResetting] = useState(false);

  const fetchTeams = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/participants-with-auth", { cache: "no-store" });
      if (res.ok) setTeams(await res.json());
    } catch (e) {
      console.error("Failed to fetch participants", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTeams();
    const interval = setInterval(fetchTeams, 30000);
    return () => clearInterval(interval);
  }, [fetchTeams]);

  const handleResetPassword = async () => {
    if (!resetTarget || !newPassword.trim()) return;
    setResetting(true);
    const toastId = toast.loading("Resetting password...");
    try {
      const res = await fetch("/api/admin/account-recovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ team_id: resetTarget.id, new_password: newPassword.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      toast.success(`Password reset successful for ${resetTarget.team_name}`, { id: toastId });
      setResetTarget(null);
      setNewPassword("");
    } catch (err: any) {
      toast.error(err.message || "Failed to reset password", { id: toastId });
    } finally {
      setResetting(false);
    }
  };

  const filtered = search.trim()
    ? teams.filter(t => t.team_name.toLowerCase().includes(search.toLowerCase()))
    : teams;

  const statusCounts = {
    active: teams.filter(t => t.status === "active").length,
    warning: teams.filter(t => t.status === "warning").length,
    inactive: teams.filter(t => t.status === "inactive").length,
    disqualified: teams.filter(t => t.status === "disqualified").length,
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 font-sans selection:bg-cyan-500/30 overflow-x-hidden">
      {/* Background */}
      <div className="fixed inset-0 z-0 pointer-events-none bg-[radial-gradient(circle_at_50%_0%,rgba(6,182,212,0.08),transparent_50%),radial-gradient(circle_at_80%_80%,rgba(147,51,234,0.08),transparent_50%)]" />

      <div className="relative z-10 max-w-6xl mx-auto p-6 md:p-10 space-y-10">

        {/* Back Nav */}
        <Link href="/admin" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Control Panel
        </Link>

        {/* Page Header */}
        <header className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-teal-500/10 border border-cyan-500/20 shadow-[0_0_30px_rgba(6,182,212,0.1)]">
              <Users className="w-8 h-8 text-cyan-400" />
            </div>
            <div className="flex-1">
              <h1 className="text-4xl md:text-5xl font-black tracking-tight bg-gradient-to-r from-cyan-300 via-teal-200 to-cyan-400 bg-clip-text text-transparent">
                Participants
              </h1>
              <p className="text-slate-400 mt-1 font-medium">
                {loading ? "Loading..." : <><span className="text-cyan-400 font-bold text-lg">{teams.length}</span> team{teams.length !== 1 ? "s" : ""} registered for HackArena 2K26</>}
              </p>
            </div>
            <button onClick={() => { setLoading(true); fetchTeams(); }} className="p-2.5 rounded-xl bg-slate-900/50 border border-white/10 text-slate-400 hover:text-cyan-400 hover:border-cyan-500/30 transition-all" title="Refresh participants">
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            </button>
          </div>

          {/* Stats Row */}
          {!loading && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <MiniStat label="Active" value={statusCounts.active} icon={CheckCircle2} color="emerald" />
              <MiniStat label="Warning" value={statusCounts.warning} icon={AlertTriangle} color="amber" />
              <MiniStat label="Inactive" value={statusCounts.inactive} icon={XCircle} color="red" />
              <MiniStat label="Disqualified" value={statusCounts.disqualified} icon={XCircle} color="rose" />
            </div>
          )}

          {/* Search */}
          <div className="max-w-md">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <Input
                placeholder="Search participants..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-slate-900/50 border-white/10 text-white placeholder:text-slate-600 focus-visible:ring-cyan-500/50"
              />
            </div>
          </div>
        </header>

        {/* Participants Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-2xl bg-slate-900/40 border border-white/5 p-6 space-y-4">
                <div className="h-6 w-32 bg-slate-800 rounded-lg" />
                <div className="h-4 w-24 bg-slate-800 rounded-md" />
                <div className="h-10 w-full bg-slate-800 rounded-xl" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-20 bg-slate-900/20 rounded-2xl border border-white/5">
            <Users className="w-16 h-16 text-slate-600 mb-4" />
            <h2 className="text-2xl font-bold text-slate-400">
              {search ? "No participants match your search" : "No teams registered yet"}
            </h2>
            <p className="text-slate-500 mt-2">
              {search ? "Try a different keyword." : "Teams will appear here once they register."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((team, index) => (
              <div
                key={team.id}
                className="group relative overflow-hidden rounded-2xl bg-slate-900/50 border border-white/5 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(6,182,212,0.08)] hover:border-white/10"
              >
                {/* Index badge */}
                <div className="absolute top-0 right-0 m-3">
                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-950/80 border border-white/10 text-[10px] font-bold text-slate-400">
                    <Hash className="w-3 h-3 mr-0.5" />{index + 1}
                  </span>
                </div>

                {/* Hover glow */}
                <div className="absolute -inset-px opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl pointer-events-none"
                  style={{ background: "radial-gradient(circle at 50% 100%, rgba(6,182,212,0.08), transparent 70%)" }}
                />

                <div className="relative z-10 p-6 space-y-4">
                  {/* Team Name */}
                  <div>
                    <h3 className="text-lg font-bold text-white tracking-tight">{team.team_name}</h3>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <StatusBadge status={team.status} />
                      {team.strike_count > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-bold">
                          {team.strike_count} strike{team.strike_count !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Last Push */}
                  <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                    <Clock className="w-3.5 h-3.5" />
                    Last push {team.last_push ? formatDistanceToNow(new Date(team.last_push), { addSuffix: true }) : "N/A"}
                  </div>

                  {/* GitHub Link */}
                  <a
                    href={team.repo_url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-2 w-full p-2.5 rounded-xl bg-slate-950/50 border border-white/5 text-slate-400 hover:text-white hover:bg-slate-800 hover:border-white/10 transition-all duration-300 font-medium text-xs"
                  >
                    <Github className="w-3.5 h-3.5" />
                    View Repository
                  </a>

                  {/* Deployment badge */}
                  {team.deployment_url && (
                    <a
                      href={team.deployment_url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-center gap-2 w-full p-2.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/30 transition-all duration-300 font-medium text-xs"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Deployed — View Live
                    </a>
                  )}

                  {/* Account Recovery Actions */}
                  <div className="pt-3 mt-3 border-t border-white/5 space-y-2">
                    <div className="flex items-center gap-2 text-[11px] font-medium text-slate-400 bg-slate-950/50 p-2 rounded-lg border border-white/5 overflow-hidden">
                      <Mail className="w-3.5 h-3.5 shrink-0 text-cyan-400" />
                      <span className="truncate flex-1">{team.email || "Loading..."}</span>
                    </div>
                    <button
                      onClick={() => setResetTarget(team)}
                      className="flex items-center justify-center gap-2 w-full p-2 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 hover:text-indigo-300 border border-indigo-500/20 hover:border-indigo-500/40 transition-all duration-300 font-bold text-[11px]"
                    >
                      <Key className="w-3 h-3" />
                      Reset Password
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Password Reset Modal */}
      {resetTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-indigo-500/30 rounded-2xl shadow-[0_0_50px_rgba(99,102,241,0.15)] p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center">
                <Key className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">Account Recovery</h3>
                <p className="text-xs text-slate-400">Force reset the password for this team.</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-white/5 space-y-2">
              <p className="text-sm font-bold text-white">{resetTarget.team_name}</p>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Mail className="w-3.5 h-3.5 text-cyan-400" />
                <span>{resetTarget.email}</span>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-bold text-slate-300 uppercase tracking-widest">New Password</label>
              <div className="flex items-center gap-2">
                <Input
                  type="text"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="e.g. HackArena2K26!"
                  className="w-full bg-slate-950/50 border border-white/10 rounded-xl p-3 text-sm text-white focus-visible:ring-indigo-500/50"
                  autoComplete="off"
                />
                <button
                  onClick={() => setNewPassword(Math.random().toString(36).slice(-6) + "@Hck!")}
                  className="px-3 py-2 text-xs font-bold text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 rounded-xl border border-indigo-500/30 transition-colors whitespace-nowrap"
                >
                  Generate
                </button>
              </div>
              <p className="text-[10px] text-slate-500">Must be at least 6 characters. The participant will be immediately logged out of all active sessions.</p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => { setResetTarget(null); setNewPassword(""); }}
                className="flex-1 px-4 py-2.5 text-sm font-bold text-slate-300 bg-slate-800 rounded-xl border border-white/10 hover:bg-slate-700 transition-colors"
                disabled={resetting}
              >
                Cancel
              </button>
              <button
                onClick={handleResetPassword}
                disabled={!newPassword.trim() || newPassword.length < 6 || resetting}
                className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl border border-indigo-400/50 shadow-[0_0_15px_rgba(99,102,241,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {resetting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
                {resetting ? "Resetting..." : "Reset"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}


function MiniStat({ label, value, icon: Icon, color }: { label: string; value: number; icon: any; color: string }) {
  const colorMap: Record<string, string> = {
    emerald: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    amber: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    red: "text-red-400 bg-red-500/10 border-red-500/20",
    rose: "text-rose-400 bg-rose-500/10 border-rose-500/20",
  };
  return (
    <div className={cn("flex items-center gap-3 p-3 rounded-xl border backdrop-blur-md", colorMap[color] || "text-slate-400 bg-slate-900/50 border-white/10")}>
      <Icon className="w-4 h-4 shrink-0" />
      <div>
        <span className="text-xl font-black">{value}</span>
        <span className="text-[10px] uppercase tracking-widest font-bold ml-1.5 opacity-70">{label}</span>
      </div>
    </div>
  );
}


function StatusBadge({ status }: { status: string }) {
  if (status === "active") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
        <CheckCircle2 className="w-3 h-3" /> Active
      </span>
    );
  }
  if (status === "warning") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold animate-pulse">
        <AlertTriangle className="w-3 h-3" /> Warning
      </span>
    );
  }
  if (status === "disqualified") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-bold">
        <XCircle className="w-3 h-3" /> Disqualified
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 text-[10px] font-bold">
      <XCircle className="w-3 h-3" /> Inactive
    </span>
  );
}
