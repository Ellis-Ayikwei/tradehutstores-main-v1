import Link from 'next/link'
import type { ReactNode } from 'react'

interface PdpMessageProps {
  icon: ReactNode
  title: string
  message: string
  action?: ReactNode
}

/** Centered empty/error message used for 404 and load failures. */
export default function PdpMessage({ icon, title, message, action }: PdpMessageProps) {
  return (
    <div className="mx-auto max-w-[1440px] px-3 py-6 sm:px-4 lg:px-6">
      <div className="mx-auto flex max-w-md flex-col items-center gap-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-8 text-center">
        <span className="text-zinc-500 dark:text-zinc-400">{icon}</span>
        <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{title}</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{message}</p>
        <div className="mt-1 flex flex-wrap justify-center gap-2">
          {action}
          <Link
            href="/products"
            className="inline-flex h-11 items-center rounded-full bg-primary-700 px-5 text-sm font-semibold text-white hover:bg-primary-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 focus-visible:ring-offset-2 ring-offset-white dark:focus-visible:ring-primary-400 dark:ring-offset-gray-950 sm:h-9"
          >
            Browse products
          </Link>
        </div>
      </div>
    </div>
  )
}
