import React, { useRef, useState } from "react";
import { AlertCircle, CheckCircle2, FileText, Loader2, Sparkles, Upload } from "lucide-react";
import { api, AssessmentInput, OcrResult } from "@/services/apiClient";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

interface MedicalReportUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyExtracted: (features: Partial<AssessmentInput>) => void;
}

export function MedicalReportUploadModal({ isOpen, onClose, onApplyExtracted }: MedicalReportUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<OcrResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
      setResult(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
      setError(null);
      setResult(null);
    }
  };

  const handleUploadAndExtract = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.extractReportOcr(file);
      setResult(data);
    } catch (err: any) {
      setError(err.message || "Failed to extract medical report.");
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (result && result.extracted_features) {
      onApplyExtracted(result.extracted_features);
      onClose();
    }
  };

  const reset = () => {
    setFile(null);
    setResult(null);
    setError(null);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Intelligent Medical Report Extraction (OCR)"
      description="Upload your lab test result, hospital report, or ECG summary (PDF, PNG, JPG) to automatically extract cardiological biomarkers."
      maxWidth="2xl"
    >
      <div className="space-y-5">
        {!result ? (
          <>
            {/* Upload Drag & Drop Area */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-sky-500 dark:hover:border-sky-400 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-slate-50/50 dark:bg-slate-900/50"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="w-12 h-12 rounded-full bg-sky-100 dark:bg-sky-950/60 flex items-center justify-center text-sky-600 dark:text-sky-400 mb-3">
                <Upload className="w-6 h-6" />
              </div>
              {file ? (
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{file.name}</p>
                  <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB — Ready to analyze</p>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    Click to browse or drag and drop your report
                  </p>
                  <p className="text-xs text-slate-500">Supports PDF, PNG, JPG, JPEG (up to 10 MB)</p>
                </div>
              )}
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-300">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                disabled={!file || loading}
                isLoading={loading}
                onClick={handleUploadAndExtract}
              >
                Extract Biomarkers
              </Button>
            </div>
          </>
        ) : (
          /* Extraction Results View */
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                  Intelligent Extraction Complete
                </h4>
                <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-0.5">{result.summary}</p>
              </div>
            </div>

            {/* Extracted Parameters Table */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden text-xs">
              <div className="bg-slate-100 dark:bg-slate-800/80 px-4 py-2 font-semibold text-slate-700 dark:text-slate-300">
                Extracted Cardiological Parameters
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800 p-2 max-h-56 overflow-y-auto">
                {Object.entries(result.extracted_features).map(([key, val]) => (
                  <div key={key} className="flex items-center justify-between py-1.5 px-2">
                    <span className="capitalize font-medium text-slate-700 dark:text-slate-300">
                      {key.replace(/_/g, " ")}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-white">{String(val)}</span>
                      {result.confidence[key] && (
                        <Badge variant="secondary" className="text-[10px] py-0 px-1.5">
                          {Math.round(result.confidence[key] * 100)}% Match
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Clinical Flags if any */}
            {result.flags && result.flags.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Flagged Findings</span>
                <div className="flex flex-wrap gap-1.5">
                  {result.flags.map((flag, idx) => (
                    <Badge key={idx} variant="high" className="text-xs">
                      {flag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-between items-center pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button variant="ghost" size="sm" onClick={reset}>
                Upload Another Report
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={onClose}>
                  Close
                </Button>
                <Button variant="primary" size="sm" onClick={handleApply}>
                  <Sparkles className="w-4 h-4 mr-1.5 text-sky-200" />
                  Auto-Fill Form
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
