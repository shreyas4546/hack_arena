"use client";

import { useState, useEffect } from "react";
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
    <main className="min-h-screen bg-slate-950 text-slate-50 flex flex-col items-center justify-center py-16 px-4 selection:bg-cyan-500/30 font-sans">
      {/* Background */}
      <div className="fixed inset-0 z-0 pointer-events-none bg-[radial-gradient(circle_at_50%_0%,rgba(6,182,212,0.08),transparent_50%),radial-gradient(circle_at_80%_100%,rgba(147,51,234,0.08),transparent_50%)]" />

      <div className="relative z-10 w-full max-w-md space-y-8">

        {/* Back Nav */}
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Home
        </Link>

        {/* Card */}
        <div className="rounded-2xl bg-slate-900/60 border border-white/10 p-8 md:p-10 backdrop-blur-xl shadow-2xl relative overflow-hidden">
          {/* Glow */}
          <div className="absolute top-0 right-0 -mt-16 -mr-16 w-56 h-56 bg-cyan-500/10 rounded-full blur-[80px] pointer-events-none" />
          <div className="absolute bottom-0 left-0 -mb-16 -ml-16 w-56 h-56 bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none" />

          {/* Header */}
          <div className="flex items-center gap-4 mb-8 relative z-10">
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-indigo-500/10 border border-cyan-500/20 shadow-[0_0_20px_rgba(6,182,212,0.1)]">
              <Trophy className="w-7 h-7 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Register Team</h1>
              <p className="text-sm text-slate-400 font-medium">Join the HackArena</p>
            </div>
          </div>

          {/* Success / Locked State */}
          {fetchingSettings ? (
            <div className="relative z-10 flex flex-col items-center justify-center py-16">
              <div className="w-8 h-8 rounded-full border-2 border-slate-700 border-t-cyan-500 animate-spin" />
            </div>
          ) : registrationLocked ? (
            <div className="relative z-10 flex flex-col items-center text-center py-8 space-y-4 animate-in fade-in zoom-in-95 duration-300">
              <div className="p-4 rounded-full bg-rose-500/10 border border-rose-500/20">
                <Lock className="w-10 h-10 text-rose-400" />
              </div>
              <h2 className="text-xl font-bold text-white">Registration Closed</h2>
              <p className="text-rose-400/90 text-sm font-medium">The hackathon has begun, and new team registrations are no longer being accepted.</p>
              <div className="pt-4 w-full">
                <Button onClick={() => window.location.href = '/'} className="w-full h-12 bg-slate-800 hover:bg-slate-700 text-white font-bold border border-white/10 transition-colors">
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
                <Button onClick={() => setMessage("")} variant="outline" className="border-white/10 bg-slate-900/50 text-slate-300 flex-1 h-11">
                  Register Another
                </Button>
                <Button onClick={() => window.location.href = '/submit'} className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold flex-1 h-11">
                  Go to Submission
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleRegister} className="space-y-6 relative z-10">
              <div className="space-y-3">
                <label className="text-sm font-semibold text-slate-300 tracking-wide">Team Name</label>
                <Input
                  required
                  placeholder="e.g. Byte Builders"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  className="bg-slate-950/50 border-white/10 text-white placeholder:text-slate-600 focus-visible:ring-cyan-500/50 h-12 text-base"
                />
              </div>
              <div className="space-y-3">
                <label className="text-sm font-semibold text-slate-300 tracking-wide">GitHub Repository URL</label>
                <div className="relative">
                  <Github className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <Input
                    required
                    type="url"
                    placeholder="https://github.com/username/repo"
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    className="bg-slate-950/50 border-white/10 text-white placeholder:text-slate-600 focus-visible:ring-cyan-500/50 h-12 pl-10 text-base"
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm font-medium">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-12 bg-white hover:bg-slate-200 text-slate-950 font-bold text-base transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.15)]"
                disabled={loading}
              >
                {loading ? "Registering..." : "Join Hackathon"}
              </Button>
            </form>
          )}
        </div>

        {/* Footer Note */}
        <p className="text-center text-xs text-slate-500 font-medium">
          Make sure your GitHub repository is <span className="text-slate-400">public</span> before registering.
        </p>
      </div>
    </main>
  );
}
