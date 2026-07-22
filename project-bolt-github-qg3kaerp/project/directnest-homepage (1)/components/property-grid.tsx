import { PropertyCard } from "@/components/property-card"
import { properties } from "@/lib/properties"

export function PropertyGrid() {
  return (
    <section id="listings" className="mx-auto max-w-6xl px-4 py-12 md:py-16">
      <div className="mb-6 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-foreground md:text-3xl">
            Featured Properties
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Handpicked homes listed directly by verified owners.
          </p>
        </div>
        <a href="#" className="text-sm font-semibold text-primary hover:underline">
          View all listings
        </a>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {properties.map((property) => (
          <PropertyCard key={property.id} property={property} />
        ))}
      </div>
    </section>
  )
}
