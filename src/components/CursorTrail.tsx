"use client";

import { useEffect, useRef, useCallback, useState } from "react";

/**
 * CursorTrail — Realistic fire/embers cursor effect.
 *
 * Particles rise upward, flicker, shrink, and die like real fire.
 * Uses a hot-core color ramp: white → yellow → orange → red → smoke.
 */

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;      // 1.0 → 0.0
  maxLife: number;
  size: number;
  seed: number;       // for flickering
  type: "flame" | "ember" | "smoke";
}

const MAX_PARTICLES = 120;
const SPAWN_RATE = 3; // particles per mouse-move event

export default function CursorTrail() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef({ x: -999, y: -999, active: false });
  const prevMouseRef = useRef({ x: -999, y: -999 });
  const rafRef = useRef<number>(0);
  const [isEnabled, setIsEnabled] = useState(false);

  const spawnParticles = useCallback((x: number, y: number, speed: number) => {
    const pts = particlesRef.current;
    const count = Math.min(SPAWN_RATE + Math.floor(speed * 0.02), 6);

    for (let i = 0; i < count; i++) {
      if (pts.length >= MAX_PARTICLES) {
        // Recycle oldest particle
        pts.shift();
      }

      const angle = Math.random() * Math.PI * 2;
      const spread = Math.random() * 8;
      const type: Particle["type"] =
        Math.random() < 0.65 ? "flame" :
        Math.random() < 0.8 ? "ember" : "smoke";

      const maxLife = type === "flame"
        ? 0.4 + Math.random() * 0.35
        : type === "ember"
        ? 0.6 + Math.random() * 0.5
        : 0.8 + Math.random() * 0.6;

      const size = type === "flame"
        ? 14 + Math.random() * 18
        : type === "ember"
        ? 3 + Math.random() * 5
        : 20 + Math.random() * 15;

      pts.push({
        x: x + Math.cos(angle) * spread,
        y: y + Math.sin(angle) * spread,
        vx: (Math.random() - 0.5) * 2.5,
        vy: -(1.5 + Math.random() * 3),  // Rise upward
        life: 1.0,
        maxLife,
        size,
        seed: Math.random() * 1000,
        type,
      });
    }
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const x = e.clientX;
    const y = e.clientY; // Canvas is fixed to viewport, no scrollY compensation needed or it draws offscreen!

    const dx = x - prevMouseRef.current.x;
    const dy = y - prevMouseRef.current.y;
    const speed = Math.sqrt(dx * dx + dy * dy);

    mouseRef.current = { x, y, active: true };
    prevMouseRef.current = { x, y };

    if (speed > 2) {
      spawnParticles(x, y, speed);
    }
  }, [spawnParticles]);

  useEffect(() => {
    // Rely exclusively on CSS media query for reduced motion, rather than hardware touch detection
    // because hardware touch detection permanently disables mouse effects on Windows laptops with touchscreens.
    
    // Enabling force since OS-level "reduced animation" sometimes kills it on Windows machines silently
    setIsEnabled(true);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio, 2);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    let resizeTimer: ReturnType<typeof setTimeout>;
    const debouncedResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resize, 250);
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("resize", debouncedResize, { passive: true });

    let lastTime = performance.now();

    const getFlameColor = (life: number, type: Particle["type"]) => {
      let r = 0, g = 0, b = 0, a = 0;
      
      if (type === "smoke") {
        a = life * 0.08;
        r = 180; g = 160; b = 140;
      } else if (type === "ember") {
        a = Math.min(1, life * 0.9);
        r = 255;
        g = Math.floor(120 + life * 100);
        b = Math.floor(20 * life);
      } else {
        // Flame: white-hot center → yellow → orange → red
        if (life > 0.7) {
          const t = (life - 0.7) / 0.3;
          r = 255;
          g = Math.floor(220 + t * 35);
          b = Math.floor(80 + t * 120);
          a = 0.6 + t * 0.3;
        } else if (life > 0.4) {
          const t = (life - 0.4) / 0.3;
          r = 255;
          g = Math.floor(120 + t * 100);
          b = Math.floor(5 + t * 75);
          a = 0.45 + t * 0.15;
        } else {
          const t = Math.max(0, life / 0.4);
          r = Math.floor(180 + t * 75);
          g = Math.floor(40 + t * 80);
          b = 0;
          a = t * 0.4;
        }
      }
      return { r, g, b, a: Math.max(0, a) }; // Clamp to prevent negative alpha
    };

    const render = () => {
      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.05); // Cap delta
      lastTime = now;

      const w = canvas.width / Math.min(window.devicePixelRatio, 2);
      const h = canvas.height / Math.min(window.devicePixelRatio, 2);
      ctx.clearRect(0, 0, w, h);

      const pts = particlesRef.current;

      // Update & render each particle
      for (let i = pts.length - 1; i >= 0; i--) {
        const p = pts[i];

        // Age the particle
        p.life -= dt / p.maxLife;
        if (p.life <= 0) {
          pts.splice(i, 1);
          continue;
        }

        // Flicker: organic lateral oscillation
        const flicker = Math.sin(now * 0.008 + p.seed * 6.28) * 0.8;
        const turbulence = Math.sin(now * 0.012 + p.seed * 3.14) * 0.5;

        // Physics
        p.vy -= dt * (p.type === "smoke" ? 1.5 : 4); // Buoyancy (rise faster)
        p.vx += flicker * dt * 3;
        p.x += p.vx * dt * 60;
        p.y += p.vy * dt * 60;

        // Damping
        p.vx *= 0.97;

        // Rendering
        const age = 1 - p.life;
        const { r, g, b, a } = getFlameColor(p.life, p.type);
        const color = `rgba(${r}, ${g}, ${b}, ${a.toFixed(3)})`; // Format cleanly to avoid JS scientific notation

        if (p.type === "flame") {
          // Flame particles: soft glow circles that shrink
          const currentSize = Math.max(0.1, p.size * (0.3 + p.life * 0.7));
          const grad = ctx.createRadialGradient(
            p.x + turbulence, p.y, 0,
            p.x + turbulence, p.y, currentSize
          );
          
          grad.addColorStop(0, color);
          // Eliminated faulty regex by direct calculation
          grad.addColorStop(0.4, `rgba(${r}, ${g}, ${b}, ${(a * 0.5).toFixed(3)})`);
          grad.addColorStop(1, "rgba(0, 0, 0, 0)");

          ctx.beginPath();
          ctx.arc(p.x + turbulence, p.y, currentSize, 0, Math.PI * 2);
          ctx.fillStyle = grad;
          ctx.fill();

        } else if (p.type === "ember") {
          // Ember: tiny bright dots
          const emberSize = Math.max(0.1, p.size * p.life);
          ctx.beginPath();
          ctx.arc(p.x, p.y, emberSize, 0, Math.PI * 2);
          ctx.fillStyle = color;
          ctx.fill();

          // Ember glow
          if (p.life > 0.3) {
            const glowGrad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, emberSize * 4);
            glowGrad.addColorStop(0, `rgba(255, 180, 40, ${(p.life * 0.15).toFixed(3)})`);
            glowGrad.addColorStop(1, "rgba(255, 180, 40, 0)");
            ctx.beginPath();
            ctx.arc(p.x, p.y, emberSize * 4, 0, Math.PI * 2);
            ctx.fillStyle = glowGrad;
            ctx.fill();
          }

        } else {
          // Smoke: large, very faint, slow-rising
          const smokeSize = Math.max(0.1, p.size * (0.5 + age * 1.2));
          const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, smokeSize);
          grad.addColorStop(0, color);
          grad.addColorStop(1, "rgba(0, 0, 0, 0)");
          ctx.beginPath();
          ctx.arc(p.x, p.y, smokeSize, 0, Math.PI * 2);
          ctx.fillStyle = grad;
          ctx.fill();
        }
      }

      // ─── Ambient cursor glow (soft ground fire) ───
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;
      if (mx > 0 && my > 0 && mouseRef.current.active) {
        // Hot spot under cursor
        const hotGrad = ctx.createRadialGradient(mx, my, 0, mx, my, 40);
        hotGrad.addColorStop(0, "rgba(255, 200, 80, 0.15)");
        hotGrad.addColorStop(0.3, "rgba(255, 140, 30, 0.08)");
        hotGrad.addColorStop(0.7, "rgba(200, 60, 10, 0.03)");
        hotGrad.addColorStop(1, "rgba(200, 60, 10, 0)");
        ctx.beginPath();
        ctx.arc(mx, my, 40, 0, Math.PI * 2);
        ctx.fillStyle = hotGrad;
        ctx.fill();

        // Wider warm aura
        const auraGrad = ctx.createRadialGradient(mx, my, 20, mx, my, 100);
        auraGrad.addColorStop(0, "rgba(251, 146, 60, 0.04)");
        auraGrad.addColorStop(1, "rgba(251, 146, 60, 0)");
        ctx.beginPath();
        ctx.arc(mx, my, 100, 0, Math.PI * 2);
        ctx.fillStyle = auraGrad;
        ctx.fill();
      }

      rafRef.current = requestAnimationFrame(render);
    };

    rafRef.current = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", debouncedResize);
      clearTimeout(resizeTimer);
    };
  }, [handleMouseMove]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-[50] pointer-events-none"
      aria-hidden="true"
      style={{
        display: isEnabled ? "block" : "none",
      }}
    />
  );
}
