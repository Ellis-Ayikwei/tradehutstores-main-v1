import {
    IconBolt,
    IconBuildingStore,
    IconCalendarTime,
    IconCopy,
    IconDots,
    IconEdit,
    IconEye,
    IconEyeOff,
    IconPlus,
    IconRefresh,
    IconSparkles,
    IconTicket,
    IconTrash,
    IconWand,
} from '@tabler/icons-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    DISCOUNT_TYPES,
    PromoCode,
    PromoCodeWritePayload,
    PromoFilter,
    TARGET_TYPES,
    USER_SEGMENTS,
    bulkGenerate,
    createAdminPromo,
    deleteAdminPromo,
    emptyDraft,
    fetchAdminPromos,
    patchAdminPromo,
    promosAdminErrorMessage,
    toggleAdminPromo,
} from '../../../services/promosAdminService';
import {
    Alert,
    DiscountBadge,
    EmptyState,
    Field,
    ModalShell,
    ScopeBadge,
    StatusBadge,
    UsageBar,
    inputCls,
} from './_shared';

function toLocalInput(iso: string | null): string {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(v: string): string | null {
    if (!v) return null;
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

interface Props {
    onChange?: () => void;
}

const CodesTab: React.FC<Props> = ({ onChange }) => {
    const [rows, setRows] = useState<PromoCode[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<PromoFilter>({});
    const [search, setSearch] = useState('');

    const [editingId, setEditingId] = useState<number | null>(null);
    const [draft, setDraft] = useState<PromoCodeWritePayload>(emptyDraft);
    const [open, setOpen] = useState(false);
    const [saving, setSaving] = useState(false);

    const [bulkFor, setBulkFor] = useState<PromoCode | null>(null);
    const [bulkCount, setBulkCount] = useState(10);
    const [bulkPrefix, setBulkPrefix] = useState('');
    const [bulkBusy, setBulkBusy] = useState(false);
    const [bulkResult, setBulkResult] = useState<string[] | null>(null);

    const load = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            setRows(await fetchAdminPromos({ ...filter, q: search || undefined }));
        } catch (e) {
            setError(promosAdminErrorMessage(e));
        } finally {
            setLoading(false);
        }
    }, [filter, search]);

    useEffect(() => {
        load();
    }, [load]);

    const counts = useMemo(() => {
        return {
            all: rows.length,
            live: rows.filter((r) => r.is_live).length,
            platform: rows.filter((r) => !r.is_seller_scoped).length,
            seller: rows.filter((r) => r.is_seller_scoped).length,
            inactive: rows.filter((r) => !r.is_active).length,
        };
    }, [rows]);

    const openCreate = () => {
        setEditingId(null);
        setDraft(emptyDraft());
        setOpen(true);
    };

    const openEdit = (row: PromoCode) => {
        setEditingId(row.id);
        setDraft({
            code: row.code,
            name: row.name,
            description: row.description,
            is_active: row.is_active,
            seller: row.seller,
            discount_type: row.discount_type,
            discount_value: parseFloat(row.discount_value || '0'),
            max_discount_amount: row.max_discount_amount ? parseFloat(row.max_discount_amount) : null,
            buy_quantity: row.buy_quantity ?? 0,
            get_quantity: row.get_quantity ?? 0,
            fixed_price: row.fixed_price ? parseFloat(row.fixed_price) : null,
            target_type: row.target_type,
            products: row.products ?? [],
            categories: row.categories ?? [],
            include_free_shipping: row.include_free_shipping ?? false,
            min_order_value: parseFloat(row.min_order_value || '0'),
            min_items_count: row.min_items_count,
            user_segment: row.user_segment ?? 'all',
            specific_users: row.specific_users ?? [],
            stackable: row.stackable,
            first_order_only: row.first_order_only,
            max_redemptions: row.max_redemptions,
            max_redemptions_per_user: row.max_redemptions_per_user,
            starts_at: row.starts_at,
            ends_at: row.ends_at,
            auto_apply: row.auto_apply,
            auto_apply_priority: row.auto_apply_priority,
        });
        setOpen(true);
    };

    const save = async () => {
        if (!draft.code.trim() || !draft.name.trim()) {
            setError('Code and name are required.');
            return;
        }
        try {
            setSaving(true);
            setError(null);
            if (editingId) await patchAdminPromo(editingId, draft);
            else await createAdminPromo(draft);
            setOpen(false);
            await load();
            onChange?.();
        } catch (e) {
            setError(promosAdminErrorMessage(e));
        } finally {
            setSaving(false);
        }
    };

    const remove = async (row: PromoCode) => {
        if (!confirm(`Delete promo "${row.code}"? This cannot be undone.`)) return;
        try {
            await deleteAdminPromo(row.id);
            await load();
            onChange?.();
        } catch (e) {
            setError(promosAdminErrorMessage(e));
        }
    };

    const toggle = async (row: PromoCode) => {
        try {
            await toggleAdminPromo(row.id);
            await load();
            onChange?.();
        } catch (e) {
            setError(promosAdminErrorMessage(e));
        }
    };

    const copyCode = async (code: string) => {
        try {
            await navigator.clipboard.writeText(code);
        } catch {
            /* ignore */
        }
    };

    const runBulk = async () => {
        if (!bulkFor) return;
        try {
            setBulkBusy(true);
            const r = await bulkGenerate(bulkFor.id, bulkCount, bulkPrefix || undefined);
            setBulkResult(r.codes);
            await load();
            onChange?.();
        } catch (e) {
            setError(promosAdminErrorMessage(e));
        } finally {
            setBulkBusy(false);
        }
    };

    return (
        <div className="space-y-4">
            {/* Filter chips */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 overflow-x-auto">
                <FilterChip
                    active={!filter.platform_only && filter.is_active === undefined && !filter.seller}
                    onClick={() => setFilter({})}
                    label="All"
                    count={counts.all}
                />
                <FilterChip
                    active={filter.platform_only === true}
                    onClick={() => setFilter({ platform_only: true })}
                    label="Platform"
                    count={counts.platform}
                    dotColor="#6366f1"
                />
                <FilterChip
                    active={filter.is_active === true}
                    onClick={() => setFilter({ is_active: true })}
                    label="Active"
                    count={counts.live + (counts.all - counts.live - counts.inactive)}
                    dotColor="#10b981"
                />
                <FilterChip
                    active={filter.is_active === false}
                    onClick={() => setFilter({ is_active: false })}
                    label="Paused"
                    count={counts.inactive}
                    dotColor="#6b7280"
                />
            </div>

            {/* Toolbar */}
            <div className="flex items-center gap-3 flex-wrap rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-3">
                <input
                    placeholder="Search by code or name…"
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
                <button
                    type="button"
                    onClick={openCreate}
                    className="ml-auto inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-white hover:bg-primary/90 shadow"
                >
                    <IconPlus size={16} /> New code
                </button>
            </div>

            {error && <Alert>{error}</Alert>}

            {loading ? (
                <div className="text-center py-12 text-sm text-on-surface-variant">Loading promo codes…</div>
            ) : rows.length === 0 ? (
                <EmptyState
                    icon={<IconTicket size={26} />}
                    title="No promo codes"
                    body="Create one to start running discounts. You can scope it to a specific seller or run it platform-wide."
                    action={
                        <button
                            type="button"
                            onClick={openCreate}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-white hover:bg-primary/90"
                        >
                            <IconPlus size={16} /> Create your first code
                        </button>
                    }
                />
            ) : (
                <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-800/60">
                            <tr className="text-left text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant">
                                <th className="px-4 py-3">Code</th>
                                <th className="px-4 py-3">Discount</th>
                                <th className="px-4 py-3">Scope</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3">Schedule</th>
                                <th className="px-4 py-3">Usage</th>
                                <th className="px-4 py-3"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row) => (
                                <tr
                                    key={row.id}
                                    className="border-t border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/40"
                                >
                                    <td className="px-4 py-3 align-top">
                                        <button
                                            type="button"
                                            onClick={() => copyCode(row.code)}
                                            title="Copy code"
                                            className="group/code inline-flex items-center gap-1.5 text-on-surface dark:text-white font-mono font-bold text-sm hover:text-primary transition"
                                        >
                                            {row.code}
                                            <IconCopy
                                                size={11}
                                                className="opacity-0 group-hover/code:opacity-100 transition"
                                            />
                                        </button>
                                        <p className="text-xs text-on-surface-variant mt-0.5 truncate max-w-[200px]">
                                            {row.name}
                                        </p>
                                    </td>
                                    <td className="px-4 py-3 align-top">
                                        <DiscountBadge promo={row} />
                                        {row.first_order_only && (
                                            <p className="text-[10px] text-on-surface-variant mt-1">
                                                First order only
                                            </p>
                                        )}
                                        {row.auto_apply && (
                                            <p className="text-[10px] font-bold text-primary mt-1">
                                                AUTO-APPLY · pri {row.auto_apply_priority}
                                            </p>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 align-top">
                                        <ScopeBadge promo={row} />
                                    </td>
                                    <td className="px-4 py-3 align-top">
                                        <StatusBadge promo={row} />
                                    </td>
                                    <td className="px-4 py-3 align-top text-xs">
                                        {row.starts_at || row.ends_at ? (
                                            <span className="inline-flex items-center gap-1 text-on-surface-variant">
                                                <IconCalendarTime size={11} />
                                                {row.starts_at
                                                    ? new Date(row.starts_at).toLocaleDateString()
                                                    : 'now'}
                                                <span> → </span>
                                                {row.ends_at
                                                    ? new Date(row.ends_at).toLocaleDateString()
                                                    : '∞'}
                                            </span>
                                        ) : (
                                            <span className="text-on-surface-variant">Always</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 align-top">
                                        <UsageBar promo={row} />
                                    </td>
                                    <td className="px-4 py-3 align-top">
                                        <div className="flex justify-end gap-1">
                                            <button
                                                onClick={() => toggle(row)}
                                                className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-on-surface-variant"
                                                title={row.is_active ? 'Pause' : 'Activate'}
                                            >
                                                {row.is_active ? (
                                                    <IconEyeOff size={15} />
                                                ) : (
                                                    <IconEye size={15} />
                                                )}
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setBulkFor(row);
                                                    setBulkPrefix(row.code.split('-')[0] || '');
                                                    setBulkResult(null);
                                                }}
                                                className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-on-surface-variant"
                                                title="Bulk-generate codes from this template"
                                            >
                                                <IconWand size={15} />
                                            </button>
                                            <button
                                                onClick={() => openEdit(row)}
                                                className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-on-surface-variant"
                                                title="Edit"
                                            >
                                                <IconEdit size={15} />
                                            </button>
                                            <button
                                                onClick={() => remove(row)}
                                                className="p-1.5 rounded-md hover:bg-red-100 dark:hover:bg-red-950 text-red-600"
                                                title="Delete"
                                            >
                                                <IconTrash size={15} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Editor modal */}
            {open && (
                <ModalShell
                    title={editingId ? 'Edit promo code' : 'New promo code'}
                    icon={
                        <span className="p-2 rounded-lg bg-primary/10 text-primary">
                            <IconTicket size={18} />
                        </span>
                    }
                    onClose={() => setOpen(false)}
                    onSave={save}
                    saving={saving}
                    saveLabel={editingId ? 'Save changes' : 'Create code'}
                    width="lg"
                >
                    <div className="p-6 space-y-5">
                        {error && <Alert>{error}</Alert>}

                        {/* Identity */}
                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Code *" hint="Customer types this at checkout. Auto-uppercased.">
                                <input
                                    className={`${inputCls} font-mono uppercase`}
                                    value={draft.code}
                                    onChange={(e) =>
                                        setDraft((d) => ({ ...d, code: e.target.value.toUpperCase() }))
                                    }
                                    placeholder="SUMMER20"
                                />
                            </Field>
                            <Field label="Internal name *" hint="Only shown in admin">
                                <input
                                    className={inputCls}
                                    value={draft.name}
                                    onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                                    placeholder="Summer 2026 campaign"
                                />
                            </Field>
                        </div>
                        <Field
                            label="Description"
                            hint="Shown to the customer when they successfully apply"
                        >
                            <input
                                className={inputCls}
                                value={draft.description}
                                onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                                placeholder="20% off everything for the summer"
                            />
                        </Field>

                        {/* Ownership */}
                        <Field
                            label="Scope"
                            hint="Leave Platform unless this code is paid for / scoped to a single seller."
                        >
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setDraft((d) => ({ ...d, seller: null }))}
                                    className={[
                                        'px-3 py-2.5 rounded-lg text-sm font-bold border transition flex items-center justify-center gap-2',
                                        draft.seller === null
                                            ? 'bg-indigo-600 text-white border-indigo-600 shadow'
                                            : 'border-gray-300 dark:border-gray-700 text-on-surface-variant hover:bg-gray-100 dark:hover:bg-gray-800',
                                    ].join(' ')}
                                >
                                    <IconBolt size={14} /> Platform-wide
                                </button>
                                <div
                                    className={[
                                        'flex items-center gap-2 px-3 py-2 rounded-lg text-sm border transition',
                                        draft.seller
                                            ? 'bg-sky-50 border-sky-300 dark:bg-sky-950 dark:border-sky-700'
                                            : 'border-gray-300 dark:border-gray-700',
                                    ].join(' ')}
                                >
                                    <IconBuildingStore size={14} className="shrink-0" />
                                    <input
                                        className="flex-1 bg-transparent outline-none text-xs font-mono"
                                        value={draft.seller ?? ''}
                                        onChange={(e) =>
                                            setDraft((d) => ({
                                                ...d,
                                                seller: e.target.value.trim() || null,
                                            }))
                                        }
                                        placeholder="seller UUID (paste here)"
                                    />
                                </div>
                            </div>
                        </Field>

                        {/* Discount rule */}
                        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 p-4 space-y-3 bg-gray-50/40 dark:bg-gray-800/30">
                            <div className="flex items-center gap-2">
                                <IconSparkles size={14} className="text-primary" />
                                <p className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">
                                    Discount
                                </p>
                            </div>
                            <Field label="Type">
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                    {DISCOUNT_TYPES.map((d) => {
                                        const selected = draft.discount_type === d.value;
                                        return (
                                            <button
                                                key={d.value}
                                                type="button"
                                                onClick={() =>
                                                    setDraft((p) => ({ ...p, discount_type: d.value }))
                                                }
                                                className={[
                                                    'px-3 py-2 rounded-lg text-xs font-bold border transition text-left',
                                                    selected
                                                        ? 'text-white border-transparent shadow'
                                                        : 'border-gray-300 dark:border-gray-700 text-on-surface-variant hover:bg-gray-100 dark:hover:bg-gray-800',
                                                ].join(' ')}
                                                style={selected ? { backgroundColor: d.color } : undefined}
                                            >
                                                {d.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </Field>

                            <div className="grid grid-cols-2 gap-3">
                                <Field
                                    label="Value"
                                    hint={
                                        draft.discount_type === 'percentage'
                                            ? '1-100 (%)'
                                            : draft.discount_type === 'fixed_amount'
                                              ? 'GHS amount off'
                                              : 'Ignored for this type'
                                    }
                                >
                                    <input
                                        type="number"
                                        min={0}
                                        className={inputCls}
                                        value={draft.discount_value}
                                        onChange={(e) =>
                                            setDraft((d) => ({
                                                ...d,
                                                discount_value: Number(e.target.value) || 0,
                                            }))
                                        }
                                    />
                                </Field>
                                {draft.discount_type === 'percentage' && (
                                    <Field
                                        label="Max discount (GHS)"
                                        hint="Cap the absolute amount (e.g. 20% but never more than GHS 50)"
                                    >
                                        <input
                                            type="number"
                                            min={0}
                                            className={inputCls}
                                            value={draft.max_discount_amount ?? ''}
                                            onChange={(e) =>
                                                setDraft((d) => ({
                                                    ...d,
                                                    max_discount_amount: e.target.value
                                                        ? Number(e.target.value)
                                                        : null,
                                                }))
                                            }
                                            placeholder="No cap"
                                        />
                                    </Field>
                                )}
                                {draft.discount_type === 'fixed_price' && (
                                    <Field
                                        label="Fixed cart price (GHS)"
                                        hint="Customer pays this total regardless of subtotal"
                                    >
                                        <input
                                            type="number"
                                            min={0}
                                            className={inputCls}
                                            value={draft.fixed_price ?? ''}
                                            onChange={(e) =>
                                                setDraft((d) => ({
                                                    ...d,
                                                    fixed_price: e.target.value
                                                        ? Number(e.target.value)
                                                        : null,
                                                }))
                                            }
                                        />
                                    </Field>
                                )}
                                {draft.discount_type === 'buy_x_get_y' && (
                                    <>
                                        <Field label="Buy quantity">
                                            <input
                                                type="number"
                                                min={1}
                                                className={inputCls}
                                                value={draft.buy_quantity}
                                                onChange={(e) =>
                                                    setDraft((d) => ({
                                                        ...d,
                                                        buy_quantity: Number(e.target.value) || 0,
                                                    }))
                                                }
                                            />
                                        </Field>
                                        <Field label="Get quantity (free)">
                                            <input
                                                type="number"
                                                min={1}
                                                className={inputCls}
                                                value={draft.get_quantity}
                                                onChange={(e) =>
                                                    setDraft((d) => ({
                                                        ...d,
                                                        get_quantity: Number(e.target.value) || 0,
                                                    }))
                                                }
                                            />
                                        </Field>
                                    </>
                                )}
                            </div>

                            <label className="flex items-center gap-2 text-sm">
                                <input
                                    type="checkbox"
                                    checked={draft.include_free_shipping ?? false}
                                    onChange={(e) =>
                                        setDraft((d) => ({
                                            ...d,
                                            include_free_shipping: e.target.checked,
                                        }))
                                    }
                                />
                                Also include free shipping
                            </label>
                        </div>

                        {/* Eligibility */}
                        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 p-4 space-y-3 bg-gray-50/40 dark:bg-gray-800/30">
                            <p className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">
                                Eligibility
                            </p>
                            <div className="grid grid-cols-2 gap-3">
                                <Field label="Min order value (GHS)">
                                    <input
                                        type="number"
                                        min={0}
                                        className={inputCls}
                                        value={draft.min_order_value ?? 0}
                                        onChange={(e) =>
                                            setDraft((d) => ({
                                                ...d,
                                                min_order_value: Number(e.target.value) || 0,
                                            }))
                                        }
                                    />
                                </Field>
                                <Field label="Min items in cart">
                                    <input
                                        type="number"
                                        min={0}
                                        className={inputCls}
                                        value={draft.min_items_count ?? 0}
                                        onChange={(e) =>
                                            setDraft((d) => ({
                                                ...d,
                                                min_items_count: Number(e.target.value) || 0,
                                            }))
                                        }
                                    />
                                </Field>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <Field label="Target">
                                    <select
                                        className={inputCls}
                                        value={draft.target_type}
                                        onChange={(e) =>
                                            setDraft((d) => ({
                                                ...d,
                                                target_type: e.target.value as typeof d.target_type,
                                            }))
                                        }
                                    >
                                        {TARGET_TYPES.map((t) => (
                                            <option key={t.value} value={t.value}>
                                                {t.label}
                                            </option>
                                        ))}
                                    </select>
                                </Field>
                                <Field label="User segment">
                                    <select
                                        className={inputCls}
                                        value={draft.user_segment}
                                        onChange={(e) =>
                                            setDraft((d) => ({
                                                ...d,
                                                user_segment: e.target.value as typeof d.user_segment,
                                            }))
                                        }
                                    >
                                        {USER_SEGMENTS.map((s) => (
                                            <option key={s.value} value={s.value}>
                                                {s.label}
                                            </option>
                                        ))}
                                    </select>
                                </Field>
                            </div>
                            <div className="flex flex-wrap gap-3">
                                <label className="flex items-center gap-2 text-sm">
                                    <input
                                        type="checkbox"
                                        checked={draft.first_order_only ?? false}
                                        onChange={(e) =>
                                            setDraft((d) => ({
                                                ...d,
                                                first_order_only: e.target.checked,
                                            }))
                                        }
                                    />
                                    First order only
                                </label>
                                <label className="flex items-center gap-2 text-sm">
                                    <input
                                        type="checkbox"
                                        checked={draft.stackable ?? false}
                                        onChange={(e) =>
                                            setDraft((d) => ({ ...d, stackable: e.target.checked }))
                                        }
                                    />
                                    Stackable with other promos
                                </label>
                            </div>
                        </div>

                        {/* Limits + schedule */}
                        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 p-4 space-y-3 bg-gray-50/40 dark:bg-gray-800/30">
                            <p className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">
                                Limits & schedule
                            </p>
                            <div className="grid grid-cols-2 gap-3">
                                <Field label="Max redemptions" hint="Total cap. Empty = unlimited.">
                                    <input
                                        type="number"
                                        min={0}
                                        className={inputCls}
                                        value={draft.max_redemptions ?? ''}
                                        onChange={(e) =>
                                            setDraft((d) => ({
                                                ...d,
                                                max_redemptions: e.target.value
                                                    ? Number(e.target.value)
                                                    : null,
                                            }))
                                        }
                                        placeholder="Unlimited"
                                    />
                                </Field>
                                <Field
                                    label="Max per user"
                                    hint="Per-user cap. 0 = unlimited per user."
                                >
                                    <input
                                        type="number"
                                        min={0}
                                        className={inputCls}
                                        value={draft.max_redemptions_per_user ?? 1}
                                        onChange={(e) =>
                                            setDraft((d) => ({
                                                ...d,
                                                max_redemptions_per_user: Number(e.target.value) || 0,
                                            }))
                                        }
                                    />
                                </Field>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <Field label="Starts at">
                                    <input
                                        type="datetime-local"
                                        className={inputCls}
                                        value={toLocalInput(draft.starts_at ?? null)}
                                        onChange={(e) =>
                                            setDraft((d) => ({
                                                ...d,
                                                starts_at: fromLocalInput(e.target.value),
                                            }))
                                        }
                                    />
                                </Field>
                                <Field label="Ends at">
                                    <input
                                        type="datetime-local"
                                        className={inputCls}
                                        value={toLocalInput(draft.ends_at ?? null)}
                                        onChange={(e) =>
                                            setDraft((d) => ({
                                                ...d,
                                                ends_at: fromLocalInput(e.target.value),
                                            }))
                                        }
                                    />
                                </Field>
                            </div>
                            <label className="flex items-center gap-2 text-sm">
                                <input
                                    type="checkbox"
                                    checked={draft.is_active ?? true}
                                    onChange={(e) =>
                                        setDraft((d) => ({ ...d, is_active: e.target.checked }))
                                    }
                                />
                                Active (eligible to be applied)
                            </label>
                        </div>

                        {/* Auto apply */}
                        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 p-4 space-y-3 bg-gray-50/40 dark:bg-gray-800/30">
                            <label className="flex items-center gap-2 text-sm font-bold">
                                <input
                                    type="checkbox"
                                    checked={draft.auto_apply ?? false}
                                    onChange={(e) =>
                                        setDraft((d) => ({ ...d, auto_apply: e.target.checked }))
                                    }
                                />
                                Auto-apply when conditions are met (no code entry needed)
                            </label>
                            {draft.auto_apply && (
                                <Field
                                    label="Auto-apply priority"
                                    hint="Higher wins if multiple auto-apply codes qualify"
                                >
                                    <input
                                        type="number"
                                        min={0}
                                        className={inputCls}
                                        value={draft.auto_apply_priority ?? 0}
                                        onChange={(e) =>
                                            setDraft((d) => ({
                                                ...d,
                                                auto_apply_priority: Number(e.target.value) || 0,
                                            }))
                                        }
                                    />
                                </Field>
                            )}
                        </div>
                    </div>
                </ModalShell>
            )}

            {/* Bulk-generate modal */}
            {bulkFor && (
                <ModalShell
                    title={`Bulk-generate from "${bulkFor.code}"`}
                    icon={
                        <span className="p-2 rounded-lg bg-primary/10 text-primary">
                            <IconWand size={18} />
                        </span>
                    }
                    onClose={() => {
                        setBulkFor(null);
                        setBulkResult(null);
                    }}
                    onSave={runBulk}
                    saving={bulkBusy}
                    saveLabel={bulkResult ? 'Done' : `Mint ${bulkCount} codes`}
                    width="md"
                >
                    <div className="p-6 space-y-4">
                        <p className="text-sm text-on-surface-variant">
                            Mints N unique codes that copy the rule from <strong>{bulkFor.code}</strong>.
                            Each new code defaults to inactive, max 1 redemption, max 1 per user.
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Count">
                                <input
                                    type="number"
                                    min={1}
                                    max={500}
                                    className={inputCls}
                                    value={bulkCount}
                                    onChange={(e) => setBulkCount(Math.max(1, Number(e.target.value) || 1))}
                                />
                            </Field>
                            <Field label="Prefix" hint="Each code becomes <PREFIX>-XXXXXXXX">
                                <input
                                    className={`${inputCls} font-mono uppercase`}
                                    value={bulkPrefix}
                                    onChange={(e) => setBulkPrefix(e.target.value.toUpperCase())}
                                    placeholder="SUMMER"
                                />
                            </Field>
                        </div>
                        {bulkResult && (
                            <div className="rounded-lg border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950 p-3">
                                <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300 mb-2">
                                    Created {bulkResult.length} codes (paused; review and activate when ready)
                                </p>
                                <div className="font-mono text-[11px] max-h-40 overflow-y-auto text-on-surface dark:text-white">
                                    {bulkResult.map((c) => (
                                        <div key={c}>{c}</div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </ModalShell>
            )}
        </div>
    );
};

const FilterChip: React.FC<{
    active: boolean;
    onClick: () => void;
    label: string;
    count: number;
    dotColor?: string;
}> = ({ active, onClick, label, count, dotColor }) => (
    <button
        type="button"
        onClick={onClick}
        className={[
            'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap',
            active
                ? 'bg-primary text-white shadow'
                : 'text-on-surface-variant hover:bg-gray-100 dark:hover:bg-gray-800',
        ].join(' ')}
    >
        {dotColor && (
            <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: active ? '#ffffff' : dotColor }}
            />
        )}
        {label}
        <span
            className={[
                'inline-block px-1.5 rounded text-[10px] font-bold',
                active ? 'bg-white/25 text-white' : 'bg-gray-100 dark:bg-gray-800 text-on-surface-variant',
            ].join(' ')}
        >
            {count}
        </span>
    </button>
);

export default CodesTab;
