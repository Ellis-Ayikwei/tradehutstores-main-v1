import { MessageSquareQuote } from 'lucide-react';
import { EmptyState } from '@/components/shadcn/empty-state';
import { PageHeader } from '@/components/shadcn/page-header';

export default function SellerRfq() {
    return (
        <div className="space-y-3">
            <PageHeader title="RFQ" description="Buyer requests for quotes that match your categories" className="pb-0" />
            <EmptyState
                icon={MessageSquareQuote}
                title="Matching requests will appear here"
                description="Requests from buyers that match your categories, and the quotes you send, show up here."
            />
        </div>
    );
}
