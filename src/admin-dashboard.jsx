import { useEffect, useState, useCallback } from "react";
import { ShieldCheck, CircleCheck as CheckCircle2, Circle as XCircle, Copy, TriangleAlert as AlertTriangle, IdCard, UserRound, FileCheck, Clock, Loader as Loader2, ArrowLeft, LayoutDashboard, Lock, Chrome as Home, MapPin, RefreshCw } from "lucide-react";
import { Button, Badge, cn } from "./components.jsx";
import { supabase } from "./lib/supabase.js";

/* ---------- KYC Queue ---------- */
function KycQueueRow({ item, onApprove, onReject }) {
  const [acting, setActing] = useState(false);

  async function handleApprove() {
    setActing(true);
    await onApprove(item.id);
    setActing(false);
  }
  async function handleReject() {
    setActing(true);
    await onReject(item.id);
    setActing(false);
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-semibold">{item.full_name_on_id || item.full_name}</p>
          <p className="text-xs text-muted-foreground">
            {item.id_type || "NIN"}: {item.id_number || item.nin}
          </p>
          {item.phone && item.email && (
            <p className="text-xs text-muted-foreground">
              {item.phone} · {item.email}
            </p>
          )}
        </div>
        {item.status === "pending" && (
          <Badge className="bg-amber-50 text-amber-700 ring-1 ring-amber-200">
            <Clock className="size-3.5" /> Pending
          </Badge>
        )}
        {item.status === "approved" && (
          <Badge className="bg-green-50 text-green-700 ring-1 ring-green-200">
            <CheckCircle2 className="size-3.5" /> Approved
          </Badge>
        )}
        {item.status === "rejected" && (
          <Badge className="bg-red-50 text-red-700 ring-1 ring-red-200">
            <XCircle className="size-3.5" /> Rejected
          </Badge>
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {["ID Photo", "Selfie Holding ID"].map((label, i) => {
          const urls = [item.id_photo_url, item.selfie_with_id_url];
          const url = urls[i];
          const icons = [IdCard, UserRound];
          const Icon = icons[i];
          return (
            <div
              key={label}
              className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-secondary/40 p-4 text-center"
            >
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="size-5" />
              </div>
              <p className="text-sm font-semibold">{label}</p>
              {url ? (
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 h-28 w-full overflow-hidden rounded-md bg-secondary"
                >
                  {url.match(/\.(jpg|jpeg|png|webp|gif)$/i) ? (
                    <img
                      src={url}
                      alt={label}
                      className="size-full object-cover"
                    />
                  ) : (
                    <span className="flex size-full items-center justify-center text-xs text-muted-foreground">
                      View file
                    </span>
                  )}
                </a>
              ) : (
                <div className="mt-1 flex h-28 w-full items-center justify-center rounded-md bg-secondary text-xs text-muted-foreground">
                  Not provided
                </div>
              )}
            </div>
          );
        })}
      </div>
      {item.status === "pending" && (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            onClick={handleApprove}
            disabled={acting}
            className="bg-green-600 hover:bg-green-700"
          >
            {acting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <CheckCircle2 className="size-4" />
            )}
            Approve
          </Button>
          <Button
            onClick={handleReject}
            disabled={acting}
            className="bg-red-600 text-white hover:bg-red-700"
          >
            {acting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <XCircle className="size-4" />
            )}
            Reject
          </Button>
        </div>
      )}
    </div>
  );
}

function KycQueueTab() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("landlord_kyc_submissions")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      console.error(error);
    } else {
      setItems(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  async function approve(id) {
    const { data: submission, error: fetchErr } = await supabase
      .from("landlord_kyc_submissions")
      .select("user_id")
      .eq("id", id)
      .maybeSingle();
    if (fetchErr) console.error(fetchErr);

    const { error } = await supabase
      .from("landlord_kyc_submissions")
      .update({ status: "approved", reviewed_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      alert("Failed to approve: " + error.message);
      return;
    }

    if (submission?.user_id) {
      const { error: userErr } = await supabase
        .from("users")
        .update({ kyc_status: "approved", is_verified: true })
        .eq("id", submission.user_id);
      if (userErr) console.error(userErr);
    }

    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, status: "approved" } : i))
    );
  }

  async function reject(id) {
    const { data: submission, error: fetchErr } = await supabase
      .from("landlord_kyc_submissions")
      .select("user_id")
      .eq("id", id)
      .maybeSingle();
    if (fetchErr) console.error(fetchErr);

    const { error } = await supabase
      .from("landlord_kyc_submissions")
      .update({ status: "rejected", reviewed_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      alert("Failed to reject: " + error.message);
      return;
    }

    if (submission?.user_id) {
      const { error: userErr } = await supabase
        .from("users")
        .update({ kyc_status: "rejected", is_verified: false })
        .eq("id", submission.user_id);
      if (userErr) console.error(userErr);
    }

    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, status: "rejected" } : i))
    );
  }

  const pending = items.filter((i) => i.status === "pending");

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="mr-2 size-5 animate-spin" /> Loading…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {items.length} total submission{items.length === 1 ? "" : "s"}
        </p>
        <Badge className="bg-amber-50 text-amber-700 ring-1 ring-amber-200">
          <Clock className="size-3.5" /> {pending.length} Pending
        </Badge>
      </div>
      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
          No KYC submissions yet.
        </div>
      ) : (
        items.map((item) => (
          <KycQueueRow
            key={item.id}
            item={item}
            onApprove={approve}
            onReject={reject}
          />
        ))
      )}
    </div>
  );
}

/* ---------- Properties Queue ---------- */
function PropertyRow({ item, onApprove, onReject }) {
  const [acting, setActing] = useState(false);

  async function handleApprove() {
    setActing(true);
    await onApprove(item.id);
    setActing(false);
  }
  async function handleReject() {
    setActing(true);
    await onReject(item.id);
    setActing(false);
  }

  const imageUrls = item.image_urls || [];
  const thumb = imageUrls[0];

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex gap-3">
          {thumb ? (
            <img
              src={thumb}
              alt={item.title}
              className="size-16 rounded-md object-cover"
            />
          ) : (
            <div className="flex size-16 items-center justify-center rounded-md bg-secondary text-muted-foreground">
              <Home className="size-6" />
            </div>
          )}
          <div>
            <p className="font-semibold">{item.title}</p>
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="size-3" /> {item.address}
            </p>
            <p className="text-xs text-muted-foreground">
              {item.property_type} · {item.bedrooms} bed · {item.bathrooms} bath
            </p>
            {item.fingerprint_id && (
              <p className="text-xs font-medium text-muted-foreground">
                Fingerprint: #{item.fingerprint_id}
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          {item.status === "pending" && (
            <Badge className="bg-amber-50 text-amber-700 ring-1 ring-amber-200">
              <Clock className="size-3.5" /> Pending
            </Badge>
          )}
          {item.status === "approved" && (
            <Badge className="bg-green-50 text-green-700 ring-1 ring-green-200">
              <CheckCircle2 className="size-3.5" /> Approved
            </Badge>
          )}
          {item.status === "rejected" && (
            <Badge className="bg-red-50 text-red-700 ring-1 ring-red-200">
              <XCircle className="size-3.5" /> Rejected
            </Badge>
          )}
        </div>
      </div>

      {imageUrls.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto">
          {imageUrls.slice(1).map((url, i) => (
            <img
              key={i}
              src={url}
              alt={`Photo ${i + 2}`}
              className="size-14 shrink-0 rounded-md object-cover"
            />
          ))}
        </div>
      )}

      {item.status === "pending" && (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            onClick={handleApprove}
            disabled={acting}
            className="bg-green-600 hover:bg-green-700"
          >
            {acting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <CheckCircle2 className="size-4" />
            )}
            Approve
          </Button>
          <Button
            onClick={handleReject}
            disabled={acting}
            className="bg-red-600 text-white hover:bg-red-700"
          >
            {acting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <XCircle className="size-4" />
            )}
            Reject
          </Button>
        </div>
      )}
    </div>
  );
}

function PropertiesTab() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("properties")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      console.error(error);
    } else {
      setItems(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  async function approve(id) {
    const { error } = await supabase
      .from("properties")
      .update({ status: "approved", reviewed_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      alert("Failed to approve: " + error.message);
      return;
    }
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, status: "approved" } : i))
    );
  }

  async function reject(id) {
    const { error } = await supabase
      .from("properties")
      .update({ status: "rejected", reviewed_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      alert("Failed to reject: " + error.message);
      return;
    }
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, status: "rejected" } : i))
    );
  }

  const pending = items.filter((i) => i.status === "pending");

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="mr-2 size-5 animate-spin" /> Loading…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {items.length} total listing{items.length === 1 ? "" : "s"}
        </p>
        <Badge className="bg-amber-50 text-amber-700 ring-1 ring-amber-200">
          <Clock className="size-3.5" /> {pending.length} Pending
        </Badge>
      </div>
      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
          No property submissions yet.
        </div>
      ) : (
        items.map((item) => (
          <PropertyRow
            key={item.id}
            item={item}
            onApprove={approve}
            onReject={reject}
          />
        ))
      )}
    </div>
  );
}

/* ---------- Fraud Queue (placeholder) ---------- */
function FraudQueueTab() {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
        No flagged submissions. Fraud detection rules will appear here when
        submissions are flagged during review.
      </div>
    </div>
  );
}

/* ---------- Duplicates (placeholder) ---------- */
function DuplicatesTab() {
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
        <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600" />
        <div>
          <p className="font-semibold text-amber-800">Duplicates Alert</p>
          <p className="text-sm text-amber-700">
            No duplicate fingerprints detected. Duplicate checks run
            automatically when new properties are submitted.
          </p>
        </div>
      </div>
    </div>
  );
}

const TABS = [
  { id: "kyc", label: "KYC Queue", icon: ShieldCheck },
  { id: "properties", label: "Properties", icon: Home },
  { id: "fraud", label: "Fraud Queue", icon: AlertTriangle },
  { id: "duplicates", label: "Duplicates", icon: Copy },
];

export default function AdminDashboard({ onBack }) {
  const [active, setActive] = useState("kyc");

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <button
        onClick={onBack}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back to home
      </button>

      <div className="mb-6 flex items-center gap-2">
        <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <LayoutDashboard className="size-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            <Badge className="bg-amber-50 text-amber-700 ring-1 ring-amber-200">
              <Lock className="size-3.5" /> Restricted
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Review KYC submissions, property listings, and resolve duplicates.
          </p>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-1 rounded-lg border border-border bg-card p-1">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActive(id)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition",
              active === id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}
          >
            <Icon className="size-4" />
            {label}
          </button>
        ))}
      </div>

      {active === "kyc" && <KycQueueTab />}
      {active === "properties" && <PropertiesTab />}
      {active === "fraud" && <FraudQueueTab />}
      {active === "duplicates" && <DuplicatesTab />}
    </div>
  );
}
