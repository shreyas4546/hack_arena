"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import { Activity, Code, ShieldCheck, Github, AlertCircle, Terminal, Zap, Flag, Lock, Trophy, HeartPulse } from "lucide-react";
import { cn } from "@/lib/utils";
import PremiumCard from "@/components/PremiumCard";
import CursorTrail from "@/components/CursorTrail";
import BackgroundBeams from "@/components/BackgroundBeams";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.7, ease: [0.23, 1, 0.32, 1] as [number, number, number, number] }
  })
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } }
};

export default function Home() {
  const [regLocked, setRegLocked] = useState(false);
  const [subLocked, setSubLocked] = useState(false);
  const [fetchingLocks, setFetchingLocks] = useState(true);
  const reflectionRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    async function fetchLocks() {
      try {
        const [regRes, subRes] = await Promise.all([
          fetch("/api/registration-lock"),
          fetch("/api/settings")
        ]);
        if (regRes.ok) setRegLocked((await regRes.json()).registration_locked);
        if (subRes.ok) {
          const settings = await subRes.json();
          setSubLocked(settings.submissions_locked);
        } else {
          console.error("Failed to fetch settings:", subRes.status);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setFetchingLocks(false);
      }
    }
    fetchLocks();
  }, []);

  useEffect(() => {
    // Custom mouse tracking for the cinematic hero text reflection
    if (typeof window === "undefined" || window.matchMedia("(hover: none)").matches) return;

    let ticking = false;
    const handlePointerMove = (e: PointerEvent) => {
      if (!ticking) {
        requestAnimationFrame(() => {
          if (reflectionRef.current) {
            reflectionRef.current.style.setProperty("--mouse-x", `${e.clientX}px`);
            reflectionRef.current.style.setProperty("--mouse-y", `${e.clientY}px`);
          }
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener("pointermove", handlePointerMove);
    return () => window.removeEventListener("pointermove", handlePointerMove);
  }, []);

  return (
    <>
    <Navbar />
    <CursorTrail />
    <main className="noise-overlay min-h-screen bg-gradient-to-b from-[#050505] via-[#0a0a0a] to-[#050505] text-slate-50 flex flex-col items-center pt-36 pb-32 px-4 selection:bg-orange-500/30 overflow-x-hidden font-sans relative">
      {/* Ambient Background — Deeper layered gradients */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-15%,rgba(251,146,60,0.12),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_85%_100%,rgba(6,182,212,0.05),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_50%_at_15%_55%,rgba(251,146,60,0.04),transparent_40%)]" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-orange-500/[0.03] rounded-full blur-[160px] animate-ambient-pulse" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.012)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.012)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_40%,#000_50%,transparent_100%)]" />
      </div>

      {/* BEAMS BACKGROUND + OVERLAYS */}
      <div className="absolute top-0 inset-x-0 h-[100vh] z-0 pointer-events-none overflow-hidden">
        <BackgroundBeams />
        {/* Dark overlay to reduce brightness and ensure text is readable */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/50 to-black/60" />
        {/* Soft fade out at bottom to smoothly blend into the rest of the page */}
        <div className="absolute inset-x-0 bottom-0 h-[40vh] bg-gradient-to-t from-[#050505] via-[#050505]/50 to-transparent" />
      </div>

      {/* HERO SECTION */}
      <motion.div 
        initial="hidden" animate="visible"
        className="relative z-10 max-w-5xl w-full text-center mb-40 flex flex-col items-center"
      >
        <motion.div custom={0} variants={fadeUp} className="inline-flex items-center gap-2.5 px-5 py-2 rounded-full bg-orange-500/8 border border-orange-500/15 text-orange-400 text-[11px] font-bold uppercase tracking-[0.2em] mb-4">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
          </span>
          Live Event Monitoring
        </motion.div>


        <motion.div custom={1} variants={fadeUp} className="relative z-10 w-full flex flex-col items-center mt-2 pb-2 group">
          {/* Subtle radial glow behind the text for background interaction */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] md:w-[600px] h-[150px] md:h-[250px] bg-orange-500/10 blur-[80px] rounded-full pointer-events-none transition-opacity duration-700 opacity-50 group-hover:opacity-100" />
          
          <h1 className="relative text-7xl sm:text-8xl md:text-[10rem] font-black tracking-[-0.04em] leading-[0.85] w-full text-center">
            
            {/* Layer 2: The Cinematic Depth Layer (Blur) */}
            <span className="absolute inset-x-0 top-0 translate-y-3 blur-xl opacity-40 bg-gradient-to-b from-neutral-100 via-neutral-300 to-neutral-500 bg-clip-text text-transparent select-none z-0">
              HackArena
            </span>
            
            {/* Layer 1: The Sharp Light-Sweeping Foreground Layer */}
            <span className="relative z-10 inline-block text-transparent bg-clip-text bg-[linear-gradient(110deg,#f5f5f5,45%,#ffffff,55%,#737373)] bg-[length:250%_100%] animate-text-sweep drop-shadow-[0_0_15px_rgba(255,255,255,0.05)]">
              HackArena
            </span>

            {/* Layer 3: Interactive Mouse Light Reflection */}
            <span 
              ref={reflectionRef}
              className="absolute inset-x-0 top-0 z-20 text-transparent bg-clip-text pointer-events-none hidden md:inline-block opacity-0 group-hover:opacity-100 transition-opacity duration-500"
              style={{
                backgroundImage: "radial-gradient(circle 200px at var(--mouse-x, 50vw) var(--mouse-y, 50vh), rgba(255,255,255,0.9), rgba(251,146,60,0.2) 40%, transparent 60%)",
                backgroundAttachment: "fixed"
              }}
              aria-hidden="true"
            >
              HackArena
            </span>

            {/* Powerful Highlight "2K26" */}
            <span className="block text-5xl sm:text-6xl md:text-7xl mt-4 md:mt-6 bg-gradient-to-br from-amber-400 to-orange-500 bg-clip-text text-transparent tracking-[-0.02em] drop-shadow-[0_0_20px_rgba(249,115,22,0.25)] hover:scale-[1.03] hover:drop-shadow-[0_0_40px_rgba(249,115,22,0.4)] transition-all duration-700 mx-auto w-fit">
              2K26
            </span>
          </h1>
        </motion.div>

        <motion.p custom={1.5} variants={fadeUp} className="text-xl sm:text-2xl md:text-3xl font-extrabold uppercase tracking-[0.3em] text-neutral-400 mt-12 md:mt-16 opacity-90">
          Code. Compete. Conquer.
        </motion.p>
        
        <motion.p custom={2} variants={fadeUp} className="text-base md:text-lg text-neutral-500 max-w-2xl mx-auto font-medium leading-relaxed mt-5">
          Enforcing discipline, tracking real-time activity, and managing submissions for an elevated, professional hackathon experience.
        </motion.p>
        
        <motion.div custom={3} variants={fadeUp} className="flex flex-wrap items-center justify-center gap-5 mt-10">
          <Button 
            onClick={() => window.location.href = '/register'} 
            disabled={regLocked || fetchingLocks}
            size="lg" 
            className={cn("font-bold px-10 py-6 text-base transition-all duration-400 cursor-pointer rounded-xl", regLocked ? "bg-rose-950/40 text-rose-400 border border-rose-500/20 shadow-none cursor-not-allowed" : "bg-gradient-to-r from-orange-500 to-amber-400 text-black hover:shadow-[0_0_40px_rgba(251,146,60,0.35)] hover:scale-[1.03]")}
          >
            {regLocked ? <><Lock className="w-4 h-4 mr-2" /> Registration Closed</> : "Register for Event"}
          </Button>

          <Button 
            onClick={() => window.location.href = '/submit'} 
            disabled={subLocked || fetchingLocks}
            size="lg" 
            className={cn("font-bold px-10 py-6 text-base transition-all duration-400 cursor-pointer rounded-xl", subLocked ? "bg-rose-950/40 text-rose-400 border border-rose-500/20 shadow-none cursor-not-allowed" : "bg-cyan-600 hover:bg-cyan-500 text-white shadow-[0_0_25px_rgba(6,182,212,0.15)] hover:shadow-[0_0_35px_rgba(6,182,212,0.3)] hover:scale-[1.03]")}
          >
            {subLocked ? <><Lock className="w-4 h-4 mr-2" /> Submissions Closed</> : "Final Submission Portal"}
          </Button>
        </motion.div>
      </motion.div>

      {/* RULES & REGULATIONS SECTION */}
      <motion.div 
        id="rules"
        initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.7, ease: [0.23, 1, 0.32, 1] }}
        className="relative z-10 w-full max-w-5xl mb-36 pt-20 mt-[-80px]"
      >
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-black bg-gradient-to-r from-orange-400 via-amber-300 to-orange-500 bg-clip-text text-transparent pb-3">
            Event Rules & Regulations
          </h2>
          <p className="text-slate-500 mt-6 max-w-2xl mx-auto font-medium text-base">
            Failure to comply with the HackArena tracking algorithms will result in automated strikes or immediate disqualification.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          <RuleCard 
            icon={<Terminal className="w-7 h-7 text-cyan-400" />}
            title="1. Continuous Commits"
            desc="All development must be tracked incrementally. Dumping code in a single massive commit at the end is strictly prohibited and leads to immediate manual disqualification."
            glow="rgba(6,182,212,0.12)"
          />
          <RuleCard 
            icon={<Zap className="w-7 h-7 text-amber-400" />}
            title="2. The Strike System"
            desc="The master system assigns 1 inactivity strike for every 60 full minutes without a GitHub push. See the detailed breakdown below."
            glow="rgba(251,191,36,0.12)"
          />
          <RuleCard 
            icon={<AlertCircle className="w-7 h-7 text-rose-500" />}
            title="3. Three Strikes = Out"
            desc="Accumulating 3 inactive strikes flags your team for disqualification review. Push code to erase strikes and restore your stability score."
            glow="rgba(244,63,94,0.12)"
          />
          <RuleCard 
            className="md:col-span-3"
            icon={<Flag className="w-7 h-7 text-emerald-400" />}
            title="4. Final Deployment Submission"
            desc="You must deploy your project to a live URL (Vercel, Render, Firebase, etc.) and submit the link via the Final Submission portal before the countdown ends. Localhost links are not accepted and will not be judged."
            glow="rgba(52,211,153,0.08)"
          />
        </div>

        {/* STRIKE SYSTEM EXPLAINER */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7, delay: 0.2, ease: [0.23, 1, 0.32, 1] }}
          className="mt-8 rounded-3xl relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-orange-500/[0.04] rounded-full blur-[120px] pointer-events-none -mr-24 -mt-24" />
          
          <div className="flex items-center gap-4 mb-12 relative z-10">
            <div className="p-3.5 bg-orange-500/10 rounded-2xl border border-orange-500/15">
              <Activity className="w-6 h-6 text-orange-400" />
            </div>
            <h3 className="text-2xl md:text-3xl font-black text-white tracking-tight">Core Mechanic: The Strike System</h3>
          </div>

          <div className="grid md:grid-cols-2 gap-12 relative z-10">
            <div className="space-y-10">
              <div>
                <h4 className="text-lg font-bold text-slate-200 mb-3 flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.6)]"></span>
                  0-59 Minutes (0 Strikes)
                </h4>
                <p className="text-sm text-slate-400 leading-relaxed pl-6">Status is <span className="text-emerald-400 font-bold tracking-wide">ACTIVE</span>. Your team is coding consistently and retains a 100% Stability Score.</p>
              </div>
              
              <div>
                <h4 className="text-lg font-bold text-slate-200 mb-3 flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.6)]"></span>
                  60-179 Minutes (1-2 Strikes)
                </h4>
                <p className="text-sm text-slate-400 leading-relaxed pl-6">Status drops to <span className="text-amber-400 font-bold tracking-wide">WARNING</span>. 1 strike is assigned at 60 mins, and a 2nd at 120 mins. Your Stability Score drops significantly (down to 20%).</p>
              </div>

              <div>
                <h4 className="text-lg font-bold text-slate-200 mb-3 flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.6)]"></span>
                  180+ Minutes (3+ Strikes)
                </h4>
                <p className="text-sm text-slate-400 leading-relaxed pl-6">Status falls to <span className="text-rose-400 font-bold tracking-wide">INACTIVE</span>. The system sends an automated alert to the judges flagging your team for disqualification review.</p>
              </div>
            </div>

            <PremiumCard glowColor="rgba(6,182,212,0.08)" className="p-8 flex flex-col justify-center relative overflow-hidden h-full" noLift>
              <div className="absolute top-0 right-0 w-40 h-40 bg-cyan-500/8 rounded-full blur-[60px] pointer-events-none" />
              <h4 className="text-xl font-black text-cyan-400 mb-5 flex items-center gap-3 relative z-10 tracking-tight">
                <Zap className="w-5 h-5" /> The Forgiveness Reset
              </h4>
              <p className="text-sm text-slate-300 leading-relaxed mb-7 font-medium relative z-10">
                The strike system is perfectly automated and entirely forgiving. It purely calculates the time since your <strong className="text-white">latest valid positive GitHub push</strong>.
              </p>
              <div className="inline-flex items-start md:items-center gap-4 p-5 rounded-xl bg-cyan-500/8 border border-cyan-500/15 text-sm font-medium text-cyan-200 relative z-10 shadow-[0_0_30px_rgba(6,182,212,0.08)]">
                <Github className="w-6 h-6 text-cyan-400 shrink-0 mt-0.5 md:mt-0" />
                <span className="leading-relaxed">Pushing genuine code instantly resets your inactivity timer to 0 minutes, clearing all strikes immediately.</span>
              </div>
            </PremiumCard>
          </div>
        </motion.div>

        {/* SCORING SYSTEM EXPLAINER */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7, delay: 0.3, ease: [0.23, 1, 0.32, 1] }}
          className="mt-8 rounded-3xl relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-cyan-500/[0.03] rounded-full blur-[120px] pointer-events-none -mr-24 -mt-24" />
          
          <div className="flex items-center gap-4 mb-12 relative z-10">
            <div className="p-3.5 bg-cyan-500/10 rounded-2xl border border-cyan-500/15">
              <Trophy className="w-6 h-6 text-cyan-400" />
            </div>
            <h3 className="text-2xl md:text-3xl font-black text-white tracking-tight">Engine Evaluation Score</h3>
          </div>

          <p className="text-slate-400 max-w-3xl leading-relaxed mb-10 relative z-10 text-base">
            The HackArena master server constantly calculates a precise <strong className="text-white">0.0 to 10.0</strong> technical health score for your team. This score is updated in real-time on your dashboard and provides judges with objective technical data.
          </p>

          <div className="grid md:grid-cols-3 gap-5 relative z-10">
            <PremiumCard glowColor="rgba(251,146,60,0.1)" className="p-7">
              <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2.5 group-hover:translate-y-[-2px] transition-transform duration-300">
                <Github className="w-5 h-5 text-orange-400 group-hover:scale-110 transition-transform duration-300" /> Activity (40%)
              </h4>
              <p className="text-sm text-slate-400 leading-relaxed mb-4 group-hover:text-slate-300 transition-colors duration-300">Scores how recently you have pushed code. It degrades linearly over 24 hours.</p>
              <div className="text-xs font-bold px-3 py-1.5 bg-orange-500/10 text-orange-300 rounded-lg max-w-fit tracking-wide">Push code to lock at 100%</div>
            </PremiumCard>

            <PremiumCard glowColor="rgba(52,211,153,0.1)" className="p-7">
              <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2.5 group-hover:translate-y-[-2px] transition-transform duration-300">
                <HeartPulse className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform duration-300" /> Deployment (40%)
              </h4>
              <p className="text-sm text-slate-400 leading-relaxed mb-4 group-hover:text-slate-300 transition-colors duration-300">Scores your live link presence. 100% if the site resolves rapidly, 50% if slow, 0% if down or missing.</p>
              <div className="text-xs font-bold px-3 py-1.5 bg-emerald-500/10 text-emerald-300 rounded-lg max-w-fit tracking-wide">Submit a working live link</div>
            </PremiumCard>

            <PremiumCard glowColor="rgba(129,140,248,0.1)" className="p-7">
              <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2.5 group-hover:translate-y-[-2px] transition-transform duration-300">
                <ShieldCheck className="w-5 h-5 text-indigo-400 group-hover:scale-110 transition-transform duration-300" /> Stability (20%)
              </h4>
              <p className="text-sm text-slate-400 leading-relaxed mb-4 group-hover:text-slate-300 transition-colors duration-300">Tied directly to your Strike Count. 0 strikes = 100%, 1 strike = 50%, 2 strikes = 20%, 3+ strikes = 0%.</p>
              <div className="text-xs font-bold px-3 py-1.5 bg-indigo-500/10 text-indigo-300 rounded-lg max-w-fit tracking-wide">Keep strikes at 0</div>
            </PremiumCard>
          </div>
        </motion.div>
      </motion.div>

      {/* HOW IT WORKS */}
      <motion.div 
        id="how-it-works"
        initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.7, ease: [0.23, 1, 0.32, 1] }}
        className="relative z-10 w-full max-w-5xl mb-28 pt-20 mt-[-80px]"
      >
        <div className="text-center mb-14">
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-black text-white mb-4 tracking-tight">How it works</h2>
          <p className="text-slate-500 font-medium text-lg">The technical details of the HackArena architecture.</p>
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
      <footer className="relative z-10 mt-32 w-full text-center pb-10">
        <div className="h-px w-full max-w-xs mx-auto bg-gradient-to-r from-transparent via-orange-500/25 to-transparent mb-6" />
        <p className="text-xs text-slate-600 font-medium tracking-wider">
          System Designed &amp; Developed by <span className="text-orange-400/70">Shreyas Ugargol</span>
        </p>
      </footer>

    </main>
    </>
  );
}

function RuleCard({ icon, title, desc, glow, className }: any) {
  return (
    <PremiumCard
      glowColor={glow}
      className={cn("p-8 cursor-pointer", className)}
    >
      <div className="flex flex-col h-full">
        <div className="mb-7 inline-flex p-4 rounded-2xl bg-white/[0.03] border border-white/[0.05] w-max group-hover:border-orange-500/15 group-hover:scale-105 transition-all duration-400">
          {icon}
        </div>
        <h3 className="text-xl font-bold text-white mb-3 group-hover:-translate-y-0.5 transition-transform duration-300 tracking-tight">{title}</h3>
        <p className="text-slate-400 text-sm leading-relaxed font-medium mt-auto group-hover:text-slate-300 transition-colors duration-300">{desc}</p>
      </div>
    </PremiumCard>
  )
}

function FeatureItem({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <PremiumCard
      glowColor="rgba(251,146,60,0.08)"
      className="p-8 cursor-pointer"
    >
      <div className="flex flex-col gap-5 items-center text-center">
        <div className="p-4 bg-white/[0.03] rounded-2xl border border-white/[0.05] group-hover:border-orange-500/15 group-hover:scale-110 transition-all duration-400">{icon}</div>
        <div>
          <h4 className="font-bold text-white mb-2 group-hover:-translate-y-0.5 transition-transform duration-300 tracking-tight">{title}</h4>
          <p className="text-sm text-slate-500 leading-relaxed font-medium group-hover:text-slate-400 transition-colors duration-300">{desc}</p>
        </div>
      </div>
    </PremiumCard>
  );
}
