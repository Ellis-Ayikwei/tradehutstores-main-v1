import Link from 'next/link'

export default function NotFound() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-zinc-100 px-4 dark:bg-zinc-950">
            <div className="w-full max-w-md rounded-md border border-zinc-200 bg-white p-4 text-center dark:border-zinc-800 dark:bg-zinc-900 sm:p-6">
                <p className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">Error 404</p>
                <h1 className="mt-1 font-syne text-2xl font-bold text-zinc-900 dark:text-zinc-100">Page not found</h1>
                <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
                    The page you are looking for does not exist in Seller Central.
                </p>
                <Link
                    href="/seller-central"
                    className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-md bg-primary-700 px-4 text-sm font-semibold text-white hover:bg-primary-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 focus-visible:ring-offset-2 dark:focus-visible:ring-primary-400"
                >
                    Go to Seller Central
                </Link>
            </div>
        </div>
    )
}
