import { Search, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function HeroSection() {
  return (
    <section className="bg-secondary/60">
      <div className="mx-auto max-w-6xl px-4 py-14 md:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <ShieldCheck className="size-3.5" aria-hidden="true" />
            Zero agent fees, 100% direct
          </span>

          <h1 className="mt-5 text-balance text-4xl font-extrabold leading-tight tracking-tight text-foreground md:text-5xl">
            Sell Your Property Direct. No Agent Fees.
          </h1>

          <p className="mt-4 text-pretty text-base leading-relaxed text-muted-foreground md:text-lg">
            Nigeria&apos;s property marketplace connecting buyers and verified owners directly. Keep more of your money,
            skip the middlemen.
          </p>

          <form
            className="mx-auto mt-8 flex w-full max-w-xl flex-col gap-2 rounded-2xl border border-border bg-card p-2 shadow-sm sm:flex-row"
            action="#listings"
          >
            <div className="relative flex-1">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <label htmlFor="property-search" className="sr-only">
                Search properties
              </label>
              <Input
                id="property-search"
                type="search"
                placeholder="Search in Lagos"
                className="h-12 border-0 bg-transparent pl-10 text-base shadow-none focus-visible:ring-0"
              />
            </div>
            <Button type="submit" size="lg" className="h-12 gap-2 font-semibold">
              <Search className="size-4" aria-hidden="true" />
              Search
            </Button>
          </form>

          <p className="mt-3 text-sm text-muted-foreground">
            Popular: Lekki, Ikeja, Victoria Island, Ajah, Ikoyi
          </p>
        </div>
      </div>
    </section>
  )
}
