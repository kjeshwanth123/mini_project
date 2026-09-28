import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import {
  AdminPage,
  Assessment,
  AssistantPage,
  AuthForm,
  Dashboard,
  DoctorPage,
  DoctorPatientPage,
  HistoryPage,
  Home,
  Medications,
  PredictionPage,
  TrendsPage,
} from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<AuthForm mode="login" />} />
        <Route path="/register" element={<AuthForm mode="register" />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/assessment" element={<Assessment />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/trends" element={<TrendsPage />} />
        <Route path="/prediction/:id" element={<PredictionPage />} />
        <Route path="/reports" element={<HistoryPage />} />
        <Route path="/medications" element={<Medications />} />
        <Route path="/assistant" element={<AssistantPage />} />
        <Route path="/doctor" element={<DoctorPage />} />
        <Route path="/doctor/patients" element={<DoctorPage />} />
        <Route path="/doctor/patients/:id" element={<DoctorPatientPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/admin/users" element={<AdminPage />} />
        <Route path="/admin/models" element={<AdminPage />} />
        <Route path="/admin/audit-logs" element={<AdminPage />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
