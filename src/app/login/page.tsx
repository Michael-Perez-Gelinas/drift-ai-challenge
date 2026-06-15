"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Field } from "@/components/admin/Field";
import { PrimaryButton } from "@/components/admin/PrimaryButton";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        router.replace("/admin/today");
        router.refresh();
        return;
      }

      const body = await res.json().catch(() => null);
      setError(body?.error ?? "Something went wrong. Try again.");
      setSubmitting(false);
    } catch {
      setError("Couldn't reach the server. Try again.");
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col justify-center bg-background px-5">
      <div className="mx-auto w-full max-w-sm">
        <div className="mb-10 text-center">
          <h1 className="font-display text-4xl leading-none text-text-primary">
            Drift
          </h1>
          <p className="mt-2 text-sm text-text-secondary">
            Sign in to manage today.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <Field
            label="Password"
            type="password"
            name="password"
            autoComplete="current-password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={error ? true : undefined}
          />

          {error ? (
            <p role="alert" className="text-sm text-rust-600">
              {error}
            </p>
          ) : null}

          <PrimaryButton type="submit" disabled={submitting || !password}>
            {submitting ? "Signing in…" : "Sign in"}
          </PrimaryButton>
        </form>
      </div>
    </main>
  );
}
