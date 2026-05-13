import React, { useEffect, useState } from 'react';
import { useCurrency } from '../../../../contexts/CurrencyContext';
import { useStoreConfig } from '../../../../hooks/useStoreConfig';
import type {
    CountryTaxRate,
    StoreConfig,
    StoreConfigPatch,
} from '../../../../services/storeConfigService';
import {
    ActionBar,
    ConfigSection,
    Field,
    Pill,
    SelectField,
    TextField,
    Toggle,
} from '../components/ConfigPrimitives';

type State = Pick<
    StoreConfig,
    | 'currency_base'
    | 'currency_enabled_display'
    | 'tax_mode'
    | 'tax_default_rate'
    | 'tax_country_rates'
    | 'tax_charge_on_shipping'
    | 'tax_show_id_at_checkout'
    | 'tax_id'
>;

const project = (c: StoreConfig): State => ({
    currency_base: c.currency_base,
    currency_enabled_display: c.currency_enabled_display ?? [],
    tax_mode: c.tax_mode,
    tax_default_rate: c.tax_default_rate,
    tax_country_rates: c.tax_country_rates ?? [],
    tax_charge_on_shipping: c.tax_charge_on_shipping,
    tax_show_id_at_checkout: c.tax_show_id_at_checkout,
    tax_id: c.tax_id,
});

const CurrencyTaxConfig: React.FC = () => {
    const {
        currency,
        setCurrency,
        baseCurrency,
        setBaseCurrency,
        supportedCurrencies,
        exchangeRates,
        fxAsOf,
        fxStale,
        fxSource,
        formatDisplayPrice,
    } = useCurrency();

    const { config, loading, saving, error, save } = useStoreConfig();
    const [state, setState] = useState<State | null>(null);

    useEffect(() => {
        if (config) {
            setState(project(config));
            // Keep the global Currency context in sync with what the BE
            // considers authoritative — so the rest of the admin sees the
            // BE-stored base currency immediately on load.
            if (config.currency_base && config.currency_base !== baseCurrency) {
                setBaseCurrency(config.currency_base);
            }
        }
        // We deliberately do not depend on `baseCurrency` / `setBaseCurrency`
        // here — that would loop when this component pushes the value back.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [config]);

    if (loading || !state) {
        return <div className="p-8 text-center text-on-surface-variant">Loading…</div>;
    }

    const set = <K extends keyof State>(key: K, value: State[K]) =>
        setState((prev) => (prev ? { ...prev, [key]: value } : prev));

    const baseInfo = supportedCurrencies.find((c) => c.code === state.currency_base);

    const toggleDisplayCurrency = (code: string) => {
        const next = state.currency_enabled_display.includes(code)
            ? state.currency_enabled_display.filter((x) => x !== code)
            : [...state.currency_enabled_display, code];
        set('currency_enabled_display', next);
    };

    const setBaseAndContext = (code: string) => {
        const upper = code.toUpperCase();
        set('currency_base', upper);
        // Echo into the global context so the header switcher / dashboards
        // see the change before the BE round-trip.
        setBaseCurrency(upper);
    };

    const persist = async () => {
        // Always include the base in the enabled list before sending — the
        // serializer would re-add it but we keep the local state honest too.
        const cleaned = Array.from(
            new Set([state.currency_base, ...state.currency_enabled_display])
        );
        const next = await save({ ...state, currency_enabled_display: cleaned } as StoreConfigPatch);
        if (next?.currency_base) setBaseCurrency(next.currency_base);
    };

    return (
        <div className="space-y-6">
            <ConfigSection
                icon="savings"
                title="Store base currency"
                description="The single ISO currency that catalog prices, orders, and payouts are stored in."
                actions={
                    <Pill tone={state.currency_base === 'GHS' ? 'green' : 'amber'}>
                        Active · {state.currency_base}
                    </Pill>
                }
            >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <Field
                        label="Base currency"
                        hint="Switching this re-bases every product, order, and payout amount."
                        badge={<Pill tone="amber">Admin only</Pill>}
                    >
                        <SelectField
                            value={state.currency_base}
                            onChange={(e) => setBaseAndContext(e.target.value)}
                        >
                            {supportedCurrencies.map((c) => (
                                <option key={c.code} value={c.code}>
                                    {c.symbol} · {c.code} — {c.label}
                                </option>
                            ))}
                        </SelectField>
                    </Field>

                    <Field label="Your view" hint="Affects only what you see in dashboards & reports.">
                        <SelectField value={currency} onChange={(e) => setCurrency(e.target.value)}>
                            {supportedCurrencies
                                .filter((c) => state.currency_enabled_display.includes(c.code))
                                .map((c) => (
                                    <option key={c.code} value={c.code}>
                                        {c.symbol} · {c.code}
                                    </option>
                                ))}
                        </SelectField>
                    </Field>

                    <Field label="Sample (1,000 base → display)">
                        <div className="flex items-center h-[42px] px-4 rounded-xl bg-surface-container-low border border-outline-variant/15 font-mono text-sm font-bold text-on-surface">
                            {formatDisplayPrice(1000)}
                        </div>
                    </Field>
                </div>

                {state.currency_base !== 'GHS' && (
                    <div className="bg-bid-amber/10 border border-bid-amber/20 rounded-xl p-4 flex items-start gap-3">
                        <span className="material-symbols-outlined text-bid-amber">warning</span>
                        <div className="text-sm text-on-surface">
                            Base is currently <strong>{state.currency_base}</strong>. The recommended
                            base for this deployment is <strong>GHS</strong> — switch back unless
                            you've also rebased BE catalog prices via{' '}
                            <code className="font-mono text-xs px-1.5 py-0.5 rounded bg-surface-container">
                                TRADEHUT_STORE_BASE_CURRENCY
                            </code>
                            .
                        </div>
                    </div>
                )}
            </ConfigSection>

            <ConfigSection
                icon="public"
                title="Display currencies"
                description="ISO codes shoppers and admins can pick from in the storefront / admin headers."
            >
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                    {supportedCurrencies.map((c) => {
                        const enabled = state.currency_enabled_display.includes(c.code);
                        const isBase = c.code === state.currency_base;
                        return (
                            <button
                                key={c.code}
                                type="button"
                                onClick={() => !isBase && toggleDisplayCurrency(c.code)}
                                disabled={isBase}
                                className={`flex items-center justify-between p-3 rounded-xl border transition-all active:scale-95 ${
                                    enabled
                                        ? 'bg-primary-container/10 border-primary-container/30 text-primary-container'
                                        : 'bg-surface-container-low border-outline-variant/15 text-on-surface hover:border-primary-container/30'
                                } ${isBase ? 'cursor-not-allowed opacity-90' : ''}`}
                            >
                                <span className="flex items-center gap-2">
                                    <span className="font-mono text-sm font-bold">{c.symbol}</span>
                                    <span className="text-sm font-bold">{c.code}</span>
                                </span>
                                {isBase ? (
                                    <Pill tone="green">Base</Pill>
                                ) : enabled ? (
                                    <span className="material-symbols-outlined text-base">check_circle</span>
                                ) : (
                                    <span className="material-symbols-outlined text-base opacity-40">add</span>
                                )}
                            </button>
                        );
                    })}
                </div>
                <p className="text-xs text-on-surface-variant opacity-70">
                    The base currency is always available. Disabling a display currency hides it from
                    the storefront / admin pickers.
                </p>
            </ConfigSection>

            <ConfigSection
                icon="published_with_changes"
                title="Foreign exchange"
                description="Live rates are pulled from the backend FX snapshot endpoint."
                actions={<Pill tone={fxStale ? 'amber' : 'green'}>{fxStale ? 'Stale' : 'Live'}</Pill>}
            >
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="bg-surface-container-low rounded-xl p-4">
                        <p className="text-[10px] uppercase tracking-widest text-on-surface-variant opacity-70">
                            Source
                        </p>
                        <p className="font-mono text-sm font-bold text-on-surface mt-1">
                            {fxSource ?? 'fallback'}
                        </p>
                    </div>
                    <div className="bg-surface-container-low rounded-xl p-4">
                        <p className="text-[10px] uppercase tracking-widest text-on-surface-variant opacity-70">
                            Last updated
                        </p>
                        <p className="font-mono text-sm font-bold text-on-surface mt-1">
                            {fxAsOf ? new Date(fxAsOf).toLocaleString() : '—'}
                        </p>
                    </div>
                    <div className="bg-surface-container-low rounded-xl p-4">
                        <p className="text-[10px] uppercase tracking-widest text-on-surface-variant opacity-70">
                            Rates loaded
                        </p>
                        <p className="font-mono text-sm font-bold text-on-surface mt-1">
                            {Object.keys(exchangeRates).length}
                        </p>
                    </div>
                </div>

                <div className="overflow-x-auto rounded-xl border border-outline-variant/10">
                    <table className="w-full text-sm">
                        <thead className="bg-surface-container-low/60">
                            <tr className="text-left">
                                <th className="px-4 py-2 text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">
                                    Code
                                </th>
                                <th className="px-4 py-2 text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">
                                    Currency
                                </th>
                                <th className="px-4 py-2 text-[10px] uppercase tracking-widest font-bold text-on-surface-variant text-right">
                                    Per 1 {state.currency_base}
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-outline-variant/10">
                            {supportedCurrencies.map((c) => {
                                const rate = exchangeRates[c.code];
                                return (
                                    <tr key={c.code}>
                                        <td className="px-4 py-2 font-mono text-on-surface">{c.code}</td>
                                        <td className="px-4 py-2 text-on-surface-variant">{c.label}</td>
                                        <td className="px-4 py-2 font-mono text-right text-on-surface">
                                            {rate != null ? rate.toFixed(4) : '—'}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                <p className="text-xs text-on-surface-variant opacity-70">
                    Rates are read-only here. To change the FX provider toggle{' '}
                    <code className="font-mono text-xs px-1.5 py-0.5 rounded bg-surface-container">
                        TRADEHUT_FX_FETCH_FRANKFURTER
                    </code>{' '}
                    on the backend.
                </p>
            </ConfigSection>

            <ConfigSection
                icon="receipt_long"
                title="Tax"
                description="How tax is calculated, displayed, and collected at checkout."
                actions={
                    baseInfo && (
                        <Pill tone="blue">
                            Reported in {baseInfo.symbol}
                            {baseInfo.code}
                        </Pill>
                    )
                }
            >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <Field label="Tax mode" hint="Inclusive: prices already contain tax. Exclusive: tax is added at checkout.">
                        <SelectField
                            value={state.tax_mode}
                            onChange={(e) => set('tax_mode', e.target.value as State['tax_mode'])}
                        >
                            <option value="inclusive">Tax-inclusive pricing</option>
                            <option value="exclusive">Tax-exclusive pricing</option>
                        </SelectField>
                    </Field>

                    <Field label="Default rate (%)" hint="Applied when no country-specific rule matches.">
                        <TextField
                            type="number"
                            step={0.1}
                            value={String(state.tax_default_rate)}
                            onChange={(e) => set('tax_default_rate', Number(e.target.value))}
                        />
                    </Field>

                    <Field label="Tax / VAT registration ID">
                        <TextField
                            value={state.tax_id}
                            onChange={(e) => set('tax_id', e.target.value)}
                            placeholder="e.g. GHA-TIN-000000000"
                        />
                    </Field>
                </div>

                <div>
                    <p className="text-sm font-medium text-on-surface mb-2">Per-country rates</p>
                    <div className="space-y-2">
                        {state.tax_country_rates.map((row: CountryTaxRate, i: number) => (
                            <div
                                key={`${row.country}-${i}`}
                                className="flex items-center gap-3 bg-surface-container-low rounded-xl px-3 py-2"
                            >
                                <span className="font-mono text-xs font-bold text-on-surface-variant w-10">
                                    {row.country}
                                </span>
                                <span className="flex-1 text-sm text-on-surface">{row.label}</span>
                                <input
                                    type="number"
                                    step={0.1}
                                    value={row.rate}
                                    onChange={(e) => {
                                        const next = [...state.tax_country_rates];
                                        next[i] = { ...row, rate: Number(e.target.value) };
                                        set('tax_country_rates', next);
                                    }}
                                    className="w-24 bg-surface-container-lowest border border-outline-variant/20 rounded-lg px-3 py-1.5 text-sm text-on-surface text-right focus:outline-none focus:border-primary-container"
                                />
                                <span className="text-xs text-on-surface-variant">%</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="divide-y divide-outline-variant/10">
                    <Toggle
                        label="Charge tax on shipping"
                        description="Shipping fees inherit the same tax rate as the cart subtotal."
                        checked={state.tax_charge_on_shipping}
                        onChange={(v) => set('tax_charge_on_shipping', v)}
                    />
                    <Toggle
                        label="Show tax ID at checkout"
                        description="Buyers can enter a VAT/TIN number on the checkout page."
                        checked={state.tax_show_id_at_checkout}
                        onChange={(v) => set('tax_show_id_at_checkout', v)}
                    />
                </div>

                {error && (
                    <div className="bg-error-container/40 border border-error/30 text-on-error-container rounded-xl px-4 py-3 text-sm whitespace-pre-wrap">
                        {error}
                    </div>
                )}

                <ActionBar
                    onSave={persist}
                    onReset={() => config && setState(project(config))}
                    saving={saving}
                    note={`Catalog amounts will continue to be stored in ${state.currency_base}.`}
                />
            </ConfigSection>
        </div>
    );
};

export default CurrencyTaxConfig;
