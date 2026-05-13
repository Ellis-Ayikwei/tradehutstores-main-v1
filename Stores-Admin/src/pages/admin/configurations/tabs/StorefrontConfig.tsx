import React, { useEffect, useState } from 'react';
import {
    ActionBar,
    ConfigSection,
    Field,
    Pill,
    SelectField,
    TextArea,
    TextField,
    Toggle,
} from '../components/ConfigPrimitives';
import { useStoreConfig } from '../../../../hooks/useStoreConfig';
import type { StoreConfig, StoreConfigPatch } from '../../../../services/storeConfigService';

// Slice of StoreConfig that this tab owns.
const KEYS = [
    'storefront_name',
    'storefront_legal_name',
    'storefront_tagline',
    'storefront_description',
    'storefront_support_email',
    'storefront_support_phone',
    'storefront_address',
    'storefront_website_url',
    'storefront_status',
    'storefront_show_rfq',
    'storefront_show_auctions',
    'storefront_allow_guest_browsing',
] as const;
type Key = (typeof KEYS)[number];
type State = Pick<StoreConfig, Key>;

const project = (c: StoreConfig): State => ({
    storefront_name: c.storefront_name,
    storefront_legal_name: c.storefront_legal_name,
    storefront_tagline: c.storefront_tagline,
    storefront_description: c.storefront_description,
    storefront_support_email: c.storefront_support_email,
    storefront_support_phone: c.storefront_support_phone,
    storefront_address: c.storefront_address,
    storefront_website_url: c.storefront_website_url,
    storefront_status: c.storefront_status,
    storefront_show_rfq: c.storefront_show_rfq,
    storefront_show_auctions: c.storefront_show_auctions,
    storefront_allow_guest_browsing: c.storefront_allow_guest_browsing,
});

const StorefrontConfig: React.FC = () => {
    const { config, loading, saving, error, save } = useStoreConfig();
    const [state, setState] = useState<State | null>(null);

    useEffect(() => {
        if (config) setState(project(config));
    }, [config]);

    const set = <K extends Key>(key: K, value: State[K]) =>
        setState((prev) => (prev ? { ...prev, [key]: value } : prev));

    if (loading || !state) {
        return <div className="p-8 text-center text-on-surface-variant">Loading…</div>;
    }

    return (
        <div className="space-y-6">
            <ConfigSection
                icon="store"
                title="Store identity"
                description="How your storefront is presented to shoppers across the marketplace."
                actions={
                    <Pill tone={state.storefront_status === 'open' ? 'green' : 'amber'}>
                        {state.storefront_status === 'open' ? 'Live' : state.storefront_status}
                    </Pill>
                }
            >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <Field label="Display name" hint="Shown in navigation, emails, and invoices.">
                        <TextField
                            value={state.storefront_name}
                            onChange={(e) => set('storefront_name', e.target.value)}
                        />
                    </Field>
                    <Field label="Legal entity name" hint="Used for receipts and tax documents.">
                        <TextField
                            value={state.storefront_legal_name}
                            onChange={(e) => set('storefront_legal_name', e.target.value)}
                        />
                    </Field>
                </div>

                <Field label="Tagline" hint="One-line headline for the storefront hero.">
                    <TextField
                        value={state.storefront_tagline}
                        onChange={(e) => set('storefront_tagline', e.target.value)}
                        placeholder="e.g. Africa's procurement marketplace"
                    />
                </Field>

                <Field label="About the store" hint="Appears on the public About page and in SEO metadata.">
                    <TextArea
                        value={state.storefront_description}
                        onChange={(e) => set('storefront_description', e.target.value)}
                        rows={4}
                    />
                </Field>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <Field label="Logo">
                        <button
                            type="button"
                            disabled
                            className="w-full h-24 rounded-xl border-2 border-dashed border-outline-variant/30 bg-surface-container-low text-on-surface-variant flex flex-col items-center justify-center gap-1 cursor-not-allowed opacity-70"
                        >
                            <span className="material-symbols-outlined">image</span>
                            <span className="text-xs">Upload — TODO</span>
                        </button>
                    </Field>
                    <Field label="Favicon">
                        <button
                            type="button"
                            disabled
                            className="w-full h-24 rounded-xl border-2 border-dashed border-outline-variant/30 bg-surface-container-low text-on-surface-variant flex flex-col items-center justify-center gap-1 cursor-not-allowed opacity-70"
                        >
                            <span className="material-symbols-outlined">bookmark</span>
                            <span className="text-xs">Upload — TODO</span>
                        </button>
                    </Field>
                    <Field label="OG / share image">
                        <button
                            type="button"
                            disabled
                            className="w-full h-24 rounded-xl border-2 border-dashed border-outline-variant/30 bg-surface-container-low text-on-surface-variant flex flex-col items-center justify-center gap-1 cursor-not-allowed opacity-70"
                        >
                            <span className="material-symbols-outlined">photo_library</span>
                            <span className="text-xs">Upload — TODO</span>
                        </button>
                    </Field>
                </div>
            </ConfigSection>

            <ConfigSection
                icon="contact_mail"
                title="Contact"
                description="Used for transactional emails, support replies, and the storefront footer."
            >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <Field label="Support email">
                        <TextField
                            type="email"
                            value={state.storefront_support_email}
                            onChange={(e) => set('storefront_support_email', e.target.value)}
                        />
                    </Field>
                    <Field label="Support phone">
                        <TextField
                            type="tel"
                            value={state.storefront_support_phone}
                            onChange={(e) => set('storefront_support_phone', e.target.value)}
                        />
                    </Field>
                    <Field label="Public website URL">
                        <TextField
                            type="url"
                            value={state.storefront_website_url}
                            onChange={(e) => set('storefront_website_url', e.target.value)}
                        />
                    </Field>
                    <Field label="Business address">
                        <TextField
                            value={state.storefront_address}
                            onChange={(e) => set('storefront_address', e.target.value)}
                        />
                    </Field>
                </div>
            </ConfigSection>

            <ConfigSection
                icon="storefront"
                title="Storefront mode"
                description="Control public access to the storefront and which marketplace features render."
            >
                <Field label="Operating mode" hint="Maintenance hides catalog and disables checkout for non-admins.">
                    <SelectField
                        value={state.storefront_status}
                        onChange={(e) =>
                            set(
                                'storefront_status',
                                e.target.value as State['storefront_status']
                            )
                        }
                    >
                        <option value="open">Open — full storefront is live</option>
                        <option value="invite-only">Invite-only — registered customers only</option>
                        <option value="maintenance">Maintenance — show holding page</option>
                    </SelectField>
                </Field>

                <div className="divide-y divide-outline-variant/10">
                    <Toggle
                        label="Show RFQ board"
                        description="Surface the Request-for-Quote portal in the public navigation."
                        checked={state.storefront_show_rfq}
                        onChange={(v) => set('storefront_show_rfq', v)}
                    />
                    <Toggle
                        label="Show live auctions"
                        description="Surface the auctions hub to all visitors."
                        checked={state.storefront_show_auctions}
                        onChange={(v) => set('storefront_show_auctions', v)}
                    />
                    <Toggle
                        label="Allow guest browsing"
                        description="If off, all storefront pages require sign-in."
                        checked={state.storefront_allow_guest_browsing}
                        onChange={(v) => set('storefront_allow_guest_browsing', v)}
                    />
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
                    note="Changes apply to the public storefront on next page load."
                />
            </ConfigSection>
        </div>
    );
};

export default StorefrontConfig;
