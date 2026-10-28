import React from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface TrendPoint {
  id: number;
  created_at: string;
  probability: number;
  risk_level: string;
}

export function RiskTrendChart({ data }: { data: TrendPoint[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-56 flex flex-col items-center justify-center text-slate-400 text-xs italic">
        No assessment history recorded yet. Complete an assessment to see your heart risk timeline.
      </div>
    );
  }

  const chartData = [...data].reverse().map((item, index) => {
    const dateObj = new Date(item.created_at);
    const dateStr = !isNaN(dateObj.getTime())
      ? dateObj.toLocaleDateString(undefined, { month: "short", day: "numeric" })
      : `Test #${index + 1}`;
    return {
      index: index + 1,
      date: dateStr,
      riskPercent: Math.round(item.probability * 100),
      rawProb: item.probability,
      riskLevel: item.risk_level,
    };
  });

  return (
    <div className="w-full h-64 pt-2">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0284c7" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#0284c7" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11 }}
            stroke="#94a3b8"
            tickLine={false}
            axisLine={{ stroke: "#e2e8f0" }}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 11 }}
            stroke="#94a3b8"
            tickLine={false}
            axisLine={{ stroke: "#e2e8f0" }}
            unit="%"
          />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const p = payload[0].payload;
                return (
                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-lg text-xs">
                    <p className="font-semibold text-slate-900 dark:text-white">{p.date}</p>
                    <p className="mt-1 text-primary font-bold">Risk Score: {p.riskPercent}%</p>
                    <p className="text-slate-500 capitalize">Category: {p.riskLevel}</p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Area
            type="monotone"
            dataKey="riskPercent"
            stroke="#0284c7"
            strokeWidth={3}
            fillOpacity={1}
            fill="url(#riskGrad)"
            dot={{ r: 4, fill: "#0284c7", strokeWidth: 2, stroke: "#ffffff" }}
            activeDot={{ r: 6, fill: "#0369a1" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
