"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Activity, Code, ShieldCheck, Github, AlertCircle, Terminal, Zap, Flag, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Home() {
  const [regLocked, setRegLocked] = useState(false);
  const [subLocked, setSubLocked] = useState(false);
  const [fetchingLocks, setFetchingLocks] = useState(true);

  useEffect(() => {
    async function fetchLocks() {
      try {
        const [regRes, subRes] = await Promise.all([
          fetch("/api/registration-lock"),
          fetch("/api/settings")
        ]);
        if (regRes.ok) setRegLocked((await regRes.json()).registration_locked);
        if (subRes.ok) setSubLocked((await subRes.json()).submissions_locked);
      } catch (err) {
        console.error(err);
      } finally {
        setFetchingLocks(false);
      }
    }
    fetchLocks();
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 flex flex-col items-center py-20 px-4 selection:bg-cyan-500/30 overflow-x-hidden font-sans">
      {/* Deep Cyberpunk / Neon Background Overlay */}
      <div className="fixed inset-0 z-0 pointer-events-none bg-[radial-gradient(circle_at_50%_0%,rgba(6,182,212,0.08),transparent_50%),radial-gradient(circle_at_80%_100%,rgba(147,51,234,0.08),transparent_50%)]" />

      {/* HERO SECTION */}
      <div className="relative z-10 max-w-5xl w-full text-center space-y-8 mb-20 animate-in fade-in slide-in-from-bottom-5 duration-700">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-bold uppercase tracking-widest mb-4">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
          </span>
          Live Event Monitoring
        </div>
        <h1 className="text-5xl md:text-8xl font-black tracking-tighter bg-gradient-to-br from-white via-slate-200 to-slate-500 bg-clip-text text-transparent drop-shadow-sm">
          HackArena System
        </h1>
        <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto font-medium leading-relaxed">
          Enforcing discipline, tracking real-time activity, and managing submissions for an elevated, professional hackathon experience.
        </p>
        
        <div className="flex flex-wrap items-center justify-center gap-4 pt-6">
          <Button 
            onClick={() => window.location.href = '/register'} 
            disabled={regLocked || fetchingLocks}
            size="lg" 
            className={cn("font-bold px-8 transition-all", regLocked ? "bg-rose-950/40 text-rose-400 border border-rose-500/20 shadow-none cursor-not-allowed" : "bg-white text-slate-950 hover:bg-slate-200 shadow-[0_0_20px_rgba(255,255,255,0.15)]")}
          >
            {regLocked ? <><Lock className="w-4 h-4 mr-2" /> Registration Closed</> : "Register for Event"}
          </Button>

          <Button 
            onClick={() => window.location.href = '/submit'} 
            disabled={subLocked || fetchingLocks}
            size="lg" 
            className={cn("font-bold px-8 transition-all", subLocked ? "bg-rose-950/40 text-rose-400 border border-rose-500/20 shadow-none cursor-not-allowed" : "bg-cyan-600 hover:bg-cyan-500 text-white shadow-[0_0_20px_rgba(6,182,212,0.2)]")}
          >
            {subLocked ? <><Lock className="w-4 h-4 mr-2" /> Submissions Closed</> : "Final Submission Portal"}
          </Button>

          <Button onClick={() => window.location.href = '/admin'} size="lg" variant="outline" className="border-white/10 bg-slate-900/50 hover:bg-slate-800 text-slate-300">
            Admin Panel
          </Button>
        </div>
      </div>

      {/* RULES & REGULATIONS SECTION */}
      <div className="relative z-10 w-full max-w-5xl mb-24">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-red-400 via-rose-300 to-orange-400 bg-clip-text text-transparent drop-shadow-sm">
            Event Rules & Regulations
          </h2>
          <p className="text-slate-400 mt-4 max-w-2xl mx-auto font-medium">
            Failure to comply with the HackArena tracking algorithms will result in automated strikes or immediate disqualification.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <RuleCard 
            icon={<Terminal className="w-8 h-8 text-cyan-400" />}
            title="1. Continuous Commits"
            desc="All development must be tracked incrementally. Dumping code in a single massive commit at the end is strictly prohibited and leads to immediate manual disqualification."
            glow="rgba(34,211,238,0.15)"
          />
          <RuleCard 
            icon={<Zap className="w-8 h-8 text-amber-400" />}
            title="2. The Strike System"
            desc="The master system scans your repository every hour. If no new commits are detected within 120 minutes, your team receives an automated inactivity Strike."
            glow="rgba(251,191,36,0.15)"
          />
          <RuleCard 
            icon={<AlertCircle className="w-8 h-8 text-rose-500" />}
            title="3. Three Strikes = Out"
            desc="Accumulating 3 inactive strikes results in an automated, irreversible disqualification from the event. Keep coding to stay alive."
            glow="rgba(244,63,94,0.15)"
          />
          <RuleCard 
            className="md:col-span-3"
            icon={<Flag className="w-8 h-8 text-emerald-400" />}
            title="4. Final Deployment Submission"
            desc="You must deploy your project to a live URL (Vercel, Render, Firebase, etc.) and submit the link via the Final Submission portal before the countdown ends. Localhost links are not accepted and will not be judged."
            glow="rgba(52,211,153,0.1)"
          />
        </div>
      </div>

      {/* HOW IT WORKS */}
      <div className="relative z-10 w-full max-w-5xl mb-20">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-white mb-2">How it works</h2>
          <p className="text-slate-400 font-medium">The technical details of the HackArena architecture.</p>
        </div>
        
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <FeatureItem
            icon={<Github className="w-6 h-6 text-slate-200" />}
            title="Repository Tracking"
            desc="We strictly monitor your linked public GitHub repository for commits."
          />
          <FeatureItem
            icon={<Activity className="w-6 h-6 text-amber-500" />}
            title="Hourly Activity Checks"
            desc="Push code within 60 minutes to stay active. Over 120 minutes leads to strikes."
          />
          <FeatureItem
            icon={<ShieldCheck className="w-6 h-6 text-rose-500" />}
            title="Anti-Cheat & Strikes"
            desc="Accumulate 3 strikes and your team is automatically disqualified."
          />
          <FeatureItem
            icon={<Code className="w-6 h-6 text-emerald-500" />}
            title="Final Submission"
            desc="Deploy your app and submit the link before time runs out."
          />
        </div>
      </div>

      {/* Footer Attribution */}
      <footer className="relative z-10 mt-24 w-full text-center pb-6">
        <div className="h-px w-full max-w-xs mx-auto bg-gradient-to-r from-transparent via-white/10 to-transparent mb-4" />
        <p className="text-[11px] text-slate-500/60 font-medium tracking-wide">
          System Designed &amp; Developed by <span className="text-slate-400/70">Shreyas Ugargol</span>
        </p>
      </footer>

    </main>
  );
}

function RuleCard({ icon, title, desc, glow, className }: any) {
  return (
    <div className={cn("group relative overflow-hidden rounded-[2rem] bg-slate-900/40 border border-white/5 p-8 backdrop-blur-md transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:border-white/10", className)}>
      <div 
        className="absolute -inset-px opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl ease-out pointer-events-none"
        style={{ background: `radial-gradient(circle at 50% 100%, ${glow}, transparent 70%)` }}
      />
      <div className="relative z-10 flex flex-col h-full">
        <div className="mb-6 inline-flex p-4 rounded-2xl bg-slate-950/50 border border-white/5 shadow-inner w-max">
          {icon}
        </div>
        <h3 className="text-xl font-bold text-white mb-3">{title}</h3>
        <p className="text-slate-400 text-sm leading-relaxed font-medium mt-auto">{desc}</p>
      </div>
    </div>
  )
}

function FeatureItem({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex flex-col gap-4 items-center text-center bg-slate-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-sm transition-colors hover:bg-slate-800/50">
      <div className="p-3 bg-slate-950/50 rounded-xl border border-white/5 shadow-inner">{icon}</div>
      <div>
        <h4 className="font-bold text-slate-200 mb-1">{title}</h4>
        <p className="text-sm text-slate-400 leading-relaxed font-medium">{desc}</p>
      </div>
    </div>
  );
}
