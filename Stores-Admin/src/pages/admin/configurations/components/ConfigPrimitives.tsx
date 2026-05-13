import React, { ReactNode } from 'react';

// ─── Section header (icon + title + description) ────────────────────────────
export const ConfigSection: React.FC<{
    icon: string;
    title: string;
    description?: string;
    children: ReactNode;
    actions?: ReactNode;
}> = ({ icon, title, description, children, actions }) => (
    <section className="bg-surface-container-lowest rounded-2xl shadow-card hover:shadow-card-hover transition-all duration-300 overflow-hidden">
        <header className="p-6 border-b border-outline-variant/10 flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary-container/10 text-primary-container flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-xl">{icon}</span>
                </div>
                <div>
                    <h3 className="font-headline font-bold text-lg text-on-surface">{title}</h3>
                    {description && (
                        <p className="text-sm text-on-surface-variant opacity-80 mt-0.5">
                            {description}
                        </p>
                    )}
                </div>
            </div>
            {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
        </header>
        <div className="p-6 space-y-6">{children}</div>
    </section>
);

// ─── Field row ──────────────────────────────────────────────────────────────
export const Field: React.FC<{
    label: string;
    hint?: string;
    htmlFor?: string;
    badge?: ReactNode;
    children: ReactNode;
}> = ({ label, hint, htmlFor, badge, children }) => (
    <div>
        <label
            htmlFor={htmlFor}
            className="flex items-center justify-between text-sm font-medium text-on-surface mb-1.5"
        >
            <span className="flex items-center gap-2">
                {label}
                {badge}
            </span>
        </label>
        {children}
        {hint && <p className="mt-1.5 text-xs text-on-surface-variant opacity-70">{hint}</p>}
    </div>
);

// ─── Text input (Kinetic styled) ────────────────────────────────────────────
export const TextField: React.FC<
    React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }
> = ({ invalid, className = '', ...rest }) => (
    <input
        {...rest}
        className={`w-full bg-surface-container-low border rounded-xl px-4 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none transition-colors ${
            invalid
                ? 'border-error focus:border-error'
                : 'border-outline-variant/20 focus:border-primary-container'
        } ${className}`}
    />
);

export const TextArea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = ({
    className = '',
    rows = 3,
    ...rest
}) => (
    <textarea
        rows={rows}
        {...rest}
        className={`w-full bg-surface-container-low border border-outline-variant/20 rounded-xl px-4 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:border-primary-container transition-colors resize-y ${className}`}
    />
);

export const SelectField: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = ({
    className = '',
    children,
    ...rest
}) => (
    <select
        {...rest}
        className={`w-full bg-surface-container-low border border-outline-variant/20 rounded-xl px-4 py-2.5 text-sm text-on-surface focus:outline-none focus:border-primary-container transition-colors ${className}`}
    >
        {children}
    </select>
);

// ─── Toggle switch ──────────────────────────────────────────────────────────
export const Toggle: React.FC<{
    checked: boolean;
    onChange: (next: boolean) => void;
    label: string;
    description?: string;
    disabled?: boolean;
}> = ({ checked, onChange, label, description, disabled }) => (
    <div className="flex items-start justify-between gap-4 py-3">
        <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-on-surface">{label}</p>
            {description && (
                <p className="text-xs text-on-surface-variant opacity-70 mt-0.5">{description}</p>
            )}
        </div>
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label={label}
            disabled={disabled}
            onClick={() => !disabled && onChange(!checked)}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors active:scale-95 ${
                disabled
                    ? 'opacity-50 cursor-not-allowed bg-surface-container'
                    : checked
                    ? 'bg-primary-container'
                    : 'bg-surface-container-high'
            }`}
        >
            <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                    checked ? 'translate-x-5' : 'translate-x-0.5'
                }`}
            />
        </button>
    </div>
);

// ─── Action bar ─────────────────────────────────────────────────────────────
export const ActionBar: React.FC<{
    onSave?: () => void;
    onReset?: () => void;
    saving?: boolean;
    saveLabel?: string;
    resetLabel?: string;
    note?: ReactNode;
}> = ({ onSave, onReset, saving, saveLabel = 'Save changes', resetLabel = 'Reset', note }) => (
    <div className="sticky bottom-0 -mx-6 -mb-6 px-6 py-4 mt-2 bg-surface-container-lowest/95 backdrop-blur-sm border-t border-outline-variant/15 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        {note && <div className="text-xs text-on-surface-variant opacity-80">{note}</div>}
        <div className="flex items-center gap-2 ml-auto">
            {onReset && (
                <button
                    type="button"
                    onClick={onReset}
                    className="px-4 py-2 rounded-xl text-sm font-bold text-on-surface-variant hover:bg-surface-container-low transition-colors active:scale-95"
                >
                    {resetLabel}
                </button>
            )}
            {onSave && (
                <button
                    type="button"
                    onClick={onSave}
                    disabled={saving}
                    className="px-6 py-2 rounded-xl text-sm font-bold bg-primary-container text-on-primary hover:bg-primary transition-colors active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
                >
                    {saving && (
                        <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    )}
                    {saving ? 'Saving…' : saveLabel}
                </button>
            )}
        </div>
    </div>
);

// ─── Status pill ────────────────────────────────────────────────────────────
export const Pill: React.FC<{
    tone?: 'green' | 'amber' | 'red' | 'blue' | 'neutral';
    children: ReactNode;
}> = ({ tone = 'neutral', children }) => {
    const tones: Record<string, string> = {
        green: 'bg-bid-green/10 text-bid-green',
        amber: 'bg-bid-amber/10 text-bid-amber',
        red: 'bg-bid-red/10 text-bid-red',
        blue: 'bg-tertiary/10 text-tertiary',
        neutral: 'bg-surface-container text-on-surface-variant',
    };
    return (
        <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${tones[tone]}`}
        >
            {children}
        </span>
    );
};

// ─── Coming-soon placeholder for tabs that link to dedicated pages ──────────
export const PendingPlaceholder: React.FC<{
    icon: string;
    title: string;
    description: string;
    cta?: { label: string; href?: string; onClick?: () => void };
}> = ({ icon, title, description, cta }) => (
    <div className="bg-surface-container-low rounded-2xl border border-dashed border-outline-variant/30 p-10 text-center">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-primary-container/10 text-primary-container flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-3xl">{icon}</span>
        </div>
        <h4 className="font-headline font-bold text-lg text-on-surface mb-1">{title}</h4>
        <p className="text-sm text-on-surface-variant opacity-80 max-w-md mx-auto">{description}</p>
        {cta && (
            <a
                href={cta.href}
                onClick={cta.onClick}
                className="inline-flex items-center gap-2 mt-5 px-5 py-2 rounded-xl bg-primary-container text-on-primary text-sm font-bold hover:bg-primary transition-colors active:scale-95"
            >
                {cta.label}
                <span className="material-symbols-outlined text-base">arrow_forward</span>
            </a>
        )}
    </div>
);
