import React from "react";
import { formatRiskLevel } from "@/lib/utils";

interface RiskGaugeProps {
  probability: number;
  riskLevel: string;
  size?: number;
}

export function RiskGauge({ probability, riskLevel, size = 200 }: RiskGaugeProps) {
  const percentage = Math.round(probability * 100);
  const riskInfo = formatRiskLevel(riskLevel);

  // SVG Gauge calculations (semi-circle)
  const strokeWidth = 16;
  const radius = (size - strokeWidth) / 2;
  const circumference = Math.PI * radius; // Half-circle circumference
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center relative" style={{ width: size, height: size * 0.75 }}>
      <svg width={size} height={size * 0.65} viewBox={`0 0 ${size} ${size * 0.65}`} className="overflow-visible">
        <defs>
          <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="50%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#ef4444" />
          </linearGradient>
        </defs>

        {/* Background Arc */}
        <path
          d={`M ${strokeWidth / 2},${size / 2} A ${radius},${radius} 0 0,1 ${size - strokeWidth / 2},${size / 2}`}
          fill="none"
          stroke="currentColor"
          className="text-slate-200 dark:text-slate-800"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />

        {/* Active Arc */}
        <path
          d={`M ${strokeWidth / 2},${size / 2} A ${radius},${radius} 0 0,1 ${size - strokeWidth / 2},${size / 2}`}
          fill="none"
          stroke={riskInfo.color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>

      {/* Center Value */}
      <div className="absolute top-[35%] flex flex-col items-center justify-center">
        <span className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
          {percentage}%
        </span>
        <span className="text-xs uppercase tracking-wider font-semibold text-slate-400 dark:text-slate-500">
          Model Score
        </span>
        <div className={`mt-2 px-3 py-0.5 rounded-full border text-xs font-semibold ${riskInfo.bg} ${riskInfo.text}`}>
          {riskInfo.label}
        </div>
      </div>
    </div>
  );
}
