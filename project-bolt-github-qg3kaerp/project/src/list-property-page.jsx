import { useState } from "react";
import { Chrome as Home, ArrowLeft, Loader as Loader2, CircleCheck as CheckCircle2, CircleAlert as AlertCircle } from "lucide-react";
import {
  Button,
  Input,
  Label,
  Textarea,
  Select,
  Badge,
  cn,
} from "./components.jsx";
import {
  MapPicker,
  AddressAutocomplete,
  ImageUploader,
} from "./listing-form.jsx";
import { propertyTypes } from "./data.js";
import { supabase, PROPERTY_BUCKET } from "./lib/supabase.js";

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

export default function ListPropertyPage({ onBack }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [bedrooms, setBedrooms] = useState("");
  const [bathrooms, setBathrooms] = useState("");
  const [address, setAddress] = useState("");
  const [coords, setCoords] = useState(null);
  const [annualRent, setAnnualRent] = useState("");
  const [legalFee, setLegalFee] = useState("");
  const [cautionFee, setCautionFee] = useState("");
  const [images, setImages] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!title.trim()) return setError("Please enter a title.");
    if (!propertyType) return setError("Please select a property type.");
    if (!address.trim()) return setError("Please enter the property address.");
    if (images.length < 5)
      return setError("Please upload at least 5 images of the property.");

    setSubmitting(true);
    try {
      const folder = `property-${Date.now()}`;
      const imageUrls = await Promise.all(
        images.map((img) => uploadImage(img.file, folder))
      );
      const fingerprintId = `DN-${String(Date.now()).slice(-4)}`;

      const { error: insertError } = await supabase.from("properties").insert({
        title: title.trim(),
        description: description.trim(),
        property_type: propertyType,
        bedrooms: parseInt(bedrooms, 10) || 0,
        bathrooms: parseInt(bathrooms, 10) || 0,
        address: address.trim(),
        lat: coords?.lat ?? null,
        lng: coords?.lng ?? null,
        annual_rent: parseFloat(annualRent.replace(/[^\d.]/g, "")) || 0,
        legal_fee: parseFloat(legalFee.replace(/[^\d.]/g, "")) || 0,
        caution_fee: parseFloat(cautionFee.replace(/[^\d.]/g, "")) || 0,
        image_urls: imageUrls,
        fingerprint_id: fingerprintId,
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
        <h1 className="mt-5 text-2xl font-bold">Submitted!</h1>
        <p className="mt-2 text-muted-foreground">
          Your property listing is now under review. Our team will verify the
          details and photos within 24 hours.
        </p>
        <div className="mt-6 flex gap-2">
          <Button onClick={onBack}>Back to home</Button>
          <Button
            variant="outline"
            onClick={() => {
              setSubmitted(false);
              setTitle("");
              setDescription("");
              setPropertyType("");
              setBedrooms("");
              setBathrooms("");
              setAddress("");
              setCoords(null);
              setAnnualRent("");
              setLegalFee("");
              setCautionFee("");
              setImages([]);
            }}
          >
            List another
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
            <Home className="size-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">List Your Property</h1>
            <p className="text-sm text-muted-foreground">
              Fill in the details below. Listings are reviewed before going live.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic info */}
        <section className="space-y-4 rounded-xl border border-border bg-card p-5">
          <h2 className="text-base font-semibold">Property details</h2>
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
              placeholder="Describe the property, neighbourhood, and amenities…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label htmlFor="type">Property Type</Label>
              <Select
                id="type"
                value={propertyType}
                onChange={(e) => setPropertyType(e.target.value)}
              >
                <option value="">Select…</option>
                {propertyTypes.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="beds">Bedrooms</Label>
              <Input
                id="beds"
                type="number"
                min="0"
                placeholder="e.g. 4"
                value={bedrooms}
                onChange={(e) => setBedrooms(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="baths">Bathrooms</Label>
              <Input
                id="baths"
                type="number"
                min="0"
                placeholder="e.g. 5"
                value={bathrooms}
                onChange={(e) => setBathrooms(e.target.value)}
              />
            </div>
          </div>
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

        {/* Fees */}
        <section className="space-y-4 rounded-xl border border-border bg-card p-5">
          <h2 className="text-base font-semibold">Rent & fees</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label htmlFor="rent">Annual Rent ₦</Label>
              <Input
                id="rent"
                type="text"
                inputMode="numeric"
                placeholder="e.g. 1,200,000"
                value={annualRent}
                onChange={(e) => setAnnualRent(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="legal">Legal Fee ₦</Label>
              <Input
                id="legal"
                type="text"
                inputMode="numeric"
                placeholder="e.g. 50,000"
                value={legalFee}
                onChange={(e) => setLegalFee(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="caution">Caution Fee ₦</Label>
              <Input
                id="caution"
                type="text"
                inputMode="numeric"
                placeholder="e.g. 100,000"
                value={cautionFee}
                onChange={(e) => setCautionFee(e.target.value)}
              />
            </div>
          </div>
        </section>

        {/* Images */}
        <section className="space-y-4 rounded-xl border border-border bg-card p-5">
          <h2 className="text-base font-semibold">Photos</h2>
          <ImageUploader images={images} setImages={setImages} />
        </section>

        {error && (
          <p className="flex items-center gap-1.5 text-sm font-medium text-red-600">
            <AlertCircle className="size-4" /> {error}
          </p>
        )}

        <div className="flex items-center gap-2 rounded-lg bg-secondary/60 p-3 text-xs text-muted-foreground">
          <Badge className="bg-green-50 text-green-700 ring-1 ring-green-200">
            <CheckCircle2 className="size-3.5" /> Under Review
          </Badge>
          Listings with complete details, a pinned location, and 5+ photos get
          approved faster.
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
  );
}
