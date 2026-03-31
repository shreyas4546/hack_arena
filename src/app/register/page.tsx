"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trophy, ArrowLeft, Github, CheckCircle2, Lock, Users, Target, BookOpen } from "lucide-react";
import Link from "next/link";

import { problemStatements, domains } from "@/constants/problemStatements";

export default function RegisterPage() {
  const [teamName, setTeamName] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  // New State variables
  const [domain, setDomain] = useState("");
  const [probStatement, setProbStatement] = useState("");
  const [teamLeader, setTeamLeader] = useState("");
  const [participants, setParticipants] = useState(["", "", ""]);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [registrationLocked, setRegistrationLocked] = useState(false);
  const [fetchingSettings, setFetchingSettings] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function checkExistingSession() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.push("/dashboard");
      }
    }
    checkExistingSession();
  }, [router]);

  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch("/api/registration-lock");
        if (res.ok) {
          const data = await res.json();
          setRegistrationLocked(data.registration_locked);
        }
      } catch (err) {
        console.error("Failed to fetch settings", err);
      } finally {
        setFetchingSettings(false);
      }
    }
    fetchSettings();
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");
    
    // Filter out empty names
    const validParticipants = participants.filter(name => name.trim() !== "");

    try {
      const res = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          team_name: teamName, 
          repo_url: repoUrl, 
          email, 
          password,
          domain,
          prob_statement: probStatement,
          team_leader_name: teamLeader,
          participant_names: validParticipants
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMessage("Team successfully registered! You're in the arena now.");
      setTeamName("");
      setRepoUrl("");
      setEmail("");
      setPassword("");
      setDomain("");
      setProbStatement("");
      setTeamLeader("");
      setParticipants(["", "", ""]);
    } catch (err: any) {
      setError(err.message || "Failed to register team.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="noise-overlay min-h-screen bg-[#050505] text-slate-50 flex flex-col items-center justify-center py-20 px-4 selection:bg-orange-500/30 font-sans relative">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_-5%,rgba(251,146,60,0.06),transparent_55%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.012)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.012)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_50%,transparent_100%)]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
        className="relative z-10 w-full max-w-xl space-y-8"
      >
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-orange-400 transition-colors group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Home
        </Link>

        <div className="rounded-2xl bg-white/[0.02] border border-white/[0.05] p-9 md:p-11 backdrop-blur-xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] relative overflow-hidden hover:border-orange-500/15 transition-all duration-500">
          <div className="absolute top-0 right-0 -mt-24 -mr-24 w-72 h-72 bg-orange-500/[0.04] rounded-full blur-[120px] pointer-events-none" />

          <div className="flex items-center gap-4 mb-10 relative z-10">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-orange-500/15 to-amber-500/8 border border-orange-500/15">
              <Trophy className="w-7 h-7 text-orange-400" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight">Register Team</h1>
              <p className="text-sm text-slate-500 font-medium">Join the HackArena</p>
            </div>
          </div>

          {fetchingSettings ? (
            <div className="relative z-10 flex flex-col items-center justify-center py-20">
              <div className="w-8 h-8 rounded-full border-2 border-slate-800 border-t-orange-500 animate-spin" />
            </div>
          ) : registrationLocked ? (
            <div className="relative z-10 flex flex-col items-center text-center py-10 space-y-5 animate-in fade-in zoom-in-95 duration-300">
              <div className="p-5 rounded-2xl bg-rose-500/8 border border-rose-500/15">
                <Lock className="w-10 h-10 text-rose-400" />
              </div>
              <h2 className="text-xl font-black text-white tracking-tight">Registration Closed</h2>
              <p className="text-rose-400/90 text-sm font-medium">The hackathon has begun, and new team registrations are no longer being accepted.</p>
              <div className="pt-5 w-full">
                <Button onClick={() => window.location.href = '/'} className="w-full h-13 bg-white/[0.04] hover:bg-white/[0.08] text-white font-bold border border-white/[0.06] transition-colors cursor-pointer rounded-xl py-3.5">
                  Return to Home
                </Button>
              </div>
            </div>
          ) : message ? (
            <div className="relative z-10 flex flex-col items-center text-center py-10 space-y-5 animate-in fade-in zoom-in-95 duration-300">
              <div className="p-5 rounded-2xl bg-emerald-500/8 border border-emerald-500/15">
                <CheckCircle2 className="w-10 h-10 text-emerald-400" />
              </div>
              <h2 className="text-xl font-black text-white tracking-tight">Registration Complete!</h2>
              <p className="text-emerald-400 text-sm font-medium">{message}</p>
              <div className="flex gap-3 pt-5 items-center justify-center w-full">
                <Button onClick={() => setMessage("")} variant="outline" className="border-white/[0.08] bg-white/[0.03] text-slate-300 flex-1 h-12 cursor-pointer rounded-xl">
                  Register Another
                </Button>
                <Button onClick={() => window.location.href = '/dashboard'} className="bg-gradient-to-r from-orange-500 to-amber-400 text-black font-bold flex-1 h-12 cursor-pointer hover:shadow-[0_0_25px_rgba(251,146,60,0.25)] rounded-xl">
                  Go to Dashboard
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleRegister} className="space-y-9 relative z-10">
              
              {/* PRIMARY DETAILS */}
              <div className="space-y-5">
                <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2 border-b border-white/[0.06] pb-3">
                  <Target className="w-4 h-4 text-orange-400" /> Mission Directives
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2.5">
                    <label className="text-xs font-bold text-slate-400 tracking-wider">Category</label>
                    <div className="relative">
                      <select
                        required
                        value={domain}
                        onChange={(e) => {
                          setDomain(e.target.value);
                          setProbStatement("");
                        }}
                        className="w-full bg-white/[0.03] border border-white/[0.06] text-white focus:ring-orange-500/40 h-12 rounded-xl px-4 text-sm appearance-none focus:outline-none focus:border-orange-500/40"
                      >
                        <option value="" disabled className="text-slate-500">Pick a Category...</option>
                        {domains.map((d) => (
                          <option key={d} value={d} className="bg-[#0e0e0e] text-white">{d}</option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                        <svg className="fill-current h-4 w-4" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" /></svg>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <label className="text-xs font-bold text-slate-400 tracking-wider">Problem Statement</label>
                    <div className="relative">
                      <select
                        required
                        value={probStatement}
                        onChange={(e) => setProbStatement(e.target.value)}
                        disabled={!domain}
                        className="w-full bg-white/[0.03] border border-white/[0.06] text-white disabled:opacity-50 focus:ring-orange-500/40 h-12 rounded-xl px-4 text-sm appearance-none focus:outline-none focus:border-orange-500/40"
                      >
                        <option value="" disabled className="text-slate-500">
                          {domain ? "Pick a Statement..." : "Select Category first"}
                        </option>
                        {domain && problemStatements[domain].map((ps) => (
                          <option key={ps.title} value={ps.title} className="bg-[#0e0e0e] text-white px-2 py-1">{ps.title}</option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                        <svg className="fill-current h-4 w-4" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" /></svg>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <label className="text-xs font-bold text-slate-400 tracking-wider">Team Name</label>
                  <Input
                    required
                    placeholder="e.g. Byte Builders"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    className="bg-white/[0.03] border-white/[0.06] text-white placeholder:text-slate-600 focus-visible:ring-orange-500/40 h-12 text-sm rounded-xl"
                  />
                </div>
              </div>

              {/* TEAM PROFILE */}
              <div className="space-y-5">
                <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2 border-b border-white/[0.06] pb-3">
                  <Users className="w-4 h-4 text-cyan-400" /> Operatives (Optional)
                </h3>
                
                <div className="space-y-2.5">
                  <label className="text-xs font-bold text-slate-400 tracking-wider">Team Leader</label>
                  <Input
                    placeholder="Enter leader's name"
                    value={teamLeader}
                    onChange={(e) => setTeamLeader(e.target.value)}
                    className="bg-white/[0.03] border-white/[0.06] text-white placeholder:text-slate-600 focus-visible:ring-cyan-500/40 h-12 text-sm rounded-xl"
                  />
                </div>
                
                <div className="space-y-2.5">
                  <label className="text-xs font-bold text-slate-400 tracking-wider flex justify-between">
                    <span>Participants (Max 3)</span>
                    <span className="text-[10px] text-slate-500 uppercase tracking-widest">{participants.filter(p => p.trim() !== "").length}/3 Active</span>
                  </label>
                  <div className="space-y-2.5">
                    {participants.map((p, i) => (
                      <Input
                        key={i}
                        placeholder={`Participant ${i + 1} Name`}
                        value={p}
                        onChange={(e) => {
                          const newP = [...participants];
                          newP[i] = e.target.value;
                          setParticipants(newP);
                        }}
                        className="bg-white/[0.03] border-white/[0.06] text-white placeholder:text-slate-600 focus-visible:ring-cyan-500/40 h-11 text-sm rounded-xl"
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* INFRASTRUCTURE */}
              <div className="space-y-5">
                <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2 border-b border-white/[0.06] pb-3">
                  <BookOpen className="w-4 h-4 text-emerald-400" /> Infrastructure Access
                </h3>

                <div className="space-y-2.5">
                  <label className="text-xs font-bold text-slate-400 tracking-wider">GitHub Repository URL</label>
                  <div className="relative">
                    <Github className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600" />
                    <Input
                      required
                      type="url"
                      placeholder="https://github.com/username/repo"
                      value={repoUrl}
                      onChange={(e) => setRepoUrl(e.target.value)}
                      className="bg-white/[0.03] border-white/[0.06] text-white placeholder:text-slate-600 focus-visible:ring-emerald-500/40 h-12 pl-11 text-sm rounded-xl"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2.5">
                    <label className="text-xs font-bold text-slate-400 tracking-wider">Team Email</label>
                    <Input
                      required
                      type="email"
                      placeholder="team@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="bg-white/[0.03] border-white/[0.06] text-white placeholder:text-slate-600 focus-visible:ring-emerald-500/40 h-12 text-sm rounded-xl"
                    />
                  </div>

                  <div className="space-y-2.5">
                    <label className="text-xs font-bold text-slate-400 tracking-wider">Dashboard Password</label>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600" />
                      <Input
                        required
                        type="password"
                        minLength={6}
                        placeholder="Min. 6 characters"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="bg-white/[0.03] border-white/[0.06] text-white placeholder:text-slate-600 focus-visible:ring-emerald-500/40 h-12 pl-11 text-sm rounded-xl"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {error && (
                <div className="p-4 rounded-xl bg-rose-500/8 border border-rose-500/15 text-rose-400 text-sm font-medium flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-13 mt-5 bg-gradient-to-r from-orange-500 to-amber-400 text-black font-bold text-base transition-all hover:shadow-[0_0_35px_rgba(251,146,60,0.3)] hover:scale-[1.02] cursor-pointer rounded-xl py-3.5"
                disabled={loading}
              >
                {loading ? "Registering..." : "Initialise Registration"}
              </Button>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-slate-600 font-medium">
          Ensure your GitHub repository is <span className="text-slate-400">public</span>.
        </p>
      </motion.div>
    </main>
  );
}
