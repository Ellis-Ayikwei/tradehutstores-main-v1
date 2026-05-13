import { IconHistory, IconRefresh } from '@tabler/icons-react';
import React, { useCallback, useEffect, useState } from 'react';
import {
    PromoRedemption,
    fetchRedemptions,
    promosAdminErrorMessage,
} from '../../../services/promosAdminService';
import { Alert, EmptyState, inputCls } from './_shared';

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
        return (
            r.promo_code.toLowerCase().includes(s) ||
            (r.user_email || '').toLowerCase().includes(s) ||
            r.order_id.toLowerCase().includes(s)
        );
    });

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-3 flex-wrap rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-3">
                <input
                    placeholder="Search by code, email, or order id…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className={`${inputCls} max-w-sm`}
                />
                <button
                    type="button"
                    onClick={load}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold border border-gray-300 dark:border-gray-700 text-on-surface-variant hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                    <IconRefresh size={16} /> Refresh
                </button>
            </div>

            {error && <Alert>{error}</Alert>}

            {loading ? (
                <div className="text-center py-12 text-sm text-on-surface-variant">
                    Loading redemptions…
                </div>
            ) : filtered.length === 0 ? (
                <EmptyState
                    icon={<IconHistory size={26} />}
                    title="No redemptions yet"
                    body="Once customers start using promo codes at checkout, every redemption will appear here. The log is read-only — redemptions are created atomically with the order."
                />
            ) : (
                <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-800/60">
                            <tr className="text-left text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant">
                                <th className="px-4 py-3">When</th>
                                <th className="px-4 py-3">Code</th>
                                <th className="px-4 py-3">Customer</th>
                                <th className="px-4 py-3">Order</th>
                                <th className="px-4 py-3 text-right">Subtotal</th>
                                <th className="px-4 py-3 text-right">Discount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((row) => (
                                <tr
                                    key={row.id}
                                    className="border-t border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/40"
                                >
                                    <td className="px-4 py-3 text-xs text-on-surface-variant">
                                        {new Date(row.created_at).toLocaleString()}
                                    </td>
                                    <td className="px-4 py-3 font-mono font-bold text-on-surface dark:text-white">
                                        {row.promo_code}
                                    </td>
                                    <td className="px-4 py-3 text-xs">
                                        {row.user_email || (
                                            <span className="text-on-surface-variant">guest</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-xs font-mono text-on-surface-variant">
                                        {row.order_id}
                                    </td>
                                    <td className="px-4 py-3 text-xs text-right text-on-surface-variant">
                                        GHS {row.order_subtotal}
                                    </td>
                                    <td className="px-4 py-3 text-xs text-right font-bold text-emerald-600">
                                        − GHS {row.discount_amount}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default RedemptionsTab;
