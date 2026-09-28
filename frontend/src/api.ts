const TOKEN_KEY = "hhai_token";

export const apiBase = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

function errorMessage(data: unknown, fallback: string): string {
  if (typeof data === "object" && data && "detail" in data) {
    const detail = (data as { detail: unknown }).detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) {
      return detail
        .map((item) => {
          if (item && typeof item === "object" && "msg" in item) {
            const loc = Array.isArray((item as { loc?: unknown }).loc)
              ? (item as { loc: unknown[] }).loc.slice(1).join(".")
              : "";
            return `${loc} ${(item as { msg: string }).msg}`.trim();
          }
          return String(item);
        })
        .join("; ");
    }
  }
  return fallback;
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (!(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(`${apiBase}${path}`, { ...options, headers });
  const text = await response.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { detail: text };
    }
  }
  if (!response.ok) {
    throw new Error(errorMessage(data, response.statusText));
  }
  return data as T;
}

export async function downloadReport(predictionId: number) {
  const token = getToken();
  const response = await fetch(`${apiBase}/api/reports/${predictionId}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) {
    throw new Error("Could not download report");
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `prediction-${predictionId}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}
