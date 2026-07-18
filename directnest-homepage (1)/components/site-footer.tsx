import { Home, MessageCircle, Phone } from "lucide-react"

const WHATSAPP_NUMBER = "2348012345678"
const DISPLAY_NUMBER = "+234 801 234 5678"

export function SiteFooter() {
  return (
    <footer id="contact" className="border-t border-border bg-secondary/40">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-8 md:grid-cols-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Home className="size-5" aria-hidden="true" />
              </span>
              <span className="text-lg font-extrabold tracking-tight text-foreground">Directnest</span>
            </div>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
              Nigeria&apos;s direct property marketplace. Buy and sell with verified owners, pay zero agent fees.
            </p>
          </div>

          <div className="md:text-right">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground">Talk to us</h2>
            <p className="mt-3 text-sm text-muted-foreground">
              Chat with our team on WhatsApp for listings and support.
            </p>
            <a
              href={`https://wa.me/${WHATSAPP_NUMBER}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <MessageCircle className="size-4" aria-hidden="true" />
              WhatsApp {DISPLAY_NUMBER}
            </a>
            <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground md:justify-end">
              <Phone className="size-4" aria-hidden="true" />
              {DISPLAY_NUMBER}
            </p>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row">
          <p>&copy; {new Date().getFullYear()} Directnest. All rights reserved.</p>
          <div className="flex items-center gap-5">
            <a href="#" className="hover:text-foreground">
              Privacy
            </a>
            <a href="#" className="hover:text-foreground">
              Terms
            </a>
            <a href="#" className="hover:text-foreground">
              Help
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
