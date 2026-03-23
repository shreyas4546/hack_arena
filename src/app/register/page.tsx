"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trophy, ArrowLeft, Github, CheckCircle2, Lock } from "lucide-react";
import Link from "next/link";

export default function RegisterPage() {
  const [teamName, setTeamName] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [registrationLocked, setRegistrationLocked] = useState(false);
  const [fetchingSettings, setFetchingSettings] = useState(true);

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

    try {
      const res = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ team_name: teamName, repo_url: repoUrl }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMessage("Team successfully registered! You're in the arena now.");
      setTeamName("");
      setRepoUrl("");
    } catch (err: any) {
      setError(err.message || "Failed to register team.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-slate-50 flex flex-col items-center justify-center py-16 px-4 selection:bg-orange-500/30 font-sans relative">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(251,146,60,0.08),transparent_50%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:60px_60px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_60%,transparent_100%)]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md space-y-8"
      >
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-orange-400 transition-colors group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Home
        </Link>

        <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-8 md:p-10 backdrop-blur-xl shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-20 -mr-20 w-64 h-64 bg-orange-500/8 rounded-full blur-[100px] pointer-events-none" />

          <div className="flex items-center gap-4 mb-8 relative z-10">
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-orange-500/20 to-amber-500/10 border border-orange-500/20">
              <Trophy className="w-7 h-7 text-orange-400" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white">Register Team</h1>
              <p className="text-sm text-slate-500 font-medium">Join the HackArena</p>
            </div>
          </div>

          {fetchingSettings ? (
            <div className="relative z-10 flex flex-col items-center justify-center py-16">
              <div className="w-8 h-8 rounded-full border-2 border-slate-800 border-t-orange-500 animate-spin" />
            </div>
          ) : registrationLocked ? (
            <div className="relative z-10 flex flex-col items-center text-center py-8 space-y-4 animate-in fade-in zoom-in-95 duration-300">
              <div className="p-4 rounded-full bg-rose-500/10 border border-rose-500/20">
                <Lock className="w-10 h-10 text-rose-400" />
              </div>
              <h2 className="text-xl font-bold text-white">Registration Closed</h2>
              <p className="text-rose-400/90 text-sm font-medium">The hackathon has begun, and new team registrations are no longer being accepted.</p>
              <div className="pt-4 w-full">
                <Button onClick={() => window.location.href = '/'} className="w-full h-12 bg-white/[0.05] hover:bg-white/[0.1] text-white font-bold border border-white/[0.06] transition-colors cursor-pointer">
                  Return to Home
                </Button>
              </div>
            </div>
          ) : message ? (
            <div className="relative z-10 flex flex-col items-center text-center py-8 space-y-4 animate-in fade-in zoom-in-95 duration-300">
              <div className="p-4 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                <CheckCircle2 className="w-10 h-10 text-emerald-400" />
              </div>
              <h2 className="text-xl font-bold text-white">Registration Complete!</h2>
              <p className="text-emerald-400 text-sm font-medium">{message}</p>
              <div className="flex gap-3 pt-4 items-center justify-center w-full">
                <Button onClick={() => setMessage("")} variant="outline" className="border-white/10 bg-white/[0.03] text-slate-300 flex-1 h-11 cursor-pointer">
                  Register Another
                </Button>
                <Button onClick={() => window.location.href = '/submit'} className="bg-gradient-to-r from-orange-500 to-amber-400 text-black font-bold flex-1 h-11 cursor-pointer hover:shadow-[0_0_20px_rgba(251,146,60,0.3)]">
                  Go to Submission
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleRegister} className="space-y-6 relative z-10">
              <div className="space-y-3">
                <label className="text-sm font-semibold text-slate-400 tracking-wide">Team Name</label>
                <Input
                  required
                  placeholder="e.g. Byte Builders"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  className="bg-white/[0.03] border-white/[0.08] text-white placeholder:text-slate-600 focus-visible:ring-orange-500/50 h-12 text-base"
                />
              </div>
              <div className="space-y-3">
                <label className="text-sm font-semibold text-slate-400 tracking-wide">GitHub Repository URL</label>
                <div className="relative">
                  <Github className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
                  <Input
                    required
                    type="url"
                    placeholder="https://github.com/username/repo"
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    className="bg-white/[0.03] border-white/[0.08] text-white placeholder:text-slate-600 focus-visible:ring-orange-500/50 h-12 pl-10 text-base"
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm font-medium">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-12 bg-gradient-to-r from-orange-500 to-amber-400 text-black font-bold text-base transition-all hover:shadow-[0_0_30px_rgba(251,146,60,0.35)] hover:scale-[1.02] cursor-pointer"
                disabled={loading}
              >
                {loading ? "Registering..." : "Join Hackathon"}
              </Button>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-slate-600 font-medium">
          Make sure your GitHub repository is <span className="text-slate-400">public</span> before registering.
        </p>
      </motion.div>
    </main>
  );
}
