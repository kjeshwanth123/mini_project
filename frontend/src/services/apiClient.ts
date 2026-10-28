import axios, { AxiosError } from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000,
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("cardio_token");
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ detail?: string; message?: string }>) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("cardio_token");
      if (window.location.pathname !== "/login" && window.location.pathname !== "/register") {
        window.location.href = "/login";
      }
    }
    const message = error.response?.data?.detail || error.response?.data?.message || error.message || "An unexpected error occurred.";
    return Promise.reject(new Error(message));
  }
);

// Types
export interface AssessmentInput {
  age: number;
  sex: number;
  chest_pain_type: number;
  resting_bp: number;
  cholesterol: number;
  fasting_blood_sugar: number;
  resting_ecg: number;
  max_heart_rate: number;
  exercise_angina: number;
  oldpeak: number;
  st_slope: number;
  emergency_symptoms?: {
    severe_chest_pain: boolean;
    difficulty_breathing: boolean;
    fainting: boolean;
    sudden_weakness: boolean;
  };
}

export interface PredictionResult {
  id: number;
  health_record_id: number;
  prediction: string;
  probability: number;
  risk_level: "low" | "moderate" | "high" | "critical";
  model_version: string;
  model_name: string;
  explanation: { feature: string; contribution: number; direction: string; text: string }[];
  precautions: { category: string; recommendation: string }[];
  medication_information: {
    id: number;
    medication_name: string;
    purpose: string;
    warnings: string;
    condition: string;
  }[];
  emergency_warning: boolean;
  emergency_message?: string | null;
  disclaimer: string;
  created_at: string;
}

export interface SimulationScenario {
  title: string;
  description: string;
  probability: number;
  risk_level: string;
  delta_percentage: number;
}

export interface SimulationResult {
  current_probability: number;
  current_risk_level: string;
  scenarios: SimulationScenario[];
  forecast_timeline: {
    year_offset: number;
    projected_age: number;
    baseline_risk: number;
    improved_risk: number;
  }[];
  actionable_insights: string[];
}

export interface OcrResult {
  filename: string;
  file_size: number;
  text_length: number;
  extracted_features: Partial<AssessmentInput>;
  confidence: Record<string, number>;
  flags: string[];
  summary: string;
  raw_text_snippet: string;
}

// API Methods
export const api = {
  // Auth
  login: async (email: string, password: string) => {
    const res = await apiClient.post("/api/auth/login", { email, password });
    return res.data;
  },
  register: async (name: string, email: string, password: string, role: string = "patient") => {
    const res = await apiClient.post("/api/auth/register", { name, email, password, role });
    return res.data;
  },
  getMe: async () => {
    const res = await apiClient.get("/api/auth/me");
    return res.data;
  },

  // Predictions
  createPrediction: async (data: AssessmentInput): Promise<PredictionResult> => {
    const res = await apiClient.post("/api/predictions", data);
    return res.data;
  },
  getPredictionHistory: async (patientId?: number) => {
    const res = await apiClient.get("/api/predictions/history", {
      params: patientId ? { patient_id: patientId } : {},
    });
    return res.data.items;
  },
  getPredictionById: async (id: number): Promise<PredictionResult> => {
    const res = await apiClient.get(`/api/predictions/${id}`);
    return res.data;
  },
  simulateRisk: async (data: AssessmentInput): Promise<SimulationResult> => {
    const res = await apiClient.post("/api/predictions/simulate", data);
    return res.data;
  },

  // OCR
  extractReportOcr: async (file: File): Promise<OcrResult> => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await apiClient.post("/api/reports/ocr-extract", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },

  // Assistant Chat
  chat: async (message: string, patientContext?: any, reportText?: string) => {
    const res = await apiClient.post("/api/assistant/chat", {
      message,
      patient_context: patientContext,
      report_text: reportText,
    });
    return res.data;
  },

  // Reports
  downloadPdf: async (predictionId: number) => {
    const res = await apiClient.get(`/api/reports/${predictionId}/pdf`, {
      responseType: "blob",
    });
    const blob = new Blob([res.data], { type: "application/pdf" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `heart_report_${predictionId}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  // Admin / Doctor
  getAdminStats: async () => {
    const res = await apiClient.get("/api/admin/stats");
    return res.data;
  },
  getDoctorStats: async () => {
    const res = await apiClient.get("/api/doctor/stats");
    return res.data;
  },
};
