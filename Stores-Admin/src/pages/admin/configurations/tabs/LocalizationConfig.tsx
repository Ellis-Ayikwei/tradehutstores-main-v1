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
import type { StoreConfig, StoreConfigPatch } from '../../../../services/storeConfigService';

const LANGUAGES = [
    { code: 'en', label: 'English' },
    { code: 'fr', label: 'French' },
    { code: 'pt', label: 'Portuguese' },
    { code: 'sw', label: 'Swahili' },
    { code: 'ha', label: 'Hausa' },
    { code: 'tw', label: 'Twi' },
    { code: 'yo', label: 'Yoruba' },
    { code: 'ar', label: 'Arabic' },
];

const TIMEZONES = [
    { value: 'Africa/Accra', label: 'Accra (GMT)' },
    { value: 'Africa/Lagos', label: 'Lagos / Abuja (WAT)' },
    { value: 'Africa/Nairobi', label: 'Nairobi (EAT)' },
    { value: 'Africa/Johannesburg', label: 'Johannesburg (SAST)' },
    { value: 'Europe/London', label: 'London (GMT/BST)' },
    { value: 'America/New_York', label: 'New York (EST/EDT)' },
    { value: 'UTC', label: 'UTC' },
];

const COUNTRIES = [
    { code: 'GH', label: 'Ghana' },
    { code: 'NG', label: 'Nigeria' },
    { code: 'KE', label: 'Kenya' },
    { code: 'ZA', label: 'South Africa' },
    { code: 'CI', label: "Côte d'Ivoire" },
    { code: 'SN', label: 'Senegal' },
    { code: 'GB', label: 'United Kingdom' },
    { code: 'US', label: 'United States' },
];

type State = Pick<
    StoreConfig,
    | 'locale_default_language'
    | 'locale_enabled_languages'
    | 'locale_timezone'
    | 'locale_country'
    | 'locale_date_format'
    | 'locale_week_start'
    | 'locale_measurement'
    | 'locale_auto_detect'
    | 'locale_rtl_support'
>;

const project = (c: StoreConfig): State => ({
    locale_default_language: c.locale_default_language,
    locale_enabled_languages: c.locale_enabled_languages ?? [],
    locale_timezone: c.locale_timezone,
    locale_country: c.locale_country,
    locale_date_format: c.locale_date_format,
    locale_week_start: c.locale_week_start,
    locale_measurement: c.locale_measurement,
    locale_auto_detect: c.locale_auto_detect,
    locale_rtl_support: c.locale_rtl_support,
});

const LocalizationConfig: React.FC = () => {
    const { baseCurrency } = useCurrency();
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

    const toggleLang = (code: string) =>
        set(
            'locale_enabled_languages',
            state.locale_enabled_languages.includes(code)
                ? state.locale_enabled_languages.filter((x) => x !== code)
                : [...state.locale_enabled_languages, code]
        );

    return (
        <div className="space-y-6">
            <ConfigSection
                icon="translate"
                title="Languages"
                description="Languages shoppers can switch between. The default is shown to first-time visitors."
            >
                <Field label="Default language">
                    <SelectField
                        value={state.locale_default_language}
                        onChange={(e) => set('locale_default_language', e.target.value)}
                    >
                        {LANGUAGES.map((l) => (
                            <option key={l.code} value={l.code}>
                                {l.label}
                            </option>
                        ))}
                    </SelectField>
                </Field>

                <div>
                    <p className="text-sm font-medium text-on-surface mb-2">Enabled languages</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {LANGUAGES.map((l) => {
                            const enabled = state.locale_enabled_languages.includes(l.code);
                            const isDefault = l.code === state.locale_default_language;
                            return (
                                <button
                                    key={l.code}
                                    type="button"
                                    onClick={() => !isDefault && toggleLang(l.code)}
                                    disabled={isDefault}
                                    className={`flex items-center justify-between p-3 rounded-xl border transition-all active:scale-95 ${
                                        enabled
                                            ? 'bg-primary-container/10 border-primary-container/30 text-primary-container'
                                            : 'bg-surface-container-low border-outline-variant/15 text-on-surface hover:border-primary-container/30'
                                    } ${isDefault ? 'cursor-not-allowed opacity-90' : ''}`}
                                >
                                    <span className="text-sm font-bold">{l.label}</span>
                                    {isDefault ? (
                                        <Pill tone="green">Default</Pill>
                                    ) : enabled ? (
                                        <span className="material-symbols-outlined text-base">
                                            check_circle
                                        </span>
                                    ) : (
                                        <span className="material-symbols-outlined text-base opacity-40">
                                            add
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <Toggle
                    label="Auto-detect from browser"
                    description="Use the visitor's Accept-Language header on first visit."
                    checked={state.locale_auto_detect}
                    onChange={(v) => set('locale_auto_detect', v)}
                />
                <Toggle
                    label="RTL layout support"
                    description="Render right-to-left for Arabic and Hebrew shoppers."
                    checked={state.locale_rtl_support}
                    onChange={(v) => set('locale_rtl_support', v)}
                />
            </ConfigSection>

            <ConfigSection
                icon="schedule"
                title="Region & time"
                description="Used for order timestamps, payout schedules, and default shipping zone."
                actions={<Pill tone="blue">Currency · {baseCurrency}</Pill>}
            >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <Field label="Country">
                        <SelectField
                            value={state.locale_country}
                            onChange={(e) => set('locale_country', e.target.value)}
                        >
                            {COUNTRIES.map((c) => (
                                <option key={c.code} value={c.code}>
                                    {c.label}
                                </option>
                            ))}
                        </SelectField>
                    </Field>

                    <Field label="Timezone">
                        <SelectField
                            value={state.locale_timezone}
                            onChange={(e) => set('locale_timezone', e.target.value)}
                        >
                            {TIMEZONES.map((tz) => (
                                <option key={tz.value} value={tz.value}>
                                    {tz.label}
                                </option>
                            ))}
                        </SelectField>
                    </Field>

                    <Field label="Date format">
                        <SelectField
                            value={state.locale_date_format}
                            onChange={(e) =>
                                set(
                                    'locale_date_format',
                                    e.target.value as State['locale_date_format']
                                )
                            }
                        >
                            <option value="DMY">DD/MM/YYYY</option>
                            <option value="MDY">MM/DD/YYYY</option>
                            <option value="YMD">YYYY-MM-DD</option>
                        </SelectField>
                    </Field>

                    <Field label="Week starts on">
                        <SelectField
                            value={state.locale_week_start}
                            onChange={(e) =>
                                set(
                                    'locale_week_start',
                                    e.target.value as State['locale_week_start']
                                )
                            }
                        >
                            <option value="monday">Monday</option>
                            <option value="sunday">Sunday</option>
                        </SelectField>
                    </Field>

                    <Field label="Units" hint="Used in product specs and shipping calculations.">
                        <SelectField
                            value={state.locale_measurement}
                            onChange={(e) =>
                                set(
                                    'locale_measurement',
                                    e.target.value as State['locale_measurement']
                                )
                            }
                        >
                            <option value="metric">Metric (kg / cm)</option>
                            <option value="imperial">Imperial (lb / in)</option>
                        </SelectField>
                    </Field>

                    <Field label="Reference example">
                        <TextField
                            readOnly
                            value={new Intl.DateTimeFormat(undefined, {
                                timeZone: state.locale_timezone,
                                dateStyle: 'medium',
                                timeStyle: 'short',
                            }).format(new Date())}
                        />
                    </Field>
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
                />
            </ConfigSection>
        </div>
    );
};

export default LocalizationConfig;
