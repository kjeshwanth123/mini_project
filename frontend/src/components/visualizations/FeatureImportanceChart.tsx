import React from "react";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface ExplanationItem {
  feature: string;
  contribution: number;
  direction: string;
  text: string;
}

export function FeatureImportanceChart({ items }: { items: ExplanationItem[] }) {
  if (!items || items.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-slate-400 text-xs italic">
        No feature contribution breakdown available for this score.
      </div>
    );
  }

  const chartData = items.slice(0, 6).map((item) => {
    const isIncrease = item.direction.toLowerCase() === "increases";
    const val = Math.abs(item.contribution);
    return {
      feature: item.feature,
      displayFeature: item.feature.replace(/_/g, " "),
      contribution: isIncrease ? val : -val,
      absVal: val,
      direction: item.direction,
      text: item.text,
      isIncrease,
    };
  });

  return (
    <div className="w-full space-y-3">
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
          >
            <XAxis
              type="number"
              tick={{ fontSize: 10 }}
              stroke="#94a3b8"
              domain={["dataMin - 0.1", "dataMax + 0.1"]}
            />
            <YAxis
              type="category"
              dataKey="displayFeature"
              tick={{ fontSize: 11, textAnchor: "end" }}
              stroke="#94a3b8"
              width={90}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const d = payload[0].payload;
                  return (
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 shadow-lg text-xs max-w-xs">
                      <p className="font-bold text-slate-900 dark:text-white capitalize">{d.displayFeature}</p>
                      <p className={`mt-1 font-semibold ${d.isIncrease ? "text-rose-500" : "text-emerald-500"}`}>
                        {d.isIncrease ? "Increases Risk Score" : "Protective / Decreases Risk"}
                      </p>
                      <p className="text-slate-500 dark:text-slate-400 mt-1">{d.text}</p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="contribution" radius={[4, 4, 4, 4]}>
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.isIncrease ? "#ef4444" : "#10b981"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center justify-center gap-6 text-xs text-slate-500">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-rose-500" />
          <span>Increases Risk Score</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-emerald-500" />
          <span>Protective / Lowers Score</span>
        </div>
      </div>
    </div>
  );
}
