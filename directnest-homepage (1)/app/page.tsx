import { SiteHeader } from "@/components/site-header"
import { HeroSection } from "@/components/hero-section"
import { TrustBadges } from "@/components/trust-badges"
import { AddPropertyCta } from "@/components/add-property-cta"
import { PropertyGrid } from "@/components/property-grid"
import { SiteFooter } from "@/components/site-footer"

export default function Page() {
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
  )
}
