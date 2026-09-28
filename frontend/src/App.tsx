import { FormEvent, useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { api, downloadReport, getToken, setToken } from "./api";
import { Shell } from "./components/Layout";

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
    general_information?: string;
  }[];
};
type Stats = {
  total_users: number;
  total_patients: number;
  total_doctors: number;
  total_assessments: number;
  active_model?: string | null;
  model_version?: string | null;
  model_metrics?: { accuracy?: number; roc_auc?: number; f1?: number } | null;
};
type HistoryItem = {
  id: number;
  created_at: string;
  prediction: string;
  probability: number;
  risk_level: string;
  model_version?: string;
  age?: number;
  resting_bp?: number;
  cholesterol?: number;
  max_heart_rate?: number;
};
type PredictionDetail = {
  id: number;
  prediction: string;
  probability: number;
  risk_level: string;
  model_version: string;
  model_name: string;
  explanation: { text: string; feature: string }[];
  precautions: { category: string; recommendation: string }[];
  medication_information: MedsResponse["items"];
  emergency_warning: boolean;
  emergency_message?: string | null;
  disclaimer: string;
  created_at: string;
};

function homePath(role: string) {
  if (role === "admin") return "/admin";
  if (role === "doctor") return "/doctor";
  return "/dashboard";
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
            Register, complete a structured assessment, and review a model score with
            explanations, precautions, and educational medication notes.
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
      const body = mode === "login" ? { email, password } : { name, email, password };
      const res = await api<TokenResponse>(path, { method: "POST", body: JSON.stringify(body) });
      setToken(res.access_token);
      navigate(homePath(res.role));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Shell>
      <form onSubmit={onSubmit} className="mx-auto max-w-md rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
        <h1 className="font-sans text-2xl">{mode === "login" ? "Sign in" : "Create a patient account"}</h1>
        {mode === "register" && (
          <label className="font-ui mt-6 block text-sm">
            Full name
            <input required className="mt-1 w-full rounded border px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
        )}
        <label className="font-ui mt-4 block text-sm">
          Email
          <input required type="email" className="mt-1 w-full rounded border px-3 py-2" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="font-ui mt-4 block text-sm">
          Password
          <input required minLength={8} type="password" className="mt-1 w-full rounded border px-3 py-2" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {error && <p className="font-ui mt-3 text-sm text-alert">{error}</p>}
        <button disabled={loading} className="font-ui mt-6 w-full rounded bg-ink py-2 text-white disabled:opacity-60">
          {loading ? "Please wait…" : mode === "login" ? "Sign in" : "Register"}
        </button>
      </form>
    </Shell>
  );
}

function Dashboard() {
  const { me, error, ready } = useMe();
  const [latest, setLatest] = useState<HistoryItem | null>(null);

  useEffect(() => {
    if (!getToken()) return;
    api<{ items: HistoryItem[] }>("/api/predictions/history")
      .then((data) => setLatest(data.items[0] ?? null))
      .catch(() => setLatest(null));
  }, []);

  if (!ready) return <Shell><p className="font-ui">Loading…</p></Shell>;
  if (!getToken() || !me) return <Navigate to="/login" replace />;
  if (me.user.role !== "patient") return <Navigate to={homePath(me.user.role)} replace />;

  return (
    <Shell user={me.user}>
      <h1 className="font-sans text-3xl">Welcome, {me.user.name}</h1>
      <p className="font-ui mt-2 text-slate-600">Signed in as {me.user.email}.</p>
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <section className="rounded-xl bg-white p-5 ring-1 ring-slate-200">
          <h2 className="font-sans text-lg">Latest assessment</h2>
          {latest ? (
            <div className="font-ui mt-3 text-sm">
              <p>Risk band: <strong>{latest.risk_level}</strong></p>
              <p>Model probability: {(latest.probability * 100).toFixed(1)}% (not medical certainty)</p>
              <Link className="mt-3 inline-block text-sea" to={`/prediction/${latest.id}`}>Open details</Link>
            </div>
          ) : (
            <p className="font-ui mt-2 text-sm text-slate-500">
              No assessments yet. <Link className="text-sea" to="/assessment">Start one</Link>.
            </p>
          )}
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

const emptyForm = {
  age: 45,
  sex: 1,
  chest_pain_type: 2,
  resting_bp: 130,
  cholesterol: 220,
  fasting_blood_sugar: 0,
  resting_ecg: 1,
  max_heart_rate: 150,
  exercise_angina: 0,
  oldpeak: 1.2,
  st_slope: 2,
};

function Assessment() {
  const { me, ready } = useMe();
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyForm);
  const [symptoms, setSymptoms] = useState({
    severe_chest_pain: false,
    difficulty_breathing: false,
    fainting: false,
    sudden_weakness: false,
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!ready) return <Shell><p className="font-ui">Loading…</p></Shell>;
  if (!getToken() || !me) return <Navigate to="/login" replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await api<PredictionDetail>("/api/predictions", {
        method: "POST",
        body: JSON.stringify({ ...form, emergency_symptoms: symptoms }),
      });
      navigate(`/prediction/${result.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not score assessment");
    } finally {
      setLoading(false);
    }
  }

  function num(name: keyof typeof emptyForm, value: string) {
    setForm((prev) => ({ ...prev, [name]: Number(value) }));
  }

  return (
    <Shell user={me.user}>
      <h1 className="font-sans text-3xl">Health assessment</h1>
      <p className="font-ui mt-2 max-w-2xl text-sm text-slate-600">
        Values must match the ranges used by the trained model. Invalid numbers are rejected.
      </p>
      <form onSubmit={onSubmit} className="mt-6 grid gap-4 rounded-2xl bg-white p-6 ring-1 ring-slate-200 md:grid-cols-2">
        {[
          ["age", "Age (years)"],
          ["resting_bp", "Resting blood pressure (mmHg)"],
          ["cholesterol", "Cholesterol (mg/dL)"],
          ["max_heart_rate", "Maximum heart rate"],
          ["oldpeak", "Oldpeak (ST depression)"],
        ].map(([key, label]) => (
          <label key={key} className="font-ui text-sm">
            {label}
            <input
              required
              className="mt-1 w-full rounded border px-3 py-2"
              type="number"
              step="any"
              value={form[key as keyof typeof emptyForm]}
              onChange={(e) => num(key as keyof typeof emptyForm, e.target.value)}
            />
          </label>
        ))}
        <label className="font-ui text-sm">
          Sex
          <select className="mt-1 w-full rounded border px-3 py-2" value={form.sex} onChange={(e) => num("sex", e.target.value)}>
            <option value={0}>Female (0)</option>
            <option value={1}>Male (1)</option>
          </select>
        </label>
        <label className="font-ui text-sm">
          Chest pain type
          <select className="mt-1 w-full rounded border px-3 py-2" value={form.chest_pain_type} onChange={(e) => num("chest_pain_type", e.target.value)}>
            <option value={0}>0 typical angina</option>
            <option value={1}>1 atypical angina</option>
            <option value={2}>2 non-anginal</option>
            <option value={3}>3 asymptomatic</option>
          </select>
        </label>
        <label className="font-ui text-sm">
          Fasting blood sugar &gt; 120
          <select className="mt-1 w-full rounded border px-3 py-2" value={form.fasting_blood_sugar} onChange={(e) => num("fasting_blood_sugar", e.target.value)}>
            <option value={0}>0 no</option>
            <option value={1}>1 yes</option>
          </select>
        </label>
        <label className="font-ui text-sm">
          Resting ECG
          <select className="mt-1 w-full rounded border px-3 py-2" value={form.resting_ecg} onChange={(e) => num("resting_ecg", e.target.value)}>
            <option value={0}>0 normal</option>
            <option value={1}>1 ST-T abnormality</option>
            <option value={2}>2 LVH</option>
          </select>
        </label>
        <label className="font-ui text-sm">
          Exercise angina
          <select className="mt-1 w-full rounded border px-3 py-2" value={form.exercise_angina} onChange={(e) => num("exercise_angina", e.target.value)}>
            <option value={0}>0 no</option>
            <option value={1}>1 yes</option>
          </select>
        </label>
        <label className="font-ui text-sm">
          ST slope
          <select className="mt-1 w-full rounded border px-3 py-2" value={form.st_slope} onChange={(e) => num("st_slope", e.target.value)}>
            <option value={0}>0 downsloping</option>
            <option value={1}>1 flat</option>
            <option value={2}>2 upsloping</option>
          </select>
        </label>
        <fieldset className="font-ui md:col-span-2 rounded border border-amber-200 bg-amber-50 p-4 text-sm">
          <legend className="font-medium">Possible emergency symptoms (not ML features)</legend>
          {Object.entries(symptoms).map(([key, value]) => (
            <label key={key} className="mt-2 mr-4 inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={value}
                onChange={(e) => setSymptoms((s) => ({ ...s, [key]: e.target.checked }))}
              />
              {key.replaceAll("_", " ")}
            </label>
          ))}
        </fieldset>
        {error && <p className="font-ui md:col-span-2 text-alert">{error}</p>}
        <button disabled={loading} className="font-ui rounded bg-ink px-4 py-2 text-white md:col-span-2 disabled:opacity-60">
          {loading ? "Scoring…" : "Generate model estimate"}
        </button>
      </form>
    </Shell>
  );
}

function HistoryPage() {
  const { me, ready } = useMe();
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!getToken()) return;
    api<{ items: HistoryItem[] }>("/api/predictions/history")
      .then((d) => setItems(d.items))
      .catch((e) => setError(e.message));
  }, []);

  if (!ready) return <Shell><p className="font-ui">Loading…</p></Shell>;
  if (!getToken() || !me) return <Navigate to="/login" replace />;

  return (
    <Shell user={me.user}>
      <h1 className="font-sans text-3xl">Assessment history</h1>
      {error && <p className="font-ui mt-3 text-alert">{error}</p>}
      {items.length === 0 && <p className="font-ui mt-4 text-slate-500">No saved assessments.</p>}
      <ul className="mt-6 space-y-3">
        {items.map((item) => (
          <li key={item.id} className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
            <Link to={`/prediction/${item.id}`} className="font-ui text-sea">
              {item.created_at} — {item.risk_level} — p={item.probability?.toFixed(3)} ({item.model_version})
            </Link>
          </li>
        ))}
      </ul>
    </Shell>
  );
}

function TrendsPage() {
  const { me, ready } = useMe();
  const [items, setItems] = useState<HistoryItem[]>([]);

  useEffect(() => {
    if (!getToken()) return;
    api<{ items: HistoryItem[] }>("/api/predictions/history").then((d) => setItems([...d.items].reverse()));
  }, []);

  if (!ready) return <Shell><p className="font-ui">Loading…</p></Shell>;
  if (!getToken() || !me) return <Navigate to="/login" replace />;
  if (items.length === 0) {
    return (
      <Shell user={me.user}>
        <h1 className="font-sans text-3xl">Trends</h1>
        <p className="font-ui mt-4 text-slate-500">Charts appear after you save at least one assessment.</p>
      </Shell>
    );
  }

  const width = 640;
  const height = 180;
  const probs = items.map((i) => i.probability ?? 0);
  const max = Math.max(...probs, 1);
  const points = probs
    .map((p, idx) => {
      const x = (idx / Math.max(probs.length - 1, 1)) * (width - 20) + 10;
      const y = height - 10 - (p / max) * (height - 20);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <Shell user={me.user}>
      <h1 className="font-sans text-3xl">Trends</h1>
      <p className="font-ui mt-2 text-sm text-slate-600">Model probability over your saved assessments (database values, not decoration).</p>
      <svg viewBox={`0 0 ${width} ${height}`} className="mt-6 w-full max-w-3xl rounded-xl bg-white ring-1 ring-slate-200">
        <polyline fill="none" stroke="#1b6b93" strokeWidth="3" points={points} />
      </svg>
      <table className="font-ui mt-6 w-full text-left text-sm">
        <thead>
          <tr><th>Date</th><th>BP</th><th>Cholesterol</th><th>Max HR</th></tr>
        </thead>
        <tbody>
          {items.map((i) => (
            <tr key={i.id} className="border-t">
              <td className="py-2">{i.created_at}</td>
              <td>{i.resting_bp}</td>
              <td>{i.cholesterol}</td>
              <td>{i.max_heart_rate}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Shell>
  );
}

function PredictionPage() {
  const { id } = useParams();
  const { me, ready } = useMe();
  const [data, setData] = useState<PredictionDetail | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id || !getToken()) return;
    api<PredictionDetail>(`/api/predictions/${id}`).then(setData).catch((e) => setError(e.message));
  }, [id]);

  if (!ready) return <Shell><p className="font-ui">Loading…</p></Shell>;
  if (!getToken() || !me) return <Navigate to="/login" replace />;

  return (
    <Shell user={me.user}>
      <h1 className="font-sans text-3xl">Model estimate</h1>
      {error && <p className="font-ui mt-3 text-alert">{error}</p>}
      {data?.emergency_warning && (
        <div className="mt-4 rounded-xl bg-red-800 p-4 text-white">
          <p className="font-ui font-medium">Seek emergency care</p>
          <p className="font-ui mt-2 text-sm">{data.emergency_message}</p>
        </div>
      )}
      {data && (
        <div className="mt-6 space-y-4">
          <section className="rounded-xl bg-white p-5 ring-1 ring-slate-200">
            <p className="font-ui text-sm uppercase text-sea">{data.risk_level} band</p>
            <p className="font-sans text-2xl">{data.prediction.replaceAll("_", " ")}</p>
            <p className="font-ui mt-2 text-sm">Probability {data.probability.toFixed(3)} · {data.model_name} · {data.model_version}</p>
            <p className="font-ui mt-3 text-xs text-slate-500">{data.disclaimer}</p>
            <button className="font-ui mt-4 rounded bg-sea px-3 py-2 text-white" onClick={() => downloadReport(data.id)}>
              Download PDF
            </button>
          </section>
          <section className="rounded-xl bg-white p-5 ring-1 ring-slate-200">
            <h2 className="font-sans text-lg">Model contribution (not medical causation)</h2>
            <ul className="font-ui mt-3 list-disc space-y-2 pl-5 text-sm">
              {data.explanation.map((item) => (
                <li key={item.feature}>{item.text}</li>
              ))}
            </ul>
          </section>
          <section className="rounded-xl bg-white p-5 ring-1 ring-slate-200">
            <h2 className="font-sans text-lg">General precautions</h2>
            <ul className="font-ui mt-3 space-y-2 text-sm">
              {data.precautions.map((p) => (
                <li key={p.category}><strong>{p.category}:</strong> {p.recommendation}</li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </Shell>
  );
}

function Medications() {
  const { me, ready } = useMe();
  const [data, setData] = useState<MedsResponse | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!getToken()) return;
    api<MedsResponse>("/api/medications").then(setData).catch((e) => setError(e.message));
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

function AssistantPage() {
  const { me, ready } = useMe();
  const [message, setMessage] = useState("");
  const [reply, setReply] = useState("");
  const [disclaimer, setDisclaimer] = useState("");
  const [error, setError] = useState("");

  if (!ready) return <Shell><p className="font-ui">Loading…</p></Shell>;
  if (!getToken() || !me) return <Navigate to="/login" replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const data = await api<{ reply: string; disclaimer: string }>("/api/assistant/chat", {
        method: "POST",
        body: JSON.stringify({ message }),
      });
      setReply(data.reply);
      setDisclaimer(data.disclaimer);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Assistant failed");
    }
  }

  return (
    <Shell user={me.user}>
      <h1 className="font-sans text-3xl">Health assistant</h1>
      <form onSubmit={onSubmit} className="mt-4 space-y-3">
        <textarea className="w-full rounded border p-3 font-ui" rows={4} value={message} onChange={(e) => setMessage(e.target.value)} />
        <button className="rounded bg-ink px-4 py-2 font-ui text-white">Ask</button>
      </form>
      {error && <p className="font-ui mt-3 text-alert">{error}</p>}
      {reply && <p className="font-ui mt-4 rounded-xl bg-white p-4 text-sm ring-1 ring-slate-200">{reply}</p>}
      {disclaimer && <p className="font-ui mt-2 text-xs text-slate-500">{disclaimer}</p>}
    </Shell>
  );
}

function DoctorPage() {
  const { me, ready } = useMe();
  const [items, setItems] = useState<{ user_id: number; name: string; email: string; latest_risk?: string | null }[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!getToken()) return;
    api<{ items: typeof items }>("/api/doctor/patients").then((d) => setItems(d.items)).catch((e) => setError(e.message));
  }, []);

  if (!ready) return <Shell><p className="font-ui">Loading…</p></Shell>;
  if (!getToken() || !me) return <Navigate to="/login" replace />;
  if (me.user.role !== "doctor") {
    return <Shell user={me.user}><p className="font-ui">Doctor role required.</p></Shell>;
  }

  return (
    <Shell user={me.user}>
      <h1 className="font-sans text-3xl">Assigned patients</h1>
      <p className="font-ui mt-2 text-sm text-slate-600">You only see patients an administrator assigned to you.</p>
      {error && <p className="font-ui mt-3 text-alert">{error}</p>}
      {items.length === 0 && <p className="font-ui mt-4 text-slate-500">No assigned patients yet.</p>}
      <ul className="mt-6 space-y-3">
        {items.map((p) => (
          <li key={p.user_id} className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
            <Link className="text-sea" to={`/doctor/patients/${p.user_id}`}>{p.name}</Link>
            <span className="font-ui ml-2 text-sm text-slate-500">{p.email} {p.latest_risk ?? ""}</span>
          </li>
        ))}
      </ul>
    </Shell>
  );
}

function DoctorPatientPage() {
  const { id } = useParams();
  const { me, ready } = useMe();
  const [data, setData] = useState<{
    user: { name: string; email: string };
    predictions: HistoryItem[];
    notes: { id: number; note: string; created_at: string }[];
  } | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  function load() {
    if (!id) return;
    api<NonNullable<typeof data>>(`/api/doctor/patients/${id}`).then(setData).catch((e) => setError(e.message));
  }

  useEffect(() => {
    if (getToken()) load();
  }, [id]);

  if (!ready) return <Shell><p className="font-ui">Loading…</p></Shell>;
  if (!getToken() || !me) return <Navigate to="/login" replace />;

  async function saveNote(e: FormEvent) {
    e.preventDefault();
    if (!id) return;
    await api(`/api/doctor/patients/${id}/notes`, { method: "POST", body: JSON.stringify({ note }) });
    setNote("");
    load();
  }

  return (
    <Shell user={me.user}>
      <h1 className="font-sans text-3xl">{data?.user.name ?? "Patient"}</h1>
      {error && <p className="font-ui mt-3 text-alert">{error}</p>}
      <ul className="mt-4 space-y-2 font-ui text-sm">
        {data?.predictions.map((p) => (
          <li key={p.id}>
            <Link className="text-sea" to={`/prediction/${p.id}`}>{p.created_at} {p.risk_level}</Link>
          </li>
        ))}
      </ul>
      <form onSubmit={saveNote} className="mt-6 space-y-2">
        <textarea className="w-full rounded border p-3" value={note} onChange={(e) => setNote(e.target.value)} />
        <button className="rounded bg-ink px-4 py-2 text-white">Save note</button>
      </form>
      <ul className="font-ui mt-4 space-y-2 text-sm">
        {data?.notes.map((n) => (
          <li key={n.id} className="rounded bg-white p-3 ring-1 ring-slate-200">{n.created_at}: {n.note}</li>
        ))}
      </ul>
    </Shell>
  );
}

function AdminPage() {
  const { me, ready } = useMe();
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<{ id: number; name: string; email: string; role: string }[]>([]);
  const [logs, setLogs] = useState<{ id: number; action: string; timestamp: string }[]>([]);
  const [error, setError] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [patientId, setPatientId] = useState("");

  useEffect(() => {
    if (!getToken()) return;
    Promise.all([
      api<Stats>("/api/admin/stats"),
      api<{ items: typeof users }>("/api/admin/users"),
      api<{ items: typeof logs }>("/api/admin/audit-logs"),
    ])
      .then(([s, u, l]) => {
        setStats(s);
        setUsers(u.items);
        setLogs(l.items);
      })
      .catch((e) => setError(e.message));
  }, []);

  if (!ready) return <Shell><p className="font-ui">Loading…</p></Shell>;
  if (!getToken() || !me) return <Navigate to="/login" replace />;
  if (me.user.role !== "admin") {
    return <Shell user={me.user}><p className="font-ui">This page is limited to administrators.</p></Shell>;
  }

  async function assign(e: FormEvent) {
    e.preventDefault();
    await api("/api/admin/assignments", {
      method: "POST",
      body: JSON.stringify({ doctor_id: Number(doctorId), patient_user_id: Number(patientId) }),
    });
    alert("Assignment saved");
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
      {stats?.model_metrics && (
        <p className="font-ui mt-4 text-sm">
          Active model {stats.active_model} {stats.model_version} — measured test ROC-AUC{" "}
          {stats.model_metrics.roc_auc?.toFixed(3)} accuracy {stats.model_metrics.accuracy?.toFixed(3)}
        </p>
      )}
      <form onSubmit={assign} className="font-ui mt-6 flex flex-wrap gap-2">
        <input className="rounded border px-2 py-1" placeholder="doctor user id" value={doctorId} onChange={(e) => setDoctorId(e.target.value)} />
        <input className="rounded border px-2 py-1" placeholder="patient user id" value={patientId} onChange={(e) => setPatientId(e.target.value)} />
        <button className="rounded bg-sea px-3 py-1 text-white">Assign doctor</button>
      </form>
      <h2 className="font-sans mt-8 text-xl">Users</h2>
      <ul className="font-ui mt-2 text-sm">
        {users.map((u) => (
          <li key={u.id}>#{u.id} {u.name} ({u.role}) {u.email}</li>
        ))}
      </ul>
      <h2 className="font-sans mt-8 text-xl">Audit log</h2>
      <ul className="font-ui mt-2 text-sm">
        {logs.slice(0, 20).map((l) => (
          <li key={l.id}>{l.timestamp} {l.action}</li>
        ))}
      </ul>
    </Shell>
  );
}

export {
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
};
