import React, { useEffect, useMemo, useState } from "react";
import ReactDOM from "react-dom/client";
import "./src/index.css";
import {
  SiteHeader,
  HeroSection,
  TrustBadges,
  AddPropertyCta,
  PropertyGrid,
  AddPropertyModal,
  SiteFooter,
} from "./src/components.jsx";
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

function App() {
  const [userProperties, setUserProperties] = useState(loadUserProperties);
  const [modalOpen, setModalOpen] = useState(false);
  const [filters, setFilters] = useState({ location: "", maxPrice: "" });

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
    const newProperty = {
      id,
      title: entry.title,
      location: entry.location,
      price: entry.price,
      beds: 0,
      baths: 0,
      area: "—",
      image: entry.image || "",
      verified: false,
      description: entry.description,
      owner: entry.owner,
      whatsapp: entry.whatsapp,
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
