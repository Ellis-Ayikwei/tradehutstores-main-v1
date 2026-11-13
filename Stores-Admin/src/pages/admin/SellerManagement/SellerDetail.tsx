import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import useSWR, { useSWRConfig } from 'swr';
import { toast } from 'sonner';
import { ArrowLeft, Ban, Banknote, Check, Coins, Percent, Package, RefreshCw, RotateCcw, ShieldCheck, ShoppingBag, Store, Wallet, XCircle } from 'lucide-react';
import { Button } from '@/components/shadcn/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shadcn/card';
import { EmptyState } from '@/components/shadcn/empty-state';
import { PageHeader } from '@/components/shadcn/page-header';
import { StatCard } from '@/components/shadcn/stat-card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/shadcn/tabs';
import { cn } from '@/lib/utils';
import { fetchAdminSeller, fetchSellerSummary, updateAdminSeller, type AdminSellerError, type SellerDetail as SellerDetailData, type SellerFinanceSummary, type SellerUpdate } from '@/services/adminSellersService';
import { formatMoney } from '@/services/sellerStatsService';
import { setPageTitle } from '@/store/themeConfigSlice';
import { ErrorPanel } from '@/components/admin/ErrorPanel';
import { DecisionDialog, type ActionResult } from './DecisionDialog';
import { DocumentsSection } from './DocumentsSection';
import { SellerOrdersTab, SellerPayoutsTab, SellerSoldTab, summaryKey } from './SellerMoneyTabs';
import { DetailSkeleton, Field, IdentitySection, MIN_REJECT_REASON, MIN_SUSPEND_REASON, SELLERS_KEY, SWR_OPTIONS, Section, StoreSettings, detailKey } from './sellerSections';
import { CategoryChips, OTHER_CATEGORY_HINT, OtherCategoryChip, StatusBadge, businessTypeLabel, categoryNames, formatDate, formatDateTime, idTypeLabel, ownerName } from './sellerUi';

type Decision = 'approve' | 'reject' | 'suspend' | 'reinstate';
const TABS = ['overview', 'orders', 'sold', 'payouts', 'documents'] as const;
type TabKey = (typeof TABS)[number];

function Panel({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
    return (
        <Card className={className}>
            <CardHeader className="p-4 pb-2 sm:p-5 sm:pb-2">
                <CardTitle className="text-base">{title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-4 pt-2 sm:p-5 sm:pt-2">{children}</CardContent>
        </Card>
    );
}

function MoneyStats({ summary, isLoading }: { summary?: SellerFinanceSummary; isLoading: boolean }) {
    const m = (v?: string) => (summary && v !== undefined ? formatMoney(v, summary.currency) : '-');
    return (
        <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <StatCard label="Sold" value={m(summary?.sold_gross)} icon={ShoppingBag} hint={summary ? `${summary.units_sold} units in ${summary.orders.total} orders` : undefined} isLoading={isLoading} />
                <StatCard label="Platform commission" value={m(summary?.commission)} icon={Percent} hint={summary ? `${summary.commission_rate}% of delivered goods` : undefined} isLoading={isLoading} />
                <StatCard label="Available to pay out" value={m(summary?.balance)} icon={Wallet} hint={summary ? `${m(summary.pending_earnings)} on ${summary.hold_days}-day hold` : undefined} isLoading={isLoading} />
                <StatCard label="Paid out so far" value={m(summary?.paid_out)} icon={Banknote} isLoading={isLoading} />
            </div>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <StatCard label="Delivered goods" value={m(summary?.delivered_gross)} icon={Check} isLoading={isLoading} />
                <StatCard label="Cash collected (COD)" value={m(summary?.cod_gross)} icon={Coins} hint="Held by the seller" isLoading={isLoading} />
                <StatCard label="Products" value={summary ? summary.products.total : '-'} icon={Package} hint={summary ? `${summary.products.available} available` : undefined} isLoading={isLoading} />
                <StatCard label="Orders" value={summary ? summary.orders.total : '-'} icon={Store} hint={summary ? Object.entries(summary.orders.by_status).map(([k, n]) => `${n} ${k.toLowerCase()}`).join(' · ') || undefined : undefined} isLoading={isLoading} />
            </div>
        </div>
    );
}

export default function SellerDetail() {
    const { id = '' } = useParams<{ id: string }>();
    const dispatch = useDispatch();
    const { mutate: globalMutate } = useSWRConfig();
    const [searchParams, setSearchParams] = useSearchParams();
    const tab: TabKey = (TABS as readonly string[]).includes(searchParams.get('tab') ?? '') ? (searchParams.get('tab') as TabKey) : 'overview';

    const { data: seller, error, isLoading, isValidating, mutate } = useSWR<SellerDetailData, AdminSellerError>(id ? detailKey(id) : null, () => fetchAdminSeller(id), SWR_OPTIONS);
    const { data: summary, isLoading: summaryLoading } = useSWR<SellerFinanceSummary, AdminSellerError>(id ? summaryKey(id) : null, () => fetchSellerSummary(id), SWR_OPTIONS);

    const [dialog, setDialog] = useState<Decision | null>(null);
    const [actionError, setActionError] = useState<AdminSellerError | null>(null);

    useEffect(() => {
        dispatch(setPageTitle(seller ? seller.business_name : 'Seller'));
    }, [dispatch, seller]);

    useEffect(() => {
        setDialog(null);
        setActionError(null);
    }, [id]);

    const refreshAll = () => {
        void globalMutate((key) => Array.isArray(key) && key[0] === SELLERS_KEY);
    };
    const surfaceError = (err: AdminSellerError) => {
        setActionError(err);
        refreshAll();
    };

    /** PATCH a decision. Resolves to the error (dialog stays open) or null on success. */
    const decide = async (body: SellerUpdate, success: string): Promise<ActionResult> => {
        setActionError(null);
        try {
            await updateAdminSeller(id, body);
            toast.success(success);
            setDialog(null);
            refreshAll();
            return null;
        } catch (e) {
            const err = e as AdminSellerError;
            if (err.kind === 'network' || err.kind === 'server') toast.error(err.message);
            if (err.kind === 'forbidden' || err.kind === 'not_found') {
                setDialog(null);
                surfaceError(err);
                toast.error(err.message);
            } else if (err.kind === 'conflict' && err.code !== 'missing_documents') {
                toast.error(err.message);
                refreshAll();
            }
            return err;
        }
    };

    const back = (
        <Button asChild variant="outline" size="sm">
            <Link to="/admin/sellers/list">
                <ArrowLeft aria-hidden="true" />
                Sellers
            </Link>
        </Button>
    );

    if (error && !seller) {
        return (
            <div className="space-y-3">
                <PageHeader title="Seller" className="pb-0" actions={back} />
                <Card>
                    <EmptyState
                        icon={Store}
                        title={error.kind === 'not_found' ? 'Seller not found' : "We couldn't load this seller"}
                        description={error.message}
                        action={
                            error.kind === 'not_found' || error.kind === 'forbidden' ? undefined : (
                                <Button type="button" variant="outline" size="sm" onClick={() => void mutate()}>
                                    <RefreshCw aria-hidden="true" />
                                    Try again
                                </Button>
                            )
                        }
                    />
                </Card>
            </div>
        );
    }

    if (isLoading || !seller) {
        return (
            <div className="space-y-3">
                <PageHeader title="Seller" className="pb-0" actions={back} />
                <DetailSkeleton />
            </div>
        );
    }

    const status = seller.verification_status;
    const store = seller.business_name;
    const missing = seller.missing_documents ?? [];
    const docs = seller.documents ?? [];
    const owner = ownerName(seller.user);

    return (
        <div className="space-y-3">
            <PageHeader
                title={store}
                description={[businessTypeLabel(seller.business_type), owner, seller.user?.email].filter(Boolean).join(' · ')}
                className="pb-0"
                actions={
                    <>
                        {back}
                        <Button type="button" variant="outline" size="sm" onClick={() => { void mutate(); void globalMutate(summaryKey(id)); }} disabled={isValidating}>
                            <RefreshCw className={cn(isValidating && 'animate-spin')} aria-hidden="true" />
                            Refresh
                        </Button>
                        {status === 'pending' || status === 'rejected' ? (
                            <Button type="button" size="sm" onClick={() => setDialog('approve')}>
                                <Check aria-hidden="true" />
                                Approve
                            </Button>
                        ) : null}
                        {status === 'pending' ? (
                            <Button type="button" variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDialog('reject')}>
                                <XCircle aria-hidden="true" />
                                Reject…
                            </Button>
                        ) : null}
                        {status === 'verified' ? (
                            <Button type="button" variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDialog('suspend')}>
                                <Ban aria-hidden="true" />
                                Suspend…
                            </Button>
                        ) : null}
                        {status === 'suspended' ? (
                            <Button type="button" size="sm" onClick={() => setDialog('reinstate')}>
                                <RotateCcw aria-hidden="true" />
                                Reinstate
                            </Button>
                        ) : null}
                    </>
                }
            />

            <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={status} />
                {seller.is_active === false ? <span className="text-xs text-muted-foreground">Account inactive</span> : null}
                {seller.is_accepting_orders === false ? <span className="text-xs text-muted-foreground">Not accepting orders</span> : null}
            </div>

            {actionError ? <ErrorPanel title="That did not go through" message={actionError.message} /> : null}

            <Tabs value={tab} onValueChange={(value) => setSearchParams(value === 'overview' ? {} : { tab: value }, { replace: true })}>
                <div className="-mx-1 overflow-x-auto px-1 pb-1">
                    <TabsList className="w-max">
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="orders">Orders{summary ? ` (${summary.orders.total})` : ''}</TabsTrigger>
                        <TabsTrigger value="sold">Sold items</TabsTrigger>
                        <TabsTrigger value="payouts">Payouts</TabsTrigger>
                        <TabsTrigger value="documents">Documents ({docs.length})</TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="overview" className="space-y-3">
                    <MoneyStats summary={summary} isLoading={summaryLoading} />
                    <div className="grid gap-3 lg:grid-cols-2">
                        <Panel title="Business">
                            <dl className="grid grid-cols-1 gap-x-3 gap-y-2 sm:grid-cols-2">
                                <Field label="Store name" value={seller.business_name} />
                                <Field label="Business type" value={businessTypeLabel(seller.business_type)} />
                                <Field label="Owner" value={owner ? `${owner}${seller.user?.email ? ` (${seller.user.email})` : ''}` : ''} className="sm:col-span-2" />
                                <Field label="Business email" value={seller.business_email} />
                                <Field label="Business phone" value={seller.business_phone} />
                                <Field label="Address" value={seller.business_address} className="sm:col-span-2" />
                                <Field label="Registration no." value={seller.business_registration_number} />
                                <Field label="Tax ID" value={seller.tax_id} />
                                <div className="min-w-0 space-y-1.5 sm:col-span-2">
                                    <dt className="text-xs text-muted-foreground">Sells</dt>
                                    <dd className="space-y-1.5">
                                        {categoryNames(seller.selling_categories).length > 0 ? (
                                            <CategoryChips names={categoryNames(seller.selling_categories)} limit={Number.MAX_SAFE_INTEGER} />
                                        ) : !seller.other_category?.trim() ? (
                                            <span className="text-sm text-muted-foreground">Not provided</span>
                                        ) : null}
                                        {seller.other_category?.trim() ? (
                                            <div className="space-y-0.5">
                                                <OtherCategoryChip text={seller.other_category} />
                                                <p className="text-xs text-muted-foreground">{OTHER_CATEGORY_HINT}</p>
                                            </div>
                                        ) : null}
                                    </dd>
                                </div>
                                <Field label="About the store" value={seller.business_description} className="sm:col-span-2" />
                            </dl>
                        </Panel>

                        <div className="space-y-3">
                            <Card>
                                <CardContent className="p-4 sm:p-5">
                                    <IdentitySection key={seller.id} seller={seller} />
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="p-4 sm:p-5">
                                    <StoreSettings seller={seller} onSaved={refreshAll} onError={surfaceError} />
                                </CardContent>
                            </Card>
                            <Panel title="History and notes">
                                <dl className="space-y-2">
                                    <Field label="Review notes" value={seller.verification_notes} />
                                    <Field label="Verified on" value={formatDateTime(seller.verification_date)} />
                                    {seller.created_on ? <Field label="Applied on" value={formatDate(seller.created_on)} /> : null}
                                    <Field label="ID type" value={idTypeLabel(seller.id_type)} />
                                </dl>
                            </Panel>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="orders">
                    <SellerOrdersTab sellerId={id} />
                </TabsContent>

                <TabsContent value="sold">
                    <SellerSoldTab sellerId={id} currency={summary?.currency ?? ''} />
                </TabsContent>

                <TabsContent value="payouts">
                    {summary ? <SellerPayoutsTab sellerId={id} summary={summary} /> : <DetailSkeleton />}
                </TabsContent>

                <TabsContent value="documents">
                    <Panel title="Identity and business documents">
                        {missing.length > 0 && status !== 'verified' ? <p className="rounded-md bg-warning-subtle p-2 text-xs text-warning-subtle-foreground">Required documents are missing, so approval will be blocked until they are provided.</p> : null}
                        <DocumentsSection documents={docs} missing={missing} onChanged={refreshAll} onError={surfaceError} />
                    </Panel>
                </TabsContent>
            </Tabs>

            <DecisionDialog open={dialog === 'approve'} onOpenChange={(open) => setDialog(open ? 'approve' : null)} title={`Approve ${store}?`} description="Their products become public." confirmLabel="Approve" onSubmit={() => decide({ verification_status: 'verified' }, `${store} approved`)} />
            <DecisionDialog open={dialog === 'reinstate'} onOpenChange={(open) => setDialog(open ? 'reinstate' : null)} title={`Reinstate ${store}?`} description="The store is verified again and its products become public." confirmLabel="Reinstate" onSubmit={() => decide({ verification_status: 'verified' }, `${store} reinstated`)} />
            <DecisionDialog
                open={dialog === 'reject'}
                onOpenChange={(open) => setDialog(open ? 'reject' : null)}
                title={`Reject ${store}?`}
                description={
                    <span className="flex items-start gap-1.5">
                        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                        <span>The reason you write is shown to the seller, so keep it clear and professional.</span>
                    </span>
                }
                confirmLabel="Reject application"
                destructive
                minReason={MIN_REJECT_REASON}
                reasonLabel="Reason (shown to the seller)"
                onSubmit={(reason) => decide({ verification_status: 'rejected', verification_notes: reason }, `${store} rejected`)}
            />
            <DecisionDialog
                open={dialog === 'suspend'}
                onOpenChange={(open) => setDialog(open ? 'suspend' : null)}
                title={`Suspend ${store}?`}
                description="Their products are removed from public view until the store is reinstated."
                confirmLabel="Suspend store"
                destructive
                minReason={MIN_SUSPEND_REASON}
                reasonLabel="Reason"
                reasonHint="Saved to the seller's review notes."
                onSubmit={(reason) => decide({ verification_status: 'suspended', verification_notes: reason }, `${store} suspended`)}
            />
        </div>
    );
}
