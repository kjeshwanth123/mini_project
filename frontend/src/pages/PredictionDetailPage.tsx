import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CheckCircle,
  Download,
  FileText,
  Heart,
  Info,
  Pill,
  ShieldAlert,
  Sparkles,
  Stethoscope,
} from "lucide-react";
import { Shell } from "@/components/Layout";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { RiskGauge } from "@/components/visualizations/RiskGauge";
import { FeatureImportanceChart } from "@/components/visualizations/FeatureImportanceChart";
import { RiskSimulationWidget } from "@/components/visualizations/RiskSimulationWidget";
import { api, AssessmentInput, PredictionResult } from "@/services/apiClient";
import { formatRiskLevel } from "@/lib/utils";

export function PredictionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "explainability" | "precautions" | "simulate">("overview");

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    api.getPredictionById(Number(id))
      .then(setPrediction)
      .catch((err) => setError(err.message || "Failed to load prediction."))
      .finally(() => setLoading(false));
  }, [id]);

  const handleDownload = async () => {
    if (!prediction) return;
    setDownloading(true);
    try {
      await api.downloadPdf(prediction.id);
    } catch (err) {
      console.error("PDF download failed", err);
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <Shell>
        <div className="py-20 text-center space-y-4">
          <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin mx-auto" />
          <p className="text-sm text-slate-500">Loading prediction analysis...</p>
        </div>
      </Shell>
    );
  }

  if (error || !prediction) {
    return (
      <Shell>
        <div className="max-w-xl mx-auto py-16 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950 flex items-center justify-center text-rose-600 mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold">Prediction Record Not Found</h2>
          <p className="text-xs text-slate-500">{error || "The requested assessment record could not be loaded."}</p>
          <Link to="/dashboard">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-1.5" /> Return to Dashboard
            </Button>
          </Link>
        </div>
      </Shell>
    );
  }

  const riskInfo = formatRiskLevel(prediction.risk_level);
  const initialSimulatorFeatures: AssessmentInput = {
    age: 52,
    sex: 1,
    chest_pain_type: 1,
    resting_bp: 135,
    cholesterol: 220,
    fasting_blood_sugar: 0,
    resting_ecg: 0,
    max_heart_rate: 150,
    exercise_angina: 0,
    oldpeak: 1.0,
    st_slope: 1,
  };

  return (
    <Shell>
      <div className="space-y-8">
        {/* Top Header & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80 dark:border-slate-800">
          <div className="space-y-1">
            <Link to="/dashboard" className="inline-flex items-center text-xs text-slate-500 hover:text-primary mb-1">
              <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back to Dashboard
            </Link>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
              Assessment Report #{prediction.id}
            </h1>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {new Date(prediction.created_at).toLocaleString()}
              </span>
              <span>•</span>
              <span>Model: {prediction.model_name} ({prediction.model_version})</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              isLoading={downloading}
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              Download Official PDF Report
            </Button>
            <Link to="/assessment">
              <Button size="sm">New Assessment</Button>
            </Link>
          </div>
        </div>

        {/* Emergency Alert Banner */}
        {prediction.emergency_warning && (
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-100 flex items-start gap-3 text-xs">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm">CRITICAL ADVISORY: Emergency Symptoms Noted</p>
              <p className="mt-1">
                {prediction.emergency_message || "Acute symptoms were flagged during this assessment. Please seek emergency medical care immediately."}
              </p>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2 overflow-x-auto">
          {[
            { id: "overview", label: "Overview & Score", icon: Heart },
            { id: "explainability", label: "Explainable AI (SHAP)", icon: Sparkles },
            { id: "precautions", label: "Precautions & Lifestyle", icon: Stethoscope },
            { id: "simulate", label: "Future Risk Simulator", icon: FileText },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${
                  active
                    ? "border-sky-600 text-sky-600 dark:text-sky-400"
                    : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === "overview" && (
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="flex flex-col items-center justify-center p-6 text-center">
              <CardTitle className="text-base mb-1">Estimated Risk Probability</CardTitle>
              <CardDescription className="mb-6">Clinical decision-support score</CardDescription>
              <RiskGauge probability={prediction.probability} riskLevel={prediction.risk_level} size={230} />
              <div className="mt-6 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-300 w-full text-left">
                <span className="font-bold block mb-1">Interpretation:</span>
                This score represents the statistical probability of coronary heart disease based on the multi-variate ensemble classifier.
              </div>
            </Card>
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Top Model Contribution Drivers</CardTitle>
                <CardDescription>Features that exerted the greatest statistical impact on your score</CardDescription>
              </CardHeader>
              <CardContent>
                <FeatureImportanceChart items={prediction.explanation} />
              </CardContent>
            </Card>
          </div>
        )}

        {/* TAB 2: EXPLAINABILITY (SHAP) */}
        {activeTab === "explainability" && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-sky-600" />
                  Detailed Feature Contribution Breakdown (Explainable AI)
                </CardTitle>
                <CardDescription>
                  Full breakdown of biomarkers pushing your risk score up or offering protective influence
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <FeatureImportanceChart items={prediction.explanation} />

                <div className="divide-y divide-slate-100 dark:divide-slate-800 border-t border-slate-100 dark:border-slate-800 pt-4">
                  {prediction.explanation.map((item, idx) => (
                    <div key={idx} className="py-3 flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <span className="text-xs font-bold text-slate-900 dark:text-white capitalize">
                          {item.feature.replace(/_/g, " ")}
                        </span>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{item.text}</p>
                      </div>
                      <span
                        className={`text-xs font-bold shrink-0 px-2 py-0.5 rounded-full border ${
                          item.direction.toLowerCase() === "increases"
                            ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800"
                            : "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                        }`}
                      >
                        {item.direction.toUpperCase()}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* TAB 3: PRECAUTIONS & MEDICATIONS */}
        {activeTab === "precautions" && (
          <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Precautions */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Stethoscope className="w-5 h-5 text-teal-600" />
                    Personalized Clinical Precautions
                  </CardTitle>
                  <CardDescription>Targeted lifestyle, dietary, and follow-up guidance</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {prediction.precautions.map((p, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 space-y-1"
                    >
                      <span className="text-xs font-bold text-sky-700 dark:text-sky-300 capitalize">
                        {p.category}
                      </span>
                      <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                        {p.recommendation}
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Educational Medication Reference */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Pill className="w-5 h-5 text-indigo-600" />
                    Relevant Medication Reference (Educational Only)
                  </CardTitle>
                  <CardDescription>
                    Information on drug classes typically evaluated by physicians
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {prediction.medication_information.map((m) => (
                    <div
                      key={m.id}
                      className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 space-y-1 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 dark:text-white">{m.medication_name}</span>
                        <span className="text-[10px] text-slate-400 capitalize">{m.condition}</span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-400">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">Purpose: </span>
                        {m.purpose}
                      </p>
                      <p className="text-slate-500 text-[11px]">
                        <span className="font-semibold text-amber-600">Warnings: </span>
                        {m.warnings}
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Disclaimer */}
            <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800/60 text-xs text-slate-500 italic text-center">
              {prediction.disclaimer}
            </div>
          </div>
        )}

        {/* TAB 4: SIMULATE */}
        {activeTab === "simulate" && (
          <Card>
            <CardHeader>
              <CardTitle>Future Trajectory & Lifestyle Impact Simulation</CardTitle>
              <CardDescription>
                Simulate how reducing blood pressure, lowering cholesterol, or increasing cardiovascular endurance alters your heart disease risk.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RiskSimulationWidget initialFeatures={initialSimulatorFeatures} />
            </CardContent>
          </Card>
        )}
      </div>
    </Shell>
  );
}
