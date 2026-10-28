import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlertCircle, Heart, UserPlus } from "lucide-react";
import { Shell } from "@/components/Layout";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { api } from "@/services/apiClient";
import { useAuthStore } from "@/stores/authStore";

export function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("patient");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      setError("Please fill in all required fields.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      await api.register(name, email, password, role);
      // Automatically log in after registration
      const data = await api.login(email, password);
      localStorage.setItem("cardio_token", data.access_token);
      const meData = await api.getMe();

      setAuth(data.access_token, meData.user, meData.patient_profile_id);

      if (meData.user.role === "admin") {
        navigate("/admin");
      } else if (meData.user.role === "doctor") {
        navigate("/doctor");
      } else {
        navigate("/dashboard");
      }
    } catch (err: any) {
      setError(err.message || "Registration failed. Email may already be in use.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Shell>
      <div className="flex items-center justify-center min-h-[70vh] py-12">
        <Card className="w-full max-w-md shadow-glass dark:shadow-glass-dark">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-teal-100 dark:bg-teal-950 flex items-center justify-center text-teal-600 dark:text-teal-400 mb-1">
              <UserPlus className="w-6 h-6" />
            </div>
            <CardTitle className="text-2xl font-bold">Create an Account</CardTitle>
            <CardDescription>
              Register as a patient or clinician to begin heart health monitoring
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-300">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
                  <span>{error}</span>
                </div>
              )}

              <Input
                label="Full Name"
                type="text"
                placeholder="Dr. Sarah Johnson or John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />

              <Input
                label="Email Address"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <Input
                label="Password (min 8 characters)"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />

              <Select
                label="Account Role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                options={[
                  { label: "Patient (Risk Prediction & Tracking)", value: "patient" },
                  { label: "Doctor / Clinician (Patient Reviews)", value: "doctor" },
                  { label: "Administrator (Governance & Models)", value: "admin" },
                ]}
              />

              <Button type="submit" variant="primary" className="w-full mt-2" isLoading={loading}>
                Register Account
              </Button>

              <div className="pt-2 text-center text-xs text-slate-500">
                Already registered?{" "}
                <Link to="/login" className="font-semibold text-primary hover:underline">
                  Sign In
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </Shell>
  );
}
