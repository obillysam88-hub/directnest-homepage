import { Home } from "lucide-react"
import { Button } from "@/components/ui/button"

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <a href="/" className="flex items-center gap-2" aria-label="Directnest home">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Home className="size-5" aria-hidden="true" />
          </span>
          <span className="text-lg font-extrabold tracking-tight text-foreground">Directnest</span>
        </a>

        <nav className="hidden items-center gap-6 text-sm font-medium text-muted-foreground md:flex">
          <a href="#listings" className="transition-colors hover:text-foreground">
            Browse
          </a>
          <a href="#why" className="transition-colors hover:text-foreground">
            Why Directnest
          </a>
          <a href="#contact" className="transition-colors hover:text-foreground">
            Contact
          </a>
        </nav>

        <Button asChild size="sm" className="font-semibold">
          <a href="#add">List Property</a>
        </Button>
      </div>
    </header>
  )
}
