import React, { useEffect, useState } from 'react';
import {
    ActionBar,
    ConfigSection,
    Field,
    Pill,
    SelectField,
    Toggle,
} from '../components/ConfigPrimitives';
import { useCurrency } from '../../../../contexts/CurrencyContext';
import { useStoreConfig } from '../../../../hooks/useStoreConfig';
import type {
    ShippingMethod,
    ShippingZone,
    StoreConfig,
    StoreConfigPatch,
} from '../../../../services/storeConfigService';
import {
    COUNTRIES,
    COUNTRY_WILDCARD,
    REGION_LABELS,
    type Country,
} from '../../../../utilities/storeCurrency';

type State = Pick<
    StoreConfig,
    | 'shipping_zones'
    | 'shipping_methods'
    | 'shipping_free_threshold'
    | 'shipping_weight_unit'
    | 'shipping_dimension_unit'
    | 'shipping_estimate_at_cart'
    | 'shipping_require_signature'
    | 'shipping_insurance_by_default'
>;

const project = (c: StoreConfig): State => ({
    shipping_zones: c.shipping_zones ?? [],
    shipping_methods: c.shipping_methods ?? [],
    shipping_free_threshold: c.shipping_free_threshold,
    shipping_weight_unit: c.shipping_weight_unit,
    shipping_dimension_unit: c.shipping_dimension_unit,
    shipping_estimate_at_cart: c.shipping_estimate_at_cart,
    shipping_require_signature: c.shipping_require_signature,
    shipping_insurance_by_default: c.shipping_insurance_by_default,
});

const METHOD_ICON: Record<string, string> = {
    standard: 'local_shipping',
    express: 'bolt',
    pickup: 'storefront',
    courier: 'flight',
    dhl: 'public',
};

const COUNTRIES_BY_REGION: Record<Country['region'], Country[]> = COUNTRIES.reduce(
    (acc, c) => {
        (acc[c.region] ||= []).push(c);
        return acc;
    },
    {} as Record<Country['region'], Country[]>
);

const ShippingConfig: React.FC = () => {
    const { baseCurrency, formatDisplayPrice } = useCurrency();
    const { config, loading, saving, error, save } = useStoreConfig();
    const [state, setState] = useState<State | null>(null);
    const [expandedZone, setExpandedZone] = useState<string | null>(null);
    const [zoneSearch, setZoneSearch] = useState<Record<string, string>>({});

    useEffect(() => {
        if (config) setState(project(config));
    }, [config]);

    if (loading || !state) {
        return <div className="p-8 text-center text-on-surface-variant">Loading…</div>;
    }

    const set = <K extends keyof State>(k: K, v: State[K]) =>
        setState((prev) => (prev ? { ...prev, [k]: v } : prev));

    const updateMethod = (id: string, patch: Partial<ShippingMethod>) =>
        set(
            'shipping_methods',
            state.shipping_methods.map((m) => (m.id === id ? { ...m, ...patch } : m))
        );
    const updateZone = (id: string, patch: Partial<ShippingZone>) =>
        set(
            'shipping_zones',
            state.shipping_zones.map((z) => (z.id === id ? { ...z, ...patch } : z))
        );

    const addZone = () => {
        const id = `zone-${Date.now().toString(36)}`;
        const next: ShippingZone = {
            id,
            name: 'New zone',
            countries: [],
            enabled: false,
        };
        set('shipping_zones', [...state.shipping_zones, next]);
        setExpandedZone(id);
    };

    const deleteZone = (id: string) => {
        if (!window.confirm('Delete this zone? Linked delivery methods will keep their global rate.'))
            return;
        set(
            'shipping_zones',
            state.shipping_zones.filter((z) => z.id !== id)
        );
        if (expandedZone === id) setExpandedZone(null);
    };

    const isInternational = (z: ShippingZone) =>
        Array.isArray(z.countries) && z.countries.includes(COUNTRY_WILDCARD);

    const toggleInternational = (z: ShippingZone, on: boolean) => {
        updateZone(z.id, {
            // Wildcard replaces any specific selection — admins should re-pick
            // countries explicitly if they want to scope back down later.
            countries: on ? [COUNTRY_WILDCARD] : [],
        });
    };

    const toggleCountry = (z: ShippingZone, code: string) => {
        const current = (z.countries ?? []).filter((c) => c !== COUNTRY_WILDCARD);
        const next = current.includes(code)
            ? current.filter((c) => c !== code)
            : [...current, code];
        updateZone(z.id, { countries: next });
    };

    const selectAllInRegion = (z: ShippingZone, region: Country['region']) => {
        const codes = (COUNTRIES_BY_REGION[region] ?? []).map((c) => c.code);
        const current = new Set((z.countries ?? []).filter((c) => c !== COUNTRY_WILDCARD));
        const allChecked = codes.every((c) => current.has(c));
        if (allChecked) {
            codes.forEach((c) => current.delete(c));
        } else {
            codes.forEach((c) => current.add(c));
        }
        updateZone(z.id, { countries: Array.from(current) });
    };

    const filterRows = (z: ShippingZone) => {
        const q = (zoneSearch[z.id] ?? '').trim().toLowerCase();
        if (!q) return COUNTRIES;
        return COUNTRIES.filter(
            (c) => c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q)
        );
    };

    return (
        <div className="space-y-6">
            <ConfigSection
                icon="map"
                title="Shipping zones"
                description="Group destinations and tick the countries each zone covers. Enable 'International' to cover every country."
                actions={
                    <button
                        type="button"
                        onClick={addZone}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-primary-container/10 text-primary-container text-xs font-bold uppercase tracking-wider hover:bg-primary-container hover:text-on-primary transition-colors active:scale-95"
                    >
                        <span className="material-symbols-outlined text-base">add</span>
                        Add zone
                    </button>
                }
            >
                {state.shipping_zones.length === 0 ? (
                    <div className="bg-surface-container-low rounded-xl border border-dashed border-outline-variant/30 p-8 text-center text-sm text-on-surface-variant">
                        No zones yet. Add one to start configuring shipping coverage.
                    </div>
                ) : (
                    <div className="space-y-2">
                        {state.shipping_zones.map((z) => {
                            const intl = isInternational(z);
                            const selected = new Set(
                                (z.countries ?? []).filter((c) => c !== COUNTRY_WILDCARD)
                            );
                            const isOpen = expandedZone === z.id;
                            return (
                                <div
                                    key={z.id}
                                    className="bg-surface-container-low rounded-xl border border-outline-variant/10 overflow-hidden"
                                >
                                    {/* ── Header row ─────────────────────────────────────── */}
                                    <div className="flex items-center gap-3 p-4">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setExpandedZone(isOpen ? null : z.id)
                                            }
                                            className="w-10 h-10 rounded-xl bg-surface-container-lowest text-on-surface flex items-center justify-center flex-shrink-0 hover:bg-surface-container transition-colors active:scale-95"
                                            aria-label={isOpen ? 'Collapse zone' : 'Expand zone'}
                                        >
                                            <span className="material-symbols-outlined">
                                                {intl ? 'public' : 'pin_drop'}
                                            </span>
                                        </button>
                                        <div className="flex-1 min-w-0">
                                            <input
                                                type="text"
                                                value={z.name}
                                                onChange={(e) =>
                                                    updateZone(z.id, { name: e.target.value })
                                                }
                                                placeholder="Zone name"
                                                className="w-full bg-transparent border-0 p-0 text-sm font-bold text-on-surface focus:outline-none placeholder:text-on-surface-variant/60"
                                            />
                                            <p className="text-xs text-on-surface-variant opacity-70 truncate">
                                                {intl ? (
                                                    <span className="inline-flex items-center gap-1">
                                                        <Pill tone="blue">International</Pill>
                                                        <span>covers every country</span>
                                                    </span>
                                                ) : selected.size === 0 ? (
                                                    <span className="text-bid-amber">
                                                        No countries selected
                                                    </span>
                                                ) : (
                                                    `${selected.size} ${
                                                        selected.size === 1 ? 'country' : 'countries'
                                                    } selected`
                                                )}
                                            </p>
                                        </div>
                                        {z.enabled ? (
                                            <Pill tone="green">Active</Pill>
                                        ) : (
                                            <Pill>Off</Pill>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setExpandedZone(isOpen ? null : z.id)
                                            }
                                            className="text-on-surface-variant hover:text-primary-container p-2 rounded-lg hover:bg-surface-container transition-colors"
                                            aria-label="Configure"
                                        >
                                            <span className="material-symbols-outlined">
                                                {isOpen ? 'expand_less' : 'expand_more'}
                                            </span>
                                        </button>
                                        <button
                                            type="button"
                                            role="switch"
                                            aria-checked={z.enabled}
                                            onClick={() =>
                                                updateZone(z.id, { enabled: !z.enabled })
                                            }
                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors active:scale-95 ${
                                                z.enabled
                                                    ? 'bg-primary-container'
                                                    : 'bg-surface-container-high'
                                            }`}
                                        >
                                            <span
                                                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                                                    z.enabled ? 'translate-x-5' : 'translate-x-0.5'
                                                }`}
                                            />
                                        </button>
                                    </div>

                                    {/* ── Editor (expanded) ──────────────────────────────── */}
                                    {isOpen && (
                                        <div className="border-t border-outline-variant/10 p-4 space-y-4">
                                            <Toggle
                                                label="International — ship to every country"
                                                description="When on, this zone covers all destinations; per-country selections are ignored."
                                                checked={intl}
                                                onChange={(v) => toggleInternational(z, v)}
                                            />

                                            {!intl && (
                                                <>
                                                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:justify-between">
                                                        <div className="relative flex-1 max-w-sm">
                                                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant opacity-60 text-base pointer-events-none">
                                                                search
                                                            </span>
                                                            <input
                                                                type="search"
                                                                value={zoneSearch[z.id] ?? ''}
                                                                onChange={(e) =>
                                                                    setZoneSearch((prev) => ({
                                                                        ...prev,
                                                                        [z.id]: e.target.value,
                                                                    }))
                                                                }
                                                                placeholder="Search countries"
                                                                className="w-full pl-9 pr-3 py-2 text-sm bg-surface-container-lowest border border-outline-variant/20 rounded-xl text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:border-primary-container"
                                                            />
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    updateZone(z.id, { countries: [] })
                                                                }
                                                                className="text-xs font-bold uppercase tracking-wider text-on-surface-variant hover:text-error transition-colors active:scale-95"
                                                            >
                                                                Clear all
                                                            </button>
                                                            <span className="text-on-surface-variant opacity-30">
                                                                ·
                                                            </span>
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    updateZone(z.id, {
                                                                        countries: COUNTRIES.map(
                                                                            (c) => c.code
                                                                        ),
                                                                    })
                                                                }
                                                                className="text-xs font-bold uppercase tracking-wider text-primary-container hover:text-primary transition-colors active:scale-95"
                                                            >
                                                                Select all
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Countries grouped by region */}
                                                    <div className="space-y-4">
                                                        {(
                                                            Object.keys(REGION_LABELS) as Country['region'][]
                                                        ).map((region) => {
                                                            const visible = filterRows(z).filter(
                                                                (c) => c.region === region
                                                            );
                                                            if (visible.length === 0) return null;
                                                            const allRegion = (
                                                                COUNTRIES_BY_REGION[region] ?? []
                                                            ).every((c) => selected.has(c.code));
                                                            return (
                                                                <div key={region}>
                                                                    <div className="flex items-center justify-between mb-2">
                                                                        <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant opacity-70">
                                                                            {REGION_LABELS[region]}
                                                                        </p>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() =>
                                                                                selectAllInRegion(
                                                                                    z,
                                                                                    region
                                                                                )
                                                                            }
                                                                            className="text-[10px] font-bold uppercase tracking-wider text-primary-container hover:text-primary transition-colors active:scale-95"
                                                                        >
                                                                            {allRegion
                                                                                ? 'Deselect region'
                                                                                : 'Select region'}
                                                                        </button>
                                                                    </div>
                                                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
                                                                        {visible.map((c) => {
                                                                            const checked = selected.has(
                                                                                c.code
                                                                            );
                                                                            return (
                                                                                <button
                                                                                    key={c.code}
                                                                                    type="button"
                                                                                    onClick={() =>
                                                                                        toggleCountry(
                                                                                            z,
                                                                                            c.code
                                                                                        )
                                                                                    }
                                                                                    className={`flex items-center gap-2 p-2 rounded-lg border text-left transition-colors active:scale-[0.98] ${
                                                                                        checked
                                                                                            ? 'bg-primary-container/10 border-primary-container/30'
                                                                                            : 'bg-surface-container-lowest border-outline-variant/15 hover:border-primary-container/30'
                                                                                    }`}
                                                                                >
                                                                                    <span
                                                                                        className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                                                                                            checked
                                                                                                ? 'bg-primary-container border-primary-container'
                                                                                                : 'border-outline-variant/40'
                                                                                        }`}
                                                                                    >
                                                                                        {checked && (
                                                                                            <span className="material-symbols-outlined text-on-primary text-[14px]">
                                                                                                check
                                                                                            </span>
                                                                                        )}
                                                                                    </span>
                                                                                    <span className="text-base leading-none">
                                                                                        {c.flag}
                                                                                    </span>
                                                                                    <span className="text-sm text-on-surface truncate">
                                                                                        {c.name}
                                                                                    </span>
                                                                                    <span className="ml-auto font-mono text-[10px] text-on-surface-variant opacity-60">
                                                                                        {c.code}
                                                                                    </span>
                                                                                </button>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                        {filterRows(z).length === 0 && (
                                                            <p className="text-sm text-on-surface-variant text-center py-6">
                                                                No countries match your search.
                                                            </p>
                                                        )}
                                                    </div>
                                                </>
                                            )}

                                            <div className="flex justify-end pt-2 border-t border-outline-variant/10">
                                                <button
                                                    type="button"
                                                    onClick={() => deleteZone(z.id)}
                                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider text-error hover:bg-error-container/40 transition-colors active:scale-95"
                                                >
                                                    <span className="material-symbols-outlined text-base">
                                                        delete
                                                    </span>
                                                    Delete zone
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </ConfigSection>

            <ConfigSection
                icon="local_shipping"
                title="Delivery methods"
                description={`Rates display in store base currency (${baseCurrency}).`}
            >
                <div className="overflow-x-auto rounded-xl border border-outline-variant/10">
                    <table className="w-full text-sm">
                        <thead className="bg-surface-container-low/60">
                            <tr className="text-left">
                                <th className="px-4 py-2 text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">
                                    Method
                                </th>
                                <th className="px-4 py-2 text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">
                                    Transit
                                </th>
                                <th className="px-4 py-2 text-[10px] uppercase tracking-widest font-bold text-on-surface-variant text-right">
                                    Rate ({baseCurrency})
                                </th>
                                <th className="px-4 py-2 text-[10px] uppercase tracking-widest font-bold text-on-surface-variant text-right">
                                    Display
                                </th>
                                <th className="px-4 py-2 text-[10px] uppercase tracking-widest font-bold text-on-surface-variant text-right">
                                    Active
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-outline-variant/10">
                            {state.shipping_methods.map((m) => (
                                <tr key={m.id} className="hover:bg-surface-container-low/40">
                                    <td className="px-4 py-2.5">
                                        <div className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-base text-on-surface-variant">
                                                {METHOD_ICON[m.id] ?? 'local_shipping'}
                                            </span>
                                            <span className="text-on-surface font-medium">{m.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-2.5 text-on-surface-variant">{m.transit}</td>
                                    <td className="px-4 py-2.5 text-right">
                                        <input
                                            type="number"
                                            step={1}
                                            value={m.rate}
                                            onChange={(e) =>
                                                updateMethod(m.id, { rate: Number(e.target.value) })
                                            }
                                            className="w-24 bg-surface-container-low border border-outline-variant/20 rounded-lg px-2.5 py-1 text-sm font-mono text-on-surface text-right focus:outline-none focus:border-primary-container"
                                        />
                                    </td>
                                    <td className="px-4 py-2.5 text-right font-mono text-xs text-on-surface-variant">
                                        {m.rate === 0 ? 'Free' : formatDisplayPrice(m.rate)}
                                    </td>
                                    <td className="px-4 py-2.5 text-right">
                                        <button
                                            type="button"
                                            role="switch"
                                            aria-checked={m.enabled}
                                            onClick={() =>
                                                updateMethod(m.id, { enabled: !m.enabled })
                                            }
                                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors active:scale-95 ${
                                                m.enabled
                                                    ? 'bg-primary-container'
                                                    : 'bg-surface-container-high'
                                            }`}
                                        >
                                            <span
                                                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                                                    m.enabled ? 'translate-x-4' : 'translate-x-0.5'
                                                }`}
                                            />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </ConfigSection>

            <ConfigSection
                icon="package_2"
                title="Packaging & policy"
                description="How orders are measured, insured, and presented at checkout."
            >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <Field label="Free shipping threshold" hint="Orders at/above this value ship free.">
                        <div className="flex">
                            <span className="inline-flex items-center px-3 rounded-l-xl bg-surface-container border border-r-0 border-outline-variant/20 text-xs font-mono text-on-surface-variant">
                                {baseCurrency}
                            </span>
                            <input
                                type="number"
                                step={1}
                                value={String(state.shipping_free_threshold)}
                                onChange={(e) =>
                                    set('shipping_free_threshold', Number(e.target.value))
                                }
                                className="flex-1 bg-surface-container-low border border-outline-variant/20 rounded-r-xl px-4 py-2.5 text-sm text-on-surface focus:outline-none focus:border-primary-container"
                            />
                        </div>
                    </Field>

                    <Field label="Weight unit">
                        <SelectField
                            value={state.shipping_weight_unit}
                            onChange={(e) =>
                                set(
                                    'shipping_weight_unit',
                                    e.target.value as State['shipping_weight_unit']
                                )
                            }
                        >
                            <option value="kg">Kilograms (kg)</option>
                            <option value="lb">Pounds (lb)</option>
                        </SelectField>
                    </Field>

                    <Field label="Dimension unit">
                        <SelectField
                            value={state.shipping_dimension_unit}
                            onChange={(e) =>
                                set(
                                    'shipping_dimension_unit',
                                    e.target.value as State['shipping_dimension_unit']
                                )
                            }
                        >
                            <option value="cm">Centimeters (cm)</option>
                            <option value="in">Inches (in)</option>
                        </SelectField>
                    </Field>
                </div>

                <Toggle
                    label="Show shipping estimate in cart"
                    description="Estimate delivery cost before the buyer reaches checkout."
                    checked={state.shipping_estimate_at_cart}
                    onChange={(v) => set('shipping_estimate_at_cart', v)}
                />
                <Toggle
                    label="Require signature on delivery"
                    description="Adds a signature requirement for all couriered shipments."
                    checked={state.shipping_require_signature}
                    onChange={(v) => set('shipping_require_signature', v)}
                />
                <Toggle
                    label="Insure shipments by default"
                    description="Buyer pays a small insurance fee at checkout."
                    checked={state.shipping_insurance_by_default}
                    onChange={(v) => set('shipping_insurance_by_default', v)}
                />

                {error && (
                    <div className="bg-error-container/40 border border-error/30 text-on-error-container rounded-xl px-4 py-3 text-sm whitespace-pre-wrap">
                        {error}
                    </div>
                )}

                <ActionBar
                    onSave={() => save(state as StoreConfigPatch)}
                    onReset={() => config && setState(project(config))}
                    saving={saving}
                />
            </ConfigSection>
        </div>
    );
};

export default ShippingConfig;
