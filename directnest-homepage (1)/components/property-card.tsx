import Image from "next/image"
import { BadgeCheck, Bath, BedDouble, MapPin, Maximize } from "lucide-react"
import type { Property } from "@/lib/properties"

export function PropertyCard({ property }: { property: Property }) {
  return (
    <article className="group overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md">
      <div className="relative aspect-[4/3] overflow-hidden">
        <Image
          src={property.image || "/placeholder.svg"}
          alt={`${property.title} in ${property.location}`}
          fill
          sizes="(max-width: 768px) 100vw, 33vw"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
        {property.verified && (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-card/95 px-2.5 py-1 text-xs font-semibold text-primary shadow-sm">
            <BadgeCheck className="size-3.5" aria-hidden="true" />
            Verified Owner
          </span>
        )}
      </div>

      <div className="p-4">
        <p className="text-lg font-bold text-primary">{property.price}</p>
        <h3 className="mt-1 font-semibold text-foreground text-pretty">{property.title}</h3>
        <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
          <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
          {property.location}
        </p>

        <div className="mt-4 flex items-center gap-4 border-t border-border pt-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <BedDouble className="size-4" aria-hidden="true" />
            {property.beds} bd
          </span>
          <span className="flex items-center gap-1.5">
            <Bath className="size-4" aria-hidden="true" />
            {property.baths} ba
          </span>
          <span className="flex items-center gap-1.5">
            <Maximize className="size-4" aria-hidden="true" />
            {property.area}
          </span>
        </div>
      </div>
    </article>
  )
}
