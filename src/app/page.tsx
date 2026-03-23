"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Activity, Code, ShieldCheck, Github, AlertCircle, Terminal, Zap, Flag, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] }
  })
};

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
    <main className="min-h-screen bg-[#0a0a0a] text-slate-50 flex flex-col items-center py-24 px-4 selection:bg-orange-500/30 overflow-x-hidden font-sans relative">
      {/* Animated Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-10%,rgba(251,146,60,0.12),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_100%,rgba(6,182,212,0.06),transparent_50%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:60px_60px] [mask-image:radial-gradient(ellipse_70%_70%_at_50%_50%,#000_60%,transparent_100%)]" />
      </div>

      {/* HERO SECTION */}
      <motion.div 
        initial="hidden" animate="visible"
        className="relative z-10 max-w-5xl w-full text-center space-y-8 mb-28"
      >
        <motion.div custom={0} variants={fadeUp} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-bold uppercase tracking-[0.2em]">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
          </span>
          Live Event Monitoring
        </motion.div>

        <motion.h1 custom={1} variants={fadeUp} className="text-6xl md:text-9xl font-black tracking-tighter bg-gradient-to-b from-white via-orange-100 to-orange-500/60 bg-clip-text text-transparent leading-[0.9]">
          HackArena
        </motion.h1>
        <motion.p custom={2} variants={fadeUp} className="text-base md:text-xl text-slate-400 max-w-2xl mx-auto font-medium leading-relaxed">
          Enforcing discipline, tracking real-time activity, and managing submissions for an elevated, professional hackathon experience.
        </motion.p>
        
        <motion.div custom={3} variants={fadeUp} className="flex flex-wrap items-center justify-center gap-4 pt-8">
          <Button 
            onClick={() => window.location.href = '/register'} 
            disabled={regLocked || fetchingLocks}
            size="lg" 
            className={cn("font-bold px-8 transition-all duration-300 cursor-pointer", regLocked ? "bg-rose-950/40 text-rose-400 border border-rose-500/20 shadow-none cursor-not-allowed" : "bg-gradient-to-r from-orange-500 to-amber-400 text-black hover:shadow-[0_0_30px_rgba(251,146,60,0.4)] hover:scale-[1.03]")}
          >
            {regLocked ? <><Lock className="w-4 h-4 mr-2" /> Registration Closed</> : "Register for Event"}
          </Button>

          <Button 
            onClick={() => window.location.href = '/submit'} 
            disabled={subLocked || fetchingLocks}
            size="lg" 
            className={cn("font-bold px-8 transition-all duration-300 cursor-pointer", subLocked ? "bg-rose-950/40 text-rose-400 border border-rose-500/20 shadow-none cursor-not-allowed" : "bg-cyan-600 hover:bg-cyan-500 text-white shadow-[0_0_20px_rgba(6,182,212,0.2)] hover:scale-[1.03]")}
          >
            {subLocked ? <><Lock className="w-4 h-4 mr-2" /> Submissions Closed</> : "Final Submission Portal"}
          </Button>

          <Button 
            onClick={() => window.location.href = '/verify'} 
            size="lg" 
            variant="outline" 
            className="border-emerald-500/30 text-emerald-400 bg-emerald-500/5 hover:bg-emerald-500/15 hover:text-emerald-300 font-bold transition-all duration-300 px-8 cursor-pointer hover:scale-[1.03]"
          >
            <ShieldCheck className="w-4 h-4 mr-2" /> Test Repo Sync
          </Button>

          <Button 
            onClick={() => window.location.href = '/status'} 
            size="lg" 
            variant="outline" 
            className="border-orange-500/20 text-orange-400 bg-orange-500/5 hover:bg-orange-500/15 hover:text-orange-300 font-bold transition-all duration-300 px-8 cursor-pointer hover:scale-[1.03]"
          >
            <Activity className="w-4 h-4 mr-2" /> Team Dashboard
          </Button>

          <Button onClick={() => window.location.href = '/admin'} size="lg" variant="outline" className="border-white/10 bg-white/[0.03] hover:bg-white/[0.08] text-slate-400 hover:text-white transition-all duration-300 cursor-pointer">
            Admin Panel
          </Button>
        </motion.div>
      </motion.div>

      {/* RULES & REGULATIONS SECTION */}
      <motion.div 
        initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-5xl mb-28"
      >
        <div className="text-center mb-14">
          <h2 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-orange-400 via-amber-300 to-orange-500 bg-clip-text text-transparent">
            Event Rules & Regulations
          </h2>
          <p className="text-slate-500 mt-5 max-w-2xl mx-auto font-medium">
            Failure to comply with the HackArena tracking algorithms will result in automated strikes or immediate disqualification.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <RuleCard 
            icon={<Terminal className="w-8 h-8 text-cyan-400" />}
            title="1. Continuous Commits"
            desc="All development must be tracked incrementally. Dumping code in a single massive commit at the end is strictly prohibited and leads to immediate manual disqualification."
            glow="rgba(6,182,212,0.15)"
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
      </motion.div>

      {/* HOW IT WORKS */}
      <motion.div 
        initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-5xl mb-24"
      >
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-black text-white mb-3">How it works</h2>
          <p className="text-slate-500 font-medium">The technical details of the HackArena architecture.</p>
        </div>
        
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <FeatureItem
            icon={<Github className="w-6 h-6 text-slate-200" />}
            title="Repository Tracking"
            desc="We strictly monitor your linked public GitHub repository for commits."
          />
          <FeatureItem
            icon={<Activity className="w-6 h-6 text-orange-400" />}
            title="Hourly Activity Checks"
            desc="Push code within 60 minutes to stay active. Over 120 minutes leads to strikes."
          />
          <FeatureItem
            icon={<ShieldCheck className="w-6 h-6 text-rose-400" />}
            title="Anti-Cheat & Strikes"
            desc="Accumulate 3 strikes and your team is automatically disqualified."
          />
          <FeatureItem
            icon={<Code className="w-6 h-6 text-emerald-400" />}
            title="Final Submission"
            desc="Deploy your app and submit the link before time runs out."
          />
        </div>
      </motion.div>

      {/* Footer Attribution */}
      <footer className="relative z-10 mt-24 w-full text-center pb-6">
        <div className="h-px w-full max-w-xs mx-auto bg-gradient-to-r from-transparent via-orange-500/20 to-transparent mb-4" />
        <p className="text-[11px] text-slate-600 font-medium tracking-wide">
          System Designed &amp; Developed by <span className="text-slate-400">Shreyas Ugargol</span>
        </p>
      </footer>

    </main>
  );
}

function RuleCard({ icon, title, desc, glow, className }: any) {
  return (
    <motion.div 
      whileHover={{ y: -6, transition: { duration: 0.3 } }}
      className={cn("group relative overflow-hidden rounded-2xl bg-white/[0.03] border border-white/[0.06] p-8 backdrop-blur-xl transition-all duration-500 hover:border-orange-500/20 hover:shadow-[0_8px_40px_rgba(251,146,60,0.08)] cursor-pointer", className)}
    >
      <div 
        className="absolute -inset-px opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-2xl pointer-events-none"
        style={{ background: `radial-gradient(circle at 50% 100%, ${glow}, transparent 70%)` }}
      />
      {/* Top accent line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-orange-500/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="relative z-10 flex flex-col h-full">
        <div className="mb-6 inline-flex p-4 rounded-2xl bg-white/[0.04] border border-white/[0.06] w-max">
          {icon}
        </div>
        <h3 className="text-xl font-bold text-white mb-3">{title}</h3>
        <p className="text-slate-400 text-sm leading-relaxed font-medium mt-auto">{desc}</p>
      </div>
    </motion.div>
  )
}

function FeatureItem({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <motion.div 
      whileHover={{ y: -4 }}
      className="flex flex-col gap-4 items-center text-center bg-white/[0.03] p-7 rounded-2xl border border-white/[0.06] backdrop-blur-xl transition-all duration-300 hover:bg-white/[0.05] hover:border-orange-500/15 cursor-pointer"
    >
      <div className="p-3.5 bg-white/[0.04] rounded-xl border border-white/[0.06]">{icon}</div>
      <div>
        <h4 className="font-bold text-white mb-1.5">{title}</h4>
        <p className="text-sm text-slate-500 leading-relaxed font-medium">{desc}</p>
      </div>
    </motion.div>
  );
}
