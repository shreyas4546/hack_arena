"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Lock, Mail, ArrowLeft, Loader2, ArrowRight, Zap } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      if (data.session) {
        window.location.href = "/dashboard";
      }
    } catch (err: any) {
      setError(err.message || "Failed to log in.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="noise-overlay min-h-screen bg-[#050505] text-white selection:bg-orange-500/30 font-sans relative flex items-center justify-center p-6 overflow-hidden">
      {/* Layered Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[#050505]" />
        {/* Orange glow - top right */}
        <div className="absolute -top-[20%] -right-[10%] w-[800px] h-[800px] bg-orange-500/[0.07] blur-[180px] rounded-full" />
        {/* Cyan glow - bottom left */}
        <div className="absolute -bottom-[20%] -left-[10%] w-[700px] h-[700px] bg-cyan-500/[0.05] blur-[160px] rounded-full" />
        {/* Subtle grid */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.012)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.012)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_40%,#000_50%,transparent_100%)]" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Back Navigation */}
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-2 text-[#a78b7d] hover:text-orange-400 transition-colors mb-10 group w-fit"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span className="text-[11px] font-bold uppercase tracking-[0.2em]">Terminal_Exit</span>
        </button>

        {/* Login Card - Glassmorphism */}
        <div className="relative overflow-hidden rounded-2xl bg-white/[0.02] backdrop-blur-xl border border-white/[0.05] shadow-[0_0_80px_rgba(249,115,22,0.06)] group hover:border-orange-500/15 transition-all duration-700">
          {/* Left accent bar */}
          <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-gradient-to-b from-orange-500/60 via-amber-500/30 to-transparent" />
          
          {/* Inner glow */}
          <div className="absolute -top-24 -right-24 w-[300px] h-[300px] bg-orange-500/[0.04] rounded-full blur-[80px] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

          <div className="relative z-10 p-10 space-y-8">
            {/* Header */}
            <div className="space-y-3">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 bg-orange-500/10 rounded-xl border border-orange-500/15">
                  <Zap className="w-5 h-5 text-orange-400" />
                </div>
                <span className="text-[10px] font-bold text-[#a78b7d] uppercase tracking-[0.2em]">Secure Authentication</span>
              </div>
              <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-amber-300 to-orange-500 tracking-tight uppercase">
                Team Access
              </h1>
              <p className="text-[#a78b7d] font-medium text-sm leading-relaxed">
                Authenticate to enter the HackArena command dashboard.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-[#a78b7d] uppercase tracking-[0.2em] pl-1 block">Operative Email</label>
                <div className="relative group/input">
                  <Mail className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-[#584237] group-focus-within/input:text-orange-400 transition-colors" />
                  <input
                    required
                    type="email"
                    placeholder="leader@team.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[#0e0e0e] border border-white/[0.05] text-[#e0c0b1] placeholder:text-[#584237] h-12 pl-12 rounded-xl focus:outline-none focus:border-orange-500/40 focus:shadow-[0_0_12px_rgba(249,115,22,0.1)] transition-all font-medium text-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-[#a78b7d] uppercase tracking-[0.2em] pl-1 block">Access Key</label>
                <div className="relative group/input">
                  <Lock className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-[#584237] group-focus-within/input:text-orange-400 transition-colors" />
                  <input
                    required
                    type="password"
                    placeholder="Enter team password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-[#0e0e0e] border border-white/[0.05] text-[#e0c0b1] placeholder:text-[#584237] h-12 pl-12 rounded-xl focus:outline-none focus:border-orange-500/40 focus:shadow-[0_0_12px_rgba(249,115,22,0.1)] transition-all font-medium text-sm"
                  />
                </div>
              </div>

              {error && (
                <div className="p-4 rounded-xl bg-[#93000a]/10 border border-[#93000a]/20 text-[#ffb4ab] text-sm font-medium flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse mt-1.5 shrink-0 shadow-[0_0_8px_rgba(244,63,94,0.6)]" />
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full h-13 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-[#341100] font-black uppercase tracking-[0.15em] rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none mt-2 flex items-center justify-center shadow-[0_0_30px_rgba(249,115,22,0.15)] hover:shadow-[0_0_50px_rgba(249,115,22,0.3)] cursor-pointer py-3.5 text-sm"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Authenticate"}
              </button>
            </form>

            {/* Bottom Links */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => router.push("/register")}
                className="flex items-center gap-2 text-orange-400/70 hover:text-orange-300 transition-colors bg-transparent border-none p-0 cursor-pointer group/reg"
              >
                <span className="text-[11px] font-bold uppercase tracking-wider">Request_Access</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover/reg:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Attribution */}
        <div className="mt-8 text-center">
          <p className="text-[10px] text-[#584237] font-medium tracking-wider">HackArena 2K26 — Tactical Access System</p>
        </div>
      </div>
    </div>
  );
}
