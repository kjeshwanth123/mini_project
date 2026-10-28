import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlertCircle, Heart, Lock, Mail } from "lucide-react";
import { Shell } from "@/components/Layout";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { api } from "@/services/apiClient";
import { useAuthStore } from "@/stores/authStore";

export function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const data = await api.login(email, password);
      // Fetch user profile info
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
      setError(err.message || "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Shell>
      <div className="flex items-center justify-center min-h-[70vh] py-12">
        <Card className="w-full max-w-md shadow-glass dark:shadow-glass-dark">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-sky-100 dark:bg-sky-950 flex items-center justify-center text-sky-600 dark:text-sky-400 mb-1">
              <Heart className="w-6 h-6 fill-sky-600 dark:fill-sky-400" />
            </div>
            <CardTitle className="text-2xl font-bold">Sign In to CardioHealth</CardTitle>
            <CardDescription>
              Access your heart health assessments, clinical reports, and AI assistant
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
                label="Email Address"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <Input
                label="Password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />

              <Button type="submit" variant="primary" className="w-full mt-2" isLoading={loading}>
                Sign In
              </Button>

              <div className="pt-2 text-center text-xs text-slate-500">
                Don't have an account yet?{" "}
                <Link to="/register" className="font-semibold text-primary hover:underline">
                  Create Account
                </Link>
              </div>

              {/* Demo Credentials Tip */}
              <div className="mt-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
                <span className="font-semibold text-slate-700 dark:text-slate-300 block">Default Accounts:</span>
                <div>Patient: <code className="text-sky-600 dark:text-sky-400 font-mono">patient@example.com</code> / <code className="font-mono">Patient#123</code></div>
                <div>Doctor: <code className="text-sky-600 dark:text-sky-400 font-mono">doctor@example.com</code> / <code className="font-mono">Doctor#123</code></div>
                <div>Admin: <code className="text-sky-600 dark:text-sky-400 font-mono">admin@example.com</code> / <code className="font-mono">Admin#123</code></div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </Shell>
  );
}
