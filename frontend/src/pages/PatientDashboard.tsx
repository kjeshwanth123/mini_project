import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Download,
  Eye,
  FileSearch,
  Heart,
  History,
  PlusCircle,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { Shell } from "@/components/Layout";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { RiskGauge } from "@/components/visualizations/RiskGauge";
import { RiskTrendChart } from "@/components/visualizations/RiskTrendChart";
import { VitalsTrendChart } from "@/components/visualizations/VitalsTrendChart";
import { RiskSimulationWidget } from "@/components/visualizations/RiskSimulationWidget";
import { MedicalReportUploadModal } from "@/components/ocr/MedicalReportUploadModal";
import { api, AssessmentInput } from "@/services/apiClient";
import { useAuthStore } from "@/stores/authStore";
import { formatRiskLevel } from "@/lib/utils";

export function PatientDashboard() {
  const { user } = useAuthStore();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ocrModalOpen, setOcrModalOpen] = useState(false);
  const navigate = useNavigate();

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const items = await api.getPredictionHistory();
      setHistory(items || []);
    } catch (err: any) {
      setError(err.message || "Failed to load history.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const latest = history.length > 0 ? history[0] : null;

  // Initial features for simulator based on latest record or standard clinical defaults
  const simulatorFeatures: AssessmentInput = {
    age: latest?.age || 52,
    sex: 1,
    chest_pain_type: 1,
    resting_bp: latest?.resting_bp || 135,
    cholesterol: latest?.cholesterol || 225,
    fasting_blood_sugar: 0,
    resting_ecg: 0,
    max_heart_rate: latest?.max_heart_rate || 148,
    exercise_angina: 0,
    oldpeak: 1.0,
    st_slope: 1,
  };

  const handleApplyExtractedReport = (extracted: Partial<AssessmentInput>) => {
    navigate("/assessment", { state: { prefill: extracted } });
  };

  return (
    <Shell>
      <div className="space-y-8">
        {/* Welcome & Quick Actions Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80 dark:border-slate-800">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
              Welcome back, {user?.name || "Patient"}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Your personalized cardiovascular decision-support dashboard and health trends.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOcrModalOpen(true)}
              className="gap-1.5"
            >
              <FileSearch className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              Upload Medical Report (OCR)
            </Button>
            <Link to="/assessment">
              <Button size="sm" className="gap-1.5 shadow-sm">
                <PlusCircle className="w-4 h-4" />
                New Heart Assessment
              </Button>
            </Link>
          </div>
        </div>

        {/* Top Summary Stats Cards */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {/* Latest Risk Card */}
          <Card className="glass-panel-hover">
            <CardHeader className="pb-2">
              <CardDescription>Latest Prediction</CardDescription>
              <CardTitle className="text-xl">
                {latest ? `${Math.round(latest.probability * 100)}% Risk` : "No Data"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {latest ? (
                <div className="flex items-center justify-between">
                  <div
                    className={`px-2.5 py-0.5 rounded-full border text-xs font-semibold ${
                      formatRiskLevel(latest.risk_level).bg
                    } ${formatRiskLevel(latest.risk_level).text}`}
                  >
                    {formatRiskLevel(latest.risk_level).label}
                  </div>
                  <Link
                    to={`/predictions/${latest.id}`}
                    className="text-xs font-semibold text-primary hover:underline flex items-center"
                  >
                    View Report <ArrowRight className="w-3 h-3 ml-1" />
                  </Link>
                </div>
              ) : (
                <p className="text-xs text-slate-400">Complete an assessment to calculate score.</p>
              )}
            </CardContent>
          </Card>

          {/* Resting Blood Pressure */}
          <Card className="glass-panel-hover">
            <CardHeader className="pb-2">
              <CardDescription>Resting Blood Pressure</CardDescription>
              <CardTitle className="text-xl">
                {latest?.resting_bp ? `${latest.resting_bp} mmHg` : "--"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-slate-500 flex items-center justify-between">
                <span>Target: &lt;120 mmHg</span>
                {latest?.resting_bp && latest.resting_bp >= 130 && (
                  <span className="text-amber-500 font-semibold">Elevated</span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Total Cholesterol */}
          <Card className="glass-panel-hover">
            <CardHeader className="pb-2">
              <CardDescription>Total Cholesterol</CardDescription>
              <CardTitle className="text-xl">
                {latest?.cholesterol ? `${latest.cholesterol} mg/dL` : "--"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-slate-500 flex items-center justify-between">
                <span>Target: &lt;200 mg/dL</span>
                {latest?.cholesterol && latest.cholesterol >= 200 && (
                  <span className="text-amber-500 font-semibold">Borderline/High</span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Max Heart Rate */}
          <Card className="glass-panel-hover">
            <CardHeader className="pb-2">
              <CardDescription>Max Exercise Heart Rate</CardDescription>
              <CardTitle className="text-xl">
                {latest?.max_heart_rate ? `${latest.max_heart_rate} bpm` : "--"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-slate-500 flex items-center justify-between">
                <span>Cardiac reserve indicator</span>
                <span className="text-emerald-500 font-semibold">Recorded</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Dynamic Charts Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Gauge & Score Breakdown */}
          <Card className="lg:col-span-1 flex flex-col justify-between">
            <CardHeader>
              <CardTitle>Current Cardiac Risk Score</CardTitle>
              <CardDescription>Machine learning statistical classification</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center py-4">
              {latest ? (
                <RiskGauge probability={latest.probability} riskLevel={latest.risk_level} size={220} />
              ) : (
                <div className="h-44 flex flex-col items-center justify-center text-center text-slate-400 text-xs">
                  <Heart className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-2" />
                  <span>No completed assessment yet.</span>
                </div>
              )}
            </CardContent>
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 text-center">
              Evaluated by active model: {latest?.model_version || "Production v1.0"}
            </div>
          </Card>

          {/* Historical Risk Trends Chart */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Heart Risk Progression</CardTitle>
                <CardDescription>Calculated risk probability across your assessment timeline</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={loadData} title="Refresh trends">
                <RefreshCw className="w-3.5 h-3.5" />
              </Button>
            </CardHeader>
            <CardContent>
              <RiskTrendChart data={history} />
            </CardContent>
          </Card>
        </div>

        {/* Dual Biomarker Vitals Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Biomarker Tracking (BP, Cholesterol & Heart Rate)</CardTitle>
            <CardDescription>Historical progression of cardiovascular vital signs</CardDescription>
          </CardHeader>
          <CardContent>
            <VitalsTrendChart data={history} />
          </CardContent>
        </Card>

        {/* Interactive Future Risk Simulation & Forecasting */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-sky-600" />
              Interactive Future Risk Forecasting & Counterfactual Simulation
            </CardTitle>
            <CardDescription>
              Test how clinical lifestyle optimizations impact your cardiac risk trajectory over 10 years.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RiskSimulationWidget initialFeatures={simulatorFeatures} />
          </CardContent>
        </Card>

        {/* Recent Assessments Table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Assessment History</CardTitle>
              <CardDescription>Past reports, predictions, and downloadable PDF clinical summaries</CardDescription>
            </div>
            <Link to="/history">
              <Button variant="outline" size="sm">
                View All History
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {history.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No past assessments recorded. Click "New Heart Assessment" to create your first report.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100/70 dark:bg-slate-800/70 text-slate-600 dark:text-slate-400 uppercase font-semibold">
                    <tr>
                      <th className="py-3 px-4 rounded-l-lg">Date</th>
                      <th className="py-3 px-4">Result</th>
                      <th className="py-3 px-4">Model Score</th>
                      <th className="py-3 px-4">Risk Level</th>
                      <th className="py-3 px-4">Resting BP</th>
                      <th className="py-3 px-4">Cholesterol</th>
                      <th className="py-3 px-4 text-right rounded-r-lg">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {history.slice(0, 5).map((row) => {
                      const riskInfo = formatRiskLevel(row.risk_level);
                      return (
                        <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
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
                              className={`inline-block px-2 py-0.5 rounded-full border text-[11px] font-semibold ${riskInfo.bg} ${riskInfo.text}`}
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
                                <Eye className="w-3.5 h-3.5 mr-1" />
                                Details
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

      {/* OCR Medical Report Modal */}
      <MedicalReportUploadModal
        isOpen={ocrModalOpen}
        onClose={() => setOcrModalOpen(false)}
        onApplyExtracted={handleApplyExtractedReport}
      />
    </Shell>
  );
}
