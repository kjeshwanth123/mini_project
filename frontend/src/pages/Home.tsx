import React from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  Bot,
  BrainCircuit,
  CheckCircle,
  FileSearch,
  Heart,
  LineChart,
  Lock,
  ShieldAlert,
  Sparkles,
  Stethoscope,
} from "lucide-react";
import { Shell } from "@/components/Layout";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { useAuthStore } from "@/stores/authStore";

export function Home() {
  const { isAuthenticated, user } = useAuthStore();

  const getDashboardPath = () => {
    if (!user) return "/dashboard";
    if (user.role === "admin") return "/admin";
    if (user.role === "doctor") return "/doctor";
    return "/dashboard";
  };

  return (
    <Shell>
      <div className="space-y-16 py-4">
        {/* Hero Section */}
        <section className="relative overflow-hidden rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-gradient-to-br from-white via-sky-50/40 to-teal-50/30 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800/50 p-8 sm:p-12 shadow-glass dark:shadow-glass-dark">
          <div className="max-w-3xl space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-100 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Next-Gen Cardiological Decision Support</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.15]">
              AI-Powered Heart Disease Risk Prediction & Health Intelligence
            </h1>

            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
              Empowering patients and clinicians with machine learning risk stratification, explainable SHAP biomarkers, intelligent medical report OCR extraction, and interactive lifestyle forecasting.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              {isAuthenticated ? (
                <Link to={getDashboardPath()}>
                  <Button size="lg" className="shadow-lg shadow-sky-500/25">
                    Go to Your Dashboard
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              ) : (
                <>
                  <Link to="/register">
                    <Button size="lg" className="shadow-lg shadow-sky-500/25">
                      Start Heart Assessment
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                  <Link to="/login">
                    <Button variant="outline" size="lg">
                      Sign In to Account
                    </Button>
                  </Link>
                </>
              )}
            </div>

            {/* Medical Disclaimer Banner */}
            <div className="mt-8 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 flex items-start gap-3 text-xs text-amber-800 dark:text-amber-200">
              <ShieldAlert className="w-5 h-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div>
                <span className="font-bold">Medical Decision Support Notice: </span>
                This system provides educational statistical risk assessments based on clinical models. It does not replace professional diagnosis, treatment, or clinical consultation. In case of acute chest pain or emergency symptoms, seek immediate emergency medical care.
              </div>
            </div>
          </div>
        </section>

        {/* Feature Cards Grid */}
        <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="glass-panel-hover">
            <CardContent className="p-6 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-sky-100 dark:bg-sky-950 flex items-center justify-center text-sky-600 dark:text-sky-400">
                <BrainCircuit className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Multi-Model ML Inference
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Trained on standardized clinical datasets using Logistic Regression, Random Forests, Decision Trees, and XGBoost classifiers with ROC-AUC optimization.
              </p>
            </CardContent>
          </Card>

          <Card className="glass-panel-hover">
            <CardContent className="p-6 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-950 flex items-center justify-center text-teal-600 dark:text-teal-400">
                <FileSearch className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Intelligent Medical Report OCR
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Upload laboratory test results or ECG summaries in PDF, PNG, or JPG formats. Extracts Blood Pressure, Cholesterol, FBS, and ST depression with confidence metrics.
              </p>
            </CardContent>
          </Card>

          <Card className="glass-panel-hover">
            <CardContent className="p-6 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <Activity className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Explainable AI (SHAP)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Clear feature contribution transparency showing which biomarkers contributed most to the risk prediction rather than black-box outputs.
              </p>
            </CardContent>
          </Card>

          <Card className="glass-panel-hover">
            <CardContent className="p-6 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <LineChart className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                What-If Risk Simulation
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Interactive sliders simulate the impact of lifestyle modifications (reducing blood pressure, lowering LDL, aerobic conditioning) over a 10-year trajectory.
              </p>
            </CardContent>
          </Card>

          <Card className="glass-panel-hover">
            <CardContent className="p-6 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950 flex items-center justify-center text-purple-600 dark:text-purple-400">
                <Bot className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                RAG AI Health Assistant
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Grounded conversational assistant powered by Retrieval-Augmented Generation across cardiological guidelines, lab references, and medication precautions.
              </p>
            </CardContent>
          </Card>

          <Card className="glass-panel-hover">
            <CardContent className="p-6 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950 flex items-center justify-center text-rose-600 dark:text-rose-400">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Healthcare Security & RBAC
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Role-Based Access Control separating patient privacy, clinician oversight, and administrator governance with JWT authentication and audit trails.
              </p>
            </CardContent>
          </Card>
        </section>
      </div>
    </Shell>
  );
}
