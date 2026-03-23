"use client";

import { useState } from "react";
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
    <main className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="fixed inset-0 z-0 pointer-events-none bg-[radial-gradient(circle_at_50%_0%,rgba(6,182,212,0.05),transparent_50%)]" />

      <div className="w-full max-w-lg relative z-10">
        <Link href="/" className="inline-flex items-center text-sm font-medium text-slate-400 hover:text-white transition-colors mb-8">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
        </Link>

        <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-6 md:p-8 backdrop-blur-xl shadow-2xl">
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-16 h-16 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mb-4">
              <ShieldAlert className="w-8 h-8 text-cyan-400" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight mb-2">Connection Verifier</h1>
            <p className="text-slate-400 text-sm">
              The HackArena engine requires your GitHub repository to be <strong>Public</strong>. Paste your URL below to simulate the cron monitor.
            </p>
          </div>

          <form onSubmit={handleVerify} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">GitHub Repository URL</label>
              <div className="relative">
                <Github className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <Input
                  required
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://github.com/username/repo"
                  className="pl-10 bg-slate-950 border-white/10 text-white placeholder:text-slate-600 focus:border-cyan-500/50"
                />
              </div>
            </div>

            <Button disabled={loading || !url} className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold h-11">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Run Connection Test"}
            </Button>
          </form>

          {result && (
            <div className={`mt-6 p-4 rounded-xl border ${result.success ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-rose-500/10 border-rose-500/20'}`}>
              <div className="flex items-start gap-3">
                {result.success ? <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" /> : <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />}
                <div>
                  <h3 className={`font-bold ${result.success ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {result.success ? "Connection Verified!" : "Connection Failed!"}
                  </h3>
                  <p className="text-sm text-slate-300 mt-1">
                    {result.success 
                      ? `The HackArena engine successfully accessed your repository. Your last commit was detected ${formatDistanceToNow(new Date(result.lastPush!))} ago.` 
                      : result.error}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
