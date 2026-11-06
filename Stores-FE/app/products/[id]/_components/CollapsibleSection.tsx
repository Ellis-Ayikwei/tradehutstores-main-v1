'use client'

import { useId, useState, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'

interface CollapsibleSectionProps {
  id?: string
  title: ReactNode
  children: ReactNode
  /** Initial state below lg. From lg up the section is always expanded. */
  defaultOpen?: boolean
  /** Controlled mode (used so the rating link can open Reviews on mobile). */
  open?: boolean
  onOpenChange?: (open: boolean) => void
  className?: string
}

/** Accordion below lg, plain headed section from lg up. */
export default function CollapsibleSection({
  id,
  title,
  children,
  defaultOpen = false,
  open: controlledOpen,
  onOpenChange,
  className = '',
}: CollapsibleSectionProps) {
  const [innerOpen, setInnerOpen] = useState(defaultOpen)
  const open = controlledOpen ?? innerOpen
  const panelId = useId()

  const toggle = () => {
    const next = !open
    if (controlledOpen === undefined) setInnerOpen(next)
    onOpenChange?.(next)
  }

  return (
    <section id={id} className={`scroll-mt-40 border-t border-zinc-200 dark:border-zinc-800 ${className}`}>
      <h2 className="m-0">
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          aria-controls={panelId}
          className="flex min-h-[44px] w-full items-center justify-between gap-2 py-2 text-left text-base font-bold text-zinc-900 dark:text-zinc-100 lg:pointer-events-none lg:min-h-0 lg:pb-2 lg:pt-3 lg:text-xl"
        >
          {title}
          <ChevronDown
            className={`h-5 w-5 shrink-0 text-zinc-500 dark:text-zinc-400 transition-transform lg:hidden ${open ? 'rotate-180' : ''}`}
            aria-hidden
          />
        </button>
      </h2>
      <div id={panelId} className={`${open ? 'block' : 'hidden'} pb-3 lg:block`}>
        {children}
      </div>
    </section>
  )
}
