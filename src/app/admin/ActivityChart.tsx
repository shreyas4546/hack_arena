"use client";

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar
} from "recharts";
import { BarChart3 } from "lucide-react";

type ActivityChartProps = {
  data: { time: string; activeTeams: number; commits: number }[];
  mode: "commits" | "activeTeams";
  loading: boolean;
};

export default function ActivityChart({ data, mode, loading }: ActivityChartProps) {
  if (loading) {
    return (
      <div className="h-full w-full bg-slate-800/20 rounded-xl animate-pulse flex items-center justify-center">
        <BarChart3 className="w-8 h-8 text-slate-700" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center text-slate-500 gap-2">
        <BarChart3 className="w-10 h-10 text-slate-700" />
        <p className="text-sm font-medium">No activity data available</p>
      </div>
    );
  }

  const tooltipStyle = {
    backgroundColor: "#0f172a",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "12px",
    fontSize: "12px",
    padding: "8px 12px",
    boxShadow: "0 10px 25px rgba(0,0,0,0.3)",
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      {mode === "commits" ? (
        <BarChart data={data} barSize={18}>
          <defs>
            <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.85} />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.15} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
          <XAxis dataKey="time" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} width={28} allowDecimals={false} />
          <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "#94a3b8" }} itemStyle={{ color: "#22d3ee" }} cursor={{ fill: "rgba(255,255,255,0.02)" }} />
          <Bar dataKey="commits" fill="url(#barGrad)" radius={[6, 6, 0, 0]} animationDuration={600} animationEasing="ease-out" />
        </BarChart>
      ) : (
        <AreaChart data={data}>
          <defs>
            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#a78bfa" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
          <XAxis dataKey="time" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} width={28} allowDecimals={false} />
          <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "#94a3b8" }} itemStyle={{ color: "#a78bfa" }} />
          <Area type="monotone" dataKey="activeTeams" stroke="#a78bfa" strokeWidth={2.5} fill="url(#areaGrad)" dot={{ fill: "#a78bfa", r: 3, strokeWidth: 0 }} activeDot={{ r: 6, fill: "#a78bfa", stroke: "#0f172a", strokeWidth: 2 }} animationDuration={600} animationEasing="ease-out" />
        </AreaChart>
      )}
    </ResponsiveContainer>
  );
}
