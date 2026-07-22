import { useState } from "react";
import {
  ShieldCheck,
  Bed,
  Bath,
  Ruler,
  BadgeCheck,
  MapPin,
  MessageCircle,
  Chrome as Home,
  Phone,
  Fingerprint,
  Search,
} from "lucide-react";

export function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

export function Button({ children, className, variant = "default", ...props }) {
  const variants = {
    default:
      "bg-primary text-primary-foreground hover:opacity-90",
    outline:
      "border border-border bg-card text-foreground hover:bg-secondary",
    ghost: "text-foreground hover:bg-secondary",
  };
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50",
        variants[variant] || variants.default,
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function Input({ className, ...props }) {
  return (
    <input
      className={cn(
        "h-10 w-full rounded-md border border-border bg-card px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40",
        className
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }) {
  return (
    <textarea
      className={cn(
        "w-full rounded-md border border-border bg-card px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40",
        className
      )}
      {...props}
    />
  );
}

export function Label({ children, htmlFor }) {
  return (
    <label htmlFor={htmlFor} className="mb-1 block text-sm font-medium">
      {children}
    </label>
  );
}

export function Badge({ children, className, ...props }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

export function Select({ className, children, ...props }) {
  return (
    <select
      className={cn(
        "h-10 w-full rounded-md border border-border bg-card px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function SiteHeader({ onAddProperty }) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <a href="#/" className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Home className="size-4" />
          </div>
          <span className="text-lg font-extrabold tracking-tight">Directnest</span>
        </a>
        <nav className="hidden items-center gap-6 text-sm font-medium text-muted-foreground md:flex">
          <a href="#listings" className="hover:text-foreground">Browse</a>
          <a href="#why" className="hover:text-foreground">Why Directnest</a>
          <a href="#/kyc" className="hover:text-foreground">KYC</a>
          <a href="#contact" className="hover:text-foreground">Contact</a>
        </nav>
        <Button onClick={onAddProperty}>List Property</Button>
      </div>
    </header>
  );
}

export function HeroSection({ onSearch }) {
  const [location, setLocation] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch({ location: location.trim(), maxPrice: maxPrice.trim() });
  };

  return (
    <section className="bg-secondary/60">
      <div className="mx-auto max-w-6xl px-4 py-14 md:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <ShieldCheck className="size-3.5" />
            Zero agent fees, 100% direct
          </span>
          <h1 className="mt-5 text-4xl font-extrabold leading-tight tracking-tight md:text-5xl">
            Sell Your Property Direct. No Agent Fees.
          </h1>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground md:text-lg">
            Nigeria's property marketplace connecting buyers and verified owners
            directly. Keep more of your money, skip the middlemen.
          </p>
          <form
            onSubmit={handleSubmit}
            className="mx-auto mt-8 flex w-full max-w-xl flex-col gap-2 rounded-2xl border border-border bg-card p-2 shadow-sm sm:flex-row"
          >
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search location e.g. Lekki"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="h-12 border-0 bg-transparent pl-10 text-base shadow-none focus-visible:ring-0"
              />
            </div>
            <Input
              type="number"
              min="0"
              placeholder="Max price ₦"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              className="h-12 border-0 bg-transparent px-3 text-base shadow-none focus-visible:ring-0 sm:w-44"
            />
            <Button type="submit" className="h-12 gap-2 font-semibold">
              <Search className="size-4" />
              Search
            </Button>
          </form>
          <p className="mt-3 text-sm text-muted-foreground">
            Popular: Lekki, Ikeja, Victoria Island, Ajah, Ikoyi
          </p>
        </div>
      </div>
    </section>
  );
}

export function TrustBadges() {
  const items = [
    { icon: BadgeCheck, title: "Verified Owners", text: "Every listing is owned by a verified seller." },
    { icon: ShieldCheck, title: "No Middlemen", text: "Deal directly. No hidden agent commissions." },
    { icon: MessageCircle, title: "Fast Sales", text: "Chat, negotiate, and close in days, not months." },
  ];
  return (
    <section id="why" className="border-b border-border">
      <div className="mx-auto grid max-w-6xl gap-4 px-4 py-10 sm:grid-cols-3">
        {items.map(({ icon: Icon, title, text }) => (
          <div
            key={title}
            className="flex items-start gap-3 rounded-xl border border-border bg-card p-4"
          >
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon className="size-5" />
            </div>
            <div>
              <p className="font-semibold">{title}</p>
              <p className="text-sm text-muted-foreground">{text}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function AddPropertyCta({ onAddProperty }) {
  return (
    <section className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-col items-center justify-between gap-4 rounded-2xl bg-primary px-6 py-8 text-primary-foreground md:flex-row">
        <div>
          <h2 className="text-2xl font-bold">Got a property to sell or rent?</h2>
          <p className="mt-1 text-primary-foreground/90">
            List in minutes. Reach thousands of serious buyers directly.
          </p>
        </div>
        <Button
          onClick={onAddProperty}
          className="bg-white text-primary hover:bg-white/90"
        >
          List your property — free
        </Button>
      </div>
    </section>
  );
}

const verificationBadges = [
  { label: "Verify Owner", icon: BadgeCheck },
  { label: "Verify Property", icon: ShieldCheck },
  { label: "Verify Location", icon: MapPin },
];

function PropertyCard({ property }) {
  const waNumber = (property.whatsapp || "").replace(/[^\d]/g, "");
  const waHref = waNumber ? `https://wa.me/${waNumber}` : null;

  return (
    <article className="overflow-hidden rounded-xl border border-border bg-card shadow-sm transition hover:shadow-md">
      <div className="relative aspect-[4/3] overflow-hidden bg-secondary">
        {property.image ? (
          <img
            src={property.image}
            alt={property.title}
            className="size-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-muted-foreground">
            <Home className="size-10" />
          </div>
        )}
        {property.verified && (
          <Badge className="absolute left-3 top-3 bg-primary/90 text-primary-foreground">
            <BadgeCheck className="size-3.5" />
            Verified
          </Badge>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-semibold">{property.title}</h3>
          <span className="shrink-0 text-sm font-bold text-primary">{property.price}</span>
        </div>
        {property.fingerprintId && (
          <p className="mt-1 flex items-center gap-1 text-xs font-medium text-muted-foreground">
            <Fingerprint className="size-3.5" />
            Property Fingerprint ID: #{property.fingerprintId}
          </p>
        )}
        <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
          <MapPin className="size-3.5" />
          {property.location}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {verificationBadges.map(({ label, icon: Icon }) => (
            <Badge
              key={label}
              className="bg-green-50 text-green-700 ring-1 ring-green-200"
            >
              <Icon className="size-3.5" />
              {label}
            </Badge>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Bed className="size-4" /> {property.beds}
          </span>
          <span className="flex items-center gap-1">
            <Bath className="size-4" /> {property.baths}
          </span>
          <span className="flex items-center gap-1">
            <Ruler className="size-4" /> {property.area}
          </span>
        </div>
        {property.description && (
          <p className="mt-3 text-sm text-muted-foreground line-clamp-2">
            {property.description}
          </p>
        )}
        {property.owner && (
          <p className="mt-2 text-xs text-muted-foreground">
            Owner: {property.owner}
          </p>
        )}
        {waHref && (
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700"
          >
            <MessageCircle className="size-4" />
            Chat Owner on WhatsApp
          </a>
        )}
      </div>
    </article>
  );
}

export function PropertyGrid({ properties, onClearFilters, isFiltered }) {
  return (
    <section id="listings" className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold">
            {isFiltered ? "Search results" : "Featured listings"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {properties.length} {properties.length === 1 ? "property" : "properties"} direct from verified owners across Lagos.
          </p>
        </div>
        {isFiltered && (
          <button
            onClick={onClearFilters}
            className="text-sm font-semibold text-primary hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>
      {properties.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
          <p className="text-sm text-muted-foreground">
            No properties match your search. Try a different location or higher price.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {properties.map((p) => (
            <PropertyCard key={p.id} property={p} />
          ))}
        </div>
      )}
    </section>
  );
}

export function SiteFooter() {
  return (
    <footer id="contact" className="border-t border-border bg-secondary/40">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3">
        <div>
          <a href="#/" className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Home className="size-4" />
            </div>
            <span className="text-lg font-extrabold">Directnest</span>
          </a>
          <p className="mt-3 text-sm text-muted-foreground">
            Nigeria's direct property marketplace. No agents, no hidden fees.
          </p>
        </div>
        <div>
          <p className="font-semibold">Explore</p>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            <li><a href="#listings" className="hover:text-foreground">Browse listings</a></li>
            <li><a href="#why" className="hover:text-foreground">Why Directnest</a></li>
            <li><a href="#/kyc" className="hover:text-foreground">KYC Verification</a></li>
          </ul>
        </div>
        <div>
          <p className="font-semibold">Contact</p>
          <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <MessageCircle className="size-4" /> WhatsApp: +234 800 000 0000
            </li>
            <li className="flex items-center gap-2">
              <Phone className="size-4" /> Support: +234 1 000 0000
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Directnest. All rights reserved.
      </div>
    </footer>
  );
}
