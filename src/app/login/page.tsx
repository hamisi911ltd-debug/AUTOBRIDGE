"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/admin";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      setError("Invalid email or password.");
      return;
    }
    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FBF7F9] px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-white rounded-2xl border border-[#E9E1EF] p-8 shadow-sm"
      >
        <div className="flex items-center gap-2 mb-1">
          {/* eslint-disable-next-line @next/next/no-img-element -- small static logo asset */}
          <img src="/logo.png" alt="" className="w-8 h-8 rounded-lg object-contain" />
          <h1 className="text-2xl font-bold" style={{ fontFamily: "'Fraunces', Georgia, serif", color: "#3B1F63" }}>
            Ferbil Autos Admin
          </h1>
        </div>
        <p className="text-sm text-[#6B5B7E] mb-6">Sign in to manage vehicles and pricing.</p>

        <label className="block text-xs font-semibold uppercase tracking-wide text-[#6B5B7E] mb-1">
          Email
        </label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full mb-4 rounded-xl border border-[#E9E1EF] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F2762E]"
          placeholder="admin@ferbilautos.co.ke"
        />

        <label className="block text-xs font-semibold uppercase tracking-wide text-[#6B5B7E] mb-1">
          Password
        </label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full mb-4 rounded-xl border border-[#E9E1EF] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F2762E]"
          placeholder="••••••••"
        />

        {error && <p className="text-sm text-[#D6336C] mb-4">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-[#D6336C] text-white font-semibold py-2.5 text-sm hover:opacity-90 transition disabled:opacity-60"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
