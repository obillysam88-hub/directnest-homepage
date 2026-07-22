import React, { useEffect, useMemo, useState } from "react";
import ReactDOM from "react-dom/client";
import "./src/index.css";
import {
  SiteHeader,
  HeroSection,
  TrustBadges,
  AddPropertyCta,
  PropertyGrid,
  SiteFooter,
} from "./src/components.jsx";
import { AddPropertyModal } from "./src/listing-form.jsx";
import KycPage from "./src/kyc-page.jsx";
import AdminDashboard from "./src/admin-dashboard.jsx";
import EscrowPage from "./src/escrow-page.jsx";
import { properties as seedProperties } from "./src/data.js";

const STORAGE_KEY = "directnest:user_properties:v1";

function loadUserProperties() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function parsePrice(value) {
  if (!value) return null;
  const num = Number(String(value).replace(/[^\d.]/g, ""));
  return Number.isFinite(num) ? num : null;
}

function useHashRoute() {
  const [route, setRoute] = useState(() => window.location.hash || "#/");
  useEffect(() => {
    const onChange = () => setRoute(window.location.hash || "#/");
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return route;
}

function App() {
  const [userProperties, setUserProperties] = useState(loadUserProperties);
  const [modalOpen, setModalOpen] = useState(false);
  const [filters, setFilters] = useState({ location: "", maxPrice: "" });
  const route = useHashRoute();
  const isKyc = route.startsWith("#/kyc");
  const isAdmin = route.startsWith("#/admin");
  const isEscrow = route.startsWith("#/escrow");
  const isSubpage = isKyc || isAdmin || isEscrow;

  useEffect(() => {
    if (isSubpage) window.scrollTo(0, 0);
  }, [isSubpage]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(userProperties));
    } catch {
      // ignore quota errors
    }
  }, [userProperties]);

  const allProperties = useMemo(
    () => [...userProperties, ...seedProperties],
    [userProperties]
  );

  const filtered = useMemo(() => {
    const loc = filters.location.toLowerCase().trim();
    const max = parsePrice(filters.maxPrice);
    if (!loc && max == null) return allProperties;
    return allProperties.filter((p) => {
      const matchesLoc = !loc || (p.location || "").toLowerCase().includes(loc);
      const priceNum = parsePrice(p.price);
      const matchesPrice = max == null || priceNum == null || priceNum <= max;
      return matchesLoc && matchesPrice;
    });
  }, [allProperties, filters]);

  const isFiltered = Boolean(filters.location || filters.maxPrice);

  const handleAddProperty = (entry) => {
    const id = `u-${Date.now()}`;
    const fingerprintId = `DN-${String(Date.now()).slice(-3)}`;
    const newProperty = {
      id,
      title: entry.title,
      location: entry.location,
      price: entry.price,
      beds: 0,
      baths: 0,
      area: "—",
      image: entry.image || "",
      images: entry.images || [],
      verified: false,
      description: entry.description,
      owner: entry.owner,
      whatsapp: entry.whatsapp,
      fingerprintId,
      propertyType: entry.propertyType,
      lat: entry.lat ?? null,
      lng: entry.lng ?? null,
    };
    setUserProperties((prev) => [newProperty, ...prev]);
    setModalOpen(false);
  };

  const handleSearch = ({ location, maxPrice }) => {
    setFilters({ location, maxPrice });
    const el = document.getElementById("listings");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  const handleClearFilters = () => setFilters({ location: "", maxPrice: "" });

  const goHome = () => {
    window.location.hash = "#/";
  };

  if (isKyc) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader onAddProperty={() => setModalOpen(true)} />
        <main>
          <KycPage onBack={goHome} />
        </main>
        <SiteFooter />
        <AddPropertyModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onSubmit={handleAddProperty}
        />
      </div>
    );
  }

  if (isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader onAddProperty={() => setModalOpen(true)} />
        <main>
          <AdminDashboard onBack={goHome} />
        </main>
        <SiteFooter />
        <AddPropertyModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onSubmit={handleAddProperty}
        />
      </div>
    );
  }

  if (isEscrow) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader onAddProperty={() => setModalOpen(true)} />
        <main>
          <EscrowPage onBack={goHome} />
        </main>
        <SiteFooter />
        <AddPropertyModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onSubmit={handleAddProperty}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader onAddProperty={() => setModalOpen(true)} />
      <main>
        <HeroSection onSearch={handleSearch} />
        <TrustBadges />
        <AddPropertyCta onAddProperty={() => setModalOpen(true)} />
        <PropertyGrid
          properties={filtered}
          isFiltered={isFiltered}
          onClearFilters={handleClearFilters}
        />
      </main>
      <SiteFooter />
      <AddPropertyModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleAddProperty}
      />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
