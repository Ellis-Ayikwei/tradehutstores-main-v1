'use client'

import { Mail } from 'lucide-react'

/** Newsletter / subscribe bento — client: form submit handler cannot run in Server Components */
export default function BlogNewsletterSignup() {
  return (
    <article className="md:col-span-2 flex flex-col md:flex-row rounded-xl bg-on-tertiary-container overflow-hidden p-8 md:p-12 relative">
      <div className="absolute right-0 top-0 w-1/3 h-full opacity-10 pointer-events-none flex items-start justify-end overflow-hidden">
        <Mail className="w-48 h-48" />
      </div>

      <div className="relative z-10 md:w-3/5">
        <h3 className="font-syne text-3xl font-extrabold text-tertiary-fixed leading-none mb-6">
          Never miss a pulse.
          <br />
          Market intelligence delivered weekly.
        </h3>
        <p className="text-tertiary-fixed-dim text-sm mb-8 max-w-md">
          Join over 15,000 procurement leads and trade specialists who receive our curated
          analysis every Tuesday morning.
        </p>
        <form className="flex flex-col sm:flex-row gap-3" onSubmit={(e) => e.preventDefault()}>
          <input
            type="email"
            placeholder="work@company.com"
            className="bg-white/10 border-none rounded-lg px-6 py-4 text-white placeholder:text-white/40 focus:ring-2 focus:ring-tertiary-fixed w-full"
          />
          <button
            type="submit"
            className="bg-tertiary-fixed text-on-tertiary-container px-8 py-4 rounded-lg font-bold text-sm whitespace-nowrap hover:bg-white transition-colors active:scale-95"
          >
            Subscribe
          </button>
        </form>
      </div>
    </article>
  )
}
