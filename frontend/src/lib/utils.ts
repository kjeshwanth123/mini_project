import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRiskLevel(level: string): { label: string; color: string; bg: string; text: string } {
  const norm = (level || "low").toLowerCase();
  switch (norm) {
    case "low":
      return {
        label: "Low Risk",
        color: "#10b981",
        bg: "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800",
        text: "text-emerald-700 dark:text-emerald-300",
      };
    case "moderate":
      return {
        label: "Moderate Risk",
        color: "#f59e0b",
        bg: "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800",
        text: "text-amber-700 dark:text-amber-300",
      };
    case "high":
      return {
        label: "High Risk",
        color: "#ef4444",
        bg: "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800",
        text: "text-rose-700 dark:text-rose-300",
      };
    case "critical":
      return {
        label: "Critical Risk",
        color: "#b91c1c",
        bg: "bg-red-100 dark:bg-red-950/60 border-red-300 dark:border-red-700",
        text: "text-red-800 dark:text-red-200",
      };
    default:
      return {
        label: level,
        color: "#64748b",
        bg: "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700",
        text: "text-slate-700 dark:text-slate-300",
      };
  }
}
