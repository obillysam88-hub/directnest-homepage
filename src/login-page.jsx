import { useEffect, useState } from "react";
import { Chrome as Home, Loader as Loader2, Mail, Lock, User as UserIcon } from "lucide-react";
import { supabase } from "./lib/supabase.js";
import { Button } from "./components.jsx";

export default function LoginPage({ onBack }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.split("?")[1] || "");
    if (params.get("mode") === "signup") setMode("signup");
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setInfo("");
    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }
    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });
        if (signUpError) throw signUpError;
        if (data.user) {
          setInfo("Account created! You can now sign in.");
          setMode("login");
          setPassword("");
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) throw signInError;
        window.location.hash = "#/";
        window.location.reload();
      }
    } catch (err) {
      setError(err.message || "Authentication failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center px-4 py-12">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <Home className="size-7" />
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight">
          {mode === "signup" ? "Create your account" : "Welcome back"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {mode === "signup"
            ? "Sign up to list properties and get verified on Directnest."
            : "Log in to manage your properties and verification status."}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Email</label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              className="w-full rounded-md border border-border bg-card py-2.5 pl-10 pr-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              disabled={loading}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Password</label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              className="w-full rounded-md border border-border bg-card py-2.5 pl-10 pr-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              disabled={loading}
            />
          </div>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 px-3 py-2.5 text-sm text-red-700 ring-1 ring-red-200">
            {error}
          </div>
        )}
        {info && (
          <div className="rounded-md bg-green-50 px-3 py-2.5 text-sm text-green-700 ring-1 ring-green-200">
            {info}
          </div>
        )}

        <Button type="submit" disabled={loading} className="w-full bg-green-600 text-white hover:bg-green-700">
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              {mode === "signup" ? "Creating account…" : "Logging in…"}
            </>
          ) : mode === "signup" ? (
            "Sign Up"
          ) : (
            "Log In"
          )}
        </Button>
      </form>

      <div className="mt-6 text-center text-sm text-muted-foreground">
        {mode === "signup" ? (
          <>
            Already have an account?{" "}
            <button
              type="button"
              onClick={() => { setMode("login"); setError(""); setInfo(""); }}
              className="font-semibold text-green-700 hover:underline"
            >
              Log in
            </button>
          </>
        ) : (
          <>
            Don&apos;t have an account?{" "}
            <button
              type="button"
              onClick={() => { setMode("signup"); setError(""); setInfo(""); }}
              className="font-semibold text-green-700 hover:underline"
            >
              Sign up
            </button>
          </>
        )}
      </div>

      <button
        type="button"
        onClick={onBack}
        className="mt-4 text-center text-sm text-muted-foreground hover:text-foreground"
      >
        ← Back to home
      </button>
    </div>
  );
}
