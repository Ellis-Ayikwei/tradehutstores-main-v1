import Link from 'next/link'
import { EmptyPanel, btnSecondary } from '@/components/seller-central/ui'

/** Shown when the API says this account has no active seller profile (403 on a seller endpoint). */
export function NotSellerState({ message }: { message?: string }) {
    return (
        <EmptyPanel
            title="You are not a seller yet"
            description={message || 'This account does not have an active seller profile, so listings are not available. If you have applied already, the application may still be under review or the profile may be suspended.'}
            action={
                <Link href="/sell" className={btnSecondary}>
                    Apply to sell
                </Link>
            }
        />
    )
}
