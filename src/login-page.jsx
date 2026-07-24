import { useEffect, useState } from "react";
import { Chrome as Home, Loader as Loader2, Mail, Lock, User as UserIcon, KeyRound, MailCheck } from "lucide-react";
import { supabase } from "./lib/supabase.js";
import { Button } from "./components.jsx";

export default function LoginPage({ onBack }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [toast, setToast] = useState("");
  const [resetSending, setResetSending] = useState(false);
  const [resendSending, setResendSending] = useState(false);
  const [showResend, setShowResend] = useState(false);
  const [resendEmail, setResendEmail] = useState("");

  useEffect(() => {
    const syncMode = () => {
      const params = new URLSearchParams(window.location.hash.split("?")[1] || "");
      setMode(params.get("mode") === "signup" ? "signup" : "login");
      setError("");
      setInfo("");
      if (params.get("verified") === "true") {
        setToast("Email verified! You can now login");
      }
    };
    syncMode();
    window.addEventListener("hashchange", syncMode);
    return () => window.removeEventListener("hashchange", syncMode);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(""), 3500);
    return () => clearTimeout(id);
  }, [toast]);

  const handleForgotPassword = async () => {
    setError("");
    setInfo("");
    if (!email.trim()) {
      setError("Enter your email above first, then tap Forgot Password.");
      return;
    }
    setResetSending(true);
    try {
      // Mock reset — in production this would call supabase.auth.resetPasswordForEmail(email.trim())
      await new Promise((r) => setTimeout(r, 800));
      setToast("Reset link sent");
    } catch {
      setError("Could not send reset link. Please try again.");
    } finally {
      setResetSending(false);
    }
  };

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
          setInfo("Account created! We've sent you a verification email. Please check your inbox and click the link to verify your account before logging in.");
          setMode("login");
          setPassword("");
          setShowResend(true);
          setResendEmail(email.trim());
          try {
            const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-verification-email`;
            await fetch(apiUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
              },
              body: JSON.stringify({ email: email.trim() }),
            });
          } catch {
            // email send failure is non-blocking — user can resend later
          }
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
      const msg = err.message || "Authentication failed. Please try again.";
      setError(msg);
      if (msg.toLowerCase().includes("email not confirmed") || msg.toLowerCase().includes("not verified")) {
        setShowResend(true);
        setResendEmail(email.trim());
      }
    } finally {
      setLoading(false);
    }
  };

  async function handleResendVerification() {
    if (!resendEmail) return;
    setResendSending(true);
    setError("");
    setInfo("");
    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-verification-email`;
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ email: resendEmail }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to send email");
      }
      setInfo("Verification email sent! Check your inbox.");
    } catch (err) {
      setError(err.message || "Failed to resend verification email.");
    } finally {
      setResendSending(false);
    }
  }

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

        {mode === "login" && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleForgotPassword}
              disabled={resetSending}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-green-700 hover:underline disabled:opacity-50"
            >
              {resetSending ? (
                <><Loader2 className="size-3.5 animate-spin" /> Sending…</>
              ) : (
                <><KeyRound className="size-3.5" /> Forgot Password?</>
              )}
            </button>
          </div>
        )}

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

        {showResend && mode === "login" && (
          <div className="flex items-center gap-2 rounded-md bg-amber-50 px-3 py-2.5 text-sm text-amber-700 ring-1 ring-amber-200">
            <MailCheck className="size-4 shrink-0" />
            <button
              type="button"
              onClick={handleResendVerification}
              disabled={resendSending}
              className="font-semibold underline hover:text-amber-800 disabled:opacity-50"
            >
              {resendSending ? "Sending…" : "Resend verification email"}
            </button>
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

      {toast && (
        <div className="fixed left-1/2 top-6 z-50 -translate-x-1/2">
          <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700 shadow-lg">
            <KeyRound className="size-5 text-green-600" />
            {toast}
          </div>
        </div>
      )}
    </div>
  );
}
