import { Gavel } from 'lucide-react';
import { Button } from '@/components/shadcn/button';
import { EmptyState } from '@/components/shadcn/empty-state';
import { PageHeader } from '@/components/shadcn/page-header';

export default function SellerAuctions() {
    return (
        <div className="space-y-3">
            <PageHeader title="Auctions" description="Run auctions in Bid Central and follow live bids" className="pb-0" />
            <EmptyState
                icon={Gavel}
                title="Your auctions will appear here"
                description="Auctions you create and the bids placed on them show up here."
                action={<Button disabled>Create auction</Button>}
            />
        </div>
    );
}
