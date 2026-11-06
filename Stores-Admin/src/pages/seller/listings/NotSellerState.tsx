import { Store } from 'lucide-react';
import { Card } from '@/components/shadcn/card';
import { EmptyState } from '@/components/shadcn/empty-state';

/** Shown when the API says this account has no active seller profile (403 on a seller endpoint). */
export function NotSellerState({ message }: { message?: string }) {
    return (
        <Card>
            <EmptyState
                icon={Store}
                title="You are not a seller yet"
                description={message || 'This account does not have an active seller profile, so listings are not available. If you have applied already, the application may still be under review or the profile may be suspended.'}
            />
        </Card>
    );
}
