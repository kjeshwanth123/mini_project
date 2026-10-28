import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Download, Eye, FileText, Heart, History, PlusCircle } from "lucide-react";
import { Shell } from "@/components/Layout";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { api } from "@/services/apiClient";
import { formatRiskLevel } from "@/lib/utils";

export function HistoryPage() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getPredictionHistory()
      .then((items) => setHistory(items || []))
      .catch((err) => console.error("History error", err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Shell>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80 dark:border-slate-800">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <History className="w-7 h-7 text-sky-600" />
              Complete Assessment History
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Review all historical heart evaluations, biomarker snapshots, and download PDF clinical summaries.
            </p>
          </div>
          <Link to="/assessment">
            <Button size="sm" className="gap-1.5">
              <PlusCircle className="w-4 h-4" /> New Assessment
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Historical Record Logs</CardTitle>
            <CardDescription>Chronological list of machine learning predictions</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-12 text-center text-xs text-slate-400">Loading history...</div>
            ) : history.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                No past assessments recorded. Click "New Assessment" to perform your first evaluation.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100/70 dark:bg-slate-800/70 text-slate-600 dark:text-slate-400 uppercase font-semibold">
                    <tr>
                      <th className="py-3 px-4 rounded-l-lg">ID</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Result</th>
                      <th className="py-3 px-4">Probability</th>
                      <th className="py-3 px-4">Risk Classification</th>
                      <th className="py-3 px-4">Resting BP</th>
                      <th className="py-3 px-4">Cholesterol</th>
                      <th className="py-3 px-4 text-right rounded-r-lg">Actions</th>
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
                          <td className="py-3 px-4 font-bold text-primary">
                            {Math.round(row.probability * 100)}%
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full border text-[11px] font-semibold ${riskInfo.bg} ${riskInfo.text}`}
                            >
                              {riskInfo.label}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                            {row.resting_bp || "--"} mmHg
                          </td>
                          <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                            {row.cholesterol || "--"} mg/dL
                          </td>
                          <td className="py-3 px-4 text-right space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => api.downloadPdf(row.id)}
                              title="Download PDF"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </Button>
                            <Link to={`/predictions/${row.id}`}>
                              <Button variant="outline" size="sm">
                                <Eye className="w-3.5 h-3.5 mr-1" /> View Details
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
