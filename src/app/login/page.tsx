"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Lock, Mail, ArrowLeft, Loader2 } from "lucide-react";

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
        router.push("/dashboard");
      }
    } catch (err: any) {
      setError(err.message || "Failed to log in.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="noise-overlay min-h-screen bg-[#050505] text-white selection:bg-cyan-500/30 font-sans relative flex items-center justify-center p-6">
      {/* Background gradients */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[#050505]" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[600px] bg-cyan-500/8 blur-[140px] rounded-full opacity-50 pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-emerald-500/6 blur-[140px] rounded-full opacity-30 pointer-events-none" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-2 text-slate-400 hover:text-cyan-400 transition-colors mb-10 group w-fit"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-semibold uppercase tracking-wider">Back to Mission Control</span>
        </button>

        <div className="p-10 rounded-2xl bg-white/[0.02] border border-white/[0.05] backdrop-blur-xl relative overflow-hidden group hover:border-cyan-500/20 transition-all duration-500 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)]">
          <div className="absolute inset-0 bg-gradient-to-b from-white/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          
          <div className="relative z-10 space-y-8">
            <div className="space-y-3">
              <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400 tracking-tight">
                TEAM ACCESS
              </h1>
              <p className="text-slate-400 font-medium text-sm">
                Authenticate to enter the HackArena command dashboard.
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-1 block">Team Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    required
                    type="email"
                    placeholder="leader@team.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-white/[0.03] border border-white/[0.08] text-white placeholder:text-slate-600 h-12 pl-12 rounded-xl focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-all font-medium"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-1 block">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    required
                    type="password"
                    placeholder="Enter team password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-white/[0.03] border border-white/[0.08] text-white placeholder:text-slate-600 h-12 pl-12 rounded-xl focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-all font-medium"
                  />
                </div>
              </div>

              {error && (
                <div className="p-4 rounded-xl bg-rose-500/8 border border-rose-500/15 text-rose-400 text-sm font-medium">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full h-13 bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-black font-black uppercase tracking-widest rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none mt-3 flex items-center justify-center shadow-[0_0_25px_rgba(6,182,212,0.12)] hover:shadow-[0_0_40px_rgba(6,182,212,0.25)] cursor-pointer py-3.5"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Authenticate"}
              </button>
            </form>
            
            <div className="text-center pt-3">
              <p className="text-xs text-slate-500 font-medium">
                Not a registered team yet?{" "}
                <button 
                  type="button" 
                  onClick={() => router.push("/register")} 
                  className="text-cyan-400 hover:text-cyan-300 transition-colors bg-transparent border-none p-0 cursor-pointer"
                >
                  Initialize Registration
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
