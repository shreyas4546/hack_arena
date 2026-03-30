"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Loader2, LogOut, ShieldAlert, Github, ExternalLink, Activity, AlertTriangle, Trophy, Copy, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import PremiumCard from "@/components/PremiumCard";

type TeamData = {
  team_name: string;
  category?: string;
  problem_statement?: string;
  team_leader_name?: string;
  participant_names?: string[];
  repo_url: string;
  deployment_url?: string;
  status: string;
  strike_count: number;
  score: number;
  last_push?: string;
};

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [team, setTeam] = useState<TeamData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchTeamData = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session) {
          router.push("/login");
          return;
        }

        // Fetch team belonging to this user
        const { data: teamData, error: dbError } = await supabase
          .from("teams")
          .select("*")
          .eq("auth_user_id", session.user.id)
          .maybeSingle();

        if (dbError) {
          console.error(dbError);
          setError("Failed to load team data. Please try again later.");
        } else if (!teamData) {
          setError("Access Error: No team found for this account.");
        } else {
          setTeam(teamData);
        }
      } catch (err) {
        console.error(err);
        setError("An unexpected error occurred.");
      } finally {
        setLoading(false);
      }
    };

    fetchTeamData();

    // Listen for sign out
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || !session) {
        router.push("/login");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  const handleSignOut = async () => {
    setLoading(true);
    await supabase.auth.signOut();
  };

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(type);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-6 space-y-5">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
        <p className="text-cyan-500 text-sm font-semibold tracking-widest uppercase animate-pulse">
          Establishing Secure Connection...
        </p>
      </div>
    );
  }

  return (
    <div className="noise-overlay min-h-screen bg-[#050505] text-white selection:bg-cyan-500/30 font-sans p-6 md:p-12 relative overflow-hidden pt-28 md:pt-36">
      {/* Background aesthetics */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[#050505]" />
        <div className="absolute top-0 right-0 w-[700px] h-[700px] bg-cyan-500/8 blur-[160px] rounded-full opacity-50 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-emerald-500/[0.04] blur-[140px] rounded-full opacity-30 pointer-events-none" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto space-y-10 animate-in fade-in duration-700">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-white/[0.06]">
          <div>
            <h1 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tight">
              Your Team <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400">Dashboard</span>
            </h1>
            <p className="text-slate-500 font-medium text-sm mt-3">
              Private access. Viewing secure data for your registered team.
            </p>
          </div>

          <button
            onClick={handleSignOut}
            className="group flex items-center justify-center gap-2.5 bg-white/[0.03] hover:bg-rose-500/8 border border-white/[0.06] hover:border-rose-500/25 text-white hover:text-rose-400 px-6 py-3 rounded-xl transition-all duration-300 font-semibold active:scale-95"
          >
            <LogOut className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="uppercase tracking-wider text-xs">Sign Out</span>
          </button>
        </header>

        {/* Error / Empty State */}
        {error && (
          <div className="p-10 rounded-2xl bg-rose-500/[0.04] border border-rose-500/15 flex flex-col items-center justify-center text-center space-y-4 backdrop-blur-xl">
            <ShieldAlert className="w-12 h-12 text-rose-400 animate-pulse" />
            <h2 className="text-xl font-black text-white tracking-tight">Authentication Authorized, Data Missing</h2>
            <p className="text-rose-400 max-w-md">{error}</p>
          </div>
        )}

        {/* Team Dashboard Content */}
        {team && !error && (
          <div className="space-y-7">
            
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
              {/* Team Name */}
              <PremiumCard glowColor="rgba(255,255,255,0.05)" className="p-6 col-span-2 md:col-span-1">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em] mb-2">Team</p>
                <h3 className="text-xl font-black text-white truncate group-hover:-translate-y-0.5 transition-transform duration-300 tracking-tight">{team.team_name}</h3>
              </PremiumCard>

              {/* Status */}
              <PremiumCard glowColor={team.status === 'active' ? 'rgba(16,185,129,0.08)' : team.status === 'eliminated' ? 'rgba(244,63,94,0.08)' : 'rgba(245,158,11,0.08)'} className="p-6">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em] mb-2">Status</p>
                <div className="flex items-center gap-2.5">
                  <div className={cn(
                    "w-2.5 h-2.5 rounded-full animate-pulse",
                    team.status === "active" ? "bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)]" : 
                    team.status === "eliminated" ? "bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.5)]" : 
                    "bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.5)]"
                  )} />
                  <span className="text-lg font-black text-white capitalize group-hover:-translate-y-px transition-transform duration-300">{team.status}</span>
                </div>
              </PremiumCard>

              {/* Strikes */}
              <PremiumCard glowColor={team.strike_count > 0 ? 'rgba(244,63,94,0.08)' : 'rgba(255,255,255,0.04)'} className={cn("p-6", team.strike_count > 0 && "border-rose-500/15")}>
                <p className={cn("text-[10px] font-bold uppercase tracking-[0.15em] mb-2", team.strike_count > 0 ? "text-rose-400/80" : "text-slate-500")}>Strikes</p>
                <div className="flex items-center gap-2.5">
                  <AlertTriangle className={cn("w-5 h-5 group-hover:scale-110 transition-transform duration-300", team.strike_count > 0 ? "text-rose-500" : "text-slate-600")} />
                  <span className="text-2xl font-black text-white group-hover:-translate-y-px transition-transform duration-300">{team.strike_count}</span>
                  <span className="text-slate-500 text-sm font-medium mt-1">/ 3</span>
                </div>
              </PremiumCard>
            </div>

            {/* Details Panel */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Mission Details */}
              <PremiumCard glowColor="rgba(52,211,153,0.06)" className="p-7 md:p-9">
                <h3 className="text-base font-black text-white mb-7 uppercase tracking-wider flex items-center gap-2.5">
                  <Activity className="w-5 h-5 text-emerald-400" /> Mission Details
                </h3>
                
                <div className="space-y-7">
                  {/* Domain Badge */}
                  {team.category && (
                     <div className="mb-3">
                      <span className="px-3.5 py-1.5 bg-gradient-to-r from-orange-500/15 to-amber-500/8 border border-orange-500/20 rounded-lg text-xs font-bold text-orange-400 uppercase tracking-widest inline-block shadow-[0_0_15px_rgba(251,146,60,0.1)]">
                        Category: {team.category}
                      </span>
                    </div>
                  )}

                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em] mb-3">Operatives</p>
                    <div className="flex flex-col gap-3">
                      {team.team_leader_name && (
                        <div className="flex items-center gap-2">
                          <span className="px-3.5 py-2 bg-cyan-500/8 border border-cyan-500/20 rounded-lg text-sm font-medium text-cyan-400 flex items-center gap-2 shadow-[0_0_15px_rgba(6,182,212,0.1)]">
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
                            {team.team_leader_name} <span className="text-[10px] uppercase font-bold text-cyan-500/70 ml-1">(Leader)</span>
                          </span>
                        </div>
                      )}
                      
                      {team.participant_names && team.participant_names.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {team.participant_names.map((p, i) => (
                            <span key={i} className="px-3.5 py-2 bg-white/[0.03] border border-white/[0.08] hover:border-white/15 transition-colors rounded-lg text-sm font-medium text-slate-200">
                              {p}
                            </span>
                          ))}
                        </div>
                      ) : !team.team_leader_name && (
                        <span className="text-slate-500 text-sm italic">Profiles not populated</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em] mb-3">Assigned Directive</p>
                    <div className="p-5 rounded-xl bg-white/[0.02] border border-white/[0.05] relative overflow-hidden group hover:border-white/[0.08] transition-colors">
                      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.015] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <p className="text-slate-300 text-sm leading-relaxed relative z-10">
                        {team.problem_statement || <span className="text-slate-600 italic">No problem statement assigned yet.</span>}
                      </p>
                    </div>
                  </div>
                </div>
              </PremiumCard>

              {/* Infrastructure Links */}
              <PremiumCard glowColor="rgba(96,165,250,0.06)" className="p-7 md:p-9 space-y-7">
                <h3 className="text-base font-black text-white mb-7 uppercase tracking-wider flex items-center gap-2.5">
                  <ExternalLink className="w-5 h-5 text-blue-400" /> Infrastructure
                </h3>

                {/* Repo URL */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em]">Repository Archive</p>
                    <button 
                      onClick={() => handleCopy(team.repo_url, 'repo')}
                      className="text-slate-500 hover:text-white transition-colors flex items-center gap-1 text-[10px] uppercase font-bold cursor-pointer"
                    >
                      {copiedLink === 'repo' ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      {copiedLink === 'repo' ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <div className="flex overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02] group hover:border-white/[0.12] transition-colors">
                    <div className="flex items-center justify-center px-4 bg-white/[0.03] border-r border-white/[0.06] shrink-0">
                      <Github className="w-5 h-5 text-slate-400 group-hover:text-white transition-colors" />
                    </div>
                    <a 
                      href={team.repo_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex-1 px-4 py-3.5 text-sm text-cyan-400 hover:text-cyan-300 truncate transition-colors"
                    >
                      {team.repo_url}
                    </a>
                  </div>
                </div>

                {/* Deployment URL */}
                <div className="space-y-2.5 pt-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em]">Live Deployment</p>
                    {team.deployment_url && (
                      <button 
                        onClick={() => handleCopy(team.deployment_url!, 'deploy')}
                        className="text-slate-500 hover:text-white transition-colors flex items-center gap-1 text-[10px] uppercase font-bold cursor-pointer"
                      >
                        {copiedLink === 'deploy' ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        {copiedLink === 'deploy' ? 'Copied' : 'Copy'}
                      </button>
                    )}
                  </div>
                  
                  {team.deployment_url ? (
                    <div className="flex items-start md:items-center gap-3 flex-col md:flex-row">
                      <div className="flex-1 flex w-full overflow-hidden rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] group">
                        <a 
                          href={team.deployment_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex-1 px-4 py-3.5 text-sm text-emerald-400 hover:text-emerald-300 truncate transition-colors"
                        >
                          {team.deployment_url}
                        </a>
                      </div>
                      <a 
                        href={team.deployment_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="px-6 py-3.5 w-full md:w-auto bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-sm rounded-xl transition-all hover:scale-105 shadow-[0_0_20px_rgba(16,185,129,0.15)] hover:shadow-[0_0_30px_rgba(16,185,129,0.3)] shrink-0 flex items-center justify-center gap-2"
                      >
                        Open App <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3 p-5 rounded-xl border border-amber-500/15 bg-amber-500/[0.04]">
                      <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-amber-400">No Deployment Found</p>
                        <p className="text-xs text-amber-500/70 mt-1.5 leading-relaxed">Submit your project deployment link to the judges to activate this block.</p>
                      </div>
                    </div>
                  )}
                </div>

              </PremiumCard>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
