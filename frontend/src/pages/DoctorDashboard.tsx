import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Activity, ArrowRight, Eye, Heart, Stethoscope, User, Users } from "lucide-react";
import { Shell } from "@/components/Layout";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { api } from "@/services/apiClient";
import { formatRiskLevel } from "@/lib/utils";

export function DoctorDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getDoctorStats(), api.getPredictionHistory()])
      .then(([s, h]) => {
        setStats(s);
        setHistory(h || []);
      })
      .catch((err) => console.error("Doctor dashboard error", err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Shell>
      <div className="space-y-8">
        {/* Header */}
        <div className="pb-2 border-b border-slate-200/80 dark:border-slate-800">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5">
            <Stethoscope className="w-7 h-7 text-sky-600" />
            Clinician Decision Support Console
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Review assigned patient cohorts, examine longitudinal risk biomarkers, and audit AI predictions.
          </p>
        </div>

        {/* Top Metric Cards */}
        <div className="grid gap-6 sm:grid-cols-3">
          <Card className="glass-panel-hover">
            <CardHeader className="pb-2">
              <CardDescription>Assigned Patients</CardDescription>
              <CardTitle className="text-2xl font-bold">{stats?.total_assigned_patients ?? "--"}</CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-xs text-slate-500">Under active clinical oversight</span>
            </CardContent>
          </Card>

          <Card className="glass-panel-hover">
            <CardHeader className="pb-2">
              <CardDescription>Total Patient Assessments</CardDescription>
              <CardTitle className="text-2xl font-bold">{stats?.total_predictions ?? "--"}</CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-xs text-slate-500">Model-scored risk evaluations</span>
            </CardContent>
          </Card>

          <Card className="glass-panel-hover">
            <CardHeader className="pb-2">
              <CardDescription>High/Critical Risk Alerts</CardDescription>
              <CardTitle className="text-2xl font-bold text-rose-600">
                {history.filter((h) => h.risk_level === "high" || h.risk_level === "critical").length}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-xs text-slate-500">Flagged for clinician review</span>
            </CardContent>
          </Card>
        </div>

        {/* Patient Assessments Table */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Patient Assessments</CardTitle>
            <CardDescription>Longitudinal evaluations and biomarker logs across your patient cohort</CardDescription>
          </CardHeader>
          <CardContent>
            {history.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No patient assessments currently recorded under your clinician roster.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100/70 dark:bg-slate-800/70 text-slate-600 dark:text-slate-400 uppercase font-semibold">
                    <tr>
                      <th className="py-3 px-4 rounded-l-lg">ID</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Result</th>
                      <th className="py-3 px-4">Risk Level</th>
                      <th className="py-3 px-4">Score</th>
                      <th className="py-3 px-4">Resting BP</th>
                      <th className="py-3 px-4">Cholesterol</th>
                      <th className="py-3 px-4 text-right rounded-r-lg">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {history.map((row) => {
                      const riskInfo = formatRiskLevel(row.risk_level);
                      return (
                        <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-4 font-mono text-slate-400">#{row.id}</td>
                          <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                            {new Date(row.created_at).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                            {row.prediction}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full border text-[11px] font-semibold ${riskInfo.bg} ${riskInfo.text}`}
                            >
                              {riskInfo.label}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-bold text-primary">
                            {Math.round(row.probability * 100)}%
                          </td>
                          <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                            {row.resting_bp ? `${row.resting_bp} mmHg` : "--"}
                          </td>
                          <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                            {row.cholesterol ? `${row.cholesterol} mg/dL` : "--"}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Link to={`/predictions/${row.id}`}>
                              <Button variant="outline" size="sm">
                                <Eye className="w-3.5 h-3.5 mr-1" /> Examine
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Shell>
  );
}
