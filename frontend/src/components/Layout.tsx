import { Link, useNavigate } from "react-router-dom";
import { clearToken } from "../api";

export type AppUser = { id: number; name: string; email: string; role: string };

export function Shell({ children, user }: { children: React.ReactNode; user?: AppUser }) {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white/90">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-4">
          <Link to="/" className="font-sans text-xl font-semibold text-ink">
            Heart Health AI
          </Link>
          <nav className="font-ui flex flex-wrap gap-4 text-sm text-sea">
            {user ? (
              <>
                {user.role === "patient" && (
                  <>
                    <Link to="/dashboard">Dashboard</Link>
                    <Link to="/assessment">Assessment</Link>
                    <Link to="/history">History</Link>
                    <Link to="/trends">Trends</Link>
                    <Link to="/assistant">Assistant</Link>
                  </>
                )}
                {user.role === "doctor" && <Link to="/doctor">Doctor</Link>}
                {user.role === "admin" && <Link to="/admin">Admin</Link>}
                <Link to="/medications">Medications</Link>
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
      <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
    </div>
  );
}
