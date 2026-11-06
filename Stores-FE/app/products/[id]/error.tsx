'use client'

import { AlertTriangle } from 'lucide-react'
import MainLayout from '@/components/Layouts/MainLayout'
import PdpMessage from './_components/PdpMessage'

export default function ProductError({ reset }: { error: Error; reset: () => void }) {
  return (
    <MainLayout>
      <PdpMessage
        icon={<AlertTriangle className="h-8 w-8" aria-hidden />}
        title="Something went wrong"
        message="We could not display this product. Please try again."
        action={
          <button
            type="button"
            onClick={reset}
            className="inline-flex h-11 items-center rounded-full border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-5 text-sm font-semibold text-zinc-900 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 focus-visible:ring-offset-2 ring-offset-white dark:focus-visible:ring-primary-400 dark:ring-offset-gray-950 sm:h-9"
          >
            Try again
          </button>
        }
      />
    </MainLayout>
  )
}
