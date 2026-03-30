"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

export default function Preloader() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Disable scrolling while preloading
    document.body.style.overflow = "hidden";
    
    // Smooth transition timeout
    const timer = setTimeout(() => {
      setIsLoading(false);
      document.body.style.overflow = "unset";
    }, 2800); // Wait 2.8s total

    return () => {
      clearTimeout(timer);
      document.body.style.overflow = "unset";
    };
  }, []);

  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          key="preloader"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.05, filter: "blur(5px)" }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#020617]"
        >
          {/* Subtle Cyberpunk Grid Behind Logo */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(225,29,72,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(225,29,72,0.03)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />
          
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="relative flex items-center justify-center pointer-events-none"
          >
            {/* Pulsing ambient glow beneath the logo */}
            <motion.div
              animate={{ 
                scale: [1, 1.2, 1],
                opacity: [0.15, 0.45, 0.15]
              }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="absolute w-[300px] h-[300px] bg-amber-500/30 blur-[60px] rounded-full z-0"
            />
            <motion.div
              animate={{ 
                scale: [1.1, 1, 1.1],
                opacity: [0.1, 0.3, 0.1]
              }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
              className="absolute w-[250px] h-[250px] bg-rose-500/20 blur-[80px] rounded-full z-0"
            />
            
            {/* The Logo. Using 'screen' blend mode removes black backgrounds natively on dark themes */}
            <Image 
              src="/hackarena-logo.png" 
              alt="HackArena 2K26 Engine Boot" 
              width={400} 
              height={400} 
              priority
              className="relative z-10 drop-shadow-[0_0_25px_rgba(244,63,94,0.4)]"
            />
          </motion.div>

          {/* Loading bar */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="absolute bottom-24 w-64 flex flex-col items-center gap-3 z-20 pointer-events-none"
          >
            <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden border border-white/5">
              <motion.div
                initial={{ x: "-100%" }}
                animate={{ x: "0%" }}
                transition={{ duration: 2.3, ease: "circOut" }}
                className="h-full bg-gradient-to-r from-rose-600 to-amber-400 shadow-[0_0_10px_rgba(244,63,94,0.6)]"
              />
            </div>
            <p className="text-[10px] font-mono font-bold tracking-[0.3em] text-cyan-400 uppercase drop-shadow-[0_0_5px_rgba(34,211,238,0.4)]">
              Igniting Neural Engine
            </p>
            <p className="text-[9px] font-medium tracking-[0.15em] text-slate-500 mt-1">
              Engineered by Shreyas Ugargol
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
