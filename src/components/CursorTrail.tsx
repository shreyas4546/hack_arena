"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { usePathname } from "next/navigation";
/**
 * CursorTrail — Dual-canvas fire cursor with realistic idle burn.
 *
 * Canvas 1 (burnCanvas): mix-blend-mode: multiply — chars/darkens the actual page content
 * Canvas 2 (particleCanvas): normal blend — fire particles, embers, smoke on top
 *
 * When idle > 1.2s, the page itself visually burns, tears, and chars.
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

const MAX_PARTICLES = 250;
const SPAWN_RATE = 3;

export default function CursorTrail() {
  const pathname = usePathname();
  const isHomepage = pathname === "/";

  const burnCanvasRef = useRef<HTMLCanvasElement>(null);
  const particleCanvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef({ x: -999, y: -999, active: false });
  const prevMouseRef = useRef({ x: -999, y: -999 });
  const rafRef = useRef<number>(0);

  // ──── IDLE BURN TRACKING ────
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleBurnRef = useRef<number>(0); // 0.0 → 1.0

  const [isEnabled, setIsEnabled] = useState(false);

  // ──── PARTICLE SPAWNER ────
  const spawnParticles = useCallback((x: number, y: number, speed: number, burn = 0) => {
    const pts = particlesRef.current;
    const count = burn > 0
      ? Math.floor(2 + burn * 5)
      : Math.min(SPAWN_RATE + Math.floor(speed * 0.02), 6);

    for (let i = 0; i < count; i++) {
      if (pts.length >= MAX_PARTICLES) pts.shift();

      const angle = Math.random() * Math.PI * 2;
      const spread = (Math.random() * 8) + (Math.random() * burn * 35);

      const rng = Math.random();
      const type: Particle["type"] = burn > 0
        ? (rng < 0.55 ? "smoke" : rng < 0.82 ? "flame" : "ember")
        : (rng < 0.65 ? "flame" : rng < 0.8 ? "ember" : "smoke");

      const maxLife = type === "flame"
        ? 0.4 + Math.random() * 0.35 + burn * 0.3
        : type === "ember"
        ? 0.6 + Math.random() * 0.5 + burn * 0.5
        : 0.9 + Math.random() * 0.8 + burn * 2.0;

      const size = type === "flame"
        ? (14 + Math.random() * 18) * (1 + burn * 0.8)
        : type === "ember"
        ? (3 + Math.random() * 5) * (1 + burn * 0.3)
        : (25 + Math.random() * 20) * (1 + burn * 5);

      const vx = (Math.random() - 0.5) * (2.5 + burn * (type === "smoke" ? 8 : 3));
      const vy = type === "smoke" && burn > 0
        ? -(0.3 + Math.random() * 1.5)
        : -(1.5 + Math.random() * 3 + burn * 2.5);

      pts.push({
        x: x + Math.cos(angle) * spread,
        y: y + Math.sin(angle) * spread,
        vx, vy,
        life: 1.0,
        maxLife, size,
        seed: Math.random() * 1000,
        type,
      });
    }
  }, []);

  // ──── MOUSE HANDLER ────
  const handleMouseMove = useCallback((e: MouseEvent) => {
    const x = e.clientX;
    const y = e.clientY;

    const dx = x - prevMouseRef.current.x;
    const dy = y - prevMouseRef.current.y;
    const speed = Math.sqrt(dx * dx + dy * dy);

    mouseRef.current = { x, y, active: true };
    prevMouseRef.current = { x, y };

    // Kill idle burn
    idleBurnRef.current = 0;
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);

    // Reignite after 1.2s of stillness
    idleTimerRef.current = setTimeout(() => {
      idleBurnRef.current = 0.01;
    }, 1200);

    if (speed > 2) spawnParticles(x, y, speed, 0);
  }, [spawnParticles]);

  // ──── MAIN EFFECT ────
  useEffect(() => {
    setIsEnabled(true);

    const burnCanvas = burnCanvasRef.current;
    const particleCanvas = particleCanvasRef.current;
    if (!burnCanvas || !particleCanvas) return;

    const bCtx = burnCanvas.getContext("2d", { alpha: true });
    const pCtx = particleCanvas.getContext("2d", { alpha: true });
    if (!bCtx || !pCtx) return;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio, 2);
      for (const c of [burnCanvas, particleCanvas]) {
        c.width = window.innerWidth * dpr;
        c.height = window.innerHeight * dpr;
        c.style.width = `${window.innerWidth}px`;
        c.style.height = `${window.innerHeight}px`;
      }
      bCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      pCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
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

    // ──── FLAME COLOR RAMP ────
    const getFlameColor = (life: number, type: Particle["type"]) => {
      let r = 0, g = 0, b = 0, a = 0;
      if (type === "smoke") {
        a = life * 0.3;
        r = 160; g = 140; b = 120;
      } else if (type === "ember") {
        a = Math.min(1, life * 0.9);
        r = 255; g = Math.floor(120 + life * 100); b = Math.floor(20 * life);
      } else {
        if (life > 0.7) {
          const t = (life - 0.7) / 0.3;
          r = 255; g = Math.floor(220 + t * 35); b = Math.floor(80 + t * 120);
          a = 0.6 + t * 0.3;
        } else if (life > 0.4) {
          const t = (life - 0.4) / 0.3;
          r = 255; g = Math.floor(120 + t * 100); b = Math.floor(5 + t * 75);
          a = 0.45 + t * 0.15;
        } else {
          const t = Math.max(0, life / 0.4);
          r = Math.floor(180 + t * 75); g = Math.floor(40 + t * 80); b = 0;
          a = t * 0.4;
        }
      }
      return { r, g, b, a: Math.max(0, a) };
    };

    // ════════════════════════════════════════════
    //  RENDER LOOP
    // ════════════════════════════════════════════
    const render = () => {
      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      const w = window.innerWidth;
      const h = window.innerHeight;

      // Clear both canvases
      bCtx.clearRect(0, 0, w, h);
      pCtx.clearRect(0, 0, w, h);

      const pts = particlesRef.current;
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;
      const burn = idleBurnRef.current;

      // ──── IDLE BURN RAMP ────
      if (burn > 0 && mouseRef.current.active) {
        idleBurnRef.current = Math.min(1.0, burn + dt * 0.3);
        spawnParticles(mx, my, 0, idleBurnRef.current);
      }

      // ════════════════════════════════════════════
      //  BURN CANVAS (mix-blend-mode: multiply)
      //  This ACTUALLY darkens/chars the page beneath
      // ════════════════════════════════════════════
      if (burn > 0.05 && mx > 0 && my > 0) {
        const scorchR = 40 + burn * 140;

        // ── SCORCH HOLE: Jagged edges like burnt paper ──
        bCtx.save();
        bCtx.beginPath();
        const segs = 60;
        for (let s = 0; s <= segs; s++) {
          const theta = (s / segs) * Math.PI * 2;
          const n1 = Math.sin(theta * 5 + now * 0.0015) * 0.18;
          const n2 = Math.sin(theta * 9 + now * 0.002 + 1.7) * 0.12;
          const n3 = Math.sin(theta * 14 + now * 0.0008 + 4.2) * 0.09;
          const n4 = Math.sin(theta * 21 + now * 0.003 + 7.1) * 0.06;
          const jag = 1 + n1 + n2 + n3 + n4;
          const r = scorchR * jag;
          const px = mx + Math.cos(theta) * r;
          const py = my + Math.sin(theta) * r;
          if (s === 0) bCtx.moveTo(px, py);
          else bCtx.lineTo(px, py);
        }
        bCtx.closePath();

        // Fill with dark char (this multiplies over the page = page goes dark)
        const charGrad = bCtx.createRadialGradient(mx, my, 0, mx, my, scorchR);
        charGrad.addColorStop(0, `rgba(8, 3, 0, ${burn * 0.95})`);
        charGrad.addColorStop(0.35, `rgba(15, 5, 0, ${burn * 0.88})`);
        charGrad.addColorStop(0.65, `rgba(30, 10, 2, ${burn * 0.7})`);
        charGrad.addColorStop(0.85, `rgba(50, 18, 3, ${burn * 0.45})`);
        charGrad.addColorStop(1, `rgba(70, 25, 5, 0)`);
        bCtx.fillStyle = charGrad;
        bCtx.fill();

        // ── GLOWING BURN EDGE (the iconic orange rim) ──
        bCtx.shadowColor = `rgba(255, 80, 0, ${burn * 0.95})`;
        bCtx.shadowBlur = 20 + burn * 45;
        bCtx.strokeStyle = `rgba(255, 130, 20, ${burn * 0.95})`;
        bCtx.lineWidth = 3 + burn * 5;
        bCtx.stroke();

        // Second white-hot inner edge
        bCtx.shadowColor = `rgba(255, 200, 80, ${burn * 0.7})`;
        bCtx.shadowBlur = 10 + burn * 20;
        bCtx.strokeStyle = `rgba(255, 220, 100, ${burn * 0.6})`;
        bCtx.lineWidth = 1.5 + burn * 2;
        bCtx.stroke();
        bCtx.restore();

        // ── HEAT DISTORTION ZONE (wide orange haze) ──
        const hazeR = scorchR * 3;
        const haze = bCtx.createRadialGradient(mx, my, scorchR * 0.6, mx, my, hazeR);
        haze.addColorStop(0, `rgba(255, 100, 20, ${burn * 0.15})`);
        haze.addColorStop(0.3, `rgba(255, 60, 10, ${burn * 0.08})`);
        haze.addColorStop(0.6, `rgba(200, 40, 5, ${burn * 0.04})`);
        haze.addColorStop(1, "rgba(0, 0, 0, 0)");
        bCtx.beginPath();
        bCtx.arc(mx, my, hazeR, 0, Math.PI * 2);
        bCtx.fillStyle = haze;
        bCtx.fill();

        // ── EMBER VEIN CRACKS radiating outward ──
        if (burn > 0.25) {
          bCtx.save();
          const veinAlpha = Math.min(1, (burn - 0.25) * 1.8);
          const veinCount = Math.floor(5 + burn * 10);
          for (let v = 0; v < veinCount; v++) {
            const vAngle = (v / veinCount) * Math.PI * 2 + Math.sin(now * 0.0008 + v * 2.3) * 0.4;
            const vLen = scorchR * (0.4 + Math.sin(now * 0.001 + v * 1.7) * 0.15 + 0.3);

            bCtx.beginPath();
            bCtx.moveTo(mx, my);

            // 6 jagged segments per vein
            for (let j = 1; j <= 6; j++) {
              const t = j / 6;
              const wobbleX = Math.sin(now * 0.003 + v * 4 + j * 2.1) * (6 + burn * 10);
              const wobbleY = Math.cos(now * 0.002 + v * 3 + j * 1.7) * (6 + burn * 10);
              bCtx.lineTo(
                mx + Math.cos(vAngle) * vLen * t + wobbleX,
                my + Math.sin(vAngle) * vLen * t + wobbleY
              );
            }

            const pulse = 0.5 + Math.sin(now * 0.005 + v * 1.9) * 0.5;
            bCtx.strokeStyle = `rgba(255, ${160 + Math.floor(pulse * 60)}, ${30 + Math.floor(pulse * 50)}, ${veinAlpha * (0.4 + pulse * 0.5)})`;
            bCtx.lineWidth = 1 + pulse * 2.5;
            bCtx.shadowColor = `rgba(255, 120, 20, ${veinAlpha * pulse * 0.7})`;
            bCtx.shadowBlur = 5 + pulse * 8;
            bCtx.stroke();
          }
          bCtx.restore();
        }
      }

      // ════════════════════════════════════════════
      //  PARTICLE CANVAS (normal blend — fire on top)
      // ════════════════════════════════════════════
      for (let i = pts.length - 1; i >= 0; i--) {
        const p = pts[i];
        p.life -= dt / p.maxLife;
        if (p.life <= 0) { pts.splice(i, 1); continue; }

        const flicker = Math.sin(now * 0.008 + p.seed * 6.28) * 0.8;
        const turbulence = Math.sin(now * 0.012 + p.seed * 3.14) * 0.5;

        p.vy -= dt * (p.type === "smoke" ? 1.5 : 4);
        p.vx += flicker * dt * 3;
        p.x += p.vx * dt * 60;
        p.y += p.vy * dt * 60;
        p.vx *= 0.97;

        const age = 1 - p.life;
        const { r, g, b, a } = getFlameColor(p.life, p.type);
        const color = `rgba(${r}, ${g}, ${b}, ${a.toFixed(3)})`;

        if (p.type === "flame") {
          const sz = Math.max(0.1, p.size * (0.3 + p.life * 0.7));
          const grad = pCtx.createRadialGradient(
            p.x + turbulence, p.y, 0,
            p.x + turbulence, p.y, sz
          );
          grad.addColorStop(0, color);
          grad.addColorStop(0.4, `rgba(${r}, ${g}, ${b}, ${(a * 0.5).toFixed(3)})`);
          grad.addColorStop(1, "rgba(0,0,0,0)");
          pCtx.beginPath();
          pCtx.arc(p.x + turbulence, p.y, sz, 0, Math.PI * 2);
          pCtx.fillStyle = grad;
          pCtx.fill();

        } else if (p.type === "ember") {
          const sz = Math.max(0.1, p.size * p.life);
          pCtx.beginPath();
          pCtx.arc(p.x, p.y, sz, 0, Math.PI * 2);
          pCtx.fillStyle = color;
          pCtx.fill();
          if (p.life > 0.3) {
            const glow = pCtx.createRadialGradient(p.x, p.y, 0, p.x, p.y, sz * 4);
            glow.addColorStop(0, `rgba(255,180,40,${(p.life * 0.15).toFixed(3)})`);
            glow.addColorStop(1, "rgba(255,180,40,0)");
            pCtx.beginPath();
            pCtx.arc(p.x, p.y, sz * 4, 0, Math.PI * 2);
            pCtx.fillStyle = glow;
            pCtx.fill();
          }

        } else {
          const sz = Math.max(0.1, p.size * (0.5 + age * 1.2));
          const grad = pCtx.createRadialGradient(p.x, p.y, 0, p.x, p.y, sz);
          grad.addColorStop(0, color);
          grad.addColorStop(1, "rgba(0,0,0,0)");
          pCtx.beginPath();
          pCtx.arc(p.x, p.y, sz, 0, Math.PI * 2);
          pCtx.fillStyle = grad;
          pCtx.fill();
        }
      }

      // ── Ambient hot spot (always under cursor) ──
      if (mx > 0 && my > 0 && mouseRef.current.active) {
        const m = 1 + burn * 2.5;
        const hotGrad = pCtx.createRadialGradient(mx, my, 0, mx, my, 40 * m);
        hotGrad.addColorStop(0, `rgba(255,200,80,${0.15 + burn * 0.3})`);
        hotGrad.addColorStop(0.3, `rgba(255,140,30,${0.08 + burn * 0.15})`);
        hotGrad.addColorStop(0.7, `rgba(200,60,10,${0.03 + burn * 0.1})`);
        hotGrad.addColorStop(1, "rgba(200,60,10,0)");
        pCtx.beginPath();
        pCtx.arc(mx, my, 40 * m, 0, Math.PI * 2);
        pCtx.fillStyle = hotGrad;
        pCtx.fill();
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
  }, [handleMouseMove, spawnParticles]);

  // HARD KILL: Fully unmount on non-homepage routes
  if (!isHomepage) return null;

  return (
    <>
      {/* BURN LAYER — mix-blend-mode multiplies darkness onto the page beneath */}
      <canvas
        ref={burnCanvasRef}
        className="fixed inset-0 z-[49] pointer-events-none"
        aria-hidden="true"
        style={{ display: isEnabled ? "block" : "none", mixBlendMode: "multiply", isolation: "isolate" }}
      />
      {/* PARTICLE LAYER — fire, embers, smoke rendered on top */}
      <canvas
        ref={particleCanvasRef}
        className="fixed inset-0 z-[50] pointer-events-none"
        aria-hidden="true"
        style={{ display: isEnabled ? "block" : "none" }}
      />
    </>
  );
}
