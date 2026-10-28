import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AlertCircle, AlertTriangle, CheckCircle, FileSearch, Heart, Info, Sparkles } from "lucide-react";
import { Shell } from "@/components/Layout";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { MedicalReportUploadModal } from "@/components/ocr/MedicalReportUploadModal";
import { api, AssessmentInput } from "@/services/apiClient";

export function AssessmentPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const prefill = (location.state as any)?.prefill || {};

  const [ocrModalOpen, setOcrModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<AssessmentInput>({
    age: prefill.age || 50,
    sex: prefill.sex !== undefined ? prefill.sex : 1,
    chest_pain_type: prefill.chest_pain_type !== undefined ? prefill.chest_pain_type : 1,
    resting_bp: prefill.resting_bp || 130,
    cholesterol: prefill.cholesterol || 220,
    fasting_blood_sugar: prefill.fasting_blood_sugar !== undefined ? prefill.fasting_blood_sugar : 0,
    resting_ecg: prefill.resting_ecg !== undefined ? prefill.resting_ecg : 0,
    max_heart_rate: prefill.max_heart_rate || 150,
    exercise_angina: prefill.exercise_angina !== undefined ? prefill.exercise_angina : 0,
    oldpeak: prefill.oldpeak !== undefined ? prefill.oldpeak : 1.0,
    st_slope: prefill.st_slope !== undefined ? prefill.st_slope : 1,
    emergency_symptoms: {
      severe_chest_pain: false,
      difficulty_breathing: false,
      fainting: false,
      sudden_weakness: false,
    },
  });

  const handleApplyExtracted = (extracted: Partial<AssessmentInput>) => {
    setFormData((prev) => ({
      ...prev,
      ...extracted,
    }));
  };

  const handleInputChange = (field: keyof AssessmentInput, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSymptomToggle = (symptom: keyof NonNullable<AssessmentInput["emergency_symptoms"]>) => {
    setFormData((prev) => ({
      ...prev,
      emergency_symptoms: {
        ...prev.emergency_symptoms!,
        [symptom]: !prev.emergency_symptoms![symptom],
      },
    }));
  };

  const hasEmergencySymptom = Boolean(
    formData.emergency_symptoms?.severe_chest_pain ||
    formData.emergency_symptoms?.difficulty_breathing ||
    formData.emergency_symptoms?.fainting ||
    formData.emergency_symptoms?.sudden_weakness
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await api.createPrediction(formData);
      navigate(`/predictions/${result.id}`);
    } catch (err: any) {
      setError(err.message || "Failed to process assessment. Please check inputs.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Shell>
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80 dark:border-slate-800">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
              Structured Heart Health Assessment
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Enter your clinical biomarkers or auto-fill directly from an uploaded lab report.
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setOcrModalOpen(true)}
            className="gap-2 shadow-sm"
          >
            <FileSearch className="w-4 h-4" />
            Auto-Fill via Medical Report (OCR)
          </Button>
        </div>

        {/* Emergency Alert Banner if symptoms selected */}
        {hasEmergencySymptom && (
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-100 flex items-start gap-3 text-xs animate-in fade-in duration-200">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm">EMERGENCY ALERT: Potential Acute Cardiac Symptoms</p>
              <p className="mt-1">
                You indicated severe chest pain, breathlessness, fainting, or sudden weakness. This application is an educational decision-support tool, not an emergency triage service. If you are experiencing these symptoms right now, call local emergency services (911 / 112) immediately.
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Card 1: Demographics & Chest Pain */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">1. Patient Profile & Clinical Presentation</CardTitle>
              <CardDescription>Core demographic and symptom presentation features</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-3">
              <Input
                label="Age (Years)"
                type="number"
                min={18}
                max={110}
                value={formData.age}
                onChange={(e) => handleInputChange("age", Number(e.target.value))}
                required
              />

              <Select
                label="Biological Sex"
                value={formData.sex}
                onChange={(e) => handleInputChange("sex", Number(e.target.value))}
                options={[
                  { label: "Male (1)", value: 1 },
                  { label: "Female (0)", value: 0 },
                ]}
              />

              <Select
                label="Chest Pain Type"
                value={formData.chest_pain_type}
                onChange={(e) => handleInputChange("chest_pain_type", Number(e.target.value))}
                options={[
                  { label: "Typical Angina (0)", value: 0 },
                  { label: "Atypical Angina (1)", value: 1 },
                  { label: "Non-anginal Pain (2)", value: 2 },
                  { label: "Asymptomatic (3)", value: 3 },
                ]}
              />
            </CardContent>
          </Card>

          {/* Card 2: Hemodynamics & Lipids */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">2. Hemodynamics & Laboratory Biomarkers</CardTitle>
              <CardDescription>Resting blood pressure, lipid profile, and glycemic index</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-3">
              <Input
                label="Resting Blood Pressure (mmHg)"
                type="number"
                min={70}
                max={240}
                value={formData.resting_bp}
                onChange={(e) => handleInputChange("resting_bp", Number(e.target.value))}
                helperText="Systolic pressure at rest (e.g. 120 mmHg)"
                required
              />

              <Input
                label="Serum Cholesterol (mg/dL)"
                type="number"
                min={80}
                max={600}
                value={formData.cholesterol}
                onChange={(e) => handleInputChange("cholesterol", Number(e.target.value))}
                helperText="Total serum cholesterol (&lt;200 is desirable)"
                required
              />

              <Select
                label="Fasting Blood Sugar > 120 mg/dL"
                value={formData.fasting_blood_sugar}
                onChange={(e) => handleInputChange("fasting_blood_sugar", Number(e.target.value))}
                options={[
                  { label: "No / Normal (<=120 mg/dL)", value: 0 },
                  { label: "Yes / Elevated (>120 mg/dL)", value: 1 },
                ]}
              />
            </CardContent>
          </Card>

          {/* Card 3: Electrocardiogram & Stress Testing */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">3. Electrocardiogram (ECG) & Stress Metrics</CardTitle>
              <CardDescription>Resting ECG findings and exercise response parameters</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Select
                label="Resting ECG Results"
                value={formData.resting_ecg}
                onChange={(e) => handleInputChange("resting_ecg", Number(e.target.value))}
                options={[
                  { label: "Normal Sinus (0)", value: 0 },
                  { label: "ST-T Wave Abnormality (1)", value: 1 },
                  { label: "Left Ventricular Hypertrophy (2)", value: 2 },
                ]}
              />

              <Input
                label="Maximum Heart Rate (bpm)"
                type="number"
                min={60}
                max={220}
                value={formData.max_heart_rate}
                onChange={(e) => handleInputChange("max_heart_rate", Number(e.target.value))}
                helperText="Peak heart rate achieved on exertion"
                required
              />

              <Select
                label="Exercise-Induced Angina"
                value={formData.exercise_angina}
                onChange={(e) => handleInputChange("exercise_angina", Number(e.target.value))}
                options={[
                  { label: "No (0)", value: 0 },
                  { label: "Yes (1)", value: 1 },
                ]}
              />

              <Input
                label="ST Depression / Oldpeak (mm)"
                type="number"
                step="0.1"
                min={-3}
                max={8}
                value={formData.oldpeak}
                onChange={(e) => handleInputChange("oldpeak", Number(e.target.value))}
                helperText="ST depression induced by exercise relative to rest"
                required
              />

              <Select
                label="Slope of Peak Exercise ST Segment"
                value={formData.st_slope}
                onChange={(e) => handleInputChange("st_slope", Number(e.target.value))}
                options={[
                  { label: "Upsloping (0)", value: 0 },
                  { label: "Flat (1)", value: 1 },
                  { label: "Downsloping (2)", value: 2 },
                ]}
              />
            </CardContent>
          </Card>

          {/* Card 4: Emergency Symptoms Checklist */}
          <Card className="border-amber-200 dark:border-amber-900/40 bg-amber-50/20 dark:bg-amber-950/10">
            <CardHeader>
              <CardTitle className="text-base text-amber-900 dark:text-amber-300">
                4. Acute Symptoms & Red Flags (Optional)
              </CardTitle>
              <CardDescription>
                Check any acute warning signs present currently or within the past 24 hours
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
                <input
                  type="checkbox"
                  checked={formData.emergency_symptoms?.severe_chest_pain}
                  onChange={() => handleSymptomToggle("severe_chest_pain")}
                  className="rounded text-rose-600 focus:ring-rose-500 w-4 h-4"
                />
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Severe or crushing chest pain / pressure
                </span>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
                <input
                  type="checkbox"
                  checked={formData.emergency_symptoms?.difficulty_breathing}
                  onChange={() => handleSymptomToggle("difficulty_breathing")}
                  className="rounded text-rose-600 focus:ring-rose-500 w-4 h-4"
                />
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Difficulty breathing / severe shortness of breath
                </span>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
                <input
                  type="checkbox"
                  checked={formData.emergency_symptoms?.fainting}
                  onChange={() => handleSymptomToggle("fainting")}
                  className="rounded text-rose-600 focus:ring-rose-500 w-4 h-4"
                />
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Fainting, syncope, or loss of consciousness
                </span>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
                <input
                  type="checkbox"
                  checked={formData.emergency_symptoms?.sudden_weakness}
                  onChange={() => handleSymptomToggle("sudden_weakness")}
                  className="rounded text-rose-600 focus:ring-rose-500 w-4 h-4"
                />
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Sudden weakness or numbness in arm / face
                </span>
              </label>
            </CardContent>
          </Card>

          {/* Submit Action */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200 dark:border-slate-800">
            <p className="text-xs text-slate-500 max-w-md">
              By submitting, your parameters will be evaluated by the trained ensemble machine learning classifier. Results are recorded securely in your account.
            </p>
            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full sm:w-auto shadow-lg shadow-sky-500/25"
              isLoading={loading}
            >
              <Heart className="w-4 h-4 mr-2 fill-white" />
              Calculate Cardiac Risk
            </Button>
          </div>
        </form>
      </div>

      {/* OCR Modal */}
      <MedicalReportUploadModal
        isOpen={ocrModalOpen}
        onClose={() => setOcrModalOpen(false)}
        onApplyExtracted={handleApplyExtracted}
      />
    </Shell>
  );
}
