import { useRef, useState } from "react";
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
} from "lucide-react";
import { Button, Input, Label, Badge, cn } from "./components.jsx";
import { supabase, KYC_BUCKET } from "./lib/supabase.js";

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

/* ---------- KYC Page ---------- */
export default function KycPage({ onBack }) {
  const [idType, setIdType] = useState("NIN");
  const [idNumber, setIdNumber] = useState("");
  const [idPhoto, setIdPhoto] = useState(null);
  const [selfieWithId, setSelfieWithId] = useState(null);
  const [fullNameOnId, setFullNameOnId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!idNumber.trim() || idNumber.trim().length !== 11)
      return setError(`Please enter a valid 11-digit ${idType} number.`);
    if (!idPhoto) return setError("Please upload a photo of your ID.");
    if (!selfieWithId)
      return setError("Please upload a selfie holding your ID.");
    if (!fullNameOnId.trim())
      return setError("Please enter your full name as it appears on your ID.");

    setSubmitting(true);
    try {
      const folder = `kyc-${Date.now()}`;
      const [idPhotoUrl, selfieUrl] = await Promise.all([
        uploadFile(idPhoto.file, KYC_BUCKET, folder),
        uploadFile(selfieWithId.file, KYC_BUCKET, folder),
      ]);

      const { error: insertError } = await supabase
        .from("landlord_kyc_submissions")
        .insert({
          id_type: idType,
          id_number: idNumber.trim(),
          id_photo_url: idPhotoUrl,
          selfie_with_id_url: selfieUrl,
          full_name_on_id: fullNameOnId.trim(),
          full_name: fullNameOnId.trim(),
          status: "pending",
        });

      if (insertError) throw insertError;
      setSubmitted(true);
    } catch (err) {
      setError(
        "Submission failed: " +
          (err.message || "Unknown error. Please try again.")
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-16 text-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-green-100 text-green-600">
          <CheckCircle2 className="size-8" />
        </div>
        <h1 className="mt-5 text-2xl font-bold">Pending Review</h1>
        <p className="mt-2 text-muted-foreground">
          Your verification is being reviewed. This usually takes up to{" "}
          <span className="font-semibold text-foreground">24 hours</span>. You
          will be able to see exact addresses and contact owners once approved.
        </p>
        <Badge className="mt-4 bg-amber-50 text-amber-700 ring-1 ring-amber-200">
          <Clock className="size-3.5" /> Status: Pending Review
        </Badge>
        <div className="mt-6 flex gap-2">
          <Button onClick={onBack}>Back to home</Button>
          <Button
            variant="outline"
            onClick={() => {
              setSubmitted(false);
              setIdType("NIN");
              setIdNumber("");
              setIdPhoto(null);
              setSelfieWithId(null);
              setFullNameOnId("");
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
            <h1 className="text-2xl font-bold">Verify Your Identity</h1>
            <p className="text-sm text-muted-foreground">
              To prevent agents and fraud, get verified in 2 minutes
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ID Type selection */}
        <section className="space-y-4 rounded-xl border border-border bg-card p-5">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <IdCard className="size-4 text-primary" /> ID Type
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
                <p className="text-xs text-muted-foreground">Recommended</p>
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
                <p className="text-xs text-muted-foreground">Alternative</p>
              </div>
            </label>
          </div>
        </section>

        {/* ID Number */}
        <section className="space-y-4 rounded-xl border border-border bg-card p-5">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <IdCard className="size-4 text-primary" /> {idType} Number
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

        {/* Document uploads */}
        <section className="space-y-4 rounded-xl border border-border bg-card p-5">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <FileCheck className="size-4 text-primary" /> Document Uploads
          </h2>
          <DocumentUpload
            label="Upload ID Photo"
            value={idPhoto}
            onChange={setIdPhoto}
            hint="JPG, PNG, or PDF"
            accept="image/jpeg,image/png,application/pdf"
          />
          <DocumentUpload
            label="Upload Selfie Holding ID"
            value={selfieWithId}
            onChange={setSelfieWithId}
            hint="JPG or PNG"
            accept="image/jpeg,image/png"
          />
        </section>

        {/* Full name on ID */}
        <section className="space-y-4 rounded-xl border border-border bg-card p-5">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <Camera className="size-4 text-primary" /> Full Name on ID
          </h2>
          <div>
            <Label htmlFor="fullNameOnId">Full Name on ID</Label>
            <Input
              id="fullNameOnId"
              placeholder="e.g. Chidi Okafor"
              value={fullNameOnId}
              onChange={(e) => setFullNameOnId(e.target.value)}
            />
          </div>
        </section>

        {error && (
          <p className="flex items-center gap-1.5 text-sm font-medium text-red-600">
            <AlertCircle className="size-4" /> {error}
          </p>
        )}

        <Button
          type="submit"
          disabled={submitting}
          className="w-full bg-green-600 text-white hover:bg-green-700 sm:w-auto"
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
