import React, { useCallback, useEffect, useState } from 'react';
import { History, RefreshCw } from 'lucide-react';
import { Button } from '@/components/shadcn/button';
import { Card, CardContent } from '@/components/shadcn/card';
import { EmptyState } from '@/components/shadcn/empty-state';
import { Input } from '@/components/shadcn/input';
import { Skeleton } from '@/components/shadcn/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/shadcn/table';
import { PromoRedemption, fetchRedemptions, promosAdminErrorMessage } from '@/services/promosAdminService';
import { Alert } from './_shared';

const RedemptionsTab: React.FC = () => {
    const [rows, setRows] = useState<PromoRedemption[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');

    const load = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            setRows(await fetchRedemptions());
        } catch (e) {
            setError(promosAdminErrorMessage(e));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const filtered = rows.filter((r) => {
        const s = search.trim().toLowerCase();
        if (!s) return true;
        return r.promo_code.toLowerCase().includes(s) || (r.user_email || '').toLowerCase().includes(s) || r.order_id.toLowerCase().includes(s);
    });

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Input
                    placeholder="Search by code, email, or order id…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="sm:max-w-sm"
                    aria-label="Search redemptions"
                />
                <Button type="button" variant="outline" onClick={load} disabled={loading}>
                    <RefreshCw className={loading ? 'animate-spin' : ''} aria-hidden="true" /> Refresh
                </Button>
            </div>

            {error ? <Alert>{error}</Alert> : null}

            {loading ? (
                <div className="space-y-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton key={i} className="h-12 w-full" />
                    ))}
                </div>
            ) : filtered.length === 0 ? (
                <Card>
                    <EmptyState
                        icon={History}
                        title="No redemptions yet"
                        description="Once customers start using promo codes at checkout, every redemption will appear here. The log is read-only."
                    />
                </Card>
            ) : (
                <>
                    {/* Desktop table */}
                    <Card className="hidden overflow-hidden md:block">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>When</TableHead>
                                    <TableHead>Code</TableHead>
                                    <TableHead>Customer</TableHead>
                                    <TableHead>Order</TableHead>
                                    <TableHead className="text-right">Subtotal</TableHead>
                                    <TableHead className="text-right">Discount</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filtered.map((row) => (
                                    <TableRow key={row.id}>
                                        <TableCell className="text-xs text-muted-foreground">{new Date(row.created_at).toLocaleString()}</TableCell>
                                        <TableCell className="font-mono font-bold">{row.promo_code}</TableCell>
                                        <TableCell className="text-xs">{row.user_email || <span className="text-muted-foreground">guest</span>}</TableCell>
                                        <TableCell className="font-mono text-xs text-muted-foreground">{row.order_id}</TableCell>
                                        <TableCell className="text-right text-xs text-muted-foreground">GHS {row.order_subtotal}</TableCell>
                                        <TableCell className="text-right text-xs font-bold text-success-600">− GHS {row.discount_amount}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Card>

                    {/* Mobile cards */}
                    <div className="space-y-3 md:hidden">
                        {filtered.map((row) => (
                            <Card key={row.id}>
                                <CardContent className="space-y-2 p-4 pt-4">
                                    <div className="flex items-start justify-between gap-2">
                                        <span className="font-mono text-sm font-bold">{row.promo_code}</span>
                                        <span className="text-sm font-bold text-success-600">− GHS {row.discount_amount}</span>
                                    </div>
                                    <p className="break-all text-xs text-muted-foreground">{row.user_email || 'guest'}</p>
                                    <p className="break-all font-mono text-xs text-muted-foreground">Order {row.order_id}</p>
                                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                                        <span>{new Date(row.created_at).toLocaleString()}</span>
                                        <span>Subtotal GHS {row.order_subtotal}</span>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};

export default RedemptionsTab;
