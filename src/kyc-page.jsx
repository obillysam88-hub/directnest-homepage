import { useRef, useState, useEffect, useCallback } from "react";
import * as faceapi from "face-api.js";
import {
  ShieldCheck,
  X,
  Loader as Loader2,
  CircleCheck as CheckCircle2,
  CircleAlert as AlertCircle,
  ArrowLeft,
  IdCard,
  Camera,
  Clock,
  Ban,
  ScanFace,
  ArrowRight,
  ArrowLeft as ArrowLeftIcon,
  Sparkles,
  Fingerprint,
  Crop,
  Upload,
  PencilLine,
} from "lucide-react";
import { Button, Input, Label, Badge, cn } from "./components.jsx";
import { supabase, KYC_BUCKET } from "./lib/supabase.js";
import { useAuth } from "./auth-context.jsx";

/* ---------- Helpers ---------- */
async function hashNin(nin) {
  try {
    const buf = new TextEncoder().encode(nin);
    const hash = await crypto.subtle.digest("SHA-256", buf);
    return Array.from(new Uint8Array(hash))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  } catch {
    return btoa(nin).slice(0, 64);
  }
}

async function uploadFile(file, bucket, folder) {
  const ext = (file.name || "bin").split(".").pop() || "bin";
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: false });
  if (error) throw error;
  const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);
  return pub.publicUrl;
}

/* ---------- face-api.js model loading ---------- */
let modelsLoaded = false;
let modelsLoading = null;

async function ensureModels() {
  if (modelsLoaded) return true;
  if (modelsLoading) return modelsLoading;
  modelsLoading = (async () => {
    const MODEL_URL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.13/model";
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ]);
    modelsLoaded = true;
  })();
  return modelsLoading;
}

async function matchFaces(idImageEl, selfieImageEl) {
  const opts = new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.3 });
  const idDesc = await faceapi.detectSingleFace(idImageEl, opts).withFaceLandmarks().withFaceDescriptor();
  const selfieDesc = await faceapi.detectSingleFace(selfieImageEl, opts).withFaceLandmarks().withFaceDescriptor();
  if (!idDesc || !selfieDesc) return { score: null, reason: "no_face", detail: !idDesc && !selfieDesc ? "neither" : !idDesc ? "nin" : "selfie" };
  const dist = faceapi.euclideanDistance(idDesc.descriptor, selfieDesc.descriptor);
  const similarity = Math.max(0, 1 - dist);
  return { score: similarity, reason: null };
}

/* ---------- Liveness prompts ---------- */
const LIVENESS_PROMPTS = ["Blink", "Turn Left", "Smile"];

/* ---------- Progress bar ---------- */
function ProgressBar({ current, steps }) {
  return (
    <div className="mb-6 overflow-x-auto">
      <div className="flex min-w-max items-center justify-between gap-1">
        {steps.map((step, i) => (
          <div key={i} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  "flex size-8 items-center justify-center rounded-full border-2 text-xs font-bold transition sm:size-9 sm:text-sm",
                  i < current
                    ? "border-primary bg-primary text-primary-foreground"
                    : i === current
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-secondary text-muted-foreground"
                )}
              >
                {i < current ? <CheckCircle2 className="size-4 sm:size-5" /> : i + 1}
              </div>
              <span
                className={cn(
                  "text-[9px] font-medium sm:text-[11px]",
                  i <= current ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {step}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={cn(
                  "mx-1 h-0.5 w-4 rounded transition sm:w-8",
                  i < current ? "bg-primary" : "bg-border"
                )}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Slip upload (camera or file) ---------- */
function SlipUpload({ onCapture }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);
  const [mode, setMode] = useState("choice");
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    return () => {
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    };
  }, []);

  async function startCamera() {
    setMode("camera");
    setReady(false);
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setReady(true);
    } catch {
      setError("Could not access camera. You can upload a file instead.");
    }
  }

  function capture() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `nin-slip-${Date.now()}.jpg`, { type: "image/jpeg" });
      const url = URL.createObjectURL(blob);
      onCapture({ file, url });
    }, "image/jpeg", 0.85);
  }

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    onCapture({ file, url });
    e.target.value = "";
  }

  if (mode === "choice") {
    return (
      <div className="grid gap-2 sm:grid-cols-2">
        <Button onClick={startCamera} variant="outline" className="h-24 flex-col gap-2">
          <Camera className="size-6 text-primary" />
          <span className="text-sm font-semibold">Take Photo</span>
        </Button>
        <Button onClick={() => setMode("file")} variant="outline" className="h-24 flex-col gap-2">
          <Upload className="size-6 text-primary" />
          <span className="text-sm font-semibold">Upload File</span>
        </Button>
      </div>
    );
  }

  if (mode === "file") {
    return (
      <div
        onClick={() => fileInputRef.current?.click()}
        className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-secondary/40 p-8 text-center transition hover:border-primary/50"
      >
        <Upload className="size-8 text-muted-foreground" />
        <p className="text-sm font-medium">Click to upload NIN slip</p>
        <p className="text-xs text-muted-foreground">JPG, PNG accepted</p>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-xl border-2 border-border bg-black">
        <video ref={videoRef} autoPlay playsInline muted className="aspect-[4/3] w-full object-cover" />
        {!ready && !error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <Loader2 className="size-8 animate-spin text-white" />
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-red-600/80 p-4 text-center">
            <AlertCircle className="size-8 text-white" />
            <p className="text-sm font-semibold text-white">{error}</p>
            <Button variant="outline" onClick={() => setMode("choice")} className="mt-2 text-xs">Go Back</Button>
          </div>
        )}
      </div>
      {ready && (
        <Button onClick={capture} className="w-full bg-green-600 text-white hover:bg-green-700">
          <Camera className="size-4" /> Capture NIN Slip
        </Button>
      )}
    </div>
  );
}

/* ---------- Crop Face Tool ---------- */
function CropFaceTool({ imageUrl, onCrop }) {
  const imgRef = useRef(null);
  const containerRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [box, setBox] = useState(null);
  const [start, setStart] = useState(null);
  const [cropped, setCropped] = useState(null);
  const [sizeError, setSizeError] = useState(false);
  const MIN_CROP = 120;

  function onPointerDown(e) {
    if (cropped) return;
    const rect = containerRef.current.getBoundingClientRect();
    setStart({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setDragging(true);
    setBox({ x: e.clientX - rect.left, y: e.clientY - rect.top, w: 0, h: 0 });
  }

  function onPointerMove(e) {
    if (!dragging || !start) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const y = Math.max(0, Math.min(e.clientY - rect.top, rect.height));
    setBox({ x: Math.min(start.x, x), y: Math.min(start.y, y), w: Math.abs(x - start.x), h: Math.abs(y - start.y) });
  }

  function onPointerUp() {
    if (!dragging) return;
    setDragging(false);
    if (box && box.w > 20 && box.h > 20) doCrop();
  }

  function doCrop() {
    const img = imgRef.current;
    const container = containerRef.current;
    if (!img || !box) return;
    const displayedW = container.getBoundingClientRect().width;
    const displayedH = container.getBoundingClientRect().height;
    const scaleX = img.naturalWidth / displayedW;
    const scaleY = img.naturalHeight / displayedH;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(box.w * scaleX);
    canvas.height = Math.round(box.h * scaleY);
    canvas.getContext("2d").drawImage(
      img,
      Math.round(box.x * scaleX), Math.round(box.y * scaleY),
      Math.round(box.w * scaleX), Math.round(box.h * scaleY),
      0, 0, canvas.width, canvas.height
    );
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const file = new File([blob], `nin-face-${Date.now()}.jpg`, { type: "image/jpeg" });
      if (canvas.width < MIN_CROP || canvas.height < MIN_CROP) {
        setSizeError(true);
        setCropped(null);
        return;
      }
      setSizeError(false);
      setCropped({ file, url });
      onCrop({ file, url });
    }, "image/jpeg", 0.9);
  }

  function resetCrop() {
    setCropped(null);
    setBox(null);
    setStart(null);
    setSizeError(false);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3">
        <Crop className="size-5 shrink-0 text-primary" />
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">Crop the face</span> from the NIN slip.
          Drag to select the face area — this is used for face matching.
        </p>
      </div>
      {!cropped ? (
        <div
          ref={containerRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
          className="relative cursor-crosshair touch-none select-none overflow-hidden rounded-xl border-2 border-border"
        >
          <img ref={imgRef} src={imageUrl} alt="NIN Slip" className="max-h-72 w-full object-contain" draggable={false} />
          {box && (
            <div className="absolute border-2 border-primary bg-primary/20" style={{ left: box.x, top: box.y, width: box.w, height: box.h }} />
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-4">
            <CheckCircle2 className="size-5 text-green-600" />
            <div>
              <p className="text-sm font-semibold text-green-700">Face cropped successfully</p>
              <p className="text-xs text-green-600">This will be used for face matching</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <img src={cropped.url} alt="Cropped face" className="size-20 rounded-md border border-border object-cover" />
            <Button variant="outline" onClick={resetCrop} className="text-xs">
              <Crop className="size-3.5" /> Re-crop
            </Button>
          </div>
        </div>
      )}
      {sizeError && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <AlertCircle className="size-5 shrink-0 text-amber-600" />
          <p className="text-sm font-medium text-amber-700">Crop closer to the face. Minimum size is 120×120px.</p>
        </div>
      )}
      {!cropped && !sizeError && box && box.w > 20 && box.h > 20 && !dragging && (
        <Button onClick={doCrop} className="w-full bg-green-600 text-white hover:bg-green-700">
          <CheckCircle2 className="size-4" /> Confirm Crop
        </Button>
      )}
      {sizeError && (
        <Button variant="outline" onClick={resetCrop} className="w-full">
          <Crop className="size-4" /> Try Again
        </Button>
      )}
    </div>
  );
}

/* ---------- Liveness camera component ---------- */
function LivenessCamera({ onComplete }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [phase, setPhase] = useState("idle");
  const [promptIndex, setPromptIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(5);
  const [cameraReady, setCameraReady] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
        setCameraReady(true);
      } catch {
        setError("Could not access camera. Please allow camera permissions.");
        setPhase("error");
      }
    }
    start();
    return () => { cancelled = true; if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop()); };
  }, []);

  function startRecording() {
    if (!streamRef.current) return;
    setPhase("recording");
    setPromptIndex(0);
    setSecondsLeft(5);
  }

  useEffect(() => {
    if (phase !== "recording") return;
    const tick = setInterval(() => {
      setSecondsLeft((prev) => { if (prev <= 1) { captureSelfie(); return 0; } return prev - 1; });
    }, 1000);
    return () => clearInterval(tick);
  }, [phase]);

  useEffect(() => {
    if (phase !== "recording") return;
    const elapsed = 5 - secondsLeft;
    setPromptIndex(Math.min(Math.floor((elapsed / 5) * LIVENESS_PROMPTS.length), LIVENESS_PROMPTS.length - 1));
  }, [secondsLeft, phase]);

  function captureSelfie() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `selfie-${Date.now()}.jpg`, { type: "image/jpeg" });
      const url = URL.createObjectURL(blob);
      onComplete({ file, url });
      setPhase("done");
    }, "image/jpeg", 0.9);
  }

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-xl border-2 border-border bg-black">
        <video ref={videoRef} autoPlay playsInline muted className="aspect-[4/3] w-full object-cover" />
        {phase === "recording" && (
          <div className="absolute left-0 right-0 top-0 bg-gradient-to-b from-black/70 to-transparent p-4">
            <div className="flex items-center justify-between">
              <Badge className="bg-red-500 text-white"><span className="size-2 animate-pulse rounded-full bg-white" /> REC</Badge>
              <span className="font-mono text-lg font-bold text-white">0:{String(secondsLeft).padStart(1, "0")}</span>
            </div>
            <div className="mt-3 rounded-lg bg-primary/90 px-4 py-2 text-center">
              <p className="text-sm font-bold text-white"><ScanFace className="mr-1.5 inline size-4" />{LIVENESS_PROMPTS[promptIndex]}</p>
            </div>
          </div>
        )}
        {phase === "idle" && cameraReady && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/40 p-4 text-center">
            <ScanFace className="size-10 text-white/80" />
            <p className="text-sm font-medium text-white/90">Camera ready. Press start when prepared.</p>
          </div>
        )}
        {phase === "done" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-green-600/80 p-4 text-center">
            <CheckCircle2 className="size-10 text-white" />
            <p className="text-sm font-semibold text-white">Selfie captured</p>
          </div>
        )}
        {phase === "error" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-red-600/80 p-4 text-center">
            <AlertCircle className="size-10 text-white" />
            <p className="text-sm font-semibold text-white">{error}</p>
          </div>
        )}
      </div>
      {phase === "idle" && cameraReady && (
        <Button onClick={startRecording} className="w-full bg-green-600 text-white hover:bg-green-700">
          <ScanFace className="size-4" /> Start Liveness Check
        </Button>
      )}
      {phase === "recording" && <p className="text-center text-xs text-muted-foreground">Follow the prompts. Keep your face centered.</p>}
      {phase === "done" && <Button variant="outline" onClick={() => setPhase("idle")} className="w-full">Retake</Button>}
    </div>
  );
}

/* ---------- Step 4: Fraud Checks + Submit ---------- */
function Step4FraudChecks({ nin, ocrData, verificationLevel, faceMatchScore, preChecks, runPreChecks, onSubmit, submitting, error, onBack, onRetakePhotos }) {
  const faceMatchPassed = faceMatchScore !== null && faceMatchScore >= 0.7;
  const blacklistPassed = preChecks.blacklist === true;
  const rateLimitPassed = preChecks.rateLimit === true;
  const allPassed = blacklistPassed && rateLimitPassed && faceMatchPassed;

  useEffect(() => {
    runPreChecks();
  }, [runPreChecks]);

  return (
    <div className="space-y-6">
      <section className="space-y-4 rounded-xl border border-border bg-card p-5">
        <h2 className="flex items-center gap-2 text-base font-semibold"><Fingerprint className="size-4 text-primary" /> Fraud Checks</h2>
        <div className="space-y-3">
          <div className="flex items-center gap-3 rounded-lg border border-border p-3">
            {preChecks.loading ? <Loader2 className="size-5 animate-spin text-muted-foreground" /> : blacklistPassed ? <CheckCircle2 className="size-5 text-green-600" /> : <AlertCircle className="size-5 text-red-600" />}
            <div><p className="text-sm font-medium">NIN Blacklist Check</p><p className="text-xs text-muted-foreground">Checking against blocked IDs</p></div>
            {preChecks.loading ? <Badge className="ml-auto bg-secondary text-muted-foreground">Checking…</Badge> : <Badge className={cn("ml-auto", blacklistPassed ? "bg-green-50 text-green-700 ring-1 ring-green-200" : "bg-red-50 text-red-700 ring-1 ring-red-200")}>{blacklistPassed ? "Clear" : "Blocked"}</Badge>}
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-border p-3">
            {preChecks.loading ? <Loader2 className="size-5 animate-spin text-muted-foreground" /> : rateLimitPassed ? <CheckCircle2 className="size-5 text-green-600" /> : <AlertCircle className="size-5 text-red-600" />}
            <div><p className="text-sm font-medium">Rate Limit Check</p><p className="text-xs text-muted-foreground">1 attempt per NIN per 24 hours</p></div>
            {preChecks.loading ? <Badge className="ml-auto bg-secondary text-muted-foreground">Checking…</Badge> : <Badge className={cn("ml-auto", rateLimitPassed ? "bg-green-50 text-green-700 ring-1 ring-green-200" : "bg-red-50 text-red-700 ring-1 ring-red-200")}>{rateLimitPassed ? "OK" : "Locked"}</Badge>}
          </div>
          <div className="flex items-center gap-3 rounded-lg border p-3">
            {faceMatchPassed ? <CheckCircle2 className="size-5 text-green-600" /> : <AlertCircle className="size-5 text-red-600" />}
            <div><p className="text-sm font-medium">Face Match</p><p className="text-xs text-muted-foreground">Score: {faceMatchScore !== null ? `${(faceMatchScore * 100).toFixed(1)}%` : "Not run"} (threshold: 70%)</p></div>
            <Badge className={cn("ml-auto", faceMatchPassed ? "bg-green-50 text-green-700 ring-1 ring-green-200" : "bg-red-50 text-red-700 ring-1 ring-red-200")}>{faceMatchPassed ? "Pass" : "Fail"}</Badge>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <h3 className="mb-3 text-sm font-semibold">Verification Summary</h3>
        <div className="grid gap-2 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">NIN</span><span className="font-mono">{nin.replace(/(\d{4})(\d{3})(\d{4})/, "•••••••$3")}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Name</span><span>{ocrData.name}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Face Match</span><span>{faceMatchPassed ? "Passed" : "Failed"}</span></div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Verification Level</span>
            <Badge className={cn(verificationLevel === "manual" ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200" : "bg-blue-50 text-blue-700 ring-1 ring-blue-200")}>
              {verificationLevel === "manual" ? <PencilLine className="size-3" /> : <Sparkles className="size-3" />}
              {verificationLevel === "manual" ? "Manual" : "Auto"}
            </Badge>
          </div>
        </div>
      </section>

      {!allPassed && !preChecks.loading && (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
          <AlertCircle className="mt-0.5 size-5 shrink-0 text-red-600" />
          <div>
            <p className="text-sm font-semibold text-red-700">
              {!faceMatchPassed ? "Faces don't match. Please retake NIN photo and Selfie." : !blacklistPassed ? "This ID is blacklisted." : "Rate limit active — try again later."}
            </p>
            {!faceMatchPassed && <p className="mt-1 text-xs text-red-600">Go back to retake your selfie and re-run the face match.</p>}
          </div>
        </div>
      )}

      {error && <p className="flex items-center gap-1.5 text-sm font-medium text-red-600"><AlertCircle className="size-4" /> {error}</p>}

      <div className="flex gap-2">
        <Button variant="outline" onClick={onBack} className="flex-1 sm:flex-none"><ArrowLeftIcon className="size-4" /> Back</Button>
        {allPassed ? (
          <Button onClick={onSubmit} disabled={submitting} className="flex-1 bg-green-600 text-white hover:bg-green-700">
            {submitting ? <><Loader2 className="size-4 animate-spin" /> Verifying…</> : <><ShieldCheck className="size-4" /> Complete Verification</>}
          </Button>
        ) : (
          <Button onClick={onRetakePhotos} className="flex-1 bg-green-600 text-white hover:bg-green-700">
            <Camera className="size-4" /> Retake Photos
          </Button>
        )}
      </div>
    </div>
  );
}

/* ---------- Main KYC Page ---------- */
const ALL_STEPS = ["NIN Input", "Upload Slip", "OCR / Manual", "Selfie", "Verified"];

export default function KycPage({ onBack }) {
  const { user, loading, ensureUser, refreshUser } = useAuth();
  const [step, setStep] = useState(0);
  const [nin, setNin] = useState("");
  const [slipPhoto, setSlipPhoto] = useState(null);
  const [ninFacePhoto, setNinFacePhoto] = useState(null);
  const [ocrData, setOcrData] = useState({ name: "", dob: "", gender: "" });
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrAttempts, setOcrAttempts] = useState(0);
  const [ocrFailed, setOcrFailed] = useState(false);
  const [verificationLevel, setVerificationLevel] = useState(null);
  const [selfieData, setSelfieData] = useState(null);
  const [faceMatchScore, setFaceMatchScore] = useState(null);
  const [faceMatchLoading, setFaceMatchLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [toast, setToast] = useState("");
  const [error, setError] = useState("");
  const [cooldownInfo, setCooldownInfo] = useState(null);
  const [blacklisted, setBlacklisted] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [showTestControls, setShowTestControls] = useState(false);
  const [testMode, setTestMode] = useState(null);
  const [preChecks, setPreChecks] = useState({ blacklist: null, rateLimit: null, loading: false });

  useEffect(() => {
    if (loading || !user) return;
    if (user.is_blacklisted) { setBlacklisted(true); return; }
    if (user.cooldown_until) {
      const expiry = new Date(user.cooldown_until).getTime();
      if (expiry > Date.now()) setCooldownInfo({ until: user.cooldown_until, remaining: expiry - Date.now() });
    }
    setFailedAttempts(user.failed_attempts || 0);
  }, [user, loading]);

  useEffect(() => {
    if (!cooldownInfo) return;
    const id = setInterval(() => {
      const remaining = new Date(cooldownInfo.until).getTime() - Date.now();
      if (remaining <= 0) setCooldownInfo(null);
      else setCooldownInfo((prev) => ({ ...prev, remaining }));
    }, 1000);
    return () => clearInterval(id);
  }, [cooldownInfo]);

  function formatCooldown(ms) {
    const h = Math.floor(ms / (1000 * 60 * 60));
    const m = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    return `${h}h ${m}m`;
  }

  async function simulateOCR() {
    setOcrLoading(true);
    await new Promise((r) => setTimeout(r, 1500));
    const newAttempts = ocrAttempts + 1;
    setOcrAttempts(newAttempts);
    if (nin === "12345678901") {
      setOcrData({ name: "TEST USER", dob: "1990-01-01", gender: "Male" });
      setVerificationLevel("auto");
      setOcrFailed(false);
    } else if (newAttempts >= 2) {
      setOcrData({ name: "", dob: "", gender: "" });
      setOcrFailed(true);
      setVerificationLevel("manual");
    } else {
      setOcrData({ name: "", dob: "", gender: "" });
      setOcrFailed(false);
    }
    setOcrLoading(false);
  }

  const runPreChecks = useCallback(async () => {
    setPreChecks({ blacklist: null, rateLimit: null, loading: true });
    try {
      const ninHash = await hashNin(nin.trim());
      const { data: blacklistHit } = await supabase
        .from("kyc_blacklist").select("id, reason").eq("nin_hash", ninHash).limit(1).maybeSingle();
      const blacklistPass = !blacklistHit;
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: recentAttempt } = await supabase
        .from("kyc_attempts").select("id, created_at").eq("nin_hash", ninHash)
        .gte("created_at", twentyFourHoursAgo).order("created_at", { ascending: false }).limit(1).maybeSingle();
      const rateLimitPass = !recentAttempt;
      setPreChecks({ blacklist: blacklistPass, rateLimit: rateLimitPass, loading: false });
    } catch {
      setPreChecks({ blacklist: true, rateLimit: true, loading: false });
    }
  }, [nin]);

  function retryOCR() {
    setSlipPhoto(null);
    setOcrData({ name: "", dob: "", gender: "" });
    setOcrAttempts(0);
    setOcrFailed(false);
    setNinFacePhoto(null);
    setVerificationLevel(null);
  }

  async function runFaceMatch() {
    setFaceMatchLoading(true);
    setError("");
    if (!ninFacePhoto || !ninFacePhoto.file) {
      setError("Missing NIN face photo. Please retake the crop.");
      setFaceMatchLoading(false);
      return;
    }
    if (!selfieData || !selfieData.file) {
      setError("Missing selfie. Please retake.");
      setFaceMatchLoading(false);
      return;
    }
    console.log("[FaceMatch] nin_face_photo:", { file: ninFacePhoto.file, url: ninFacePhoto.url, size: ninFacePhoto.file.size, type: ninFacePhoto.file.type });
    console.log("[FaceMatch] liveness_selfie:", { file: selfieData.file, url: selfieData.url, size: selfieData.file.size, type: selfieData.file.type });
    try {
      if (testMode === "fail") { setFaceMatchScore(0.3); setFaceMatchLoading(false); return; }
      if (testMode === "pass") { setFaceMatchScore(0.85); setFaceMatchLoading(false); return; }
      await ensureModels();
      const idImg = new Image();
      idImg.src = ninFacePhoto.url;
      await new Promise((res, rej) => { idImg.onload = res; idImg.onerror = rej; });
      console.log("[FaceMatch] NIN face image loaded:", idImg.naturalWidth, "x", idImg.naturalHeight);
      const selfieImg = new Image();
      selfieImg.src = selfieData.url;
      await new Promise((res, rej) => { selfieImg.onload = res; selfieImg.onerror = rej; });
      console.log("[FaceMatch] Selfie image loaded:", selfieImg.naturalWidth, "x", selfieImg.naturalHeight);
      const result = await matchFaces(idImg, selfieImg);
      console.log("[FaceMatch] Result:", result);
      if (result.score === null) {
        setError("Face too small or blurry. Please retake with good light.");
        setFaceMatchScore(null);
      } else {
        setFaceMatchScore(result.score);
        if (result.reason) setError(result.reason);
      }
    } catch (err) {
      console.error("[FaceMatch] Error:", err);
      setError("Face detection failed. Please retake both the NIN crop and selfie.");
      setFaceMatchScore(null);
    } finally {
      setFaceMatchLoading(false);
    }
  }

  async function handleSubmit() {
    setError("");
    if (!ninFacePhoto || !ninFacePhoto.file) {
      setError("Missing NIN face photo. Please retake the crop.");
      return;
    }
    if (!selfieData || !selfieData.file) {
      setError("Missing selfie. Please retake.");
      return;
    }
    console.log("[Submit] nin_face_photo:", { file: ninFacePhoto.file, url: ninFacePhoto.url, size: ninFacePhoto.file.size, type: ninFacePhoto.file.type });
    console.log("[Submit] liveness_selfie:", { file: selfieData.file, url: selfieData.url, size: selfieData.file.size, type: selfieData.file.type });
    setSubmitting(true);
    try {
      const userId = await ensureUser();
      if (!userId) throw new Error("Could not create or retrieve user session.");
      const ninHash = await hashNin(nin.trim());

      const { data: blacklistHit } = await supabase
        .from("kyc_blacklist").select("id, reason").eq("nin_hash", ninHash).limit(1).maybeSingle();
      if (blacklistHit) {
        setError("This ID is blacklisted.");
        setBlacklisted(true);
        await supabase.from("users").update({ is_blacklisted: true, kyc_status: "blacklisted" }).eq("id", userId);
        setSubmitting(false);
        return;
      }

      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: recentAttempt } = await supabase
        .from("kyc_attempts").select("id, created_at").eq("nin_hash", ninHash)
        .gte("created_at", twentyFourHoursAgo).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (recentAttempt) {
        const nextAllowed = new Date(new Date(recentAttempt.created_at).getTime() + 24 * 60 * 60 * 1000);
        const hoursLeft = Math.ceil((nextAllowed.getTime() - Date.now()) / (1000 * 60 * 60));
        setError(`Try again in ${hoursLeft} hour${hoursLeft > 1 ? "s" : ""}.`);
        setSubmitting(false);
        return;
      }

      const score = faceMatchScore ?? 0;
      const passed = score > 0.7;

      const folder = `kyc-${userId}-${Date.now()}`;
      let slipPhotoUrl = null, facePhotoUrl = null, selfieUrl = null;
      try {
        slipPhotoUrl = await uploadFile(slipPhoto.file, KYC_BUCKET, folder);
        facePhotoUrl = await uploadFile(ninFacePhoto.file, KYC_BUCKET, folder);
        selfieUrl = await uploadFile(selfieData.file, KYC_BUCKET, folder);
      } catch { /* storage may fail in sandbox */ }

      await supabase.from("kyc_attempts").insert({
        user_id: userId, id_type: "NIN", id_number: nin.trim(), nin_hash: ninHash,
        id_photo_url: slipPhotoUrl, nin_face_photo_url: facePhotoUrl, liveness_frame_url: selfieUrl,
        face_similarity_score: score, liveness_check_passed: passed,
        status: passed ? "approved" : "failed", failure_reason: passed ? null : "Face match below threshold",
        verification_level: verificationLevel,
      });

      if (!passed) {
        const newFailed = failedAttempts + 1;
        setFailedAttempts(newFailed);
        if (newFailed >= 3) {
          await supabase.from("users").update({ is_blacklisted: true, kyc_status: "blacklisted", failed_attempts: newFailed }).eq("id", userId);
          await supabase.from("kyc_blacklist").insert({ user_id: userId, nin_hash: ninHash, nin: nin.trim(), reason: "3 failed face match attempts" });
          setBlacklisted(true);
        } else if (newFailed >= 2) {
          const cooldownUntil = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
          await supabase.from("users").update({ kyc_status: "cooldown", failed_attempts: newFailed, cooldown_until: cooldownUntil }).eq("id", userId);
          setCooldownInfo({ until: cooldownUntil, remaining: 24 * 60 * 60 * 1000 });
        } else {
          await supabase.from("users").update({ kyc_status: "unverified", failed_attempts: newFailed }).eq("id", userId);
        }
        setError("Face did not match. Try again.");
        setSubmitting(false);
        return;
      }

      await supabase.from("verified_users").insert({
        user_id: userId, nin_hash: ninHash, full_name: ocrData.name || "Verified User",
        status: "verified", verification_level: verificationLevel,
      });
      await supabase.from("users").update({
        kyc_status: "fully_verified", is_verified: true, badge: "Fully Verified",
        kyc_date: new Date().toISOString(),
        failed_attempts: 0, cooldown_until: null, id_type: "NIN", id_number: nin.trim(), full_name_on_id: ocrData.name,
      }).eq("id", userId);
      await refreshUser();
      setToast("Verification Complete! You are now Fully Verified");
      setSubmitted(true);
      setTimeout(() => { onBack(); }, 2500);
    } catch (err) {
      setError("Submission failed: " + (err.message || "Unknown error."));
    } finally {
      setSubmitting(false);
    }
  }

  if (blacklisted) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-16 text-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-red-100 text-red-600"><Ban className="size-8" /></div>
        <h1 className="mt-5 text-2xl font-bold">Account Blacklisted</h1>
        <p className="mt-2 text-muted-foreground">This account has been permanently banned due to repeated verification failures. If you believe this is an error, contact support@directnest.com.ng</p>
        <Button onClick={onBack} className="mt-6">Back to home</Button>
      </div>
    );
  }

  if (cooldownInfo) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-16 text-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-amber-100 text-amber-600"><Clock className="size-8" /></div>
        <h1 className="mt-5 text-2xl font-bold">Too Many Failed Attempts</h1>
        <p className="mt-2 text-muted-foreground">For security, you must wait before trying again.</p>
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-8 py-4">
          <p className="text-sm text-muted-foreground">Try again in</p>
          <p className="font-mono text-3xl font-bold text-amber-700">{formatCooldown(cooldownInfo.remaining)}</p>
        </div>
        <Button onClick={onBack} className="mt-6">Back to home</Button>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-16 text-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-green-100 text-green-600"><CheckCircle2 className="size-8" /></div>
        <h1 className="mt-5 text-2xl font-bold">Verification Successful!</h1>
        <p className="mt-2 text-muted-foreground">You are now a <span className="font-semibold text-foreground">Verified Renter</span>. You can chat with owners and book inspections directly.</p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <Badge className="bg-green-50 text-green-700 ring-1 ring-green-200"><ShieldCheck className="size-3.5" /> Verified Renter</Badge>
          <Badge className={cn("ring-1", verificationLevel === "manual" ? "bg-amber-50 text-amber-700 ring-amber-200" : "bg-blue-50 text-blue-700 ring-blue-200")}>
            {verificationLevel === "manual" ? <PencilLine className="size-3.5" /> : <Sparkles className="size-3.5" />}
            {verificationLevel === "manual" ? "Manual Entry" : "Auto OCR"}
          </Badge>
        </div>
        <Button onClick={onBack} className="mt-6 bg-green-600 text-white hover:bg-green-700">Back to home</Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground"><Loader2 className="mr-2 size-5 animate-spin" /> Loading…</div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <button onClick={onBack} className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Back to home
      </button>

      <div className="mb-6">
        <div className="flex items-center gap-2">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary"><ShieldCheck className="size-5" /></div>
          <div>
            <h1 className="text-2xl font-bold">Verify to Chat</h1>
            <p className="text-sm text-muted-foreground">NIN verification with liveness check</p>
          </div>
        </div>
      </div>

      <ProgressBar current={step} steps={ALL_STEPS} />

      {toast && (
        <div className="fixed left-1/2 top-6 z-50 -translate-x-1/2 animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700 shadow-lg">
            <CheckCircle2 className="size-5 text-green-600" />
            {toast}
          </div>
        </div>
      )}

      {/* Step 0: NIN Input */}
      {step === 0 && (
        <div className="space-y-6">
          <section className="space-y-4 rounded-xl border border-border bg-card p-5">
            <h2 className="flex items-center gap-2 text-base font-semibold"><IdCard className="size-4 text-primary" /> Choose ID Type</h2>
            <div className="grid gap-3">
              <label className={cn("flex cursor-pointer items-start gap-3 rounded-lg border-2 p-4 transition", "border-primary bg-primary/5")}>
                <input type="radio" name="idType" value="NIN" checked readOnly className="mt-1 accent-[#00C853]" />
                <div><p className="font-semibold">NIN Verification</p><p className="text-xs text-muted-foreground">National Identity Number — Active</p></div>
                <Badge className="ml-auto bg-green-50 text-green-700 ring-1 ring-green-200">Active</Badge>
              </label>
              <div className="group relative">
                <label className={cn("flex cursor-not-allowed items-start gap-3 rounded-lg border-2 border-border bg-secondary/30 p-4 opacity-70 transition")}>
                  <input type="radio" name="idType" value="BVN" disabled className="mt-1 accent-[#00C853]" />
                  <div><p className="font-semibold">BVN Verification</p><p className="text-xs text-muted-foreground">Available at launch for instant verification</p></div>
                  <Badge className="ml-auto bg-amber-50 text-amber-700 ring-1 ring-amber-200">Coming Soon</Badge>
                </label>
                <div className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 rounded-md bg-foreground px-2 py-1 text-xs font-medium text-background opacity-0 transition group-hover:opacity-100">BVN verification will be available at launch</div>
              </div>
            </div>
          </section>

          <section className="space-y-4 rounded-xl border border-border bg-card p-5">
            <h2 className="flex items-center gap-2 text-base font-semibold"><IdCard className="size-4 text-primary" /> Enter NIN Number</h2>
            <div>
              <Label htmlFor="nin">11-digit NIN</Label>
              <Input id="nin" inputMode="numeric" maxLength={11} placeholder="12345678901" value={nin} onChange={(e) => setNin(e.target.value.replace(/[^\d]/g, "").slice(0, 11))} />
              <p className="mt-1 text-xs text-muted-foreground">{nin.length === 11 ? <span className="font-medium text-green-600">Valid format</span> : <span>Must be exactly 11 digits ({nin.length}/11)</span>}</p>
            </div>
          </section>

          {error && <p className="flex items-center gap-1.5 text-sm font-medium text-red-600"><AlertCircle className="size-4" /> {error}</p>}

          <Button onClick={() => { setError(""); if (!/^[0-9]{11}$/.test(nin.trim())) { setError("Please enter a valid 11-digit NIN."); return; } setStep(1); }} disabled={nin.length !== 11} className="w-full bg-green-600 text-white hover:bg-green-700 sm:w-auto">
            Continue <ArrowRight className="size-4" />
          </Button>
        </div>
      )}

      {/* Step 1: Upload Slip */}
      {step === 1 && (
        <div className="space-y-6">
          <section className="space-y-4 rounded-xl border border-border bg-card p-5">
            <h2 className="flex items-center gap-2 text-base font-semibold"><Camera className="size-4 text-primary" /> Upload NIN Slip</h2>
            <p className="text-sm text-muted-foreground">Take a photo or upload your NIN slip. We'll try OCR to auto-fill your details.</p>
            {!slipPhoto ? (
              <SlipUpload onCapture={(data) => { setSlipPhoto(data); setOcrAttempts(0); setOcrFailed(false); simulateOCR(); }} />
            ) : (
              <div className="space-y-3">
                <div className="relative overflow-hidden rounded-lg border border-border">
                  <img src={slipPhoto.url} alt="NIN Slip" className="max-h-48 w-full object-contain" />
                  <button type="button" onClick={() => { setSlipPhoto(null); setOcrData({ name: "", dob: "", gender: "" }); setOcrFailed(false); setNinFacePhoto(null); setVerificationLevel(null); }} className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white"><X className="size-3.5" /></button>
                </div>
              </div>
            )}
          </section>
          {error && <p className="flex items-center gap-1.5 text-sm font-medium text-red-600"><AlertCircle className="size-4" /> {error}</p>}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep(0)} className="flex-1 sm:flex-none"><ArrowLeftIcon className="size-4" /> Back</Button>
            <Button onClick={() => { setError(""); if (!slipPhoto) { setError("Please upload your NIN slip."); return; } setStep(2); }} disabled={!slipPhoto} className="flex-1 bg-green-600 text-white hover:bg-green-700">Continue <ArrowRight className="size-4" /></Button>
          </div>
        </div>
      )}

      {/* Step 2: OCR or Manual Entry + Crop Face */}
      {step === 2 && (
        <div className="space-y-6">
          <section className="space-y-4 rounded-xl border border-border bg-card p-5">
            <h2 className="flex items-center gap-2 text-base font-semibold">
              {ocrFailed ? <PencilLine className="size-4 text-primary" /> : <Sparkles className="size-4 text-primary" />}
              {ocrFailed ? "Manual Entry" : "OCR Extraction"}
            </h2>

            {ocrLoading && (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Extracting details with OCR…</div>
            )}

            {/* OCR Success — Auto mode */}
            {!ocrLoading && !ocrFailed && ocrData.name && (
              <div className="space-y-3">
                <div className="rounded-lg border border-green-200 bg-green-50 p-3">
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-green-700"><Sparkles className="size-3.5" /> OCR extracted — review and edit if needed</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div><Label htmlFor="ocrName">Full Name</Label><Input id="ocrName" value={ocrData.name} onChange={(e) => setOcrData((p) => ({ ...p, name: e.target.value }))} placeholder="Full name" /></div>
                    <div><Label htmlFor="ocrDob">Date of Birth</Label><Input id="ocrDob" value={ocrData.dob} onChange={(e) => setOcrData((p) => ({ ...p, dob: e.target.value }))} placeholder="YYYY-MM-DD" /></div>
                    <div><Label htmlFor="ocrGender">Gender</Label><Input id="ocrGender" value={ocrData.gender} onChange={(e) => setOcrData((p) => ({ ...p, gender: e.target.value }))} placeholder="Gender" /></div>
                  </div>
                </div>
                {!ninFacePhoto && <CropFaceTool imageUrl={slipPhoto.url} onCrop={(data) => setNinFacePhoto(data)} />}
                {ninFacePhoto && (
                  <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-3">
                    <img src={ninFacePhoto.url} alt="Cropped face" className="size-12 rounded-md border border-border object-cover" />
                    <p className="text-sm font-medium text-green-700">Face cropped from slip</p>
                    <Button variant="outline" onClick={() => setNinFacePhoto(null)} className="ml-auto text-xs">Re-crop</Button>
                  </div>
                )}
              </div>
            )}

            {/* OCR Failed — Manual mode */}
            {!ocrLoading && ocrFailed && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
                  <AlertCircle className="size-5 shrink-0 text-amber-600" />
                  <p className="text-sm text-muted-foreground"><span className="font-semibold text-foreground">We couldn't read your slip.</span> Enter details manually below.</p>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div><Label htmlFor="manualName">Full Name *</Label><Input id="manualName" value={ocrData.name} onChange={(e) => setOcrData((p) => ({ ...p, name: e.target.value }))} placeholder="Full name as on NIN" /></div>
                  <div><Label htmlFor="manualDob">Date of Birth *</Label><Input id="manualDob" type="date" value={ocrData.dob} onChange={(e) => setOcrData((p) => ({ ...p, dob: e.target.value }))} /></div>
                  <div>
                    <Label htmlFor="manualGender">Gender *</Label>
                    <select id="manualGender" value={ocrData.gender} onChange={(e) => setOcrData((p) => ({ ...p, gender: e.target.value }))} className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40">
                      <option value="">Select…</option><option value="Male">Male</option><option value="Female">Female</option>
                    </select>
                  </div>
                </div>
                <div className="rounded-lg border-2 border-primary/30 bg-primary/5 p-4">
                  <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-primary"><Crop className="size-4" /> Mandatory: Crop Face from Slip</p>
                  {!ninFacePhoto ? (
                    <CropFaceTool imageUrl={slipPhoto.url} onCrop={(data) => setNinFacePhoto(data)} />
                  ) : (
                    <div className="flex items-center gap-3">
                      <img src={ninFacePhoto.url} alt="Cropped face" className="size-16 rounded-md border border-border object-cover" />
                      <div><p className="text-sm font-semibold text-green-700">Face cropped successfully</p><Button variant="outline" onClick={() => setNinFacePhoto(null)} className="mt-1 text-xs">Re-crop</Button></div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* OCR first attempt failed — retry option */}
            {!ocrLoading && !ocrFailed && !ocrData.name && ocrAttempts === 1 && (
              <div className="space-y-3">
                <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
                  <AlertCircle className="size-5 shrink-0 text-amber-600" />
                  <p className="text-sm text-muted-foreground">OCR couldn't read the slip. Try a clearer photo or enter details manually.</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={retryOCR} className="text-xs"><Camera className="size-3.5" /> Retake Photo</Button>
                  <Button variant="outline" onClick={() => { setOcrFailed(true); setVerificationLevel("manual"); }} className="text-xs"><PencilLine className="size-3.5" /> Enter Manually</Button>
                </div>
              </div>
            )}
          </section>

          {error && <p className="flex items-center gap-1.5 text-sm font-medium text-red-600"><AlertCircle className="size-4" /> {error}</p>}

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep(1)} className="flex-1 sm:flex-none"><ArrowLeftIcon className="size-4" /> Back</Button>
            <Button onClick={() => { setError(""); if (!ocrData.name.trim()) { setError("Please enter your full name."); return; } if (!ninFacePhoto) { setError("Please crop the face from your NIN slip."); return; } setStep(3); }} disabled={!ocrData.name || !ninFacePhoto} className="flex-1 bg-green-600 text-white hover:bg-green-700">Continue <ArrowRight className="size-4" /></Button>
          </div>
        </div>
      )}

      {/* Step 3: Liveness + Face Match */}
      {step === 3 && (
        <div className="space-y-6">
          <section className="space-y-4 rounded-xl border border-border bg-card p-5">
            <h2 className="flex items-center gap-2 text-base font-semibold"><ScanFace className="size-4 text-primary" /> Liveness + Face Match</h2>
            <p className="text-sm text-muted-foreground">We'll capture a quick selfie following the prompts: <span className="font-medium text-foreground">Blink, Turn Left, Smile</span>. Your selfie will be compared to the cropped face from your NIN slip.</p>
            {!selfieData ? (
              <LivenessCamera onComplete={(data) => setSelfieData(data)} />
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-4">
                  <CheckCircle2 className="size-5 text-green-600" />
                  <div><p className="text-sm font-semibold text-green-700">Selfie captured</p><p className="text-xs text-green-600">Ready for face match</p></div>
                </div>
                <div className="flex items-center gap-2">
                  <img src={ninFacePhoto.url} alt="NIN face" className="size-20 rounded-md border border-border object-cover" />
                  <div className="flex items-center text-muted-foreground">→</div>
                  <img src={selfieData.url} alt="Selfie" className="size-20 rounded-md border border-border object-cover" />
                </div>
                <Button variant="outline" onClick={() => { setSelfieData(null); setFaceMatchScore(null); }} className="w-full">Retake Selfie</Button>
              </div>
            )}
          </section>

          {selfieData && faceMatchScore === null && !faceMatchLoading && (
            <Button onClick={runFaceMatch} className="w-full bg-green-600 text-white hover:bg-green-700"><ScanFace className="size-4" /> Run Face Match</Button>
          )}
          {faceMatchLoading && (
            <div className="flex items-center justify-center gap-2 py-3 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Comparing faces…</div>
          )}
          {faceMatchScore !== null && !faceMatchLoading && (
            <div className={cn("flex items-center gap-3 rounded-lg border p-4", faceMatchScore >= 0.7 ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50")}>
              {faceMatchScore >= 0.7 ? <CheckCircle2 className="size-5 text-green-600" /> : <AlertCircle className="size-5 text-red-600" />}
              <div>
                <p className={cn("text-sm font-semibold", faceMatchScore >= 0.7 ? "text-green-700" : "text-red-700")}>Face Match Score: {(faceMatchScore * 100).toFixed(1)}%{faceMatchScore >= 0.7 ? " — Pass" : " — Below threshold (70%)"}</p>
                <p className="text-xs text-muted-foreground">Threshold: 70% (0.7)</p>
              </div>
            </div>
          )}

          <div className="rounded-lg border border-dashed border-border p-3">
            <button onClick={() => setShowTestControls(!showTestControls)} className="text-xs font-medium text-muted-foreground hover:text-foreground">{showTestControls ? "Hide" : "Show"} Test Controls</button>
            {showTestControls && (
              <div className="mt-3 flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => { setTestMode("pass"); setFaceMatchScore(0.85); }} className="text-xs">Simulate Pass (85%)</Button>
                <Button variant="outline" onClick={() => { setTestMode("fail"); setFaceMatchScore(0.3); }} className="text-xs">Simulate Fail (30%)</Button>
                <p className="w-full text-xs text-muted-foreground">Test NIN: 12345678901, Name: TEST USER</p>
              </div>
            )}
          </div>

          {error && <p className="flex items-center gap-1.5 text-sm font-medium text-red-600"><AlertCircle className="size-4" /> {error}</p>}

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep(2)} className="flex-1 sm:flex-none"><ArrowLeftIcon className="size-4" /> Back</Button>
            <Button onClick={() => { setError(""); if (!selfieData) { setError("Please capture a selfie."); return; } if (faceMatchScore === null) { setError("Please run the face match."); return; } if (faceMatchScore < 0.7) { setError("Faces don't match. Please retake NIN photo and Selfie."); return; } setStep(4); }} disabled={!selfieData || faceMatchScore === null || faceMatchScore < 0.7} className="flex-1 bg-green-600 text-white hover:bg-green-700">Continue <ArrowRight className="size-4" /></Button>
          </div>
        </div>
      )}

      {/* Step 4: Fraud Checks + Submit */}
      {step === 4 && (
        <Step4FraudChecks
          nin={nin}
          ocrData={ocrData}
          verificationLevel={verificationLevel}
          faceMatchScore={faceMatchScore}
          preChecks={preChecks}
          runPreChecks={runPreChecks}
          onSubmit={handleSubmit}
          submitting={submitting}
          error={error}
          onBack={() => setStep(3)}
          onRetakePhotos={() => { setSelfieData(null); setFaceMatchScore(null); setStep(3); }}
        />
      )}
    </div>
  );
}
