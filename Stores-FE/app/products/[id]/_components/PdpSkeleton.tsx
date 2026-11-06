/** Mirrors the final layout: gallery | details | buy box on lg+, single column below. */
export default function PdpSkeleton() {
  const bar = 'animate-pulse rounded bg-zinc-200 dark:bg-zinc-800'
  return (
    <div
      className="mx-auto max-w-[1440px] px-3 py-3 sm:px-4 lg:px-6"
      role="status"
      aria-busy="true"
      aria-label="Loading product"
    >
      <div className={`${bar} mb-3 h-3 w-64 max-w-full`} />
      <div className="lg:grid lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)_260px] lg:gap-6 xl:grid-cols-[minmax(0,5fr)_minmax(0,4fr)_320px]">
        <div className="lg:flex lg:gap-3">
          <div className="hidden flex-col gap-2 lg:flex">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className={`${bar} h-14 w-14`} />
            ))}
          </div>
          <div className={`${bar} aspect-square w-full rounded-lg lg:flex-1`} />
        </div>
        <div className="mt-3 space-y-3 lg:mt-0">
          <div className={`${bar} h-6 w-11/12`} />
          <div className={`${bar} h-6 w-2/3`} />
          <div className={`${bar} h-4 w-48`} />
          <hr className="border-zinc-200 dark:border-zinc-800" />
          <div className={`${bar} h-9 w-40`} />
          <div className={`${bar} h-4 w-32`} />
          <div className="flex gap-2">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className={`${bar} h-10 w-16`} />
            ))}
          </div>
          <div className="hidden space-y-2 lg:block">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className={`${bar} h-3 w-full`} />
            ))}
          </div>
        </div>
        <div className="mt-3 hidden space-y-3 rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 lg:mt-0 lg:block lg:self-start">
          <div className={`${bar} h-8 w-28`} />
          <div className={`${bar} h-4 w-24`} />
          <div className={`${bar} h-9 w-full rounded-full`} />
          <div className={`${bar} h-9 w-full rounded-full`} />
          <div className={`${bar} h-4 w-40`} />
        </div>
      </div>
      <span className="sr-only">Loading product details</span>
    </div>
  )
}
