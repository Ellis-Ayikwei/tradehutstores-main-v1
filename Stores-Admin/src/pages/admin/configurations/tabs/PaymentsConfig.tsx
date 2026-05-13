import React, { useEffect, useState } from 'react';
import {
    ActionBar,
    ConfigSection,
    Field,
    Pill,
    SelectField,
    TextField,
    Toggle,
} from '../components/ConfigPrimitives';
import { useCurrency } from '../../../../contexts/CurrencyContext';
import { useStoreConfig } from '../../../../hooks/useStoreConfig';
import type {
    PaymentGateway,
    StoreConfig,
    StoreConfigPatch,
} from '../../../../services/storeConfigService';

type State = Pick<
    StoreConfig,
    | 'payments_gateways'
    | 'payments_capture_mode'
    | 'payments_risk_level'
    | 'payments_require_3ds'
    | 'payments_seller_commission'
    | 'payments_min_payout'
    | 'payments_payout_schedule'
    | 'payments_auto_refund_eligible'
>;

const project = (c: StoreConfig): State => ({
    payments_gateways: c.payments_gateways ?? [],
    payments_capture_mode: c.payments_capture_mode,
    payments_risk_level: c.payments_risk_level,
    payments_require_3ds: c.payments_require_3ds,
    payments_seller_commission: c.payments_seller_commission,
    payments_min_payout: c.payments_min_payout,
    payments_payout_schedule: c.payments_payout_schedule,
    payments_auto_refund_eligible: c.payments_auto_refund_eligible,
});

// Visual icon by gateway id (the BE blob doesn't carry presentation hints).
const GATEWAY_ICON: Record<string, string> = {
    paystack: 'credit_card',
    momo: 'smartphone',
    flutterwave: 'language',
    stripe: 'payments',
    paypal: 'account_balance_wallet',
    cod: 'local_shipping',
};

const PaymentsConfig: React.FC = () => {
    const { baseCurrency, formatDisplayPrice } = useCurrency();
    const { config, loading, saving, error, save } = useStoreConfig();
    const [state, setState] = useState<State | null>(null);
    const [expanded, setExpanded] = useState<string | null>(null);

    useEffect(() => {
        if (config) setState(project(config));
    }, [config]);

    if (loading || !state) {
        return <div className="p-8 text-center text-on-surface-variant">Loading…</div>;
    }

    const set = <K extends keyof State>(k: K, v: State[K]) =>
        setState((prev) => (prev ? { ...prev, [k]: v } : prev));

    const updateGw = (id: string, patch: Partial<PaymentGateway>) =>
        set(
            'payments_gateways',
            state.payments_gateways.map((g) => (g.id === id ? { ...g, ...patch } : g))
        );

    return (
        <div className="space-y-6">
            <ConfigSection
                icon="credit_card"
                title="Payment gateways"
                description="Toggle the rails accepted at checkout. Mobile-first markets use Paystack + Mobile Money by default."
            >
                <div className="space-y-2">
                    {state.payments_gateways.map((g) => (
                        <div
                            key={g.id}
                            className="bg-surface-container-low rounded-xl border border-outline-variant/10 overflow-hidden"
                        >
                            <div className="flex items-center gap-3 p-4">
                                <div className="w-11 h-11 rounded-xl bg-surface-container-lowest text-on-surface flex items-center justify-center flex-shrink-0">
                                    <span className="material-symbols-outlined">
                                        {GATEWAY_ICON[g.id] ?? 'credit_card'}
                                    </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-bold text-on-surface truncate">
                                            {g.name}
                                        </p>
                                        {g.testMode && g.enabled && <Pill tone="amber">Test</Pill>}
                                        {g.enabled && !g.testMode && <Pill tone="green">Live</Pill>}
                                    </div>
                                    <p className="text-xs text-on-surface-variant opacity-70 truncate">
                                        ID: {g.id}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() =>
                                        setExpanded((prev) => (prev === g.id ? null : g.id))
                                    }
                                    className="text-on-surface-variant hover:text-primary-container p-2 rounded-lg hover:bg-surface-container transition-colors"
                                    aria-label="Configure"
                                >
                                    <span className="material-symbols-outlined">
                                        {expanded === g.id ? 'expand_less' : 'expand_more'}
                                    </span>
                                </button>
                                <button
                                    type="button"
                                    role="switch"
                                    aria-checked={g.enabled}
                                    onClick={() => updateGw(g.id, { enabled: !g.enabled })}
                                    className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors active:scale-95 ${
                                        g.enabled
                                            ? 'bg-primary-container'
                                            : 'bg-surface-container-high'
                                    }`}
                                >
                                    <span
                                        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                                            g.enabled ? 'translate-x-5' : 'translate-x-0.5'
                                        }`}
                                    />
                                </button>
                            </div>
                            {expanded === g.id && (
                                <div className="px-4 pb-4 space-y-4 border-t border-outline-variant/10 pt-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <Field label="Public key">
                                            <TextField
                                                value={g.publicKey}
                                                onChange={(e) =>
                                                    updateGw(g.id, { publicKey: e.target.value })
                                                }
                                                placeholder="pk_…"
                                            />
                                        </Field>
                                        <Field label="Secret key">
                                            <TextField
                                                type="password"
                                                value={g.secretKey}
                                                onChange={(e) =>
                                                    updateGw(g.id, { secretKey: e.target.value })
                                                }
                                                placeholder="sk_…"
                                            />
                                        </Field>
                                    </div>
                                    <Toggle
                                        label="Test mode"
                                        description="Use sandbox keys; live transactions are disabled."
                                        checked={g.testMode}
                                        onChange={(v) => updateGw(g.id, { testMode: v })}
                                    />
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </ConfigSection>

            <ConfigSection
                icon="policy"
                title="Checkout & risk policy"
                description="Default capture, risk, and 3-D Secure behavior across all gateways."
            >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <Field label="Capture mode" hint="Auto charges immediately; manual holds funds for review.">
                        <SelectField
                            value={state.payments_capture_mode}
                            onChange={(e) =>
                                set(
                                    'payments_capture_mode',
                                    e.target.value as State['payments_capture_mode']
                                )
                            }
                        >
                            <option value="auto">Auto-capture</option>
                            <option value="manual">Manual capture</option>
                        </SelectField>
                    </Field>

                    <Field label="Risk threshold">
                        <SelectField
                            value={state.payments_risk_level}
                            onChange={(e) =>
                                set(
                                    'payments_risk_level',
                                    e.target.value as State['payments_risk_level']
                                )
                            }
                        >
                            <option value="low">Low — accept most</option>
                            <option value="standard">Standard (recommended)</option>
                            <option value="strict">Strict — flag aggressively</option>
                        </SelectField>
                    </Field>

                    <Field label="Currency on receipts">
                        <div className="flex items-center h-[42px] px-4 rounded-xl bg-surface-container-low border border-outline-variant/15 font-mono text-sm font-bold text-on-surface">
                            {baseCurrency}
                        </div>
                    </Field>
                </div>

                <Toggle
                    label="Require 3-D Secure on card payments"
                    description="Adds an extra authentication step for card transactions."
                    checked={state.payments_require_3ds}
                    onChange={(v) => set('payments_require_3ds', v)}
                />
                <Toggle
                    label="Auto-refund on cancellation"
                    description="Refund the buyer immediately when an order is cancelled before fulfilment."
                    checked={state.payments_auto_refund_eligible}
                    onChange={(v) => set('payments_auto_refund_eligible', v)}
                />
            </ConfigSection>

            <ConfigSection
                icon="account_balance"
                title="Seller payouts"
                description="How sellers get paid for completed orders."
            >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <Field label="Platform commission (%)" hint="Deducted from each order before payout.">
                        <TextField
                            type="number"
                            step={0.1}
                            value={String(state.payments_seller_commission)}
                            onChange={(e) =>
                                set('payments_seller_commission', Number(e.target.value))
                            }
                        />
                    </Field>
                    <Field label="Minimum payout">
                        <div className="flex">
                            <span className="inline-flex items-center px-3 rounded-l-xl bg-surface-container border border-r-0 border-outline-variant/20 text-xs font-mono text-on-surface-variant">
                                {baseCurrency}
                            </span>
                            <input
                                type="number"
                                step={1}
                                value={String(state.payments_min_payout)}
                                onChange={(e) =>
                                    set('payments_min_payout', Number(e.target.value))
                                }
                                className="flex-1 bg-surface-container-low border border-outline-variant/20 rounded-r-xl px-4 py-2.5 text-sm text-on-surface focus:outline-none focus:border-primary-container"
                            />
                        </div>
                    </Field>
                    <Field label="Payout cadence">
                        <SelectField
                            value={state.payments_payout_schedule}
                            onChange={(e) =>
                                set(
                                    'payments_payout_schedule',
                                    e.target.value as State['payments_payout_schedule']
                                )
                            }
                        >
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly (Mondays)</option>
                            <option value="monthly">Monthly (1st)</option>
                        </SelectField>
                    </Field>
                </div>

                <div className="bg-surface-container-low rounded-xl p-4 text-sm text-on-surface-variant">
                    Sellers earning under{' '}
                    <span className="font-mono font-bold text-on-surface">
                        {formatDisplayPrice(Number(state.payments_min_payout))}
                    </span>{' '}
                    will roll into the next cycle.
                </div>

                {error && (
                    <div className="bg-error-container/40 border border-error/30 text-on-error-container rounded-xl px-4 py-3 text-sm whitespace-pre-wrap">
                        {error}
                    </div>
                )}

                <ActionBar
                    onSave={() => save(state as StoreConfigPatch)}
                    onReset={() => config && setState(project(config))}
                    saving={saving}
                    note="Live keys are encrypted at rest and never returned to the client."
                />
            </ConfigSection>
        </div>
    );
};

export default PaymentsConfig;
