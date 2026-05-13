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
import { useStoreConfig } from '../../../../hooks/useStoreConfig';
import type { StoreConfig, StoreConfigPatch } from '../../../../services/storeConfigService';

type State = Pick<
    StoreConfig,
    | 'customers_allow_guest_checkout'
    | 'customers_require_email_verification'
    | 'customers_require_phone_verification'
    | 'customers_min_password_length'
    | 'customers_two_factor_required'
    | 'customers_session_timeout_mins'
    | 'customers_account_deletion_policy'
    | 'customers_marketing_opt_in_default'
    | 'customers_review_moderation'
    | 'customers_min_order_age'
    | 'customers_abandoned_cart_recovery_hours'
>;

const project = (c: StoreConfig): State => ({
    customers_allow_guest_checkout: c.customers_allow_guest_checkout,
    customers_require_email_verification: c.customers_require_email_verification,
    customers_require_phone_verification: c.customers_require_phone_verification,
    customers_min_password_length: c.customers_min_password_length,
    customers_two_factor_required: c.customers_two_factor_required,
    customers_session_timeout_mins: c.customers_session_timeout_mins,
    customers_account_deletion_policy: c.customers_account_deletion_policy,
    customers_marketing_opt_in_default: c.customers_marketing_opt_in_default,
    customers_review_moderation: c.customers_review_moderation,
    customers_min_order_age: c.customers_min_order_age,
    customers_abandoned_cart_recovery_hours: c.customers_abandoned_cart_recovery_hours,
});

const CustomersConfig: React.FC = () => {
    const { config, loading, saving, error, save } = useStoreConfig();
    const [state, setState] = useState<State | null>(null);

    useEffect(() => {
        if (config) setState(project(config));
    }, [config]);

    if (loading || !state) {
        return <div className="p-8 text-center text-on-surface-variant">Loading…</div>;
    }

    const set = <K extends keyof State>(k: K, v: State[K]) =>
        setState((prev) => (prev ? { ...prev, [k]: v } : prev));

    return (
        <div className="space-y-6">
            <ConfigSection
                icon="how_to_reg"
                title="Accounts & checkout"
                description="What buyers see when they create accounts and complete a purchase."
                actions={
                    <Pill tone={state.customers_allow_guest_checkout ? 'green' : 'amber'}>
                        Guest checkout · {state.customers_allow_guest_checkout ? 'On' : 'Off'}
                    </Pill>
                }
            >
                <Toggle
                    label="Allow guest checkout"
                    description="Buyers can complete an order without creating an account."
                    checked={state.customers_allow_guest_checkout}
                    onChange={(v) => set('customers_allow_guest_checkout', v)}
                />
                <Toggle
                    label="Require email verification"
                    description="New accounts must verify their email before placing an order."
                    checked={state.customers_require_email_verification}
                    onChange={(v) => set('customers_require_email_verification', v)}
                />
                <Toggle
                    label="Require phone verification"
                    description="OTP via SMS / WhatsApp during signup."
                    checked={state.customers_require_phone_verification}
                    onChange={(v) => set('customers_require_phone_verification', v)}
                />
                <Toggle
                    label="Marketing opt-in by default"
                    description="Pre-check the marketing email checkbox at signup."
                    checked={state.customers_marketing_opt_in_default}
                    onChange={(v) => set('customers_marketing_opt_in_default', v)}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <Field label="Minimum buyer age" hint="Used for restricted-product gating.">
                        <TextField
                            type="number"
                            min={0}
                            value={String(state.customers_min_order_age)}
                            onChange={(e) =>
                                set('customers_min_order_age', Number(e.target.value))
                            }
                        />
                    </Field>
                    <Field label="Abandoned cart reminder (hours)" hint="Wait this long before sending recovery email.">
                        <TextField
                            type="number"
                            min={1}
                            value={String(state.customers_abandoned_cart_recovery_hours)}
                            onChange={(e) =>
                                set(
                                    'customers_abandoned_cart_recovery_hours',
                                    Number(e.target.value)
                                )
                            }
                        />
                    </Field>
                </div>
            </ConfigSection>

            <ConfigSection
                icon="shield_lock"
                title="Security"
                description="Password, session, and authentication policy."
            >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <Field label="Minimum password length">
                        <TextField
                            type="number"
                            min={6}
                            max={64}
                            value={String(state.customers_min_password_length)}
                            onChange={(e) =>
                                set('customers_min_password_length', Number(e.target.value))
                            }
                        />
                    </Field>

                    <Field label="Two-factor authentication">
                        <SelectField
                            value={state.customers_two_factor_required}
                            onChange={(e) =>
                                set(
                                    'customers_two_factor_required',
                                    e.target.value as State['customers_two_factor_required']
                                )
                            }
                        >
                            <option value="off">Off</option>
                            <option value="optional">Optional (buyer choice)</option>
                            <option value="required">Required for all accounts</option>
                        </SelectField>
                    </Field>

                    <Field label="Session timeout (mins)">
                        <TextField
                            type="number"
                            min={5}
                            value={String(state.customers_session_timeout_mins)}
                            onChange={(e) =>
                                set('customers_session_timeout_mins', Number(e.target.value))
                            }
                        />
                    </Field>
                </div>

                <Field label="Account deletion">
                    <SelectField
                        value={state.customers_account_deletion_policy}
                        onChange={(e) =>
                            set(
                                'customers_account_deletion_policy',
                                e.target.value as State['customers_account_deletion_policy']
                            )
                        }
                    >
                        <option value="admin-only">Admin-only (request by support)</option>
                        <option value="self-serve">Self-serve, immediate</option>
                        <option value="self-serve-with-cooloff">
                            Self-serve, 30-day cool-off
                        </option>
                    </SelectField>
                </Field>
            </ConfigSection>

            <ConfigSection
                icon="reviews"
                title="Reviews & social proof"
                description="How customer reviews are surfaced on product pages."
            >
                <Field label="Moderation">
                    <SelectField
                        value={state.customers_review_moderation}
                        onChange={(e) =>
                            set(
                                'customers_review_moderation',
                                e.target.value as State['customers_review_moderation']
                            )
                        }
                    >
                        <option value="auto-approve">Auto-approve (no moderation)</option>
                        <option value="pre-moderate">Pre-moderate (admin approves before public)</option>
                        <option value="post-moderate">Post-moderate (public, admin removes if needed)</option>
                    </SelectField>
                </Field>

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

export default CustomersConfig;
