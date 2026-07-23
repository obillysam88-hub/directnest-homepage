import { useRef, useState, useEffect, useCallback } from "react";
import {
  ShieldCheck,
  CloudUpload as UploadCloud,
  X,
  Loader as Loader2,
  CircleCheck as CheckCircle2,
  CircleAlert as AlertCircle,
  ArrowLeft,
  IdCard,
  FileCheck,
  Camera,
  Clock,
  Video,
  Ban,
  Lock,
  Eye,
  EyeOff,
  ScanFace,
  ArrowRight,
  ArrowLeft as ArrowLeftIcon,
} from "lucide-react";
import { Button, Input, Label, Badge, cn } from "./components.jsx";
import { supabase, KYC_BUCKET } from "./lib/supabase.js";
import { useAuth } from "./auth-context.jsx";

/* ---------- Helper: upload file to Supabase Storage ---------- */
async function uploadFile(file, bucket, folder) {
  const ext = (file.name || "bin").split(".").pop() || "bin";
  const path = `${folder}/${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}.${ext}`;
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { upsert: false });
  if (error) throw error;
  const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);
  return pub.publicUrl;
}

/* ---------- Helper: generate a simple device fingerprint ---------- */
function getDeviceId() {
  const key = "directnest:device_id:v1";
  try {
    let id = localStorage.getItem(key);
    if (!id) {
      const seed = `${navigator.userAgent}-${screen.width}x${screen.height}-${Date.now()}-${Math.random()}`;
      id = btoa(seed).slice(0, 32);
      localStorage.setItem(key, id);
    }
    return id;
  } catch {
    return "unknown-device";
  }
}

/* ---------- Helper: hash a string (simple, client-side) ---------- */
async function hashString(str) {
  try {
    const buf = new TextEncoder().encode(str);
    const hash = await crypto.subtle.digest("SHA-256", buf);
    return Array.from(new Uint8Array(hash))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  } catch {
    return btoa(str).slice(0, 64);
  }
}

/* ---------- Liveness check prompts ---------- */
const LIVENESS_PROMPTS = [
  { label: "Blink", duration: 2000 },
  { label: "Turn Left", duration: 2000 },
  { label: "Turn Right", duration: 2000 },
];

/* ---------- Liveness Camera Component ---------- */
function LivenessCamera({ onComplete, onError }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const [phase, setPhase] = useState("idle"); // idle | recording | done | error
  const [promptIndex, setPromptIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(5);
  const [cameraReady, setCameraReady] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setCameraReady(true);
      } catch (err) {
        setErrorMsg(
          "Could not access camera. Please allow camera permissions and try again."
        );
        setPhase("error");
      }
    }

    startCamera();
    return () => {
      cancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  function startRecording() {
    if (!streamRef.current) return;
    chunksRef.current = [];
    setPhase("recording");
    setPromptIndex(0);
    setSecondsLeft(5);

    try {
      const recorder = new MediaRecorder(streamRef.current, {
        mimeType: "video/webm",
      });
      recorderRef.current = recorder;
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "video/webm" });
        const url = URL.createObjectURL(blob);
        // Also capture a frame from the video for face match
        const canvas = document.createElement("canvas");
        const video = videoRef.current;
        if (video && video.videoWidth) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          canvas.getContext("2d").drawImage(video, 0, 0);
        }
        const frameUrl = canvas.toDataURL("image/jpeg", 0.8);
        onComplete({ videoBlob: blob, videoUrl: url, frameUrl });
        setPhase("done");
      };
      recorder.start();
    } catch (err) {
      setErrorMsg("Recording not supported on this device.");
      setPhase("error");
    }
  }

  // Countdown and prompt progression
  useEffect(() => {
    if (phase !== "recording") return;
    const tick = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          if (recorderRef.current && recorderRef.current.state === "recording") {
            recorderRef.current.stop();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, [phase]);

  // Advance prompts
  useEffect(() => {
    if (phase !== "recording") return;
    const elapsed = 5 - secondsLeft;
    const newPrompt = Math.min(
      Math.floor((elapsed / 5) * LIVENESS_PROMPTS.length),
      LIVENESS_PROMPTS.length - 1
    );
    setPromptIndex(newPrompt);
  }, [secondsLeft, phase]);

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-xl border-2 border-border bg-black">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="aspect-[4/3] w-full object-cover"
        />
        {phase === "recording" && (
          <div className="absolute left-0 right-0 top-0 bg-gradient-to-b from-black/70 to-transparent p-4">
            <div className="flex items-center justify-between">
              <Badge className="bg-red-500 text-white">
                <span className="size-2 animate-pulse rounded-full bg-white" /> REC
              </Badge>
              <span className="font-mono text-lg font-bold text-white">
                0:{String(secondsLeft).padStart(1, "0")}
              </span>
            </div>
            <div className="mt-3 rounded-lg bg-primary/90 px-4 py-2 text-center">
              <p className="text-sm font-bold text-white">
                <ScanFace className="mr-1.5 inline size-4" />
                {LIVENESS_PROMPTS[promptIndex].label}
              </p>
            </div>
          </div>
        )}
        {phase === "idle" && cameraReady && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/40 p-4 text-center">
            <Video className="size-10 text-white/80" />
            <p className="text-sm font-medium text-white/90">
              Camera ready. Press start when you're prepared.
            </p>
          </div>
        )}
        {phase === "done" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-green-600/80 p-4 text-center">
            <CheckCircle2 className="size-10 text-white" />
            <p className="text-sm font-semibold text-white">
              Liveness video captured
            </p>
          </div>
        )}
        {phase === "error" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-red-600/80 p-4 text-center">
            <AlertCircle className="size-10 text-white" />
            <p className="text-sm font-semibold text-white">{errorMsg}</p>
          </div>
        )}
      </div>

      {phase === "idle" && cameraReady && (
        <Button
          type="button"
          onClick={startRecording}
          className="w-full bg-green-600 text-white hover:bg-green-700"
        >
          <Video className="size-4" /> Start 5-Second Liveness Check
        </Button>
      )}

      {phase === "recording" && (
        <div className="space-y-1.5">
          <p className="text-center text-xs text-muted-foreground">
            Follow the on-screen prompts. Keep your face centered in the frame.
          </p>
        </div>
      )}

      {phase === "error" && (
        <Button
          type="button"
          onClick={() => {
            setErrorMsg("");
            setPhase("idle");
            setCameraReady(false);
            if (streamRef.current) {
              streamRef.current.getTracks().forEach((t) => t.stop());
            }
            setTimeout(() => {
              navigator.mediaDevices
                .getUserMedia({ video: { facingMode: "user" } })
                .then((stream) => {
                  streamRef.current = stream;
                  if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.play();
                  }
                  setCameraReady(true);
                })
                .catch(() => setErrorMsg("Camera still unavailable."));
            }, 100);
          }}
          variant="outline"
          className="w-full"
        >
          Retry Camera
        </Button>
      )}
    </div>
  );
}

/* ---------- Reusable document upload tile ---------- */
function DocumentUpload({ label, value, onChange, hint, accept = "image/*,application/pdf" }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  function handleFile(file) {
    if (!file) return;
    const url = URL.createObjectURL(file);
    onChange({ file, url, name: file.name });
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    handleFile(file);
  }

  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div
        onClick={() => inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setDragging(false);
        }}
        className={cn(
          "relative flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed p-4 text-center transition",
          dragging
            ? "border-primary bg-primary/5"
            : "border-border bg-secondary/40 hover:border-primary/50"
        )}
      >
        {value ? (
          <>
            {value.file?.type?.startsWith("image/") ? (
              <img
                src={value.url}
                alt={label}
                className="max-h-28 rounded-md object-contain"
              />
            ) : (
              <div className="flex items-center gap-2 text-sm">
                <FileCheck className="size-5 text-green-600" />
                <span className="font-medium">{value.name}</span>
              </div>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange(null);
              }}
              className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white"
              aria-label="Remove file"
            >
              <X className="size-3.5" />
            </button>
          </>
        ) : (
          <>
            <UploadCloud className="size-6 text-muted-foreground" />
            <p className="text-xs font-medium">Click or drag a file</p>
            {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => {
            handleFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}

/* ---------- Step indicator ---------- */
function StepIndicator({ current, steps }) {
  return (
    <div className="mb-6 flex items-center justify-between">
      {steps.map((step, i) => (
        <div key={i} className="flex flex-1 items-center">
          <div className="flex flex-col items-center gap-1">
            <div
              className={cn(
                "flex size-9 items-center justify-center rounded-full border-2 text-sm font-bold transition",
                i < current
                  ? "border-primary bg-primary text-primary-foreground"
                  : i === current
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-secondary text-muted-foreground"
              )}
            >
              {i < current ? <CheckCircle2 className="size-5" /> : i + 1}
            </div>
            <span
              className={cn(
                "text-xs font-medium",
                i <= current ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {step}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={cn(
                "mx-1 h-0.5 flex-1 rounded transition",
                i < current ? "bg-primary" : "bg-border"
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}

/* ---------- KYC Page ---------- */
export default function KycPage({ onBack }) {
  const { user, loading, ensureUser, refreshUser } = useAuth();
  const [step, setStep] = useState(0); // 0: ID type+number, 1: ID upload, 2: liveness
  const [idType, setIdType] = useState("NIN");
  const [idNumber, setIdNumber] = useState("");
  const [idPhoto, setIdPhoto] = useState(null);
  const [livenessData, setLivenessData] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [cooldownInfo, setCooldownInfo] = useState(null);
  const [blacklisted, setBlacklisted] = useState(false);

  const steps = ["ID Number", "ID Photo", "Liveness"];

  // Check for cooldown / blacklist on mount
  useEffect(() => {
    if (loading || !user) return;
    if (user.is_blacklisted) {
      setBlacklisted(true);
      return;
    }
    if (user.cooldown_until) {
      const expiry = new Date(user.cooldown_until).getTime();
      if (expiry > Date.now()) {
        setCooldownInfo({
          until: user.cooldown_until,
          remaining: expiry - Date.now(),
        });
      }
    }
  }, [user, loading]);

  // Live countdown
  useEffect(() => {
    if (!cooldownInfo) return;
    const id = setInterval(() => {
      const remaining = new Date(cooldownInfo.until).getTime() - Date.now();
      if (remaining <= 0) {
        setCooldownInfo(null);
      } else {
        setCooldownInfo((prev) => ({ ...prev, remaining }));
      }
    }, 1000);
    return () => clearInterval(id);
  }, [cooldownInfo]);

  function formatCooldown(ms) {
    const h = Math.floor(ms / (1000 * 60 * 60));
    const m = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    return `${h}h ${m}m`;
  }

  // ---- Blacklisted screen ----
  if (blacklisted) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-16 text-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-red-100 text-red-600">
          <Ban className="size-8" />
        </div>
        <h1 className="mt-5 text-2xl font-bold">Account Blacklisted</h1>
        <p className="mt-2 text-muted-foreground">
          This account has been permanently banned due to repeated verification
          failures. If you believe this is an error, contact support@directnest.com.ng
        </p>
        <Button onClick={onBack} className="mt-6">
          Back to home
        </Button>
      </div>
    );
  }

  // ---- Cooldown screen ----
  if (cooldownInfo) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-16 text-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-amber-100 text-amber-600">
          <Clock className="size-8" />
        </div>
        <h1 className="mt-5 text-2xl font-bold">Too Many Failed Attempts</h1>
        <p className="mt-2 text-muted-foreground">
          For security, you must wait before trying again.
        </p>
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-8 py-4">
          <p className="text-sm text-muted-foreground">Try again in</p>
          <p className="font-mono text-3xl font-bold text-amber-700">
            {formatCooldown(cooldownInfo.remaining)}
          </p>
        </div>
        <Button onClick={onBack} className="mt-6">
          Back to home
        </Button>
      </div>
    );
  }

  // ---- Success screen ----
  if (submitted) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-16 text-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-green-100 text-green-600">
          <CheckCircle2 className="size-8" />
        </div>
        <h1 className="mt-5 text-2xl font-bold">Verification Successful!</h1>
        <p className="mt-2 text-muted-foreground">
          You are now a <span className="font-semibold text-foreground">Verified Renter</span>.
          You can see exact addresses, book inspections, and contact owners directly.
        </p>
        <Badge className="mt-4 bg-green-50 text-green-700 ring-1 ring-green-200">
          <ShieldCheck className="size-3.5" /> Verified Renter
        </Badge>
        <Button onClick={onBack} className="mt-6 bg-green-600 text-white hover:bg-green-700">
          Back to home
        </Button>
      </div>
    );
  }

  // ---- Loading ----
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="mr-2 size-5 animate-spin" /> Loading…
      </div>
    );
  }

  function canProceed() {
    if (step === 0) return idNumber.trim().length === 11;
    if (step === 1) return idPhoto !== null;
    if (step === 2) return livenessData !== null;
    return false;
  }

  async function handleSubmit() {
    setError("");
    setSubmitting(true);
    try {
      const userId = await ensureUser();
      if (!userId) throw new Error("Could not create or retrieve user session.");

      const deviceId = getDeviceId();
      const folder = `kyc-${userId}-${Date.now()}`;

      // Upload ID photo
      const idPhotoUrl = await uploadFile(idPhoto.file, KYC_BUCKET, folder);

      // Upload liveness video
      const videoFile = new File(
        [livenessData.videoBlob],
        `liveness-${Date.now()}.webm`,
        { type: "video/webm" }
      );
      const livenessVideoUrl = await uploadFile(videoFile, KYC_BUCKET, folder);

      // Upload liveness frame (for face match)
      const frameBlob = await (await fetch(livenessData.frameUrl)).blob();
      const frameFile = new File([frameBlob], `frame-${Date.now()}.jpg`, {
        type: "image/jpeg",
      });
      const livenessFrameUrl = await uploadFile(frameFile, KYC_BUCKET, folder);

      // Compute face hash from frame
      const faceHash = await hashString(livenessData.frameUrl.slice(0, 500));

      // Check blacklist before submitting
      const { data: blacklistHit } = await supabase
        .from("kyc_blacklist")
        .select("id")
        .or(
          `nin.eq.${idType === "NIN" ? idNumber : ""},bvn.eq.${idType === "BVN" ? idNumber : ""},device_id.eq.${deviceId},face_hash.eq.${faceHash}`
        )
        .limit(1)
        .maybeSingle();

      if (blacklistHit) {
        await supabase.from("users").update({
          is_blacklisted: true,
          kyc_status: "blacklisted",
        }).eq("id", userId);

        await supabase.from("kyc_audit_log").insert({
          user_id: userId,
          action: "blacklist_hit",
          details: { reason: "Matched existing blacklist entry", id_type: idType },
        });

        setBlacklisted(true);
        setSubmitting(false);
        return;
      }

      // Call edge function for backend verification
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/kyc-verify`;
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          userId,
          idType,
          idNumber: idNumber.trim(),
          idPhotoUrl,
          livenessVideoUrl,
          livenessFrameUrl,
          deviceId,
          faceHash,
        }),
      });

      if (!response.ok) {
        throw new Error(`Verification service error (${response.status})`);
      }

      const result = await response.json();

      // Record the attempt
      await supabase.from("kyc_attempts").insert({
        user_id: userId,
        id_type: idType,
        id_number: idNumber.trim(),
        id_photo_url: idPhotoUrl,
        liveness_video_url: livenessVideoUrl,
        liveness_frame_url: livenessFrameUrl,
        face_similarity_score: result.face_similarity ?? 0,
        liveness_check_passed: result.liveness_passed ?? false,
        status: result.success ? "approved" : "failed",
        failure_reason: result.reason || null,
        device_id: deviceId,
        face_hash: faceHash,
      });

      // Audit log
      await supabase.from("kyc_audit_log").insert({
        user_id: userId,
        action: result.success ? "kyc_success" : "kyc_failure",
        details: {
          id_type: idType,
          face_similarity: result.face_similarity,
          liveness_passed: result.liveness_passed,
          reason: result.reason,
        },
      });

      if (result.success) {
        // Success: update user to approved + badge
        await supabase
          .from("users")
          .update({
            kyc_status: "approved",
            is_verified: true,
            badge: "Verified Renter",
            failed_attempts: 0,
            cooldown_until: null,
            device_id: deviceId,
            face_hash: faceHash,
            id_type: idType,
            id_number: idNumber.trim(),
          })
          .eq("id", userId);

        await refreshUser();
        setSubmitted(true);
      } else {
        // Failure: escalate
        const newFailedAttempts = (user?.failed_attempts || 0) + 1;

        if (newFailedAttempts >= 3) {
          // Fail 3: blacklist
          await supabase
            .from("users")
            .update({
              is_blacklisted: true,
              kyc_status: "blacklisted",
              failed_attempts: newFailedAttempts,
            })
            .eq("id", userId);

          await supabase.from("kyc_blacklist").insert({
            user_id: userId,
            nin: idType === "NIN" ? idNumber.trim() : null,
            bvn: idType === "BVN" ? idNumber.trim() : null,
            device_id: deviceId,
            face_hash: faceHash,
            reason: result.reason || "3 failed KYC attempts",
          });

          await supabase.from("kyc_audit_log").insert({
            user_id: userId,
            action: "blacklisted",
            details: { reason: result.reason, attempts: newFailedAttempts },
          });

          setBlacklisted(true);
        } else if (newFailedAttempts >= 2) {
          // Fail 2: 24hr cooldown
          const cooldownUntil = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
          await supabase
            .from("users")
            .update({
              kyc_status: "cooldown",
              failed_attempts: newFailedAttempts,
              cooldown_until: cooldownUntil,
            })
            .eq("id", userId);

          await supabase.from("kyc_audit_log").insert({
            user_id: userId,
            action: "cooldown_set",
            details: { until: cooldownUntil, attempts: newFailedAttempts },
          });

          setCooldownInfo({ until: cooldownUntil, remaining: 24 * 60 * 60 * 1000 });
        } else {
          // Fail 1: just show error
          await supabase
            .from("users")
            .update({
              kyc_status: "unverified",
              failed_attempts: newFailedAttempts,
            })
            .eq("id", userId);
        }

        setError(result.reason || "Face did not match. Try again.");
        setStep(2); // Stay on liveness step for retry
      }
    } catch (err) {
      setError(
        "Submission failed: " +
          (err.message || "Unknown error. Please try again.")
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <button
        onClick={onBack}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back to home
      </button>

      <div className="mb-6">
        <div className="flex items-center gap-2">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <ShieldCheck className="size-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Verify Your Identity</h1>
            <p className="text-sm text-muted-foreground">
              SOW-standard verification with liveness check
            </p>
          </div>
        </div>
      </div>

      <StepIndicator current={step} steps={steps} />

      {/* Step 0: ID Type + Number */}
      {step === 0 && (
        <div className="space-y-6">
          <section className="space-y-4 rounded-xl border border-border bg-card p-5">
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <IdCard className="size-4 text-primary" /> Choose ID Type
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <label
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-lg border-2 p-4 transition",
                  idType === "NIN"
                    ? "border-primary bg-primary/5"
                    : "border-border bg-secondary/40 hover:border-primary/50"
                )}
              >
                <input
                  type="radio"
                  name="idType"
                  value="NIN"
                  checked={idType === "NIN"}
                  onChange={() => setIdType("NIN")}
                  className="mt-1 accent-[#00C853]"
                />
                <div>
                  <p className="font-semibold">NIN</p>
                  <p className="text-xs text-muted-foreground">National Identity Number</p>
                </div>
              </label>
              <label
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-lg border-2 p-4 transition",
                  idType === "BVN"
                    ? "border-primary bg-primary/5"
                    : "border-border bg-secondary/40 hover:border-primary/50"
                )}
              >
                <input
                  type="radio"
                  name="idType"
                  value="BVN"
                  checked={idType === "BVN"}
                  onChange={() => setIdType("BVN")}
                  className="mt-1 accent-[#00C853]"
                />
                <div>
                  <p className="font-semibold">BVN</p>
                  <p className="text-xs text-muted-foreground">Bank Verification Number</p>
                </div>
              </label>
            </div>
          </section>

          <section className="space-y-4 rounded-xl border border-border bg-card p-5">
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <IdCard className="size-4 text-primary" /> Enter {idType} Number
            </h2>
            <div>
              <Label htmlFor="idNumber">{idType} Number</Label>
              <Input
                id="idNumber"
                inputMode="numeric"
                maxLength={11}
                placeholder="12345678901"
                value={idNumber}
                onChange={(e) =>
                  setIdNumber(e.target.value.replace(/[^\d]/g, "").slice(0, 11))
                }
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Enter your 11-digit {idType} number
              </p>
            </div>
          </section>

          {error && (
            <p className="flex items-center gap-1.5 text-sm font-medium text-red-600">
              <AlertCircle className="size-4" /> {error}
            </p>
          )}

          <Button
            onClick={() => {
              setError("");
              if (!idNumber.trim() || idNumber.trim().length !== 11) {
                setError(`Please enter a valid 11-digit ${idType} number.`);
                return;
              }
              setStep(1);
            }}
            disabled={!canProceed()}
            className="w-full bg-green-600 text-white hover:bg-green-700 sm:w-auto"
          >
            Continue <ArrowRight className="size-4" />
          </Button>
        </div>
      )}

      {/* Step 1: Upload ID Photo */}
      {step === 1 && (
        <div className="space-y-6">
          <section className="space-y-4 rounded-xl border border-border bg-card p-5">
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <FileCheck className="size-4 text-primary" /> Upload ID Photo
            </h2>
            <p className="text-sm text-muted-foreground">
              Upload a clear photo of your{" "}
              {idType === "NIN" ? "NIN Slip" : "ID document"}. Accepted: NIN Slip,
              Driver's License, or Passport.
            </p>
            <DocumentUpload
              label="ID Document Photo"
              value={idPhoto}
              onChange={setIdPhoto}
              hint="JPG, PNG, or PDF"
              accept="image/jpeg,image/png,application/pdf"
            />
          </section>

          {error && (
            <p className="flex items-center gap-1.5 text-sm font-medium text-red-600">
              <AlertCircle className="size-4" /> {error}
            </p>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setStep(0)}
              className="flex-1 sm:flex-none"
            >
              <ArrowLeftIcon className="size-4" /> Back
            </Button>
            <Button
              onClick={() => {
                setError("");
                if (!idPhoto) {
                  setError("Please upload a photo of your ID.");
                  return;
                }
                setStep(2);
              }}
              disabled={!canProceed()}
              className="flex-1 bg-green-600 text-white hover:bg-green-700"
            >
              Continue <ArrowRight className="size-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Liveness Video */}
      {step === 2 && (
        <div className="space-y-6">
          <section className="space-y-4 rounded-xl border border-border bg-card p-5">
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <ScanFace className="size-4 text-primary" /> 5-Second Liveness Check
            </h2>
            <p className="text-sm text-muted-foreground">
              We'll record a 5-second video using your camera. Follow the
              on-screen prompts: <span className="font-medium text-foreground">Blink, Turn Left, Turn Right</span>.
              This replaces a static selfie for anti-spoof protection.
            </p>

            {!livenessData ? (
              <LivenessCamera
                onComplete={(data) => setLivenessData(data)}
                onError={(msg) => setError(msg)}
              />
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-4">
                  <CheckCircle2 className="size-5 text-green-600" />
                  <div>
                    <p className="text-sm font-semibold text-green-700">
                      Liveness video captured successfully
                    </p>
                    <p className="text-xs text-green-600">
                      Ready for verification
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLivenessData(null)}
                  className="w-full"
                >
                  Retake Video
                </Button>
              </div>
            )}
          </section>

          {error && (
            <p className="flex items-center gap-1.5 text-sm font-medium text-red-600">
              <AlertCircle className="size-4" /> {error}
            </p>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setStep(1)}
              className="flex-1 sm:flex-none"
            >
              <ArrowLeftIcon className="size-4" /> Back
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!canProceed() || submitting}
              className="flex-1 bg-green-600 text-white hover:bg-green-700"
            >
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Verifying…
                </>
              ) : (
                <>
                  <ShieldCheck className="size-4" /> Submit for Verification
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
