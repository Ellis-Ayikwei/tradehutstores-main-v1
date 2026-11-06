import { Wallet } from 'lucide-react';
import { Button } from '@/components/shadcn/button';
import { EmptyState } from '@/components/shadcn/empty-state';
import { PageHeader } from '@/components/shadcn/page-header';

export default function SellerPayouts() {
    return (
        <div className="space-y-3">
            <PageHeader title="Payouts" description="Your balance and payout history" className="pb-0" />
            <EmptyState
                icon={Wallet}
                title="Your payouts will appear here"
                description="Your balance and payout history show up here."
                action={<Button disabled>Request payout</Button>}
            />
        </div>
    );
}
