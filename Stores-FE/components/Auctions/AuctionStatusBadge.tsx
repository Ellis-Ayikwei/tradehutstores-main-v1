import type { DisplayStatus, MyStatus } from '@/lib/auctionsApi'

const BASE = 'inline-flex items-center whitespace-nowrap rounded px-1.5 py-0.5 text-[11px] font-semibold leading-4'

const STATUS: Record<DisplayStatus, { label: string; cls: string }> = {
    live: { label: 'Live', cls: 'bg-emerald-700 text-white' },
    ending_soon: { label: 'Ending soon', cls: 'bg-red-700 text-white dark:bg-red-600' },
    scheduled: { label: 'Upcoming', cls: 'bg-zinc-900 text-white dark:bg-zinc-600' },
    ended: { label: 'Ended', cls: 'bg-zinc-700 text-white dark:bg-zinc-600' },
    cancelled: { label: 'Cancelled', cls: 'bg-zinc-700 text-white dark:bg-zinc-600' },
}

const MINE: Record<MyStatus, { label: string; cls: string }> = {
    winning: { label: 'Winning', cls: 'bg-emerald-700 text-white' },
    outbid: { label: 'Outbid', cls: 'bg-red-700 text-white dark:bg-red-600' },
    won: { label: 'Won', cls: 'bg-emerald-800 text-white' },
    lost: { label: 'Lost', cls: 'bg-zinc-700 text-white dark:bg-zinc-600' },
}

export default function AuctionStatusBadge({ status, className = '' }: { status: DisplayStatus; className?: string }) {
    const s = STATUS[status]
    return <span className={`${BASE} ${s.cls} ${className}`}>{s.label}</span>
}

/** Per-user status (only exists when the viewer has placed at least one bid). */
export function MyStatusBadge({ status, className = '' }: { status: MyStatus; className?: string }) {
    const s = MINE[status]
    return <span className={`${BASE} ${s.cls} ${className}`}>{s.label}</span>
}
