import React, { useState } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowDownRight, Sparkles, TrendingDown } from "lucide-react";
import { api, AssessmentInput, SimulationResult } from "@/services/apiClient";
import { Button } from "@/components/ui/Button";
import { formatRiskLevel } from "@/lib/utils";

interface RiskSimulationWidgetProps {
  initialFeatures: AssessmentInput;
}

export function RiskSimulationWidget({ initialFeatures }: RiskSimulationWidgetProps) {
  const [params, setParams] = useState<AssessmentInput>(initialFeatures);
  const [simulation, setSimulation] = useState<SimulationResult | null>(null);
  const [loading, setLoading] = useState(false);

  const runSimulation = async (updatedParams: AssessmentInput) => {
    setLoading(true);
    try {
      const res = await api.simulateRisk(updatedParams);
      setSimulation(res);
    } catch (e) {
      console.error("Simulation failed", e);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    runSimulation(params);
  }, []);

  const handleBpChange = (val: number) => {
    const updated = { ...params, resting_bp: val };
    setParams(updated);
    runSimulation(updated);
  };

  const handleCholChange = (val: number) => {
    const updated = { ...params, cholesterol: val };
    setParams(updated);
    runSimulation(updated);
  };

  const handleHrChange = (val: number) => {
    const updated = { ...params, max_heart_rate: val };
    setParams(updated);
    runSimulation(updated);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-sky-50 dark:bg-sky-950/30 border border-sky-100 dark:border-sky-900/50">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-sky-600 dark:text-sky-400" />
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              What-If Lifestyle & Biomarker Simulator
            </h4>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Simulate how clinical optimizations (lowering BP, controlling lipids, aerobic conditioning) reduce your estimated heart risk over the next 10 years.
          </p>
        </div>
      </div>

      {/* Sliders */}
      <div className="grid gap-6 sm:grid-cols-3 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-semibold">
            <span className="text-slate-700 dark:text-slate-300">Resting Blood Pressure</span>
            <span className="text-primary font-bold">{params.resting_bp} mmHg</span>
          </div>
          <input
            type="range"
            min={90}
            max={200}
            step={1}
            value={params.resting_bp}
            onChange={(e) => handleBpChange(Number(e.target.value))}
            className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-600"
          />
          <div className="flex justify-between text-[10px] text-slate-400">
            <span>Optimal (110)</span>
            <span>Stage 2 (160+)</span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-xs font-semibold">
            <span className="text-slate-700 dark:text-slate-300">Total Cholesterol</span>
            <span className="text-primary font-bold">{params.cholesterol} mg/dL</span>
          </div>
          <input
            type="range"
            min={120}
            max={400}
            step={2}
            value={params.cholesterol}
            onChange={(e) => handleCholChange(Number(e.target.value))}
            className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-600"
          />
          <div className="flex justify-between text-[10px] text-slate-400">
            <span>Desirable (&lt;200)</span>
            <span>High (260+)</span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-xs font-semibold">
            <span className="text-slate-700 dark:text-slate-300">Max Exercise Heart Rate</span>
            <span className="text-primary font-bold">{params.max_heart_rate} bpm</span>
          </div>
          <input
            type="range"
            min={70}
            max={200}
            step={1}
            value={params.max_heart_rate}
            onChange={(e) => handleHrChange(Number(e.target.value))}
            className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-600"
          />
          <div className="flex justify-between text-[10px] text-slate-400">
            <span>Low Reserve (100)</span>
            <span>High Reserve (175)</span>
          </div>
        </div>
      </div>

      {simulation && (
        <div className="space-y-6">
          {/* Counterfactual Scenario Cards */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {simulation.scenarios.map((sc, idx) => {
              const risk = formatRiskLevel(sc.risk_level);
              return (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 shadow-sm flex flex-col justify-between space-y-2"
                >
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">
                      {sc.title}
                    </span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                      {sc.description}
                    </p>
                  </div>
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-base font-extrabold text-slate-900 dark:text-white">
                        {Math.round(sc.probability * 100)}%
                      </span>
                      <span className="text-[10px] ml-1 text-slate-400">risk</span>
                    </div>
                    {sc.delta_percentage > 0 && (
                      <div className="flex items-center text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        <TrendingDown className="w-3.5 h-3.5 mr-0.5" />
                        -{sc.delta_percentage}%
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 10-Year Forecast Timeline */}
          {simulation.forecast_timeline && simulation.forecast_timeline.length > 0 && (
            <div className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  10-Year Future Cardiac Trajectory
                </span>
                <span className="text-[11px] text-slate-500">Current Habits vs Optimized Lifestyle</span>
              </div>
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={simulation.forecast_timeline.map((pt) => ({
                      year: `+${pt.year_offset} yrs (Age ${pt.projected_age})`,
                      baseline: Math.round(pt.baseline_risk * 100),
                      improved: Math.round(pt.improved_risk * 100),
                    }))}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="baseGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="impGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="year" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                    <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const p = payload[0].payload;
                          return (
                            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 shadow-lg text-xs space-y-1">
                              <p className="font-bold text-slate-900 dark:text-white">{p.year}</p>
                              <p className="text-rose-500 font-semibold">Baseline Trajectory: {p.baseline}%</p>
                              <p className="text-emerald-500 font-semibold">Optimized Intervention: {p.improved}%</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="baseline"
                      name="Baseline Trajectory"
                      stroke="#ef4444"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#baseGrad)"
                    />
                    <Area
                      type="monotone"
                      dataKey="improved"
                      name="With Optimization"
                      stroke="#10b981"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#impGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
