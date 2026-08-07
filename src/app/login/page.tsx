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
    <div className="min-h-screen flex items-center justify-center bg-[#F7F7F5] px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-white rounded-2xl border border-[#E7E9EE] p-8 shadow-sm"
      >
        <h1
          className="text-2xl font-bold mb-1"
          style={{ fontFamily: "'Fraunces', Georgia, serif", color: "#0B1F3A" }}
        >
          AutoBridge Admin
        </h1>
        <p className="text-sm text-[#5B6472] mb-6">Sign in to manage vehicles and pricing.</p>

        <label className="block text-xs font-semibold uppercase tracking-wide text-[#5B6472] mb-1">
          Email
        </label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full mb-4 rounded-xl border border-[#E7E9EE] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C6952C]"
          placeholder="admin@autobridge.co.ke"
        />

        <label className="block text-xs font-semibold uppercase tracking-wide text-[#5B6472] mb-1">
          Password
        </label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full mb-4 rounded-xl border border-[#E7E9EE] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C6952C]"
          placeholder="••••••••"
        />

        {error && <p className="text-sm text-[#7A1F2B] mb-4">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-[#7A1F2B] text-white font-semibold py-2.5 text-sm hover:opacity-90 transition disabled:opacity-60"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
