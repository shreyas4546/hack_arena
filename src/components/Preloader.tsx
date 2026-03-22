"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

export default function Preloader() {
  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Simulate progress
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        // Accelerating curve
        const increment = prev < 60 ? 4 : prev < 85 ? 3 : 2;
        return Math.min(prev + increment, 100);
      });
    }, 50);

    // Auto-dismiss after 3 seconds max
    const timeout = setTimeout(() => {
      setIsLoading(false);
    }, 3000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, []);

  // Dismiss when progress hits 100
  useEffect(() => {
    if (progress >= 100) {
      const exitTimer = setTimeout(() => setIsLoading(false), 400);
      return () => clearTimeout(exitTimer);
    }
  }, [progress]);

  const tagline = "Code. Compete. Conquer.";

  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          key="preloader"
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-950 overflow-hidden"
          exit={{ opacity: 0, scale: 1.1 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Ambient Background Glow — Cyan/Indigo matching website theme */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[120px] animate-pulse" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[40%] w-[300px] h-[300px] bg-indigo-500/8 rounded-full blur-[80px]" />
          </div>

          {/* Scan Line — Cyan */}
          <motion.div
            className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400/80 to-transparent pointer-events-none z-20"
            initial={{ top: "30%" }}
            animate={{ top: ["30%", "70%", "30%"] }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />

          {/* Subtle Grid Overlay — Cyan tint */}
          <div
            className="absolute inset-0 opacity-[0.03] pointer-events-none z-10"
            style={{
              backgroundImage:
                "linear-gradient(rgba(6,182,212,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,0.3) 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />

          {/* Logo Container */}
          <motion.div
            className="relative z-30 flex flex-col items-center"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Neon Glow Ring Behind Logo — Cyan/Indigo */}
            <motion.div
              className="absolute -inset-8 rounded-full opacity-50"
              style={{
                background:
                  "radial-gradient(circle, rgba(6,182,212,0.3) 0%, rgba(99,102,241,0.15) 40%, transparent 70%)",
              }}
              animate={{ scale: [1, 1.08, 1], opacity: [0.4, 0.7, 0.4] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />

            {/* Logo Image */}
            <motion.div
              className="relative w-48 h-48 sm:w-64 sm:h-64"
              animate={{ scale: [1, 1.03, 1] }}
              transition={{
                duration: 2.5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              style={{
                filter:
                  "drop-shadow(0 0 30px rgba(6,182,212,0.5)) drop-shadow(0 0 60px rgba(99,102,241,0.3))",
              }}
            >
              <Image
                src="/logo.png"
                alt="HackArena 2K26"
                fill
                className="object-contain"
                priority
              />

              {/* Glitch / Flicker Overlay — Cyan */}
              <motion.div
                className="absolute inset-0 bg-cyan-500/10 mix-blend-overlay rounded-lg"
                animate={{ opacity: [0, 0.3, 0, 0.1, 0] }}
                transition={{
                  duration: 0.3,
                  repeat: Infinity,
                  repeatDelay: 2,
                  ease: "linear",
                }}
              />
            </motion.div>

            {/* Tagline — Letter by Letter */}
            <div className="mt-8 flex gap-[2px] overflow-hidden">
              {tagline.split("").map((char, i) => (
                <motion.span
                  key={i}
                  className="text-sm sm:text-base font-bold tracking-[0.3em] uppercase"
                  style={{
                    color: char === "." ? "rgb(6,182,212)" : "rgb(203,213,225)",
                    textShadow: char === "." ? "0 0 10px rgba(6,182,212,0.8)" : "none",
                  }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.05,
                    delay: 0.8 + i * 0.04,
                    ease: "easeOut",
                  }}
                >
                  {char === " " ? "\u00A0" : char}
                </motion.span>
              ))}
            </div>

            {/* Progress Bar — Cyan to Indigo gradient */}
            <div className="mt-8 w-48 sm:w-64 relative">
              <div className="h-[2px] w-full bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{
                    background:
                      "linear-gradient(90deg, rgb(6,182,212), rgb(99,102,241), rgb(147,51,234))",
                    boxShadow: "0 0 12px rgba(6,182,212,0.6)",
                  }}
                  initial={{ width: "0%" }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.1, ease: "linear" }}
                />
              </div>
              <motion.p
                className="text-center mt-3 text-xs font-mono text-cyan-400/80 tracking-widest"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                {`INITIALIZING... ${progress}%`}
              </motion.p>
            </div>
          </motion.div>

          {/* Attribution — fades in near the end */}
          <motion.p
            className="absolute bottom-10 text-[10px] text-slate-600/50 font-medium tracking-widest uppercase z-30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2.0, duration: 0.8 }}
          >
            Engineered by Shreyas Ugargol
          </motion.p>

          {/* Bottom Flare — Cyan */}
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
