"use client";

import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  ArrowLeft, Rocket, ExternalLink, Github, Trophy, Search,
  CheckCircle2, XCircle, Clock, Sparkles
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Team = {
  id: string;
  team_name: string;
  repo_url: string;
  deployment_url: string | null;
  last_push: string;
  status: string;
  strike_count: number;
};

export default function FinalSubmissionsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const res = await fetch("/api/teams");
        if (res.ok) {
          const data = await res.json();
          setTeams(data.filter((t: Team) => t.deployment_url));
        }
      } catch (e) {
        console.error("Failed to fetch submissions", e);
      } finally {
        setLoading(false);
      }
    };
    fetchTeams();
  }, []);

  const filtered = search.trim()
    ? teams.filter(t => t.team_name.toLowerCase().includes(search.toLowerCase()))
    : teams;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 font-sans selection:bg-cyan-500/30 overflow-x-hidden">
      {/* Background */}
      <div className="fixed inset-0 z-0 pointer-events-none bg-[radial-gradient(circle_at_50%_0%,rgba(6,182,212,0.08),transparent_50%),radial-gradient(circle_at_80%_80%,rgba(147,51,234,0.08),transparent_50%)]" />

      <div className="relative z-10 max-w-6xl mx-auto p-6 md:p-10 space-y-10">
        
        {/* Back Nav */}
        <Link href="/admin" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Control Panel
        </Link>

        {/* Page Header */}
        <header className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/20 shadow-[0_0_30px_rgba(245,158,11,0.1)]">
              <Trophy className="w-8 h-8 text-amber-400" />
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl font-black tracking-tight bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 bg-clip-text text-transparent">
                Final Submissions
              </h1>
              <p className="text-slate-400 mt-1 font-medium">
                {loading ? "Loading..." : `${teams.length} team${teams.length !== 1 ? 's' : ''} submitted`} — Review & decide the winner
              </p>
            </div>
          </div>
          
          {/* Search */}
          <div className="max-w-md">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <Input
                placeholder="Search submissions..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-slate-900/50 border-white/10 text-white placeholder:text-slate-600 focus-visible:ring-amber-500/50"
              />
            </div>
          </div>
        </header>

        {/* Submissions Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-2xl bg-slate-900/40 border border-white/5 p-8 space-y-4">
                <div className="h-6 w-40 bg-slate-800 rounded-lg" />
                <div className="h-4 w-24 bg-slate-800 rounded-md" />
                <div className="h-12 w-full bg-slate-800 rounded-xl" />
                <div className="h-10 w-full bg-slate-800 rounded-xl" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-20 bg-slate-900/20 rounded-2xl border border-white/5">
            <Rocket className="w-16 h-16 text-slate-600 mb-4" />
            <h2 className="text-2xl font-bold text-slate-400">
              {search ? "No submissions match your search" : "No final submissions yet"}
            </h2>
            <p className="text-slate-500 mt-2">
              {search ? "Try a different keyword." : "Teams haven't submitted their deployment links yet."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filtered.map((team, index) => (
              <div
                key={team.id}
                className="group relative overflow-hidden rounded-2xl bg-slate-900/50 border border-white/5 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:border-white/10"
              >
                {/* Rank Indicator */}
                <div className="absolute top-0 right-0 m-4">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-950/80 border border-white/10 text-xs font-bold text-slate-400">
                    #{index + 1}
                  </span>
                </div>

                {/* Inner soft glow */}
                <div className="absolute -inset-px opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl pointer-events-none"
                  style={{ background: "radial-gradient(circle at 50% 100%, rgba(251,191,36,0.1), transparent 70%)" }}
                />

                <div className="relative z-10 p-8 space-y-6">
                  
                  {/* Team Name & Meta */}
                  <div>
                    <h3 className="text-2xl font-bold text-white mb-3 tracking-tight">{team.team_name}</h3>
                    <div className="flex flex-wrap items-center gap-3">
                      <StatusPill status={team.status} />
                      <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                        <Clock className="w-3.5 h-3.5" />
                        Last push {formatDistanceToNow(new Date(team.last_push), { addSuffix: true })}
                      </span>
                    </div>
                  </div>

                  {/* CTA Buttons */}
                  <div className="space-y-3">
                    <a
                      href={team.deployment_url!}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-center gap-3 w-full p-4 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/10 border border-amber-500/30 text-amber-300 hover:text-amber-200 hover:bg-amber-500/30 hover:border-amber-400/50 hover:shadow-[0_0_20px_rgba(245,158,11,0.15)] transition-all duration-300 font-bold text-base"
                    >
                      <Sparkles className="w-5 h-5" />
                      Open Live App
                      <ExternalLink className="w-4 h-4 ml-auto opacity-60" />
                    </a>

                    <a
                      href={team.repo_url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-center gap-3 w-full p-3 rounded-xl bg-slate-950/50 border border-white/5 text-slate-400 hover:text-white hover:bg-slate-800 hover:border-white/10 transition-all duration-300 font-medium text-sm"
                    >
                      <Github className="w-4 h-4" />
                      View Source Code
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function StatusPill({ status }: { status: string }) {
  if (status === 'active') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold">
        <CheckCircle2 className="w-3.5 h-3.5" /> Active
      </span>
    );
  }
  if (status === 'warning') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-bold animate-pulse">
        ⚠ Warning
      </span>
    );
  }
  if (status === 'disqualified') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-xs font-bold">
        <XCircle className="w-3.5 h-3.5" /> Disqualified
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-bold">
      <XCircle className="w-3.5 h-3.5" /> Inactive
    </span>
  );
}
