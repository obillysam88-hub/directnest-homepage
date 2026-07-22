import { useState } from "react";
import { ShieldCheck, CircleCheck as CheckCircle2, Circle as XCircle, Copy, TriangleAlert as AlertTriangle, IdCard, UserRound, FileCheck, Clock, Loader as Loader2, ArrowLeft, LayoutDashboard } from "lucide-react";
import { Button, Badge, cn } from "./components.jsx";

/* ---------- Placeholder panel for KYC review ---------- */
function ReviewPanel({ label, icon: Icon, caption }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-secondary/40 p-4 text-center">
      <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="size-5" />
      </div>
      <p className="text-sm font-semibold">{label}</p>
      {caption && <p className="text-xs text-muted-foreground">{caption}</p>}
      <div className="mt-1 flex h-28 w-full items-center justify-center rounded-md bg-secondary text-xs text-muted-foreground">
        Photo placeholder
      </div>
    </div>
  );
}

function KycQueueRow({ item }) {
  const [status, setStatus] = useState(item.status);

  function approve() {
    setStatus("approved");
  }
  function reject() {
    setStatus("rejected");
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-semibold">{item.name}</p>
          <p className="text-xs text-muted-foreground">
            NIN: {item.nin} · BVN: {item.bvn}
          </p>
        </div>
        {status === "pending" && (
          <Badge className="bg-amber-50 text-amber-700 ring-1 ring-amber-200">
            <Clock className="size-3.5" /> Pending
          </Badge>
        )}
        {status === "approved" && (
          <Badge className="bg-green-50 text-green-700 ring-1 ring-green-200">
            <CheckCircle2 className="size-3.5" /> Approved
          </Badge>
        )}
        {status === "rejected" && (
          <Badge className="bg-red-50 text-red-700 ring-1 ring-red-200">
            <XCircle className="size-3.5" /> Rejected
          </Badge>
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <ReviewPanel
          label="ID Photo"
          icon={IdCard}
          caption="Front & back of ID"
        />
        <ReviewPanel
          label="Liveness Frame"
          icon={UserRound}
          caption="Selfie video still"
        />
        <ReviewPanel
          label="C of O Photo"
          icon={FileCheck}
          caption="Certificate of Occupancy"
        />
      </div>
      {status === "pending" && (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={approve} className="bg-green-600 hover:bg-green-700">
            <CheckCircle2 className="size-4" /> Approve
          </Button>
          <Button
            onClick={reject}
            className="bg-red-600 text-white hover:bg-red-700"
          >
            <XCircle className="size-4" /> Reject
          </Button>
        </div>
      )}
    </div>
  );
}

function KycQueueTab() {
  const queue = [
    { id: "k1", name: "Chidi Okafor", nin: "12345678901", bvn: "98765432101", status: "pending" },
    { id: "k2", name: "Amaka Eze", nin: "23456789012", bvn: "87654321012", status: "pending" },
  ];
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {queue.length} submission{queue.length === 1 ? "" : "s"} awaiting review
        </p>
        <Badge className="bg-amber-50 text-amber-700 ring-1 ring-amber-200">
          <Clock className="size-3.5" /> {queue.length} Pending
        </Badge>
      </div>
      {queue.map((item) => (
        <KycQueueRow key={item.id} item={item} />
      ))}
    </div>
  );
}

function FraudQueueTab() {
  const items = [
    { id: "f1", name: "Tunde Bello", reason: "Mismatched ID photo vs liveness frame", severity: "High" },
    { id: "f2", name: "Sade Adewale", reason: "Duplicate BVN across 3 accounts", severity: "Medium" },
  ];
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {items.length} flagged submission{items.length === 1 ? "" : "s"} requiring investigation
        </p>
        <Badge className="bg-red-50 text-red-700 ring-1 ring-red-200">
          <AlertTriangle className="size-3.5" /> {items.length} Flagged
        </Badge>
      </div>
      {items.map((item) => (
        <div
          key={item.id}
          className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600">
              <AlertTriangle className="size-5" />
            </div>
            <div>
              <p className="font-semibold">{item.name}</p>
              <p className="text-sm text-muted-foreground">{item.reason}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              className={
                item.severity === "High"
                  ? "bg-red-50 text-red-700 ring-1 ring-red-200"
                  : "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
              }
            >
              {item.severity}
            </Badge>
            <Button variant="outline" className="text-sm">
              Investigate
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

function DuplicatesTab() {
  const groups = [
    {
      id: "d1",
      fingerprint: "DN-003",
      title: "3-Bedroom Bungalow — Ajah",
      count: 3,
      owners: ["Chidi O.", "Ngozi I.", "Tunde A."],
    },
    {
      id: "d2",
      fingerprint: "DN-006",
      title: "Terraced Townhouse — Ikoyi",
      count: 2,
      owners: ["Sade A.", "Emeka N."],
    },
  ];

  return (
    <div className="space-y-4">
      {/* Duplicates Alert banner */}
      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
        <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600" />
        <div>
          <p className="font-semibold text-amber-800">Duplicates Alert</p>
          <p className="text-sm text-amber-700">
            {groups.length} property fingerprint{groups.length === 1 ? "" : "s"} matched across multiple listings.
            Review and merge or remove duplicates to keep listings accurate.
          </p>
        </div>
      </div>

      {groups.map((g) => (
        <div
          key={g.id}
          className="rounded-xl border border-border bg-card p-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Copy className="size-4 text-primary" />
              <p className="font-semibold">{g.title}</p>
            </div>
            <Badge className="bg-amber-50 text-amber-700 ring-1 ring-amber-200">
              {g.count} duplicates
            </Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Property Fingerprint ID: #{g.fingerprint}
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {g.owners.map((o) => (
              <Badge
                key={o}
                className="bg-secondary text-muted-foreground ring-1 ring-border"
              >
                {o}
              </Badge>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="outline" className="text-sm">
              Merge listings
            </Button>
            <Button
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Remove duplicates
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

const TABS = [
  { id: "kyc", label: "KYC Queue", icon: ShieldCheck },
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
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Review KYC submissions, investigate fraud, and resolve duplicate listings.
          </p>
        </div>
      </div>

      {/* Tabs */}
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
      {active === "fraud" && <FraudQueueTab />}
      {active === "duplicates" && <DuplicatesTab />}
    </div>
  );
}
