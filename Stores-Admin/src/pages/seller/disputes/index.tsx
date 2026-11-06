import { ShieldAlert } from 'lucide-react';
import { EmptyState } from '@/components/shadcn/empty-state';
import { PageHeader } from '@/components/shadcn/page-header';

export default function SellerDisputes() {
    return (
        <div className="space-y-3">
            <PageHeader title="Disputes" description="Return and refund cases on your orders" className="pb-0" />
            <EmptyState icon={ShieldAlert} title="Your disputes will appear here" description="Cases opened by buyers on your orders show up here, with the conversation." />
        </div>
    );
}
