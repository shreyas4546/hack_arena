"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Loader2, LogOut, ShieldAlert, Github, ExternalLink, Activity, AlertTriangle, Trophy, Copy, CheckCircle2, AlertCircle, Zap, Users, Target } from "lucide-react";
import { cn } from "@/lib/utils";

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
    router.push("/login");
  };

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(type);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-6 space-y-5">
        <div className="relative">
          <div className="absolute inset-0 w-12 h-12 bg-orange-500/20 rounded-full blur-xl animate-pulse" />
          <Loader2 className="w-8 h-8 text-orange-400 animate-spin relative z-10" />
        </div>
        <p className="text-orange-400/70 text-[11px] font-bold tracking-[0.3em] uppercase animate-pulse">
          Establishing Secure Connection...
        </p>
      </div>
    );
  }

  return (
    <div className="noise-overlay min-h-screen bg-[#050505] text-white selection:bg-orange-500/30 font-sans p-6 md:p-12 relative overflow-hidden pt-20 md:pt-24">
      {/* Layered Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[#050505]" />
        <div className="absolute -top-[10%] -right-[10%] w-[800px] h-[800px] bg-orange-500/[0.06] blur-[180px] rounded-full" />
        <div className="absolute -bottom-[15%] -left-[10%] w-[700px] h-[700px] bg-cyan-500/[0.04] blur-[160px] rounded-full" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-orange-500/[0.02] rounded-full blur-[140px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.012)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.012)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_40%,#000_50%,transparent_100%)]" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-700">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-orange-500/10 rounded-xl border border-orange-500/15">
                <Target className="w-5 h-5 text-orange-400" />
              </div>
              <span className="text-[10px] font-bold text-[#a78b7d] uppercase tracking-[0.2em]">Command Center</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight">
              Your Team{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-amber-300 to-orange-500">
                Dashboard
              </span>
            </h1>
            <p className="text-[#a78b7d] font-medium text-sm mt-3">
              Private access. Viewing secure telemetry for your registered team.
            </p>
          </div>

          <button
            onClick={handleSignOut}
            className="group flex items-center justify-center gap-2.5 bg-white/[0.03] hover:bg-rose-500/8 border border-white/[0.05] hover:border-rose-500/20 text-[#e0c0b1] hover:text-rose-400 px-6 py-3 rounded-xl transition-all duration-300 font-bold active:scale-95 backdrop-blur-sm"
          >
            <LogOut className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="uppercase tracking-[0.15em] text-[11px]">Sign Out</span>
          </button>
        </header>

        {/* Divider */}
        <div className="h-px w-full bg-gradient-to-r from-transparent via-orange-500/15 to-transparent" />

        {/* Error / Empty State */}
        {error && (
          <div className="p-10 rounded-2xl bg-[#93000a]/[0.06] border border-[#93000a]/15 flex flex-col items-center justify-center text-center space-y-4 backdrop-blur-xl relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-rose-500/[0.03] to-transparent pointer-events-none" />
            <ShieldAlert className="w-12 h-12 text-[#ffb4ab] animate-pulse relative z-10" />
            <h2 className="text-xl font-black text-white tracking-tight relative z-10 uppercase">Authentication Authorized, Data Missing</h2>
            <p className="text-[#ffb4ab] max-w-md relative z-10">{error}</p>
          </div>
        )}

        {/* Team Dashboard Content */}
        {team && !error && (
          <div className="space-y-6">
            
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
              {/* Team Name */}
              <TacticalCard accentColor="orange">
                <p className="text-[10px] font-bold text-[#a78b7d] uppercase tracking-[0.2em] mb-3">Callsign</p>
                <h3 className="text-xl font-black text-white truncate tracking-tight">{team.team_name}</h3>
                {team.score !== undefined && (
                  <div className="mt-3 flex items-center gap-2">
                    <Trophy className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-sm font-bold text-amber-400">{team.score.toFixed(1)}</span>
                    <span className="text-[10px] text-[#584237] font-bold uppercase">/ 10.0</span>
                  </div>
                )}
              </TacticalCard>

              {/* Status */}
              <TacticalCard accentColor={team.status === 'active' ? 'emerald' : team.status === 'eliminated' || team.status === 'disqualified' ? 'rose' : 'amber'}>
                <p className="text-[10px] font-bold text-[#a78b7d] uppercase tracking-[0.2em] mb-3">Status</p>
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-2.5 h-2.5 rounded-full animate-pulse",
                    team.status === "active" ? "bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.6)]" : 
                    team.status === "eliminated" || team.status === "disqualified" ? "bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.6)]" : 
                    "bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.6)]"
                  )} />
                  <span className="text-lg font-black text-white capitalize">{team.status}</span>
                </div>
              </TacticalCard>

              {/* Strikes */}
              <TacticalCard accentColor={team.strike_count > 0 ? 'rose' : 'neutral'}>
                <p className={cn("text-[10px] font-bold uppercase tracking-[0.2em] mb-3", team.strike_count > 0 ? "text-rose-400/80" : "text-[#a78b7d]")}>Threat Level</p>
                <div className="flex items-center gap-3">
                  <AlertTriangle className={cn("w-5 h-5", team.strike_count > 0 ? "text-rose-500" : "text-[#584237]")} />
                  <span className="text-2xl font-black text-white">{team.strike_count}</span>
                  <span className="text-[#584237] text-sm font-bold mt-1">/ 3</span>
                </div>
                {team.strike_count > 0 && (
                  <div className="mt-2 flex gap-1">
                    {[0, 1, 2].map(i => (
                      <div key={i} className={cn("h-1 flex-1 rounded-full", i < team.strike_count ? "bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.4)]" : "bg-white/[0.05]")} />
                    ))}
                  </div>
                )}
              </TacticalCard>
            </div>

            {/* Details Panel */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Mission Details */}
              <div className="relative overflow-hidden rounded-2xl bg-white/[0.02] backdrop-blur-xl border border-white/[0.05] p-7 md:p-9 group hover:border-orange-500/10 transition-all duration-500">
                <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-gradient-to-b from-emerald-500/60 via-emerald-500/20 to-transparent" />
                <div className="absolute -top-20 -right-20 w-[200px] h-[200px] bg-emerald-500/[0.03] rounded-full blur-[80px] pointer-events-none" />
                
                <h3 className="text-[11px] font-black text-white mb-7 uppercase tracking-[0.2em] flex items-center gap-2.5 relative z-10">
                  <Activity className="w-4 h-4 text-emerald-400" /> Mission Details
                </h3>
                
                <div className="space-y-7 relative z-10">
                  {/* Domain Badge */}
                  {team.category && (
                    <div>
                      <span className="px-3.5 py-1.5 bg-gradient-to-r from-orange-500/15 to-amber-500/8 border border-orange-500/20 rounded-lg text-[10px] font-black text-orange-400 uppercase tracking-[0.15em] inline-block shadow-[0_0_15px_rgba(251,146,60,0.08)]">
                        {team.category}
                      </span>
                    </div>
                  )}

                  {/* Operatives */}
                  <div>
                    <p className="text-[10px] font-bold text-[#a78b7d] uppercase tracking-[0.2em] mb-3">Operatives</p>
                    <div className="flex flex-col gap-3">
                      {team.team_leader_name && (
                        <div className="flex items-center gap-2">
                          <span className="px-3.5 py-2 bg-cyan-500/8 border border-cyan-500/15 rounded-lg text-sm font-medium text-[#4cd7f6] flex items-center gap-2 shadow-[0_0_12px_rgba(6,182,212,0.06)]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#4cd7f6] animate-pulse shadow-[0_0_6px_rgba(76,215,246,0.6)]" />
                            {team.team_leader_name} <span className="text-[9px] uppercase font-black text-cyan-500/60 ml-1">(Lead)</span>
                          </span>
                        </div>
                      )}
                      
                      {team.participant_names && team.participant_names.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {team.participant_names.map((p, i) => (
                            <span key={i} className="px-3.5 py-2 bg-white/[0.03] border border-white/[0.05] hover:border-white/[0.1] transition-colors rounded-lg text-sm font-medium text-[#e0c0b1]">
                              {p}
                            </span>
                          ))}
                        </div>
                      ) : !team.team_leader_name && (
                        <span className="text-[#584237] text-sm italic">Profiles not populated</span>
                      )}
                    </div>
                  </div>

                  {/* Assigned Directive */}
                  <div>
                    <p className="text-[10px] font-bold text-[#a78b7d] uppercase tracking-[0.2em] mb-3">Assigned Directive</p>
                    <div className="p-5 rounded-xl bg-[#0e0e0e] border border-white/[0.04] relative overflow-hidden group/dir hover:border-white/[0.08] transition-colors">
                      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.01] to-transparent opacity-0 group-hover/dir:opacity-100 transition-opacity" />
                      <p className="text-[#e0c0b1] text-sm leading-relaxed relative z-10">
                        {team.problem_statement || <span className="text-[#584237] italic">No problem statement assigned yet.</span>}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Infrastructure Links */}
              <div className="relative overflow-hidden rounded-2xl bg-white/[0.02] backdrop-blur-xl border border-white/[0.05] p-7 md:p-9 space-y-7 group hover:border-orange-500/10 transition-all duration-500">
                <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-gradient-to-b from-[#4cd7f6]/60 via-[#4cd7f6]/20 to-transparent" />
                <div className="absolute -top-20 -right-20 w-[200px] h-[200px] bg-cyan-500/[0.03] rounded-full blur-[80px] pointer-events-none" />

                <h3 className="text-[11px] font-black text-white mb-2 uppercase tracking-[0.2em] flex items-center gap-2.5 relative z-10">
                  <ExternalLink className="w-4 h-4 text-[#4cd7f6]" /> Infrastructure
                </h3>

                {/* Repo URL */}
                <div className="space-y-2.5 relative z-10">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold text-[#a78b7d] uppercase tracking-[0.2em]">Repository Archive</p>
                    <button 
                      onClick={() => handleCopy(team.repo_url, 'repo')}
                      className="text-[#584237] hover:text-white transition-colors flex items-center gap-1 text-[10px] uppercase font-bold cursor-pointer"
                    >
                      {copiedLink === 'repo' ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      {copiedLink === 'repo' ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <div className="flex overflow-hidden rounded-xl border border-white/[0.05] bg-[#0e0e0e] group/repo hover:border-white/[0.1] transition-colors">
                    <div className="flex items-center justify-center px-4 bg-white/[0.02] border-r border-white/[0.05] shrink-0">
                      <Github className="w-5 h-5 text-[#a78b7d] group-hover/repo:text-white transition-colors" />
                    </div>
                    <a 
                      href={team.repo_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex-1 px-4 py-3.5 text-sm text-orange-400/80 hover:text-orange-300 truncate transition-colors"
                    >
                      {team.repo_url}
                    </a>
                  </div>
                </div>

                {/* Deployment URL */}
                <div className="space-y-2.5 pt-2 relative z-10">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold text-[#a78b7d] uppercase tracking-[0.2em]">Live Deployment</p>
                    {team.deployment_url && (
                      <button 
                        onClick={() => handleCopy(team.deployment_url!, 'deploy')}
                        className="text-[#584237] hover:text-white transition-colors flex items-center gap-1 text-[10px] uppercase font-bold cursor-pointer"
                      >
                        {copiedLink === 'deploy' ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        {copiedLink === 'deploy' ? 'Copied' : 'Copy'}
                      </button>
                    )}
                  </div>
                  
                  {team.deployment_url ? (
                    <div className="flex items-start md:items-center gap-3 flex-col md:flex-row">
                      <div className="flex-1 flex w-full overflow-hidden rounded-xl border border-emerald-500/15 bg-emerald-500/[0.03]">
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
                        className="px-6 py-3.5 w-full md:w-auto bg-emerald-500 hover:bg-emerald-400 text-[#003640] font-black text-sm rounded-xl transition-all hover:scale-105 shadow-[0_0_20px_rgba(16,185,129,0.15)] hover:shadow-[0_0_30px_rgba(16,185,129,0.3)] shrink-0 flex items-center justify-center gap-2 uppercase tracking-wider text-[11px]"
                      >
                        Open App <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3 p-5 rounded-xl border border-amber-500/15 bg-amber-500/[0.04] relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-r from-amber-500/[0.03] to-transparent pointer-events-none" />
                      <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5 relative z-10" />
                      <div className="relative z-10">
                        <p className="text-sm font-bold text-amber-400">No Deployment Found</p>
                        <p className="text-xs text-amber-500/60 mt-1.5 leading-relaxed">Submit your project deployment link to the judges to activate this block.</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}


function TacticalCard({ children, accentColor = 'orange' }: { children: React.ReactNode; accentColor?: string }) {
  const accentMap: Record<string, string> = {
    orange: 'from-orange-500/60 via-orange-500/20',
    emerald: 'from-emerald-500/60 via-emerald-500/20',
    amber: 'from-amber-500/60 via-amber-500/20',
    rose: 'from-rose-500/60 via-rose-500/20',
    neutral: 'from-white/20 via-white/5',
  };

  const glowMap: Record<string, string> = {
    orange: 'bg-orange-500/[0.03]',
    emerald: 'bg-emerald-500/[0.03]',
    amber: 'bg-amber-500/[0.03]',
    rose: 'bg-rose-500/[0.03]',
    neutral: 'bg-white/[0.01]',
  };

  return (
    <div className="relative overflow-hidden rounded-2xl bg-white/[0.02] backdrop-blur-xl border border-white/[0.05] p-6 group hover:border-white/[0.08] transition-all duration-500">
      <div className={cn("absolute left-0 top-0 bottom-0 w-[2px] bg-gradient-to-b to-transparent", accentMap[accentColor] || accentMap.orange)} />
      <div className={cn("absolute -top-16 -right-16 w-[150px] h-[150px] rounded-full blur-[60px] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500", glowMap[accentColor] || glowMap.orange)} />
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}
