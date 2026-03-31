import { supabaseAdmin } from "@/lib/supabase";
import { ExternalLink, Github, Trophy, AlertTriangle, MonitorPlay, Activity, Ban } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

// Make this route dynamic so it always requests fresh data
export const dynamic = "force-dynamic";

export default async function JudgingDashboard() {
  const { data: teams, error } = await supabaseAdmin
    .from("teams")
    .select("id, team_name, repo_url, deployment_url, deployment_status, score, status")
    .order("score", { ascending: false, nullsFirst: false });

  if (error || !teams) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-8">
        <h1 className="text-red-400 text-2xl font-bold mb-4">Error loading teams</h1>
        <p className="text-slate-400">{error?.message || "Unknown error"}</p>
      </div>
    );
  }

  // Filter and split groups
  const activeTeams = teams.filter((t) => t.status !== "disqualified");
  const disqualifiedTeams = teams.filter((t) => t.status === "disqualified");
  
  const deployedTeams = activeTeams.filter(
    (t) => t.deployment_status === "live" || t.deployment_status === "slow"
  );
  
  const notDeployedTeams = activeTeams.filter(
    (t) => t.deployment_status === "down" || !t.deployment_status
  ).sort((a, b) => a.team_name.localeCompare(b.team_name));

  const top10Teams = deployedTeams.slice(0, 10);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 selection:bg-cyan-500/30 font-sans pb-24">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-0 left-[20%] w-[800px] h-[500px] bg-cyan-600/10 blur-[120px] rounded-full mix-blend-screen mix-blend-plus-lighter animate-pulse-slow" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-indigo-600/10 blur-[100px] rounded-full mix-blend-screen" />
        <div className="absolute top-[40%] right-[30%] w-[400px] h-[400px] bg-emerald-600/10 blur-[120px] rounded-full mix-blend-screen" />
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.015] mix-blend-overlay" />
      </div>

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        
        {/* Header */}
        <header className="flex flex-col xl:flex-row items-start xl:items-center justify-between mb-16 pb-8 border-b border-white/5 gap-8">
          <div>
            <h1 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-white via-cyan-100 to-cyan-400 bg-clip-text text-transparent tracking-tight mb-3">
              Final Evaluation
            </h1>
            <p className="text-slate-400 text-lg">Independent Review Panel for live hackathon submissions.</p>
          </div>

          <div className="w-full xl:w-auto flex flex-col sm:flex-row items-center gap-6 bg-slate-900/50 p-5 rounded-3xl border border-white/5 backdrop-blur-md shadow-2xl">
            <div className="flex items-center gap-6">
              <div className="text-center px-2">
                <div className="text-3xl font-extrabold text-white tabular-nums drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">{teams.length}</div>
                <div className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mt-1">Total Teams</div>
              </div>
              
              <div className="h-10 w-px bg-white/10" />

              <div className="text-center px-2">
                <div className="text-3xl font-extrabold text-emerald-400 tabular-nums drop-shadow-[0_0_10px_rgba(52,211,153,0.3)]">{deployedTeams.length}</div>
                <div className="text-[10px] text-emerald-400/60 uppercase font-bold tracking-widest mt-1">Deployed</div>
              </div>

              <div className="h-10 w-px bg-white/10" />

              <div className="text-center px-2">
                <div className="text-3xl font-extrabold text-rose-400 tabular-nums drop-shadow-[0_0_10px_rgba(244,63,94,0.3)]">{notDeployedTeams.length}</div>
                <div className="text-[10px] text-rose-400/60 uppercase font-bold tracking-widest mt-1">Unavailable</div>
              </div>
            </div>

            {/* Visual Ratio Bar */}
            <div className="w-full sm:w-48 h-2.5 rounded-full bg-slate-800 flex overflow-hidden border border-white/5">
              <div 
                className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(52,211,153,0.8)] transition-all duration-1000"
                style={{ width: `${teams.length > 0 ? (deployedTeams.length / teams.length) * 100 : 0}%` }}
              />
              <div 
                className="h-full bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.8)] transition-all duration-1000"
                style={{ width: `${teams.length > 0 ? (notDeployedTeams.length / teams.length) * 100 : 0}%` }}
              />
            </div>
          </div>
        </header>

        {/* Section A: Deployed */}
        <section className="mb-20">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-emerald-400 flex items-center gap-3">
              <MonitorPlay className="w-6 h-6" />
              Live Projects
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {deployedTeams.map((team, index) => {
              const isTop10 = index < 10;
              return (
                <div 
                  key={team.id}
                  className={cn(
                    "flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 rounded-2xl border backdrop-blur-sm transition-all hover:bg-slate-900/80 gap-4",
                    isTop10 ? "border-emerald-500/30 bg-emerald-500/5 shadow-[0_0_30px_rgba(16,185,129,0.05)]" : "border-white/5 bg-slate-900/40"
                  )}
                >
                  <div className="flex items-center gap-4">
                    {/* Rank Indicator */}
                    <div className={cn(
                      "flex items-center justify-center w-10 h-10 rounded-xl font-bold text-lg",
                      isTop10 ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "bg-slate-800 text-slate-500"
                    )}>
                      #{index + 1}
                    </div>

                    <div>
                      <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        {team.team_name}
                        {index === 0 && <CrownIcon className="w-5 h-5 text-yellow-400" />}
                      </h3>
                      <div className="flex items-center gap-3 text-sm mt-1">
                        <span className="flex items-center gap-1.5 text-cyan-400">
                          <Activity className="w-4 h-4" /> Score: {team.score}
                        </span>
                        <span className="text-slate-600">•</span>
                        {team.deployment_status === "slow" && (
                          <span className="text-amber-400 text-xs px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20">
                            Slow Load Time
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <Link 
                      href={team.repo_url} 
                      target="_blank" 
                      className="flex-1 sm:flex-none flex items-center justify-center p-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-white/5"
                    >
                      <Github className="w-5 h-5" />
                    </Link>
                    <Link 
                      href={team.deployment_url || "#"} 
                      target="_blank" 
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-white transition-all bg-emerald-600 hover:bg-emerald-500 shadow-[0_4px_20px_rgba(16,185,129,0.3)] hover:shadow-[0_4px_25px_rgba(16,185,129,0.5)]"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Open App
                    </Link>
                  </div>
                </div>
              );
            })}
            
            {deployedTeams.length === 0 && (
              <div className="col-span-1 lg:col-span-2 p-12 text-center rounded-3xl border border-dashed border-white/10 bg-slate-900/20">
                <p className="text-slate-500 text-lg">No live deployments currently available for review.</p>
              </div>
            )}
          </div>
        </section>

        {/* Section B: Not Deployed */}
        {notDeployedTeams.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold text-rose-400 flex items-center gap-3 mb-8">
              <AlertTriangle className="w-6 h-6" />
              Unavailable Projects
              <span className="text-sm font-normal text-slate-500 ml-4">(Down or Not Deployed)</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {notDeployedTeams.map((team) => (
                <div 
                  key={team.id}
                  className="flex items-center justify-between p-4 rounded-xl border border-rose-500/10 bg-slate-900/40 opacity-70 hover:opacity-100 transition-opacity"
                >
                  <div className="truncate pr-4">
                    <h3 className="text-lg font-bold text-slate-300 truncate">{team.team_name}</h3>
                    <div className="text-xs text-rose-400/80 font-mono mt-1 uppercase tracking-wider">
                      {team.deployment_status === "down" ? "Site Down" : "No Deployment"}
                    </div>
                  </div>
                  <Link 
                    href={team.repo_url} 
                    target="_blank" 
                    className="flex shrink-0 items-center justify-center p-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors border border-white/5"
                  >
                    <Github className="w-4 h-4" />
                  </Link>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Section C: Disqualified Teams */}
        {disqualifiedTeams.length > 0 && (
          <section className="mt-20">
            <h2 className="text-2xl font-bold text-rose-500 flex items-center gap-3 mb-8">
              <Ban className="w-6 h-6" />
              Disqualified Teams
              <span className="text-sm font-normal text-slate-500 ml-4">({disqualifiedTeams.length} teams)</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {disqualifiedTeams.map((team: any) => (
                <div 
                  key={team.id}
                  className="flex flex-col p-4 rounded-xl border border-rose-500/20 bg-rose-950/20 opacity-60 hover:opacity-90 transition-opacity"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-bold text-rose-300 truncate pr-4">{team.team_name}</h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30 whitespace-nowrap">DISQUALIFIED</span>
                  </div>
                  <Link 
                    href={team.repo_url} 
                    target="_blank" 
                    className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors mt-auto"
                  >
                    <Github className="w-3 h-3" /> View Source
                  </Link>
                </div>
              ))}
            </div>
          </section>
        )}

      </main>
    </div>
  );
}

function CrownIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14" />
    </svg>
  );
}
