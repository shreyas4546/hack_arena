"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";

interface TooltipProps {
  content: string | React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function Tooltip({ content, children, className }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div 
      className="relative flex items-center justify-center"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div className={cn(
          "absolute bottom-full mb-2 z-50 animate-in fade-in zoom-in-95 duration-200",
          className
        )}>
          <div className="bg-slate-900/90 border border-white/10 backdrop-blur-xl px-2.5 py-1.5 rounded-lg shadow-2xl min-w-[120px]">
            <div className="text-[10px] leading-relaxed font-medium text-slate-300">
              {content}
            </div>
          </div>
          <div className="w-2 h-2 bg-slate-900 border-r border-b border-white/10 rotate-45 absolute -bottom-1 left-1/2 -translate-x-1/2" />
        </div>
      )}
    </div>
  );
}
