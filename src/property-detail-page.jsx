import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Bed,
  Bath,
  Ruler,
  MapPin,
  MessageCircle,
  ShieldCheck,
  BadgeCheck,
  Lock,
  Fingerprint,
  Bookmark,
  Phone,
  Mail,
  CircleAlert as AlertCircle,
  Loader as Loader2,
} from "lucide-react";
import { Button, Badge, cn } from "./components.jsx";
import { supabase } from "./lib/supabase.js";

/* ---------- KYC status hook (reads from users table) ---------- */
function useKycStatus() {
  const [status, setStatus] = useState({
    kyc_status: "unverified",
    is_verified: false,
    loading: true,
  });

  useEffect(() => {
    (async () => {
      try {
        // Try to find the most recent KYC submission to derive status.
        // In a no-auth app, we use the latest submission as the "current user".
        const { data, error } = await supabase
          .from("landlord_kyc_submissions")
          .select("status")
          .order("created_at", { ascending: false })
          .limit(1);

        if (error) throw error;

        const latest = data?.[0];
        if (latest) {
          const isApproved = latest.status === "approved";
          setStatus({
            kyc_status: latest.status,
            is_verified: isApproved,
            loading: false,
          });
        } else {
          setStatus({
            kyc_status: "unverified",
            is_verified: false,
            loading: false,
          });
        }
      } catch {
        // If DB is unreachable, default to unverified (gated)
        setStatus({
          kyc_status: "unverified",
          is_verified: false,
          loading: false,
        });
      }
    })();
  }, []);

  return status;
}

/* ---------- Blurred / approximate map placeholder ---------- */
function ApproximateMap({ city, state }) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-secondary/40">
      <div
        className="flex h-64 items-center justify-center bg-gradient-to-br from-green-50 via-secondary to-green-50/30"
        style={{ filter: "blur(8px)" }}
      >
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <MapPin className="size-12" />
          <p className="text-sm font-medium">Approximate Area</p>
        </div>
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/40 p-4 text-center">
        <Lock className="size-8 text-primary" />
        <p className="text-sm font-semibold">
          Exact location unlocked after verification
        </p>
        <p className="text-xs text-muted-foreground">
          Area: {city}, {state}
        </p>
      </div>
    </div>
  );
}

/* ---------- Exact map (simple iframe using lat/lng) ---------- */
function ExactMap({ lat, lng }) {
  if (lat == null || lng == null) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-border bg-secondary/40 text-sm text-muted-foreground">
        Map data not available for this property.
      </div>
    );
  }
  const delta = 0.01;
  const bbox = `${lng - delta},${lat - delta},${lng + delta},${lat + delta}`;
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`;
  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <iframe
        title="Exact location"
        src={src}
        className="h-64 w-full"
        loading="lazy"
      />
    </div>
  );
}

/* ---------- Property Detail Page ---------- */
export default function PropertyDetailPage({ property, onBack, onReserve, onVerify }) {
  const { kyc_status, is_verified, loading } = useKycStatus();
  const [activeImg, setActiveImg] = useState(0);

  if (!property) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <p className="text-muted-foreground">Property not found.</p>
        <Button onClick={onBack} className="mt-4">Back to home</Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="mr-2 size-5 animate-spin" /> Loading property…
      </div>
    );
  }

  const images = property.images?.length ? property.images : property.image ? [property.image] : [];
  const gated = !is_verified || kyc_status !== "approved";

  // Parse location into city, state (format: "City, State")
  const parts = (property.location || "").split(",").map((s) => s.trim());
  const city = parts[0] || "Area";
  const state = parts[1] || "Lagos";

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <button
        onClick={onBack}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back to listings
      </button>

      {/* Image gallery */}
      {images.length > 0 && (
        <div className="mb-6 space-y-2">
          <div className="overflow-hidden rounded-xl border border-border bg-secondary">
            <img
              src={images[activeImg]}
              alt={property.title}
              className="aspect-[16/10] w-full object-cover"
            />
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto">
              {images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImg(i)}
                  className={cn(
                    "shrink-0 overflow-hidden rounded-md border-2 transition",
                    i === activeImg ? "border-primary" : "border-border"
                  )}
                >
                  <img src={img} alt={`Photo ${i + 1}`} className="size-16 object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Title + price */}
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold">{property.title}</h1>
            {property.verified && (
              <Badge className="bg-primary/10 text-primary ring-1 ring-primary/20">
                <BadgeCheck className="size-3.5" /> Verified Listing
              </Badge>
            )}
          </div>
          {property.fingerprintId && (
            <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Fingerprint className="size-3.5" /> Property Fingerprint ID: #{property.fingerprintId}
            </p>
          )}
        </div>
        <span className="text-2xl font-bold text-primary">{property.price}</span>
      </div>

      {/* Key specs */}
      <div className="mb-6 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
        <span className="flex items-center gap-1"><Bed className="size-4" /> {property.beds} beds</span>
        <span className="flex items-center gap-1"><Bath className="size-4" /> {property.baths} baths</span>
        <span className="flex items-center gap-1"><Ruler className="size-4" /> {property.area}</span>
        {property.propertyType && (
          <Badge className="bg-secondary text-muted-foreground ring-1 ring-border">
            {property.propertyType}
          </Badge>
        )}
      </div>

      {/* Description */}
      {property.description && (
        <div className="mb-6 rounded-xl border border-border bg-card p-5">
          <h2 className="mb-2 text-base font-semibold">About this property</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {property.description}
          </p>
        </div>
      )}

      {/* Location section */}
      <div className="mb-6 rounded-xl border border-border bg-card p-5">
        <h2 className="mb-3 flex items-center gap-2 text-base font-semibold">
          <MapPin className="size-4 text-primary" /> Location
        </h2>
        {gated ? (
          <>
            <p className="mb-3 text-sm font-medium">
              Area: <span className="text-foreground">{city}, {state}</span>
            </p>
            <ApproximateMap city={city} state={state} />
          </>
        ) : (
          <>
            <p className="mb-3 text-sm font-medium">
              Full Address: <span className="text-foreground">{property.location}</span>
            </p>
            <ExactMap lat={property.lat} lng={property.lng} />
          </>
        )}
      </div>

      {/* Owner contact section */}
      <div className="mb-6 rounded-xl border border-border bg-card p-5">
        <h2 className="mb-3 flex items-center gap-2 text-base font-semibold">
          <ShieldCheck className="size-4 text-primary" /> Owner Details
        </h2>
        {gated ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
              <AlertCircle className="size-5 shrink-0 text-primary" />
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">
                  Directnest is 100% agent-free.
                </span>{" "}
                Exact address and contact details are only shown to Verified users.
              </p>
            </div>
            <Button
              onClick={onVerify}
              className="w-full bg-green-600 text-white hover:bg-green-700 sm:w-auto"
            >
              <ShieldCheck className="size-4" /> Verify with NIN to Unlock
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-green-50 text-green-700 ring-1 ring-green-200">
                <BadgeCheck className="size-3.5" /> Verified Buyer/Renter
              </Badge>
            </div>
            <div className="grid gap-2 text-sm sm:grid-cols-2">
              {property.owner && (
                <p className="flex items-center gap-2">
                  <span className="font-medium text-foreground">Owner:</span> {property.owner}
                </p>
              )}
              {property.whatsapp && (
                <p className="flex items-center gap-2">
                  <Phone className="size-4 text-muted-foreground" /> {property.whatsapp}
                </p>
              )}
              {property.ownerEmail && (
                <p className="flex items-center gap-2">
                  <Mail className="size-4 text-muted-foreground" /> {property.ownerEmail}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              {property.whatsapp && (
                <a
                  href={`https://wa.me/${(property.whatsapp || "").replace(/[^\d]/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700"
                >
                  <MessageCircle className="size-4" /> Message Owner
                </a>
              )}
              <Button
                onClick={() => onReserve?.(property)}
                className="flex-1 bg-primary text-primary-foreground hover:opacity-90"
              >
                <Bookmark className="size-4" /> Pay via Escrow
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
