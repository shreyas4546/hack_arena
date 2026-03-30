"use client";

import React, { useRef, useState, useCallback } from "react";
import { cn } from "@/lib/utils";

interface PremiumCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** The accent glow color, e.g. "rgba(251,146,60,0.15)" */
  glowColor?: string;
  /** Disable the interactive spotlight effect */
  noSpotlight?: boolean;
  /** Disable the lift/scale on hover */
  noLift?: boolean;
}

export default function PremiumCard({
  className,
  children,
  glowColor = "rgba(251,146,60,0.12)",
  noSpotlight = false,
  noLift = false,
  style,
  ...props
}: PremiumCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [spotPos, setSpotPos] = useState({ x: 50, y: 50 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (noSpotlight || !ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      setSpotPos({ x, y });
    },
    [noSpotlight]
  );

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "premium-card group relative overflow-hidden rounded-2xl",
        "bg-white/[0.02] border border-white/[0.05]",
        "backdrop-blur-xl transition-all duration-[400ms] ease-[cubic-bezier(0.23,1,0.32,1)]",
        !noLift && "hover:-translate-y-2 hover:scale-[1.015]",
        "hover:border-orange-500/15",
        "hover:shadow-[0_24px_64px_-16px_rgba(0,0,0,0.6),0_0_30px_-5px_rgba(251,146,60,0.06)]",
        className
      )}
      style={{
        ...style,
        willChange: "transform, box-shadow",
      }}
      {...props}
    >
      {/* ═══ Cursor Spotlight ═══ */}
      {!noSpotlight && (
        <div
          className="pointer-events-none absolute -inset-px z-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{
            background: `radial-gradient(600px circle at ${spotPos.x}% ${spotPos.y}%, ${glowColor}, transparent 40%)`,
          }}
        />
      )}

      {/* ═══ Top Edge Highlight ═══ */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-orange-400/25 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-10" />

      {/* ═══ Corner Accent (top-right) ═══ */}
      <div className="absolute -top-px -right-px w-14 h-14 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
        <div className="absolute top-0 right-0 w-full h-px bg-gradient-to-l from-orange-400/40 to-transparent" />
        <div className="absolute top-0 right-0 h-full w-px bg-gradient-to-b from-orange-400/40 to-transparent" />
      </div>

      {/* ═══ Corner Accent (bottom-left) ═══ */}
      <div className="absolute -bottom-px -left-px w-10 h-10 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-700 delay-100">
        <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-cyan-400/30 to-transparent" />
        <div className="absolute bottom-0 left-0 h-full w-px bg-gradient-to-t from-cyan-400/30 to-transparent" />
      </div>

      {/* ═══ Bottom Border Shimmer ═══ */}
      <div className="absolute bottom-0 left-0 right-0 h-px overflow-hidden z-10">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-[1400ms] ease-in-out" />
      </div>

      {/* ═══ Content ═══ */}
      <div className="relative z-[1]">{children}</div>
    </div>
  );
}
