import { useEffect, useRef, useState } from "react";
import { ShieldCheck, CloudUpload as UploadCloud, X, Loader as Loader2, CircleCheck as CheckCircle2, Video, Play, RefreshCw, Camera, CircleAlert as AlertCircle, ArrowLeft, IdCard, FileCheck, UserRound } from "lucide-react";
import { Button, Input, Label, Badge, cn } from "./components.jsx";

/* ---------- Reusable document upload tile ---------- */
function DocumentUpload({ label, value, onChange, hint }) {
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
          accept="image/*,application/pdf"
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

/* ---------- 5-second liveness video recorder with preview ---------- */
function LivenessRecorder({ videoRef, onRecorded }) {
  const [status, setStatus] = useState("idle"); // idle | previewing | recording | done | error
  const [countdown, setCountdown] = useState(5);
  const [error, setError] = useState("");
  const mediaStreamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const previewVideoRef = useRef(null);

  async function startCamera() {
    setError("");
    setStatus("previewing");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: true,
      });
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err) {
      setError(
        "Could not access the camera. Please grant camera permission and try again."
      );
      setStatus("error");
    }
  }

  function startRecording() {
    if (!mediaStreamRef.current) return;
    setStatus("recording");
    setCountdown(5);
    chunksRef.current = [];
    const mr = new MediaRecorder(mediaStreamRef.current);
    mediaRecorderRef.current = mr;
    mr.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    mr.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      if (previewVideoRef.current) {
        previewVideoRef.current.src = url;
      }
      setStatus("done");
      onRecorded?.({ blob, url });
    };
    mr.start();
    timerRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(timerRef.current);
          mr.stop();
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  }

  function retake() {
    if (previewVideoRef.current) previewVideoRef.current.src = "";
    setStatus("previewing");
    if (videoRef.current && mediaStreamRef.current) {
      videoRef.current.srcObject = mediaStreamRef.current;
      videoRef.current.play();
    }
    onRecorded?.(null);
  }

  function stopCamera() {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    setStatus("idle");
    setCountdown(5);
  }

  useEffect(() => {
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-3">
      <Label>Liveness verification video</Label>
      <div className="overflow-hidden rounded-lg border border-border bg-black">
        <div className="relative aspect-video w-full">
          {/* live camera */}
          <video
            ref={videoRef}
            playsInline
            muted
            className={cn(
              "size-full object-cover",
              status === "recording" || status === "previewing"
                ? "block"
                : "hidden"
            )}
          />
          {/* recorded preview */}
          <video
            ref={previewVideoRef}
            controls
            playsInline
            className={cn(
              "size-full object-cover",
              status === "done" ? "block" : "hidden"
            )}
          />
          {status === "idle" && (
            <div className="flex size-full flex-col items-center justify-center gap-2 text-white/80">
              <Camera className="size-8" />
              <p className="text-sm">Camera is off</p>
            </div>
          )}
          {status === "recording" && (
            <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-red-600 px-2.5 py-1 text-xs font-semibold text-white">
              <span className="size-2 animate-pulse rounded-full bg-white" />
              REC {countdown}s
            </div>
          )}
          {status === "error" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center text-white/80">
              <AlertCircle className="size-8" />
              <p className="text-sm">{error}</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {status === "idle" && (
          <Button type="button" onClick={startCamera}>
            <Camera className="size-4" /> Start camera
          </Button>
        )}
        {status === "previewing" && (
          <>
            <Button type="button" onClick={startRecording}>
              <Video className="size-4" /> Record 5-second video
            </Button>
            <Button type="button" variant="outline" onClick={stopCamera}>
              Cancel
            </Button>
          </>
        )}
        {status === "recording" && (
          <Button type="button" variant="outline" disabled>
            <Loader2 className="size-4 animate-spin" /> Recording… {countdown}s
          </Button>
        )}
        {status === "done" && (
          <>
            <Badge className="bg-green-50 text-green-700 ring-1 ring-green-200">
              <CheckCircle2 className="size-3.5" /> Video captured
            </Badge>
            <Button type="button" variant="outline" onClick={retake}>
              <RefreshCw className="size-4" /> Retake
            </Button>
          </>
        )}
        {status === "error" && (
          <Button type="button" onClick={startCamera}>
            <RefreshCw className="size-4" /> Try again
          </Button>
        )}
      </div>
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <UserRound className="size-3.5" />
        Look directly at the camera and hold still for 5 seconds. Ensure good lighting.
      </p>
    </div>
  );
}

/* ---------- KYC Page ---------- */
export default function KycPage({ onBack }) {
  const [nin, setNin] = useState("");
  const [bvn, setBvn] = useState("");
  const [idFront, setIdFront] = useState(null);
  const [idBack, setIdBack] = useState(null);
  const [proofOfOwnership, setProofOfOwnership] = useState(null);
  const [liveness, setLiveness] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const videoRef = useRef(null);

  function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!nin.trim() || nin.trim().length < 11)
      return setError("Please enter a valid 11-digit NIN.");
    if (!bvn.trim() || bvn.trim().length < 11)
      return setError("Please enter a valid 11-digit BVN.");
    if (!idFront) return setError("Please upload the front of your ID.");
    if (!idBack) return setError("Please upload the back of your ID.");
    if (!proofOfOwnership)
      return setError("Please upload proof of ownership.");
    if (!liveness) return setError("Please record a liveness video.");
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
    }, 900);
  }

  if (submitted) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-16 text-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-green-100 text-green-600">
          <CheckCircle2 className="size-8" />
        </div>
        <h1 className="mt-5 text-2xl font-bold">Verification submitted</h1>
        <p className="mt-2 text-muted-foreground">
          Your KYC details and liveness video have been received. Our team will
          review your submission and update your verification status within
          24–48 hours.
        </p>
        <div className="mt-6 flex gap-2">
          <Button onClick={onBack}>Back to listings</Button>
          <Button
            variant="outline"
            onClick={() => {
              setSubmitted(false);
              setNin("");
              setBvn("");
              setIdFront(null);
              setIdBack(null);
              setProofOfOwnership(null);
              setLiveness(null);
            }}
          >
            Submit another
          </Button>
        </div>
      </div>
    );
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
            <h1 className="text-2xl font-bold">KYC Verification</h1>
            <p className="text-sm text-muted-foreground">
              Verify your identity to list properties and build trust with buyers.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Identity numbers */}
        <section className="space-y-4 rounded-xl border border-border bg-card p-5">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <IdCard className="size-4 text-primary" /> Identity numbers
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="nin">NIN (National ID)</Label>
              <Input
                id="nin"
                inputMode="numeric"
                maxLength={11}
                placeholder="12345678901"
                value={nin}
                onChange={(e) =>
                  setNin(e.target.value.replace(/[^\d]/g, "").slice(0, 11))
                }
              />
              <p className="mt-1 text-xs text-muted-foreground">11 digits</p>
            </div>
            <div>
              <Label htmlFor="bvn">BVN</Label>
              <Input
                id="bvn"
                inputMode="numeric"
                maxLength={11}
                placeholder="12345678901"
                value={bvn}
                onChange={(e) =>
                  setBvn(e.target.value.replace(/[^\d]/g, "").slice(0, 11))
                }
              />
              <p className="mt-1 text-xs text-muted-foreground">11 digits</p>
            </div>
          </div>
        </section>

        {/* Document uploads */}
        <section className="space-y-4 rounded-xl border border-border bg-card p-5">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <FileCheck className="size-4 text-primary" /> Document uploads
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <DocumentUpload
              label="ID Front"
              value={idFront}
              onChange={setIdFront}
              hint="Photo of the front of your ID"
            />
            <DocumentUpload
              label="ID Back"
              value={idBack}
              onChange={setIdBack}
              hint="Photo of the back of your ID"
            />
          </div>
          <DocumentUpload
            label="Proof of Ownership"
            value={proofOfOwnership}
            onChange={setProofOfOwnership}
            hint="Title document, deed, or C of O (image or PDF)"
          />
        </section>

        {/* Liveness */}
        <section className="space-y-4 rounded-xl border border-border bg-card p-5">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <Video className="size-4 text-primary" /> Liveness check
          </h2>
          <LivenessRecorder
            videoRef={videoRef}
            onRecorded={setLiveness}
          />
        </section>

        {error && (
          <p className="flex items-center gap-1.5 text-sm font-medium text-red-600">
            <AlertCircle className="size-4" /> {error}
          </p>
        )}

        <Button
          type="submit"
          disabled={submitting}
          className="w-full sm:w-auto"
        >
          {submitting ? (
            <>
              <Loader2 className="size-4 animate-spin" /> Submitting…
            </>
          ) : (
            <>
              <ShieldCheck className="size-4" /> Submit for Verification
            </>
          )}
        </Button>
      </form>
    </div>
  );
}
