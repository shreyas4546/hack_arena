import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="fixed inset-0 z-[99999] bg-[#020202]/80 backdrop-blur-md flex flex-col items-center justify-center">
      <div className="relative flex flex-col items-center gap-6 p-8 rounded-2xl bg-black/40 border border-white/5 shadow-2xl">
        <div className="absolute inset-0 rounded-2xl bg-orange-500/5 blur-xl -z-10" />
        
        {/* Core spinner */}
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-[3px] border-white/5" />
          <div className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-orange-500 animate-[spin_1s_cubic-bezier(0.4,0,0.2,1)_infinite]" />
          <div className="absolute inset-2 rounded-full border-[3px] border-transparent border-b-cyan-500 animate-[spin_1.5s_cubic-bezier(0.4,0,0.2,1)_infinite_reverse]" />
          <Loader2 className="absolute inset-0 m-auto w-6 h-6 text-orange-400 animate-pulse" />
        </div>

        <p className="text-orange-400/80 font-mono text-[10px] uppercase font-bold tracking-[0.3em] animate-pulse">
          Accessing Sector...
        </p>
      </div>
    </div>
  );
}
