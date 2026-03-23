"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Rocket, Lock } from "lucide-react";
import Link from "next/link";

const PROBLEMS = {
  "FinTech": [
    "Subscription Tracker & Auto-Cancel System",
    "Multi-Bank Dashboard Web App"
  ],
  "EdTech": [
    "Collaborative Study Rooms (Virtual)",
    "Online Coding Assessment Platform"
  ],
  "Healthcare": [
    "Digital Health Record Portal",
    "Doctor Availability & Teleconsultation Platform"
  ],
  "Social Impact": [
    "Community Issue Reporting System",
    "Local Farmer-to-Consumer Marketplace"
  ],
  "Campus Solutions": [
    "Placement Preparation Portal",
    "Unified Campus Portal"
  ]
};

export default function SubmitPage() {
  const [teamName, setTeamName] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [deployUrl, setDeployUrl] = useState("");
  const [category, setCategory] = useState("");
  const [problemStatement, setProblemStatement] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submissionsLocked, setSubmissionsLocked] = useState(false);
  const [fetchingSettings, setFetchingSettings] = useState(true);

  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch("/api/settings");
        if (res.ok) {
          const data = await res.json();
          setSubmissionsLocked(data.submissions_locked);
        }
      } catch (err) {
        console.error("Failed to fetch settings", err);
      } finally {
        setFetchingSettings(false);
      }
    }
    fetchSettings();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          team_name: teamName, 
          repo_url: repoUrl, 
          deployment_url: deployUrl,
          category,
          problem_statement: problemStatement
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMessage("Final project successfully submitted!");
    } catch (err: any) {
      setError(err.message || "Failed to submit project.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-slate-50 flex flex-col items-center py-20 px-4 selection:bg-orange-500/30 font-sans relative">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(251,146,60,0.08),transparent)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear_gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:60px_60px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_60%,transparent_100%)]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-2xl mb-6 relative z-10"
      >
        <Link href="/" className="text-slate-500 hover:text-orange-400 flex items-center gap-2 group transition-colors w-fit">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Home
        </Link>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-2xl p-8 sm:p-10 rounded-2xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-xl shadow-2xl relative overflow-hidden z-10"
      >
        <div className="absolute top-0 right-0 w-96 h-96 bg-orange-500/8 rounded-full blur-[100px] pointer-events-none -mr-20 -mt-20" />
        
        <div className="relative z-10 mb-8">
          <h1 className="flex items-center gap-3 text-3xl sm:text-4xl font-black bg-gradient-to-r from-white via-orange-100 to-orange-400 bg-clip-text text-transparent">
            <Rocket className="w-8 h-8 text-orange-400" />
            Final Submission
          </h1>
          <p className="text-slate-500 mt-3 font-medium text-sm sm:text-base">
            Warning: URL must return a live HTTP 200 status. Submissions are locked definitively after the deployment deadline.
          </p>
        </div>

        {fetchingSettings ? (
          <div className="relative z-10 flex flex-col items-center justify-center py-16">
            <div className="w-8 h-8 rounded-full border-2 border-slate-800 border-t-orange-500 animate-spin" />
          </div>
        ) : submissionsLocked ? (
          <div className="relative z-10 flex flex-col items-center text-center py-8 space-y-4 animate-in fade-in zoom-in-95 duration-300">
            <div className="p-4 rounded-full bg-rose-500/10 border border-rose-500/20">
              <Lock className="w-10 h-10 text-rose-400" />
            </div>
            <h2 className="text-xl font-bold text-white">Submissions Closed</h2>
            <p className="text-rose-400/90 text-sm font-medium">The deployment deadline has passed. Final submissions are no longer being accepted.</p>
            <div className="pt-4 w-full">
              <Button onClick={() => window.location.href = '/'} className="w-full h-12 bg-white/[0.05] hover:bg-white/[0.1] text-white font-bold border border-white/[0.06] transition-colors cursor-pointer">
                Return to Home
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="relative z-10 space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-400 uppercase tracking-widest">Team Name</label>
              <Input
                required
                placeholder="Registered Team Name"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                className="bg-white/[0.03] border-white/[0.08] text-white placeholder:text-slate-600 focus-visible:ring-orange-500/50 h-12"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-400 uppercase tracking-widest">Registered GitHub URL</label>
              <Input
                required
                type="url"
                placeholder="https://github.com/username/repo"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                className="bg-white/[0.03] border-white/[0.08] text-white placeholder:text-slate-600 focus-visible:ring-orange-500/50 h-12"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-400 uppercase tracking-widest">Category</label>
                <Select required value={category} onValueChange={(val: string) => { setCategory(val); setProblemStatement(""); }}>
                  <SelectTrigger className="w-full h-12 bg-white/[0.03] border-white/[0.08] text-white focus:ring-orange-500/50">
                    <SelectValue placeholder="Select a Category" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0a0a0a] border-white/10 text-white">
                    {Object.keys(PROBLEMS).map((cat) => (
                      <SelectItem key={cat} value={cat} className="focus:bg-orange-500/20 focus:text-orange-100">{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-400 uppercase tracking-widest">Problem Statement</label>
                <Select required value={problemStatement} onValueChange={setProblemStatement} disabled={!category}>
                  <SelectTrigger className="w-full h-12 bg-white/[0.03] border-white/[0.08] text-white focus:ring-orange-500/50 disabled:opacity-50">
                    <SelectValue placeholder={category ? "Select a Problem Statement" : "Select Category First"} />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0a0a0a] border-white/10 text-white">
                    {category && (PROBLEMS as any)[category].map((prob: string) => (
                      <SelectItem key={prob} value={prob} className="focus:bg-orange-500/20 focus:text-orange-100">{prob}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-400 uppercase tracking-widest">Live Deployment URL</label>
              <Input
                required
                type="url"
                placeholder="https://your-project.vercel.app"
                value={deployUrl}
                onChange={(e) => setDeployUrl(e.target.value)}
                className="bg-white/[0.03] border-white/[0.08] text-white placeholder:text-slate-600 focus-visible:ring-orange-500/50 h-12"
              />
            </div>

            {error && <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-sm font-medium">{error}</div>}
            {message && <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-sm font-medium">{message}</div>}

            <Button type="submit" className="w-full h-14 text-lg mt-6 bg-gradient-to-r from-orange-500 to-amber-400 text-black font-bold transition-all rounded-xl hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(251,146,60,0.4)] cursor-pointer" disabled={loading}>
              {loading ? "Verifying & Submitting..." : "Submit Final Project"}
            </Button>
          </form>
        )}
      </motion.div>

      <p className="text-center text-xs text-slate-600 font-medium max-w-sm mt-6 relative z-10">
        By submitting, you confirm that this is your team&apos;s final deployed application.
      </p>
    </main>
  );
}
