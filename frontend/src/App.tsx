import { FormEvent, useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { api, clearToken, getToken, setToken } from "./api";

type TokenResponse = { access_token: string; role: string; name: string };
type MeResponse = {
  user: { id: number; name: string; email: string; role: string };
  patient_profile_id: number | null;
};
type MedsResponse = {
  disclaimer: string;
  items: {
    id: number;
    medication_name: string;
    purpose: string;
    warnings: string;
    source: string;
    condition: string;
  }[];
};
type Stats = {
  total_users: number;
  total_patients: number;
  total_doctors: number;
  total_assessments: number;
  note: string;
};

function Shell({
  children,
  user,
}: {
  children: React.ReactNode;
  user?: MeResponse["user"];
}) {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white/90">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link to="/" className="font-sans text-xl font-semibold text-ink">
            Heart Health AI
          </Link>
          <nav className="font-ui flex gap-4 text-sm text-sea">
            {user ? (
              <>
                <Link to="/dashboard">Dashboard</Link>
                <Link to="/medications">Medications</Link>
                {user.role === "admin" && <Link to="/admin">Admin</Link>}
                <button
                  className="text-slate-500"
                  onClick={() => {
                    clearToken();
                    navigate("/login");
                  }}
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link to="/login">Sign in</Link>
                <Link to="/register">Register</Link>
              </>
            )}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-10">{children}</main>
    </div>
  );
}

function Home() {
  return (
    <Shell>
      <div className="grid gap-8 md:grid-cols-2">
        <div>
          <p className="font-ui text-sm uppercase tracking-wide text-sea">Decision support</p>
          <h1 className="mt-2 font-sans text-4xl leading-tight">
            Heart-health risk estimation for education — not a diagnosis.
          </h1>
          <p className="font-ui mt-4 text-slate-600">
            Register as a patient, sign in, and use the dashboard. Machine-learning
            prediction is added only after a real model is trained on a real dataset.
          </p>
          <div className="mt-6 flex gap-3 font-ui">
            <Link className="rounded bg-sea px-4 py-2 text-white" to="/register">
              Create patient account
            </Link>
            <Link className="rounded border border-sea px-4 py-2 text-sea" to="/login">
              Sign in
            </Link>
          </div>
        </div>
        <aside className="rounded-xl border border-amber-200 bg-amber-50 p-5 font-ui text-sm text-amber-950">
          This application does not diagnose disease, prescribe medication, or replace a
          clinician. If you have severe chest pain, trouble breathing, or fainting, seek
          emergency care.
        </aside>
      </div>
    </Shell>
  );
}

function AuthForm({ mode }: { mode: "login" | "register" }) {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const path = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const body =
        mode === "login" ? { email, password } : { name, email, password };
      const res = await api<TokenResponse>(path, {
        method: "POST",
        body: JSON.stringify(body),
      });
      setToken(res.access_token);
      navigate(res.role === "admin" ? "/admin" : "/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Shell>
      <form
        onSubmit={onSubmit}
        className="mx-auto max-w-md rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200"
      >
        <h1 className="font-sans text-2xl">
          {mode === "login" ? "Sign in" : "Create a patient account"}
        </h1>
        <p className="font-ui mt-1 text-sm text-slate-500">
          Passwords are hashed on the server. Never share clinical emergencies with a
          student demo as a substitute for care.
        </p>
        {mode === "register" && (
          <label className="font-ui mt-6 block text-sm">
            Full name
            <input
              required
              className="mt-1 w-full rounded border px-3 py-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
        )}
        <label className="font-ui mt-4 block text-sm">
          Email
          <input
            required
            type="email"
            className="mt-1 w-full rounded border px-3 py-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label className="font-ui mt-4 block text-sm">
          Password
          <input
            required
            minLength={8}
            type="password"
            className="mt-1 w-full rounded border px-3 py-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {error && <p className="font-ui mt-3 text-sm text-alert">{error}</p>}
        <button
          disabled={loading}
          className="font-ui mt-6 w-full rounded bg-ink py-2 text-white disabled:opacity-60"
        >
          {loading ? "Please wait…" : mode === "login" ? "Sign in" : "Register"}
        </button>
      </form>
    </Shell>
  );
}

function useMe() {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      setReady(true);
      return;
    }
    api<MeResponse>("/api/auth/me")
      .then(setMe)
      .catch((e) => setError(e.message))
      .finally(() => setReady(true));
  }, []);

  return { me, error, ready };
}

function Dashboard() {
  const { me, error, ready } = useMe();
  if (!ready) return <Shell><p className="font-ui">Loading…</p></Shell>;
  if (!getToken() || !me) return <Navigate to="/login" replace />;

  return (
    <Shell user={me.user}>
      <h1 className="font-sans text-3xl">Welcome, {me.user.name}</h1>
      <p className="font-ui mt-2 text-slate-600">
        Signed in as {me.user.email} ({me.user.role}).
      </p>
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <section className="rounded-xl bg-white p-5 ring-1 ring-slate-200">
          <h2 className="font-sans text-lg">Latest assessment</h2>
          <p className="font-ui mt-2 text-sm text-slate-500">
            No assessments yet. The prediction API is connected only after a trained
            model file exists. That step is not finished.
          </p>
        </section>
        <section className="rounded-xl bg-white p-5 ring-1 ring-slate-200">
          <h2 className="font-sans text-lg">Emergency</h2>
          <p className="font-ui mt-2 text-sm text-slate-600">
            For severe or persistent chest pain, sudden weakness, fainting, or severe
            breathing difficulty, contact local emergency services immediately.
          </p>
        </section>
      </div>
      {error && <p className="font-ui mt-4 text-alert">{error}</p>}
    </Shell>
  );
}

function Medications() {
  const { me, ready } = useMe();
  const [data, setData] = useState<MedsResponse | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!getToken()) return;
    api<MedsResponse>("/api/medications")
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  if (!ready) return <Shell><p className="font-ui">Loading…</p></Shell>;
  if (!getToken() || !me) return <Navigate to="/login" replace />;

  return (
    <Shell user={me.user}>
      <h1 className="font-sans text-3xl">Educational medication information</h1>
      {data && <p className="font-ui mt-3 max-w-3xl text-sm text-slate-600">{data.disclaimer}</p>}
      {error && <p className="font-ui mt-3 text-alert">{error}</p>}
      <div className="mt-6 space-y-4">
        {data?.items.map((item) => (
          <article key={item.id} className="rounded-xl bg-white p-5 ring-1 ring-slate-200">
            <h2 className="font-sans text-lg">{item.medication_name}</h2>
            <p className="font-ui mt-1 text-xs uppercase text-sea">{item.condition}</p>
            <p className="font-ui mt-2 text-sm">{item.purpose}</p>
            <p className="font-ui mt-2 text-sm text-alert">{item.warnings}</p>
            <p className="font-ui mt-2 text-xs text-slate-500">Source: {item.source}</p>
          </article>
        ))}
      </div>
    </Shell>
  );
}

function AdminPage() {
  const { me, ready } = useMe();
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!getToken()) return;
    api<Stats>("/api/admin/stats")
      .then(setStats)
      .catch((e) => setError(e.message));
  }, []);

  if (!ready) return <Shell><p className="font-ui">Loading…</p></Shell>;
  if (!getToken() || !me) return <Navigate to="/login" replace />;
  if (me.user.role !== "admin") {
    return (
      <Shell user={me.user}>
        <p className="font-ui">This page is limited to administrators.</p>
      </Shell>
    );
  }

  return (
    <Shell user={me.user}>
      <h1 className="font-sans text-3xl">Administrator</h1>
      {error && <p className="font-ui mt-3 text-alert">{error}</p>}
      {stats && (
        <dl className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            ["Users", stats.total_users],
            ["Patients", stats.total_patients],
            ["Doctors", stats.total_doctors],
            ["Assessments", stats.total_assessments],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
              <dt className="font-ui text-xs uppercase text-slate-500">{label}</dt>
              <dd className="font-sans text-2xl">{value}</dd>
            </div>
          ))}
        </dl>
      )}
    </Shell>
  );
}

export { Home, AuthForm, Dashboard, Medications, AdminPage };
