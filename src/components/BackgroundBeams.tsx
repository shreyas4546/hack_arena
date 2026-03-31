"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export default function BackgroundBeams() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // 0 = Phase 1 (0-30%), 1 = Phase 2 (30-80%), 2 = Phase 3 (80-100%)
  const [phaseGlow, setPhaseGlow] = useState(0);

  // Refs for smooth animation interpolation inside the continuous canvas loop
  const currentMetrics = useRef({ opacity: 0.4, speed: 0.3 });
  const targetMetrics = useRef({ opacity: 0.4, speed: 0.3 });

  // 1. Time Polling & Phase Logic
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    
    let localStartTime = Date.now();
    let localAccumulated = 0;
    let localDuration = 24 * 3600 * 1000;
    let isRunning = false;

    const fetchSettings = async () => {
      try {
        const res = await fetch("/api/settings");
        if (res.ok) {
          const settings = await res.json();
          isRunning = settings.timer_status === "running";
          localStartTime = settings.timer_start_time ? new Date(settings.timer_start_time).getTime() : Date.now();
          localAccumulated = Number(settings.timer_accumulated_ms) || 0;
          localDuration = (Number(settings.timer_duration_hours) || 24) * 3600 * 1000;
          updateTargets();
        }
      } catch (e) {
        // Fail silently to prevent console spam
      }
    };

    const updateTargets = () => {
      const currentElapsed = isRunning ? localAccumulated + (Date.now() - localStartTime) : localAccumulated;
      const progress = localDuration > 0 ? Math.min(1, Math.max(0, currentElapsed / localDuration)) : 0;

      if (progress < 0.3) {
        // Phase 1 (Start): Calm and clean, very low intensity
        targetMetrics.current = { opacity: 0.4, speed: 0.3 };
        setPhaseGlow(0);
      } else if (progress < 0.8) {
        // Phase 2 (Mid): Increased motion, stronger presence
        targetMetrics.current = { opacity: 1.0, speed: 1.1 };
        setPhaseGlow(1);
      } else {
        // Phase 3 (Final): Urgency, high contrast, warm amber dominance
        targetMetrics.current = { opacity: 1.8, speed: 2.2 };
        setPhaseGlow(2);
      }
    };

    fetchSettings();
    intervalId = setInterval(() => {
      updateTargets();
      // Occasionally re-sync with server state to catch admin changes
      if (Math.random() < 0.05) fetchSettings(); 
    }, 1000);

    return () => clearInterval(intervalId);
  }, []);

  // 2. Canvas Rendering Engine
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const isMobile = window.matchMedia("(max-width: 768px)").matches;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let animationFrameId: number;
    let width = 0;
    let height = 0;

    const renderScale = 0.4; // MASSIVE OPTIMIZATION: 60% less pixels to draw
    const resize = () => {
      width = Math.floor(window.innerWidth * renderScale);
      height = Math.floor(window.innerHeight * 1.5 * renderScale); 
      canvas.width = width;
      canvas.height = height;
    };
    
    window.addEventListener("resize", resize);
    resize();

    interface Beam {
      x: number;
      y: number;
      width: number;
      length: number;
      angle: number;
      baseSpeed: number;
      baseOpacity: number;
      color: string;
    }

    const beams: Beam[] = [];
    // Mobile handling: drastically reduce beam count and intensity
    const beamCount = isMobile ? 2 : 6; 

    for (let i = 0; i < beamCount; i++) {
      beams.push({
        x: Math.random() * width,
        y: Math.random() * height - height,
        width: Math.random() * 300 + 200, 
        length: Math.random() * height + height, 
        angle: (Math.random() - 0.5) * 0.5, 
        baseSpeed: Math.random() * 0.8 + 0.2, 
        baseOpacity: Math.random() * 0.2 + 0.15, 
        color: Math.random() > 0.85 ? "6, 182, 212" : "249, 115, 22" 
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Smoothly interpolate metrics towards the phase target
      currentMetrics.current.opacity += (targetMetrics.current.opacity - currentMetrics.current.opacity) * 0.02;
      currentMetrics.current.speed += (targetMetrics.current.speed - currentMetrics.current.speed) * 0.02;

      const dynamicSpeedMult = currentMetrics.current.speed;
      const dynamicOpMult = currentMetrics.current.opacity;

      beams.forEach(beam => {
        beam.y += beam.baseSpeed * dynamicSpeedMult;
        
        if (beam.y > height + beam.length) {
          beam.y = -beam.length;
          beam.x = Math.random() * width;
        }

        ctx.save();
        ctx.translate(beam.x, beam.y);
        ctx.rotate(beam.angle);

        // Precompute gradient with full opacity, and scale rendering with globalAlpha (90% faster)
        const activeOpacity = Math.min(1.0, beam.baseOpacity * dynamicOpMult);
        ctx.globalAlpha = activeOpacity;
        
        const gradient = ctx.createLinearGradient(0, 0, 0, beam.length);
        gradient.addColorStop(0, `rgba(${beam.color}, 0)`);
        gradient.addColorStop(0.5, `rgba(${beam.color}, 1)`);
        gradient.addColorStop(1, `rgba(${beam.color}, 0)`);

        ctx.fillStyle = gradient;
        ctx.fillRect(-beam.width / 2, 0, beam.width, beam.length);
        
        ctx.restore();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none z-0">
      {/* Dynamic Ambient Glow Layer 
          This visually reacts to the phase progress by intensely warming up the background in Phase 3 */}
      <div 
        className={cn(
          "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-orange-600/10 blur-[120px] rounded-full transition-all duration-[5000ms] ease-in-out mix-blend-screen",
          phaseGlow === 0 ? "opacity-0 scale-90" : phaseGlow === 1 ? "opacity-40 scale-100" : "opacity-100 scale-125 bg-orange-500/20"
        )} 
      />
      
      {/* Particle Canvas Layer */}
      <canvas 
        ref={canvasRef} 
        className="absolute top-0 left-0 w-full h-[150vh] object-cover mix-blend-screen opacity-80 blur-xl transition-opacity duration-[3000ms]"
        aria-hidden="true"
      />
    </div>
  );
}
