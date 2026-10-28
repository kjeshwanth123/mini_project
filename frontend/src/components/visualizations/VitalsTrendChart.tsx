import React from "react";
import { Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface VitalPoint {
  id: number;
  created_at: string;
  resting_bp?: number;
  cholesterol?: number;
  max_heart_rate?: number;
}

export function VitalsTrendChart({ data }: { data: VitalPoint[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-56 flex flex-col items-center justify-center text-slate-400 text-xs italic">
        No vitals history recorded yet.
      </div>
    );
  }

  const chartData = [...data].reverse().map((item, index) => {
    const dateObj = new Date(item.created_at);
    const dateStr = !isNaN(dateObj.getTime())
      ? dateObj.toLocaleDateString(undefined, { month: "short", day: "numeric" })
      : `#${index + 1}`;
    return {
      date: dateStr,
      bp: item.resting_bp || 0,
      cholesterol: item.cholesterol || 0,
      maxHr: item.max_heart_rate || 0,
    };
  });

  return (
    <div className="w-full h-64 pt-2">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11 }}
            stroke="#94a3b8"
            tickLine={false}
            axisLine={{ stroke: "#e2e8f0" }}
          />
          <YAxis
            tick={{ fontSize: 11 }}
            stroke="#94a3b8"
            tickLine={false}
            axisLine={{ stroke: "#e2e8f0" }}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                return (
                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-lg text-xs space-y-1">
                    <p className="font-semibold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-1 mb-1">
                      {label}
                    </p>
                    {payload.map((entry: any) => (
                      <div key={entry.name} className="flex justify-between gap-4">
                        <span style={{ color: entry.color }} className="font-medium">
                          {entry.name}:
                        </span>
                        <span className="font-bold text-slate-700 dark:text-slate-200">
                          {entry.value} {entry.name.includes("BP") ? "mmHg" : entry.name.includes("Chol") ? "mg/dL" : "bpm"}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              }
              return null;
            }}
          />
          <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
          <Line
            type="monotone"
            dataKey="bp"
            name="Resting BP"
            stroke="#ef4444"
            strokeWidth={2.5}
            dot={{ r: 3 }}
          />
          <Line
            type="monotone"
            dataKey="cholesterol"
            name="Cholesterol"
            stroke="#0ea5e9"
            strokeWidth={2.5}
            dot={{ r: 3 }}
          />
          <Line
            type="monotone"
            dataKey="maxHr"
            name="Max HR"
            stroke="#10b981"
            strokeWidth={2}
            strokeDasharray="4 4"
            dot={{ r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
