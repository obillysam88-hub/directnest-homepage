import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"

export function AddPropertyCta() {
  return (
    <section id="add" className="mx-auto max-w-6xl px-4 pb-4">
      <div className="flex flex-col items-center gap-5 rounded-3xl bg-primary px-6 py-10 text-center text-primary-foreground md:py-12">
        <h2 className="text-balance text-2xl font-extrabold md:text-3xl">
          Got a property to sell or rent?
        </h2>
        <p className="max-w-xl text-pretty text-sm leading-relaxed text-primary-foreground/85 md:text-base">
          List it in minutes and connect with verified buyers directly. No agents, no commissions, no hidden fees.
        </p>
        <Button
          asChild
          size="lg"
          variant="secondary"
          className="gap-2 bg-card font-bold text-primary hover:bg-card/90"
        >
          <a href="#">
            <Plus className="size-5" aria-hidden="true" />
            Add Your Property Free
          </a>
        </Button>
      </div>
    </section>
  )
}
