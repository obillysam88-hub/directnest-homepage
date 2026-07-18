import { BadgeCheck, HandCoins, Zap } from "lucide-react"

const badges = [
  {
    icon: BadgeCheck,
    title: "Verified Owners",
    description: "Every listing comes from an identity-verified property owner. No fakes, no scams.",
  },
  {
    icon: HandCoins,
    title: "No Middlemen",
    description: "Deal directly with owners and buyers. Zero agent commissions on every transaction.",
  },
  {
    icon: Zap,
    title: "Fast Sales",
    description: "Reach thousands of serious buyers and close deals in days, not months.",
  },
]

export function TrustBadges() {
  return (
    <section id="why" className="mx-auto max-w-6xl px-4 py-12 md:py-16">
      <div className="grid gap-4 md:grid-cols-3">
        {badges.map((badge) => (
          <div
            key={badge.title}
            className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-6 text-center md:items-start md:text-left"
          >
            <span className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <badge.icon className="size-6" aria-hidden="true" />
            </span>
            <h2 className="text-lg font-bold text-foreground">{badge.title}</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">{badge.description}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
