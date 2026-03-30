"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * CursorTrail — Minimal realistic fire cursor + subtle idle burn.
 * 
 * HERO SECTION ONLY. Detects the hero bounds via a data attribute
 * and only activates effects when the cursor is within that region.
 * 
 * Burn effect: small, elegant charring like a cigarette touching paper.
 * Not dramatic. Not over-the-top. Just realistic.
 */

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  seed: number;
  type: "flame" | "ember" | "smoke";
}

const MAX_PARTICLES = 80;
const SPAWN_RATE = 2;

export default function CursorTrail() {
  const pathname = usePathname();
  const isHomepage = pathname === "/";

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef({ x: -999, y: -999, inHero: false });
  const prevMouseRef = useRef({ x: -999, y: -999 });
  const rafRef = useRef<number>(0);
  const heroBoundsRef = useRef<DOMRect | null>(null);

  // Idle burn
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const burnRef = useRef(0);

  const [isEnabled, setIsEnabled] = useState(false);

  // ── Particle spawner (minimal) ──
  const spawnParticles = useCallback((x: number, y: number, speed: number, burn = 0) => {
    const pts = particlesRef.current;
    const count = burn > 0
      ? Math.floor(1 + burn * 2)
      : Math.min(SPAWN_RATE + Math.floor(speed * 0.015), 4);

    for (let i = 0; i < count; i++) {
      if (pts.length >= MAX_PARTICLES) pts.shift();

      const angle = Math.random() * Math.PI * 2;
      const spread = (Math.random() * 5) + (burn * 12 * Math.random());

      const rng = Math.random();
      const type: Particle["type"] = burn > 0
        ? (rng < 0.4 ? "smoke" : rng < 0.75 ? "flame" : "ember")
        : (rng < 0.6 ? "flame" : rng < 0.8 ? "ember" : "smoke");

      const maxLife = type === "flame"  ? 0.3 + Math.random() * 0.25 + burn * 0.15
                    : type === "ember"  ? 0.5 + Math.random() * 0.4 + burn * 0.2
                    :                     0.6 + Math.random() * 0.5 + burn * 0.8;

      const size = type === "flame"  ? (8 + Math.random() * 10) * (1 + burn * 0.4)
                 : type === "ember"  ? (2 + Math.random() * 3)
                 :                     (12 + Math.random() * 10) * (1 + burn * 1.5);

      pts.push({
        x: x + Math.cos(angle) * spread,
        y: y + Math.sin(angle) * spread,
        vx: (Math.random() - 0.5) * (1.5 + burn * 2),
        vy: -(1 + Math.random() * 2 + burn * 1.5),
        life: 1.0, maxLife, size, seed: Math.random() * 1000, type,
      });
    }
  }, []);

  // ── Mouse handler ──
  const handleMouseMove = useCallback((e: MouseEvent) => {
    const x = e.clientX;
    const y = e.clientY;
    const dx = x - prevMouseRef.current.x;
    const dy = y - prevMouseRef.current.y;
    const speed = Math.sqrt(dx * dx + dy * dy);

    // Check if cursor is inside the hero section
    const bounds = heroBoundsRef.current;
    const inHero = bounds ? (x >= bounds.left && x <= bounds.right && y >= bounds.top && y <= bounds.bottom) : false;

    mouseRef.current = { x, y, inHero };
    prevMouseRef.current = { x, y };

    // Reset burn on any movement
    burnRef.current = 0;
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);

    // Only start idle timer if cursor is in hero
    if (inHero) {
      idleTimerRef.current = setTimeout(() => {
        burnRef.current = 0.01;
      }, 1500); // 1.5 seconds before ignition
    }

    if (speed > 2) {
      spawnParticles(x, y, speed, 0);
    }
  }, [spawnParticles]);

  // ── Main effect ──
  useEffect(() => {
    setIsEnabled(true);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    // Track hero section bounds
    const updateHeroBounds = () => {
      const hero = document.querySelector("[data-hero-section]");
      if (hero) heroBoundsRef.current = hero.getBoundingClientRect();
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio, 2);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      updateHeroBounds();
    };
    resize();

    let resizeTimer: ReturnType<typeof setTimeout>;
    const debouncedResize = () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(resize, 250); };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("resize", debouncedResize, { passive: true });
    window.addEventListener("scroll", updateHeroBounds, { passive: true });

    // Refresh hero bounds periodically (in case of layout shifts)
    const boundsInterval = setInterval(updateHeroBounds, 2000);

    let lastTime = performance.now();

    const getColor = (life: number, type: Particle["type"]) => {
      if (type === "smoke") return { r: 140, g: 120, b: 100, a: life * 0.12 };
      if (type === "ember") return { r: 255, g: Math.floor(130 + life * 90), b: Math.floor(20 * life), a: Math.min(1, life * 0.8) };
      // Flame
      if (life > 0.7) return { r: 255, g: Math.floor(220 + ((life - 0.7) / 0.3) * 35), b: Math.floor(80 + ((life - 0.7) / 0.3) * 100), a: 0.5 + ((life - 0.7) / 0.3) * 0.3 };
      if (life > 0.4) return { r: 255, g: Math.floor(130 + ((life - 0.4) / 0.3) * 90), b: Math.floor(10 + ((life - 0.4) / 0.3) * 70), a: 0.35 + ((life - 0.4) / 0.3) * 0.15 };
      const t = Math.max(0, life / 0.4);
      return { r: Math.floor(180 + t * 75), g: Math.floor(50 + t * 80), b: 0, a: t * 0.3 };
    };

    // ════ RENDER LOOP ════
    const render = () => {
      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;
      const inHero = mouseRef.current.inHero;
      const burn = burnRef.current;

      // Idle burn ramp (only in hero)
      if (burn > 0 && inHero) {
        burnRef.current = Math.min(1.0, burn + dt * 0.25);
        spawnParticles(mx, my, 0, burnRef.current);
      }

      // ════ BURN MARK (subtle, like a cigarette burn) ════
      if (burn > 0.05 && inHero && mx > 0) {
        const scorchR = 15 + burn * 45; // Small: 15px → 60px max

        ctx.save();
        ctx.beginPath();
        const segs = 32;
        for (let s = 0; s <= segs; s++) {
          const theta = (s / segs) * Math.PI * 2;
          const n = Math.sin(theta * 6 + now * 0.0015) * 0.12 + Math.sin(theta * 11 + now * 0.001) * 0.08;
          const r = scorchR * (1 + n);
          const px = mx + Math.cos(theta) * r;
          const py = my + Math.sin(theta) * r;
          if (s === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();

        // Charred center
        const char = ctx.createRadialGradient(mx, my, 0, mx, my, scorchR);
        char.addColorStop(0, `rgba(10, 4, 0, ${burn * 0.7})`);
        char.addColorStop(0.6, `rgba(25, 10, 2, ${burn * 0.5})`);
        char.addColorStop(1, `rgba(40, 15, 3, 0)`);
        ctx.fillStyle = char;
        ctx.fill();

        // Glowing orange edge
        ctx.shadowColor = `rgba(255, 100, 20, ${burn * 0.7})`;
        ctx.shadowBlur = 8 + burn * 15;
        ctx.strokeStyle = `rgba(255, 140, 30, ${burn * 0.7})`;
        ctx.lineWidth = 1.5 + burn * 2;
        ctx.stroke();
        ctx.restore();

        // Subtle heat glow
        const glow = ctx.createRadialGradient(mx, my, scorchR * 0.5, mx, my, scorchR * 2);
        glow.addColorStop(0, `rgba(255, 120, 30, ${burn * 0.06})`);
        glow.addColorStop(1, "rgba(0,0,0,0)");
        ctx.beginPath();
        ctx.arc(mx, my, scorchR * 2, 0, Math.PI * 2);
        ctx.fillStyle = glow;
        ctx.fill();
      }

      // ════ PARTICLES ════
      const pts = particlesRef.current;
      for (let i = pts.length - 1; i >= 0; i--) {
        const p = pts[i];
        p.life -= dt / p.maxLife;
        if (p.life <= 0) { pts.splice(i, 1); continue; }

        const flicker = Math.sin(now * 0.008 + p.seed * 6.28) * 0.6;
        const turb = Math.sin(now * 0.012 + p.seed * 3.14) * 0.4;

        p.vy -= dt * (p.type === "smoke" ? 1 : 3);
        p.vx += flicker * dt * 2;
        p.x += p.vx * dt * 60;
        p.y += p.vy * dt * 60;
        p.vx *= 0.97;

        const { r, g, b, a } = getColor(p.life, p.type);

        if (p.type === "flame") {
          const sz = Math.max(0.1, p.size * (0.3 + p.life * 0.7));
          const grad = ctx.createRadialGradient(p.x + turb, p.y, 0, p.x + turb, p.y, sz);
          grad.addColorStop(0, `rgba(${r},${g},${b},${a.toFixed(3)})`);
          grad.addColorStop(0.5, `rgba(${r},${g},${b},${(a * 0.4).toFixed(3)})`);
          grad.addColorStop(1, "rgba(0,0,0,0)");
          ctx.beginPath(); ctx.arc(p.x + turb, p.y, sz, 0, Math.PI * 2);
          ctx.fillStyle = grad; ctx.fill();
        } else if (p.type === "ember") {
          const sz = Math.max(0.1, p.size * p.life);
          ctx.beginPath(); ctx.arc(p.x, p.y, sz, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${r},${g},${b},${a.toFixed(3)})`; ctx.fill();
          if (p.life > 0.4) {
            const gl = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, sz * 3);
            gl.addColorStop(0, `rgba(255,180,40,${(p.life * 0.1).toFixed(3)})`);
            gl.addColorStop(1, "rgba(255,180,40,0)");
            ctx.beginPath(); ctx.arc(p.x, p.y, sz * 3, 0, Math.PI * 2);
            ctx.fillStyle = gl; ctx.fill();
          }
        } else {
          const sz = Math.max(0.1, p.size * (0.4 + (1 - p.life) * 0.8));
          const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, sz);
          grad.addColorStop(0, `rgba(${r},${g},${b},${a.toFixed(3)})`);
          grad.addColorStop(1, "rgba(0,0,0,0)");
          ctx.beginPath(); ctx.arc(p.x, p.y, sz, 0, Math.PI * 2);
          ctx.fillStyle = grad; ctx.fill();
        }
      }

      // Ambient hot-spot under cursor
      if (mx > 0 && my > 0) {
        const hs = ctx.createRadialGradient(mx, my, 0, mx, my, 30);
        hs.addColorStop(0, `rgba(255,200,80,${0.08 + burn * 0.15})`);
        hs.addColorStop(0.5, `rgba(255,140,30,${0.04 + burn * 0.08})`);
        hs.addColorStop(1, "rgba(200,60,10,0)");
        ctx.beginPath(); ctx.arc(mx, my, 30, 0, Math.PI * 2);
        ctx.fillStyle = hs; ctx.fill();
      }

      rafRef.current = requestAnimationFrame(render);
    };

    rafRef.current = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", debouncedResize);
      window.removeEventListener("scroll", updateHeroBounds);
      clearInterval(boundsInterval);
      clearTimeout(resizeTimer);
    };
  }, [handleMouseMove, spawnParticles]);

  if (!isHomepage) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-[50] pointer-events-none"
      aria-hidden="true"
      style={{ display: isEnabled ? "block" : "none" }}
    />
  );
}
