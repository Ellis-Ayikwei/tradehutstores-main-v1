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

type State = Pick<
    StoreConfig,
    | 'system_maintenance_mode'
    | 'system_maintenance_message'
    | 'system_maintenance_allow_admin'
    | 'system_backup_cadence'
    | 'system_retention_days'
    | 'system_audit_logging'
    | 'system_debug_mode'
    | 'system_rate_limit_per_min'
    | 'system_api_version'
    | 'system_embedding_service_url'
    | 'system_elasticsearch_url'
>;

const project = (c: StoreConfig): State => ({
    system_maintenance_mode: c.system_maintenance_mode,
    system_maintenance_message: c.system_maintenance_message,
    system_maintenance_allow_admin: c.system_maintenance_allow_admin,
    system_backup_cadence: c.system_backup_cadence,
    system_retention_days: c.system_retention_days,
    system_audit_logging: c.system_audit_logging,
    system_debug_mode: c.system_debug_mode,
    system_rate_limit_per_min: c.system_rate_limit_per_min,
    system_api_version: c.system_api_version,
    system_embedding_service_url: c.system_embedding_service_url,
    system_elasticsearch_url: c.system_elasticsearch_url,
});

const SystemConfig: React.FC = () => {
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
                icon="construction"
                title="Maintenance mode"
                description="Take the storefront offline temporarily without affecting the admin console."
                actions={
                    <Pill tone={state.system_maintenance_mode ? 'red' : 'green'}>
                        {state.system_maintenance_mode ? 'Storefront down' : 'Live'}
                    </Pill>
                }
            >
                <Toggle
                    label="Enable maintenance mode"
                    description="Visitors see a holding page; admins keep full access."
                    checked={state.system_maintenance_mode}
                    onChange={(v) => set('system_maintenance_mode', v)}
                />
                <Toggle
                    label="Allow admin sessions during maintenance"
                    description="If off, even admins are kicked out — use with care."
                    checked={state.system_maintenance_allow_admin}
                    onChange={(v) => set('system_maintenance_allow_admin', v)}
                />
                <Field label="Holding page message">
                    <TextArea
                        rows={3}
                        value={state.system_maintenance_message}
                        onChange={(e) => set('system_maintenance_message', e.target.value)}
                    />
                </Field>
            </ConfigSection>

            <ConfigSection
                icon="backup"
                title="Backups & retention"
                description="How often platform data is snapshotted and how long it's kept."
            >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <Field label="Backup cadence">
                        <SelectField
                            value={state.system_backup_cadence}
                            onChange={(e) =>
                                set(
                                    'system_backup_cadence',
                                    e.target.value as State['system_backup_cadence']
                                )
                            }
                        >
                            <option value="hourly">Hourly</option>
                            <option value="daily">Daily (recommended)</option>
                            <option value="weekly">Weekly</option>
                        </SelectField>
                    </Field>
                    <Field label="Retention (days)">
                        <TextField
                            type="number"
                            min={7}
                            value={String(state.system_retention_days)}
                            onChange={(e) => set('system_retention_days', Number(e.target.value))}
                        />
                    </Field>
                </div>
            </ConfigSection>

            <ConfigSection
                icon="terminal"
                title="API & rate limits"
                description="Public API surface and protection against abuse."
            >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <Field label="API version" hint="The base under /tradehut/api/.">
                        <TextField
                            value={state.system_api_version}
                            onChange={(e) => set('system_api_version', e.target.value)}
                        />
                    </Field>
                    <Field label="Rate limit (req/min/IP)">
                        <TextField
                            type="number"
                            min={1}
                            value={String(state.system_rate_limit_per_min)}
                            onChange={(e) =>
                                set('system_rate_limit_per_min', Number(e.target.value))
                            }
                        />
                    </Field>
                    <Field label="Audit logging">
                        <div className="flex items-center h-[42px]">
                            <Toggle
                                label="Log all admin writes"
                                checked={state.system_audit_logging}
                                onChange={(v) => set('system_audit_logging', v)}
                            />
                        </div>
                    </Field>
                </div>
            </ConfigSection>

            <ConfigSection
                icon="search"
                title="Search & embeddings"
                description="Pointers to the Elasticsearch and embedding services that power product search."
                actions={<Pill tone="blue">Read-only mirror of BE env</Pill>}
            >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <Field label="Elasticsearch URL">
                        <TextField
                            value={state.system_elasticsearch_url}
                            onChange={(e) => set('system_elasticsearch_url', e.target.value)}
                        />
                    </Field>
                    <Field label="Embedding service URL">
                        <TextField
                            value={state.system_embedding_service_url}
                            onChange={(e) => set('system_embedding_service_url', e.target.value)}
                        />
                    </Field>
                </div>
                <p className="text-xs text-on-surface-variant opacity-70">
                    To change these without a restart, set them as environment variables on
                    Stores-BE. The values shown are the current admin-known mirror.
                </p>
            </ConfigSection>

            <ConfigSection
                icon="bug_report"
                title="Diagnostics"
                description="Verbose logging and developer-only flags. Off in production."
                actions={state.system_debug_mode ? <Pill tone="red">Debug on</Pill> : null}
            >
                <Toggle
                    label="Enable debug responses"
                    description="API errors include stack traces. Never enable in production."
                    checked={state.system_debug_mode}
                    onChange={(v) => set('system_debug_mode', v)}
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

export default SystemConfig;
