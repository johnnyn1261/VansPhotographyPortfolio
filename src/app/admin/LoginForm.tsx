"use client";

import { useState } from "react";

export default function LoginForm() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;

    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Authentication failed");
      }

      // Refresh page to load admin dashboard
      window.location.reload();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to log in";
      setError(message);
      setLoading(false);
    }
  };

  return (
    <div className="w-full flex-grow flex items-center justify-center px-6 py-24 bg-bg-alt">
      <div className="w-full max-w-sm border border-line-light p-8 md:p-10 bg-bg-base shadow-sm animate-slide-up">
        <div className="text-center mb-8">
          <span className="text-[10px] tracking-widest font-bold text-text-light uppercase">
            SECURE ACCESS
          </span>
          <h2 className="font-serif text-2xl font-semibold tracking-wide italic mt-2">
            Admin Portal
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <label 
              htmlFor="password" 
              className="text-[10px] tracking-widest font-bold text-text-muted"
            >
              ADMIN PASSWORD
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={loading}
              className="w-full border border-line-medium px-4 py-2.5 text-sm focus:outline-none focus:border-line-dark bg-bg-base transition-colors"
              required
            />
          </div>

          {error && (
            <p className="text-xs font-semibold text-red-600 bg-red-50 border border-red-100 p-3 text-center">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-text-main text-bg-base text-xs font-semibold tracking-widest hover:bg-text-main/90 transition-all duration-300 disabled:opacity-50"
          >
            {loading ? "AUTHENTICATING..." : "ENTER PORTAL"}
          </button>
        </form>
      </div>
    </div>
  );
}
