import { useEffect, useState } from "react";
import { CircleCheck as CheckCircle2, CircleAlert as AlertCircle, Loader as Loader2 } from "lucide-react";
import { Button } from "./components.jsx";

export default function VerifyEmailPage({ onBack }) {
  const [status, setStatus] = useState("verifying");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.split("?")[1] || "");
    const token = params.get("token");
    if (!token) {
      setStatus("error");
      setMessage("No verification token found in the link.");
      return;
    }

    (async () => {
      try {
        const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-email`;
        const res = await fetch(apiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ token }),
        });
        const data = await res.json();
        if (!res.ok) {
          setStatus("error");
          setMessage(data.error || "Verification failed.");
          return;
        }
        setStatus("success");
        setTimeout(() => {
          window.location.hash = "#/login?verified=true";
        }, 2500);
      } catch {
        setStatus("error");
        setMessage("Network error. Please try again or click the link in your email.");
      }
    })();
  }, []);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6 text-center">
        {status === "verifying" && (
          <div className="space-y-4">
            <div className="flex justify-center">
              <Loader2 className="size-12 animate-spin text-primary" />
            </div>
            <h1 className="text-xl font-bold text-foreground">Verifying your email…</h1>
            <p className="text-sm text-muted-foreground">Please wait a moment.</p>
          </div>
        )}

        {status === "success" && (
          <div className="space-y-4">
            <div className="flex justify-center">
              <div className="flex size-16 items-center justify-center rounded-full bg-green-100">
                <CheckCircle2 className="size-10 text-green-600" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-green-600">Email verified!</h1>
            <p className="text-base text-muted-foreground">You can now login. Redirecting you to the login page…</p>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-4">
            <div className="flex justify-center">
              <div className="flex size-16 items-center justify-center rounded-full bg-red-100">
                <AlertCircle className="size-10 text-red-600" />
              </div>
            </div>
            <h1 className="text-xl font-bold text-foreground">Verification failed</h1>
            <p className="text-sm text-muted-foreground">{message}</p>
            <Button onClick={() => { window.location.hash = "#/login"; }} className="w-full">
              Go to Login
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
