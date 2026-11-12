import Image from 'next/image'
import Link from 'next/link'
import { BadgeCheck, Lock, ShieldCheck, Truck } from 'lucide-react'

const HERO_POINTS = [
  { icon: ShieldCheck, text: 'Buyer protection on every order' },
  { icon: BadgeCheck, text: 'Secure payments and buyer support' },
  { icon: Truck, text: 'Tracked delivery and easy returns' },
]

interface AuthShellProps {
  heroTitle: string
  heroText: string
  children: React.ReactNode
}

/** The same wordmark as the site header: white lettering on the dark panel, black on the light bar. */
function BrandLogo({ onDark, className }: { onDark: boolean; className: string }) {
  return (
    <Link
      href="/"
      aria-label="TradeHut Stores home"
      className="inline-block rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <Image
        src={onDark ? '/assets/images/logos/ths.png' : '/assets/images/logos/ths-light.png'}
        alt="TradeHut Stores"
        width={2100}
        height={700}
        priority
        className={`h-auto ${className}`}
      />
    </Link>
  )
}

/**
 * Shared frame for the auth pages: single column on mobile, with a brand
 * panel that only appears from `lg`.
 */
export default function AuthShell({ heroTitle, heroText, children }: AuthShellProps) {
  return (
    <div className="flex min-h-screen bg-white text-zinc-900">
      <aside className="relative hidden w-[420px] shrink-0 flex-col justify-between overflow-hidden bg-zinc-900 p-12 text-white lg:flex xl:w-[520px] xl:p-16">
        <div className="relative z-10">
          <BrandLogo onDark className="w-44 xl:w-52" />
          <h2 className="mt-16 font-display text-4xl font-extrabold leading-tight xl:text-5xl">
            {heroTitle}
          </h2>
          <p className="mt-5 max-w-sm text-base leading-relaxed text-zinc-300">{heroText}</p>
        </div>

        <ul className="relative z-10 space-y-4">
          {HERO_POINTS.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-center gap-3 text-sm text-zinc-200">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-800 text-primary-300">
                <Icon size={18} aria-hidden />
              </span>
              {text}
            </li>
          ))}
        </ul>

      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-4 sm:px-8 lg:hidden">
          <BrandLogo onDark={false} className="w-28 sm:w-32" />
          <span className="inline-flex items-center gap-1.5 text-xs text-zinc-600">
            <Lock size={14} aria-hidden />
            Secure checkout
          </span>
        </div>

        <div className="flex flex-1 items-start justify-center px-4 py-8 sm:px-8 sm:py-12 lg:items-center lg:px-12">
          <div className="w-full max-w-md">{children}</div>
        </div>

        <p className="flex items-center justify-center gap-1.5 px-4 pb-6 text-center text-xs text-zinc-500">
          <ShieldCheck size={14} aria-hidden />
          Your data is encrypted and never shared without your consent.
        </p>
      </main>
    </div>
  )
}
