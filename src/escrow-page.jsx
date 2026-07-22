import { useEffect, useMemo, useRef, useState } from "react";
import { ShieldCheck, Clock, CircleCheck as CheckCircle2, Circle as XCircle, Info, ArrowLeft, CalendarClock, Wallet } from "lucide-react";
import { Button, Input, Label, Select, Badge, cn } from "./components.jsx";

const RENT_DURATIONS = ["1 Year", "2 Years"];
const HOURS_24_MS = 24 * 60 * 60 * 1000;

function formatNaira(value) {
  if (!Number.isFinite(value)) return "₦0";
  return "₦" + Math.round(value).toLocaleString("en-NG");
}

function formatTime(ms) {
  if (ms <= 0) return "00:00:00";
  const totalSec = Math.floor(ms / 1000);
  const h = String(Math.floor(totalSec / 3600)).padStart(2, "0");
  const m = String(Math.floor((totalSec % 3600) / 60)).padStart(2, "0");
  const s = String(totalSec % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

function CountdownTimer({ expiry, onExpire }) {
  const [remaining, setRemaining] = useState(() => expiry - Date.now());

  useEffect(() => {
    const tick = () => {
      const left = expiry - Date.now();
      setRemaining(left > 0 ? left : 0);
      if (left <= 0) onExpire?.();
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiry, onExpire]);

  const isUrgent = remaining < 60 * 60 * 1000;

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 rounded-lg border p-4",
        isUrgent
          ? "border-red-200 bg-red-50"
          : "border-border bg-secondary/40"
      )}
    >
      <div className="flex items-center gap-2">
        <Clock
          className={cn(
            "size-5",
            isUrgent ? "text-red-600" : "text-primary"
          )}
        />
        <div>
          <p className="text-xs text-muted-foreground">Time Left</p>
          <p
            className={cn(
              "font-mono text-xl font-bold tabular-nums",
              isUrgent ? "text-red-600" : "text-foreground"
            )}
          >
            {formatTime(remaining)}
          </p>
        </div>
      </div>
      <Badge
        className={cn(
          isUrgent
            ? "bg-red-100 text-red-700 ring-1 ring-red-200"
            : "bg-primary/10 text-primary ring-1 ring-primary/20"
        )}
      >
        <CalendarClock className="size-3.5" />
        24-hour window
      </Badge>
    </div>
  );
}

function BreakdownBox({ rent, legal, caution, total }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <Wallet className="size-4 text-primary" />
        Payment Breakdown
      </p>
      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Rent</span>
          <span className="font-medium">{formatNaira(rent)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Legal</span>
          <span className="font-medium">{formatNaira(legal)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Caution</span>
          <span className="font-medium">{formatNaira(caution)}</span>
        </div>
        <div className="my-2 border-t border-border" />
        <div className="flex items-center justify-between">
          <span className="font-semibold">Total</span>
          <span className="text-lg font-bold text-primary">
            {formatNaira(total)}
          </span>
        </div>
      </div>
      <p className="mt-3 text-center text-xs text-muted-foreground">
        Rent: {formatNaira(rent)} + Legal: {formatNaira(legal)} + Caution:{" "}
        {formatNaira(caution)} = Total: {formatNaira(total)}
      </p>
    </div>
  );
}

function parseNum(value) {
  const n = Number(String(value).replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export default function EscrowPage({ onBack }) {
  const [duration, setDuration] = useState(RENT_DURATIONS[0]);
  const [annualRent, setAnnualRent] = useState("");
  const [legalFee, setLegalFee] = useState("");
  const [cautionFee, setCautionFee] = useState("");
  const [status, setStatus] = useState("reserved"); // reserved | released | refunded | expired
  const [expiry] = useState(() => Date.now() + HOURS_24_MS);

  const rent = useMemo(() => {
    const annual = parseNum(annualRent);
    return duration === "2 Years" ? annual * 2 : annual;
  }, [annualRent, duration]);

  const legal = useMemo(() => parseNum(legalFee), [legalFee]);
  const caution = useMemo(() => parseNum(cautionFee), [cautionFee]);
  const total = rent + legal + caution;

  function handleRelease() {
    setStatus("released");
  }
  function handleRefund() {
    setStatus("refunded");
  }
  function handleExpire() {
    setStatus((prev) => (prev === "reserved" ? "expired" : prev));
  }

  const isActionable = status === "reserved";

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <button
        onClick={onBack}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back to home
      </button>

      {/* RENT tab only */}
      <div className="mb-6 flex items-center gap-2">
        <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <ShieldCheck className="size-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">24-Hour Booking Escrow</h1>
            <Badge className="bg-primary/10 text-primary ring-1 ring-primary/20">
              RENT
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Pay 1 Year or 2 Years Rent + Legal + Caution to reserve this space.
            100% Refundable if you reject within 24 hours.
          </p>
        </div>
      </div>

      {/* Status badge */}
      <div className="mb-4">
        {status === "reserved" && (
          <Badge className="bg-amber-50 text-amber-700 ring-1 ring-amber-200">
            <Clock className="size-3.5" /> Reserved — Verification in Progress
          </Badge>
        )}
        {status === "released" && (
          <Badge className="bg-green-50 text-green-700 ring-1 ring-green-200">
            <CheckCircle2 className="size-3.5" /> Payment Released to Landlord
          </Badge>
        )}
        {status === "refunded" && (
          <Badge className="bg-blue-50 text-blue-700 ring-1 ring-blue-200">
            <XCircle className="size-3.5" /> Refund Processed
          </Badge>
        )}
        {status === "expired" && (
          <Badge className="bg-red-50 text-red-700 ring-1 ring-red-200">
            <Clock className="size-3.5" /> Auto-Refunded (24h elapsed)
          </Badge>
        )}
      </div>

      {/* Input fields */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="duration">Rent Duration</Label>
          <Select
            id="duration"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            disabled={!isActionable}
          >
            {RENT_DURATIONS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="annualRent">Annual Rent Amount ₦</Label>
          <Input
            id="annualRent"
            type="text"
            inputMode="numeric"
            placeholder="e.g. 1,200,000"
            value={annualRent}
            onChange={(e) => setAnnualRent(e.target.value)}
            disabled={!isActionable}
          />
        </div>
        <div>
          <Label htmlFor="legalFee">Legal Fee ₦</Label>
          <Input
            id="legalFee"
            type="text"
            inputMode="numeric"
            placeholder="e.g. 50,000"
            value={legalFee}
            onChange={(e) => setLegalFee(e.target.value)}
            disabled={!isActionable}
          />
        </div>
        <div>
          <Label htmlFor="cautionFee">Caution Fee ₦</Label>
          <Input
            id="cautionFee"
            type="text"
            inputMode="numeric"
            placeholder="e.g. 100,000"
            value={cautionFee}
            onChange={(e) => setCautionFee(e.target.value)}
            disabled={!isActionable}
          />
        </div>
        <div>
          <Label>Total to Pay ₦</Label>
          <div className="flex h-10 items-center rounded-md border border-primary/30 bg-primary/5 px-3 text-base font-bold text-primary">
            {formatNaira(total)}
          </div>
        </div>
      </div>

      {/* Breakdown box */}
      <div className="mt-6">
        <BreakdownBox rent={rent} legal={legal} caution={caution} total={total} />
      </div>

      {/* Countdown timer */}
      {isActionable && (
        <div className="mt-4">
          <CountdownTimer expiry={expiry} onExpire={handleExpire} />
        </div>
      )}

      {/* Action buttons */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Button
          onClick={handleRelease}
          disabled={!isActionable}
          className="flex-1 bg-green-600 text-white hover:bg-green-700"
        >
          <CheckCircle2 className="size-4" />
          Confirm & Release Payment
        </Button>
        <Button
          onClick={handleRefund}
          disabled={!isActionable}
          className="flex-1 bg-red-600 text-white hover:bg-red-700"
        >
          <XCircle className="size-4" />
          Request Refund
        </Button>
      </div>

      {/* Info box */}
      <div className="mt-6 flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
        <Info className="mt-0.5 size-5 shrink-0 text-primary" />
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">
            100% released to landlord on confirmation.
          </span>{" "}
          Auto-refund if no action in 24hrs.
        </p>
      </div>
    </div>
  );
}
