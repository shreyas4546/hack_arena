"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShieldAlert, Github, CheckCircle2, XCircle, ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

export default function VerifyConnectionPage() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; lastPush?: string; error?: string } | null>(null);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/verify-repo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoUrl: url }),
      });
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setResult({ success: false, error: "Network error occurred." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4 font-sans relative">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(251,146,60,0.06),transparent_50%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:60px_60px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_60%,transparent_100%)]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-lg relative z-10"
      >
        <Link href="/" className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-orange-400 transition-colors mb-8">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
        </Link>

        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 md:p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -mt-20 w-64 h-64 bg-orange-500/6 rounded-full blur-[100px] pointer-events-none" />

          <div className="flex flex-col items-center text-center mb-8 relative z-10">
            <div className="w-16 h-16 rounded-full bg-orange-500/10 border border-orange-500/20 flex items-center justify-center mb-4">
              <ShieldAlert className="w-8 h-8 text-orange-400" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight mb-2">Connection Verifier</h1>
            <p className="text-slate-500 text-sm">
              The HackArena engine requires your GitHub repository to be <strong className="text-slate-300">Public</strong>. Paste your URL below to simulate the cron monitor.
            </p>
          </div>

          <form onSubmit={handleVerify} className="space-y-4 relative z-10">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">GitHub Repository URL</label>
              <div className="relative">
                <Github className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                <Input
                  required
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://github.com/username/repo"
                  className="pl-10 bg-white/[0.03] border-white/[0.08] text-white placeholder:text-slate-600 focus:border-orange-500/50"
                />
              </div>
            </div>

            <Button disabled={loading || !url} className="w-full bg-gradient-to-r from-orange-500 to-amber-400 text-black font-bold h-11 hover:shadow-[0_0_20px_rgba(251,146,60,0.3)] hover:scale-[1.02] transition-all cursor-pointer">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Run Connection Test"}
            </Button>
          </form>

          {result && (
            <motion.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className={`mt-6 p-4 rounded-xl border ${result.success ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-rose-500/10 border-rose-500/20'}`}
            >
              <div className="flex items-start gap-3">
                {result.success ? <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" /> : <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />}
                <div>
                  <h3 className={`font-bold ${result.success ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {result.success ? "Connection Verified!" : "Connection Failed!"}
                  </h3>
                  <p className="text-sm text-slate-400 mt-1">
                    {result.success 
                      ? `The HackArena engine successfully accessed your repository. Your last commit was detected ${formatDistanceToNow(new Date(result.lastPush!))} ago.` 
                      : result.error}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </main>
  );
}
