import { useState, useRef } from "react";
import { Chrome as Home, ArrowLeft, Loader as Loader2, CircleCheck as CheckCircle2, CircleAlert as AlertCircle, CloudUpload as UploadCloud, X, FileText, CircleCheck as CheckCircle, ShieldCheck, MapPin } from "lucide-react";
import {
  Button,
  Input,
  Label,
  Textarea,
  Badge,
  cn,
} from "./components.jsx";
import {
  MapPicker,
  AddressAutocomplete,
  ImageUploader,
} from "./listing-form.jsx";
import { useAuth } from "./auth-context.jsx";
import { supabase, PROPERTY_BUCKET } from "./lib/supabase.js";

const AMENITIES = [
  "WiFi",
  "Parking",
  "Borehole Water",
  "Prepaid Meter",
  "CCTV Security",
  "Swimming Pool",
  "Gym",
  "Air Conditioning",
  "Solar Power",
  "Furnished",
  "Serviced Estate",
  "24/7 Security",
  "Fitted Kitchen",
  "Wardrobes",
  "Balcony",
  "Boys Quarters",
];

const MIN_PHOTOS = 5;
const MAX_PHOTOS = 20;
const MAX_INSPECTION_FEE = 100000;

async function uploadImage(file, folder) {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${folder}/${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}.${ext}`;
  const { error } = await supabase.storage
    .from(PROPERTY_BUCKET)
    .upload(path, file, { upsert: false });
  if (error) throw error;
  const { data: pub } = supabase.storage
    .from(PROPERTY_BUCKET)
    .getPublicUrl(path);
  return pub.publicUrl;
}

async function uploadLegalDoc(file) {
  const ext = file.name.split(".").pop() || "pdf";
  const path = `legal-docs/${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}.${ext}`;
  const { error } = await supabase.storage
    .from(PROPERTY_BUCKET)
    .upload(path, file, { upsert: false });
  if (error) throw error;
  const { data: pub } = supabase.storage
    .from(PROPERTY_BUCKET)
    .getPublicUrl(path);
  return pub.publicUrl;
}

export default function ListPropertyPage({ onBack }) {
  const { user, loading: authLoading } = useAuth();
  const isVerified = user?.kyc_status === "fully_verified";

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [images, setImages] = useState([]);
  const [legalDoc, setLegalDoc] = useState(null);
  const [legalDocName, setLegalDocName] = useState("");
  const [address, setAddress] = useState("");
  const [coords, setCoords] = useState(null);
  const [inspectionFee, setInspectionFee] = useState("");
  const [selectedAmenities, setSelectedAmenities] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const fileInputRef = useRef(null);

  function toggleAmenity(amenity) {
    setSelectedAmenities((prev) =>
      prev.includes(amenity)
        ? prev.filter((a) => a !== amenity)
        : [...prev, amenity]
    );
  }

  function handleLegalDocChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setError("Legal document must be under 10MB.");
      return;
    }
    setLegalDoc(file);
    setLegalDocName(file.name);
    setError("");
  }

  function removeLegalDoc() {
    setLegalDoc(null);
    setLegalDocName("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!title.trim()) return setError("Please enter a title.");
    if (!description.trim()) return setError("Please enter a description.");
    const priceNum = parseFloat(price.replace(/[^\d.]/g, ""));
    if (!priceNum || priceNum <= 0) return setError("Please enter a valid price.");
    if (images.length < MIN_PHOTOS)
      return setError(`Please upload at least ${MIN_PHOTOS} photos.`);
    if (images.length > MAX_PHOTOS)
      return setError(`Maximum of ${MAX_PHOTOS} photos allowed.`);
    if (!legalDoc) return setError("Please upload your legal document (C of O, R of O, or Deed).");
    if (!address.trim()) return setError("Please enter the property address.");
    if (!coords) return setError("Please pin the exact location on the map.");

    const inspectionNum = parseFloat(inspectionFee.replace(/[^\d.]/g, "")) || 0;
    if (inspectionNum > MAX_INSPECTION_FEE)
      return setError(`Inspection fee cannot exceed ₦${MAX_INSPECTION_FEE.toLocaleString()}.`);

    setSubmitting(true);
    try {
      const folder = `property-${Date.now()}`;
      const imageUrls = await Promise.all(
        images.map((img) => uploadImage(img.file, folder))
      );
      const legalDocUrl = await uploadLegalDoc(legalDoc);
      const fingerprintId = `DN-${String(Date.now()).slice(-6)}`;

      const { error: insertError } = await supabase.from("properties").insert({
        title: title.trim(),
        description: description.trim(),
        price: priceNum,
        address: address.trim(),
        lat: coords.lat,
        lng: coords.lng,
        image_urls: imageUrls,
        images: imageUrls,
        location: address.trim(),
        legal_docs_url: legalDocUrl,
        inspection_fee: inspectionNum,
        amenities: selectedAmenities,
        fingerprint_id: fingerprintId,
        status: "pending",
      });

      if (insertError) throw insertError;

      setSubmitted(true);
      setToast("Submitted for Admin Review. 24hr SLA");
      setTimeout(() => setToast(""), 5000);
    } catch (err) {
      setError(
        "Submission failed: " +
          (err.message || "Unknown error. Please try again.")
      );
    } finally {
      setSubmitting(false);
    }
  }

  function resetForm() {
    setTitle("");
    setDescription("");
    setPrice("");
    setImages([]);
    setLegalDoc(null);
    setLegalDocName("");
    setAddress("");
    setCoords(null);
    setInspectionFee("");
    setSelectedAmenities([]);
    setSubmitted(false);
  }

  // Loading state
  if (authLoading) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-20 text-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
        <p className="mt-3 text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  // Not verified — gate
  if (!isVerified) {
    return (
      <div className="mx-auto max-w-xl px-4 py-12">
        <button
          onClick={onBack}
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Back to home
        </button>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-8 text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-amber-100 text-amber-600">
            <ShieldCheck className="size-7" />
          </div>
          <h1 className="mt-4 text-xl font-bold text-foreground">
            Verification Required
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            You must complete KYC verification (NIN + Face Liveness) before you
            can list a property. This keeps Directnest safe for everyone.
          </p>
          <a
            href="#/kyc"
            className="mt-5 inline-flex items-center justify-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
          >
            <ShieldCheck className="size-4" />
            Complete Verification
          </a>
        </div>
      </div>
    );
  }

  // Success state
  if (submitted) {
    return (
      <>
        <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-16 text-center">
          <div className="flex size-16 items-center justify-center rounded-full bg-green-100 text-green-600">
            <CheckCircle2 className="size-8" />
          </div>
          <h1 className="mt-5 text-2xl font-bold">Submitted!</h1>
          <p className="mt-2 text-muted-foreground">
            Your property listing is now under review. Our team will verify the
            details, photos, and legal documents within 24 hours.
          </p>
          <div className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-green-50 px-4 py-2 text-sm font-medium text-green-700 ring-1 ring-green-200">
            <CheckCircle className="size-4" />
            24hr Review SLA
          </div>
          <div className="mt-6 flex gap-2">
            <Button onClick={onBack}>Back to home</Button>
            <Button variant="outline" onClick={resetForm}>
              List another
            </Button>
          </div>
        </div>
        {toast && (
          <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 animate-fade-in rounded-lg bg-green-600 px-5 py-3 text-sm font-semibold text-white shadow-lg">
            <span className="flex items-center gap-2">
              <CheckCircle className="size-4" />
              {toast}
            </span>
          </div>
        )}
      </>
    );
  }

  return (
    <>
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
              <Home className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">List Your Property</h1>
              <p className="text-sm text-muted-foreground">
                Fill in the details below. Listings are reviewed before going live.
              </p>
            </div>
          </div>
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700 ring-1 ring-green-200">
            <ShieldCheck className="size-3.5" />
            Verified User
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Photos */}
          <section className="space-y-4 rounded-xl border border-border bg-card p-5">
            <div>
              <h2 className="text-base font-semibold">Property Photos</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Required: Front, Living, Kitchen, 2 Bedrooms, Bath
              </p>
            </div>
            <ImageUploader images={images} setImages={setImages} />
          </section>

          {/* Basic info */}
          <section className="space-y-4 rounded-xl border border-border bg-card p-5">
            <h2 className="text-base font-semibold">Property Details</h2>
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="e.g. 4-Bedroom Duplex in Lekki"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="desc">Description</Label>
              <Textarea
                id="desc"
                rows={3}
                placeholder="Describe the property, neighbourhood, and key features…"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="price">Price (₦)</Label>
              <Input
                id="price"
                type="text"
                inputMode="numeric"
                placeholder="e.g. 85,000,000"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>
          </section>

          {/* Legal docs */}
          <section className="space-y-4 rounded-xl border border-border bg-card p-5">
            <div>
              <h2 className="text-base font-semibold">Legal Documents</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Required for verification — upload C of O, R of O, or Deed
              </p>
            </div>
            {!legalDoc ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-secondary/40 p-6 text-center transition hover:border-primary/50"
              >
                <FileText className="size-8 text-muted-foreground" />
                <p className="text-sm font-medium">
                  Click to upload legal document
                </p>
                <p className="text-xs text-muted-foreground">
                  PDF, JPG, or PNG (max 10MB)
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,image/*,application/pdf"
                  className="hidden"
                  onChange={handleLegalDocChange}
                />
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-green-200 bg-green-50 p-3">
                <div className="flex items-center gap-2 overflow-hidden">
                  <FileText className="size-5 shrink-0 text-green-600" />
                  <span className="truncate text-sm font-medium text-green-800">
                    {legalDocName}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={removeLegalDoc}
                  className="shrink-0 rounded-full p-1 text-green-700 transition hover:bg-green-100"
                  aria-label="Remove document"
                >
                  <X className="size-4" />
                </button>
              </div>
            )}
          </section>

          {/* Location */}
          <section className="space-y-4 rounded-xl border border-border bg-card p-5">
            <h2 className="text-base font-semibold">Location</h2>
            <AddressAutocomplete
              value={address}
              onChange={setAddress}
              onPlaceSelect={(place) =>
                setCoords({ lat: place.lat, lng: place.lng })
              }
            />
            <MapPicker value={coords} onChange={setCoords} />
          </section>

          {/* Inspection fee */}
          <section className="space-y-4 rounded-xl border border-border bg-card p-5">
            <h2 className="text-base font-semibold">Inspection Fee</h2>
            <div>
              <Label htmlFor="inspection">Inspection Fee (₦)</Label>
              <Input
                id="inspection"
                type="text"
                inputMode="numeric"
                placeholder="e.g. 10,000"
                value={inspectionFee}
                onChange={(e) => setInspectionFee(e.target.value)}
              />
              <p className="mt-1.5 text-xs text-muted-foreground">
                Paid directly to owner. Range: ₦0 – ₦{MAX_INSPECTION_FEE.toLocaleString()}.
              </p>
            </div>
          </section>

          {/* Amenities */}
          <section className="space-y-4 rounded-xl border border-border bg-card p-5">
            <h2 className="text-base font-semibold">Amenities</h2>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {AMENITIES.map((amenity) => {
                const checked = selectedAmenities.includes(amenity);
                return (
                  <button
                    key={amenity}
                    type="button"
                    onClick={() => toggleAmenity(amenity)}
                    className={cn(
                      "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition",
                      checked
                        ? "border-green-400 bg-green-50 text-green-800"
                        : "border-border bg-card text-muted-foreground hover:bg-secondary"
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-4 shrink-0 items-center justify-center rounded border transition",
                        checked
                          ? "border-green-600 bg-green-600 text-white"
                          : "border-border bg-white"
                      )}
                    >
                      {checked && <CheckCircle className="size-3" />}
                    </span>
                    {amenity}
                  </button>
                );
              })}
            </div>
          </section>

          {error && (
            <p className="flex items-center gap-1.5 text-sm font-medium text-red-600">
              <AlertCircle className="size-4" /> {error}
            </p>
          )}

          <div className="flex items-center gap-2 rounded-lg bg-secondary/60 p-3 text-xs text-muted-foreground">
            <Badge className="bg-amber-50 text-amber-700 ring-1 ring-amber-200">
              <ShieldCheck className="size-3.5" /> Pending Review
            </Badge>
            Your listing will not appear publicly until an admin approves it.
            Review SLA: 24 hours.
          </div>

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
              "Submit listing"
            )}
          </Button>
        </form>
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 animate-fade-in rounded-lg bg-green-600 px-5 py-3 text-sm font-semibold text-white shadow-lg">
          <span className="flex items-center gap-2">
            <CheckCircle className="size-4" />
            {toast}
          </span>
        </div>
      )}
    </>
  );
}
