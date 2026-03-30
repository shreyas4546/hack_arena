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
    <main className="noise-overlay min-h-screen bg-[#050505] flex items-center justify-center p-4 font-sans relative">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(251,146,60,0.06),transparent_60%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.012)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.012)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_50%,transparent_100%)]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
        className="w-full max-w-lg relative z-10"
      >
        <Link href="/" className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-orange-400 transition-colors mb-10">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
        </Link>

        <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-8 md:p-10 backdrop-blur-xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] relative overflow-hidden hover:border-orange-500/15 transition-all duration-500">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -mt-24 w-72 h-72 bg-orange-500/[0.04] rounded-full blur-[120px] pointer-events-none" />

          <div className="flex flex-col items-center text-center mb-10 relative z-10">
            <div className="w-18 h-18 rounded-2xl bg-orange-500/8 border border-orange-500/15 flex items-center justify-center mb-5 p-4">
              <ShieldAlert className="w-8 h-8 text-orange-400" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight mb-3">Connection Verifier</h1>
            <p className="text-slate-500 text-sm leading-relaxed">
              The HackArena engine requires your GitHub repository to be <strong className="text-slate-300">Public</strong>. Paste your URL below to simulate the cron monitor.
            </p>
          </div>

          <form onSubmit={handleVerify} className="space-y-5 relative z-10">
            <div className="space-y-2.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">GitHub Repository URL</label>
              <div className="relative">
                <Github className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                <Input
                  required
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://github.com/username/repo"
                  className="pl-11 bg-white/[0.03] border-white/[0.08] text-white placeholder:text-slate-600 focus:border-orange-500/40 h-12 rounded-xl"
                />
              </div>
            </div>

            <Button disabled={loading || !url} className="w-full bg-gradient-to-r from-orange-500 to-amber-400 text-black font-bold h-12 rounded-xl hover:shadow-[0_0_30px_rgba(251,146,60,0.25)] hover:scale-[1.02] transition-all cursor-pointer">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Run Connection Test"}
            </Button>
          </form>

          {result && (
            <motion.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className={`mt-7 p-5 rounded-xl border ${result.success ? 'bg-emerald-500/8 border-emerald-500/15' : 'bg-rose-500/8 border-rose-500/15'}`}
            >
              <div className="flex items-start gap-3">
                {result.success ? <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" /> : <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />}
                <div>
                  <h3 className={`font-bold ${result.success ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {result.success ? "Connection Verified!" : "Connection Failed!"}
                  </h3>
                  <p className="text-sm text-slate-400 mt-1.5 leading-relaxed">
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
