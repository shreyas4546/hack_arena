"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Lock, Terminal, Menu, X, Timer, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

type TimerData = {
  status: "running" | "paused" | "stopped" | "unset";
  startTime: Date;
  accumulatedMs: number;
  durationHours: number;
};

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [regLocked, setRegLocked] = useState(false);
  const [fetchingLocks, setFetchingLocks] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [visible, setVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [session, setSession] = useState<any>(null);

  // Authentication state
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch registration lock state
  useEffect(() => {
    async function fetchLocks() {
      try {
        const res = await fetch("/api/registration-lock");
        if (res.ok) setRegLocked((await res.json()).registration_locked);
      } catch (err) {
        console.error(err);
      } finally {
        setFetchingLocks(false);
      }
    }
    fetchLocks();
  }, []);

  // Scroll detection with hysteresis to prevent rapid toggling
  useEffect(() => {
    const handleScroll = () => {
      const y = window.scrollY;
      // Use different thresholds for scrolling down vs up to avoid jitter
      if (!scrolled && y > 50) setScrolled(true);
      else if (scrolled && y < 15) setScrolled(false);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [scrolled]);

  const navLinks = [
    { label: "Rules", href: "/#rules" },
    { label: "How it Works", href: "/#how-it-works" },
    { label: "Submit", href: "/submit" },
    { label: "Verify", href: "/verify" },
  ];

  return (
    <nav
      className={cn(
        "fixed top-0 left-1/2 z-[60] will-change-transform",
        scrolled
          ? "w-[calc(100%-3rem)] max-w-5xl -translate-x-1/2 translate-y-4 bg-white/[0.03] backdrop-blur-2xl border border-white/[0.08] rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.04)] py-2.5"
          : "w-full max-w-none -translate-x-1/2 translate-y-0 bg-transparent border-b border-transparent rounded-none shadow-none py-5"
      )}
      style={{ transition: "all 1s cubic-bezier(0.16, 1, 0.3, 1)" }}
    >
      <div className={cn(
        "mx-auto px-8 sm:px-10",
        scrolled ? "max-w-5xl" : "max-w-7xl"
      )}
        style={{ transition: "all 1.1s cubic-bezier(0.16, 1, 0.3, 1)" }}
      >
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group shrink-0 transition-all duration-300 hover:scale-[1.03]">
            <Image
              src="/hackarena-logo.png"
              alt="HackArena 2K26"
              width={48}
              height={48}
              className="object-contain transition-all duration-300 group-hover:drop-shadow-[0_0_12px_rgba(251,146,60,0.6)]"
              priority
            />
            <span className="font-black text-white/90 text-base tracking-tight hidden sm:inline group-hover:text-white transition-colors">
              HackArena<span className="text-orange-400/90 ml-1 font-bold">2K26</span>
            </span>
          </Link>

          {/* Center: Nav Links */}
          <div className="hidden md:flex items-center gap-8">
            <div className="flex items-center gap-3">
              {navLinks.map((link) => (
                <Link key={link.href} href={link.href}>
                  <button
                    className={cn(
                      "group relative px-4 py-2 text-[11px] font-bold uppercase tracking-[0.15em] rounded-xl transition-all duration-400 cursor-pointer overflow-hidden hover:scale-[1.02]",
                      pathname === link.href ? "text-white bg-white/[0.08] shadow-[0_0_15px_rgba(251,146,60,0.08)]" : "text-slate-400 hover:text-orange-400 hover:bg-white/[0.04]"
                    )}
                  >
                    <span className="relative z-10">{link.label}</span>
                    <span className={cn(
                      "absolute left-0 bottom-0 h-[2.5px] bg-gradient-to-r from-orange-500 to-amber-400 transition-all duration-350 ease-in-out rounded-full",
                      pathname === link.href ? "w-full opacity-100 shadow-[0_0_12px_rgba(249,115,22,0.8)]" : "w-0 opacity-0 group-hover:w-full group-hover:opacity-100 group-hover:shadow-[0_0_12px_rgba(249,115,22,0.8)]"
                    )} />
                  </button>
                </Link>
              ))}
            </div>

          </div>

          {/* Right: Auth Actions */}
          <div className="hidden md:flex items-center gap-3">
            <Link href="/admin">
              <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white hover:bg-white/10 hover:shadow-[0_0_20px_rgba(255,255,255,0.1)] text-[11px] font-bold uppercase tracking-wider cursor-pointer h-9 px-4 transition-all duration-300 hover:scale-105 rounded-xl">
                Admin
              </Button>
            </Link>

            <div className="w-px h-5 bg-white/10" />

            {!session ? (
              <Link href="/login">
                <Button size="sm" className="bg-gradient-to-r from-cyan-600 to-blue-500 hover:from-cyan-500 hover:to-blue-400 text-white shadow-[0_0_15px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.6)] font-bold text-[11px] uppercase tracking-wider px-5 transition-all duration-300 cursor-pointer h-9 hover:scale-105 rounded-xl border border-cyan-400/20">
                  <Lock className="w-3.5 h-3.5 mr-1.5" /> Register / Login
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/dashboard">
                  <Button size="sm" variant="outline" className="border-cyan-500/30 text-cyan-400 bg-cyan-500/5 hover:bg-cyan-500/20 hover:text-cyan-300 font-bold text-[11px] uppercase tracking-wider px-5 transition-all duration-300 cursor-pointer h-9 hover:scale-105 rounded-xl hover:shadow-[0_0_25px_rgba(6,182,212,0.3)]">
                    <Terminal className="w-3.5 h-3.5 mr-1.5" /> Dashboard
                  </Button>
                </Link>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={async () => {
                    await supabase.auth.signOut();
                    router.push("/login");
                  }}
                  className="border-rose-500/30 text-rose-400 bg-rose-500/5 hover:bg-rose-500/20 hover:text-rose-300 font-bold text-[11px] uppercase tracking-wider px-4 transition-all duration-300 cursor-pointer h-9 hover:scale-105 rounded-xl hover:shadow-[0_0_25px_rgba(244,63,94,0.3)]"
                >
                  <LogOut className="w-3.5 h-3.5 mr-1.5" /> Logout
                </Button>
              </>
            )}
          </div>

           {/* Mobile: Hamburger */}
          <div className="md:hidden flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="p-2 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Dropdown */}
      <div className={cn(
        "md:hidden overflow-hidden transition-all duration-300",
        mobileOpen ? "max-h-[350px] bg-black/95 backdrop-blur-xl border-t border-white/[0.05]" : "max-h-0"
      )}>
        <div className="px-4 py-3 space-y-1">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} onClick={() => setMobileOpen(false)}>
              <div className="px-4 py-2.5 rounded-xl text-sm font-bold uppercase tracking-wider transition-all text-slate-300 hover:text-white hover:bg-white/[0.06]">
                {link.label}
              </div>
            </Link>
          ))}
          <div className="border-t border-white/[0.06] pt-2 mt-2 space-y-1">
            <Link href="/admin" onClick={() => setMobileOpen(false)}>
              <div className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-500 hover:text-white hover:bg-white/[0.06]">Admin</div>
            </Link>
            
            {!session ? (
              <Link href="/login" onClick={() => setMobileOpen(false)}>
                <div className="px-4 py-2.5 rounded-xl text-sm font-bold text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20 transition-all">
                  <Lock className="w-3.5 h-3.5 inline mr-2" /> Register / Login
                </div>
              </Link>
            ) : (
              <>
                <Link href="/dashboard" onClick={() => setMobileOpen(false)}>
                  <div className="px-4 py-2.5 rounded-xl text-sm font-bold text-slate-300 hover:text-white hover:bg-white/[0.04] transition-all">
                    <Terminal className="w-3.5 h-3.5 inline mr-2" /> Dashboard
                  </div>
                </Link>
                <button
                  onClick={async () => {
                    setMobileOpen(false);
                    await supabase.auth.signOut();
                    router.push("/login");
                  }}
                  className="w-full text-left px-4 py-2.5 rounded-xl text-sm font-bold text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 hover:text-rose-300 cursor-pointer transition-all"
                >
                  <LogOut className="w-3.5 h-3.5 inline mr-2" /> Logout
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
