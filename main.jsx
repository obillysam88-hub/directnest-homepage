import React from "react";
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

function App() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main>
        <HeroSection />
        <TrustBadges />
        <AddPropertyCta />
        <PropertyGrid />
      </main>
      <SiteFooter />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
