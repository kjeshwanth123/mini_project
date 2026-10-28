import React, { useEffect, useState } from "react";
import { AlertCircle, Pill, Search, ShieldAlert } from "lucide-react";
import { Shell } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { apiClient } from "@/services/apiClient";

export function MedicationsPage() {
  const [meds, setMeds] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get("/api/medications")
      .then((res) => setMeds(res.data.items || []))
      .catch((err) => console.error("Medications error", err))
      .finally(() => setLoading(false));
  }, []);

  const filtered = meds.filter((m) =>
    m.medication_name.toLowerCase().includes(search.toLowerCase()) ||
    m.purpose.toLowerCase().includes(search.toLowerCase()) ||
    m.condition.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Shell>
      <div className="space-y-8">
        <div className="pb-2 border-b border-slate-200/80 dark:border-slate-800">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5">
            <Pill className="w-7 h-7 text-indigo-600" />
            Cardiovascular Medication Reference Library
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Educational clinical reference on common cardiovascular drug classes, mechanisms, and cautionary guidelines.
          </p>
        </div>

        {/* Disclaimer */}
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 flex items-start gap-3 text-xs text-amber-800 dark:text-amber-200">
          <ShieldAlert className="w-5 h-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
          <div>
            <span className="font-bold">Educational Reference Notice: </span>
            This catalog is for educational comprehension only and is NOT a medical prescription. Never start, discontinue, or alter doses of any medication without direct clinical consultation with your licensed physician.
          </div>
        </div>

        {/* Search */}
        <div className="max-w-md">
          <Input
            placeholder="Search medications by name, condition, or purpose..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Grid of Medications */}
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400">Loading medication catalog...</div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">No medications matching "{search}".</div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((item) => (
              <Card key={item.id} className="glass-panel-hover flex flex-col justify-between">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base font-bold text-slate-900 dark:text-white">
                      {item.medication_name}
                    </CardTitle>
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-semibold text-slate-600 dark:text-slate-400 capitalize">
                      {item.condition}
                    </span>
                  </div>
                  <CardDescription className="line-clamp-2 mt-1">
                    {item.purpose}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-xs">
                    <span className="font-semibold text-amber-600 dark:text-amber-400 block mb-1">
                      Precautions & Warnings:
                    </span>
                    <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                      {item.warnings}
                    </p>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    <span className="font-medium">Evidence Source: </span>
                    {item.source}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Shell>
  );
}
